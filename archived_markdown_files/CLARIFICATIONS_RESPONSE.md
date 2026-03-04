# CLARIFICATIONS_RESPONSE.md — Hex's Answers
**From:** Hex (study agent)
**To:** CyberStudy Scheduler dev team
**Date:** 2026-03-03

---

## Open Questions — Answered

### Q1: Batch endpoint — if one topic fails, should assignments/exams still be created?

**Yes, create them independently.** Topics, assignments, and exams don't reference each other in the batch — they're all flat children of the course. A bad date on one topic shouldn't block the midterm exam from being created. The 207 partial success contract you proposed is exactly right. I'll process the response by checking each item's `status` field and retrying or flagging failures separately.

### Q2: Review sort — should `lastReviewedAt: null` sort first or last?

**First.** Your assumption is correct. Never-reviewed = highest priority. Null before anything else when sorting `lastReviewedAt:asc`. This aligns with how spaced repetition actually works — if I've never seen a topic, it's the most urgent.

### Q3: Teach It Back — auto-influence mastery, or stay decoupled?

**Decoupled. Do not auto-promote or auto-demote.**

Reasoning: Teach It Back is qualitative. A `PASS` on a Teach It Back means Sev could explain the concept clearly in that moment — it doesn't necessarily mean the topic is HARDENED. Similarly, a `MISS` might be a bad explanation of something they actually understand. I'm the one evaluating nuance during the session, and I'll set mastery explicitly via the bulk endpoint after grading. Auto-promotion would add noise I'd have to fight.

Keep mastery as a deliberate write. Teach It Back is just a log.

### Q4: Teach It Back — do you need GET history for past attempts?

**Yes, needed.** Specifically I need to know:
- Has this topic ever had a Teach It Back session? (to avoid repeating too soon)
- What was the last outcome? (to decide whether to revisit or move on)

`GET /api/v1/topics/:id/teach-it-back` returning an array of attempts sorted by `attemptedAt:desc` is sufficient. I don't need deep history — last 3–5 attempts is plenty — but the endpoint needs to exist.

### Q5: Teach It Back `notes` field — short summary or full text?

**Full text.** This is where I store my Socratic feedback and any misconceptions I flagged during grading. It can run 200–500 characters for a normal session, longer if there was a lot of back-and-forth. Use TEXT, not VARCHAR. It's not structured data — it's my grading notes from the conversation.

### Q6: keyTerms — Option A (JSON field) or Option B (separate model)?

**Option A.** JSON field on Topic is the right call. I won't need to query across key terms — I'm always working in the context of a specific topic or course. The simplicity of PATCHing the topic with a `keyTerms` array is exactly what I want. No extra endpoints to manage.

One small addition: include `keyTerms` in the topic response by default (not behind a separate GET). Since it's a JSON field it adds minimal overhead and means I never have to do a follow-up fetch.

### Q7: Quiz attempts — `correct: boolean` only, or also question/answer text?

**Store the question text, not the answer.** Here's why:

`correct: boolean` alone tells me a topic was missed but not which aspect of it. If a topic covers three subtopics and Sev misses two, I need to know *which* questions failed to generate better follow-up questions. But I don't need to store the expected answer — I have the answer keys in `memory/quiz-keys/` and I'm the one generating questions, so I know what the right answer is.

Suggested shape:
```json
POST /api/v1/topics/:id/quiz-attempts
{
  "correct": false,
  "questionText": "What protocol resolves IP addresses to MAC addresses?",
  "sessionId": "quiz-2026-03-03-cist1001"
}
```

`questionText` is optional — I'll include it when I have it (daily/weekly quizzes), omit it for informal checks.

### Q8: Quiz attempts — auto-influence mastery?

**No. Same logic as Teach It Back — keep it decoupled.**

Mastery should be a deliberate, considered write. Auto-promotion after N correct attempts sounds clean but breaks down in practice: quiz questions vary in difficulty, and a topic can have easy and hard subtopics that should be tracked separately. I'd rather look at quiz attempt history, evaluate the pattern, and set mastery explicitly. The analytics endpoint already gives me the data to make that call.

---

## One Additional Note

The `sessionId` approach for grouping quiz attempts is good. The string I'd use would match the quiz filename: `quiz-2026-03-03-cist1001-daily`. That keeps quiz attempts in the API traceable back to the Obsidian quiz file without any extra mapping layer.

---

## Summary

| # | Answer |
|---|--------|
| 1 | Yes — create assignments/exams independently even if topics fail |
| 2 | Null sorts first (never reviewed = highest priority) |
| 3 | Decoupled — no auto-mastery changes from Teach It Back |
| 4 | Yes — need GET history for past Teach It Back attempts |
| 5 | Full Socratic feedback text — use TEXT field |
| 6 | Option A (JSON field on Topic) |
| 7 | Store `questionText` (optional) + `correct: boolean`; skip expected answer |
| 8 | Decoupled — no auto-mastery changes from quiz attempts |
