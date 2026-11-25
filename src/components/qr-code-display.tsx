"use client";

import * as React from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Standard QR Code component for CyberNexus.
 * STRICT REQUIREMENT: Always renders inside a solid white container
 * (bg-white p-3 rounded-xl) for reliable camera scanning.
 */
export function QRCodeDisplay({
  value,
  size = 200,
  className,
}: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = React.useState<string>("");

  React.useEffect(() => {
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [value, size]);

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center bg-white p-3 rounded-xl shadow-xl transition-transform hover:scale-105",
        className
      )}
    >
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={`QR Code for ${value}`}
          width={size}
          height={size}
          className="rounded-lg object-contain"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="flex items-center justify-center text-slate-400 text-xs font-mono bg-slate-100 rounded-lg animate-pulse"
        >
          Generating QR...
        </div>
      )}
    </div>
  );
}
