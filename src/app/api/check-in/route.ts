import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/check-in - Scan and check in ticket
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const role = session.user.role;
    if (role !== "ORGANIZER" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden. Only Organizers or Admins can check in attendees." },
        { status: 403 }
      );
    }

    const body = await request.json();
    let { ticketToken, eventId } = body;

    if (!ticketToken || typeof ticketToken !== "string") {
      return NextResponse.json(
        { error: "Ticket token is required" },
        { status: 400 }
      );
    }

    // Clean ticketToken if scanned with custom scheme (e.g. cybernexus://ticket/<UUID>)
    if (ticketToken.includes("cybernexus://ticket/")) {
      ticketToken = ticketToken.replace("cybernexus://ticket/", "").trim();
    } else if (ticketToken.includes("cybernexus://pass/")) {
      ticketToken = ticketToken.replace("cybernexus://pass/", "").trim();
    }

    // Find registration with user and event details
    const registration = await prisma.registration.findUnique({
      where: {
        ticketToken,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            image: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
            location: true,
            organizerId: true,
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        {
          error: "Invalid Ticket Token. No matching registration found in the database.",
          status: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Optional eventId matching validation
    if (eventId && registration.eventId !== eventId) {
      return NextResponse.json(
        {
          error: `Ticket is for a different event: "${registration.event.title}"`,
          status: "WRONG_EVENT",
          eventTitle: registration.event.title,
        },
        { status: 400 }
      );
    }

    // Check status
    if (registration.status === "CHECKED_IN") {
      return NextResponse.json(
        {
          error: "Ticket has ALREADY been checked in!",
          status: "ALREADY_CHECKED_IN",
          checkedInAt: registration.checkedInAt,
          attendee: {
            name: registration.user.name || "Member",
            email: registration.user.email,
            studentId: registration.user.studentId,
          },
          event: {
            title: registration.event.title,
          },
        },
        { status: 409 }
      );
    }

    if (registration.status === "WAITLIST") {
      return NextResponse.json(
        {
          error: "This pass is on the WAITLIST. Attendee does not have a confirmed seat.",
          status: "WAITLIST",
          attendee: {
            name: registration.user.name,
            email: registration.user.email,
          },
        },
        { status: 400 }
      );
    }

    if (registration.status === "CANCELLED") {
      return NextResponse.json(
        {
          error: "This registration was CANCELLED by the student.",
          status: "CANCELLED",
        },
        { status: 400 }
      );
    }

    // Perform check-in
    const now = new Date();
    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        status: "CHECKED_IN",
        checkedInAt: now,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            studentId: true,
          },
        },
        event: {
          select: {
            title: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Check-in successful! Attendee verified.",
      status: "CHECKED_IN",
      checkedInAt: now,
      attendee: {
        name: updated.user.name || "Member",
        email: updated.user.email,
        studentId: updated.user.studentId,
      },
      event: {
        title: updated.event.title,
      },
    });
  } catch (error) {
    console.error("[POST /api/check-in] Error:", error);
    return NextResponse.json(
      { error: "Internal server error during check-in" },
      { status: 500 }
    );
  }
}

// GET /api/check-in - Get attendees list for an event (Organizers/Admins)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const role = session.user.role;
    if (role !== "ORGANIZER" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden. Organizer or Admin role required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    const where: any = {};
    if (eventId) {
      where.eventId = eventId;
    }

    const attendees = await prisma.registration.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        ticketToken: true,
        status: true,
        checkedInAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            studentId: true,
            level: true,
            specialty: true,
            role: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            category: true,
            maxCapacity: true,
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

    return NextResponse.json(attendees);
  } catch (error) {
    console.error("[GET /api/check-in] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendees" },
      { status: 500 }
    );
  }
}
