"use client";

import * as React from "react";
import { UploadCloud, Image as ImageIcon, X, RefreshCw, Link as LinkIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PosterUploaderProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

export function PosterUploader({ value, onChange, className }: PosterUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [showUrlFallback, setShowUrlFallback] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileSelect = async (file: File) => {
    setUploadError(null);

    // 1. Validate File Type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Invalid file type. Only JPG, PNG, and WebP are allowed.");
      return;
    }

    // 2. Validate File Size (4MB)
    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is 4MB.`);
      return;
    }

    // 3. Upload to /api/upload/poster
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upload/poster", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed. Please try again or paste a direct image URL.");
      }

      if (data.url) {
        onChange(data.url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during upload.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = async () => {
    const oldUrl = value;
    onChange("");
    setUploadError(null);

    // Optional background cleanup if it's our Supabase bucket
    if (oldUrl && oldUrl.includes("event-posters")) {
      try {
        await fetch("/api/upload/poster", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: oldUrl }),
        });
      } catch (e) {
        console.warn("Background poster cleanup failed:", e);
      }
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      {/* Case 1: An image is present (Preview + Replace/Remove controls) */}
      {value ? (
        <div className="relative rounded-xl border border-primary/40 bg-card/70 p-3 overflow-hidden shadow-lg space-y-3">
          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/40 border border-border/60 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Event Poster Preview"
              className="w-full h-full object-cover"
              onError={() => {
                setUploadError("Image failed to load. The URL may be invalid or expired.");
              }}
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-primary font-mono text-xs">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span>Uploading replacement...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate max-w-[240px]">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="truncate font-mono text-[11px]" title={value}>
                {value.includes("event-posters") ? "Stored in Supabase" : value}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-7 text-xs gap-1 border-primary/40 hover:bg-primary/10"
              >
                <RefreshCw className="h-3 w-3 text-primary" />
                <span>Replace</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isUploading}
                onClick={handleRemove}
                className="h-7 text-xs text-destructive hover:bg-destructive/10"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                <span>Remove</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Case 2: No image yet - Drag & Drop / Click Zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            "relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200",
            "bg-card/40 hover:bg-card/70 hover:border-primary/70",
            isDragging
              ? "border-primary bg-primary/10 shadow-[0_0_20px_var(--glow-color)]"
              : "border-border/70",
            isUploading && "pointer-events-none opacity-80"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-4">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">
                  Uploading to Supabase Storage...
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Compressing and securing public CDN link
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  <span className="text-primary hover:underline">Click to upload</span> or drag and drop
                </p>
                <p className="text-[11px] text-muted-foreground">
                  JPG, PNG, or WebP (max. 4MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {uploadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 flex items-start gap-2 text-xs text-destructive animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 text-[11px] leading-relaxed">
            {uploadError}
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-destructive/70 hover:text-destructive shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Fallback Collapsible Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowUrlFallback(!showUrlFallback)}
          className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 focus:outline-none"
        >
          <LinkIcon className="h-3 w-3" />
          <span>{showUrlFallback ? "Hide URL input" : "or paste direct image URL"}</span>
        </button>

        {showUrlFallback && (
          <div className="mt-2 space-y-1 animate-in fade-in duration-200">
            <Input
              type="url"
              placeholder="https://images.unsplash.com/... or Supabase public URL"
              value={value}
              onChange={(e) => {
                setUploadError(null);
                onChange(e.target.value);
              }}
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Direct HTTPS link to an external image poster.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
