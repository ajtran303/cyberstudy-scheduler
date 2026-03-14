import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    topic: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/api-helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-helpers")>();
  return {
    ...actual,
    getAuthUser: vi.fn(),
  };
});

import { PATCH } from "../[id]/mastery/route";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-helpers";

const mockGetAuthUser = vi.mocked(getAuthUser);
const mockFindFirst = vi.mocked(prisma.topic.findFirst);
const mockUpdate = vi.mocked(prisma.topic.update);

function buildRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/topics/topic-1/mastery", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildParams(id = "topic-1"): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/v1/topics/[id]/mastery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Test",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await PATCH(buildRequest({ mastery: "LEARNING" }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 when topic is not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    const res = await PATCH(buildRequest({ mastery: "LEARNING" }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("returns 422 for an invalid mastery value", async () => {
    mockFindFirst.mockResolvedValue({
      id: "topic-1",
      mastery: "NOT_STARTED",
    } as any);

    const res = await PATCH(buildRequest({ mastery: "INVALID" }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when mastery field is missing", async () => {
    mockFindFirst.mockResolvedValue({
      id: "topic-1",
      mastery: "NOT_STARTED",
    } as any);

    const res = await PATCH(buildRequest({}), buildParams());
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("initializes SRS fields when transitioning NOT_STARTED -> LEARNING", async () => {
    mockFindFirst.mockResolvedValue({
      id: "topic-1",
      mastery: "NOT_STARTED",
    } as any);

    const updatedTopic = { id: "topic-1", mastery: "LEARNING" };
    mockUpdate.mockResolvedValue(updatedTopic as any);

    const res = await PATCH(buildRequest({ mastery: "LEARNING" }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(updatedTopic);

    const updateCall = mockUpdate.mock.calls[0][0] as any;
    expect(updateCall.data.mastery).toBe("LEARNING");
    expect(updateCall.data.nextReviewAt).toBeInstanceOf(Date);
    expect(updateCall.data.reviewInterval).toBe(0);
    expect(updateCall.data.easeFactor).toBe(2.5);
    expect(updateCall.data.lastReviewedAt).toBeInstanceOf(Date);
  });

  it("clears nextReviewAt when transitioning to MASTERED", async () => {
    mockFindFirst.mockResolvedValue({
      id: "topic-1",
      mastery: "PROFICIENT",
    } as any);

    const updatedTopic = { id: "topic-1", mastery: "MASTERED" };
    mockUpdate.mockResolvedValue(updatedTopic as any);

    const res = await PATCH(buildRequest({ mastery: "MASTERED" }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(updatedTopic);

    const updateCall = mockUpdate.mock.calls[0][0] as any;
    expect(updateCall.data.mastery).toBe("MASTERED");
    expect(updateCall.data.nextReviewAt).toBeNull();
    expect(updateCall.data.lastReviewedAt).toBeInstanceOf(Date);
  });

  it("clears nextReviewAt when transitioning to NOT_STARTED", async () => {
    mockFindFirst.mockResolvedValue({
      id: "topic-1",
      mastery: "LEARNING",
    } as any);

    const updatedTopic = { id: "topic-1", mastery: "NOT_STARTED" };
    mockUpdate.mockResolvedValue(updatedTopic as any);

    const res = await PATCH(buildRequest({ mastery: "NOT_STARTED" }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(updatedTopic);

    const updateCall = mockUpdate.mock.calls[0][0] as any;
    expect(updateCall.data.mastery).toBe("NOT_STARTED");
    expect(updateCall.data.nextReviewAt).toBeNull();
  });

  it("does not set SRS init fields for LEARNING -> PROFICIENT", async () => {
    mockFindFirst.mockResolvedValue({
      id: "topic-1",
      mastery: "LEARNING",
    } as any);

    const updatedTopic = { id: "topic-1", mastery: "PROFICIENT" };
    mockUpdate.mockResolvedValue(updatedTopic as any);

    const res = await PATCH(buildRequest({ mastery: "PROFICIENT" }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(updatedTopic);

    const updateCall = mockUpdate.mock.calls[0][0] as any;
    expect(updateCall.data.mastery).toBe("PROFICIENT");
    expect(updateCall.data).not.toHaveProperty("nextReviewAt");
    expect(updateCall.data).not.toHaveProperty("reviewInterval");
    expect(updateCall.data).not.toHaveProperty("easeFactor");
    expect(updateCall.data.lastReviewedAt).toBeInstanceOf(Date);
  });

  it("returns 500 when prisma update throws", async () => {
    mockFindFirst.mockResolvedValue({
      id: "topic-1",
      mastery: "NOT_STARTED",
    } as any);
    mockUpdate.mockRejectedValue(new Error("DB error"));

    const res = await PATCH(buildRequest({ mastery: "LEARNING" }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  it("scopes the topic lookup to the authenticated user", async () => {
    mockFindFirst.mockResolvedValue(null);

    await PATCH(buildRequest({ mastery: "LEARNING" }), buildParams("topic-99"));

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "topic-99", course: { userId: "user-1" } },
    });
  });
});
