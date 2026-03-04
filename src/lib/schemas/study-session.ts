import { z } from "zod";

export const CreateStudySessionSchema = z.object({
  courseId: z.string().cuid().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateStudySessionSchema = z.object({
  courseId: z.string().cuid().nullable().optional(),
  endedAt: z.string().datetime().nullable().optional(),
  durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
