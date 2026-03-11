# CyberStudy Scheduler

A personal study tracker built for cybersecurity coursework. Tracks courses, topics, assignments, exams, and study sessions with spaced repetition scheduling and a REST API designed for AI agent integration.

## How It Works

The dashboard gives a single view of what to study and when. Topics move through four mastery tiers — **NOT_STARTED → LEARNING → PROFICIENT → MASTERED** — with promotions only happening through explicit updates, never automatically.

Topics at LEARNING or PROFICIENT participate in **SM-2 spaced repetition**. Each review takes a quality rating (0–5) and schedules the next review date. The daily briefing surfaces what's due, what's coming up, and what to focus on.

An external AI agent connects to the API to run automated study sessions — grading teach-it-back attempts, logging quiz results, and pinging with daily assignments. See [Agent Integration](#agent-integration) below.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Prisma 7** + PostgreSQL
- **NextAuth v5** (credentials + JWT)
- **shadcn/ui** + Tailwind CSS v4
- **Recharts** for analytics
- **Swagger UI** for interactive API docs

## Setup

```bash
npm install
createdb cyberstudy

cp .env.example .env
# Set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

npx prisma migrate dev
npx prisma db seed
npm run dev
```

Runs at [http://localhost:3000](http://localhost:3000). Demo login: `demo@example.com` / `password123`.

## Features

- **Daily Briefing** — "what should I study now?" with SRS reviews due, upcoming deadlines, and topic recommendations
- **Spaced repetition** — SM-2 scheduling for LEARNING/PROFICIENT topics with review forecasting
- **Mastery tracking** — four-tier system with explicit promotion only
- **Review queue** — sort by mastery priority, SRS due date, interleaved (cross-course), or last reviewed
- **Interleaved practice** — round-robin across courses for better long-term retention
- **Study session timer** — floating, minimizable timer visible across all pages
- **Key terms & flashcards** — per-topic term/definition pairs with 3D-flippable card UI, shuffle, and keyboard nav
- **Teach It Back** — append-only log of teach-back attempts (pass/partial/miss) per topic
- **Quiz attempts** — append-only quiz log with session grouping
- **Batch import** — populate a course in one API call with 207 partial-success support
- **Calendar** — week and month views aggregating topics, assignments, and exams
- **Analytics** — mastery distribution charts per course or across all courses

## API

All endpoints live under `/api/v1/` and return a `{ data, error }` envelope. Interactive docs at [/api/docs](http://localhost:3000/api/docs).

### Authentication

Dual-mode: Bearer JWT tokens (for API consumers) and NextAuth sessions (for the browser UI).

```bash
# Get a token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'

# Use it
curl http://localhost:3000/api/v1/courses \
  -H "Authorization: Bearer <token>"
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Get JWT token |
| GET/POST | `/courses` | List / create courses |
| GET/PATCH/DELETE | `/courses/:id` | Course CRUD |
| POST | `/courses/:id/batch` | Batch import topics + assignments + exams |
| GET/POST | `/courses/:id/topics` | List / create topics |
| GET/PATCH/DELETE | `/topics/:id` | Topic CRUD |
| PATCH | `/topics/:id/mastery` | Update mastery level |
| POST | `/topics/:id/review` | Record SRS review (quality 0–5) |
| GET/POST | `/topics/:id/teach-it-back` | Teach-back log |
| GET/POST | `/topics/:id/quiz-attempts` | Quiz attempt log |
| GET | `/daily-briefing` | Daily study assignments: topics by mastery, deadlines, coverage |
| GET | `/review` | Review queue (multiple sort modes) |
| GET | `/review/forecast` | SRS forecast for upcoming reviews |
| GET/POST | `/study-sessions` | Study session tracking |
| GET | `/calendar` | Week/month calendar events |
| GET | `/analytics` | Mastery distribution stats |

## Agent Integration

The API is designed for consumption by an autonomous AI agent. The agent authenticates via `POST /auth/login` with JWT credentials, obtaining a Bearer token for all subsequent requests.

### What the agent reads

- **`GET /daily-briefing`** — primary data source for study assignment pings. Returns topics by mastery (LEARNING → NOT_STARTED, MASTERED excluded) plus upcoming deadlines with coverage descriptions. Called once per ping.
- **`GET /topics/:id/teach-it-back`** — fetches teach-it-back history before selecting a topic for a new session.
- **`GET /quiz-attempts?sessionId=...`** — retrieves quiz attempt history by session for grading context.

### What the agent writes

- **`POST /topics/:id/teach-it-back`** — logs teach-it-back outcomes (PASS / PARTIAL / MISS) with Socratic feedback notes. Triggered after every session grading.
- **`POST /topics/:id/quiz-attempts`** — logs individual question results (correct/incorrect, question text, sessionId) during quiz grading.
- **`PATCH /topics/:id`** — writes key terms (flashcard term/definition pairs) extracted from Obsidian notes. On-demand only, never scheduled.

### What the agent never writes

- **`PATCH /topics/:id/mastery`** — mastery levels are always set manually. The agent reads mastery data but never promotes or demotes topics.

### Workflows

| Workflow | Trigger | Endpoints |
|----------|---------|-----------|
| Daily study ping | Mon–Fri 5:15 PM, Sat 10:30 AM | `GET /daily-briefing` |
| Quiz generation | Daily + weekly crons | none (reads Obsidian only) |
| Quiz grading | On user submission | `POST /topics/:id/quiz-attempts` |
| Teach It Back | After every TIB session | `GET` + `POST /topics/:id/teach-it-back` |
