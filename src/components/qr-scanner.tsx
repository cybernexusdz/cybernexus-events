"use client";

import * as React from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ScanLine,
  RefreshCw,
} from "lucide-react";

interface ScanResult {
  type: "success" | "warning" | "error";
  message: string;
  details?: {
    name?: string;
    email?: string;
    studentId?: string | null;
    event?: string;
    checkedInAt?: string;
  };
}

interface QRScannerProps {
  onCheckInSuccess?: () => void;
}

export function QRScanner({ onCheckInSuccess }: QRScannerProps) {
  const [isScanning, setIsScanning] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = React.useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  const isCooldownRef = React.useRef(false);

  const stopScanning = React.useCallback(async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (err) {
      console.error("Error stopping camera scanner:", err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleScanText = React.useCallback(
    async (decodedText: string) => {
      if (isCooldownRef.current || isProcessing) return;

      isCooldownRef.current = true;
      setIsProcessing(true);

      // 2.5 second cooldown between scans to prevent rapid re-scans
      setTimeout(() => {
        isCooldownRef.current = false;
      }, 2500);

      try {
        const res = await fetch("/api/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketToken: decodedText.trim() }),
        });

        const data = await res.json();

        if (res.status === 200) {
          setLastScanResult({
            type: "success",
            message: "ATTENDEE VERIFIED & CHECKED IN",
            details: {
              name: data.attendee?.name,
              email: data.attendee?.email,
              studentId: data.attendee?.studentId,
              event: data.event?.title,
              checkedInAt: new Date(data.checkedInAt).toLocaleTimeString(),
            },
          });
          onCheckInSuccess?.();
        } else if (res.status === 409) {
          setLastScanResult({
            type: "warning",
            message: "ALREADY CHECKED IN PREVIOUSLY",
            details: {
              name: data.attendee?.name,
              email: data.attendee?.email,
              studentId: data.attendee?.studentId,
              event: data.event?.title,
              checkedInAt: data.checkedInAt
                ? new Date(data.checkedInAt).toLocaleTimeString()
                : "Unknown",
            },
          });
        } else {
          setLastScanResult({
            type: "error",
            message: data.error || "INVALID TICKET / SCAN FAILED",
          });
        }
      } catch (err) {
        console.error("Check-in scan API error:", err);
        setLastScanResult({
          type: "error",
          message: "Network error communicating with check-in service.",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, onCheckInSuccess]
  );

  const startScanning = async () => {
    setCameraError(null);
    setLastScanResult(null);

    try {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanText(decodedText);
        },
        () => {
          // Frame errors can be safely ignored
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera startup error:", err);
      setCameraError(
        err?.message ||
          "Could not access camera. Please ensure camera permissions are granted."
      );
      setIsScanning(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/30 p-4 rounded-xl border border-border/60">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-primary" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Door QR Scanner
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Point camera at student&apos;s digital QR ticket pass for instant verification.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isScanning ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={stopScanning}
              className="gap-2"
            >
              <CameraOff className="h-4 w-4" />
              <span>Stop Scanner</span>
            </Button>
          ) : (
            <Button
              variant="cyber"
              size="sm"
              onClick={startScanning}
              className="gap-2 cyber-glow"
            >
              <Camera className="h-4 w-4 text-primary" />
              <span>Start Camera Scanner</span>
            </Button>
          )}
        </div>
      </div>

      {cameraError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/15 p-4 text-xs text-destructive flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Camera Viewport */}
      <div className="flex flex-col items-center justify-center">
        <div
          id="reader"
          className="w-full max-w-md rounded-2xl overflow-hidden border border-border/80 bg-black shadow-2xl relative min-h-[300px] flex items-center justify-center text-center text-xs text-muted-foreground"
        >
          {!isScanning && (
            <div className="p-8 space-y-2">
              <Camera className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
              <p>Camera is currently inactive.</p>
              <p className="text-[11px] text-muted-foreground/80">
                Click &quot;Start Camera Scanner&quot; above to activate the scanner.
              </p>
            </div>
          )}
        </div>
        {isScanning && (
          <p className="text-[11px] font-mono text-muted-foreground mt-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Scanner Active • Point at white-boxed QR Pass
          </p>
        )}
      </div>

      {/* Visual Feedback Banner */}
      {lastScanResult && (
        <div
          className={`rounded-xl p-5 border shadow-lg transition-all animate-in fade-in zoom-in-95 ${
            lastScanResult.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
              : lastScanResult.type === "warning"
              ? "bg-amber-950/40 border-amber-500/50 text-amber-300"
              : "bg-destructive/20 border-destructive/60 text-destructive"
          }`}
        >
          <div className="flex items-start gap-3">
            {lastScanResult.type === "success" ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : lastScanResult.type === "warning" ? (
              <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            )}

            <div className="space-y-1 text-xs">
              <h5 className="font-mono text-sm font-bold tracking-wide uppercase">
                {lastScanResult.message}
              </h5>

              {lastScanResult.details && (
                <div className="space-y-0.5 pt-1 text-foreground/90 font-mono">
                  {lastScanResult.details.name && (
                    <p>Student: <span className="font-bold">{lastScanResult.details.name}</span></p>
                  )}
                  {lastScanResult.details.email && (
                    <p>Email: {lastScanResult.details.email}</p>
                  )}
                  {lastScanResult.details.studentId && (
                    <p>Student ID: {lastScanResult.details.studentId}</p>
                  )}
                  {lastScanResult.details.event && (
                    <p>Event: {lastScanResult.details.event}</p>
                  )}
                  {lastScanResult.details.checkedInAt && (
                    <p>Checked-in Time: {lastScanResult.details.checkedInAt}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
