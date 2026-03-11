import { z } from "zod";

export const CreateQuizAttemptSchema = z.object({
  correct: z.boolean(),
  questionText: z.string().optional(),
  sessionId: z.string().optional(),
});

export const BulkCreateQuizAttemptsSchema = z.object({
  sessionId: z.string(),
  attempts: z
    .array(
      z.object({
        topicId: z.string(),
        correct: z.boolean(),
        questionText: z.string().optional(),
      })
    )
    .min(1, "At least one attempt is required"),
});
