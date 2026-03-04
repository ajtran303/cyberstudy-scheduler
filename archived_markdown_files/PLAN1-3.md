# CyberStudy Scheduler — Full Project Plan (v3 FINAL)

## Context

Rebuilding the "Ultimate Study Scheduler" Notion template (by Cajun Koi Academy) as a deployable web application. This is a personal tool for tracking progress through a cybersecurity degree program. It must deploy to Render.com and expose a documented REST API for programmatic access.

**Primary API consumer:** An agentic AI ("Hex") that runs cron-driven workflows — midnight note scans, daily quizzes, Teach It Back sessions, and weekly reviews. The existing study infrastructure uses an Obsidian vault as the knowledge layer; this API serves as the structured progress/tracking layer alongside it.

**Architecture boundary:** Obsidian = knowledge (notes, raw content). CyberStudy API = progress (mastery tracking, scheduling, analytics, study event logs).

---

## Tech Stack

### Next.js 14 (App Router) + PostgreSQL + Prisma + shadcn/ui + NextAuth.js

| Choice | Why |
|--------|-----|
| **Next.js (App Router)** | Full-stack in one codebase. Route Handlers serve as both the frontend data layer AND the public REST API. Single Render service to deploy. Server Components for fast dashboard loads. |
| **TypeScript** | Type safety from database schema (Prisma) through API to UI. Shared types everywhere. |
| **PostgreSQL** | Render offers managed Postgres (free tier). Relational model fits the data. |
| **Prisma** | Type-safe ORM, migrations, seeding. Schema-first approach keeps DB and app in sync. |
| **shadcn/ui + Tailwind** | Notion-like clean aesthetic. Accessible Radix primitives. Built-in chart components. Dark mode support. |
| **NextAuth.js (Auth.js v5)** | Session-based auth with credentials provider. JWT for API access. |
| **next-swagger-doc + swagger-ui-react** | OpenAPI spec generation from JSDoc annotations. Swagger UI at `/api/docs`, raw spec at `/api/v1/openapi.json` for agent consumption. |
| **Zod** | Runtime request validation. Schemas double as source of truth for OpenAPI generation. |

---

## Database Schema

```prisma
// ─── Users ───────────────────────────────────────────

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // bcrypt hashed
  courses   Course[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ─── Courses ─────────────────────────────────────────

model Course {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  name           String
  professorName  String?
  professorEmail String?
  website        String?
  courseCode     String?
  status         CourseStatus  @default(NOT_STARTED)
  color          String        @default("#6366f1")
  sortOrder      Int           @default(0)
  topics         Topic[]
  assignments    Assignment[]
  exams          Exam[]
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}

enum CourseStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

// ─── Topics ──────────────────────────────────────────

model Topic {
  id             String         @id @default(cuid())
  courseId        String
  course         Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)
  name           String
  date           DateTime?      // planned study date
  details        String?        // quick notes (visible in list)
  notes          String?        // full notes (markdown)
  keyTerms       Json?          // [{ "term": "ARP", "definition": "Maps IP to MAC" }]
  mastery        Mastery        @default(EXPOSED)
  lastReviewedAt DateTime?
  sortOrder      Int            @default(0)
  teachItBacks   TeachItBack[]
  quizAttempts   QuizAttempt[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}

enum Mastery {
  EXPOSED      // Red    — not reviewed; an open vulnerability in your knowledge
  SCANNING     // Yellow — actively learning; doing recon on the material
  HARDENED     // Green  — confident; this topic is locked down
  CLASSIFIED   // Purple — fully mastered / not being tested; filed away in the vault
}

// ─── Assignments ─────────────────────────────────────

model Assignment {
  id          String           @id @default(cuid())
  courseId     String
  course      Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)
  name        String
  dueDate     DateTime?
  status      AssignmentStatus @default(PENDING)
  description String?
  sortOrder   Int              @default(0)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

enum AssignmentStatus {
  PENDING
  DONE
}

// ─── Exams ───────────────────────────────────────────

model Exam {
  id          String     @id @default(cuid())
  courseId     String
  course      Course     @relation(fields: [courseId], references: [id], onDelete: Cascade)
  name        String
  date        DateTime?
  description String?
  status      ExamStatus @default(UPCOMING)
  sortOrder   Int        @default(0)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

enum ExamStatus {
  UPCOMING
  COMPLETED
}

// ─── Study Event Logs ────────────────────────────────
// These are append-only logs. They do NOT auto-influence mastery.
// Mastery is always a deliberate write via the mastery endpoints.

model TeachItBack {
  id          String          @id @default(cuid())
  topicId     String
  topic       Topic           @relation(fields: [topicId], references: [id], onDelete: Cascade)
  attemptedAt DateTime        @default(now())
  outcome     TeachItOutcome
  notes       String?         // Full Socratic feedback text (TEXT, not VARCHAR)
  createdAt   DateTime        @default(now())
}

enum TeachItOutcome {
  PASS      // Explained clearly
  PARTIAL   // Partial understanding
  MISS      // Could not explain
}

model QuizAttempt {
  id           String   @id @default(cuid())
  topicId      String
  topic        Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  correct      Boolean
  questionText String?  // The question asked (optional — included for daily/weekly quizzes, omitted for informal checks)
  sessionId    String?  // Groups attempts from one quiz session; matches Obsidian filename e.g. "quiz-2026-03-03-cist1001-daily"
  createdAt    DateTime @default(now())

  @@index([sessionId])
}
```

