import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/register - Fetch all registrations for current user
export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const registrations = await prisma.registration.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            category: true,
            location: true,
            posterUrl: true,
            startAt: true,
            endAt: true,
            status: true,
          },
        },
        certificate: {
          select: {
            id: true,
            serialNumber: true,
            issuedAt: true,
          },
        },
      },
    });

    return NextResponse.json(registrations);
  } catch (error) {
    console.error("[GET /api/register] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}

// POST /api/register - Atomic seat registration & waitlist
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to register for events." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { eventId, level, specialty, studentId } = body;

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid eventId" },
        { status: 400 }
      );
    }

    // Check user profile for required academic information (level & specialty)
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, level: true, specialty: true, studentId: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const resolvedLevel = (level?.trim() || currentUser.level)?.trim();
    const resolvedSpecialty = (specialty?.trim() || currentUser.specialty)?.trim();

    if (!resolvedLevel || !resolvedSpecialty) {
      return NextResponse.json(
        {
          code: "PROFILE_INCOMPLETE",
          error: "Please complete your student profile (Academic Level & Specialty) before registering.",
        },
        { status: 422 }
      );
    }

    // Atomic transaction for profile update, capacity checking, and seat allocation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update user profile if new information was provided
      const cleanStudentId =
        studentId !== undefined
          ? studentId?.trim()
            ? studentId.trim()
            : null
          : currentUser.studentId;

      await tx.user.update({
        where: { id: session.user.id },
        data: {
          level: resolvedLevel,
          specialty: resolvedSpecialty,
          studentId: cleanStudentId,
        },
      });

      // 2. Fetch event and its active registrations
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: {
          registrations: {
            where: {
              status: { in: ["REGISTERED", "CHECKED_IN"] },
            },
          },
        },
      });

      if (!event) {
        throw new Error("EVENT_NOT_FOUND");
      }

      if (event.status !== "PUBLISHED") {
        throw new Error("EVENT_NOT_OPEN");
      }

      // 3. Check if user already has a registration
      const existingReg = await tx.registration.findUnique({
        where: {
          userId_eventId: {
            userId: session.user.id,
            eventId,
          },
        },
      });

      if (existingReg) {
        if (
          existingReg.status === "REGISTERED" ||
          existingReg.status === "CHECKED_IN"
        ) {
          throw new Error("ALREADY_REGISTERED");
        }
        if (existingReg.status === "WAITLIST") {
          throw new Error("ALREADY_ON_WAITLIST");
        }
      }

      // 4. Determine if seat is available
      const activeCount = event.registrations.length;
      const seatAvailable = activeCount < event.maxCapacity;
      const targetStatus = seatAvailable ? "REGISTERED" : "WAITLIST";
      const token = randomUUID();

      // If user had previously cancelled, reactivate their record
      if (existingReg && existingReg.status === "CANCELLED") {
        const reactivated = await tx.registration.update({
          where: { id: existingReg.id },
          data: {
            status: targetStatus,
            ticketToken: token,
            checkedInAt: null,
          },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                startAt: true,
                location: true,
              },
            },
          },
        });

        return {
          registration: reactivated,
          status: targetStatus,
          isWaitlist: !seatAvailable,
        };
      }

      // Create new registration
      const newRegistration = await tx.registration.create({
        data: {
          userId: session.user.id,
          eventId,
          ticketToken: token,
          status: targetStatus,
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startAt: true,
              location: true,
            },
          },
        },
      });

      return {
        registration: newRegistration,
        status: targetStatus,
        isWaitlist: !seatAvailable,
      };
    });

    const isWaitlist = result.status === "WAITLIST";

    return NextResponse.json(
      {
        message: isWaitlist
          ? "Event is full. You have been added to the waitlist!"
          : "Registration confirmed! Your digital ticket pass is ready.",
        registration: result.registration,
        status: result.status,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/register] Transaction error:", error);

    if (error.message === "EVENT_NOT_FOUND") {
      return NextResponse.json({ error: "Event does not exist" }, { status: 404 });
    }
    if (error.message === "EVENT_NOT_OPEN") {
      return NextResponse.json(
        { error: "This event is not accepting registrations" },
        { status: 400 }
      );
    }
    if (error.message === "ALREADY_REGISTERED") {
      return NextResponse.json(
        { error: "You are already registered for this event" },
        { status: 409 }
      );
    }
    if (error.message === "ALREADY_ON_WAITLIST") {
      return NextResponse.json(
        { error: "You are already on the waitlist for this event" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred during registration" },
      { status: 500 }
    );
  }
}

// DELETE /api/register - Cancel registration & auto-promote waitlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registrationId");

    if (!registrationId) {
      return NextResponse.json(
        { error: "Missing registrationId parameter" },
        { status: 400 }
      );
    }

    const cancelResult = await prisma.$transaction(async (tx) => {
      const reg = await tx.registration.findFirst({
        where: {
          id: registrationId,
          userId: session.user.id,
        },
        include: {
          event: true,
        },
      });

      if (!reg) {
        throw new Error("REGISTRATION_NOT_FOUND");
      }

      if (reg.status === "CANCELLED") {
        throw new Error("ALREADY_CANCELLED");
      }

      const wasConfirmed = reg.status === "REGISTERED";

      // Mark cancelled
      const updated = await tx.registration.update({
        where: { id: reg.id },
        data: {
          status: "CANCELLED",
        },
      });

      let promotedUserId: string | null = null;

      // If a confirmed seat was freed, automatically promote the earliest waitlist member
      if (wasConfirmed) {
        const nextInLine = await tx.registration.findFirst({
          where: {
            eventId: reg.eventId,
            status: "WAITLIST",
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        if (nextInLine) {
          await tx.registration.update({
            where: { id: nextInLine.id },
            data: {
              status: "REGISTERED",
            },
          });

          // Create notification for promoted user
          await tx.notification.create({
            data: {
              userId: nextInLine.userId,
              title: "Seat Confirmed!",
              message: `A spot opened up for "${reg.event.title}", and you've been automatically promoted from the waitlist! Access your ticket in My Tickets.`,
            },
          });

          promotedUserId = nextInLine.userId;
        }
      }

      return {
        cancelledId: updated.id,
        promotedUserId,
        eventTitle: reg.event.title,
      };
    });

    return NextResponse.json({
      message: "Registration cancelled successfully.",
      details: cancelResult,
    });
  } catch (error: any) {
    console.error("[DELETE /api/register] Error:", error);

    if (error.message === "REGISTRATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "Registration not found or unauthorized" },
        { status: 404 }
      );
    }
    if (error.message === "ALREADY_CANCELLED") {
      return NextResponse.json(
        { error: "This registration has already been cancelled" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to cancel registration" },
      { status: 500 }
    );
  }
}
