"use client";

import { useState, useEffect, useCallback } from "react";
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

interface Course {
  id: string;
  name: string;
  color: string;
}

interface Flashcard {
  term: string;
  definition: string;
  topicName: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function FlashcardDeck() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(false);

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

  // Load topics when course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setCards([]);
      return;
    }
    async function loadTopics() {
      setCardsLoading(true);
      const res = await fetch(
        `/api/v1/courses/${selectedCourseId}/topics`
      );
      const json = await res.json();
      const topics = json.data ?? [];
      const deck: Flashcard[] = [];
      for (const topic of topics) {
        if (Array.isArray(topic.keyTerms)) {
          for (const kt of topic.keyTerms) {
            if (kt.term && kt.definition) {
              deck.push({
                term: kt.term,
                definition: kt.definition,
                topicName: topic.name,
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
  }, [selectedCourseId]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!cards.length) return;
      if (e.key === "ArrowLeft") {
        setCurrentIndex((i) => (i > 0 ? i - 1 : i));
        setFlipped(false);
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((i) => (i < cards.length - 1 ? i + 1 : i));
        setFlipped(false);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    },
    [cards.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function handleShuffle() {
    setCards((prev) => shuffle(prev));
    setCurrentIndex(0);
    setFlipped(false);
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
      {/* Header row: course selector + shuffle */}
      <div className="flex items-center gap-3">
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
        {cards.length > 1 && (
          <Button variant="outline" size="sm" onClick={handleShuffle}>
            Shuffle
          </Button>
        )}
      </div>

      {/* Card area */}
      {!selectedCourseId ? (
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
            No key terms for this course yet. Add key terms to topics to build
            your flashcard deck.
          </p>
        </div>
      ) : (
        <>
          {/* Flashcard */}
          <div
            className="flashcard-scene w-full max-w-md mx-auto cursor-pointer"
            onClick={() => setFlipped((f) => !f)}
            role="button"
            tabIndex={0}
            aria-label={flipped ? "Showing definition. Click to show term." : "Showing term. Click to show definition."}
          >
            <div
              className={`flashcard-inner relative aspect-[3/2] ${flipped ? "flipped" : ""}`}
            >
              {/* Front */}
              <div className="flashcard-face flashcard-front absolute inset-0 flex flex-col items-center justify-center rounded-xl border bg-card p-6 cyber-glow">
                <Badge variant="secondary" className="absolute top-3 left-3 text-xs">
                  {card.topicName}
                </Badge>
                <p className="text-xl font-semibold text-center">{card.term}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Tap to reveal
                </p>
              </div>
              {/* Back */}
              <div className="flashcard-face flashcard-back absolute inset-0 flex flex-col items-center justify-center rounded-xl border bg-card p-6 cyber-glow">
                <Badge variant="secondary" className="absolute top-3 left-3 text-xs">
                  {card.topicName}
                </Badge>
                <p className="text-center text-sm leading-relaxed">
                  {card.definition}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Tap to flip back
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4">
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
              <span className="hidden sm:inline ml-1">Prev</span>
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {currentIndex + 1} of {cards.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              disabled={currentIndex === cards.length - 1}
              onClick={() => {
                setCurrentIndex((i) => i + 1);
                setFlipped(false);
              }}
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <span aria-hidden="true">&rarr;</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
