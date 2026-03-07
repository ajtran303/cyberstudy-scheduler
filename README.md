# CyberStudy Scheduler

A personal dashboard for tracking cybersecurity coursework, topic mastery, assignments, exams, and study sessions. Features spaced repetition scheduling (SM-2), a REST API designed for agentic AI consumption, and a dark-themed UI.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma 7** + PostgreSQL
- **NextAuth v5** (credentials + JWT)
- **shadcn/ui** + Tailwind CSS v4
- **Recharts** for analytics
- **Swagger UI** for API docs

## Data Model

- **Courses** — track status, professor info, color-coded
- **Topics** — per-course with mastery levels and SRS scheduling (see below)
- **Assignments** — due dates with computed `daysLeft`, status tracking
- **Exams** — date-based with status tracking
- **StudySessions** — timed study sessions linked to courses
- **TeachItBack** — append-only log of teach-back attempts (pass/partial/miss)
- **QuizAttempts** — append-only log of quiz questions with session grouping

### Mastery System

Four-tier mastery that never auto-promotes — only explicit PATCH updates:

**EXPOSED** → **SCANNING** → **HARDENED** → **CLASSIFIED**

### Spaced Repetition (SRS)

Topics at SCANNING or HARDENED mastery participate in SM-2 spaced repetition scheduling. Each review records a quality rating (0–5) and computes the next review date, interval, and ease factor. Topics that have never been reviewed or whose `nextReviewAt` has passed are surfaced as due.

## Setup

```bash
# Install dependencies
npm install

# Create the database
createdb cyberstudy

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and NEXTAUTH_SECRET

# Run migrations
npx prisma migrate dev

# Seed sample data (login: sev@example.com / password123)
npx prisma db seed

# Start dev server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## API

All endpoints live under `/api/v1/` and return a `{ data, error }` envelope.

### Authentication

```bash
# Get a Bearer token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sev@example.com","password":"password123"}'

# Use it
curl http://localhost:3000/api/v1/courses \
  -H "Authorization: Bearer <token>"
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Get JWT token |
| GET/POST | `/courses` | List / create courses |
| GET/PATCH/DELETE | `/courses/:id` | Course CRUD |
| POST | `/courses/:id/batch` | Batch import topics + assignments + exams |
| GET/POST | `/courses/:id/topics` | List / create topics (filterable by mastery, date) |
| GET/PATCH/DELETE | `/topics/:id` | Topic CRUD |
| PATCH | `/topics/:id/mastery` | Update mastery level |
| POST | `/topics/:id/review` | Record SRS review (quality 0–5), returns next review date |
| GET/POST | `/topics/:id/teach-it-back` | Teach-back log |
| GET/POST | `/topics/:id/quiz-attempts` | Quiz attempt log |
| GET | `/review` | Review queue (sort: mastery_priority, srs, lastReviewedAt) |
| GET | `/review/forecast` | SRS forecast for upcoming reviews |
| GET/POST | `/study-sessions` | Study session tracking |
| GET | `/calendar` | Week/month calendar events |
| GET | `/today-plan` | Aggregated daily plan: SRS due, deadlines, exam prep |
| GET | `/analytics` | Mastery distribution stats |

Full interactive docs at [/api/docs](http://localhost:3000/api/docs) (Swagger UI).

## Features

- **Today's Plan** — single dashboard tab answering "what should I study now?" with SRS reviews due, upcoming deadlines, and per-exam topic prep
- **Spaced repetition** — SM-2 algorithm schedules reviews for SCANNING/HARDENED topics
- **Mastery tracking** — four-tier system that never auto-promotes; only explicit updates
- **Review queue** — sort by mastery priority, SRS due date, or last reviewed
- **Review forecast** — chart showing upcoming SRS reviews over time
- **Batch import** — populate a course in one call with 207 partial-success support
- **Calendar** — week and month views aggregating topics, assignments, and exams
- **Analytics** — mastery distribution charts per course or across all courses
- **Study sessions** — track timed study sessions with notes per course
- **Flashcards** — study key terms as flippable cards with 3D CSS animations, shuffle, and keyboard navigation
- **Study logs** — append-only TeachItBack and QuizAttempt history per topic
- **Responsive** — mobile-optimized layout with stacked hints on small screens
