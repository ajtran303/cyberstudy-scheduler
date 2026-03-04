# CyberStudy Scheduler

A personal dashboard for tracking cybersecurity coursework, topic mastery, assignments, exams, and study sessions. Features a REST API designed for agentic AI consumption and a dark-themed UI.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma 7** + PostgreSQL
- **NextAuth v5** (credentials + JWT)
- **shadcn/ui** + Tailwind CSS v4
- **Recharts** for analytics
- **Swagger UI** for API docs

## Data Model

- **Courses** — track status, professor info, color-coded
- **Topics** — per-course with mastery levels (Exposed → Scanning → Hardened → Classified)
- **Assignments** — due dates with computed `daysLeft`, status tracking
- **Exams** — date-based with status tracking
- **TeachItBack** — append-only log of teach-back attempts (pass/partial/miss)
- **QuizAttempts** — append-only log of quiz questions with session grouping

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
| PATCH | `/topics/bulk-mastery` | Bulk mastery update |
| GET/POST | `/topics/:id/teach-it-back` | Teach-back log |
| GET/POST | `/topics/:id/quiz-attempts` | Quiz attempt log |
| GET | `/review` | Mastery-priority review queue |
| GET | `/calendar` | Week/month calendar events |
| GET | `/analytics` | Mastery distribution stats |

Full interactive docs at [/api/docs](http://localhost:3000/api/docs) (Swagger UI).

## Features

- **Mastery tracking** — four-tier system that never auto-promotes; only explicit updates
- **Review queue** — surfaces least-mastered and least-recently-reviewed topics first
- **Batch import** — populate a course in one call with 207 partial-success support
- **Calendar** — week and month views aggregating topics, assignments, and exams
- **Analytics** — mastery distribution pie chart per course or across all courses
- **Study logs** — append-only TeachItBack and QuizAttempt history per topic
- **Days left** — computed countdown on assignments and exams
