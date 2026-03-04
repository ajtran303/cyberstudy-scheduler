import { z } from "zod";

export const CreateExamSchema = z.object({
  name: z.string().min(1).max(300),
  date: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["UPCOMING", "COMPLETED"]).optional(),
  sortOrder: z.number().int().optional(),
});

export const UpdateExamSchema = CreateExamSchema.partial();
