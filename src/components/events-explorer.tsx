"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileModal } from "@/components/profile-modal";
import {
  Calendar,
  MapPin,
  Users,
  Search,
  ArrowRight,
  Filter,
  Flame,
  AlertCircle,
  RefreshCw,
  Ticket,
  CheckCircle2,
  Sparkles,
  Terminal,
} from "lucide-react";

interface EventItem {
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
  userRegistration?: {
    id: string;
    status: string;
    ticketToken: string;
  } | null;
}

const CATEGORIES = [
  { label: "All Workshops & Events", value: "ALL" },
  { label: "Workshops", value: "WORKSHOPS" },
  { label: "Hackathons", value: "HACKATHONS" },
  { label: "Dev & AI", value: "DEV" },
  { label: "Cybersecurity", value: "CYBERSECURITY" },
];

export function EventsExplorer() {
  const router = useRouter();
  const { data: session } = useSession();

  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("ALL");

  // Registration state
  const [registeringEventId, setRegisteringEventId] = React.useState<string | null>(null);
  const [userRegistrations, setUserRegistrations] = React.useState<Record<string, string>>({});

  // Profile modal state for first-time registration
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [pendingEventId, setPendingEventId] = React.useState<string | null>(null);
  const [userProfile, setUserProfile] = React.useState<{
    level?: string | null;
    specialty?: string | null;
    studentId?: string | null;
  } | null>(null);

  // Fetch events
  const fetchEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") params.set("category", selectedCategory);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search]);

  // Fetch current user registrations & profile
  const fetchUserData = React.useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const [regRes, profRes] = await Promise.all([
        fetch("/api/register"),
        fetch("/api/profile"),
      ]);

      if (regRes.ok) {
        const regs = await regRes.json();
        const map: Record<string, string> = {};
        regs.forEach((r: any) => {
          if (r.status !== "CANCELLED") {
            map[r.event.id] = r.status;
          }
        });
        setUserRegistrations(map);
      }

      if (profRes.ok) {
        const prof = await profRes.json();
        setUserProfile(prof);
      }
    } catch (err) {
      console.error("Failed to load user registration status:", err);
    }
  }, [session]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchEvents]);

  React.useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Direct registration handler
  const handleRegister = async (eventId: string, profileOverride?: { level: string; specialty: string; studentId: string | null }) => {
    if (!session) {
      signIn("google");
      return;
    }

    // Check if student profile is complete (level & specialty required)
    const activeLevel = profileOverride?.level || userProfile?.level || session.user?.level;
    const activeSpecialty = profileOverride?.specialty || userProfile?.specialty || session.user?.specialty;

    if (!activeLevel || !activeSpecialty) {
      setPendingEventId(eventId);
      setProfileModalOpen(true);
      return;
    }

    try {
      setRegisteringEventId(eventId);

      const payload: any = { eventId };
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
        setPendingEventId(eventId);
        setProfileModalOpen(true);
        return;
      }

      if (res.ok) {
        // Immediate visual update
        setUserRegistrations((prev) => ({
          ...prev,
          [eventId]: data.status || "REGISTERED",
        }));
        await fetchEvents();
        // Redirect to tickets
        router.push("/my-tickets");
      } else {
        alert(data.error || "Failed to register for event.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      alert("Network error while submitting registration.");
    } finally {
      setRegisteringEventId(null);
    }
  };

  const handleProfileSuccess = async (updated: { level: string; specialty: string; studentId: string | null }) => {
    setUserProfile(updated);
    if (pendingEventId) {
      const targetId = pendingEventId;
      setPendingEventId(null);
      await handleRegister(targetId, updated);
    }
  };

  return (
    <div className="space-y-8">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workshops, CTFs, build nights..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/70 border-border/70"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchEvents();
            fetchUserData();
          }}
          className="self-end sm:self-auto gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-mono text-muted-foreground mr-1 flex items-center gap-1">
          <Filter className="h-3 w-3" /> Categories:
        </span>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_14px_var(--glow-color)] font-semibold"
                  : "bg-card/60 text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Events Grid */}
      {loading && events.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="h-80 animate-pulse bg-card/40 border-border/50" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3 bg-card/30">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto opacity-60" />
          <h3 className="font-semibold text-lg text-foreground">No Workshops Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No events match your current filter criteria. Check back soon or select another category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const capacityRatio = event.maxCapacity > 0 ? (event.registeredCount / event.maxCapacity) * 100 : 0;
            const startDate = new Date(event.startAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const registrationStatus = userRegistrations[event.id];
            const isRegistered = !!registrationStatus;
            const isSubmittingThis = registeringEventId === event.id;

            return (
              <Card
                key={event.id}
                className="flex flex-col justify-between border-border/70 bg-card/70 backdrop-blur-md hover:border-primary/50 transition-all duration-300 group overflow-hidden"
              >
                {/* Visual Header: Poster Image or Sleek Built-in Cyber Gradient Banner */}
                {event.posterUrl ? (
                  <div className="h-40 w-full overflow-hidden relative border-b border-border/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.posterUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-black/20 to-transparent" />
                    <Badge
                      variant="neon"
                      className="absolute top-3 left-3 text-[10px] uppercase font-mono backdrop-blur-md"
                    >
                      {event.category}
                    </Badge>
                  </div>
                ) : (
                  // Sleek Built-in CyberNexus Dark Geometric Gradient Banner
                  <div className="h-28 w-full relative border-b border-border/40 bg-gradient-to-br from-primary/20 via-card to-secondary/40 p-4 flex flex-col justify-between overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                      <Badge variant="neon" className="text-[10px] uppercase font-mono">
                        {event.category}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                        <Terminal className="h-3 w-3 text-primary" /> CYBERNEXUS
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono relative z-10">
                      {event.isFull ? (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <Flame className="h-3.5 w-3.5" /> Full (Waitlist Open)
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">
                          {event.spotsLeft} seats remaining
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <CardHeader className="pt-4 pb-2">
                  {event.posterUrl && (
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {startDate}
                      </span>
                      {event.isFull ? (
                        <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
                          <Flame className="h-3 w-3" /> Full
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-emerald-400">
                          {event.spotsLeft} seats left
                        </span>
                      )}
                    </div>
                  )}

                  <CardTitle className="text-lg font-bold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    <Link href={`/events/${event.id}`}>
                      {event.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs pt-1">
                    {event.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2.5 text-xs text-muted-foreground pt-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{startDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span>
                        {event.registeredCount} / {event.maxCapacity} Registered
                      </span>
                    </div>
                    {event.waitlistCount > 0 && (
                      <span className="font-mono text-amber-400">
                        +{event.waitlistCount} waitlist
                      </span>
                    )}
                  </div>

                  {/* Seat Capacity Bar */}
                  <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        event.isFull ? "bg-amber-400" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(100, capacityRatio)}%` }}
                    />
                  </div>
                </CardContent>

                {/* Direct Action Button on each card */}
                <CardFooter className="pt-2 flex gap-2">
                  <Button asChild variant="outline" size="sm" className="px-2.5 text-xs">
                    <Link href={`/events/${event.id}`} title="View event details">
                      Details
                    </Link>
                  </Button>

                  {isRegistered ? (
                    <Button asChild variant="cyber" size="sm" className="flex-1 gap-1.5 font-semibold text-xs">
                      <Link href="/my-tickets">
                        <Ticket className="h-3.5 w-3.5 text-primary" />
                        <span>
                          {registrationStatus === "WAITLIST" ? "On Waitlist (#Pass)" : "View My Ticket"}
                        </span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleRegister(event.id)}
                      disabled={isSubmittingThis}
                      size="sm"
                      className={`flex-1 gap-1.5 font-bold text-xs ${
                        event.isFull ? "bg-amber-500 hover:bg-amber-600 text-black" : "cyber-glow"
                      }`}
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      <span>
                        {isSubmittingThis
                          ? "Securing spot..."
                          : event.isFull
                          ? "Join Waitlist (Free)"
                          : "Register Now (1-Click)"}
                      </span>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* One-Time Academic Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => {
          setProfileModalOpen(false);
          setPendingEventId(null);
        }}
        onSuccess={handleProfileSuccess}
        initialData={userProfile || undefined}
        title="Complete Your Student Profile (One-Time)"
        description="Tell us your university level and specialty once so your workshop spots and certificates can be confirmed."
        submitButtonText="Save Profile & Confirm Registration"
      />
    </div>
  );
}
