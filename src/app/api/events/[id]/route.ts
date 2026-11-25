import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { eventUpdateSchema } from "@/lib/validations/event";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const session = await auth();

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        registrations: {
          select: {
            id: true,
            status: true,
            userId: true,
            ticketToken: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const confirmedCount = event.registrations.filter(
      (r) => r.status === "REGISTERED" || r.status === "CHECKED_IN"
    ).length;
    const waitlistCount = event.registrations.filter(
      (r) => r.status === "WAITLIST"
    ).length;

    // Check if the current user has a registration
    const userRegistration = session?.user?.id
      ? event.registrations.find((r) => r.userId === session.user.id) || null
      : null;

    const { registrations, ...rest } = event;

    return NextResponse.json({
      ...rest,
      registeredCount: confirmedCount,
      waitlistCount,
      spotsLeft: Math.max(0, event.maxCapacity - confirmedCount),
      isFull: confirmedCount >= event.maxCapacity,
      userRegistration: userRegistration
        ? {
            id: userRegistration.id,
            status: userRegistration.status,
            ticketToken: userRegistration.ticketToken,
          }
        : null,
    });
  } catch (error) {
    console.error("[GET /api/events/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch event details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Role check: Only the organizer of this event or an ADMIN can update it
    const isOwner = existingEvent.organizerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    const isOrganizer = session.user.role === "ORGANIZER";

    if (!isAdmin && !(isOrganizer && isOwner)) {
      return NextResponse.json(
        { error: "Forbidden. You can only update events you organized." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = eventUpdateSchema.safeParse(body);

    if (!validation.success) {
      const flattened = validation.error.flatten();
      const firstErrorMessage =
        Object.values(flattened.fieldErrors)[0]?.[0] ||
        flattened.formErrors[0] ||
        "Validation failed. Please verify the event fields.";

      return NextResponse.json(
        {
          error: firstErrorMessage,
          fieldErrors: flattened.fieldErrors,
          formErrors: flattened.formErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updatePayload: any = {};

    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.category !== undefined) updatePayload.category = data.category.toUpperCase();
    if (data.location !== undefined) updatePayload.location = data.location;
    if (data.posterUrl !== undefined) updatePayload.posterUrl = data.posterUrl || null;
    if (data.startAt !== undefined) updatePayload.startAt = new Date(data.startAt);
    if (data.endAt !== undefined) updatePayload.endAt = new Date(data.endAt);
    if (data.maxCapacity !== undefined) updatePayload.maxCapacity = data.maxCapacity;
    if (data.status !== undefined) updatePayload.status = data.status;

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updatePayload,
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error("[PATCH /api/events/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const isOwner = existingEvent.organizerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Forbidden. You can only delete events you organized." },
        { status: 403 }
      );
    }

    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE /api/events/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
