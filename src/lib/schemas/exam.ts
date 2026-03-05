import { z } from "zod";

export const CreateExamSchema = z.object({
  name: z.string().min(1).max(300),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD format").optional(),
  description: z.string().optional(),
  status: z.enum(["UPCOMING", "COMPLETED"]).optional(),
  sortOrder: z.number().int().optional(),
});

export const UpdateExamSchema = CreateExamSchema.partial();
