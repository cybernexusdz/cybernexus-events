"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { toPng } from "html-to-image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeDisplay } from "@/components/qr-code-display";
import { ProfileModal } from "@/components/profile-modal";
import { UserAvatar } from "@/components/user-avatar";
import {
  Calendar,
  MapPin,
  Ticket,
  ShieldCheck,
  Download,
  LogIn,
  Share2,
  CalendarPlus,
  Trash2,
  Award,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";

interface UserRegistration {
  id: string;
  ticketToken: string;
  status: "REGISTERED" | "WAITLIST" | "CHECKED_IN" | "CANCELLED";
  checkedInAt?: string | null;
  createdAt: string;
  event: {
    id: string;
    title: string;
    category: string;
    location: string;
    posterUrl?: string | null;
    startAt: string;
    endAt: string;
    status: string;
  };
  certificate?: {
    id: string;
    serialNumber: string;
    issuedAt: string;
  } | null;
}

export default function MyTicketsPage() {
  const { data: session, status: authStatus } = useSession();
  const [registrations, setRegistrations] = React.useState<UserRegistration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [savingPngId, setSavingPngId] = React.useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [userProfile, setUserProfile] = React.useState<{
    level?: string | null;
    specialty?: string | null;
    studentId?: string | null;
  } | null>(null);
  const ticketRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Latin Name Certificate Confirmation Modal State
  const [latinNameModalOpen, setLatinNameModalOpen] = React.useState(false);
  const [targetCertRegId, setTargetCertRegId] = React.useState<string | null>(null);
  const [latinNameInput, setLatinNameInput] = React.useState("");

  const hasNonLatinChars = (str?: string | null) => {
    if (!str) return false;
    return /[^\u0020-\u007E\u00A0-\u00FF]/.test(str);
  };

  const handleDownloadCertificate = (regId: string) => {
    const currentName = session?.user?.name || "";
    if (hasNonLatinChars(currentName)) {
      setTargetCertRegId(regId);
      // Pre-fill with ASCII characters or email prefix
      const stripped = currentName.replace(/[^\x20-\x7E]/g, "").trim();
      const fallback = session?.user?.email ? session.user.email.split("@")[0] : "";
      setLatinNameInput(stripped || fallback);
      setLatinNameModalOpen(true);
    } else {
      window.open(`/api/certificates/${regId}`, "_blank");
    }
  };

  const handleConfirmLatinDownload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCertRegId) return;
    const safe = latinNameInput.trim();
    const url = `/api/certificates/${targetCertRegId}${safe ? `?displayName=${encodeURIComponent(safe)}` : ""}`;
    window.open(url, "_blank");
    setLatinNameModalOpen(false);
    setTargetCertRegId(null);
  };

  const fetchProfile = React.useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
    }
  }, []);

  const fetchRegistrations = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/register");
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data);
      }
    } catch (err) {
      console.error("Failed to load user tickets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (session) {
      fetchRegistrations();
      fetchProfile();
    } else if (authStatus !== "loading") {
      setLoading(false);
    }
  }, [session, authStatus, fetchRegistrations, fetchProfile]);

  // 1. Client-side export of ticket pass using html-to-image
  const handleSaveAsPng = async (reg: UserRegistration) => {
    const node = ticketRefs.current[reg.id];
    if (!node) return;

    try {
      setSavingPngId(reg.id);
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0b1e33",
      });

      const link = document.createElement("a");
      const safeTitle = reg.event.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
      link.download = `cybernexus-pass-${safeTitle}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export ticket as PNG:", err);
    } finally {
      setSavingPngId(null);
    }
  };

  // 2. Google Calendar Event URL Generator
  const getGoogleCalendarUrl = (event: UserRegistration["event"]) => {
    const formatTime = (isoString: string) =>
      new Date(isoString).toISOString().replace(/-|:|\.\d\d\d/g, "");

    const start = formatTime(event.startAt);
    const end = formatTime(event.endAt);
    const title = encodeURIComponent(`[CyberNexus] ${event.title}`);
    const details = encodeURIComponent(
      `Official CyberNexus University Club Event.\nVenue: ${event.location}\nBring your digital QR pass from the CyberNexus platform for door check-in.`
    );
    const location = encodeURIComponent(event.location);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  };

  // 3. Cancel registration action
  const handleCancelRegistration = async (registrationId: string) => {
    if (!confirm("Are you sure you want to cancel this registration? If there is a waitlist, your seat will be automatically transferred.")) {
      return;
    }

    try {
      setCancellingId(registrationId);
      const res = await fetch(`/api/register?registrationId=${registrationId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchRegistrations();
      } else {
        alert("Failed to cancel registration.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error cancelling registration.");
    } finally {
      setCancellingId(null);
    }
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        <p className="mt-4 text-xs font-mono text-muted-foreground">Loading your tickets & passes...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <Ticket className="h-12 w-12 text-primary mx-auto opacity-70" />
        <h2 className="text-2xl font-bold text-foreground">Sign In Required</h2>
        <p className="text-sm text-muted-foreground">
          Sign in with your Google university account to view and present your registered event passes.
        </p>
        <Button onClick={() => signIn("google")} variant="cyber" className="w-full">
          <LogIn className="h-4 w-4 mr-2" />
          Sign in with Google
        </Button>
      </div>
    );
  }

  const activeRegistrations = registrations.filter((r) => r.status !== "CANCELLED");

  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-border/60 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            My Event Passes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Present your camera-ready digital QR pass at the entrance desk for check-in.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {userProfile?.level && (
            <Badge variant="neon" className="font-mono text-xs">
              {userProfile.level} • {userProfile.specialty}
            </Badge>
          )}
          <Badge variant="cyber" className="font-mono text-xs">
            {session.user?.role || "STUDENT"} PASSPORT
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProfileModalOpen(true)}
            className="text-xs h-7 px-2.5 gap-1 text-muted-foreground hover:text-foreground"
          >
            <span>Edit Profile</span>
          </Button>
        </div>
      </div>

      {activeRegistrations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-12 text-center space-y-4 bg-card/30">
          <Ticket className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
          <div className="space-y-1">
            <h3 className="font-semibold text-lg text-foreground">No Active Passes</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You haven&apos;t registered for any upcoming events yet. Explore open workshops and reserve your spot!
            </p>
          </div>
          <Button asChild variant="cyber" size="sm">
            <Link href="/events">Explore Events</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {activeRegistrations.map((reg) => {
            const startDate = new Date(reg.event.startAt).toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const isCheckedIn = reg.status === "CHECKED_IN";
            const isWaitlist = reg.status === "WAITLIST";
            const isConfirmed = reg.status === "REGISTERED";

            return (
              <div
                key={reg.id}
                ref={(el) => {
                  ticketRefs.current[reg.id] = el;
                }}
                className="rounded-2xl border border-primary/40 bg-card/90 backdrop-blur-md p-6 shadow-xl relative overflow-hidden space-y-6"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="neon" className="font-mono text-[10px] uppercase">
                      {reg.event.category}
                    </Badge>
                    <Badge
                      variant={
                        isCheckedIn
                          ? "success"
                          : isWaitlist
                          ? "secondary"
                          : "cyber"
                      }
                      className="font-mono text-[10px]"
                    >
                      {isCheckedIn
                        ? "CHECKED IN"
                        : isWaitlist
                        ? "WAITLIST (STANDBY)"
                        : "CONFIRMED PASS"}
                    </Badge>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    PASS REF: {reg.ticketToken.slice(0, 16)}...
                  </span>
                </div>

                {/* Ticket Body: Info + Strict Camera-Ready QR Container */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  {/* Left Column: Event Details */}
                  <div className="md:col-span-2 space-y-3">
                    <h3 className="text-2xl font-extrabold text-foreground leading-snug">
                      {reg.event.title}
                    </h3>

                    <div className="space-y-2 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary shrink-0" />
                        <span>{startDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span>{reg.event.location}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          src={session.user?.image}
                          name={session.user?.name}
                          size={20}
                        />
                        <span className="truncate">
                          Attendee: {session.user?.name || "Student Member"} (
                          {session.user?.email})
                        </span>
                      </div>
                      {isCheckedIn && reg.checkedInAt && (
                        <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            Verified at entrance:{" "}
                            {new Date(reg.checkedInAt).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {isWaitlist && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
                        <p className="font-semibold flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4" /> Waitlist Status
                        </p>
                        <p className="text-[11px] text-amber-200/80">
                          You are queued for this event. If a confirmed attendee cancels, your pass will be automatically promoted to confirmed!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Strict QR presentation container */}
                  <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-border/60 pt-4 md:pt-0 md:pl-6 space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Camera QR Pass
                    </span>

                    {/* 
                      STRICT CONSTRAINT:
                      Always render QR codes inside a solid white container
                      (bg-white p-3 rounded-xl) for 100% reliable camera scanning.
                    */}
                    <QRCodeDisplay
                      value={reg.ticketToken}
                      size={140}
                    />

                    <span className="text-[9px] font-mono text-muted-foreground text-center">
                      UUID: {reg.ticketToken.slice(0, 18)}...
                    </span>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="border-t border-border/60 pt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Button 1: Save as PNG */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveAsPng(reg)}
                      disabled={savingPngId === reg.id}
                      className="text-xs gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5 text-primary" />
                      <span>{savingPngId === reg.id ? "Exporting..." : "Save as PNG"}</span>
                    </Button>

                    {/* Button 2: Add to Google Calendar */}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                    >
                      <a
                        href={getGoogleCalendarUrl(reg.event)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <CalendarPlus className="h-3.5 w-3.5 text-primary" />
                        <span>Google Calendar</span>
                      </a>
                    </Button>

                    {/* Button 3: Download Certificate (PDF) */}
                    {isCheckedIn ? (
                      <Button
                        variant="cyber"
                        size="sm"
                        onClick={() => handleDownloadCertificate(reg.id)}
                        className="text-xs gap-1.5 cyber-glow"
                      >
                        <Award className="h-3.5 w-3.5 text-accent" />
                        <span>Download Certificate (PDF)</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="text-xs gap-1.5 opacity-50"
                        title="Available after in-person check-in verification"
                      >
                        <Award className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Certificate (Locked)</span>
                      </Button>
                    )}
                  </div>

                  {/* Cancel Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelRegistration(reg.id)}
                    disabled={cancellingId === reg.id}
                    className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Cancel Pass</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onSuccess={(updated) => {
          setUserProfile(updated);
        }}
        initialData={userProfile || undefined}
        title="Update Academic Profile"
        description="Keep your level and specialty up to date as you progress through your university curriculum."
        submitButtonText="Save Academic Profile"
      />

      {/* Confirm Latin Name Dialog for Certificate (WinAnsi Safe) */}
      <Dialog open={latinNameModalOpen} onOpenChange={setLatinNameModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              <span>Confirm Certificate Name</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Official certificates use international Latin typography (French/English) for LinkedIn &amp; CV verification. Please confirm how your name should appear:
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmLatinDownload} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-foreground">
                Your Name in Latin Characters (A-Z)
              </label>
              <Input
                placeholder="e.g. Mohammed Benali"
                value={latinNameInput}
                onChange={(e) => setLatinNameInput(e.target.value)}
                required
                className="bg-background/80 font-medium text-sm"
                autoFocus
              />
              <span className="text-[11px] text-muted-foreground block">
                This exact name will be engraved onto your verified PDF certificate.
              </span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLatinNameModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="cyber"
                size="sm"
                className="gap-1.5 cyber-glow"
                disabled={!latinNameInput.trim()}
              >
                <Download className="h-4 w-4" />
                <span>Download Verified PDF</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
