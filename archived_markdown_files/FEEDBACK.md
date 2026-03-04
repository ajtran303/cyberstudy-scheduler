# CyberStudy Scheduler — API Guide for Agentic AI

## Purpose

This document describes how an agentic AI would interact with the CyberStudy Scheduler REST API. The app tracks courses, topics, assignments, and exams for a cybersecurity degree program. The API is designed to be the primary interface for an AI agent to programmatically create, read, and update study data on behalf of the user.

Please review this document and provide feedback on:
- Are there missing endpoints or capabilities you'd need?
- Are the request/response shapes easy to work with?
- Are there workflows that would be awkward or require too many API calls?
- Any suggestions for making the API more agent-friendly?

---

## Authentication

```
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "..." }

→ 200 { "data": { "token": "eyJhbG..." }, "error": null }
```

All subsequent requests use:
```
Authorization: Bearer eyJhbG...
```

---

## API Discovery

The full OpenAPI 3.0 spec is available at:
```
GET /api/v1/openapi.json
```

An interactive Swagger UI is available at `/api/docs` for human browsing.

---

## Response Envelope

Every endpoint returns the same shape:

```json
// Success
{ "data": { ... }, "error": null }

// Error
{ "data": null, "error": { "code": "NOT_FOUND", "message": "Course not found" } }
```

Error codes are predictable strings: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `CONFLICT`.

---

## Data Model Overview

```
User
 └── Course (name, professorName, courseCode, status, color)
      ├── Topic (name, date, details, notes, mastery, lastReviewedAt)
      ├── Assignment (name, dueDate, status: pending/done, description)
      └── Exam (name, date, status: upcoming/completed, description)
```

### Mastery Levels (on Topics)

| Level | Meaning | Color |
|-------|---------|-------|
| `EXPOSED` | Not reviewed — knowledge gap | Red |
| `SCANNING` | Actively learning — partial understanding | Yellow |
| `HARDENED` | Confident — topic is locked down | Green |
| `CLASSIFIED` | Fully mastered or not being tested | Purple |

### Computed Fields

Assignments and exams include a `daysLeft` string computed server-side:
- `"5 days"`, `"tomorrow"`, `"due"`, `"late"`

---

## Endpoints Reference

### Courses
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/courses` | List all courses |
| `POST` | `/api/v1/courses` | Create a course |
| `GET` | `/api/v1/courses/:id` | Get course detail (includes child counts) |
| `PATCH` | `/api/v1/courses/:id` | Update course fields |
| `DELETE` | `/api/v1/courses/:id` | Delete course and all children |

### Topics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/courses/:courseId/topics` | List topics (supports `?mastery=EXPOSED` filter) |
| `POST` | `/api/v1/courses/:courseId/topics` | Create a topic |
| `GET` | `/api/v1/topics/:id` | Get topic detail |
| `PATCH` | `/api/v1/topics/:id` | Update topic fields |
| `DELETE` | `/api/v1/topics/:id` | Delete topic |
| `PATCH` | `/api/v1/topics/:id/mastery` | Set mastery level (auto-updates `lastReviewedAt`) |

### Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/courses/:courseId/assignments` | List (includes `daysLeft`, supports `?status=PENDING`) |
| `POST` | `/api/v1/courses/:courseId/assignments` | Create assignment |
| `PATCH` | `/api/v1/assignments/:id` | Update assignment |
| `DELETE` | `/api/v1/assignments/:id` | Delete assignment |

### Exams
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/courses/:courseId/exams` | List (includes `daysLeft`, supports `?status=UPCOMING`) |
| `POST` | `/api/v1/courses/:courseId/exams` | Create exam |
| `PATCH` | `/api/v1/exams/:id` | Update exam (including status) |
| `DELETE` | `/api/v1/exams/:id` | Delete exam |

### Aggregate Views
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/calendar?view=week&date=2026-03-03` | All items for a date range |
| `GET` | `/api/v1/review?courseId=...` | All topics sorted by mastery priority (Exposed first) |
| `GET` | `/api/v1/analytics?courseId=...` | Mastery distribution counts and percentages |

---

## Agent Workflows

### Workflow 1: Onboard a New Course from a Syllabus

The user gives the agent a syllabus (PDF or text). The agent parses it and populates the scheduler.

