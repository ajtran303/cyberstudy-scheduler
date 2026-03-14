import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockFindFirst, mockTopicCreate, mockAssignmentCreate, mockExamCreate, mockGetAuthUser } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockTopicCreate: vi.fn(),
  mockAssignmentCreate: vi.fn(),
  mockExamCreate: vi.fn(),
  mockGetAuthUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    course: { findFirst: mockFindFirst },
    topic: { create: mockTopicCreate },
    assignment: { create: mockAssignmentCreate },
    exam: { create: mockExamCreate },
  },
}));

vi.mock("@/lib/api-helpers", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
  };
});

// ── Import handler after mocks ─────────────────────────────────────────────────

import { POST } from "../[id]/batch/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_USER = { id: "user-1", email: "test@example.com", name: "Test" };
const COURSE_ID = "course-1";

function buildRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/courses/${COURSE_ID}/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildParams(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: COURSE_ID }) };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/v1/courses/[id]/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue(TEST_USER);
    mockFindFirst.mockResolvedValue({ id: COURSE_ID, userId: TEST_USER.id });
  });

  // ── 401 Unauthenticated ──────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(buildRequest({ topics: [] }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  // ── 404 Course not found ─────────────────────────────────────────────────

  it("returns 404 when course does not exist", async () => {
    mockFindFirst.mockResolvedValue(null);

    const res = await POST(buildRequest({ topics: [] }), buildParams());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  // ── 422 Validation error ─────────────────────────────────────────────────

  it("returns 422 for invalid body", async () => {
    const res = await POST(
      buildRequest({ topics: [{ name: "" }] }),
      buildParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  // ── 201 All items succeed ────────────────────────────────────────────────

  it("returns 201 when all items are created successfully", async () => {
    mockTopicCreate.mockResolvedValue({ id: "topic-1" });
    mockAssignmentCreate.mockResolvedValue({ id: "assign-1" });
    mockExamCreate.mockResolvedValue({ id: "exam-1" });

    const res = await POST(
      buildRequest({
        topics: [{ name: "Topic A" }],
        assignments: [{ name: "HW 1" }],
        exams: [{ name: "Midterm" }],
      }),
      buildParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.error).toBeNull();
    expect(json.data.topics).toHaveLength(1);
    expect(json.data.topics[0]).toEqual({ index: 0, id: "topic-1", status: "created" });
    expect(json.data.assignments).toHaveLength(1);
    expect(json.data.assignments[0]).toEqual({ index: 0, id: "assign-1", status: "created" });
    expect(json.data.exams).toHaveLength(1);
    expect(json.data.exams[0]).toEqual({ index: 0, id: "exam-1", status: "created" });
  });

  // ── 201 with empty arrays ───────────────────────────────────────────────

  it("returns 201 when all arrays are empty", async () => {
    const res = await POST(
      buildRequest({ topics: [], assignments: [], exams: [] }),
      buildParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.topics).toEqual([]);
    expect(json.data.assignments).toEqual([]);
    expect(json.data.exams).toEqual([]);
  });

  it("returns 201 when no arrays are provided at all", async () => {
    const res = await POST(buildRequest({}), buildParams());
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.topics).toEqual([]);
    expect(json.data.assignments).toEqual([]);
    expect(json.data.exams).toEqual([]);
  });

  // ── 207 Partial failure ──────────────────────────────────────────────────

  it("returns 207 when some topic creates fail", async () => {
    mockTopicCreate
      .mockResolvedValueOnce({ id: "topic-1" })
      .mockRejectedValueOnce(new Error("Unique constraint violated"));

    const res = await POST(
      buildRequest({
        topics: [{ name: "Topic A" }, { name: "Topic B" }],
      }),
      buildParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(207);
    expect(json.data.topics).toHaveLength(2);
    expect(json.data.topics[0].status).toBe("created");
    expect(json.data.topics[1].status).toBe("failed");
    expect(json.data.topics[1].error).toBe("Unique constraint violated");
    expect(json.data.topics[1].id).toBeNull();
  });

  it("returns 207 when an assignment create fails", async () => {
    mockTopicCreate.mockResolvedValue({ id: "topic-1" });
    mockAssignmentCreate.mockRejectedValueOnce(new Error("DB error"));

    const res = await POST(
      buildRequest({
        topics: [{ name: "Topic A" }],
        assignments: [{ name: "HW 1" }],
      }),
      buildParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(207);
    expect(json.data.topics[0].status).toBe("created");
    expect(json.data.assignments[0].status).toBe("failed");
  });

  it("returns 207 when an exam create fails", async () => {
    mockExamCreate.mockRejectedValueOnce(new Error("DB error"));

    const res = await POST(
      buildRequest({ exams: [{ name: "Final" }] }),
      buildParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(207);
    expect(json.data.exams[0].status).toBe("failed");
    expect(json.data.exams[0].error).toBe("DB error");
  });

  // ── Multiple items with mixed success ────────────────────────────────────

  it("tracks correct indices across multiple items", async () => {
    mockTopicCreate
      .mockResolvedValueOnce({ id: "t-0" })
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({ id: "t-2" });

    const res = await POST(
      buildRequest({
        topics: [
          { name: "A" },
          { name: "B" },
          { name: "C" },
        ],
      }),
      buildParams(),
    );
    const json = await res.json();

    expect(res.status).toBe(207);
    expect(json.data.topics[0]).toMatchObject({ index: 0, id: "t-0", status: "created" });
    expect(json.data.topics[1]).toMatchObject({ index: 1, id: null, status: "failed" });
    expect(json.data.topics[2]).toMatchObject({ index: 2, id: "t-2", status: "created" });
  });

  // ── Optional fields are forwarded to prisma ──────────────────────────────

  it("passes optional fields through to prisma create", async () => {
    mockTopicCreate.mockResolvedValue({ id: "topic-1" });

    const res = await POST(
      buildRequest({
        topics: [
          {
            name: "Topic X",
            date: "2026-03-15",
            details: "Some details",
            notes: "Some notes",
            keyTerms: [{ term: "CIA", definition: "Confidentiality, Integrity, Availability" }],
          },
        ],
      }),
      buildParams(),
    );

    expect(res.status).toBe(201);
    expect(mockTopicCreate).toHaveBeenCalledOnce();
    const createArg = mockTopicCreate.mock.calls[0][0];
    expect(createArg.data.courseId).toBe(COURSE_ID);
    expect(createArg.data.name).toBe("Topic X");
    expect(createArg.data.details).toBe("Some details");
    expect(createArg.data.notes).toBe("Some notes");
    expect(createArg.data.keyTerms).toEqual([
      { term: "CIA", definition: "Confidentiality, Integrity, Availability" },
    ]);
  });
});
