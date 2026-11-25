import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validations/profile";

// GET /api/profile - Fetch current user's profile
export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        level: true,
        specialty: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("[GET /api/profile] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PATCH /api/profile - Update academic profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = profileSchema.safeParse(body);

    if (!validation.success) {
      const flattened = validation.error.flatten();
      return NextResponse.json(
        {
          error: Object.values(flattened.fieldErrors)[0]?.[0] || "Invalid profile data",
          fieldErrors: flattened.fieldErrors,
        },
        { status: 400 }
      );
    }

    const { level, specialty, studentId } = validation.data;
    // Normalize empty strings to null so unique constraint on studentId never fails on blanks
    const cleanStudentId = studentId?.trim() ? studentId.trim() : null;

    // Check unique studentId if changed
    if (cleanStudentId) {
      const existing = await prisma.user.findUnique({
        where: { studentId: cleanStudentId },
        select: { id: true },
      });

      if (existing && existing.id !== session.user.id) {
        return NextResponse.json(
          {
            error: "This student ID / matricule is already associated with another account.",
            fieldErrors: { studentId: ["This student ID is already taken."] },
          },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        level,
        specialty,
        studentId: cleanStudentId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        level: true,
        specialty: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[PATCH /api/profile] Error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
