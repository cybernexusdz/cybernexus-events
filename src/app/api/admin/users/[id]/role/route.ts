import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

// PATCH /api/admin/users/[id]/role - Promote/Demote user between STUDENT and ORGANIZER (ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden. Admin privileges required." },
        { status: 403 }
      );
    }

    const targetUserId = params.id;
    const body = await request.json().catch(() => ({}));
    const { role } = body;

    if (!role || (role !== "STUDENT" && role !== "ORGANIZER")) {
      return NextResponse.json(
        { error: "Invalid role. Role must be 'STUDENT' or 'ORGANIZER'." },
        { status: 400 }
      );
    }

    // Lookup target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Safeguard 1: Admin cannot demote or alter their own role
    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: "Action blocked: You cannot alter your own Administrator role." },
        { status: 400 }
      );
    }

    // Safeguard 2: Admin cannot alter another Admin's role via this endpoint
    if (targetUser.role === "ADMIN") {
      return NextResponse.json(
        { error: "Action blocked: Administrator roles cannot be modified via this endpoint." },
        { status: 400 }
      );
    }

    // Update role
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        level: true,
        specialty: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
      message: `Successfully updated ${updated.name || updated.email}'s role to ${role}.`,
    });
  } catch (error) {
    console.error("[PATCH /api/admin/users/[id]/role] Error:", error);
    return NextResponse.json(
      { error: "Failed to update user role." },
      { status: 500 }
    );
  }
}
