"use client";

import type { QuizCard } from "@/lib/quiz-cards";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Brain,
  Stethoscope,
} from "lucide-react";

export function RecallCard({
  card,
  revealed,
  onReveal,
}: {
  card: Extract<QuizCard, { type: "recall" }>;
  revealed: boolean;
  onReveal: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <Brain className="h-8 w-8 text-primary/60" />
      <p className="text-lg font-medium leading-snug px-2">{card.question}</p>
      {!revealed ? (
        <button
          onClick={onReveal}
          className="mt-2 rounded-2xl border-2 border-dashed border-primary/30 px-8 py-4 text-sm text-primary hover:bg-primary/5 active:scale-95 transition-all"
        >
          Tap to reveal
        </button>
      ) : (
        <div className="rounded-2xl bg-primary/10 px-6 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-base font-semibold text-primary">{card.answer}</p>
        </div>
      )}
    </div>
  );
}

export function TrueFalseCard({
  card,
  answered,
  userAnswer,
  onAnswer,
}: {
  card: Extract<QuizCard, { type: "true_false" }>;
  answered: boolean;
  userAnswer: boolean | null;
  onAnswer: (answer: boolean) => void;
}) {
  const isCorrect = userAnswer === card.correct;

  return (
    <div className="flex flex-col items-center text-center gap-6">
      <Stethoscope className="h-8 w-8 text-primary/60" />
      <p className="text-lg font-medium leading-snug px-2">True or False?</p>
      <p className="text-base text-muted-foreground italic px-4">
        {card.statement}
      </p>

      {!answered ? (
        <div className="flex gap-4 mt-2">
          <button
            onClick={() => onAnswer(true)}
            className="rounded-2xl border-2 border-green-300 bg-green-50 dark:bg-green-950/30 px-8 py-3 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-100 active:scale-95 transition-all"
          >
            True
          </button>
          <button
            onClick={() => onAnswer(false)}
            className="rounded-2xl border-2 border-red-300 bg-red-50 dark:bg-red-950/30 px-8 py-3 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100 active:scale-95 transition-all"
          >
            False
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-2xl px-6 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
            isCorrect
              ? "bg-green-50 dark:bg-green-950/30"
              : "bg-amber-50 dark:bg-amber-950/30"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            {isCorrect ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-amber-600" />
            )}
            <span
              className={cn(
                "font-semibold text-sm",
                isCorrect
                  ? "text-green-700 dark:text-green-400"
                  : "text-amber-700 dark:text-amber-400"
              )}
            >
              {isCorrect ? "Correct!" : "Not quite"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{card.explanation}</p>
        </div>
      )}
    </div>
  );
}

export function MultipleChoiceCard({
  card,
  answered,
  selectedIndex,
  onSelect,
}: {
  card: Extract<QuizCard, { type: "multiple_choice" }>;
  answered: boolean;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const isCorrect = selectedIndex === card.correctIndex;

  return (
    <div className="flex flex-col items-center text-center gap-5">
      <Brain className="h-8 w-8 text-primary/60" />
      <p className="text-lg font-medium leading-snug px-2">{card.question}</p>

      <div className="w-full space-y-2 px-2">
        {card.options.map((option, i) => {
          let style =
            "border-border bg-background hover:bg-accent/50 active:scale-[0.98]";

          if (answered) {
            if (i === card.correctIndex) {
              style = "border-green-400 bg-green-50 dark:bg-green-950/30";
            } else if (i === selectedIndex && !isCorrect) {
              style = "border-red-400 bg-red-50 dark:bg-red-950/30";
            } else {
              style = "border-border bg-muted/30 opacity-50";
            }
          }

          return (
            <button
              key={i}
              onClick={() => !answered && onSelect(i)}
              disabled={answered}
              className={cn(
                "w-full rounded-xl border-2 px-4 py-3 text-sm text-left transition-all",
                style
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium shrink-0",
                    answered && i === card.correctIndex
                      ? "border-green-400 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : answered && i === selectedIndex && !isCorrect
                        ? "border-red-400 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        : "border-muted-foreground/30"
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
                {answered && i === card.correctIndex && (
                  <CheckCircle className="h-4 w-4 text-green-600 ml-auto shrink-0" />
                )}
                {answered && i === selectedIndex && !isCorrect && (
                  <XCircle className="h-4 w-4 text-red-500 ml-auto shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={cn(
            "rounded-2xl px-5 py-3 text-sm text-left w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
            isCorrect
              ? "bg-green-50 dark:bg-green-950/30"
              : "bg-amber-50 dark:bg-amber-950/30"
          )}
        >
          <p className="text-muted-foreground">{card.explanation}</p>
        </div>
      )}
    </div>
  );
}
