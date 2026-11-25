import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { eventFormSchema } from "@/lib/validations/event";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("q");
    const requestedStatus = searchParams.get("status");

    const session = await auth();
    const isOrganizerOrAdmin =
      session?.user?.role === "ORGANIZER" || session?.user?.role === "ADMIN";

    // Build Prisma where clause
    const where: any = {};

    // Status filter
    if (requestedStatus && isOrganizerOrAdmin) {
      if (requestedStatus !== "ALL") {
        where.status = requestedStatus;
      }
    } else {
      where.status = "PUBLISHED";
    }

    // Category filter
    if (category && category !== "ALL") {
      where.category = {
        equals: category,
        mode: "insensitive",
      };
    }

    // Search query
    if (search && search.trim() !== "") {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
        { location: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: {
        startAt: "asc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        location: true,
        posterUrl: true,
        startAt: true,
        endAt: true,
        maxCapacity: true,
        status: true,
        organizer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        registrations: {
          select: {
            status: true,
          },
        },
      },
    });

    // Format events with registration and waitlist counts
    const formattedEvents = events.map((event) => {
      const confirmedCount = event.registrations.filter(
        (r) => r.status === "REGISTERED" || r.status === "CHECKED_IN"
      ).length;
      const waitlistCount = event.registrations.filter(
        (r) => r.status === "WAITLIST"
      ).length;

      // Exclude full registrations list from payload
      const { registrations, ...rest } = event;
      return {
        ...rest,
        registeredCount: confirmedCount,
        waitlistCount,
        spotsLeft: Math.max(0, event.maxCapacity - confirmedCount),
        isFull: confirmedCount >= event.maxCapacity,
      };
    });

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error("[GET /api/events] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

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
        { error: "Forbidden. Organizer or Admin role required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = eventFormSchema.safeParse(body);

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

    const newEvent = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category.toUpperCase(),
        location: data.location,
        posterUrl: data.posterUrl || null,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        maxCapacity: data.maxCapacity,
        status: data.status,
        organizerId: session.user.id,
      },
    });

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error("[POST /api/events] Error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