```
1. POST /api/v1/courses
   { "name": "Network Security", "courseCode": "CYB-310", "professorName": "Dr. Smith" }
   → { "data": { "id": "clx1abc..." } }

2. POST /api/v1/courses/clx1abc/topics  (repeated for each topic)
   { "name": "TCP/IP Fundamentals", "date": "2026-03-10" }
   { "name": "Firewall Configuration", "date": "2026-03-17" }
   ...

3. POST /api/v1/courses/clx1abc/assignments  (repeated for each assignment)
   { "name": "Lab 1: Packet Capture", "dueDate": "2026-03-14", "description": "Wireshark lab" }
   ...

4. POST /api/v1/courses/clx1abc/exams
   { "name": "Midterm", "date": "2026-04-15" }
   { "name": "Final Exam", "date": "2026-06-01" }
```

**Note:** This requires N+1 API calls (1 course + N children). A batch endpoint could reduce this — see Feedback Questions below.

---

### Workflow 2: Daily Study Briefing

The agent generates a summary of what's due and what needs review.

```
1. GET /api/v1/calendar?view=week&date=2026-03-03
   → topics, assignments, and exams for this week

2. GET /api/v1/review
   → all topics sorted by mastery priority (Exposed topics first)

3. GET /api/v1/analytics
   → overall mastery distribution

Agent composes a message like:
  "You have 3 assignments due this week. 12 topics are still EXPOSED.
   Your overall mastery: 40% Exposed, 35% Scanning, 20% Hardened, 5% Classified.
   Priority review: TCP/IP Fundamentals (Exposed, last reviewed: never)."
```

---

### Workflow 3: Post-Study Session Update

After the user studies a topic, the agent updates mastery.

```
1. GET /api/v1/courses/:courseId/topics?mastery=EXPOSED
   → find the topic that was studied

2. PATCH /api/v1/topics/:id/mastery
   { "mastery": "SCANNING" }
   → server auto-sets lastReviewedAt to now

   (or "HARDENED" if the user feels confident)
```

---

### Workflow 4: Mark Completed Work

After submitting an assignment or taking an exam:

```
PATCH /api/v1/assignments/:id
{ "status": "DONE" }

PATCH /api/v1/exams/:id
{ "status": "COMPLETED" }
```

---

### Workflow 5: Progress Check Before an Exam

Agent reviews readiness for an upcoming exam.

```
1. GET /api/v1/courses/:courseId/exams?status=UPCOMING
   → find the next exam and its date

2. GET /api/v1/courses/:courseId/topics
   → get all topics for that course

3. GET /api/v1/analytics?courseId=...
   → mastery breakdown for this course

Agent composes:
  "Midterm is in 12 days. You have 8 topics EXPOSED and 5 SCANNING.
   Recommend focusing on: Firewall Configuration, IDS/IPS Systems, VPN Protocols."
```

---

## Feedback Questions

Please consider and provide feedback on the following:

1. **Batch operations** — Onboarding a course requires many sequential POST calls. Would a batch endpoint like `POST /api/v1/courses/:id/batch` (accepting arrays of topics, assignments, and exams in one request) be useful? What shape would you want?

2. **Search / filtering** — Is `?mastery=EXPOSED` and `?status=PENDING` sufficient, or do you need full-text search across topic names, notes, and descriptions?

3. **Sorting** — The review endpoint sorts by mastery priority. Do you need control over sort order (e.g., `?sort=lastReviewedAt:asc`)?

4. **Pagination** — Lists currently return all items. Would you need pagination (`?page=1&limit=50`), or is the dataset small enough (one student's courses) that returning everything is fine?

5. **Bulk mastery update** — After a study session covering multiple topics, would `PATCH /api/v1/topics/bulk-mastery` with `{ ids: [...], mastery: "SCANNING" }` be useful?

6. **Webhook / event notifications** — Would it help to have a way to subscribe to events (e.g., "assignment due in 24 hours") or is polling the calendar endpoint sufficient?

7. **Notes on topics** — The topic `notes` field accepts markdown. Is plain markdown sufficient, or would structured data (e.g., key concepts, flashcard pairs) be more useful for an agent?

8. **Any missing data or endpoints** — Is there anything you'd need to do that isn't possible with the current API surface?
