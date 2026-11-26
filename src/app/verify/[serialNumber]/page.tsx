import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyVerifyButton } from "@/components/copy-verify-button";
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  Calendar,
  MapPin,
  User,
  GraduationCap,
  ExternalLink,
  Download,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface VerifyPageProps {
  params: {
    serialNumber: string;
  };
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  return {
    title: `Verify Certificate ${params.serialNumber} | CyberNexus Events`,
    description: `Official cryptographic verification of CyberNexus University Tech Club certificate of attendance.`,
  };
}

export default async function VerifyCertificatePage({ params }: VerifyPageProps) {
  const { serialNumber } = params;

  const certificate = await prisma.certificate.findUnique({
    where: { serialNumber },
    include: {
      registration: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              studentId: true,
              level: true,
              specialty: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              category: true,
              location: true,
              startAt: true,
              endAt: true,
            },
          },
        },
      },
    },
  });

  // Invalid state
  if (!certificate || certificate.registration.status !== "CHECKED_IN") {
    return (
      <div className="container mx-auto px-4 sm:px-8 py-16 max-w-2xl">
        <div className="rounded-2xl border border-destructive/50 bg-card/80 p-8 sm:p-12 text-center space-y-6 shadow-2xl backdrop-blur-md">
          <div className="h-16 w-16 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center mx-auto text-destructive animate-pulse">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="destructive" className="font-mono text-xs uppercase tracking-wider">
              Verification Failed
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Certificate Not Found
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              No authentic certificate matching serial number{" "}
              <code className="text-destructive font-mono bg-destructive/10 px-2 py-0.5 rounded">
                {serialNumber}
              </code>{" "}
              was found in the official CyberNexus Registry.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Homepage</span>
              </Link>
            </Button>
            <Button asChild variant="cyber" size="sm" className="gap-2 font-medium">
              <Link href="/events">
                <span>Browse Verified Events</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { registration } = certificate;
  const { user, event } = registration;

  const eventDate = new Date(event.startAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const issueDate = new Date(certificate.issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="container mx-auto px-4 sm:px-8 py-12 max-w-3xl space-y-8">
      {/* Top Header & Cyber Badge */}
      <div className="flex flex-col items-center text-center space-y-3">
        <Link href="/" className="inline-flex items-center gap-2 mb-2 group">
          <BrandLogo variant="icon" className="h-9 w-auto text-primary group-hover:scale-105 transition-transform" />
          <span className="font-mono text-lg font-black tracking-widest text-foreground">
            CYBERNEXUS
          </span>
        </Link>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-400 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="font-bold tracking-wide uppercase">Verified Authentic Credential</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          Certificate of Attendance
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-lg">
          This verifiable digital credential confirms verified in-person participation in an official CyberNexus university workshop.
        </p>
      </div>

      {/* Main Official Passport Card */}
      <div className="relative rounded-2xl border border-primary/50 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-10 shadow-2xl backdrop-blur-md overflow-hidden space-y-8">
        {/* Cyber background glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />

        {/* Certificate ID Header Strip */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
              Official Serial Number
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-primary tracking-wider">
              {certificate.serialNumber}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CopyVerifyButton serialNumber={certificate.serialNumber} />
            <Button
              asChild
              variant="cyber"
              size="sm"
              className="gap-2 text-xs font-semibold cyber-glow"
            >
              <a
                href={`/api/certificates/${certificate.registrationId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-3.5 w-3.5 text-accent" />
                <span>Download PDF</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Credential Details Grid */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Recipient Info */}
          <div className="space-y-4 rounded-xl border border-border/60 bg-card/60 p-5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-muted-foreground uppercase">
              <User className="h-4 w-4 text-primary" />
              <span>Attendee Information</span>
            </div>

            <div>
              <span className="text-[11px] font-mono text-muted-foreground block">Full Name</span>
              <span className="text-lg font-bold text-foreground">
                {user.name || "Student Member"}
              </span>
            </div>

            {(user.level || user.specialty) && (
              <div>
                <span className="text-[11px] font-mono text-muted-foreground block">
                  Academic Background
                </span>
                <div className="flex items-center gap-2 text-xs text-foreground/90 font-medium mt-0.5">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {[user.level, user.specialty].filter(Boolean).join(" • ")}
                  </span>
                </div>
              </div>
            )}

            <div>
              <span className="text-[11px] font-mono text-muted-foreground block">
                Verification Status
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified In-Person Attendance
              </span>
            </div>
          </div>

          {/* Workshop Details */}
          <div className="space-y-4 rounded-xl border border-border/60 bg-card/60 p-5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-muted-foreground uppercase">
              <Award className="h-4 w-4 text-primary" />
              <span>Workshop Credentials</span>
            </div>

            <div>
              <span className="text-[11px] font-mono text-muted-foreground block">
                Activity Title
              </span>
              <Link
                href={`/events/${event.id}`}
                className="text-base font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
              >
                <span>{event.title}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
              </Link>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{eventDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{event.location}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-mono text-muted-foreground block">
                Issue Date
              </span>
              <span className="text-xs font-mono text-foreground font-semibold">
                {issueDate}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Ledger Attestation */}
        <div className="relative z-10 rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold text-foreground block">
                Tamper-Proof CyberNexus Verification
              </span>
              <span className="text-[11px] text-muted-foreground">
                Cryptographically registered under UUID token {registration.ticketToken.slice(0, 18)}...
              </span>
            </div>
          </div>

          <Badge variant="cyber" className="shrink-0 uppercase font-bold text-[10px]">
            100% Authentic
          </Badge>
        </div>
      </div>

      {/* Footer Nav */}
      <div className="text-center pt-2">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to CyberNexus Events</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
