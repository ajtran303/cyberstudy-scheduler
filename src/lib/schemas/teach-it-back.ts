import { z } from "zod";

export const CreateTeachItBackSchema = z.object({
  outcome: z.enum(["PASS", "PARTIAL", "MISS"]),
  notes: z.string().optional(),
});
