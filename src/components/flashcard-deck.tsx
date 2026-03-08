"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MasteryBadge } from "@/components/mastery-badge";
import { MASTERY_COLORS, formatDate } from "@/lib/utils";

interface Course {
  id: string;
  name: string;
  color: string;
}

interface FlashcardItem {
  term: string;
  definition: string;
  topicId: string;
  topicName: string;
  mastery: keyof typeof MASTERY_COLORS;
  courseColor: string;
  courseName: string;
}

interface TopicProgress {
  totalCards: number;
  ratedCards: number;
  minQuality: number;
  reviewed: boolean;
}

interface SessionStats {
  total: number;
  reviewed: number;
  forgot: number;
  hard: number;
  good: number;
  easy: number;
}

const RATING_BUTTONS = [
  { label: "Forgot", quality: 1, color: "#ef4444", key: "1" },
  { label: "Hard", quality: 3, color: "#f97316", key: "2" },
  { label: "Good", quality: 4, color: "#22c55e", key: "3" },
  { label: "Easy", quality: 5, color: "#3b82f6", key: "4" },
] as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function FlashcardDeck() {
  const router = useRouter();
  const [mode, setMode] = useState<"srs" | "browse">("srs");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [rated, setRated] = useState(false);
  const [topicProgress, setTopicProgress] = useState<Map<string, TopicProgress>>(new Map());
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    total: 0, reviewed: 0, forgot: 0, hard: 0, good: 0, easy: 0,
  });
  const [sessionComplete, setSessionComplete] = useState(false);
  const [srsEmpty, setSrsEmpty] = useState<"none" | "no-keyterms" | null>(null);
  const [dueTopicCount, setDueTopicCount] = useState(0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load courses
  useEffect(() => {
    async function loadCourses() {
      const res = await fetch("/api/v1/courses");
      const json = await res.json();
      setCourses(
        (json.data ?? []).map((c: Course) => ({
          id: c.id,
          name: c.name,
          color: c.color,
        }))
      );
      setLoading(false);
    }
    loadCourses();
  }, []);

  // Load SRS cards
  useEffect(() => {
    if (mode !== "srs") return;
    async function loadSrs() {
      setCardsLoading(true);
      setSrsEmpty(null);
      setSessionComplete(false);
      const params = new URLSearchParams({ sort: "interleaved" });
      if (selectedCourseId) params.set("courseId", selectedCourseId);
      const res = await fetch(`/api/v1/review?${params}`);
      const json = await res.json();
      const topics = json.data ?? [];

      setDueTopicCount(topics.length);

      if (topics.length === 0) {
        setSrsEmpty("none");
        setCards([]);
        setCardsLoading(false);
        return;
      }

      const deck: FlashcardItem[] = [];
      const progress = new Map<string, TopicProgress>();

      for (const topic of topics) {
        const keyTerms = Array.isArray(topic.keyTerms) ? topic.keyTerms : [];
        const validTerms = keyTerms.filter(
          (kt: { term?: string; definition?: string }) => kt.term && kt.definition
        );
        if (validTerms.length === 0) continue;

        progress.set(topic.id, {
          totalCards: validTerms.length,
          ratedCards: 0,
          minQuality: 6,
          reviewed: false,
        });

        for (const kt of validTerms) {
          deck.push({
            term: kt.term,
            definition: kt.definition,
            topicId: topic.id,
            topicName: topic.name,
            mastery: topic.mastery,
            courseColor: topic.course.color,
            courseName: topic.course.name,
          });
        }
      }

      if (deck.length === 0) {
        setSrsEmpty("no-keyterms");
        setCards([]);
        setCardsLoading(false);
        return;
      }

      setCards(deck);
      setTopicProgress(progress);
      setSessionStats({ total: deck.length, reviewed: 0, forgot: 0, hard: 0, good: 0, easy: 0 });
      setCurrentIndex(0);
      setFlipped(false);
      setRated(false);
      setCardsLoading(false);
    }
    loadSrs();
  }, [mode, selectedCourseId]);

  // Load browse cards
  useEffect(() => {
    if (mode !== "browse") return;
    if (!selectedCourseId) {
      setCards([]);
      return;
    }
    async function loadTopics() {
      setCardsLoading(true);
      const res = await fetch(`/api/v1/courses/${selectedCourseId}/topics`);
      const json = await res.json();
      const topics = json.data ?? [];
      const deck: FlashcardItem[] = [];
      for (const topic of topics) {
        if (Array.isArray(topic.keyTerms)) {
          for (const kt of topic.keyTerms) {
            if (kt.term && kt.definition) {
              deck.push({
                term: kt.term,
                definition: kt.definition,
                topicId: topic.id,
                topicName: topic.name,
                mastery: topic.mastery ?? "EXPOSED",
                courseColor: "",
                courseName: "",
              });
            }
          }
        }
      }
      setCards(deck);
      setCurrentIndex(0);
      setFlipped(false);
      setCardsLoading(false);
    }
    loadTopics();
  }, [mode, selectedCourseId]);

  async function handleRate(quality: number) {
    if (rated || mode !== "srs" || !cards.length) return;
    setRated(true);

    const card = cards[currentIndex];
    const topicId = card.topicId;

    // Update session stats
    setSessionStats((prev) => {
      const next = { ...prev, reviewed: prev.reviewed + 1 };
      if (quality === 1) next.forgot++;
      else if (quality === 3) next.hard++;
      else if (quality === 4) next.good++;
      else if (quality === 5) next.easy++;
      return next;
    });

    // Check if this rating completes the topic before updating state
    const tp = topicProgress.get(topicId);
    const shouldPostReview =
      tp && !tp.reviewed && tp.ratedCards + 1 === tp.totalCards;
    const reviewQuality = tp
      ? Math.min(tp.minQuality, quality)
      : quality;

    // Update topic progress (no side effects in updater)
    setTopicProgress((prev) => {
      const next = new Map(prev);
      const existing = next.get(topicId);
      if (!existing) return next;
      const updated = {
        ...existing,
        ratedCards: existing.ratedCards + 1,
        minQuality: Math.min(existing.minQuality, quality),
        reviewed: existing.reviewed || shouldPostReview,
      };
      next.set(topicId, updated);
      return next;
    });

    if (shouldPostReview) {
      postReview(topicId, reviewQuality);
    }

    // Auto-advance after delay
    advanceTimerRef.current = setTimeout(() => {
      advanceToNext();
    }, 300);
  }

  async function postReview(topicId: string, quality: number) {
    try {
      const res = await fetch(`/api/v1/topics/${topicId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? "Failed to record review");
        return;
      }
      const json = await res.json();
      const nextDate = json.data?.nextReviewAt
        ? formatDate(json.data.nextReviewAt)
        : "unknown";
      toast.success(`Next review: ${nextDate}`);
      router.refresh();
    } catch {
      toast.error("Network error");
    }
  }

  function advanceToNext() {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
      setRated(false);
    } else {
      setSessionComplete(true);
    }
  }

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!cards.length || sessionComplete) return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") {
        if (mode === "srs") {
          if (rated) advanceToNext();
        } else {
          setCurrentIndex((i) => (i < cards.length - 1 ? i + 1 : i));
          setFlipped(false);
        }
      } else if (e.key === "ArrowLeft" && mode === "browse") {
        setCurrentIndex((i) => (i > 0 ? i - 1 : i));
        setFlipped(false);
      }

      // Rating shortcuts (SRS mode, flipped, not yet rated)
      if (mode === "srs" && flipped && !rated) {
        const ratingMap: Record<string, number> = { "1": 1, "2": 3, "3": 4, "4": 5 };
        if (ratingMap[e.key] !== undefined) {
          handleRate(ratingMap[e.key]);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards.length, mode, flipped, rated, currentIndex, sessionComplete]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  function handleShuffle() {
    setCards((prev) => shuffle(prev));
    setCurrentIndex(0);
    setFlipped(false);
  }

  function handleModeChange(newMode: "srs" | "browse") {
    setMode(newMode);
    setCards([]);
    setCurrentIndex(0);
    setFlipped(false);
    setRated(false);
    setSessionComplete(false);
    setSrsEmpty(null);
    if (newMode === "srs") {
      setSelectedCourseId("");
    }
  }

  function handleNewSession() {
    setSessionComplete(false);
    setCards([]);
    setCurrentIndex(0);
    setFlipped(false);
    setRated(false);
    setTopicProgress(new Map());
    setSessionStats({ total: 0, reviewed: 0, forgot: 0, hard: 0, good: 0, easy: 0 });
    setSrsEmpty(null);
    // Trigger re-fetch by toggling a dependency
    setMode("browse");
    setTimeout(() => setMode("srs"), 0);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-48 w-full max-w-md mx-auto rounded-xl" />
      </div>
    );
  }

  const card = cards[currentIndex];

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 rounded-lg border bg-muted p-1">
        <button
          onClick={() => handleModeChange("srs")}
          className={`rounded-md px-3 min-h-[44px] text-sm font-medium transition-colors ${
            mode === "srs"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          SRS Due
        </button>
        <button
          onClick={() => handleModeChange("browse")}
          className={`rounded-md px-3 min-h-[44px] text-sm font-medium transition-colors ${
            mode === "browse"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Browse
        </button>
      </div>

      {/* Header row: course filter + shuffle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {mode === "browse" ? (
          <div className="flex-1">
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex-1">
            <Select
              value={selectedCourseId || "all"}
              onValueChange={(v) => setSelectedCourseId(v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {mode === "browse" && cards.length > 1 && (
          <Button variant="outline" size="sm" className="min-h-[44px] w-full sm:w-auto" onClick={handleShuffle}>
            Shuffle
          </Button>
        )}
      </div>

      {/* Card area */}
      {mode === "srs" && srsEmpty === "none" ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            All caught up! No flashcards due for review.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Switch to Browse mode to study any course.
          </p>
        </div>
      ) : mode === "srs" && srsEmpty === "no-keyterms" ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {dueTopicCount} topic{dueTopicCount !== 1 ? "s" : ""} due for review but none have key terms.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Add key terms to topics to use flashcard review.
          </p>
        </div>
      ) : mode === "browse" && !selectedCourseId ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            Select a course to study its key terms
          </p>
        </div>
      ) : cardsLoading ? (
        <Skeleton className="aspect-[3/2] w-full max-w-md mx-auto rounded-xl" />
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            No key terms found. Add key terms to topics to build your flashcard deck.
          </p>
        </div>
      ) : sessionComplete ? (
        /* Session summary */
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <h3 className="text-lg font-semibold">Session complete</h3>
          <div className="grid grid-cols-2 gap-3 text-sm w-full max-w-xs">
            <div className="text-muted-foreground text-right">Cards reviewed:</div>
            <div className="text-left font-medium">{sessionStats.reviewed}</div>
            <div className="text-muted-foreground text-right">Topics reviewed:</div>
            <div className="text-left font-medium">
              {Array.from(topicProgress.values()).filter((tp) => tp.reviewed).length}
            </div>
            <div className="text-right" style={{ color: "#ef4444" }}>Forgot:</div>
            <div className="text-left font-medium">{sessionStats.forgot}</div>
            <div className="text-right" style={{ color: "#f97316" }}>Hard:</div>
            <div className="text-left font-medium">{sessionStats.hard}</div>
            <div className="text-right" style={{ color: "#22c55e" }}>Good:</div>
            <div className="text-left font-medium">{sessionStats.good}</div>
            <div className="text-right" style={{ color: "#3b82f6" }}>Easy:</div>
            <div className="text-left font-medium">{sessionStats.easy}</div>
          </div>
          <Button onClick={handleNewSession} className="w-full sm:w-auto min-h-[44px]">
            Start New Session
          </Button>
        </div>
      ) : (
        <>
          {/* Flashcard */}
          <div
            className="w-full max-w-md mx-auto cursor-pointer"
            style={{ perspective: "800px" }}
            onClick={() => setFlipped((f) => !f)}
            role="button"
            tabIndex={0}
            aria-label={flipped ? "Showing definition. Click to show term." : "Showing term. Click to show definition."}
          >
            <div
              className="relative aspect-[3/2]"
              style={{
                transformStyle: "preserve-3d",
                transition: "transform 0.6s ease-out",
                transform: flipped ? "rotateY(180deg)" : "none",
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border bg-card p-6 cyber-glow"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(0deg)" }}
              >
                {mode === "srs" ? (
                  <>
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: card.courseColor }}
                      />
                      <Badge variant="secondary" className="text-xs">
                        {card.courseName}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <MasteryBadge mastery={card.mastery} size="sm" />
                    </div>
                    <Badge variant="outline" className="absolute bottom-3 left-3 text-xs">
                      {card.topicName}
                    </Badge>
                  </>
                ) : (
                  <Badge variant="secondary" className="absolute top-3 left-3 text-xs">
                    {card.topicName}
                  </Badge>
                )}
                <p className="text-xl font-semibold text-center">{card.term}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Tap to reveal
                </p>
              </div>
              {/* Back */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border bg-card p-6 cyber-glow"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                {mode === "srs" ? (
                  <>
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: card.courseColor }}
                      />
                      <Badge variant="secondary" className="text-xs">
                        {card.courseName}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <MasteryBadge mastery={card.mastery} size="sm" />
                    </div>
                    <Badge variant="outline" className="absolute bottom-3 left-3 text-xs">
                      {card.topicName}
                    </Badge>
                  </>
                ) : (
                  <Badge variant="secondary" className="absolute top-3 left-3 text-xs">
                    {card.topicName}
                  </Badge>
                )}
                <p className="text-center text-sm leading-relaxed">
                  {card.definition}
                </p>
                {mode !== "srs" && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Tap to flip back
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rating buttons (SRS mode, after flip) */}
          {mode === "srs" && flipped && !rated && (
            <div className="grid grid-cols-4 gap-2 w-full max-w-md mx-auto">
              {RATING_BUTTONS.map((btn) => (
                <button
                  key={btn.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRate(btn.quality);
                  }}
                  className="inline-flex items-center justify-center rounded-full min-h-[44px] text-xs font-medium transition-all opacity-80 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none"
                  style={{
                    color: btn.color,
                    border: `1px solid ${btn.color}`,
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}

          {/* Rated confirmation */}
          {mode === "srs" && flipped && rated && (
            <div className="flex justify-center">
              <p className="text-xs text-muted-foreground">Rated — advancing...</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4">
            {mode === "browse" && (
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                disabled={currentIndex === 0}
                onClick={() => {
                  setCurrentIndex((i) => i - 1);
                  setFlipped(false);
                }}
              >
                <span aria-hidden="true">&larr;</span>
                <span className="sr-only sm:not-sr-only sm:inline ml-1">Prev</span>
              </Button>
            )}
            <span className="text-sm text-muted-foreground tabular-nums">
              {currentIndex + 1} of {cards.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              disabled={
                currentIndex === cards.length - 1 ||
                (mode === "srs" && !rated)
              }
              onClick={() => {
                if (mode === "srs") {
                  if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
                  advanceToNext();
                } else {
                  setCurrentIndex((i) => i + 1);
                  setFlipped(false);
                }
              }}
            >
              <span className="sr-only sm:not-sr-only sm:inline mr-1">Next</span>
              <span aria-hidden="true">&rarr;</span>
            </Button>
          </div>

          {/* Keyboard hint (desktop only, SRS mode) */}
          {mode === "srs" && (
            <p className="hidden sm:block text-center text-xs text-muted-foreground">
              1-4 to rate &middot; Space to flip &middot; &rarr; to advance
            </p>
          )}
        </>
      )}
    </div>
  );
}
