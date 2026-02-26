"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, FcmSchedule, FcmSubmission, FcmQuizScore } from "@/types";
import {
  computeTimeline,
  formatSessionCountdown,
  type CaseTimeline,
  type RefreshUrgency,
} from "@/lib/case-timeline";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle,
  FileEdit,
  ArrowRight,
  Lock,
  Zap,
  ClipboardList,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingState, EmptyState, ErrorState } from "@/components/empty-state";

interface CaseWithSchedule {
  schedule: FcmSchedule;
  case_data: FcmCase;
  submission: FcmSubmission | null;
  timeline: CaseTimeline;
}

function getStatusBadge(submission: FcmSubmission | null) {
  if (!submission)
    return { label: "New", variant: "outline" as const, icon: Clock };
  if (submission.status === "submitted" || submission.status === "resubmitted")
    return {
      label: "Submitted",
      variant: "default" as const,
      icon: CheckCircle,
    };
  return {
    label: "In Progress",
    variant: "secondary" as const,
    icon: FileEdit,
  };
}

const urgencyBorderColor: Record<RefreshUrgency, string> = {
  none: "border-l-primary",
  calm: "border-l-green-500",
  nudge: "border-l-blue-500",
  attention: "border-l-amber-500",
};

function ReviewCard({
  c,
  onClick,
}: {
  c: CaseWithSchedule;
  onClick: () => void;
}) {
  const { timeline } = c;
  const sessionLabel = formatSessionCountdown(timeline.daysUntilSession);
  const isAttention = timeline.urgency === "attention";

  return (
    <Card
      className={cn(
        "cursor-pointer border-l-4 hover:shadow-md transition-all",
        urgencyBorderColor[timeline.urgency]
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardDescription className="text-xs">
              {c.schedule.week_label}
            </CardDescription>
            <CardTitle className="text-base mt-1">
              {c.case_data.chief_complaint}
            </CardTitle>
          </div>
          <Badge
            variant={isAttention ? "default" : "secondary"}
            className={cn(
              "ml-2 shrink-0",
              isAttention && "bg-amber-500 hover:bg-amber-600"
            )}
          >
            Session {sessionLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {c.case_data.body_system && <span>{c.case_data.body_system}</span>}
          {timeline.daysSinceSubmission !== null && (
            <span>
              Submitted{" "}
              {timeline.daysSinceSubmission === 0
                ? "today"
                : timeline.daysSinceSubmission === 1
                  ? "yesterday"
                  : `${timeline.daysSinceSubmission}d ago`}
            </span>
          )}
          {timeline.lastQuizScore && (
            <span>
              Last: {timeline.lastQuizScore.score}/
              {timeline.lastQuizScore.total}
            </span>
          )}
        </div>
        <Button
          variant={isAttention ? "default" : "outline"}
          className={cn(
            "w-full",
            isAttention && "bg-amber-500 hover:bg-amber-600 text-white"
          )}
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/cases/${c.case_data.id}/quick-refresh`;
          }}
        >
          <Zap className="h-4 w-4 mr-1.5" />
          Quick Refresh — 60s
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CasesPage() {
  const { user } = useUser();
  const router = useRouter();
  const [cases, setCases] = useState<CaseWithSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function fetchCases() {
      try {
        const [schedulesRes, submissionsRes, scoresRes] = await Promise.all([
          supabase
            .from("fcm_schedule")
            .select("*, fcm_cases(*)")
            .or(`fcm_group.eq.${user!.fcm_group},fcm_group.is.null`)
            .order("unlock_date", { ascending: true }),
          supabase
            .from("fcm_submissions")
            .select("*")
            .eq("user_id", user!.id),
          supabase
            .from("fcm_quiz_scores")
            .select("*")
            .eq("user_id", user!.id),
        ]);

        if (schedulesRes.error) throw schedulesRes.error;

        const schedules = schedulesRes.data;
        const submissions = submissionsRes.data;
        const scores = (scoresRes.data as FcmQuizScore[]) || [];

        if (schedules) {
          const caseList: CaseWithSchedule[] = schedules.map((s) => {
            const submission =
              submissions?.find(
                (sub: FcmSubmission) => sub.case_id === s.case_id
              ) || null;
            const caseScores = scores.filter(
              (sc) => sc.case_id === s.case_id
            );
            const timeline = computeTimeline(
              s.session_date,
              submission?.submitted_at || null,
              caseScores
            );
            return {
              schedule: s,
              case_data: s.fcm_cases,
              submission,
              timeline,
            };
          });
          setCases(caseList);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchCases();
  }, [user]);

  if (loading) {
    return <LoadingState message="Loading your cases..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load cases"
        description="Check your connection and try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  const today = new Date().toISOString().split("T")[0];

  // 4-section split
  const readyToReview = cases.filter(
    (c) =>
      c.timeline.isSubmitted &&
      !c.timeline.isSessionPast &&
      c.schedule.unlock_date <= today
  );
  const current = cases.filter(
    (c) =>
      c.schedule.unlock_date <= today &&
      !c.timeline.isSessionPast &&
      !c.timeline.isSubmitted
  );
  const completed = cases.filter((c) => c.timeline.isSessionPast);
  const upcoming = cases.filter((c) => c.schedule.unlock_date > today);

  const hasNoCases =
    readyToReview.length === 0 &&
    current.length === 0 &&
    completed.length === 0 &&
    upcoming.length === 0;

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Your Cases</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build your differential, get feedback, and prepare for FCM
        </p>
      </div>

      {/* Cases Due Summary */}
      {(current.length > 0 || readyToReview.length > 0) && (() => {
        // Find the next upcoming deadline
        const activeCases = [...current, ...readyToReview];
        const nextDue = activeCases
          .filter((c) => c.schedule.session_date >= today)
          .sort((a, b) => a.schedule.session_date.localeCompare(b.schedule.session_date))[0];

        if (!nextDue) return null;

        const daysUntil = nextDue.timeline.daysUntilSession;
        const sessionLabel =
          daysUntil <= 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `in ${daysUntil} days`;
        const isUrgent = daysUntil <= 1;
        const pendingCount = current.length;
        const reviewCount = readyToReview.length;

        return (
          <Card
            className={cn(
              "border-l-4",
              isUrgent
                ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                : "border-l-primary bg-accent/30"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CalendarClock
                  className={cn(
                    "h-5 w-5 shrink-0 mt-0.5",
                    isUrgent ? "text-amber-600 dark:text-amber-400" : "text-primary"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    Next session: <span className={isUrgent ? "text-amber-700 dark:text-amber-300" : ""}>{sessionLabel}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pendingCount > 0 && `${pendingCount} case${pendingCount !== 1 ? "s" : ""} to submit`}
                    {pendingCount > 0 && reviewCount > 0 && " · "}
                    {reviewCount > 0 && `${reviewCount} ready to review`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {hasNoCases && (
        <EmptyState
          icon={ClipboardList}
          title="No cases assigned yet"
          description="Your instructor will add cases here as the course progresses. Check back soon."
        />
      )}

      {/* Ready to Review */}
      {readyToReview.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Ready to Review
          </h2>
          {readyToReview.map((c) => (
            <ReviewCard
              key={c.schedule.id}
              c={c}
              onClick={() => router.push(`/cases/${c.case_data.id}`)}
            />
          ))}
        </div>
      )}

      {/* Current Cases */}
      {current.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Current
          </h2>
          {current.map((c) => {
            const status = getStatusBadge(c.submission);
            const StatusIcon = status.icon;
            return (
              <Card
                key={c.schedule.id}
                className="cursor-pointer border-l-4 border-l-primary hover:border-primary/50 transition-colors"
                onClick={() => router.push(`/cases/${c.case_data.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardDescription className="text-xs">
                        {c.schedule.week_label}
                      </CardDescription>
                      <CardTitle className="text-base mt-1">
                        {c.case_data.chief_complaint}
                      </CardTitle>
                    </div>
                    <Badge variant={status.variant} className="ml-2 shrink-0">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{c.case_data.body_system}</span>
                      <span>
                        Due{" "}
                        {new Date(c.schedule.due_date).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Completed Cases */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Completed
          </h2>
          {completed.map((c) => {
            const status = getStatusBadge(c.submission);
            const StatusIcon = status.icon;
            return (
              <Card
                key={c.schedule.id}
                className="cursor-pointer opacity-60 hover:opacity-80 transition-opacity"
                onClick={() => router.push(`/cases/${c.case_data.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardDescription className="text-xs">
                        {c.schedule.week_label}
                      </CardDescription>
                      <CardTitle className="text-sm mt-1">
                        {c.case_data.chief_complaint}
                      </CardTitle>
                    </div>
                    <Badge variant={status.variant} className="ml-2 shrink-0">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {c.case_data.body_system && (
                      <span>{c.case_data.body_system}</span>
                    )}
                    {c.timeline.lastQuizScore && (
                      <span>
                        Last quiz: {c.timeline.lastQuizScore.score}/
                        {c.timeline.lastQuizScore.total}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upcoming Cases */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Upcoming
          </h2>
          {upcoming.map((c) => (
            <Card
              key={c.schedule.id}
              className="opacity-50 border-dashed pointer-events-none"
            >
              <CardHeader className="pb-1 pt-3">
                <CardDescription className="text-xs flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {c.schedule.week_label} — Unlocks{" "}
                  {new Date(c.schedule.unlock_date).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                    }
                  )}
                </CardDescription>
                <CardTitle className="text-sm mt-1">
                  {c.case_data.chief_complaint}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <div className="text-xs text-muted-foreground">
                  {c.case_data.body_system}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
