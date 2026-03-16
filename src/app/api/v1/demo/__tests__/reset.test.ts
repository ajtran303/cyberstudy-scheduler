import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const {
  mockGetAuthUser,
  mockDeleteManySessions,
  mockDeleteManyCourses,
  mockSeedDemoUser,
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockDeleteManySessions: vi.fn(),
  mockDeleteManyCourses: vi.fn(),
  mockSeedDemoUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    studySession: { deleteMany: mockDeleteManySessions },
    course: { deleteMany: mockDeleteManyCourses },
  },
}));

vi.mock("@/lib/api-helpers", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
  };
});

vi.mock("@/lib/demo-seed", () => ({
  seedDemoUser: (...args: unknown[]) => mockSeedDemoUser(...args),
}));

// ── Import handler after mocks ─────────────────────────────────────────────────

import { POST } from "../reset/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const DEMO_USER = { id: "demo-1", email: "demo@example.com", name: "Demo User" };
const REAL_USER = { id: "user-1", email: "sev@example.com", name: "Sev" };

function buildRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/demo/reset", {
    method: "POST",
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/v1/demo/reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteManySessions.mockResolvedValue({ count: 0 });
    mockDeleteManyCourses.mockResolvedValue({ count: 0 });
    mockSeedDemoUser.mockResolvedValue(DEMO_USER);
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(buildRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when authenticated as non-demo user", async () => {
    mockGetAuthUser.mockResolvedValue(REAL_USER);

    const res = await POST(buildRequest());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
    // Must never touch any data
    expect(mockDeleteManySessions).not.toHaveBeenCalled();
    expect(mockDeleteManyCourses).not.toHaveBeenCalled();
    expect(mockSeedDemoUser).not.toHaveBeenCalled();
  });

  // ── Demo user isolation ────────────────────────────────────────────────────

  it("only deletes data for the demo user ID", async () => {
    mockGetAuthUser.mockResolvedValue(DEMO_USER);

    await POST(buildRequest());

    expect(mockDeleteManySessions).toHaveBeenCalledWith({
      where: { userId: DEMO_USER.id },
    });
    expect(mockDeleteManyCourses).toHaveBeenCalledWith({
      where: { userId: DEMO_USER.id },
    });
  });

  it("calls seedDemoUser after deletion", async () => {
    mockGetAuthUser.mockResolvedValue(DEMO_USER);

    await POST(buildRequest());

    expect(mockSeedDemoUser).toHaveBeenCalledOnce();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it("returns 200 with success message for demo user", async () => {
    mockGetAuthUser.mockResolvedValue(DEMO_USER);

    const res = await POST(buildRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.message).toBe("Demo data reset");
    expect(json.error).toBeNull();
  });

  it("deletes sessions before courses (correct order)", async () => {
    mockGetAuthUser.mockResolvedValue(DEMO_USER);
    const callOrder: string[] = [];
    mockDeleteManySessions.mockImplementation(async () => {
      callOrder.push("sessions");
      return { count: 0 };
    });
    mockDeleteManyCourses.mockImplementation(async () => {
      callOrder.push("courses");
      return { count: 0 };
    });

    await POST(buildRequest());

    expect(callOrder).toEqual(["sessions", "courses"]);
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it("returns 500 if deletion throws", async () => {
    mockGetAuthUser.mockResolvedValue(DEMO_USER);
    mockDeleteManySessions.mockRejectedValue(new Error("DB error"));

    const res = await POST(buildRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  it("returns 500 if seedDemoUser throws", async () => {
    mockGetAuthUser.mockResolvedValue(DEMO_USER);
    mockSeedDemoUser.mockRejectedValue(new Error("Seed failed"));

    const res = await POST(buildRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});
