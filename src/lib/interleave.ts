export function interleaveTopics<T extends { courseId: string; mastery: string; nextReviewAt: Date | null }>(
  topics: T[]
): T[] {
  const now = Date.now();
  const buckets = new Map<string, T[]>();

  for (const t of topics) {
    if (!buckets.has(t.courseId)) buckets.set(t.courseId, []);
    buckets.get(t.courseId)!.push(t);
  }

  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => {
      const mA = a.mastery === "SCANNING" ? 0 : 1;
      const mB = b.mastery === "SCANNING" ? 0 : 1;
      if (mA !== mB) return mA - mB;
      const overdueA = a.nextReviewAt ? now - new Date(a.nextReviewAt).getTime() : Infinity;
      const overdueB = b.nextReviewAt ? now - new Date(b.nextReviewAt).getTime() : Infinity;
      return overdueB - overdueA;
    });
  }

  const queue = [...buckets.values()].sort((a, b) => b.length - a.length);
  const result: T[] = [];

  while (queue.length > 0) {
    let i = 0;
    while (i < queue.length) {
      result.push(queue[i].shift()!);
      if (queue[i].length === 0) queue.splice(i, 1);
      else i++;
    }
  }

  return result;
}
