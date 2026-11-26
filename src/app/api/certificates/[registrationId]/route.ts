import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    registrationId: string;
  };
}

/**
 * Safely sanitizes strings to WinAnsi/ASCII printable range (0x20 to 0x7E)
 * Built-in pdf-lib standard fonts throw an unhandled error if non-WinAnsi characters
 * (like Arabic, Cyrillic, emoji, or non-Latin glyphs) are passed to drawText or widthOfTextAtSize.
 */
function sanitizeWinAnsi(text: string, fallback: string): string {
  if (!text) return fallback;
  // Normalize and strip unicode diacritics
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Retain only printable ASCII (32-126)
  const ascii = normalized.replace(/[^\x20-\x7E]/g, "").trim();
  if (ascii.length >= 2) return ascii;

  const fallbackAscii = fallback.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "").trim();
  return fallbackAscii || "STUDENT MEMBER";
}

function safeAscii(str: string, fallback: string = ""): string {
  if (!str) return fallback;
  const normalized = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ascii = normalized.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
  return ascii || fallback;
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

    // 1. Fetch registration record
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            level: true,
            specialty: true,
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

    // 3. Resolve public verification URL
    const url = new URL(request.url);
    const queryDisplayName = url.searchParams.get("displayName");

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = process.env.NEXTAUTH_URL || `${proto}://${host}`;
    const verifyUrl = `${baseUrl}/verify/${certificate.serialNumber}`;

    // 4. Generate dynamic PDF in-memory using pdf-lib
    const pdfDoc = await PDFDocument.create();
    // A4 Landscape dimensions in points (842 x 595)
    const width = 842;
    const height = 595;
    const page = pdfDoc.addPage([width, height]);

    // Fonts
    const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // Generate crisp verification QR code in memory
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      type: "png",
      margin: 1,
      width: 140,
      errorCorrectionLevel: "M",
      color: {
        dark: "#061322",
        light: "#ffffff",
      },
    });
    const qrImage = await pdfDoc.embedPng(qrBuffer);

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
      borderColor: cyan,
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
      y: 510,
      size: 14,
      font: fontCourierBold,
      color: cyan,
    });

    // Main Certificate Title
    const titleText = "CERTIFICATE OF ATTENDANCE";
    const titleWidth = fontHelveticaBold.widthOfTextAtSize(titleText, 28);
    page.drawText(titleText, {
      x: (width - titleWidth) / 2,
      y: 468,
      size: 28,
      font: fontHelveticaBold,
      color: white,
    });

    // Subtitle
    const subText = "THIS DOCUMENT ATTESTS THAT";
    const subWidth = fontHelvetica.widthOfTextAtSize(subText, 11);
    page.drawText(subText, {
      x: (width - subWidth) / 2,
      y: 425,
      size: 11,
      font: fontHelvetica,
      color: textMuted,
    });

    // Recipient Name (WinAnsi Safe)
    const emailPrefix = registration.user.email ? registration.user.email.split("@")[0].toUpperCase() : "STUDENT";
    const rawRecipient = queryDisplayName?.trim() || registration.user.name || emailPrefix;
    const recipientName = sanitizeWinAnsi(rawRecipient, emailPrefix).toUpperCase();

    const nameWidth = fontHelveticaBold.widthOfTextAtSize(recipientName, 30);
    page.drawText(recipientName, {
      x: (width - nameWidth) / 2,
      y: 365,
      size: 30,
      font: fontHelveticaBold,
      color: cyan,
    });

    // Divider Line under name
    page.drawLine({
      start: { x: 180, y: 350 },
      end: { x: width - 180, y: 350 },
      thickness: 1,
      color: cyan,
    });

    // Middle description
    const descText =
      "has actively participated and verified in-person attendance at the official event:";
    const descWidth = fontHelvetica.widthOfTextAtSize(descText, 12);
    page.drawText(descText, {
      x: (width - descWidth) / 2,
      y: 320,
      size: 12,
      font: fontHelvetica,
      color: white,
    });

    // Event Title (Safe Ascii)
    const eventTitle = safeAscii(registration.event.title, "CyberNexus Technical Workshop");
    const eventWidth = fontHelveticaBold.widthOfTextAtSize(eventTitle, 20);
    page.drawText(eventTitle, {
      x: (width - eventWidth) / 2,
      y: 278,
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
    const safeLoc = safeAscii(registration.event.location, "University Campus");
    const safeCat = safeAscii(registration.event.category, "Workshop");
    const metaText = `Category: ${safeCat}  |  Location: ${safeLoc}  |  Date: ${eventDate}`;
    const metaWidth = fontHelvetica.widthOfTextAtSize(metaText, 11);
    page.drawText(metaText, {
      x: (width - metaWidth) / 2,
      y: 245,
      size: 11,
      font: fontHelvetica,
      color: textMuted,
    });

    // Academic Background line if present
    if (registration.user.level || registration.user.specialty) {
      const academicText = safeAscii(
        [registration.user.level, registration.user.specialty].filter(Boolean).join(" - "),
        ""
      );
      if (academicText) {
        const fullAcad = `Academic Track: ${academicText}`;
        const acadWidth = fontHelvetica.widthOfTextAtSize(fullAcad, 10);
        page.drawText(fullAcad, {
          x: (width - acadWidth) / 2,
          y: 225,
          size: 10,
          font: fontHelvetica,
          color: textMuted,
        });
      }
    }

    // --- Footer Section ---

    // Left Side: Serial Number & Issue Info
    const serialLabel = `SERIAL: ${certificate.serialNumber}`;
    page.drawText(serialLabel, {
      x: 60,
      y: 105,
      size: 11,
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
      y: 88,
      size: 9.5,
      font: fontHelvetica,
      color: textMuted,
    });

    const stampLabel = "CYBERNEXUS VERIFIED PASSPORT";
    page.drawText(stampLabel, {
      x: 60,
      y: 70,
      size: 9,
      font: fontCourierBold,
      color: textMuted,
    });

    const hashLabel = `TOKEN REF: ${registration.ticketToken.slice(0, 18)}...`;
    page.drawText(hashLabel, {
      x: 60,
      y: 55,
      size: 8.5,
      font: fontHelvetica,
      color: textMuted,
    });

    // Right Side: Embedded Verification QR Code & Link
    const qrSize = 65;
    const qrX = width - 60 - qrSize;
    const qrY = 50;

    // Draw white background backing for QR code
    page.drawRectangle({
      x: qrX - 4,
      y: qrY - 4,
      width: qrSize + 8,
      height: qrSize + 8,
      color: rgb(1, 1, 1),
    });

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    const qrText1 = "SCAN TO VERIFY";
    const qrText1Width = fontCourierBold.widthOfTextAtSize(qrText1, 9);
    page.drawText(qrText1, {
      x: qrX + (qrSize - qrText1Width) / 2,
      y: qrY + qrSize + 8,
      size: 9,
      font: fontCourierBold,
      color: cyan,
    });

    const verifyShort = `verify/${certificate.serialNumber}`;
    const verifyShortWidth = fontHelvetica.widthOfTextAtSize(verifyShort, 7.5);
    page.drawText(verifyShort, {
      x: qrX + (qrSize - verifyShortWidth) / 2,
      y: qrY - 14,
      size: 7.5,
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
