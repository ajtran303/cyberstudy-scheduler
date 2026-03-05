import { z } from "zod";

export const CreateCourseSchema = z.object({
  name: z.string().min(1).max(200),
  professorName: z.string().max(200).optional(),
  professorEmail: z.string().email().optional(),
  website: z
    .string()
    .url()
    .nullish()
    .or(z.literal(""))
    .transform((v) => v || null),
  courseCode: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  sortOrder: z.number().int().optional(),
});

export const UpdateCourseSchema = CreateCourseSchema.partial();

export const BatchImportSchema = z.object({
  topics: z.array(z.object({
    name: z.string().min(1).max(300),
    date: z.string().optional(),
    details: z.string().optional(),
    notes: z.string().optional(),
    keyTerms: z.array(z.object({
      term: z.string(),
      definition: z.string(),
    })).optional(),
  })).optional(),
  assignments: z.array(z.object({
    name: z.string().min(1).max(300),
    dueDate: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
  exams: z.array(z.object({
    name: z.string().min(1).max(300),
    date: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
});
