import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const {
  mockFindUnique,
  mockDeleteManySessions,
  mockDeleteManyCourses,
  mockSeedDemoUser,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockDeleteManySessions: vi.fn(),
  mockDeleteManyCourses: vi.fn(),
  mockSeedDemoUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockFindUnique },
    studySession: { deleteMany: mockDeleteManySessions },
    course: { deleteMany: mockDeleteManyCourses },
  },
}));

vi.mock("@/lib/demo-seed", () => ({
  seedDemoUser: (...args: unknown[]) => mockSeedDemoUser(...args),
}));

// ── Import handler after mocks ─────────────────────────────────────────────────

import { POST } from "../reset/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const DEMO_USER = { id: "demo-1", email: "demo@example.com", name: "Demo User" };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/v1/demo/reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(DEMO_USER);
    mockDeleteManySessions.mockResolvedValue({ count: 0 });
    mockDeleteManyCourses.mockResolvedValue({ count: 0 });
    mockSeedDemoUser.mockResolvedValue(DEMO_USER);
  });

  // ── Demo user isolation ────────────────────────────────────────────────────

  it("only deletes data for the demo user ID", async () => {
    await POST();

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "demo@example.com" },
    });
    expect(mockDeleteManySessions).toHaveBeenCalledWith({
      where: { userId: DEMO_USER.id },
    });
    expect(mockDeleteManyCourses).toHaveBeenCalledWith({
      where: { userId: DEMO_USER.id },
    });
  });

  it("skips deletion when demo user does not exist yet", async () => {
    mockFindUnique.mockResolvedValue(null);

    await POST();

    expect(mockDeleteManySessions).not.toHaveBeenCalled();
    expect(mockDeleteManyCourses).not.toHaveBeenCalled();
    expect(mockSeedDemoUser).toHaveBeenCalledOnce();
  });

  it("calls seedDemoUser after deletion", async () => {
    await POST();

    expect(mockSeedDemoUser).toHaveBeenCalledOnce();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it("returns 200 with success message", async () => {
    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.message).toBe("Demo data reset");
    expect(json.error).toBeNull();
  });

  it("deletes sessions before courses (correct order)", async () => {
    const callOrder: string[] = [];
    mockDeleteManySessions.mockImplementation(async () => {
      callOrder.push("sessions");
      return { count: 0 };
    });
    mockDeleteManyCourses.mockImplementation(async () => {
      callOrder.push("courses");
      return { count: 0 };
    });

    await POST();

    expect(callOrder).toEqual(["sessions", "courses"]);
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it("returns 500 if deletion throws", async () => {
    mockDeleteManySessions.mockRejectedValue(new Error("DB error"));

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  it("returns 500 if seedDemoUser throws", async () => {
    mockSeedDemoUser.mockRejectedValue(new Error("Seed failed"));

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});
