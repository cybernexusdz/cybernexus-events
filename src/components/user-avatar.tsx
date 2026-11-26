"use client";

import * as React from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number | string;
  className?: string;
  ring?: boolean;
}

export function UserAvatar({
  src,
  name,
  size = 32,
  className,
  ring = true,
}: UserAvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  // Derive up to 2 uppercase initials from name
  const initials = React.useMemo(() => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  const sizeStyle = typeof size === "number" ? { width: size, height: size } : undefined;
  const sizeClass = typeof size === "string" ? size : "";

  if (src && !imageError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || "User Avatar"}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        data-html-to-image-skip={src.includes("googleusercontent.com") ? "true" : undefined}
        onError={() => setImageError(true)}
        style={sizeStyle}
        className={cn(
          "rounded-full object-cover shrink-0",
          ring && "ring-1 ring-[var(--accent)]/50",
          sizeClass,
          className
        )}
      />
    );
  }

  return (
    <div
      style={sizeStyle}
      className={cn(
        "rounded-full flex items-center justify-center font-mono font-bold shrink-0 bg-[var(--bg-surface)] text-[var(--accent)]",
        ring && "ring-1 ring-[var(--accent)]/50",
        sizeClass,
        className
      )}
      title={name || "User"}
    >
      {initials ? (
        <span className="text-xs leading-none select-none">{initials}</span>
      ) : (
        <User className="h-4 w-4 opacity-80" />
      )}
    </div>
  );
}
