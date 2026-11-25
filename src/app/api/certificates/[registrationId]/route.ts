import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: {
    registrationId: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { registrationId } = params;
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view certificates." },
        { status: 401 }
      );
    }

    // 1. Fetch registration
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            category: true,
            location: true,
            startAt: true,
          },
        },
        certificate: true,
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Registration record not found" },
        { status: 404 }
      );
    }

    // Authorization check
    const isOwner = registration.userId === session.user.id;
    const isAdminOrOrg =
      session.user.role === "ADMIN" || session.user.role === "ORGANIZER";

    if (!isOwner && !isAdminOrOrg) {
      return NextResponse.json(
        { error: "Forbidden. You do not own this certificate." },
        { status: 403 }
      );
    }

    // Enforce check-in requirement
    if (registration.status !== "CHECKED_IN") {
      return NextResponse.json(
        {
          error:
            "Certificate is locked! Attendance must be confirmed at the event check-in desk before a certificate is issued.",
        },
        { status: 400 }
      );
    }

    // 2. Retrieve or create certificate record
    let certificate = registration.certificate;
    if (!certificate) {
      const year = new Date().getFullYear();
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const serialNumber = `CN-${year}-${randomSuffix}`;

      certificate = await prisma.certificate.create({
        data: {
          serialNumber,
          registrationId: registration.id,
        },
      });
    }

    // 3. Generate dynamic PDF in-memory using pdf-lib
    const pdfDoc = await PDFDocument.create();
    // A4 Landscape dimensions in points (841.89 x 595.28)
    const width = 842;
    const height = 595;
    const page = pdfDoc.addPage([width, height]);

    // Fonts
    const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // Cyber Color Palette
    const bgPrimary = rgb(6 / 255, 19 / 255, 34 / 255); // #061322
    const bgSurface = rgb(11 / 255, 30 / 255, 51 / 255); // #0b1e33
    const cyan = rgb(34 / 255, 211 / 255, 238 / 255); // #22d3ee
    const white = rgb(240 / 255, 253 / 255, 250 / 255);
    const textMuted = rgb(148 / 255, 163 / 255, 184 / 255); // #94a3b8

    // Background Fill
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: bgPrimary,
    });

    // Outer Decorative Border
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderColor: cyan,
      borderWidth: 2,
    });

    // Inner Surface Container
    page.drawRectangle({
      x: 35,
      y: 35,
      width: width - 70,
      height: height - 70,
      color: bgSurface,
      borderColor: rgb(34 / 255, 211 / 255, 238 / 255),
      borderWidth: 0.5,
    });

    // Corner Cyber Accents
    const drawCorner = (cx: number, cy: number, dx: number, dy: number) => {
      page.drawLine({
        start: { x: cx, y: cy },
        end: { x: cx + dx * 25, y: cy },
        thickness: 3,
        color: cyan,
      });
      page.drawLine({
        start: { x: cx, y: cy },
        end: { x: cx, y: cy + dy * 25 },
        thickness: 3,
        color: cyan,
      });
    };

    drawCorner(25, height - 25, 1, -1);
    drawCorner(width - 25, height - 25, -1, -1);
    drawCorner(25, 25, 1, 1);
    drawCorner(width - 25, 25, -1, 1);

    // Header Badge: CYBERNEXUS UNIVERSITY TECH CLUB
    const clubBadge = "CYBERNEXUS UNIVERSITY CLUB";
    const clubBadgeWidth = fontCourierBold.widthOfTextAtSize(clubBadge, 14);
    page.drawText(clubBadge, {
      x: (width - clubBadgeWidth) / 2,
      y: 505,
      size: 14,
      font: fontCourierBold,
      color: cyan,
    });

    // Main Certificate Title
    const titleText = "CERTIFICATE OF ATTENDANCE";
    const titleWidth = fontHelveticaBold.widthOfTextAtSize(titleText, 28);
    page.drawText(titleText, {
      x: (width - titleWidth) / 2,
      y: 460,
      size: 28,
      font: fontHelveticaBold,
      color: white,
    });

    // Subtitle
    const subText = "THIS DOCUMENT ATTESTS THAT";
    const subWidth = fontHelvetica.widthOfTextAtSize(subText, 11);
    page.drawText(subText, {
      x: (width - subWidth) / 2,
      y: 415,
      size: 11,
      font: fontHelvetica,
      color: textMuted,
    });

    // Recipient Name
    const recipientName = (
      registration.user.name ||
      registration.user.email ||
      "Student Member"
    ).toUpperCase();
    const nameWidth = fontHelveticaBold.widthOfTextAtSize(recipientName, 30);
    page.drawText(recipientName, {
      x: (width - nameWidth) / 2,
      y: 355,
      size: 30,
      font: fontHelveticaBold,
      color: cyan,
    });

    // Divider Line under name
    page.drawLine({
      start: { x: 180, y: 340 },
      end: { x: width - 180, y: 340 },
      thickness: 1,
      color: cyan,
    });

    // Middle description
    const descText =
      "has actively participated and verified in-person attendance at the official event:";
    const descWidth = fontHelvetica.widthOfTextAtSize(descText, 12);
    page.drawText(descText, {
      x: (width - descWidth) / 2,
      y: 310,
      size: 12,
      font: fontHelvetica,
      color: white,
    });

    // Event Title
    const eventTitle = registration.event.title;
    const eventWidth = fontHelveticaBold.widthOfTextAtSize(eventTitle, 20);
    page.drawText(eventTitle, {
      x: (width - eventWidth) / 2,
      y: 268,
      size: 20,
      font: fontHelveticaBold,
      color: white,
    });

    // Category & Date Info
    const eventDate = new Date(registration.event.startAt).toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
    const metaText = `Category: ${registration.event.category}  |  Location: ${registration.event.location}  |  Date: ${eventDate}`;
    const metaWidth = fontHelvetica.widthOfTextAtSize(metaText, 11);
    page.drawText(metaText, {
      x: (width - metaWidth) / 2,
      y: 235,
      size: 11,
      font: fontHelvetica,
      color: textMuted,
    });

    // Footer Info Box
    // Left: Serial Number
    const serialLabel = `SERIAL NUMBER: ${certificate.serialNumber}`;
    page.drawText(serialLabel, {
      x: 60,
      y: 85,
      size: 10,
      font: fontCourierBold,
      color: cyan,
    });

    const issuedLabel = `ISSUED: ${new Date(
      certificate.issuedAt
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })}`;
    page.drawText(issuedLabel, {
      x: 60,
      y: 68,
      size: 9,
      font: fontHelvetica,
      color: textMuted,
    });

    // Right: Cryptographic Verification Stamp
    const stampLabel = "CYBERNEXUS VERIFIED PASSPORT";
    const stampWidth = fontCourierBold.widthOfTextAtSize(stampLabel, 10);
    page.drawText(stampLabel, {
      x: width - 60 - stampWidth,
      y: 85,
      size: 10,
      font: fontCourierBold,
      color: cyan,
    });

    const hashLabel = `TOKEN: ${registration.ticketToken.slice(0, 18)}...`;
    const hashWidth = fontHelvetica.widthOfTextAtSize(hashLabel, 9);
    page.drawText(hashLabel, {
      x: width - 60 - hashWidth,
      y: 68,
      size: 9,
      font: fontHelvetica,
      color: textMuted,
    });

    // Serialize PDF to bytes
    const pdfBytes = await pdfDoc.save();

    // Clean safe filename
    const sanitizedTitle = registration.event.title
      .replace(/[^a-zA-Z0-9]/g, "-")
      .toLowerCase();
    const filename = `cybernexus-certificate-${sanitizedTitle}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[GET /api/certificates/[registrationId]] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate certificate PDF" },
      { status: 500 }
    );
  }
}
