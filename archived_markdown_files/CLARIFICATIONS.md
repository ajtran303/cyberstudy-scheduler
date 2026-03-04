# CLARIFICATIONS.md — Response to Hex's Feedback

**From:** CyberStudy Scheduler dev team
**To:** Hex (study agent)
**Date:** 2026-03-03

Thanks for the detailed feedback. This addresses each point and flags where we need your input before finalizing.

---

## Accepted — Will Build

### 1. Batch Endpoint for Syllabus Import

Accepted. We'll add `POST /api/v1/courses/:id/batch` with your suggested shape.

**Clarification needed on partial success behavior:**

You asked for partial success with an `errors` array instead of full rollback. We can do this, but want to confirm the contract. Our proposal:

```json
// Response on partial success (HTTP 207 Multi-Status)
{
  "data": {
    "topics": [
      { "index": 0, "id": "clx1abc", "status": "created" },
      { "index": 1, "id": null, "status": "failed", "error": "Invalid date format" }
    ],
    "assignments": [
      { "index": 0, "id": "clx2def", "status": "created" }
    ],
    "exams": [
      { "index": 0, "id": "clx3ghi", "status": "created" }
    ]
  },
  "error": null
}
```

- Each item gets an `index` (position in the original array), `status` (`created` or `failed`), and `id` (null on failure).
- Failed items include an `error` string.
- HTTP 201 if everything succeeds, 207 if partial, 400 if the entire request shape is invalid (e.g., missing required fields on the wrapper).

**Question:** If a topic fails, should we still create the assignments and exams that reference no topics? Or do you process them independently (topics, assignments, and exams don't reference each other in the batch — they're all children of the course)?

### 2. Bulk Mastery Update

Accepted with your exact shape:

```
PATCH /api/v1/topics/bulk-mastery
{
  "updates": [
    { "id": "abc", "mastery": "SCANNING" },
    { "id": "def", "mastery": "EXPOSED" }
  ]
}
```

Each topic gets its `lastReviewedAt` set to `now()` individually. Response returns the updated topics so you can confirm the new state without follow-up GETs.

No clarifications needed — this is straightforward.

### 3. Sort Control

Accepted. We'll support a `sort` query param on these endpoints:

| Endpoint | Supported sorts |
|----------|----------------|
| `GET /api/v1/courses/:id/topics` | `date:asc`, `date:desc`, `lastReviewedAt:asc`, `lastReviewedAt:desc`, `sortOrder:asc` (default) |
| `GET /api/v1/review` | `mastery_priority` (default, Exposed→Scanning→Hardened), `lastReviewedAt:asc`, `lastReviewedAt:desc` |
| `GET /api/v1/courses/:id/assignments` | `dueDate:asc` (default), `dueDate:desc`, `sortOrder:asc` |
| `GET /api/v1/courses/:id/exams` | `date:asc` (default), `date:desc` |

**Question:** For the review endpoint, when sorting by `lastReviewedAt:asc`, should topics that have *never* been reviewed (`lastReviewedAt: null`) sort first or last? Our assumption: **first** (null = never reviewed = highest priority). Confirm?

### 4. Date Range Filter on Topics

Accepted. We'll add `?date_from=` and `?date_to=` query params on `GET /api/v1/courses/:courseId/topics`. Both are optional and can be used independently.

```
GET /api/v1/courses/:courseId/topics?date_from=2026-03-03&date_to=2026-03-03
→ topics with date matching today (for your midnight scan)
```

No clarifications needed.

### 5. Cross-Course Review

This already works as designed — `courseId` is an optional query param on `GET /api/v1/review`. Omitting it returns topics across all courses. We'll also add `?courseIds=id1,id2` for the multi-course case you described (CIST 1001 + CIST 1122 together).

No clarifications needed.

---

## Accepted with Design Questions

### 6. Teach It Back Event Logging

Accepted as a concept. This is the one that needs the most design discussion.

Your proposed shape:
```
POST /api/v1/topics/:id/teach-it-back
{ "attemptedAt": "...", "outcome": "pass" | "partial" | "miss", "notes": "..." }
```

**Our proposed schema addition:**

```prisma
model TeachItBack {
  id          String          @id @default(cuid())
  topicId     String
  topic       Topic           @relation(fields: [topicId], references: [id], onDelete: Cascade)
  attemptedAt DateTime        @default(now())
  outcome     TeachItOutcome
  notes       String?         // your Socratic feedback / grading notes
  createdAt   DateTime        @default(now())
}

enum TeachItOutcome {
  PASS
  PARTIAL
  MISS
}
```

**Questions:**

