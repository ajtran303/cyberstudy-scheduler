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
| GET | `/topics/performance-summary` | Per-topic quiz miss rate and TIB history |
| GET/POST | `/topics/:id/teach-it-back` | Teach-back log |
| GET/POST | `/topics/:id/quiz-attempts` | Quiz attempt log |
| POST | `/quiz-attempts/bulk` | Bulk-create quiz attempts for a session |
| GET | `/quiz-attempts?sessionId=...` | Quiz attempts by session |
| GET | `/daily-briefing` | Daily study assignments: topics by mastery, deadlines, coverage |
| GET | `/review` | Review queue (multiple sort modes) |
| GET | `/review/forecast` | SRS forecast for upcoming reviews |
| GET/POST | `/study-sessions` | Study session tracking |
| GET | `/calendar` | Week/month calendar events |
| GET | `/analytics` | Mastery distribution stats |

## Agent Integration

An autonomous AI agent integrates with the API to automate quiz generation, grading, and study tracking. All calls use JWT auth via `POST /auth/login`. Tokens are not cached between sessions.

### Read operations

- **`GET /daily-briefing`** — primary data source for daily study assignment pings. Returns per-course topic priorities (LEARNING → NOT_STARTED, MASTERED excluded) and upcoming deadlines with coverage descriptions. One call per ping session.
- **`GET /topics/performance-summary`** — used by the weekly quiz to weight question emphasis. Returns per-topic quiz miss rate (last 10 attempts) and TIB history (last 30 days). One call replaces 22+ individual topic queries.
- **`GET /review?sort=lastReviewedAt:asc`** — used for Teach It Back topic selection. Returns topics sorted by least-recently-reviewed, with null `lastReviewedAt` (never reviewed) first. Only `lastReviewedAt` reflects actual SRS reviews — PATCH operations do not touch this field.
- **`GET /topics/:id/teach-it-back?limit=5`** — checked before selecting a TIB topic to avoid repeating a recently-passed topic.

### Write operations

- **`POST /quiz-attempts/bulk`** — logs a full quiz session in one request after grading. Contains all question results across topics: `topicId`, `questionText`, `correct`. `sessionId` is set at the top level using the quiz filename convention (`quiz-YYYY-MM-DD-[course]-[daily|weekly]`). Fail-fast: all topic IDs are verified before any writes.
- **`POST /topics/:id/teach-it-back`** — logs a Teach It Back outcome (PASS / PARTIAL / MISS) with full Socratic feedback notes. Called after every TIB session grading.
- **`PATCH /topics/:id`** — writes key terms (flashcard term/definition pairs) extracted from Obsidian notes. On-demand only, never scheduled.

### Never writes

- **`POST /topics/:id/review`** — SRS scheduling is driven exclusively by the dashboard's flashcard review UI. The agent does not call this endpoint. Quiz and TIB performance is tracked through their own endpoints (`/quiz-attempts/bulk`, `/topics/:id/teach-it-back`) and surfaced via `GET /topics/performance-summary`.
- **`PATCH /topics/:id/mastery`** — mastery levels are always set manually. The agent reads mastery data for briefings and topic selection but never writes it.

### Workflows

| Workflow | Trigger | Endpoints |
|----------|---------|-----------|
| Daily study ping | Mon–Fri 5:15 PM, Sat 10:30 AM | `GET /daily-briefing` |
| Quiz generation | Daily + weekly crons | none (reads Obsidian only) |
| Quiz grading | On user submission | `POST /quiz-attempts/bulk` |
| Teach It Back | After every TIB session | `GET /topics/:id/teach-it-back`, `POST /topics/:id/teach-it-back` |
| Key terms sync | On-demand | `PATCH /topics/:id` |
| Performance summary | Weekly (before quiz gen) | `GET /topics/performance-summary` |

### Data boundaries

The agent treats Obsidian as the source of truth for note content and completeness. The API is the source of truth for study performance (mastery, quiz history, TIB outcomes). SRS scheduling is decoupled from agent activity — it is driven solely by flashcard reviews in the dashboard UI, ensuring flashcard due dates are never pushed out by quiz or TIB grading. These two systems are intentionally kept separate — no notes state is stored in the API, and no performance data is stored in Obsidian.
