-- CreateIndex
CREATE INDEX "Topic_nextReviewAt_idx" ON "Topic"("nextReviewAt");

-- CreateIndex
CREATE INDEX "Topic_courseId_mastery_idx" ON "Topic"("courseId", "mastery");

-- CreateIndex
CREATE INDEX "StudySession_userId_startedAt_idx" ON "StudySession"("userId", "startedAt");