1. **Should Teach It Back outcomes influence mastery automatically?** For example: a `PASS` could auto-promote SCANNING → HARDENED, a `MISS` could auto-demote HARDENED → SCANNING. Or do you want to keep mastery updates fully manual (you decide what mastery to set after evaluating the session)? Our instinct is to keep them decoupled — you already have the bulk mastery endpoint to set levels after grading.

2. **Do you need a GET for history?** E.g., `GET /api/v1/topics/:id/teach-it-back` → array of past attempts? This would let you check "has this topic ever had a Teach It Back session" and "what was the last outcome" without tracking that yourself.

3. **The `notes` field** — is this where you'd store your Socratic feedback text, or just a short summary? Asking because it affects field size expectations (TEXT vs VARCHAR).

### 7. keyTerms on Topics

Accepted as a low-priority addition. Two implementation options:

**Option A: JSON field on Topic**
```prisma
model Topic {
  ...
  keyTerms  Json?  // stored as jsonb in Postgres
}
```
Shape: `[{ "term": "ARP", "definition": "Maps IP to MAC" }]`
Updated via the existing `PATCH /api/v1/topics/:id` endpoint.

**Option B: Separate KeyTerm model**
```prisma
model KeyTerm {
  id         String @id @default(cuid())
  topicId    String
  topic      Topic  @relation(...)
  term       String
  definition String
}
```
Gets its own CRUD endpoints.

**Our recommendation: Option A** (JSON field). It's simpler, avoids extra endpoints, and you're the only consumer. You'd update terms by PATCHing the topic with a `keyTerms` array. The tradeoff is you can't query individual terms across topics (e.g., "find all topics that define ARP"), but that seems unlikely to matter.

**Question:** Do you agree with Option A, or do you foresee needing to query/search across key terms?

### 8. Quiz Attempt Tracking

You suggested `POST /api/v1/topics/:id/quiz-attempt` with `{ correct: true/false }`. We can do this, but want to scope it correctly.

**Proposed schema:**

```prisma
model QuizAttempt {
  id        String   @id @default(cuid())
  topicId   String
  topic     Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  correct   Boolean
  sessionId String?  // optional: group attempts from the same quiz session
  createdAt DateTime @default(now())
}
```

**Endpoints:**
```
POST /api/v1/topics/:id/quiz-attempts       → log one attempt
GET  /api/v1/topics/:id/quiz-attempts        → history for a topic
GET  /api/v1/quiz-attempts?sessionId=...     → all attempts from one quiz session
```

The `sessionId` is a string you generate client-side (e.g., `quiz-2026-03-03-cist1001`) to group attempts from a single quiz. This way you can later ask "how did the March 3rd quiz go?" without date-range filtering.

**Questions:**

1. **Is `correct: true/false` granular enough?** Or do you want to store the question text / expected answer so you can analyze *what* was missed, not just *that* something was missed?

2. **Should quiz attempts feed into mastery?** E.g., 3 consecutive correct attempts → auto-promote to HARDENED? Or same philosophy as Teach It Back — keep decoupled, let you decide mastery separately?

---

## Noted — No Action Needed

### 9. Obsidian as Source of Truth

Understood. The boundary is clear:
- **Obsidian** = knowledge layer (Sev's notes, raw content)
- **CyberStudy API** = progress layer (mastery tracking, scheduling, analytics)

The API won't try to ingest or store Sev's freeform notes. Your midnight scan reads Obsidian → calls the API to update mastery. The `notes` field on topics is optional metadata (e.g., a brief summary or link back to the Obsidian note), not a replacement for the vault.

### 10. Webhooks / Pagination

Confirmed: not building these. Cron-driven polling is fine. Pagination can be added later if the dataset grows.

---

## Summary of Open Questions

Please respond to these so we can finalize the schema:

| # | Question |
|---|----------|
| 1 | Batch endpoint: if one topic fails validation, should assignments/exams in the same batch still be created? (We assume yes — they're independent.) |
| 2 | Review sort: should `lastReviewedAt: null` (never reviewed) sort first or last when sorting by `lastReviewedAt:asc`? (We assume first.) |
| 3 | Teach It Back: should outcomes auto-influence mastery, or stay decoupled? |
| 4 | Teach It Back: do you need `GET` history for past attempts? |
| 5 | Teach It Back `notes` field: short summary or full Socratic feedback text? |
| 6 | keyTerms: JSON field on Topic (Option A) or separate model (Option B)? |
| 7 | Quiz attempts: store just `correct: boolean`, or also the question/answer text? |
| 8 | Quiz attempts: should they auto-influence mastery? |
