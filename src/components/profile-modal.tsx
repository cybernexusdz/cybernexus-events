"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACADEMIC_LEVELS, SPECIALTY_SUGGESTIONS } from "@/lib/validations/profile";
import { GraduationCap, BookOpen, Hash, AlertCircle, CheckCircle2 } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: { level: string; specialty: string; studentId: string | null }) => void;
  initialData?: {
    level?: string | null;
    specialty?: string | null;
    studentId?: string | null;
  };
  title?: string;
  description?: string;
  submitButtonText?: string;
}

export function ProfileModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  title = "Complete Your Student Profile (One-Time)",
  description = "CyberNexus requires your university academic level and specialty to issue verifiable attendance certificates and manage workshop rosters.",
  submitButtonText = "Save & Confirm Registration",
}: ProfileModalProps) {
  const [level, setLevel] = React.useState(initialData?.level || "L3");
  const [specialty, setSpecialty] = React.useState(initialData?.specialty || "");
  const [studentId, setStudentId] = React.useState(initialData?.studentId || "");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialData) {
      if (initialData.level) setLevel(initialData.level);
      if (initialData.specialty) setSpecialty(initialData.specialty);
      if (initialData.studentId) setStudentId(initialData.studentId);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!level.trim()) {
      setError("Please select your academic level.");
      return;
    }
    if (!specialty.trim()) {
      setError("Please enter your specialty / filière.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: level.trim(),
          specialty: specialty.trim(),
          studentId: studentId.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update profile.");
        return;
      }

      onSuccess({
        level: data.level,
        specialty: data.specialty,
        studentId: data.studentId,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Network error updating profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-3 shrink-0 border-b border-border/60">
          <div className="flex items-center gap-2 text-primary mb-1">
            <GraduationCap className="h-5 w-5" />
            <span className="font-mono text-xs uppercase tracking-wider font-semibold">
              Academic Verification
            </span>
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Academic Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                <span>Academic Level (Niveau d&apos;études)</span>
                <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-card/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono text-xs"
              >
                {ACADEMIC_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            {/* Specialty / Filière with Datalist */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span>Specialty / Filière</span>
                <span className="text-destructive">*</span>
              </label>
              <Input
                required
                list="specialty-options"
                placeholder="e.g. Informatique, Génie Logiciel, Cybersécurité..."
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              />
              <datalist id="specialty-options">
                {SPECIALTY_SUGGESTIONS.map((spec) => (
                  <option key={spec} value={spec} />
                ))}
              </datalist>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground font-mono">Suggestions:</span>
                {SPECIALTY_SUGGESTIONS.slice(0, 4).map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setSpecialty(spec)}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-border/70 bg-secondary/30 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Student ID / Matricule */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  <span>Student ID / Matricule</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
              </label>
              <Input
                placeholder="e.g. 21/0492"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Appears on official attendance sheets and certificate serial records.
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 px-6 shrink-0 border-t border-border/60 bg-card/90">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="cyber" disabled={submitting} className="cyber-glow font-bold">
              {submitting ? "Saving..." : submitButtonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
