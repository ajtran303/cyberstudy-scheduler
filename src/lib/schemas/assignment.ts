import { z } from "zod";

export const CreateAssignmentSchema = z.object({
  name: z.string().min(1).max(300),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD format").optional(),
  description: z.string().optional(),
  status: z.enum(["PENDING", "DONE"]).optional(),
  sortOrder: z.number().int().optional(),
});

export const UpdateAssignmentSchema = CreateAssignmentSchema.partial();
