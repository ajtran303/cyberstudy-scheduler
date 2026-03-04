import { z } from "zod";

export const CreateAssignmentSchema = z.object({
  name: z.string().min(1).max(300),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["PENDING", "DONE"]).optional(),
  sortOrder: z.number().int().optional(),
});

export const UpdateAssignmentSchema = CreateAssignmentSchema.partial();
