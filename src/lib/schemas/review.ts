import { z } from "zod";

export const CreateReviewSchema = z.object({
  quality: z.number().int().min(1).max(5),
});
