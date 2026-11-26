"use client";

import * as React from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ScanLine,
  Upload,
  FileImage,
  KeyRound,
  RefreshCw,
  Loader2,
  Check,
  Smartphone,
  Laptop,
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

interface CameraOption {
  id: string;
  label: string;
}

function getFriendlyCameraError(err: any): string {
  const name = err?.name || "";
  const msg = err?.message || "";

  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    msg.toLowerCase().includes("permission")
  ) {
    return "Camera permission denied. Please grant camera access in your browser address bar settings and refresh.";
  }
  if (
    name === "NotFoundError" ||
    name === "DevicesNotFoundError" ||
    msg.toLowerCase().includes("notfound")
  ) {
    return "No camera device detected on this system. You can scan from a QR image or enter the ticket token manually below.";
  }
  if (
    name === "NotReadableError" ||
    name === "TrackStartError" ||
    msg.toLowerCase().includes("in use") ||
    msg.toLowerCase().includes("busy")
  ) {
    return "Camera hardware is currently in use by another application or browser tab. Please close other camera apps and retry.";
  }
  if (name === "OverconstrainedError") {
    return "The requested camera resolution or orientation could not be satisfied. Retrying with default camera...";
  }

  return (
    msg ||
    "Could not initialize camera. Please verify device permissions or use the image upload / manual token fallback below."
  );
}

