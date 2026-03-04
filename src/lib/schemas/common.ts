import { z } from "zod";

export const ErrorEnvelope = z.object({
  code: z.string(),
  message: z.string(),
});

export const SortParam = z.string().optional();

export const LimitParam = z.coerce.number().int().positive().optional();

export function parseSort(
  sortStr: string | null,
  allowed: string[],
  defaultSort: string
): { field: string; direction: "asc" | "desc" } {
  if (!sortStr) {
    const [field, dir] = defaultSort.split(":");
    return { field, direction: (dir as "asc" | "desc") || "asc" };
  }

  // Special sorts like mastery_priority
  if (allowed.includes(sortStr) && !sortStr.includes(":")) {
    return { field: sortStr, direction: "asc" };
  }

  const [field, dir] = sortStr.split(":");
  const fullSort = `${field}:${dir}`;

  if (!allowed.includes(fullSort)) {
    const [df, dd] = defaultSort.split(":");
    return { field: df, direction: (dd as "asc" | "desc") || "asc" };
  }

  return { field, direction: (dir as "asc" | "desc") || "asc" };
}
