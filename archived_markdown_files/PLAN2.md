# Study Scheduler — Web Application Spec

## 1. Overview

A web application that recreates the "Ultimate Study Scheduler" (originally a Notion template) as a standalone, deployable web app with a REST API. The app helps students organize courses, track topics with confidence-based mastery levels, manage assignments/exams with due-date countdowns, and visualize progress through analytics.

---

## 2. Technology Stack & Justification

### Backend: **Python + FastAPI**

| Reason | Detail |
|--------|--------|
| **Auto-generated API docs** | FastAPI produces Swagger UI (`/docs`) and ReDoc (`/redoc`) out of the box — fulfills the "API with documentation" requirement with zero extra work. |
| **Type safety** | Pydantic models give request/response validation, serialization, and schema generation for free. |
| **Async-first** | Native `async/await` support for non-blocking database calls. |
| **Render.com deployment** | Render has first-class support for Python web services via `gunicorn`/`uvicorn`. A single `render.yaml` blueprint can define the web service + database. |
| **Ecosystem** | SQLAlchemy 2.0 (async), Alembic for migrations, mature and battle-tested. |

### Database: **PostgreSQL**

| Reason | Detail |
|--------|--------|
| **Relational fit** | The data model is inherently relational: courses → topics/assignments/exams, users → courses. |
| **Render-native** | Render offers managed PostgreSQL instances that can be linked to services in the same blueprint. |
| **JSON support** | `jsonb` columns available if we ever need semi-structured data (e.g., notes). |

### ORM / Migrations: **SQLAlchemy 2.0 + Alembic**

- Modern async session support.
- Alembic handles schema migrations declaratively.

### Frontend: **React (Vite) + TypeScript**

| Reason | Detail |
|--------|--------|
| **Component model** | The UI is naturally composed of reusable components (course cards, topic rows, calendar cells, chart widgets). |
| **Ecosystem** | Vast library support — `react-big-calendar` for calendar views, `recharts` or `chart.js` for analytics pie charts. |
| **Vite** | Fast dev server, optimized production builds, outputs a static bundle that Render can serve as a Static Site. |
| **TypeScript** | Catches bugs early; API types can be generated from the OpenAPI spec. |

### Deployment Architecture (Render.com)

```
┌──────────────────────────────────────────────┐
│                render.yaml                    │
├──────────────┬───────────────┬───────────────┤
│ Static Site  │ Web Service   │ PostgreSQL    │
│ (React SPA)  │ (FastAPI)     │ (Managed DB)  │
│ /            │ /api/*        │               │
└──────────────┴───────────────┴───────────────┘
```

- **Static Site**: serves the built React app.
- **Web Service**: runs `uvicorn` with the FastAPI app.
- **PostgreSQL**: managed database instance.

---

## 3. Data Model

### 3.1 Users

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `email` | VARCHAR(255) | Unique, indexed |
| `password_hash` | VARCHAR(255) | bcrypt |
| `display_name` | VARCHAR(100) | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 3.2 Courses

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → Users |
| `name` | VARCHAR(200) | e.g., "Physics 101" |
| `instructor` | VARCHAR(200) | Nullable |
| `instructor_email` | VARCHAR(255) | Nullable |
| `website` | VARCHAR(500) | Nullable |
| `course_code` | VARCHAR(50) | Nullable |
| `status` | ENUM | `not_started`, `in_progress`, `completed` |
| `color` | VARCHAR(7) | Hex color for calendar/UI |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 3.3 Topics

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `course_id` | UUID | FK → Courses |
| `title` | VARCHAR(300) | e.g., "Forces" |
| `date` | DATE | Scheduled lecture/study date |
| `details` | TEXT | Quick notes |
| `mastery` | ENUM | `none`, `rookie`, `ranger`, `retired` |
| `last_reviewed` | TIMESTAMPTZ | Auto-set when mastery changes |
| `sort_order` | INT | For manual ordering |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 3.4 Assignments

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `course_id` | UUID | FK → Courses |
| `title` | VARCHAR(300) | e.g., "Problem Set 1" |
| `due_date` | DATE | |
| `status` | ENUM | `pending`, `done` |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Computed field** (API-level, not stored): `days_left` — calculated from `due_date` vs. current date. Returns a string: "X days", "Tomorrow", "Due today", or "Late".

### 3.5 Exams

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `course_id` | UUID | FK → Courses |
| `title` | VARCHAR(300) | e.g., "Midterm" |
| `date` | DATE | |
| `status` | ENUM | `upcoming`, `completed` |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Computed field**: `days_left` — same logic as Assignments.

### ER Diagram

```
User 1──* Course 1──* Topic
                  1──* Assignment
                  1──* Exam
```

---

## 4. API Design

Base URL: `/api/v1`

All endpoints require authentication (Bearer token) except auth endpoints.

### 4.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account (email, password, display_name) |
| POST | `/auth/login` | Returns JWT access + refresh tokens |
| POST | `/auth/refresh` | Refresh access token |

