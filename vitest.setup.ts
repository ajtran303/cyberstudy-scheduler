import { vi } from "vitest";

// Mock next-auth's auth export to prevent it from pulling in next/server internals
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));
