import { z } from "zod";

export const EVENT_CATEGORIES = [
  "WORKSHOPS",
  "HACKATHONS",
  "DEV",
  "CYBERSECURITY",
  "COMPETITION",
] as const;

export const eventFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(120, "Title cannot exceed 120 characters"),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters"),
    category: z.string().trim().min(2, "Category is required"),
    location: z.string().trim().min(2, "Location is required"),
    posterUrl: z
      .string()
      .trim()
      .url("Must be a valid URL (http/https)")
      .optional()
      .or(z.literal(""))
      .nullable(),
    startAt: z.coerce.date({ invalid_type_error: "Valid start time is required" }),
    endAt: z.coerce.date({ invalid_type_error: "Valid end time is required" }),
    maxCapacity: z.coerce
      .number()
      .int("Capacity must be an integer")
      .min(1, "Capacity must be at least 1 seat"),
    status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).default("PUBLISHED"),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: "End time must be after start time",
    path: ["endAt"],
  });

export const eventUpdateSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(120).optional(),
    description: z.string().trim().min(10, "Description must be at least 10 characters").optional(),
    category: z.string().trim().min(2).optional(),
    location: z.string().trim().min(2).optional(),
    posterUrl: z
      .string()
      .trim()
      .url("Must be a valid URL (http/https)")
      .optional()
      .or(z.literal(""))
      .nullable(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    maxCapacity: z.coerce.number().int().min(1, "Capacity must be at least 1 seat").optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).optional(),
  })
  .refine(
    (data) => {
      if (data.startAt && data.endAt) {
        return data.endAt > data.startAt;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endAt"],
    }
  );
