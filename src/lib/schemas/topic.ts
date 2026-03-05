import { z } from "zod";

export const KeyTermSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
});

export const CreateTopicSchema = z.object({
  name: z.string().min(1).max(300),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD format").optional(),
  details: z.string().optional(),
  notes: z.string().optional(),
  keyTerms: z.array(KeyTermSchema).optional(),
  sortOrder: z.number().int().optional(),
});

export const UpdateTopicSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD format").nullable().optional(),
  details: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  keyTerms: z.array(KeyTermSchema).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const UpdateMasterySchema = z.object({
  mastery: z.enum(["EXPOSED", "SCANNING", "HARDENED", "CLASSIFIED"]),
});

export const BulkMasterySchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1),
    mastery: z.enum(["EXPOSED", "SCANNING", "HARDENED", "CLASSIFIED"]),
  })).min(1),
});
