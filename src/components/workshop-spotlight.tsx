"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  Flame,
  ArrowRight,
  Sparkles,
  Users,
  Compass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SpotlightEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  posterUrl?: string | null;
  startAt: string;
  endAt: string;
  maxCapacity: number;
  registeredCount: number;
  spotsLeft: number;
  isFull: boolean;
  speakerName?: string | null;
  speakerRole?: string | null;
}

interface WorkshopSpotlightProps {
  event?: SpotlightEvent | null;
  onExplorePast?: () => void;
}

export function WorkshopSpotlight({ event, onExplorePast }: WorkshopSpotlightProps) {
  // Live Countdown Timer state
  const [timeLeft, setTimeLeft] = React.useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });

  React.useEffect(() => {
    if (!event) return;

    const targetTime = new Date(event.startAt).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [event]);

  // Case 1: No upcoming event scheduled
  if (!event) {
    return (
      <div className="relative rounded-2xl border border-primary/30 bg-card/60 p-6 sm:p-8 overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next Workshop Announcement Coming Soon</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Preparing the Next CyberNexus Build Session
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Our organizers are curating hands-on workshops in full-stack engineering, AI, and cybersecurity. Browse our past event archive to download slides, code repositories, and recorded sessions.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              variant="cyber"
              size="sm"
              className="gap-2 font-medium"
            >
              <Link href="/events">
                <Compass className="h-4 w-4" />
                <span>Browse All Events</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(event.startAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relative rounded-2xl border border-primary/50 bg-gradient-to-br from-card/90 via-card/70 to-secondary/30 p-6 sm:p-8 overflow-hidden shadow-2xl space-y-6">
      {/* Decorative cyber ambient glow */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Row */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neon" className="font-mono text-xs tracking-wider uppercase flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            NEXT UPCOMING WORKSHOP
          </Badge>
          <Badge variant="cyber" className="font-mono text-xs uppercase">
            {event.category}
          </Badge>
          {event.isFull ? (
            <Badge variant="destructive" className="font-mono text-xs flex items-center gap-1">
              <Flame className="h-3 w-3" /> FULL (WAITLIST OPEN)
            </Badge>
          ) : (
            <Badge variant="success" className="font-mono text-xs">
              {event.spotsLeft} SPOTS LEFT
            </Badge>
          )}
        </div>

        {event.speakerName && (
          <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
            <span>Speaker:</span>
            <span className="font-bold text-foreground">{event.speakerName}</span>
            {event.speakerRole && <span className="opacity-80">({event.speakerRole})</span>}
          </div>
        )}
      </div>

      {/* Middle Row: Content & Live Countdown */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Title & Key Details */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
            <Link
              href={`/events/${event.id}`}
              className="hover:text-primary transition-colors"
            >
              {event.title}
            </Link>
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {event.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate max-w-[200px]">{event.location}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <span>{event.registeredCount}/{event.maxCapacity} seats</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Countdown Clock & Instant Action */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center gap-4">
          <div className="space-y-1.5 text-center lg:text-right w-full">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center justify-center lg:justify-end gap-1.5">
              <Clock className="h-3 w-3 text-primary animate-pulse" />
              Live Countdown to Kickoff
            </span>

            {/* Countdown Digits Grid */}
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5 max-w-xs mx-auto lg:mr-0">
              {[
                { label: "DAYS", val: timeLeft.days },
                { label: "HOURS", val: timeLeft.hours },
                { label: "MINS", val: timeLeft.minutes },
                { label: "SECS", val: timeLeft.seconds },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-primary/40 bg-card/80 p-2.5 text-center shadow-inner"
                >
                  <span className="block font-mono text-xl sm:text-2xl font-black text-primary leading-none">
                    {String(item.val).padStart(2, "0")}
                  </span>
                  <span className="block text-[9px] font-mono text-muted-foreground font-semibold mt-1">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto font-bold gap-2 cyber-glow"
            >
              <Link href={`/events/${event.id}`}>
                <Ticket className="h-4 w-4" />
                <span>{event.isFull ? "Join Waitlist" : "Register Free Seat"}</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
