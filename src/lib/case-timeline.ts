import type { FcmQuizScore } from "@/types";

export type RefreshUrgency = "none" | "calm" | "nudge" | "attention";

export interface CaseTimeline {
  daysUntilSession: number;
  daysSinceSubmission: number | null;
  daysSinceLastQuiz: number | null;
  lastQuizScore: { score: number; total: number } | null;
  bestQuizScore: { score: number; total: number } | null;
  isSessionPast: boolean;
  isSubmitted: boolean;
  needsRefresh: boolean;
  urgency: RefreshUrgency;
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

export function computeTimeline(
  sessionDate: string,
  submittedAt: string | null,
  quizScores: FcmQuizScore[]
): CaseTimeline {
  const now = new Date();
  const session = new Date(sessionDate + "T00:00:00");
  const daysUntilSession = daysBetween(now, session);
  const isSessionPast = daysUntilSession < 0;
  const isSubmitted = submittedAt !== null;

  const daysSinceSubmission = submittedAt
    ? daysBetween(new Date(submittedAt), now)
    : null;

  // Sort scores by completed_at descending
  const sorted = [...quizScores].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  );

  const lastScore = sorted[0] ?? null;
  const daysSinceLastQuiz = lastScore
    ? daysBetween(new Date(lastScore.completed_at), now)
    : null;

  const lastQuizScore = lastScore
    ? { score: lastScore.score, total: lastScore.total }
    : null;

  // Best score by percentage
  const bestScore = quizScores.length > 0
    ? quizScores.reduce((best, s) =>
        s.score / s.total > best.score / best.total ? s : best
      )
    : null;
  const bestQuizScore = bestScore
    ? { score: bestScore.score, total: bestScore.total }
    : null;

  // Determine if refresh is needed and urgency level
  let needsRefresh = false;
  let urgency: RefreshUrgency = "none";

  if (isSubmitted && !isSessionPast) {
    needsRefresh = true;

    if (daysSinceLastQuiz !== null && daysSinceLastQuiz <= 1) {
      // Reviewed today or yesterday
      urgency = "calm";
    } else if (daysUntilSession <= 1) {
      // Session tomorrow or today, not recently reviewed
      urgency = "attention";
    } else {
      // Submitted but not recently reviewed, session >1 day away
      urgency = "nudge";
    }
  }

  return {
    daysUntilSession,
    daysSinceSubmission,
    daysSinceLastQuiz,
    lastQuizScore,
    bestQuizScore,
    isSessionPast,
    isSubmitted,
    needsRefresh,
    urgency,
  };
}

export function formatSessionCountdown(daysUntilSession: number): string {
  if (daysUntilSession <= 0) return "Today";
  if (daysUntilSession === 1) return "Tomorrow";
  return `in ${daysUntilSession} days`;
}
