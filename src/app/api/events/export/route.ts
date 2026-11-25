import { NextRequest } from "next/server";
import { handleAttendanceExport } from "@/lib/attendance-export";

export const dynamic = "force-dynamic";

// GET /api/events/export?eventId=all|uuid
export async function GET(request: NextRequest) {
  return handleAttendanceExport(request);
}
