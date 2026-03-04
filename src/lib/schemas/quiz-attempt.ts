import { z } from "zod";

export const CreateQuizAttemptSchema = z.object({
  correct: z.boolean(),
  questionText: z.string().optional(),
  sessionId: z.string().optional(),
});
