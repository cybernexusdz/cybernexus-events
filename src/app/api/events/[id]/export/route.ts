import { NextRequest } from "next/server";
import { handleAttendanceExport } from "@/lib/attendance-export";

export const dynamic = "force-dynamic";

// GET /api/events/[id]/export - Export single event or "all"
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleAttendanceExport(request, { eventId: params.id });
}