**Computed fields** (not stored, calculated at query/render time):
- `daysLeft` on assignments/exams: relative to `dueDate`/`date` → "X days", "tomorrow", "due", "late"

---

## Mastery Levels

| Level | Label | Color | Icon | Meaning |
|-------|-------|-------|------|---------|
| 0 | **EXPOSED** | Red (#ef4444) | Shield-off | Not reviewed — an open vulnerability in your knowledge |
| 1 | **SCANNING** | Amber (#f59e0b) | Radar | Actively learning — doing recon on the material |
| 2 | **HARDENED** | Green (#10b981) | Shield-check | Confident — this topic is locked down |
| 3 | **CLASSIFIED** | Purple (#8b5cf6) | Lock | Fully mastered / not being tested — filed away in the vault |

**Key design decision:** Mastery is always a deliberate write. Neither Teach It Back outcomes nor quiz attempt results auto-promote or auto-demote mastery. The agent evaluates context and nuance, then explicitly sets mastery via the bulk mastery endpoint.

---

## REST API Design

All endpoints under `/api/v1/`. Auth via Bearer token (JWT from NextAuth).

### Response Envelope

Every endpoint returns a consistent JSON shape:

```json
// Success
{ "data": { ... }, "error": null }

// Error
{ "data": null, "error": { "code": "NOT_FOUND", "message": "Course not found" } }

// Partial success (batch operations, HTTP 207)
{ "data": { "topics": [{ "index": 0, "id": "clx1abc", "status": "created" }, ...] }, "error": null }
```

Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `CONFLICT`.

### Sorting

Supported via `?sort=field:direction` query param:

| Endpoint | Supported sorts | Default |
|----------|----------------|---------|
| `GET /courses/:id/topics` | `date:asc`, `date:desc`, `lastReviewedAt:asc`, `lastReviewedAt:desc`, `sortOrder:asc` | `sortOrder:asc` |
| `GET /review` | `mastery_priority`, `lastReviewedAt:asc`, `lastReviewedAt:desc` | `mastery_priority` |
| `GET /courses/:id/assignments` | `dueDate:asc`, `dueDate:desc`, `sortOrder:asc` | `dueDate:asc` |
| `GET /courses/:id/exams` | `date:asc`, `date:desc` | `date:asc` |

**Null handling:** When sorting by `lastReviewedAt:asc`, topics with `lastReviewedAt: null` (never reviewed) sort **first** — never-reviewed = highest priority.

### Endpoints

```
# ─── Auth ─────────────────────────────────────────────
POST   /api/v1/auth/register            { email, name, password }
POST   /api/v1/auth/login               { email, password } → { token }
GET    /api/v1/auth/me                   → user profile

# ─── Courses ──────────────────────────────────────────
GET    /api/v1/courses                   → list all courses
POST   /api/v1/courses                   → create course
GET    /api/v1/courses/:id               → course detail (includes topic/assignment/exam counts)
PATCH  /api/v1/courses/:id               → update course
DELETE /api/v1/courses/:id               → delete course + all children

# ─── Batch Import ─────────────────────────────────────
POST   /api/v1/courses/:id/batch         → create topics + assignments + exams in one call
                                           HTTP 201 (all success) or 207 (partial success)
                                           Items are independent: a failed topic does NOT block exams

# ─── Topics ───────────────────────────────────────────
GET    /api/v1/courses/:courseId/topics   → list topics
                                           Filters: ?mastery=, ?date_from=, ?date_to=
                                           Sort: ?sort=date:asc|lastReviewedAt:asc|sortOrder:asc
POST   /api/v1/courses/:courseId/topics   → create topic
GET    /api/v1/topics/:id                 → topic detail (includes keyTerms in response)
PATCH  /api/v1/topics/:id                 → update topic (including keyTerms array)
DELETE /api/v1/topics/:id                 → delete topic

# ─── Mastery ──────────────────────────────────────────
PATCH  /api/v1/topics/:id/mastery        → set mastery for one topic; auto-sets lastReviewedAt
PATCH  /api/v1/topics/bulk-mastery       → set mastery for multiple topics at once
                                           { "updates": [{ "id": "...", "mastery": "SCANNING" }] }
                                           Each topic gets lastReviewedAt = now() individually
                                           Returns updated topics

# ─── Teach It Back ────────────────────────────────────
POST   /api/v1/topics/:id/teach-it-back  → log a Teach It Back session
                                           { "outcome": "PASS"|"PARTIAL"|"MISS", "notes": "..." }
                                           Does NOT auto-influence mastery
GET    /api/v1/topics/:id/teach-it-back  → history of attempts (sorted attemptedAt:desc)
                                           Supports ?limit= (default 5)

# ─── Quiz Attempts ────────────────────────────────────
POST   /api/v1/topics/:id/quiz-attempts  → log a quiz attempt
                                           { "correct": true, "questionText": "...", "sessionId": "..." }
                                           questionText and sessionId are optional
                                           Does NOT auto-influence mastery
GET    /api/v1/topics/:id/quiz-attempts  → history for a topic (sorted createdAt:desc)
                                           Supports ?limit= (default 10)
GET    /api/v1/quiz-attempts             → query across topics
                                           Supports ?sessionId= (get all attempts from one quiz)

# ─── Assignments ──────────────────────────────────────
GET    /api/v1/courses/:courseId/assignments  → list (includes daysLeft)
                                               Filters: ?status=PENDING|DONE
                                               Sort: ?sort=dueDate:asc
POST   /api/v1/courses/:courseId/assignments  → create
PATCH  /api/v1/assignments/:id               → update
DELETE /api/v1/assignments/:id               → delete

# ─── Exams ────────────────────────────────────────────
GET    /api/v1/courses/:courseId/exams   → list (includes daysLeft)
                                           Filters: ?status=UPCOMING|COMPLETED
                                           Sort: ?sort=date:asc
POST   /api/v1/courses/:courseId/exams   → create
PATCH  /api/v1/exams/:id                 → update (including status toggle)
DELETE /api/v1/exams/:id                 → delete

# ─── Aggregate Views ──────────────────────────────────
GET    /api/v1/calendar                  → all items for date range
                                           Params: ?view=week|month, ?date=2026-03-03
GET    /api/v1/review                    → all topics sorted by mastery priority
                                           Params: ?courseId=, ?courseIds=id1,id2
                                           Sort: ?sort=mastery_priority|lastReviewedAt:asc
GET    /api/v1/analytics                 → mastery distribution counts + percentages
                                           Params: ?courseId=

# ─── Documentation ────────────────────────────────────
GET    /api/docs                         → Swagger UI (interactive)
GET    /api/v1/openapi.json              → OpenAPI 3.0 spec
```

---

## Batch Import Detail

```
POST /api/v1/courses/:id/batch
```

**Request:**
```json
{
  "topics": [
    { "name": "TCP/IP Fundamentals", "date": "2026-03-10" },
    { "name": "Firewall Configuration", "date": "2026-03-17" }
  ],
  "assignments": [
    { "name": "Lab 1: Packet Capture", "dueDate": "2026-03-14", "description": "Wireshark lab" }
  ],
  "exams": [
    { "name": "Midterm", "date": "2026-04-15" }
  ]
}
```

**Response (HTTP 201 — all success):**
```json
{
  "data": {
    "topics": [
      { "index": 0, "id": "clx1abc", "status": "created" },
      { "index": 1, "id": "clx2def", "status": "created" }
    ],
    "assignments": [
      { "index": 0, "id": "clx3ghi", "status": "created" }
    ],
    "exams": [
      { "index": 0, "id": "clx4jkl", "status": "created" }
    ]
  },
  "error": null
}
```

**Response (HTTP 207 — partial success):**
```json
{
  "data": {
    "topics": [
      { "index": 0, "id": "clx1abc", "status": "created" },
      { "index": 1, "id": null, "status": "failed", "error": "Invalid date format" }
    ],
    "assignments": [
      { "index": 0, "id": "clx3ghi", "status": "created" }
    ],
    "exams": [
      { "index": 0, "id": "clx4jkl", "status": "created" }
    ]
  },
  "error": null
}
```

Topics, assignments, and exams are processed independently. A failure in one category does not affect the others.

---

## Agent Workflows

### Workflow 1: Onboard a New Course from Syllabus
```
1. POST /api/v1/courses                    → create course, get id
2. POST /api/v1/courses/:id/batch          → all topics + assignments + exams in one call
3. Check response for any failed items     → retry individually if needed
```

### Workflow 2: Daily Study Briefing (cron: midnight)
```
1. GET /api/v1/calendar?view=week&date=today       → what's due this week
2. GET /api/v1/review?sort=lastReviewedAt:asc       → topics needing review (oldest first)
3. GET /api/v1/analytics                             → overall mastery snapshot
→ Compose briefing message for Sev
```

### Workflow 3: Midnight Note Scan
```
1. Read Obsidian vault → identify topics covered today
2. GET /api/v1/courses/:courseId/topics?date_from=today&date_to=today  → match to API topics
3. PATCH /api/v1/topics/bulk-mastery       → update mastery for covered topics
```

### Workflow 4: Post-Quiz Grading
```
1. Grade quiz → for each question, determine topic + correct/incorrect
2. POST /api/v1/topics/:id/quiz-attempts   → log each attempt (with sessionId matching quiz filename)
3. PATCH /api/v1/topics/bulk-mastery       → update mastery based on grading assessment
```

### Workflow 5: Teach It Back Session (cron: 9:30 PM)
```
1. GET /api/v1/review?sort=mastery_priority         → pick an EXPOSED or SCANNING topic
2. GET /api/v1/topics/:id/teach-it-back?limit=1     → check last attempt (avoid repeating too soon)
3. Conduct Teach It Back session with Sev
4. POST /api/v1/topics/:id/teach-it-back             → log outcome + Socratic feedback
5. PATCH /api/v1/topics/:id/mastery                  → update mastery based on assessment
```

### Workflow 6: Pre-Exam Readiness Check
```
1. GET /api/v1/courses/:courseId/exams?status=UPCOMING   → find next exam + date
2. GET /api/v1/courses/:courseId/topics                   → all topics for course
3. GET /api/v1/analytics?courseId=...                     → mastery breakdown
4. GET /api/v1/topics/:id/quiz-attempts?limit=3           → recent quiz performance per topic
→ Compose readiness report: "Midterm in 12 days. 8 topics EXPOSED, 5 SCANNING."
```

---

## Feature Map

### 1. Home Base Dashboard (`/dashboard`)
- Customizable welcome message
- **Courses section**: grid of course cards (name, status, color, professor)
  - Click → opens course detail page
  - "+ New Course" button
- **Calendar section** with tabs:
  - Week view (default)
  - Month view
  - Assignments (all, across courses — shows class, due date, status)
  - Exams (all, across courses — shows status: upcoming/completed)
  - Analytics (pie chart of mastery breakdown)

### 2. Course Detail Page (`/dashboard/courses/[id]`)
- Course header: name, professor, email, website, course code, status toggle
- 4 tabs:
  - **Topics**: list with name, date, details, mastery badge. "+ New Topic" button
  - **Review**: all topics sorted by mastery priority (Exposed → Scanning → Hardened). Shows mastery + last reviewed date. Inline mastery change with confirmation.
  - **Assignments**: list with name, due date, days left (computed), status. Done items sink to bottom. "+ New Assignment"
  - **Exams**: list with name, date, days left, status (upcoming/completed). Completed items sink to bottom. "+ New Exam"
- Per-course analytics chart

### 3. Topic Detail Page (`/dashboard/topics/[id]`)
- Collapsible uploads section (file upload support)
- Notes area (markdown editor)
- Key terms section (term + definition pairs, editable)
- Mastery rating buttons (Exposed, Scanning, Hardened, Classified) with confirmation dialog
- Changing mastery auto-updates `lastReviewedAt` to now
- Teach It Back history (last 3–5 attempts with outcome + date)
- Quiz attempt history (recent attempts with question text + correct/incorrect)

### 4. Review Tab (global, on Home Base)
- All topics across all courses, grouped by course
- Default sort: Exposed first, then Scanning, then Hardened (Classified hidden by default)
- Alternative sort: by lastReviewedAt (oldest first, for spaced repetition)
- Shows: topic name, course, mastery badge, last reviewed date
- Filter by course or multiple courses
- Inline mastery update (click → confirm → updates mastery + date)

### 5. Analytics
- Pie chart: mastery distribution (Exposed / Scanning / Hardened / Classified)
- Percentage breakdown
- Filterable by course
- Auto-updates as mastery changes

### 6. Calendar Views
- Week view: all topics/assignments/exams for current week
- Month view: monthly grid
- Color-coded by course
- Shows item type (topic/assignment/exam) and status

---

## UI Theme — Cybersecurity

- Dark mode default (hacker aesthetic)
- Color palette: deep navy/charcoal bg
  - EXPOSED: Red (#ef4444)
  - SCANNING: Amber (#f59e0b)
  - HARDENED: Green (#10b981)
  - CLASSIFIED: Purple (#8b5cf6)
- Monospace accents for course codes / technical elements
- Terminal-inspired card borders (subtle glow effects)
- Mastery icons: Shield-off (Exposed), Radar (Scanning), Shield-check (Hardened), Lock (Classified)

---

## API Documentation

### Approach: Zod Schemas + next-swagger-doc

1. **Zod schemas** define request/response shapes for every endpoint. Used for runtime validation AND OpenAPI spec generation.
2. **next-swagger-doc** reads JSDoc annotations + Zod schemas to produce an OpenAPI 3.0 JSON spec.
3. **swagger-ui-react** renders the spec as interactive Swagger UI at `/api/docs`.
4. Raw spec served at `/api/v1/openapi.json` for agent consumption.

### Example: Annotated Route Handler

```typescript
// src/app/api/v1/courses/route.ts
import { z } from "zod";

const CreateCourseBody = z.object({
  name: z.string().min(1).max(200),
  professorName: z.string().optional(),
  professorEmail: z.string().email().optional(),
  website: z.string().url().optional(),
  courseCode: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCourseBody'
 *     responses:
 *       201:
 *         description: Created course
 */
```

---

## Project Structure

```
cybersecurity-dashboard/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (dark theme, nav)
│   │   ├── page.tsx                      # Landing / redirect to dashboard
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                # Dashboard shell (sidebar nav)
│   │   │   ├── page.tsx                  # Home Base
│   │   │   ├── courses/
│   │   │   │   └── [id]/page.tsx         # Course detail (4 tabs)
│   │   │   └── topics/
│   │   │       └── [id]/page.tsx         # Topic detail (notes, mastery, history)
│   │   └── api/
│   │       ├── docs/page.tsx             # Swagger UI page
│   │       └── v1/
│   │           ├── openapi.json/route.ts # OpenAPI spec endpoint
│   │           ├── auth/
│   │           │   ├── register/route.ts
│   │           │   ├── login/route.ts
│   │           │   └── me/route.ts
│   │           ├── courses/
│   │           │   ├── route.ts          # GET list, POST create
│   │           │   └── [id]/
│   │           │       ├── route.ts      # GET, PATCH, DELETE
│   │           │       ├── batch/route.ts # POST batch import
│   │           │       ├── topics/route.ts
│   │           │       ├── assignments/route.ts
│   │           │       └── exams/route.ts
│   │           ├── topics/
│   │           │   ├── bulk-mastery/route.ts  # PATCH bulk mastery
│   │           │   └── [id]/
│   │           │       ├── route.ts
│   │           │       ├── mastery/route.ts
│   │           │       ├── teach-it-back/route.ts  # POST + GET
│   │           │       └── quiz-attempts/route.ts  # POST + GET
│   │           ├── assignments/[id]/route.ts
│   │           ├── exams/[id]/route.ts
│   │           ├── calendar/route.ts
│   │           ├── review/route.ts
│   │           ├── analytics/route.ts
│   │           └── quiz-attempts/route.ts  # GET by sessionId
│   ├── components/
│   │   ├── ui/                           # shadcn components
│   │   ├── course-card.tsx
│   │   ├── topic-list.tsx
│   │   ├── review-table.tsx
│   │   ├── assignment-list.tsx
│   │   ├── exam-list.tsx
│   │   ├── mastery-badge.tsx
│   │   ├── mastery-selector.tsx
│   │   ├── days-left-badge.tsx
│   │   ├── calendar-view.tsx
│   │   ├── analytics-chart.tsx
│   │   ├── key-terms-editor.tsx
│   │   ├── teach-it-back-history.tsx
│   │   ├── quiz-attempt-history.tsx
│   │   └── welcome-banner.tsx
│   ├── lib/
│   │   ├── prisma.ts                     # Prisma client singleton
│   │   ├── auth.ts                       # NextAuth config
│   │   ├── utils.ts                      # daysLeft calc, date helpers
│   │   ├── api-helpers.ts                # Response envelope builders, auth middleware
│   │   └── schemas/                      # Zod schemas (validation + OpenAPI)
│   │       ├── course.ts
│   │       ├── topic.ts
│   │       ├── assignment.ts
│   │       ├── exam.ts
│   │       ├── teach-it-back.ts
│   │       ├── quiz-attempt.ts
│   │       └── common.ts                 # Error envelope, sort params, etc.
│   └── types/
│       └── index.ts                      # Shared types
├── public/
├── .env.example
├── Dockerfile
├── render.yaml
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Implementation Phases

### Phase 1 — Scaffold & Auth
1. `npx create-next-app@latest` with TypeScript, Tailwind, App Router
2. Install deps: prisma, @prisma/client, next-auth, bcryptjs, shadcn/ui, zod, next-swagger-doc, swagger-ui-react
3. Prisma schema + initial migration (all models including TeachItBack and QuizAttempt)
4. NextAuth setup (credentials provider + JWT)
5. Login / register pages
6. Auth middleware for API routes
7. Root layout with dark theme

### Phase 2 — API Foundation & Docs
8. Zod schemas for all request/response types (in `src/lib/schemas/`)
9. API response envelope helper (`successResponse`, `errorResponse`, `partialSuccessResponse`)
10. Sort param parser utility
11. OpenAPI spec generation route (`/api/v1/openapi.json`)
12. Swagger UI page (`/api/docs`)
13. Verify: Swagger UI loads and shows all documented endpoints

### Phase 3 — Courses CRUD + Batch Import
14. Dashboard home page (course grid)
15. Course card component
16. Create/edit course modal
17. Course detail page with tab navigation
18. API routes: courses CRUD
19. API route: batch import (`POST /api/v1/courses/:id/batch`) with 207 partial success

### Phase 4 — Topics & Mastery System
20. Topics list within course (with date range + mastery filters, sort control)
21. Topic detail page (notes, key terms editor, mastery buttons)
22. Mastery selector with confirmation dialog (Exposed/Scanning/Hardened/Classified)
23. Auto-update lastReviewedAt on mastery change
24. API routes: topics CRUD + single mastery endpoint
25. API route: bulk mastery (`PATCH /api/v1/topics/bulk-mastery`)
26. keyTerms JSON field: included in topic responses by default, editable via PATCH

### Phase 5 — Review System
27. Review tab (global + per-course): sorted by mastery priority or lastReviewedAt
28. Multi-course filtering (`?courseIds=`)
29. Null-first sorting for lastReviewedAt
30. Inline mastery update (click → confirm → updates mastery + date)

### Phase 6 — Study Event Logs
31. Teach It Back: POST endpoint (log session with outcome + notes)
32. Teach It Back: GET endpoint (history with `?limit=` support, default 5)
33. Quiz Attempts: POST endpoint (log attempt with correct, questionText, sessionId)
34. Quiz Attempts: GET per-topic endpoint (history with `?limit=`)
35. Quiz Attempts: GET by sessionId endpoint (`/api/v1/quiz-attempts?sessionId=`)
36. Topic detail page: Teach It Back history section
37. Topic detail page: quiz attempt history section

### Phase 7 — Assignments & Exams
38. Assignments list with computed daysLeft display, sort control
39. Status toggle (Pending → Done), done items sink to bottom
40. Exams list with date, daysLeft, and status (Upcoming/Completed)
41. Exam status toggle (Upcoming → Completed), completed items sink to bottom
42. API routes: assignments + exams CRUD

### Phase 8 — Calendar & Analytics
43. Calendar week view (all items, color-coded by course)
44. Calendar month view
45. Calendar tabs: all, assignments, exams
46. Analytics pie chart (mastery breakdown) using shadcn charts (Recharts)
47. Filter analytics by course
48. API routes: calendar + analytics endpoints

### Phase 9 — Polish & Deploy
49. Welcome banner (customizable message)
50. Responsive design (mobile-friendly)
51. Loading states, error boundaries
52. Seed script with sample cybersecurity courses (e.g., Network Security, Ethical Hacking, Cryptography)
53. Dockerfile + render.yaml
54. .env.example with required vars
55. Final pass: verify all endpoints appear in Swagger UI with correct schemas

---

## Render Deployment Config

```yaml
# render.yaml
services:
  - type: web
    name: cyberstudy-scheduler
    runtime: node
    plan: free
    buildCommand: npm install && npx prisma generate && npx prisma migrate deploy && npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: cyberstudy-db
          property: connectionString
      - key: NEXTAUTH_SECRET
        generateValue: true
      - key: NEXTAUTH_URL
        sync: false

databases:
  - name: cyberstudy-db
    plan: free
```

---

## Verification Plan

1. **Local dev**: `npm run dev` → verify all pages load, CRUD works, mastery updates
2. **API docs**: Visit `/api/docs` → verify Swagger UI loads with all endpoints. Download `/api/v1/openapi.json` → validate well-formed.
3. **API testing**: curl/httpie against all `/api/v1/` endpoints with JWT auth
4. **Batch import**: POST a batch with one intentionally bad item → verify 207 response with partial success + error details
5. **Mastery flow**: Create topic → rate as Scanning → verify lastReviewedAt updates → rate as Hardened → verify it moves down in review list
6. **Bulk mastery**: Update 5 topics at once → verify all get new mastery + individual lastReviewedAt timestamps
7. **Teach It Back**: Log a session → GET history → verify it appears. Confirm mastery did NOT change.
8. **Quiz attempts**: Log 3 attempts with sessionId → GET by sessionId → verify all 3 returned. Confirm mastery did NOT change.
9. **Sort control**: GET review with `?sort=lastReviewedAt:asc` → verify null-first ordering
10. **Date filter**: GET topics with `?date_from=today&date_to=today` → verify only today's topics returned
11. **Cross-course review**: GET review without courseId → verify topics from all courses. GET with `?courseIds=` → verify filtering.
12. **Exam status**: Create exam → verify defaults to Upcoming → toggle to Completed → verify it sinks to bottom
13. **Days left**: Create assignment with various due dates → verify "X days", "tomorrow", "due", "late"
14. **Analytics**: Add topics with mixed mastery → verify pie chart percentages
15. **Calendar**: Add items across courses → verify week/month views show all items
16. **AI agent dry run**: Script a full workflow — create course via batch, log quiz attempts, update mastery, check review — verify end-to-end
17. **Deploy**: Push to GitHub → connect to Render → verify build + migration + app runs

---

## Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| Mastery is never auto-influenced | Agent evaluates nuance; auto-promotion adds noise the agent has to fight |
| Teach It Back + Quiz Attempts are append-only logs | They inform mastery decisions but don't trigger them |
| Batch import uses 207 partial success | A bad date on one topic shouldn't block the entire syllabus import |
| keyTerms is a JSON field, not a separate model | Single-user app; no need to query across terms; avoids extra endpoints |
| No pagination | Single student's data (~40-60 topics) doesn't warrant it |
| No webhooks | Agent is cron-driven, not event-driven; polling is sufficient |
| `lastReviewedAt: null` sorts first | Never-reviewed = highest priority for spaced repetition |
| sessionId on QuizAttempt matches Obsidian filename | Free traceability between API and vault with no mapping layer |
| questionText on QuizAttempt, no answer text | Agent generates questions and has answer keys; needs to know which aspect was missed |
