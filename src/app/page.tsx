import { prisma } from "@/lib/prisma";
import { EventsExplorer } from "@/components/events-explorer";
import { WorkshopSpotlight } from "@/components/workshop-spotlight";
import { HomeFaq } from "@/components/home-faq";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Award,
  Zap,
  Calendar,
  Users,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 1. Fetch nearest upcoming published event for the Spotlight banner
  const spotlightEvent = await prisma.event.findFirst({
    where: {
      status: "PUBLISHED",
      endAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
    include: {
      registrations: {
        where: { status: { in: ["REGISTERED", "CHECKED_IN"] } },
        select: { id: true, status: true },
      },
    },
  });

  const formattedSpotlight = spotlightEvent
    ? {
        id: spotlightEvent.id,
        title: spotlightEvent.title,
        description: spotlightEvent.description,
        category: spotlightEvent.category,
        location: spotlightEvent.location,
        posterUrl: spotlightEvent.posterUrl,
        startAt: spotlightEvent.startAt.toISOString(),
        endAt: spotlightEvent.endAt.toISOString(),
        maxCapacity: spotlightEvent.maxCapacity,
        registeredCount: spotlightEvent.registrations.length,
        spotsLeft: Math.max(0, spotlightEvent.maxCapacity - spotlightEvent.registrations.length),
        isFull: spotlightEvent.registrations.length >= spotlightEvent.maxCapacity,
        speakerName: spotlightEvent.speakerName,
        speakerRole: spotlightEvent.speakerRole,
      }
    : null;

  // 2. Fetch live club impact statistics from database
  const [totalEvents, totalRegistrations, totalCertificates] = await Promise.all([
    prisma.event.count({
      where: { status: { in: ["PUBLISHED", "COMPLETED"] } },
    }),
    prisma.registration.count({
      where: { status: { in: ["REGISTERED", "CHECKED_IN"] } },
    }),
    prisma.registration.count({
      where: { status: "CHECKED_IN" },
    }),
  ]);

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 md:py-10 space-y-10">
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
            Student Technical Workshops &amp; Events
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Reserve your seat in hands-on workshops, hackathons, and cybersecurity CTFs.
            Instant camera-ready QR passes, waitlist auto-promotion &amp; verifiable digital certificates.
          </p>
        </div>

        {/* Value Props Pills */}
        <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 text-xs font-mono text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/60 border border-border/60">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            100% Free for Students
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/60 border border-border/60">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Instant QR Door Passes
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/60 border border-border/60">
            <Award className="h-3.5 w-3.5 text-purple-400" />
            Attendance Certificates
          </span>
        </div>
      </div>

      {/* 1. Next Upcoming Workshop Spotlight & Live Countdown */}
      <section aria-label="Upcoming Workshop Spotlight">
        <WorkshopSpotlight event={formattedSpotlight} />
      </section>

      {/* 2. Live Club Impact Stats Strip */}
      <section aria-label="Club Impact Statistics" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm overflow-hidden flex items-center gap-4 group hover:border-primary/40 transition-all duration-300">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary group-hover:scale-105 transition-transform duration-300">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-foreground">
                {totalEvents}
              </span>
              <span className="text-xs font-mono text-muted-foreground uppercase">
                Workshops
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Hosted build sessions &amp; CTFs
            </p>
          </div>
        </div>

        <div className="relative rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm overflow-hidden flex items-center gap-4 group hover:border-primary/40 transition-all duration-300">
          <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400 group-hover:scale-105 transition-transform duration-300">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-foreground">
                {totalRegistrations}
              </span>
              <span className="text-xs font-mono text-muted-foreground uppercase">
                Registrations
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Seats claimed by university students
            </p>
          </div>
        </div>

        <div className="relative rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm overflow-hidden flex items-center gap-4 group hover:border-primary/40 transition-all duration-300">
          <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-400 group-hover:scale-105 transition-transform duration-300">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-foreground">
                {totalCertificates}
              </span>
              <span className="text-xs font-mono text-muted-foreground uppercase">
                Certificates
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Verifiable credentials awarded
            </p>
          </div>
        </div>
      </section>

      {/* 3. Main Discovery: Dual Tabs (Upcoming Workshops vs. Past Workshops & Resources) */}
      <section aria-label="Workshops Explorer">
        <EventsExplorer />
      </section>

      {/* 4. Compact FAQ & Official Portal Backlink */}
      <section aria-label="FAQ & Club Portal">
        <HomeFaq />
      </section>
    </div>
  );
}
