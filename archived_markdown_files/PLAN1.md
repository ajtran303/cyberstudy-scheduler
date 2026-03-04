# CyberStudy Scheduler — Full Project Plan

## Context

Rebuilding the "Ultimate Study Scheduler" Notion template (by Cajun Koi Academy) as a deployable web application. The user is a cybersecurity student, so the app will be cybersecurity-themed. It must deploy to Render.com and expose a REST API for programmatic access.

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

**Alternatives rejected:**
- *FastAPI + React*: Two services to deploy/manage, no shared types
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
  mastery        Mastery   @default(NONE)
  lastReviewedAt DateTime?
  sortOrder      Int       @default(0)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

enum Mastery {
  NONE     // Red - not reviewed
  ROOKIE   // Yellow - somewhat confident
  RANGER   // Green - very confident
  RETIRED  // Purple - not being tested / mastered
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
  id          String   @id @default(cuid())
  courseId     String
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  name        String
  date        DateTime?
  description String?
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

**Computed fields** (not stored, calculated at query/render time):
- `daysLeft` on assignments/exams: relative to `dueDate` → "X days", "tomorrow", "due", "late"

---

## Feature Map (from video transcript)

### 1. Home Base Dashboard (`/dashboard`)
- Customizable welcome message
- **Courses section**: grid of course cards (name, status, color, professor)
  - Click → opens course detail page
  - "+ New Course" button
- **Calendar section** with tabs:
  - Week view (default)
  - Month view
  - Assignments (all, across courses — shows class, due date, status)
  - Exams (all, across courses)
  - Analytics (pie chart of mastery breakdown)

### 2. Course Detail Page (`/dashboard/courses/[id]`)
- Course header: name, professor, email, website, course code, status toggle
- 4 tabs:
  - **Topics**: list with name, date, details, mastery badge. "+ New Topic" button
  - **Review**: all topics sorted by mastery priority (None → Rookie → Ranger). Shows mastery + last reviewed date. Inline mastery change with confirmation.
  - **Assignments**: list with name, due date, days left (computed), status. Done items sink to bottom. "+ New Assignment"
  - **Exams**: list with name, date, days left. "+ New Exam"
- Per-course analytics chart

### 3. Topic Detail Page (`/dashboard/topics/[id]`)
- Collapsible uploads section (file upload support)
- Notes area (markdown editor)
- Mastery rating buttons (None, Rookie, Ranger, Retired) with confirmation dialog
- Changing mastery auto-updates `lastReviewedAt` to now

### 4. Review Tab (global, on Home Base)
- All topics across all courses, grouped by course
- Sorted: None first, then Rookie, then Ranger (Retired hidden by default)
- Shows: topic name, course, mastery badge, last reviewed date
- Filter by course
- Inline mastery update (click → confirm → updates mastery + date)

### 5. Analytics
- Pie chart: mastery distribution (None / Rookie / Ranger / Retired)
- Percentage breakdown
- Filterable by course
- Auto-updates as mastery changes

### 6. Calendar Views
- Week view: all topics/assignments/exams for current week
- Month view: monthly grid
- Color-coded by course
- Shows item type (topic/assignment/exam)

---

## REST API Design

All endpoints under `/api/v1/`. Auth via Bearer token (JWT from NextAuth).

```
# Auth
POST   /api/v1/auth/register      { email, name, password }
POST   /api/v1/auth/login         { email, password } → { token }
GET    /api/v1/auth/me             → user profile

# Courses
GET    /api/v1/courses                        → list all courses
POST   /api/v1/courses                        → create course
GET    /api/v1/courses/:id                    → get course detail
PATCH  /api/v1/courses/:id                    → update course
DELETE /api/v1/courses/:id                    → delete course

# Topics
GET    /api/v1/courses/:courseId/topics        → list topics
POST   /api/v1/courses/:courseId/topics        → create topic
GET    /api/v1/topics/:id                      → get topic
PATCH  /api/v1/topics/:id                      → update topic
DELETE /api/v1/topics/:id                      → delete topic
PATCH  /api/v1/topics/:id/mastery              → { mastery } → auto-sets lastReviewedAt

# Assignments
GET    /api/v1/courses/:courseId/assignments   → list (includes computed daysLeft)
POST   /api/v1/courses/:courseId/assignments   → create
PATCH  /api/v1/assignments/:id                 → update
DELETE /api/v1/assignments/:id                 → delete

# Exams
GET    /api/v1/courses/:courseId/exams         → list (includes computed daysLeft)
POST   /api/v1/courses/:courseId/exams         → create
PATCH  /api/v1/exams/:id                       → update
DELETE /api/v1/exams/:id                       → delete

# Aggregate views
GET    /api/v1/calendar?view=week|month&date=  → all items for date range
GET    /api/v1/review?courseId=                 → all topics sorted by mastery priority
GET    /api/v1/analytics?courseId=              → mastery breakdown counts + percentages
```

---

## UI Theme — Cybersecurity

- Dark mode default (hacker aesthetic)
- Color palette: deep navy/charcoal bg, electric green (#10b981) for Ranger, amber (#f59e0b) for Rookie, red (#ef4444) for None, purple (#8b5cf6) for Retired
- Monospace accents for course codes / technical elements
- Terminal-inspired card borders (subtle glow effects)
- Shield/lock iconography for mastery levels

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
│   │       └── v1/
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
│   │   └── api-helpers.ts                # Response builders, auth middleware
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
2. Install deps: prisma, @prisma/client, next-auth, bcryptjs, shadcn/ui
3. Prisma schema + initial migration
4. NextAuth setup (credentials provider + JWT)
5. Login / register pages
6. Auth middleware for API routes
7. Root layout with dark theme

### Phase 2 — Courses CRUD
8. Dashboard home page (course grid)
9. Course card component
10. Create/edit course modal
11. Course detail page with tab navigation
12. API routes: courses CRUD

### Phase 3 — Topics & Review System
13. Topics list within course (topics tab)
14. Topic detail page (notes, uploads, mastery buttons)
15. Mastery selector with confirmation dialog
16. Auto-update lastReviewedAt on mastery change
17. Review tab (global + per-course): sorted by mastery priority
18. Filtering by course
19. API routes: topics CRUD + mastery endpoint

### Phase 4 — Assignments & Exams
20. Assignments list with computed daysLeft display
21. Status toggle (Pending → Done), done items sink to bottom
22. Exams list with date and daysLeft
23. API routes: assignments + exams CRUD

### Phase 5 — Calendar & Analytics
24. Calendar week view (all items, color-coded by course)
25. Calendar month view
26. Calendar tabs: all, assignments, exams
27. Analytics pie chart (mastery breakdown) using shadcn charts (Recharts)
28. Filter analytics by course
29. API routes: calendar + analytics endpoints

### Phase 6 — Polish & Deploy
30. Welcome banner (customizable message)
31. Responsive design (mobile-friendly)
32. Loading states, error boundaries
33. Seed script with sample cybersecurity courses (e.g., Network Security, Ethical Hacking, Cryptography)
34. Dockerfile + render.yaml
35. .env.example with required vars

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
2. **API testing**: Use curl/httpie to test all `/api/v1/` endpoints with JWT auth
3. **Mastery flow**: Create topic → rate as Rookie → verify lastReviewedAt updates → rate as Ranger → verify it moves down in review list
4. **Days left**: Create assignment with various due dates → verify "X days", "tomorrow", "due", "late" display correctly
5. **Analytics**: Add topics with mixed mastery → verify pie chart percentages
6. **Calendar**: Add items across courses → verify week/month views show all items
7. **Deploy**: Push to GitHub → connect to Render → verify build + migration + app runs
