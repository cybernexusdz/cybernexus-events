import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { feedbackSchema } from "@/lib/validations/feedback";

export const dynamic = "force-dynamic";

// GET /api/events/[id]/feedback - List reviews, calculate averages, and check attendee eligibility
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const session = await auth();

    const feedbacks = await prisma.feedback.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalReviews = feedbacks.length;
    const ratingSum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 0;

    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach((f) => {
      if (ratingCounts[f.rating] !== undefined) {
        ratingCounts[f.rating] += 1;
      }
    });

    let canSubmitFeedback = false;
    let userFeedback = null;

    if (session?.user?.id) {
      userFeedback = feedbacks.find((f) => f.userId === session.user.id) || null;

      const reg = await prisma.registration.findUnique({
        where: {
          userId_eventId: {
            userId: session.user.id,
            eventId,
          },
        },
        select: { status: true },
      });

      canSubmitFeedback = reg?.status === "CHECKED_IN";
    }

    return NextResponse.json({
      feedbacks,
      averageRating,
      totalReviews,
      ratingCounts,
      userFeedback,
      canSubmitFeedback,
    });
  } catch (error: unknown) {
    console.error("[GET /api/events/[id]/feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to load workshop feedback" },
      { status: 500 }
    );
  }
}

// POST /api/events/[id]/feedback - Submit or update rating & review (checked-in students only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to submit feedback." },
        { status: 401 }
      );
    }

    const eventId = params.id;

    // Verify attendee actually checked in
    const registration = await prisma.registration.findUnique({
      where: {
        userId_eventId: {
          userId: session.user.id,
          eventId,
        },
      },
      select: { status: true },
    });

    if (!registration || registration.status !== "CHECKED_IN") {
      return NextResponse.json(
        {
          error:
            "Only verified attendees who checked in at the door can rate and review this workshop.",
          code: "NOT_CHECKED_IN",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { rating, comment } = parsed.data;

    // 1 review per student per event via atomic upsert
    const feedback = await prisma.feedback.upsert({
      where: {
        userId_eventId: {
          userId: session.user.id,
          eventId,
        },
      },
      update: {
        rating,
        comment: comment || null,
      },
      create: {
        userId: session.user.id,
        eventId,
        rating,
        comment: comment || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      feedback,
      message: "Feedback submitted successfully!",
    });
  } catch (error: unknown) {
    console.error("[POST /api/events/[id]/feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback." },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id]/feedback - Delete user's review or organizer moderation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId") || session.user.id;

    const isOwnReview = targetUserId === session.user.id;
    const isMod =
      session.user.role === "ORGANIZER" || session.user.role === "ADMIN";

    if (!isOwnReview && !isMod) {
      return NextResponse.json(
        { error: "Forbidden. You can only remove your own feedback." },
        { status: 403 }
      );
    }

    await prisma.feedback.delete({
      where: {
        userId_eventId: {
          userId: targetUserId,
          eventId,
        },
      },
    });

    return NextResponse.json({ success: true, message: "Feedback removed." });
  } catch (error: unknown) {
    console.error("[DELETE /api/events/[id]/feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to remove feedback" },
      { status: 500 }
    );
  }
}