### 4.2 Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses` | List all courses for current user |
| POST | `/courses` | Create a course |
| GET | `/courses/{id}` | Get course detail |
| PATCH | `/courses/{id}` | Update course (name, status, etc.) |
| DELETE | `/courses/{id}` | Delete course and all children |

### 4.3 Topics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses/{course_id}/topics` | List topics (supports `?mastery=` filter) |
| POST | `/courses/{course_id}/topics` | Create topic |
| GET | `/topics/{id}` | Get topic detail |
| PATCH | `/topics/{id}` | Update topic |
| PATCH | `/topics/{id}/mastery` | Set mastery level (auto-updates `last_reviewed`) |
| DELETE | `/topics/{id}` | Delete topic |

### 4.4 Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses/{course_id}/assignments` | List assignments (supports `?status=` filter) |
| POST | `/courses/{course_id}/assignments` | Create assignment |
| GET | `/assignments/{id}` | Get assignment detail |
| PATCH | `/assignments/{id}` | Update assignment |
| DELETE | `/assignments/{id}` | Delete assignment |

### 4.5 Exams

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses/{course_id}/exams` | List exams |
| POST | `/courses/{course_id}/exams` | Create exam |
| GET | `/exams/{id}` | Get exam detail |
| PATCH | `/exams/{id}` | Update exam |
| DELETE | `/exams/{id}` | Delete exam |

### 4.6 Calendar

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/calendar` | Aggregated calendar events (topics + assignments + exams). Supports `?start=&end=&course_id=` filters. Returns unified event objects with `type`, `title`, `date`, `course_name`, `course_color`. |

### 4.7 Review

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/review` | All topics grouped by mastery level. Supports `?course_id=` filter. Each topic includes `last_reviewed` and `course_name`. |

### 4.8 Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics` | Mastery distribution across all topics. Supports `?course_id=` filter. Returns `{ total, none_count, rookie_count, ranger_count, retired_count, none_pct, rookie_pct, ranger_pct, retired_pct }`. |

### API Documentation

- **Swagger UI** auto-served at `/docs`
- **ReDoc** auto-served at `/redoc`
- **OpenAPI JSON** at `/openapi.json`

---

## 5. Frontend Pages & Components

### 5.1 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Email/password login |
| `/register` | Register | Account creation |
| `/` | Dashboard (Home Base) | Welcome message, course cards, calendar, review tab, analytics tab |
| `/courses/:id` | Course Detail | Topics list, assignments list, exams list (as tabs). Per-course review table and analytics. |
| `/courses/:id/topics/:id` | Topic Detail | Full topic view with notes area, mastery buttons, uploads area |

### 5.2 Key Components

**Dashboard**
- `WelcomeHeader` — Customizable welcome message (stored in localStorage or user settings).
- `CourseCardGrid` — Grid of course cards showing name, code, instructor, status. "+ New Course" card.
- `CalendarView` — Tabbed: Week | Month | Assignments | Exams. Uses `react-big-calendar` or similar.
- `ReviewTable` — Tabbed or toggled per-course. Topics grouped by mastery (None → Rookie → Ranger → Retired). Each row: topic title, course name, last reviewed date. Inline mastery change buttons.
- `AnalyticsPanel` — Pie chart (recharts/chart.js) showing mastery distribution. Filterable by course.

**Course Detail**
- `CourseHeader` — Banner, icon, name, instructor info, status toggle.
- `TopicsList` — Table/list view. Columns: title, date, mastery badge, last reviewed. Click to open.
- `AssignmentsList` — Table view. Columns: title, due date, days left (color-coded), status toggle.
- `ExamsList` — Table view. Columns: title, date, days left.
- Per-course `ReviewTable` and `AnalyticsPanel` (same components, filtered).

**Topic Detail**
- `MasterySelector` — Stoplight buttons: None (red), Rookie (yellow), Ranger (green), Retired (purple). Confirmation dialog on click. Sets mastery and auto-updates `last_reviewed`.
- `NotesEditor` — Simple rich-text or markdown editor for topic notes.
- `UploadsSection` — File upload area (files stored on Render disk or S3-compatible storage).

### 5.3 Design Principles

