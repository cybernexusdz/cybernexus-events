"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileModal } from "@/components/profile-modal";
import { EventFeedback } from "@/components/event-feedback";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Ticket,
  LogIn,
  AlertTriangle,
  Flame,
  ShieldCheck,
  User,
  FileText,
  Github,
  Video,
  ExternalLink,
  BookOpen,
} from "lucide-react";

interface EventDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  posterUrl?: string | null;
  startAt: string;
  endAt: string;
  maxCapacity: number;
  status: string;
  registeredCount: number;
  waitlistCount: number;
  spotsLeft: number;
  isFull: boolean;
  speakerName?: string | null;
  speakerRole?: string | null;
  prerequisites?: string | null;
  slidesUrl?: string | null;
  repoUrl?: string | null;
  videoUrl?: string | null;
  averageRating?: number;
  totalReviews?: number;
  feedbacks?: any[];
  organizer: {
    id: string;
    name: string | null;
    image: string | null;
  };
  userRegistration?: {
    id: string;
    status: "REGISTERED" | "WAITLIST" | "CHECKED_IN" | "CANCELLED";
    ticketToken: string;
  } | null;
}

export default function EventDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [event, setEvent] = React.useState<EventDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [registering, setRegistering] = React.useState(false);
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchEvent = React.useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${id}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
      } else {
        setFeedback({ type: "error", message: "Event not found or has been removed." });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Network error loading event details." });
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleRegister = async (profileOverride?: { level: string; specialty: string; studentId: string | null }) => {
    if (!session) {
      signIn("google");
      return;
    }

    try {
      setRegistering(true);
      setFeedback(null);
      const payload: any = { eventId: id };
      if (profileOverride) {
        payload.level = profileOverride.level;
        payload.specialty = profileOverride.specialty;
        payload.studentId = profileOverride.studentId;
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 422 && data.code === "PROFILE_INCOMPLETE") {
        setProfileModalOpen(true);
        return;
      }

      if (res.ok) {
        setFeedback({
          type: "success",
          message: data.message || "Registration completed!",
        });
        await fetchEvent();
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to complete registration.",
        });
      }
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: "Network error while submitting registration.",
      });
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        <p className="mt-4 text-xs font-mono text-muted-foreground">Loading event details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Event Not Found</h2>
        <p className="text-xs text-muted-foreground">
          The requested event could not be found or may have been deleted.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/events">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Link>
        </Button>
      </div>
    );
  }

  const startDate = new Date(event.startAt).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const endDate = new Date(event.endAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const capacityRatio = event.maxCapacity > 0 ? (event.registeredCount / event.maxCapacity) * 100 : 0;
  const isRegistered = !!event.userRegistration && event.userRegistration.status !== "CANCELLED";
  const userStatus = event.userRegistration?.status;

  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-8 py-10 space-y-8">
      {/* Back Button */}
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>BACK TO ALL EVENTS</span>
        </Link>
      </div>

      {/* Main Content Card */}
      <Card className="border-border/70 bg-card/70 backdrop-blur-md overflow-hidden">
        {/* Optional Poster Header or Sleek Cyber Gradient */}
        {event.posterUrl ? (
          <div className="h-64 sm:h-80 w-full overflow-hidden relative border-b border-border/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.posterUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-black/30 to-transparent" />
          </div>
        ) : (
          <div className="h-44 sm:h-52 w-full relative border-b border-border/50 bg-gradient-to-br from-primary/25 via-card to-secondary/40 p-6 flex flex-col justify-end overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between">
              <span className="font-mono text-xs text-primary font-bold tracking-widest uppercase">
                CYBERNEXUS OFFICIAL EVENT
              </span>
            </div>
          </div>
        )}

        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neon" className="font-mono text-xs uppercase">
              {event.category}
            </Badge>
            <Badge variant="cyber" className="font-mono text-xs uppercase">
              {event.status}
            </Badge>
            {event.isFull ? (
              <Badge variant="destructive" className="font-mono text-xs flex items-center gap-1">
                <Flame className="h-3 w-3" /> AT FULL CAPACITY
              </Badge>
            ) : (
              <Badge variant="success" className="font-mono text-xs">
                {event.spotsLeft} SPOTS AVAILABLE
              </Badge>
            )}
          </div>

          <CardTitle className="text-2xl sm:text-4xl font-extrabold text-foreground leading-tight">
            {event.title}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Organized by CyberNexus Tech Club {event.organizer.name ? `• ${event.organizer.name}` : ""}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Schedule & Location Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border/60 bg-secondary/20 p-4 text-xs">
            <div className="space-y-1">
              <span className="font-mono uppercase text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Date & Time
              </span>
              <p className="font-semibold text-foreground">{startDate}</p>
              <p className="text-muted-foreground">Until {endDate}</p>
            </div>
            <div className="space-y-1">
              <span className="font-mono uppercase text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Venue / Room
              </span>
              <p className="font-semibold text-foreground">{event.location}</p>
              <p className="text-muted-foreground">Check in at entrance desk with your QR code</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="font-mono text-xs uppercase font-bold text-foreground tracking-wider">
              About This Event
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Speaker / Instructor Profile */}
          {event.speakerName && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <span className="font-mono text-[10px] uppercase text-primary font-bold tracking-wider">
                  Featured Speaker / Instructor
                </span>
                <h4 className="text-sm font-bold text-foreground">
                  {event.speakerName}
                </h4>
                {event.speakerRole && (
                  <p className="text-xs text-muted-foreground">
                    {event.speakerRole}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Prerequisites & Requirements */}
          {event.prerequisites && (
            <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 space-y-2">
              <h4 className="font-mono text-xs uppercase font-bold text-foreground tracking-wider flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>Prerequisites & Preparation</span>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {event.prerequisites}
              </p>
            </div>
          )}

          {/* Post-Workshop Resources (Slides, GitHub Repo, Recording) */}
          {(event.slidesUrl || event.repoUrl || event.videoUrl) && (
            <div className="rounded-xl border border-border/70 bg-card/90 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-mono text-xs uppercase font-bold text-foreground tracking-wider flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-primary" />
                  <span>Workshop Resources & Materials</span>
                </h4>
                <Badge variant="cyber" className="text-[10px] font-mono">
                  OPEN ACCESS
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {event.slidesUrl && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs border-primary/40 hover:bg-primary/10"
                  >
                    <a href={event.slidesUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span>Download Slides</span>
                    </a>
                  </Button>
                )}

                {event.repoUrl && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs border-border hover:bg-muted"
                  >
                    <a href={event.repoUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="h-3.5 w-3.5 text-foreground" />
                      <span>View GitHub Repo</span>
                    </a>
                  </Button>
                )}

                {event.videoUrl && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs border-destructive/40 hover:bg-destructive/10"
                  >
                    <a href={event.videoUrl} target="_blank" rel="noopener noreferrer">
                      <Video className="h-3.5 w-3.5 text-rose-400" />
                      <span>Watch Recording</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Capacity Progress */}
          <div className="space-y-2 rounded-xl border border-border/60 bg-secondary/15 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Users className="h-4 w-4 text-primary" /> Capacity Status
              </span>
              <span className="font-mono text-muted-foreground">
                {event.registeredCount} / {event.maxCapacity} seats filled
                {event.waitlistCount > 0 && ` (${event.waitlistCount} on waitlist)`}
              </span>
            </div>
            <div className="w-full bg-secondary/70 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  event.isFull ? "bg-amber-400" : "bg-primary"
                }`}
                style={{ width: `${Math.min(100, capacityRatio)}%` }}
              />
            </div>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`rounded-xl p-3.5 text-xs font-medium flex items-center gap-2 ${
                feedback.type === "success"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-destructive/15 text-destructive border border-destructive/30"
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Action Button Section */}
          <div className="pt-2">
            {authStatus === "loading" ? (
              <div className="h-11 rounded-lg bg-secondary/40 animate-pulse" />
            ) : !session ? (
              <Button
                onClick={() => signIn("google")}
                size="lg"
                variant="cyber"
                className="w-full font-bold gap-2"
              >
                <LogIn className="h-4 w-4 text-primary" />
                <span>Sign in with Google to Register</span>
              </Button>
            ) : isRegistered ? (
              <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="font-semibold text-sm text-foreground">
                      {userStatus === "CHECKED_IN"
                        ? "You are checked in!"
                        : userStatus === "WAITLIST"
                        ? "You are currently on the Waitlist"
                        : "You are registered for this event!"}
                    </span>
                  </div>
                  <Badge
                    variant={userStatus === "CHECKED_IN" ? "success" : userStatus === "WAITLIST" ? "secondary" : "cyber"}
                  >
                    {userStatus}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your ticket token pass is ready. Show your camera-ready QR code at the door for entry verification.
                </p>
                <Button asChild size="sm" className="w-full gap-2 cyber-glow">
                  <Link href="/my-tickets">
                    <Ticket className="h-4 w-4" />
                    <span>View My Digital Ticket Pass</span>
                  </Link>
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => handleRegister()}
                disabled={registering}
                size="lg"
                className="w-full font-bold gap-2 cyber-glow"
              >
                <Ticket className="h-4 w-4" />
                <span>
                  {registering
                    ? "Securing Your Seat..."
                    : event.isFull
                    ? "Join Queue / Waitlist (Free)"
                    : "Register Now (Free Spot)"}
                </span>
              </Button>
            )}
          </div>

          {/* Student Feedback & Ratings */}
          <EventFeedback
            eventId={id}
            canSubmitFeedback={userStatus === "CHECKED_IN"}
            initialFeedbacks={event.feedbacks}
            initialAverage={event.averageRating}
            initialTotal={event.totalReviews}
          />
        </CardContent>
      </Card>

      {/* One-Time Academic Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onSuccess={(profile) => {
          handleRegister(profile);
        }}
        title="Complete Your Student Profile (One-Time)"
        description="Please provide your university level and specialty once so your registration can be confirmed."
        submitButtonText="Save Profile & Confirm Registration"
      />
    </div>
  );
}
