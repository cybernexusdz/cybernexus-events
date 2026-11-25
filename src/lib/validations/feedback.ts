import { z } from "zod";

export const feedbackSchema = z.object({
  rating: z.coerce
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be between 1 and 5 stars")
    .max(5, "Rating must be between 1 and 5 stars"),
  comment: z
    .string()
    .trim()
    .max(600, "Review comment cannot exceed 600 characters")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
