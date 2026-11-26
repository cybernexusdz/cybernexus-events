import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/notifications - List latest 15 notifications + unread count
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("[GET /api/notifications] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark one or all notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json().catch(() => ({}));
    const { id, all } = body;

    if (all) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, markedAll: true });
    }

    if (id) {
      await prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json(
      { error: "Invalid request. Provide 'id' or 'all: true'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[PATCH /api/notifications] Error:", error);
    return NextResponse.json(
      { error: "Failed to update notification status." },
      { status: 500 }
    );
  }
}
