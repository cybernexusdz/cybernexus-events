"use client";

import * as React from "react";
import { ChevronDown, ExternalLink, HelpCircle, ShieldCheck, Ticket, Award, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    icon: Ticket,
    question: "How does workshop registration and door check-in work?",
    answer:
      "Registration is 100% free for university students using Google sign-in. Once confirmed, a unique camera-ready QR pass is automatically stored under 'My Tickets'. Simply display the QR pass on your phone screen at the venue reception desk for instant entrance verification.",
  },
  {
    icon: ShieldCheck,
    question: "What happens if a workshop reaches full capacity? (Waitlist Auto-Promotion)",
    answer:
      "When maximum seat capacity is reached, you can join the standby waitlist with one click. If any registered attendee cancels their reservation, our atomic seat manager automatically promotes the next student in line to a confirmed seat.",
  },
  {
    icon: Award,
    question: "How do I unlock my official verifiable PDF Certificate of Attendance?",
    answer:
      "Digital certificates are unlocked automatically upon successful QR check-in at the workshop door. You can download your official PDF certificate featuring a unique cryptographically-verifiable serial number directly from 'My Tickets'.",
  },
  {
    icon: Users,
    question: "Who can attend CyberNexus club events?",
    answer:
      "All university students interested in software development, AI, cybersecurity, and tech innovation are welcome! We host workshops, hackathons, and build sessions tailored from beginner foundations to advanced engineering.",
  },
];

export function HomeFaq() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="pt-8 border-t border-border/60 space-y-8">
      {/* FAQ Header */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 font-mono text-xs uppercase font-bold text-primary">
          <HelpCircle className="h-4 w-4" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          Everything You Need to Know
        </h2>
        <p className="text-xs text-muted-foreground">
          Quick answers about registration, waitlists, door passes, and certificates.
        </p>
      </div>

      {/* Accordion */}
      <div className="max-w-3xl mx-auto space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          const Icon = faq.icon;

          return (
            <div
              key={idx}
              className={cn(
                "rounded-xl border transition-all duration-200 overflow-hidden",
                isOpen
                  ? "border-primary/50 bg-card/90 shadow-md"
                  : "border-border/60 bg-card/40 hover:border-border"
              )}
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      isOpen ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-xs sm:text-sm text-foreground">
                    {faq.question}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180 text-primary"
                  )}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-200 pl-15">
                  <div className="border-t border-border/40 pt-3">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Backlink to Official Club Main Website */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-card/80 via-primary/5 to-card/80 p-6 sm:p-8 max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="space-y-1.5">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <BrandLogo variant="icon" className="h-5 w-auto text-primary" />
            <span className="font-mono text-xs font-bold text-foreground">
              CYBERNEXUS TECH CLUB
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            Explore the Main CyberNexus Portal
          </h3>
          <p className="text-xs text-muted-foreground">
            Meet the club bureau, explore projects, and join our Discord community.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="gap-2 border-primary/40 hover:bg-primary/10 shrink-0 font-medium"
        >
          <a
            href="https://cybernexusdz.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Visit Club Website</span>
            <ExternalLink className="h-3.5 w-3.5 text-primary" />
          </a>
        </Button>
      </div>
    </div>
  );
}
