"use client";

import * as React from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyVerifyButtonProps {
  serialNumber: string;
}

export function CopyVerifyButton({ serialNumber }: CopyVerifyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : `https://cybernexus-events.vercel.app/verify/${serialNumber}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-2 text-xs border-primary/40 hover:bg-primary/10 hover:text-primary transition-all font-mono"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-emerald-400">Link Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 text-primary" />
          <span>Copy Verification Link</span>
        </>
      )}
    </Button>
  );
}
