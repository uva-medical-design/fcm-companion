"use client";

import { cn } from "@/lib/utils";

export interface RubricScore {
  category: string;
  score: number; // 1-5
  comment: string;
}

interface OsceRubricProps {
  scores: RubricScore[];
  narrative: string;
}

const SCORE_LABELS: Record<number, string> = {
  1: "Needs work",
  2: "Developing",
  3: "Adequate",
  4: "Good",
  5: "Excellent",
};

function scoreColor(score: number): string {
  if (score >= 4) return "bg-green-500";
  if (score >= 3) return "bg-amber-400";
  return "bg-red-500";
}

function scoreBgColor(score: number): string {
  if (score >= 4) return "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400";
  if (score >= 3) return "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400";
  return "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400";
}

export function OsceRubric({ scores, narrative }: OsceRubricProps) {
  const avgScore =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
      : 0;

  return (
    <div className="space-y-4">
      {/* Category scores */}
      <div className="grid grid-cols-2 gap-2">
        {scores.map((s) => (
          <div
            key={s.category}
            className="rounded-lg border p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{s.category}</span>
              <span
                className={cn(
                  "text-xs font-medium rounded-md px-1.5 py-0.5",
                  scoreBgColor(s.score)
                )}
              >
                {s.score}/5
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", scoreColor(s.score))}
                style={{ width: `${(s.score / 5) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{s.comment}</p>
          </div>
        ))}
      </div>

      {/* Overall average */}
      {scores.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Overall:</span>
          <span className={cn("font-medium rounded-md px-2 py-0.5 text-xs", scoreBgColor(Math.round(avgScore)))}>
            {avgScore.toFixed(1)}/5 — {SCORE_LABELS[Math.round(avgScore)] || ""}
          </span>
        </div>
      )}

      {/* Narrative feedback */}
      {narrative && (
        <div className="rounded-lg border p-3">
          <p className="text-sm leading-relaxed">{narrative}</p>
        </div>
      )}
    </div>
  );
}