export function QRScanner({ onCheckInSuccess }: QRScannerProps) {
  const [isScanning, setIsScanning] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [cameraErrorName, setCameraErrorName] = React.useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = React.useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Available camera devices state
  const [availableCameras, setAvailableCameras] = React.useState<CameraOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = React.useState<string>("");

  // Manual Token fallback state
  const [manualToken, setManualToken] = React.useState("");

  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const isCooldownRef = React.useRef(false);

  // Discover and list camera devices
  const enumerateCameras = React.useCallback(async (): Promise<CameraOption[]> => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const formatted: CameraOption[] = devices.map((d, idx) => ({
          id: d.id,
          label: d.label || `Camera ${idx + 1}`,
        }));
        setAvailableCameras(formatted);

        // Auto-select preferred camera: prefer rear/back/environment for mobile, else first device
        const rear = formatted.find((c) =>
          /(back|rear|environment|arri[eè]re)/i.test(c.label)
        );
        const preferredId = rear ? rear.id : formatted[0].id;
        setSelectedCameraId((prev) => prev || preferredId);
        return formatted;
      }
    } catch (err) {
      console.warn("Camera enumeration error (permission may not be granted yet):", err);
    }
    return [];
  }, []);

  React.useEffect(() => {
    enumerateCameras();
  }, [enumerateCameras]);

  // Clean stop for webcam
  const stopScanning = React.useCallback(async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (err) {
      console.warn("Error stopping camera scanner:", err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Shared token check-in handler (invoked by camera, file upload, or manual entry)
  const handleScanText = React.useCallback(
    async (decodedText: string) => {
      const cleanToken = decodedText.trim();
      if (!cleanToken || isCooldownRef.current || isProcessing) return;

      isCooldownRef.current = true;
      setIsProcessing(true);

      // 2.5s cooldown to avoid multiple rapid re-scans of the same ticket
      setTimeout(() => {
        isCooldownRef.current = false;
      }, 2500);

      try {
        const res = await fetch("/api/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketToken: cleanToken }),
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
                : "Earlier",
            },
          });
        } else {
          setLastScanResult({
            type: "error",
            message: data.error || "INVALID TICKET TOKEN / CHECK-IN FAILED",
          });
        }
      } catch (err) {
        console.error("Check-in scan API error:", err);
        setLastScanResult({
          type: "error",
          message: "Network error communicating with check-in verification service.",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, onCheckInSuccess]
  );

  // Start webcam with robust multi-camera selection and fallback
  const startScanning = async (overrideCameraId?: string) => {
    setCameraError(null);
    setCameraErrorName(null);
    setLastScanResult(null);

    try {
      // 1. Enumerate available cameras
      let devices = availableCameras;
      if (devices.length === 0) {
        devices = await enumerateCameras();
      }

      if (devices.length === 0) {
        setCameraError("No camera detected on this device.");
        setCameraErrorName("NotFoundError");
        setIsScanning(false);
        return;
      }

      // 2. Select target camera ID
      let targetCameraId = overrideCameraId || selectedCameraId;
      if (!targetCameraId && devices.length > 0) {
        const rear = devices.find((c) =>
          /(back|rear|environment|arri[eè]re)/i.test(c.label)
        );
        targetCameraId = rear ? rear.id : devices[0].id;
        setSelectedCameraId(targetCameraId);
      }

      // Ensure prior instance is cleaned
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }

      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      // 3. Attempt camera start
      try {
        await html5QrCode.start(
          targetCameraId ? targetCameraId : { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleScanText(decodedText);
          },
          () => {
            // Frame parse ignore
          }
        );
      } catch (startErr: any) {
        console.warn("Primary camera start failed, retrying user-facing fallback:", startErr);
        // Fallback: try { facingMode: "user" }
        await html5QrCode.start(
          { facingMode: "user" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleScanText(decodedText);
          },
          () => {}
        );
      }

      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera startup error:", err);
      const errName = err?.name || "CameraError";
      setCameraErrorName(errName);
      setCameraError(getFriendlyCameraError(err));
      setIsScanning(false);
    }
  };

  // Camera dropdown change handler
  const handleCameraChange = async (newId: string) => {
    setSelectedCameraId(newId);
    if (isScanning) {
      await stopScanning();
      await startScanning(newId);
    }
  };

  // Fallback 1: Scan from QR Image File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    setCameraErrorName(null);
    setIsProcessing(true);

    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        setIsScanning(false);
      }

      let instance = scannerRef.current;
      if (!instance) {
        instance = new Html5Qrcode("reader");
        scannerRef.current = instance;
      }

      const decodedText = await instance.scanFile(file, true);
      if (decodedText) {
        await handleScanText(decodedText);
      }
    } catch (err: any) {
      console.error("QR image scan failure:", err);
      setLastScanResult({
        type: "error",
        message: "NO QR CODE DETECTED: Could not decode a valid ticket QR pass in the selected image.",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Fallback 2: Manual Ticket Token Submit
  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = manualToken.trim();
    if (!token) return;
    await handleScanText(token);
    setManualToken("");
  };

  // Strict cleanup on unmount so camera is never left active
  React.useEffect(() => {
    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => {
              scannerRef.current?.clear();
            })
            .catch((err) => {
              console.warn("Cleanup error on unmount:", err);
            });
        } else {
          try {
            scannerRef.current.clear();
          } catch (_) {}
        }
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-secondary/30 p-4 rounded-xl border border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <ScanLine className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>Door QR Scanner</span>
              {isScanning && (
                <Badge variant="neon" className="text-[9px] px-1.5 py-0 uppercase animate-pulse">
                  Active
                </Badge>
              )}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Point camera at student&apos;s digital QR ticket pass for instant verification.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Camera Selector Dropdown (When multiple cameras exist) */}
          {availableCameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => handleCameraChange(e.target.value)}
              className="bg-card text-xs font-mono rounded-lg px-2.5 py-1.5 border border-border/70 focus:outline-none focus:border-primary max-w-[180px] sm:max-w-[220px] truncate"
              title="Select camera device"
            >
              {availableCameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label}
                </option>
              ))}
            </select>
          )}

          {isScanning ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={stopScanning}
              className="gap-2 h-9 text-xs"
            >
              <CameraOff className="h-4 w-4" />
              <span>Stop Scanner</span>
            </Button>
          ) : (
            <Button
              variant="cyber"
              size="sm"
              onClick={() => startScanning()}
              disabled={isProcessing}
              className="gap-2 h-9 text-xs cyber-glow"
            >
              <Camera className="h-4 w-4 text-primary" />
              <span>Start Camera Scanner</span>
            </Button>
          )}
        </div>
      </div>

      {/* Real Error Diagnostic Banner */}
      {cameraError && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/15 p-4 text-xs text-destructive space-y-1 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>Camera Initialization Failed</span>
            {cameraErrorName && (
              <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px] font-mono ml-auto">
                {cameraErrorName}
              </Badge>
            )}
          </div>
          <p className="text-[11px] pl-6 text-destructive/90 leading-relaxed">
            {cameraError}
          </p>
        </div>
      )}

      {/* Camera Viewport Canvas */}
      <div className="flex flex-col items-center justify-center">
        <div
          id="reader"
          className="w-full max-w-md rounded-2xl overflow-hidden border border-border/80 bg-black shadow-2xl relative min-h-[300px] flex items-center justify-center text-center text-xs text-muted-foreground"
        >
          {!isScanning && (
            <div className="p-8 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-card/60 border border-border/80 flex items-center justify-center mx-auto text-muted-foreground opacity-60">
                <Camera className="h-7 w-7" />
              </div>
              <p className="font-medium text-foreground text-sm">Camera is inactive</p>
              <p className="text-[11px] text-muted-foreground/80 max-w-xs mx-auto">
                Click &quot;Start Camera Scanner&quot; above, or use the image upload and manual token options below.
              </p>
            </div>
          )}
        </div>

        {isScanning && (
          <p className="text-[11px] font-mono text-muted-foreground mt-2.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Scanner Active • Hold QR ticket inside viewport</span>
          </p>
        )}
      </div>

      {/* Dual Fallbacks Panel: Image File Scan & Manual Token Check-In */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Fallback 1: Scan from QR Image File */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileImage className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              Fallback 1: Scan from Image
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Upload a saved screenshot or PNG pass from a student if camera access is restricted.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full gap-2 text-xs border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            {isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-primary" />
            )}
            <span>Upload Ticket Image (.png/.jpg)</span>
          </Button>
        </div>

        {/* Fallback 2: Manual Token Check-In */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold text-foreground">
              Fallback 2: Manual Token Input
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Paste the ticket UUID printed on the student&apos;s pass if lighting is poor or screen is cracked.
          </p>

          <form onSubmit={handleManualCheckIn} className="flex gap-2">
            <Input
              placeholder="e.g. 550e8400-e29b-41d4-a716..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className="text-xs font-mono h-9 bg-card"
            />
            <Button
              type="submit"
              variant="cyber"
              size="sm"
              disabled={isProcessing || !manualToken.trim()}
              className="h-9 text-xs px-3 shrink-0"
            >
              {isProcessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>Verify</span>
            </Button>
          </form>
        </div>
      </div>

      {/* Visual Feedback Result Banner */}
      {lastScanResult && (
        <div
          className={`rounded-xl p-5 border shadow-xl transition-all animate-in fade-in zoom-in-95 ${
            lastScanResult.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              : lastScanResult.type === "warning"
              ? "bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
              : "bg-destructive/20 border-destructive/60 text-destructive shadow-[0_0_20px_rgba(239,68,68,0.15)]"
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

            <div className="space-y-1.5 text-xs flex-1">
              <h5 className="font-mono text-sm font-bold tracking-wide uppercase">
                {lastScanResult.message}
              </h5>

              {lastScanResult.details && (
                <div className="space-y-1 pt-1 text-foreground/90 font-mono text-[11px] bg-black/30 p-3 rounded-lg border border-border/40">
                  {lastScanResult.details.name && (
                    <p>
                      Attendee: <span className="font-bold text-foreground">{lastScanResult.details.name}</span>
                    </p>
                  )}
                  {lastScanResult.details.email && (
                    <p>Email: {lastScanResult.details.email}</p>
                  )}
                  {lastScanResult.details.studentId && (
                    <p>Student ID: {lastScanResult.details.studentId}</p>
                  )}
                  {lastScanResult.details.event && (
                    <p>Workshop: {lastScanResult.details.event}</p>
                  )}
                  {lastScanResult.details.checkedInAt && (
                    <p className="text-emerald-400 font-semibold">
                      Door Verified Time: {lastScanResult.details.checkedInAt}
                    </p>
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
