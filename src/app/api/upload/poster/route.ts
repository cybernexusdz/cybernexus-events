import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const BUCKET_NAME = "event-posters";
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// POST /api/upload/poster - Upload event poster image to Supabase Storage
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
        { error: "Forbidden. Only Organizers or Admins can upload event posters." },
        { status: 403 }
      );
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Supabase service credentials are not configured.";
      return NextResponse.json({ error: message }, { status: 503 });
    }

    const formData = await request.formData();
    const file = (formData.get("image") || formData.get("file")) as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided in form data (key 'image' or 'file')." },
        { status: 400 }
      );
    }

    // 1. Validate File Size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds 4MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller image.` },
        { status: 400 }
      );
    }

    // 2. Validate MIME Type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type (${file.type}). Allowed formats are JPG, PNG, and WebP.` },
        { status: 400 }
      );
    }

    // 3. Ensure Bucket Exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket(
        BUCKET_NAME,
        {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
          allowedMimeTypes: ALLOWED_MIME_TYPES,
        }
      );
      if (bucketError) {
        console.warn(
          `Could not auto-create bucket '${BUCKET_NAME}':`,
          bucketError.message
        );
      }
    }

    // 4. Generate Unique Safe Filename
    const originalName = file.name || "poster.jpg";
    const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";
    const sanitizedBase = originalName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const fileName = `posters/${Date.now()}-${sanitizedBase}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // 5. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("[POST /api/upload/poster] Storage Error:", uploadError);
      return NextResponse.json(
        { error: `Supabase Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 6. Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      path: fileName,
      fileName,
    });
  } catch (error: unknown) {
    console.error("[POST /api/upload/poster] Unexpected Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload poster image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/upload/poster - Remove an uploaded poster
export async function DELETE(request: NextRequest) {
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
        { error: "Forbidden. Only Organizers or Admins can delete posters." },
        { status: 403 }
      );
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Supabase service key missing.";
      return NextResponse.json({ error: message }, { status: 503 });
    }

    const body = await request.json();
    let filePath = body.path;
    const url = body.url;

    if (!filePath && url && typeof url === "string") {
      // Extract path after /bucket-name/
      const match = url.match(new RegExp(`/${BUCKET_NAME}/(.*)$`));
      if (match && match[1]) {
        filePath = decodeURIComponent(match[1]);
      }
    }

    if (!filePath) {
      return NextResponse.json(
        { error: "Image path or URL is required to delete." },
        { status: 400 }
      );
    }

    const { error: removeError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (removeError) {
      console.warn("[DELETE /api/upload/poster] Remove Error:", removeError);
      return NextResponse.json(
        { error: removeError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, removedPath: filePath });
  } catch (error: unknown) {
    console.error("[DELETE /api/upload/poster] Unexpected Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete poster image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
