import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/users - Search and list registered users (ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    const where: any = {};
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { studentId: { contains: query, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: [
        { role: "asc" }, // ADMIN, ORGANIZER, STUDENT
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        studentId: true,
        level: true,
        specialty: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            registrations: true,
            events: true,
          },
        },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("[GET /api/admin/users] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users list." },
      { status: 500 }
    );
  }
}