- **Wabi-sabi / Simplicity**: Clean, minimal UI. No clutter. Only essential features visible.
- **Stoplight mastery colors**: Red (#EF4444), Yellow (#EAB308), Green (#22C55E), Purple (#A855F7).
- **Responsive**: Works on desktop and mobile.
- **Dark/light mode**: User preference.

---

## 6. Core Feature Logic

### 6.1 Mastery & Review System

This is the most important feature. When a user sets a topic's mastery level:

1. A confirmation dialog appears ("Set mastery to Rookie?").
2. On confirm, the API call `PATCH /topics/{id}/mastery` is made with `{ mastery: "rookie" }`.
3. The backend sets `mastery` and `last_reviewed = now()`.
4. The review table re-sorts: topics are grouped by mastery level (None at top, Retired at bottom).
5. Within each mastery group, topics are sorted by `last_reviewed` ascending (oldest first = review next).

### 6.2 Days Left Calculation

Computed at the API level on every read:

```python
def days_left(due_date: date) -> str:
    delta = (due_date - date.today()).days
    if delta < 0:
        return "Late"
    elif delta == 0:
        return "Due today"
    elif delta == 1:
        return "Tomorrow"
    else:
        return f"{delta} days"
```

### 6.3 Calendar Aggregation

The `/calendar` endpoint merges topics, assignments, and exams into a unified event list:

```json
{
  "events": [
    {
      "id": "uuid",
      "type": "topic",
      "title": "Forces",
      "date": "2026-03-05",
      "course_name": "Physics 101",
      "course_color": "#3B82F6"
    }
  ]
}
```

### 6.4 Analytics

The `/analytics` endpoint returns:

```json
{
  "total": 24,
  "none": { "count": 8, "percentage": 33.3 },
  "rookie": { "count": 10, "percentage": 41.7 },
  "ranger": { "count": 4, "percentage": 16.7 },
  "retired": { "count": 2, "percentage": 8.3 }
}
```

Displayed as a pie chart on the frontend.

---

## 7. Authentication & Authorization

- **JWT-based auth** with short-lived access tokens (15 min) and longer-lived refresh tokens (7 days).
- Refresh tokens stored in `httpOnly` cookies; access tokens in memory.
- All data is scoped to the authenticated user. Every query filters by `user_id`.
- Passwords hashed with **bcrypt**.

---

## 8. Project Structure

```
study-scheduler/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, lifespan
│   │   ├── config.py            # Settings (DB URL, JWT secret, etc.)
│   │   ├── database.py          # Async SQLAlchemy engine + session
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── course.py
│   │   │   ├── topic.py
│   │   │   ├── assignment.py
│   │   │   └── exam.py
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   │   ├── user.py
│   │   │   ├── course.py
│   │   │   ├── topic.py
│   │   │   ├── assignment.py
│   │   │   ├── exam.py
│   │   │   ├── calendar.py
│   │   │   └── analytics.py
│   │   ├── routers/             # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── courses.py
│   │   │   ├── topics.py
│   │   │   ├── assignments.py
│   │   │   ├── exams.py
│   │   │   ├── calendar.py
│   │   │   ├── review.py
│   │   │   └── analytics.py
│   │   ├── services/            # Business logic
│   │   │   ├── auth.py
│   │   │   └── mastery.py
│   │   └── middleware/
│   │       └── auth.py          # JWT dependency
│   ├── alembic/                 # Database migrations
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                 # API client (auto-generated from OpenAPI or manual)
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Route-level page components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── stores/              # State management (Zustand or Context)
│   │   ├── types/               # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── render.yaml                  # Render blueprint
└── README.md
```

---

## 9. Render.com Deployment Blueprint

```yaml
# render.yaml
databases:
  - name: study-scheduler-db
    plan: free
    databaseName: study_scheduler

services:
  - type: web
    name: study-scheduler-api
    runtime: python
    buildCommand: pip install -r backend/requirements.txt
    startCommand: cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: study-scheduler-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true

  - type: web
    name: study-scheduler-frontend
    runtime: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

---

## 10. Development Phases

### Phase 1 — Foundation
- Project scaffolding (backend + frontend)
- Database models + migrations
- Auth endpoints (register, login, refresh)
- Basic CORS + JWT middleware

### Phase 2 — Core CRUD
- Courses CRUD API + UI (course cards, create/edit/delete)
- Topics CRUD API + UI (list, detail, notes)
- Assignments CRUD API + UI
- Exams CRUD API + UI

### Phase 3 — Smart Features
- Mastery system (mastery selector, auto-update last_reviewed, confirmation dialog)
- Review table (grouped by mastery, sorted by last_reviewed, filterable by course)
- Days-left computation for assignments and exams
- Calendar aggregation endpoint + calendar UI (week/month views)

### Phase 4 — Analytics & Polish
- Analytics endpoint + pie chart UI
- Per-course filtering across review and analytics
- Dark/light mode
- Responsive design pass
- Error handling + loading states

### Phase 5 — Deploy
- Dockerfiles for both services
- `render.yaml` blueprint
- Environment variable configuration
- Alembic migration on deploy
- Smoke tests

---

## 11. Key Dependencies

### Backend
| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `sqlalchemy[asyncio]` | Async ORM |
| `asyncpg` | PostgreSQL async driver |
| `alembic` | Migrations |
| `pydantic` | Data validation |
| `python-jose` | JWT handling |
| `passlib[bcrypt]` | Password hashing |

### Frontend
| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `recharts` | Pie charts for analytics |
| `react-big-calendar` | Calendar views |
| `zustand` | Lightweight state management |
| `axios` | HTTP client |
| `tailwindcss` | Utility-first CSS |
