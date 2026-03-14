import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockFindMany, mockCreate, mockCount, mockFindFirst, mockGetAuthUser } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
  mockCount: vi.fn(),
  mockFindFirst: vi.fn(),
  mockGetAuthUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    studySession: {
      findMany: mockFindMany,
      create: mockCreate,
      count: mockCount,
    },
    course: {
      findFirst: mockFindFirst,
    },
  },
}));

vi.mock("@/lib/api-helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-helpers")>();
  return {
    ...actual,
    getAuthUser: mockGetAuthUser,
  };
});

import { GET, POST } from "../route";

const TEST_USER = { id: "user-1", email: "test@example.com", name: "Test User" };

function buildRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("POST /api/v1/study-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue(TEST_USER);
  });

  it("creates a session with explicit durationMinutes", async () => {
    const sessionData = {
      courseId: undefined,
      startedAt: "2026-03-13T10:00:00.000Z",
      endedAt: "2026-03-13T10:30:00.000Z",
      durationMinutes: 25,
      notes: "Reviewed chapter 4",
    };

    const createdSession = {
      id: "session-1",
      userId: TEST_USER.id,
      courseId: null,
      startedAt: new Date(sessionData.startedAt),
      endedAt: new Date(sessionData.endedAt),
      durationMinutes: 25,
      notes: "Reviewed chapter 4",
      course: null,
    };

    mockCreate.mockResolvedValue(createdSession);

    const req = buildRequest("POST", "/api/v1/study-sessions", {
      startedAt: sessionData.startedAt,
      endedAt: sessionData.endedAt,
      durationMinutes: sessionData.durationMinutes,
      notes: sessionData.notes,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toEqual(expect.objectContaining({ durationMinutes: 25 }));
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ durationMinutes: 25 }),
      })
    );
  });

  it("auto-computes durationMinutes from startedAt/endedAt when not provided", async () => {
    const startedAt = "2026-03-13T10:00:00.000Z";
    const endedAt = "2026-03-13T10:45:00.000Z"; // 45 minutes later

    const createdSession = {
      id: "session-2",
      userId: TEST_USER.id,
      courseId: null,
      startedAt: new Date(startedAt),
      endedAt: new Date(endedAt),
      durationMinutes: 45,
      notes: null,
      course: null,
    };

    mockCreate.mockResolvedValue(createdSession);

    const req = buildRequest("POST", "/api/v1/study-sessions", {
      startedAt,
      endedAt,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toBeDefined();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ durationMinutes: 45 }),
      })
    );
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const req = buildRequest("POST", "/api/v1/study-sessions", {
      startedAt: "2026-03-13T10:00:00.000Z",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 422 when startedAt is missing", async () => {
    const req = buildRequest("POST", "/api/v1/study-sessions", {});

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 422 when startedAt is not a valid datetime", async () => {
    const req = buildRequest("POST", "/api/v1/study-sessions", {
      startedAt: "not-a-date",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 422 when durationMinutes exceeds max (1440)", async () => {
    const req = buildRequest("POST", "/api/v1/study-sessions", {
      startedAt: "2026-03-13T10:00:00.000Z",
      durationMinutes: 1500,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when courseId does not belong to user", async () => {
    mockFindFirst.mockResolvedValue(null);

    const req = buildRequest("POST", "/api/v1/study-sessions", {
      startedAt: "2026-03-13T10:00:00.000Z",
      courseId: "cm1234567890abcdefghijklm",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("sets durationMinutes to null when neither provided nor computable", async () => {
    const createdSession = {
      id: "session-3",
      userId: TEST_USER.id,
      courseId: null,
      startedAt: new Date("2026-03-13T10:00:00.000Z"),
      endedAt: null,
      durationMinutes: null,
      notes: null,
      course: null,
    };

    mockCreate.mockResolvedValue(createdSession);

    const req = buildRequest("POST", "/api/v1/study-sessions", {
      startedAt: "2026-03-13T10:00:00.000Z",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ durationMinutes: null }),
      })
    );
  });
});

describe("GET /api/v1/study-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue(TEST_USER);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const req = buildRequest("GET", "/api/v1/study-sessions");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns sessions for authenticated user", async () => {
    const sessions = [
      { id: "s1", userId: TEST_USER.id, course: null },
    ];
    mockFindMany.mockResolvedValue(sessions);
    mockCount.mockResolvedValue(1);

    const req = buildRequest("GET", "/api/v1/study-sessions");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.sessions).toHaveLength(1);
    expect(json.data.total).toBe(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER.id },
      })
    );
  });

  it("filters by courseId when provided", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const req = buildRequest("GET", "/api/v1/study-sessions?courseId=course-1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER.id, courseId: "course-1" },
      })
    );
  });
});
