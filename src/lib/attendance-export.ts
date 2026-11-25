import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

interface ExportOptions {
  eventId?: string | null;
}

// Formats Date into DD/MM/YYYY HH:mm
function formatDateTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export async function handleAttendanceExport(
  request: NextRequest,
  options?: ExportOptions
) {
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
        { error: "Forbidden. Only Organizers or Admins can export attendance data." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventIdParam = options?.eventId || searchParams.get("eventId") || searchParams.get("id") || "all";
    const isAll = !eventIdParam || eventIdParam.toLowerCase() === "all";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let targetEvent: any = null;
    if (!isAll) {
      targetEvent = await prisma.event.findUnique({
        where: { id: eventIdParam },
      });

      if (!targetEvent) {
        return NextResponse.json(
          { error: "Event not found." },
          { status: 404 }
        );
      }
    }

    // Fetch registrations with user and event details
    const registrations = await prisma.registration.findMany({
      where: isAll ? {} : { eventId: eventIdParam },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
            location: true,
            startAt: true,
            endAt: true,
            maxCapacity: true,
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { createdAt: "asc" },
      ],
    });

    const format = (searchParams.get("format") || "xlsx").toLowerCase();
    const timestampStr = new Date().toISOString().slice(0, 10);
    const sanitizedTitle = isAll
      ? "All_Club_Events"
      : (targetEvent?.title || "Event").replace(/[^a-zA-Z0-9_-]/g, "_");
    const baseFilename = `CyberNexus_Attendance_${sanitizedTitle}_${timestampStr}`;

    // Metrics calculation
    const totalCount = registrations.length;
    const registeredCount = registrations.filter((r) => r.status === "REGISTERED").length;
    const checkedInCount = registrations.filter((r) => r.status === "CHECKED_IN").length;
    const waitlistCount = registrations.filter((r) => r.status === "WAITLIST").length;
    const cancelledCount = registrations.filter((r) => r.status === "CANCELLED").length;
    const eligibleAttendees = registeredCount + checkedInCount;
    const turnoutPct =
      eligibleAttendees > 0
        ? Math.round((checkedInCount / eligibleAttendees) * 100)
        : 0;

    // =========================================================================
    // Format 1: CSV Export (with \uFEFFsep=,\r\n for European/French Excel)
    // =========================================================================
    if (format === "csv") {
      const headers = [
        "#",
        "Full Name",
        "Email",
        "Academic Level",
        "Specialty",
        "Student ID",
        "Event Title",
        "Status",
        "Registered At",
        "Check-In Time",
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = registrations.map((r, index) => [
        index + 1,
        r.user.name || "Student Member",
        r.user.email || "",
        r.user.level || "—",
        r.user.specialty || "—",
        r.user.studentId || "—",
        r.event.title,
        r.status,
        formatDateTime(r.createdAt),
        formatDateTime(r.checkedInAt),
      ]);

      // Prepend UTF-8 BOM and sep=, so French/Arabic/European Excel opens cleanly in distinct columns
      const csvContent =
        "\uFEFFsep=,\r\n" +
        [
          headers.map(escapeCsv).join(","),
          ...rows.map((row) => row.map(escapeCsv).join(",")),
        ].join("\r\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseFilename}.csv"`,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // =========================================================================
    // Format 2: Styled ExcelJS Workbook (.xlsx)
    // =========================================================================
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CyberNexus Events Platform";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Attendance Roster", {
      views: [{ showGridLines: true, ySplit: 5 }],
    });

    // -------------------------------------------------------------------------
    // Row 1: Merged Title Banner across Columns A to J (Height 28)
    // -------------------------------------------------------------------------
    worksheet.mergeCells("A1:J1");
    const bannerCell = worksheet.getCell("A1");
    bannerCell.value = "CYBERNEXUS CLUB — OFFICIAL ATTENDANCE REPORT";
    bannerCell.font = {
      name: "Calibri",
      size: 14,
      bold: true,
      color: { argb: "FF22D3EE" }, // #22D3EE Cyber Cyan
    };
    bannerCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF061322" }, // #061322 Cyber Dark Navy
    };
    bannerCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 28;

    // -------------------------------------------------------------------------
    // Rows 2 & 3: Event Context and Summary Metrics Block
    // -------------------------------------------------------------------------
    worksheet.getRow(2).height = 20;
    worksheet.getRow(3).height = 20;
    worksheet.getRow(4).height = 10; // Empty spacer row

    // Row 2: Event Details
    worksheet.getCell("A2").value = "Event:";
    worksheet.getCell("B2").value = isAll ? "All Club Events" : targetEvent.title;
    worksheet.mergeCells("B2:D2");

    worksheet.getCell("E2").value = "Venue:";
    worksheet.getCell("F2").value = isAll ? "Campus Labs & Online" : targetEvent.location;
    worksheet.mergeCells("F2:H2");

    worksheet.getCell("I2").value = "Export Date:";
    worksheet.getCell("J2").value = formatDateTime(new Date());

    // Row 3: Summary Attendance Metrics
    worksheet.getCell("A3").value = "Registered:";
    worksheet.getCell("B3").value = registeredCount;

    worksheet.getCell("C3").value = "Checked In:";
    worksheet.getCell("D3").value = checkedInCount;

    worksheet.getCell("E3").value = "Waitlist:";
    worksheet.getCell("F3").value = waitlistCount;

    worksheet.getCell("G3").value = "Cancelled:";
    worksheet.getCell("H3").value = cancelledCount;

    worksheet.getCell("I3").value = "Attendance Rate:";
    worksheet.getCell("J3").value = `${turnoutPct}% (${checkedInCount}/${eligibleAttendees})`;

    // Style Metadata Labels
    const metaLabelCells = ["A2", "E2", "I2", "A3", "C3", "E3", "G3", "I3"];
    metaLabelCells.forEach((ref) => {
      const cell = worksheet.getCell(ref);
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0284C7" } };
      cell.alignment = { horizontal: "right", vertical: "middle" };
    });

    // Style Metadata Values
    const metaValCells = ["B2", "F2", "J2", "B3", "D3", "F3", "H3", "J3"];
    metaValCells.forEach((ref) => {
      const cell = worksheet.getCell(ref);
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: "left", vertical: "middle" };
    });

    // Highlight Turnout Cell
    worksheet.getCell("J3").font = {
      name: "Calibri",
      size: 10,
      bold: true,
      color: { argb: "FF166534" }, // Green
    };

    // -------------------------------------------------------------------------
    // Row 5: Table Column Headers (Height 24, #0B1E33 dark navy fill)
    // -------------------------------------------------------------------------
    const headerRow = worksheet.getRow(5);
    headerRow.values = [
      "#",
      "Full Name",
      "Email",
      "Academic Level",
      "Specialty",
      "Student ID",
      "Event Title",
      "Status",
      "Registered At",
      "Check-In Time",
    ];
    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.font = {
        name: "Calibri",
        size: 10.5,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0B1E33" }, // #0B1E33
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF22D3EE" } },
        bottom: { style: "medium", color: { argb: "FF22D3EE" } },
        left: { style: "thin", color: { argb: "FF1E293B" } },
        right: { style: "thin", color: { argb: "FF1E293B" } },
      };
    });

    // -------------------------------------------------------------------------
    // Rows 6+: Attendee Data Rows
    // -------------------------------------------------------------------------
    registrations.forEach((reg, idx) => {
      const rowNum = 6 + idx;
      const row = worksheet.getRow(rowNum);

      row.values = [
        idx + 1,
        reg.user.name || "Student Member",
        reg.user.email || "",
        reg.user.level || "—",
        reg.user.specialty || "—",
        reg.user.studentId || "—",
        reg.event.title,
        reg.status,
        formatDateTime(reg.createdAt),
        formatDateTime(reg.checkedInAt),
      ];
      row.height = 22;

      const isEvenRow = idx % 2 === 1;
      const rowBgColor = isEvenRow ? "FFF8FAFC" : "FFFFFFFF"; // #F8FAFC alternating

      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Calibri", size: 10, color: { argb: "FF1E293B" } };
        cell.alignment = { vertical: "middle" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowBgColor },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        // Center align index, level, student ID, status, and dates
        if ([1, 4, 6, 8, 9, 10].includes(colNumber)) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }

        // Color-coded Status Cell (Col 8)
        if (colNumber === 8) {
          switch (reg.status) {
            case "CHECKED_IN":
              cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF15803D" } }; // Green
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFDCFCE7" }, // #DCFCE7
              };
              break;
            case "REGISTERED":
              cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0369A1" } }; // Blue
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFE0F2FE" }, // #E0F2FE
              };
              break;
            case "WAITLIST":
              cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFB45309" } }; // Amber
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFEF3C7" }, // #FEF3C7
              };
              break;
            case "CANCELLED":
              cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFB91C1C" } }; // Red
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFEE2E2" }, // #FEE2E2
              };
              break;
          }
        }
      });
    });

    // -------------------------------------------------------------------------
    // AutoFilter across all columns on Row 5
    // -------------------------------------------------------------------------
    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: 10 },
    };

    // -------------------------------------------------------------------------
    // Auto-fit Column Widths with padding and sensible caps
    // -------------------------------------------------------------------------
    worksheet.columns.forEach((column, index) => {
      let maxLen = 0;
      column.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
        // Skip banner row 1 when calculating width
        if (rowNumber > 1) {
          const cellStr = cell.value ? String(cell.value) : "";
          if (cellStr.length > maxLen) {
            maxLen = cellStr.length;
          }
        }
      });

      // Min/max widths per column index
      const minWidths = [6, 18, 24, 12, 18, 14, 22, 14, 18, 18];
      const colMin = minWidths[index] || 12;
      column.width = Math.min(Math.max(maxLen + 4, colMin), 45);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseFilename}.xlsx"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: unknown) {
    console.error("[Attendance Export] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to export attendance records";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
