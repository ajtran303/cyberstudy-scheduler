# CyberStudy Scheduler — Full Project Plan (v2)

## Context

Rebuilding the "Ultimate Study Scheduler" Notion template (by Cajun Koi Academy) as a deployable web application. This is a personal tool for tracking progress through a cybersecurity degree program. It must deploy to Render.com and expose a documented REST API for programmatic access — the API will be consumed by an agentic AI to automate updates (e.g., logging study sessions, updating mastery levels, creating assignments from syllabi).

---

## Tech Stack & Justification

### **Next.js 14 (App Router) + PostgreSQL + Prisma + shadcn/ui + NextAuth.js**

| Choice | Why |
|--------|-----|
| **Next.js (App Router)** | Full-stack in one codebase. Route Handlers serve as both the frontend data layer AND the public REST API. Single Render service to deploy. Server Components for fast dashboard loads. |
| **TypeScript** | Type safety from database schema (Prisma) through API to UI. Shared types everywhere. |
| **PostgreSQL** | Render offers managed Postgres (free tier). Relational model fits perfectly: users → courses → topics/assignments/exams. |
| **Prisma** | Type-safe ORM, migrations, seeding. Schema-first approach keeps DB and app in sync. |
| **shadcn/ui + Tailwind** | Notion-like clean aesthetic. Accessible Radix primitives. Built-in chart components (for analytics pie chart). Dark mode support fits cybersecurity theme. |
| **NextAuth.js (Auth.js v5)** | Session-based auth with credentials provider. Extensible if OAuth needed later. |
| **next-swagger-doc + swagger-ui-react** | Auto-generated OpenAPI spec from JSDoc annotations on route handlers. Serves Swagger UI at `/api/docs` for human browsing and `/api/v1/openapi.json` for AI agent consumption. |
| **Zod** | Runtime request validation on every API route. Schemas double as the source of truth for OpenAPI spec generation. |

**Alternatives rejected:**
- *FastAPI + React*: Two services to deploy/manage, no shared types. FastAPI's auto-docs are great but not worth the operational overhead for a solo project.
- *SvelteKit*: Smaller component ecosystem, fewer chart libraries
- *Django*: Heavier, less ideal for real-time dashboard UX

---

## Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // bcrypt hashed
  courses   Course[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

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
  color          String        @default("#6366f1") // indigo
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

model Topic {
  id             String   @id @default(cuid())
  courseId        String
  course         Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  name           String
  date           DateTime? // planned study date
  details        String?   // quick notes (visible in list)
  notes          String?   // full notes (markdown)
  mastery        Mastery   @default(EXPOSED)
  lastReviewedAt DateTime?
  sortOrder      Int       @default(0)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

enum Mastery {
  EXPOSED      // Red    - not reviewed; an open vulnerability in your knowledge
  SCANNING     // Yellow - actively learning; doing recon on the material
  HARDENED     // Green  - confident; this topic is locked down
  CLASSIFIED   // Purple - fully mastered / not being tested; filed away in the vault
}

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
```

**Computed fields** (not stored, calculated at query/render time):
- `daysLeft` on assignments/exams: relative to `dueDate`/`date` → "X days", "tomorrow", "due", "late"

---

## Mastery Levels — Cyber-Themed

The mastery system uses cybersecurity terminology instead of generic labels. Three naming options were considered:

| Level | Option A (chosen) | Option B | Option C |
|-------|-------------------|----------|----------|
| Not reviewed (red) | **EXPOSED** | VULNERABLE | CRITICAL |
| Learning (yellow) | **SCANNING** | PATCHED | RECON |
| Confident (green) | **HARDENED** | FORTIFIED | SECURED |
| Mastered/retired (purple) | **CLASSIFIED** | ARCHIVED | DECOMMED |

**Option A rationale** — maps to a security lifecycle narrative:
1. **EXPOSED** — Like an unpatched CVE. You haven't touched this topic; it's a gap in your defenses.
2. **SCANNING** — You're running recon. You've started studying but aren't confident yet.
3. **HARDENED** — The system is patched and secured. You know this material well.
4. **CLASSIFIED** — Top-secret, filed away. Fully mastered or no longer on an upcoming exam.

Colors: Red (#ef4444) → Amber (#f59e0b) → Green (#10b981) → Purple (#8b5cf6)

Icon suggestions: Shield-off → Radar → Shield-check → Lock/Vault

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
- Mastery rating buttons (Exposed, Scanning, Hardened, Classified) with confirmation dialog
- Changing mastery auto-updates `lastReviewedAt` to now

### 4. Review Tab (global, on Home Base)
- All topics across all courses, grouped by course
- Sorted: Exposed first, then Scanning, then Hardened (Classified hidden by default)
- Shows: topic name, course, mastery badge, last reviewed date
- Filter by course
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

## REST API Design

All endpoints under `/api/v1/`. Auth via Bearer token (JWT from NextAuth).

Every endpoint returns consistent JSON envelope:
```json
{
  "data": { ... },
  "error": null
}
```

On error:
```json
{
  "data": null,
  "error": { "code": "NOT_FOUND", "message": "Course not found" }
}
```

This consistent shape makes it easy for an AI agent to parse responses programmatically.

### Endpoints

```
# Auth
POST   /api/v1/auth/register      { email, name, password }
POST   /api/v1/auth/login         { email, password } → { token }
GET    /api/v1/auth/me             → user profile

# Courses
GET    /api/v1/courses                        → list all courses
POST   /api/v1/courses                        → create course
GET    /api/v1/courses/:id                    → get course detail (includes topic/assignment/exam counts)
PATCH  /api/v1/courses/:id                    → update course
DELETE /api/v1/courses/:id                    → delete course + all children

# Topics
GET    /api/v1/courses/:courseId/topics        → list topics (supports ?mastery= filter)
POST   /api/v1/courses/:courseId/topics        → create topic
GET    /api/v1/topics/:id                      → get topic detail
PATCH  /api/v1/topics/:id                      → update topic
DELETE /api/v1/topics/:id                      → delete topic
PATCH  /api/v1/topics/:id/mastery              → { mastery } → auto-sets lastReviewedAt

# Assignments
GET    /api/v1/courses/:courseId/assignments   → list (includes computed daysLeft, supports ?status= filter)
POST   /api/v1/courses/:courseId/assignments   → create
PATCH  /api/v1/assignments/:id                 → update
DELETE /api/v1/assignments/:id                 → delete

# Exams
GET    /api/v1/courses/:courseId/exams         → list (includes computed daysLeft, supports ?status= filter)
POST   /api/v1/courses/:courseId/exams         → create
PATCH  /api/v1/exams/:id                       → update (including status: upcoming/completed)
DELETE /api/v1/exams/:id                       → delete

# Aggregate views
GET    /api/v1/calendar?view=week|month&date=  → all items for date range
GET    /api/v1/review?courseId=                 → all topics sorted by mastery priority
GET    /api/v1/analytics?courseId=              → mastery breakdown counts + percentages

# Documentation
GET    /api/docs                               → Swagger UI (interactive)
GET    /api/v1/openapi.json                    → OpenAPI 3.0 spec (for AI agent consumption)
```

---

## API Documentation

### Approach: Zod Schemas + next-swagger-doc

Since Next.js doesn't have built-in API docs like FastAPI, we generate them:

1. **Zod schemas** define request/response shapes for every endpoint. These are used for runtime validation AND OpenAPI spec generation.
2. **next-swagger-doc** reads JSDoc annotations + Zod schemas to produce an OpenAPI 3.0 JSON spec.
3. **swagger-ui-react** renders the spec as an interactive Swagger UI page at `/api/docs`.
4. The raw spec is served at `/api/v1/openapi.json` so an AI agent can fetch and parse it.

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

const CourseResponse = z.object({
  id: z.string(),
  name: z.string(),
  professorName: z.string().nullable(),
  professorEmail: z.string().nullable(),
  website: z.string().nullable(),
  courseCode: z.string().nullable(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
  color: z.string(),
  sortOrder: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: List all courses
 *     tags: [Courses]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of courses
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

### Documentation Page

```typescript
// src/app/api/docs/page.tsx
"use client";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocsPage() {
  return <SwaggerUI url="/api/v1/openapi.json" />;
}
```

### AI Agent Workflow

An agentic AI can:
1. `GET /api/v1/openapi.json` → parse available endpoints, schemas, and auth requirements
2. `POST /api/v1/auth/login` → obtain a Bearer token
3. Use any endpoint with structured JSON — the consistent error envelope means the agent always knows where to find error details
4. Example agent tasks:
   - Parse a syllabus PDF → `POST /api/v1/courses` + batch `POST` topics/assignments/exams
   - After a study session → `PATCH /api/v1/topics/:id/mastery` with updated mastery level
   - Daily briefing → `GET /api/v1/review` + `GET /api/v1/calendar?view=week` to summarize what's due

---

## UI Theme — Cybersecurity

- Dark mode default (hacker aesthetic)
- Color palette: deep navy/charcoal bg, electric green (#10b981) for Hardened, amber (#f59e0b) for Scanning, red (#ef4444) for Exposed, purple (#8b5cf6) for Classified
- Monospace accents for course codes / technical elements
- Terminal-inspired card borders (subtle glow effects)
- Mastery icons: Shield-off (Exposed), Radar (Scanning), Shield-check (Hardened), Lock (Classified)

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
│   │   │       └── [id]/page.tsx         # Topic detail (notes, mastery)
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
│   │           │       ├── topics/route.ts
│   │           │       ├── assignments/route.ts
│   │           │       └── exams/route.ts
│   │           ├── topics/
│   │           │   └── [id]/
│   │           │       ├── route.ts
│   │           │       └── mastery/route.ts
│   │           ├── assignments/[id]/route.ts
│   │           ├── exams/[id]/route.ts
│   │           ├── calendar/route.ts
│   │           ├── review/route.ts
│   │           └── analytics/route.ts
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
│   │   └── welcome-banner.tsx
│   ├── lib/
│   │   ├── prisma.ts                     # Prisma client singleton
│   │   ├── auth.ts                       # NextAuth config
│   │   ├── utils.ts                      # daysLeft calc, date helpers
│   │   ├── api-helpers.ts                # Response builders, auth middleware
│   │   └── schemas/                      # Zod schemas (shared: validation + OpenAPI)
│   │       ├── course.ts
│   │       ├── topic.ts
│   │       ├── assignment.ts
│   │       ├── exam.ts
│   │       └── common.ts                 # Error envelope, pagination, etc.
│   └── types/
│       └── index.ts                      # Shared types
├── public/
├── .env.example
├── Dockerfile                            # For Render deployment
├── render.yaml                           # Render blueprint
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
3. Prisma schema + initial migration
4. NextAuth setup (credentials provider + JWT)
5. Login / register pages
6. Auth middleware for API routes
7. Root layout with dark theme

### Phase 2 — API Foundation & Docs
8. Zod schemas for all request/response types (in `src/lib/schemas/`)
9. API response envelope helper (`successResponse`, `errorResponse`)
10. OpenAPI spec generation route (`/api/v1/openapi.json`)
11. Swagger UI page (`/api/docs`)
12. Verify: Swagger UI loads and shows all documented endpoints

### Phase 3 — Courses CRUD
13. Dashboard home page (course grid)
14. Course card component
15. Create/edit course modal
16. Course detail page with tab navigation
17. API routes: courses CRUD (with Zod validation + JSDoc annotations)

### Phase 4 — Topics & Review System
18. Topics list within course (topics tab)
19. Topic detail page (notes, uploads, mastery buttons)
20. Mastery selector with confirmation dialog (Exposed/Scanning/Hardened/Classified)
21. Auto-update lastReviewedAt on mastery change
22. Review tab (global + per-course): sorted by mastery priority
23. Filtering by course
24. API routes: topics CRUD + mastery endpoint

### Phase 5 — Assignments & Exams
25. Assignments list with computed daysLeft display
26. Status toggle (Pending → Done), done items sink to bottom
27. Exams list with date, daysLeft, and status (Upcoming/Completed)
28. Exam status toggle (Upcoming → Completed), completed items sink to bottom
29. API routes: assignments + exams CRUD (exams include status field)

### Phase 6 — Calendar & Analytics
30. Calendar week view (all items, color-coded by course)
31. Calendar month view
32. Calendar tabs: all, assignments, exams
33. Analytics pie chart (mastery breakdown) using shadcn charts (Recharts)
34. Filter analytics by course
35. API routes: calendar + analytics endpoints

### Phase 7 — Polish & Deploy
36. Welcome banner (customizable message)
37. Responsive design (mobile-friendly)
38. Loading states, error boundaries
39. Seed script with sample cybersecurity courses (e.g., Network Security, Ethical Hacking, Cryptography)
40. Dockerfile + render.yaml
41. .env.example with required vars
42. Final pass: verify all endpoints appear in Swagger UI with correct schemas

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
2. **API docs**: Visit `/api/docs` → verify Swagger UI loads with all endpoints. Download `/api/v1/openapi.json` → validate it's well-formed.
3. **API testing**: Use curl/httpie to test all `/api/v1/` endpoints with JWT auth
4. **Mastery flow**: Create topic → rate as Scanning → verify lastReviewedAt updates → rate as Hardened → verify it moves down in review list
5. **Exam status**: Create exam → verify defaults to Upcoming → toggle to Completed → verify it sinks to bottom of list
6. **Days left**: Create assignment with various due dates → verify "X days", "tomorrow", "due", "late" display correctly
7. **Analytics**: Add topics with mixed mastery → verify pie chart percentages
8. **Calendar**: Add items across courses → verify week/month views show all items
9. **AI agent dry run**: Use the OpenAPI spec to script a programmatic workflow — create course, add topics, update mastery — verify the consistent JSON envelope works end-to-end
10. **Deploy**: Push to GitHub → connect to Render → verify build + migration + app runs
