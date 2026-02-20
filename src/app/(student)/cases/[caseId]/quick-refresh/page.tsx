"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, FcmSubmission, FeedbackResult } from "@/types";
import { generateQuickCards, type QuizCard } from "@/lib/quiz-cards";
import {
  RecallCard,
  TrueFalseCard,
  MultipleChoiceCard,
} from "@/components/quiz-card-renderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Zap,
  RotateCcw,
  ArrowRight,
} from "lucide-react";

// ─── Quick summary screen ───────────────────────────────────────────
function QuickSummary({
  total,
  correct,
  caseId,
  onRestart,
  onDone,
}: {
  total: number;
  correct: number;
  caseId: string;
  onRestart: () => void;
  onDone: () => void;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isReady = pct >= 75;
  const router = useRouter();

  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <Zap
        className={cn(
          "h-12 w-12",
          isReady ? "text-green-500" : "text-amber-500"
        )}
      />
      <div>
        <p className="text-2xl font-bold">
          {correct}/{total}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {isReady
            ? "You're ready for FCM. The key concepts are fresh in your mind."
            : "Worth another look — a quick review will help lock things in."}
        </p>
      </div>

      <div className="flex flex-col gap-2 w-full">
        <Button variant="outline" onClick={onRestart}>
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Again
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/cases/${caseId}/refresh`)}
        >
          <ArrowRight className="h-4 w-4 mr-1.5" />
          Full Quiz
        </Button>
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}

// ─── Main page component ────────────────────────────────────────────
export default function QuickRefreshPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useUser();
  const router = useRouter();
  const [caseData, setCaseData] = useState<FcmCase | null>(null);
  const [submission, setSubmission] = useState<FcmSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [currentCard, setCurrentCard] = useState(0);
  const [answers, setAnswers] = useState<
    Map<number, { correct: boolean; value: unknown }>
  >(new Map());
  const [revealed, setRevealed] = useState(false);
  const [quizKey, setQuizKey] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function fetchAll() {
      const [caseRes, subRes] = await Promise.all([
        supabase.from("fcm_cases").select("*").eq("id", caseId).single(),
        supabase
          .from("fcm_submissions")
          .select("*")
          .eq("user_id", user!.id)
          .eq("case_id", caseId)
          .single(),
      ]);

      if (caseRes.data) setCaseData(caseRes.data);
      if (subRes.data) setSubmission(subRes.data);
      setLoading(false);
    }

    fetchAll();
  }, [user, caseId]);

  const feedback = submission?.feedback as FeedbackResult | null;

  const cards = useMemo(() => {
    if (!caseData || !submission || !feedback) return [];
    return generateQuickCards(caseData, submission, feedback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData, submission, feedback, quizKey]);

  const correctCount = useMemo(() => {
    let count = 0;
    answers.forEach((a) => {
      if (a.correct) count++;
    });
    return count;
  }, [answers]);

  const currentAnswered = answers.has(currentCard) || revealed;
  const isFinished = currentCard >= cards.length;

  // Save score when quiz finishes
  useEffect(() => {
    if (!isFinished || scoreSaved || !user || cards.length === 0) return;
    setScoreSaved(true);
    supabase.from("fcm_quiz_scores").insert({
      user_id: user.id,
      case_id: caseId,
      score: correctCount,
      total: cards.length,
      quiz_mode: "quick",
    });
  }, [isFinished, scoreSaved, user, caseId, correctCount, cards.length]);

  const handleNext = useCallback(() => {
    setRevealed(false);
    setCurrentCard((c) => c + 1);
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentCard(0);
    setAnswers(new Map());
    setRevealed(false);
    setScoreSaved(false);
    setQuizKey((k) => k + 1);
  }, []);

  // ─── Loading / empty states ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!submission || !feedback) {
    return (
      <div className="p-4 space-y-4">
        <button
          onClick={() => router.push(`/cases/${caseId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {!submission
              ? "You haven't submitted a differential for this case yet."
              : "Feedback hasn't been generated yet. View your feedback page first."}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cards.length === 0) return null;

  // ─── Summary screen ───────────────────────────────────────────────
  if (isFinished) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <QuickSummary
          total={cards.length}
          correct={correctCount}
          caseId={caseId}
          onRestart={handleRestart}
          onDone={() => router.push(`/cases/${caseId}`)}
        />
      </div>
    );
  }

  // ─── Quiz UI ──────────────────────────────────────────────────────
  const card = cards[currentCard];

  return (
    <div className="flex flex-col min-h-[calc(100dvh-8rem)] md:min-h-[calc(100dvh-3rem)]">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push(`/cases/${caseId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit
          </button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              ~60s
            </Badge>
            <span className="text-xs text-muted-foreground">
              {currentCard + 1} / {cards.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {cards.map((_: QuizCard, i: number) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                i < currentCard
                  ? answers.get(i)?.correct
                    ? "bg-green-500"
                    : "bg-amber-400"
                  : i === currentCard
                    ? "bg-primary"
                    : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          {card.type === "recall" && (
            <RecallCard
              card={card}
              revealed={revealed}
              onReveal={() => {
                setRevealed(true);
                setAnswers((prev) => {
                  const next = new Map(prev);
                  next.set(currentCard, { correct: true, value: null });
                  return next;
                });
              }}
            />
          )}

          {card.type === "true_false" && (
            <TrueFalseCard
              card={card}
              answered={answers.has(currentCard)}
              userAnswer={
                answers.has(currentCard)
                  ? (answers.get(currentCard)!.value as boolean)
                  : null
              }
              onAnswer={(answer) => {
                setAnswers((prev) => {
                  const next = new Map(prev);
                  next.set(currentCard, {
                    correct: answer === card.correct,
                    value: answer,
                  });
                  return next;
                });
              }}
            />
          )}

          {card.type === "multiple_choice" && (
            <MultipleChoiceCard
              card={card}
              answered={answers.has(currentCard)}
              selectedIndex={
                answers.has(currentCard)
                  ? (answers.get(currentCard)!.value as number)
                  : null
              }
              onSelect={(index) => {
                setAnswers((prev) => {
                  const next = new Map(prev);
                  next.set(currentCard, {
                    correct: index === card.correctIndex,
                    value: index,
                  });
                  return next;
                });
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom: Next button */}
      <div className="px-4 pb-6 safe-bottom">
        {currentAnswered && (
          <Button
            onClick={handleNext}
            className="w-full h-12 text-base animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {currentCard === cards.length - 1 ? "See Results" : "Next"}
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

