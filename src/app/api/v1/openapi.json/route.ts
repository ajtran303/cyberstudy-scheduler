import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.0",
  info: {
    title: "CyberStudy Scheduler API",
    version: "1.0.0",
    description:
      "REST API for the CyberStudy Scheduler — tracks cybersecurity course progress, mastery levels, study events, and scheduling.",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          code: { type: "string" },
          message: { type: "string" },
        },
      },
      Envelope: {
        type: "object",
        properties: {
          data: {},
          error: { $ref: "#/components/schemas/Error", nullable: true },
        },
      },
      Course: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          professorName: { type: "string", nullable: true },
          professorEmail: { type: "string", nullable: true },
          website: { type: "string", nullable: true },
          courseCode: { type: "string", nullable: true },
          status: { type: "string", enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] },
          color: { type: "string" },
          sortOrder: { type: "integer" },
        },
      },
      Topic: {
        type: "object",
        properties: {
          id: { type: "string" },
          courseId: { type: "string" },
          name: { type: "string" },
          date: { type: "string", format: "date-time", nullable: true },
          details: { type: "string", nullable: true },
          notes: { type: "string", nullable: true },
          keyTerms: { type: "array", items: { type: "object", properties: { term: { type: "string" }, definition: { type: "string" } } }, nullable: true },
          mastery: { type: "string", enum: ["NOT_STARTED", "LEARNING", "PROFICIENT", "MASTERED"] },
          lastReviewedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Assignment: {
        type: "object",
        properties: {
          id: { type: "string" },
          courseId: { type: "string" },
          name: { type: "string" },
          dueDate: { type: "string", format: "date-time", nullable: true },
          status: { type: "string", enum: ["PENDING", "DONE"] },
          description: { type: "string", nullable: true },
          daysLeft: { type: "string" },
        },
      },
      Exam: {
        type: "object",
        properties: {
          id: { type: "string" },
          courseId: { type: "string" },
          name: { type: "string" },
          date: { type: "string", format: "date-time", nullable: true },
          status: { type: "string", enum: ["UPCOMING", "COMPLETED"] },
          description: { type: "string", nullable: true },
          daysLeft: { type: "string" },
        },
      },
      TeachItBack: {
        type: "object",
        properties: {
          id: { type: "string" },
          topicId: { type: "string" },
          attemptedAt: { type: "string", format: "date-time" },
          outcome: { type: "string", enum: ["PASS", "PARTIAL", "MISS"] },
          notes: { type: "string", nullable: true },
        },
      },
      QuizAttempt: {
        type: "object",
        properties: {
          id: { type: "string" },
          topicId: { type: "string" },
          correct: { type: "boolean" },
          questionText: { type: "string", nullable: true },
          sessionId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and get JWT token",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } } } } },
        responses: { 200: { description: "Token + user info" }, 401: { description: "Invalid credentials" } },
      },
    },
    "/auth/me": {
      get: { tags: ["Auth"], summary: "Get current user profile", responses: { 200: { description: "User profile" } } },
    },
    "/courses": {
      get: { tags: ["Courses"], summary: "List all courses", responses: { 200: { description: "Array of courses" } } },
      post: {
        tags: ["Courses"],
        summary: "Create a course",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Course" } } } },
        responses: { 201: { description: "Created course" } },
      },
    },
    "/courses/{id}": {
      get: { tags: ["Courses"], summary: "Get course detail", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Course with counts" } } },
      patch: { tags: ["Courses"], summary: "Update course", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Updated course" } } },
      delete: { tags: ["Courses"], summary: "Delete course", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Deleted" } } },
    },
    "/courses/{id}/batch": {
      post: {
        tags: ["Courses"],
        summary: "Batch import topics, assignments, exams",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { topics: { type: "array" }, assignments: { type: "array" }, exams: { type: "array" } } } } } },
        responses: { 201: { description: "All created" }, 207: { description: "Partial success" } },
      },
    },
    "/courses/{courseId}/topics": {
      get: {
        tags: ["Topics"],
        summary: "List topics for a course",
        parameters: [
          { name: "courseId", in: "path", required: true, schema: { type: "string" } },
          { name: "mastery", in: "query", schema: { type: "string" } },
          { name: "date_from", in: "query", schema: { type: "string" } },
          { name: "date_to", in: "query", schema: { type: "string" } },
          { name: "sort", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Array of topics" } },
      },
      post: { tags: ["Topics"], summary: "Create a topic", parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }], responses: { 201: { description: "Created topic" } } },
    },
    "/topics/{id}": {
      get: { tags: ["Topics"], summary: "Get topic detail", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Topic with keyTerms" } } },
      patch: { tags: ["Topics"], summary: "Update topic", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Updated topic" } } },
      delete: { tags: ["Topics"], summary: "Delete topic", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Deleted" } } },
    },
    "/topics/{id}/mastery": {
      patch: { tags: ["Mastery"], summary: "Set mastery for one topic", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { mastery: { type: "string", enum: ["NOT_STARTED", "LEARNING", "PROFICIENT", "MASTERED"] } } } } } }, responses: { 200: { description: "Updated topic" } } },
    },
    "/topics/{id}/teach-it-back": {
      post: { tags: ["Study Events"], summary: "Log a Teach It Back session", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 201: { description: "Created" } } },
      get: { tags: ["Study Events"], summary: "Get Teach It Back history", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer", default: 5 } }], responses: { 200: { description: "Array of sessions" } } },
    },
    "/topics/{id}/quiz-attempts": {
      post: { tags: ["Study Events"], summary: "Log a quiz attempt", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 201: { description: "Created" } } },
      get: { tags: ["Study Events"], summary: "Get quiz attempts for topic", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer", default: 10 } }], responses: { 200: { description: "Array of attempts" } } },
    },
    "/quiz-attempts": {
      get: { tags: ["Study Events"], summary: "Get quiz attempts by sessionId", parameters: [{ name: "sessionId", in: "query", required: true, schema: { type: "string" } }], responses: { 200: { description: "Array of attempts" } } },
    },
    "/courses/{courseId}/assignments": {
      get: { tags: ["Assignments"], summary: "List assignments", parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string" } }, { name: "sort", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Array" } } },
      post: { tags: ["Assignments"], summary: "Create assignment", parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }], responses: { 201: { description: "Created" } } },
    },
    "/assignments/{id}": {
      patch: { tags: ["Assignments"], summary: "Update assignment", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Assignments"], summary: "Delete assignment", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Deleted" } } },
    },
    "/courses/{courseId}/exams": {
      get: { tags: ["Exams"], summary: "List exams", parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string" } }, { name: "sort", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Array" } } },
      post: { tags: ["Exams"], summary: "Create exam", parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }], responses: { 201: { description: "Created" } } },
    },
    "/exams/{id}": {
      patch: { tags: ["Exams"], summary: "Update exam", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Exams"], summary: "Delete exam", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Deleted" } } },
    },
    "/calendar": {
      get: { tags: ["Aggregate"], summary: "Calendar events", parameters: [{ name: "view", in: "query", schema: { type: "string", enum: ["week", "month"] } }, { name: "date", in: "query", schema: { type: "string", format: "date" } }], responses: { 200: { description: "Calendar items" } } },
    },
    "/review": {
      get: { tags: ["Aggregate"], summary: "Review topics by mastery priority", parameters: [{ name: "courseId", in: "query", schema: { type: "string" } }, { name: "courseIds", in: "query", schema: { type: "string" } }, { name: "sort", in: "query", schema: { type: "string", enum: ["mastery_priority", "lastReviewedAt:asc", "lastReviewedAt:desc", "srs", "interleaved"] } }], responses: { 200: { description: "Array of topics" } } },
    },
    "/analytics": {
      get: { tags: ["Aggregate"], summary: "Mastery distribution", parameters: [{ name: "courseId", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Distribution counts" } } },
    },
    "/today-plan": {
      get: {
        tags: ["Aggregate"],
        summary: "Today's study plan",
        description: "Returns SRS reviews due, upcoming deadlines (assignments due within 7 days, exams within 14 days), exam prep topics, and daily study stats. All day boundaries (today, this week, etc.) are anchored to the America/New_York timezone.",
        responses: {
          200: {
            description: "Today plan data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        stats: {
                          type: "object",
                          properties: {
                            studyMinutesToday: { type: "integer" },
                            weeklyAvgMinutes: { type: "integer" },
                            reviewsToday: { type: "integer" },
                          },
                        },
                        srsReviews: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              course: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, color: { type: "string" } } },
                              topics: { type: "array", items: { $ref: "#/components/schemas/Topic" } },
                            },
                          },
                        },
                        interleavedReviews: {
                          type: "array",
                          description: "Flat list of SRS-due topics interleaved across courses for spaced interleaving practice",
                          items: { $ref: "#/components/schemas/Topic" },
                        },
                        srsTotal: { type: "integer" },
                        deadlines: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              type: { type: "string", enum: ["assignment", "exam"] },
                              name: { type: "string" },
                              date: { type: "string", format: "date-time", nullable: true },
                              status: { type: "string" },
                              course: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, color: { type: "string" } } },
                            },
                          },
                        },
                        examPrep: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              exam: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, date: { type: "string", format: "date-time", nullable: true }, course: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, color: { type: "string" } } } } },
                              topics: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, mastery: { type: "string", enum: ["NOT_STARTED", "LEARNING", "PROFICIENT", "MASTERED"] }, nextReviewAt: { type: "string", format: "date-time", nullable: true } } } },
                              topicsNeedingReview: { type: "integer" },
                            },
                          },
                        },
                      },
                    },
                    error: { $ref: "#/components/schemas/Error", nullable: true },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
