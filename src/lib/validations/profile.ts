import { z } from "zod";

export const ACADEMIC_LEVELS = [
  "L1",
  "L2",
  "L3",
  "M1",
  "M2",
  "Autre",
] as const;

export const SPECIALTY_SUGGESTIONS = [
  "Informatique",
  "Génie Logiciel",
  "IA & Data Science",
  "Cybersécurité & Réseaux",
  "Systèmes d'Information",
] as const;

export const profileSchema = z.object({
  level: z.string().trim().min(1, "Academic level is required"),
  specialty: z.string().trim().min(2, "Specialty / Filière is required").max(100),
  studentId: z.string().trim().max(50).optional().nullable(),
});
