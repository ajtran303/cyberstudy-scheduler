import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────

const { mockFindFirst, mockUpdate, mockGetAuthUser } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(),
  mockGetAuthUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    topic: {
      findFirst: mockFindFirst,
      update: mockUpdate,
    },
  },
}));

vi.mock("@/lib/api-helpers", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getAuthUser: mockGetAuthUser,
  };
});

// Must import after mocks are declared
import { POST } from "../[id]/review/route";
import * as srsModule from "@/lib/srs";

const mockedGetAuthUser = mockGetAuthUser;

// ── Helpers ────────────────────────────────────────────────────────────

const TEST_USER = { id: "user-1", email: "test@example.com", name: "Test" };

function buildRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/topics/topic-1/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildParams(id = "topic-1"): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const EXISTING_TOPIC = {
  id: "topic-1",
  title: "DNS",
  reviewInterval: 1,
  easeFactor: 2.5,
  nextReviewAt: null,
  lastReviewedAt: null,
  course: { userId: "user-1" },
};

// ── Tests ──────────────────────────────────────────────────────────────

describe("POST /api/v1/topics/[id]/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthUser.mockResolvedValue(TEST_USER);
    mockFindFirst.mockResolvedValue(EXISTING_TOPIC);
  });

  // ── Valid reviews ──────────────────────────────────────────────────

  it.each([1, 2, 3, 4, 5])(
    "should accept quality=%i, call computeSrs, and update the topic",
    async (quality) => {
      const srsResult = {
        nextInterval: 6,
        nextEaseFactor: 2.6,
        nextReviewAt: new Date("2026-03-19T12:00:00Z"),
      };
      const computeSpy = vi
        .spyOn(srsModule, "computeSrs")
        .mockReturnValue(srsResult);

      const updatedTopic = {
        ...EXISTING_TOPIC,
        reviewInterval: srsResult.nextInterval,
        easeFactor: srsResult.nextEaseFactor,
        nextReviewAt: srsResult.nextReviewAt,
        lastReviewedAt: new Date(),
      };
      mockUpdate.mockResolvedValue(updatedTopic);

      const res = await POST(buildRequest({ quality }), buildParams());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toBeDefined();
      expect(json.error).toBeNull();

      expect(computeSpy).toHaveBeenCalledWith({
        quality,
        currentInterval: EXISTING_TOPIC.reviewInterval,
        currentEaseFactor: EXISTING_TOPIC.easeFactor,
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "topic-1" },
        data: expect.objectContaining({
          nextReviewAt: srsResult.nextReviewAt,
          reviewInterval: srsResult.nextInterval,
          easeFactor: srsResult.nextEaseFactor,
        }),
      });

      computeSpy.mockRestore();
    }
  );

  // ── Validation errors ─────────────────────────────────────────────

  it("should return 422 for quality below 1", async () => {
    const res = await POST(buildRequest({ quality: 0 }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("should return 422 for quality above 5", async () => {
    const res = await POST(buildRequest({ quality: 6 }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("should return 422 for non-integer quality", async () => {
    const res = await POST(buildRequest({ quality: 3.5 }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("should return 422 for missing quality field", async () => {
    const res = await POST(buildRequest({}), buildParams());
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ── Not found ─────────────────────────────────────────────────────

  it("should return 404 when topic does not exist", async () => {
    mockFindFirst.mockResolvedValue(null);

    const res = await POST(buildRequest({ quality: 3 }), buildParams("no-topic"));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toBe("Topic not found");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ── Unauthenticated ───────────────────────────────────────────────

  it("should return 401 when user is not authenticated", async () => {
    mockedGetAuthUser.mockResolvedValue(null);

    const res = await POST(buildRequest({ quality: 3 }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ── Internal error ────────────────────────────────────────────────

  it("should return 500 when an unexpected error occurs", async () => {
    mockUpdate.mockRejectedValue(new Error("db down"));

    const computeSpy = vi
      .spyOn(srsModule, "computeSrs")
      .mockReturnValue({
        nextInterval: 1,
        nextEaseFactor: 2.5,
        nextReviewAt: new Date(),
      });

    const res = await POST(buildRequest({ quality: 3 }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");

    computeSpy.mockRestore();
  });
});
