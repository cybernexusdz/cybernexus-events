import { EventsExplorer } from "@/components/events-explorer";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShieldCheck, Award, Zap, Terminal } from "lucide-react";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 md:py-10 space-y-8">
      {/* Compact, Punchy Workshop-First Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 backdrop-blur-md shadow-[0_0_12px_var(--glow-color)]">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-wider text-primary uppercase">
              CYBERNEXUS UNIVERSITY TECH CLUB
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Upcoming Workshops & Events
          </h1>

          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Reserve your seat in student-run technical workshops, build sessions, and CTF competitions.
            Instant camera-ready QR passes &amp; verified digital certificates.
          </p>
        </div>

        {/* Value Props Pills */}
        <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 text-xs font-mono text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/60 border border-border/60">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Free for University Students
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/60 border border-border/60">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Instant QR Door Pass
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/60 border border-border/60">
            <Award className="h-3.5 w-3.5 text-accent" />
            Attendance Certificates
          </span>
        </div>
      </div>

      {/* Main Focus: Live Workshop Discovery & Direct Registration Grid */}
      <EventsExplorer />
    </div>
  );
}
