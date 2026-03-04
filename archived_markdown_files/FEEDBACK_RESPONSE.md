# FEEDBACK_RESPONSE.md — CyberStudy Scheduler API
**From:** Hex (study agent)
**Date:** 2026-03-03
**Context:** Reviewing this API from the perspective of an agentic AI that will actually call it — given our existing study infrastructure launching March 9th.

---

## How Our Setup Maps to This API

Before getting into the feedback questions, here's the honest picture of what I'm already doing and where this API would (or wouldn't) fit in:

**What we already have:**
- Obsidian vault as the source of truth: `StudyNotes/`, `Quizzes/`, `Syllabuses/`
- Cron-driven workflows: midnight note scan → daily quiz at 5:30 PM → Teach It Back at 9:30 PM
- Quiz answer keys stored in `memory/quiz-keys/`
- Weekly memory distillation (Sunday 10:30 PM) writes long-term summaries to `MEMORY.md`
- Mastery/gap tracking happens implicitly via quiz misses and scan-log analysis

This API would sit *alongside* that system, not replace it. I'd use it primarily as a structured mastery tracker and pre-exam readiness checker — the calendar and analytics endpoints are the most immediately useful to me.

---

## Feedback on the Feedback Questions

### 1. Batch operations
**Yes, needed.** Syllabus onboarding is the one workflow where I'd be making 20–40 sequential POSTs. A batch endpoint would make that atomic and much faster. Suggested shape:

```json
POST /api/v1/courses/:id/batch
{
  "topics": [ { "name": "...", "date": "..." } ],
  "assignments": [ { "name": "...", "dueDate": "..." } ],
  "exams": [ { "name": "...", "date": "..." } ]
}
```

Return value should include created IDs for all children so I can reference them immediately without follow-up GETs. Also: if one item in the batch fails validation, I'd want partial success with an `errors` array rather than a full rollback — otherwise a single bad date string blocks the whole syllabus import.

### 2. Search / filtering
`?mastery=EXPOSED` is sufficient for the mastery workflow. But I'd want `?date_from=&date_to=` on the topics list — the midnight scan looks at *what was covered that day*, so filtering by topic date is something I'd do nightly. Full-text search is nice-to-have but not blocking.

### 3. Sorting
Yes, I need sort control. Specifically:
- `?sort=date:asc` on topics (to follow the syllabus in order)
- `?sort=lastReviewedAt:asc` on the review endpoint (oldest-reviewed first for spaced repetition)
- `?sort=dueDate:asc` on assignments

The review endpoint's current mastery-priority sort is correct for pre-exam mode, but spaced repetition needs a time dimension.

### 4. Pagination
For a single student's data, returning everything is fine. One student across two courses with ~40–60 topics total is not a dataset that needs pagination. Skip it for now, add it later if needed.

### 5. Bulk mastery update
**Yes, needed.** After grading a quiz, I'd be updating multiple topics at once based on which questions were missed. Without bulk update, that's one PATCH per missed topic — could be 5–10 calls per quiz session. Suggested shape:

```json
PATCH /api/v1/topics/bulk-mastery
{
  "updates": [
    { "id": "abc", "mastery": "SCANNING" },
    { "id": "def", "mastery": "EXPOSED" }
  ]
}
```

Allowing per-topic mastery (not a single level for all) is important — a quiz covers multiple topics at different confidence levels.

### 6. Webhooks / event notifications
Not needed. I'm cron-driven, not event-driven. I already know when assignments are due because I process the calendar on a schedule. Polling the calendar endpoint is fine.

### 7. Notes on topics — markdown vs. structured data
Plain markdown is fine for *reading* notes, but I'd get more value from structured data when *writing*. Specifically, if topics had an optional `keyTerms` array (term + definition pairs), I could generate better quiz questions without parsing free-form markdown. Something like:

```json
"keyTerms": [
  { "term": "ARP", "definition": "Maps IP addresses to MAC addresses on a local network" }
]
```

This doesn't need to replace the markdown `notes` field — just augment it. The markdown is good for Sev's own review; the structured terms are good for me.

### 8. Missing endpoints

**Teach It Back — no equivalent exists.** This is a core part of our workflow: I prompt Sev to explain a concept, they respond, I grade the explanation and give Socratic feedback. There's no way to log that this happened or what concept was covered. I'd want:
```
POST /api/v1/topics/:id/teach-it-back
{ "attemptedAt": "...", "outcome": "pass" | "partial" | "miss", "notes": "..." }
```
This would feed directly into spaced repetition logic and weak-area tracking.

**Quiz session tracking.** Right now I save quiz files to Obsidian and answer keys to `memory/quiz-keys/`. If this API tracked quiz attempts per topic (which questions were missed, how many attempts before correct), I could replace my flat-file grading system with something queryable. A `POST /api/v1/topics/:id/quiz-attempt` with `{ correct: true/false }` would be enough to start.

**Cross-course review.** The `/review` endpoint takes an optional `courseId`. For the Saturday weekly quiz, I need topics across both CIST 1001 and CIST 1122 sorted by mastery priority together. Either make `courseId` optional (return all courses) or add a `?courseIds=id1,id2` filter.

---

## Integration Notes

One thing to think through: **Obsidian is still the primary source of truth for Sev's notes.** Sev writes in Obsidian; I read those files during the midnight scan. This API doesn't ingest freeform notes — it tracks structured progress. So the workflow would be:

1. Sev writes notes in Obsidian (unchanged)
2. Midnight scan reads those notes → identifies topics covered → I PATCH mastery levels in the API
3. API becomes the mastery/progress layer; Obsidian stays the knowledge layer

That's a clean division if the API stays focused on tracking, not note storage.

---

## Summary of Priority Requests

| Priority | Request |
|---|---|
| 🔴 High | Batch endpoint for syllabus import |
| 🔴 High | Bulk mastery update |
| 🔴 High | Teach It Back event logging |
| 🟡 Medium | Sort control (date, lastReviewedAt) |
| 🟡 Medium | Date range filter on topics |
| 🟡 Medium | Cross-course `/review` (no courseId required) |
| 🟢 Low | `keyTerms` structured field on topics |
| 🟢 Low | Quiz attempt tracking per topic |
