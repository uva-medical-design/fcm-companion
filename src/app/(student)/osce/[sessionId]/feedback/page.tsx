"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { PRACTICE_CASES } from "@/data/practice-cases";
import type { PracticeCase } from "@/types";
import type { OsceSession, RubricScore } from "@/types/osce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OsceProgress } from "@/components/osce-progress";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const RATING_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  excellent: {
    label: "Excellent",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/40 border-green-200 dark:border-green-900/50",
  },
  good: {
    label: "Good",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50",
  },
  developing: {
    label: "Developing",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50",
  },
  needs_work: {
    label: "Needs Work",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50 border-border",
  },
};

export default function FeedbackPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<OsceSession | null>(null);
  const [practiceCase, setPracticeCase] = useState<PracticeCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/osce-session/${sessionId}`);
        const data = await res.json();
        if (data.session) {
          const s = data.session as OsceSession;
          setSession(s);

          if (s.practice_case_id) {
            const pc = PRACTICE_CASES.find(
              (c) => c.id === s.practice_case_id
            );
            if (pc) setPracticeCase(pc);
          }

          // If session is not completed, redirect to appropriate step
          if (s.status === "door_prep") {
            router.push(`/osce/${sessionId}/door-prep`);
            return;
          }
          if (s.status === "soap_note") {
            router.push(`/osce/${sessionId}/soap-note`);
            return;
          }
        } else {
          setError("Session not found");
        }
      } catch {
        setError("Failed to load session");
      }
      setLoading(false);
    }
    fetchSession();
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-4 space-y-4">
        <Link
          href="/osce"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to OSCE
        </Link>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {error || "Session not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const feedback = session.feedback;

  if (!feedback) {
    return (
      <div className="p-4 space-y-4">
        <Link
          href="/osce"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to OSCE
        </Link>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Feedback has not been generated for this session. This may
              indicate an error during generation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      {/* Nav */}
      <Link
        href="/osce"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to OSCE
      </Link>

      {/* Progress */}
      <OsceProgress
        currentStep="completed"
        onNavigate={(step) => {
          if (step === "door_prep") {
            router.push(`/osce/${sessionId}/door-prep`);
          } else if (step === "soap_note") {
            router.push(`/osce/${sessionId}/soap-note`);
          }
        }}
      />

      {/* Case header */}
      {practiceCase && (
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">
            {practiceCase.chief_complaint}
          </h1>
          {practiceCase.body_system && (
            <Badge variant="outline">{practiceCase.body_system}</Badge>
          )}
        </div>
      )}

      {/* Rubric Cards */}
      {feedback.rubric.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Performance Rubric
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {feedback.rubric.map((score: RubricScore) => {
              const config = RATING_CONFIG[score.rating] || RATING_CONFIG.needs_work;
              return (
                <Card
                  key={score.category}
                  className={cn("border", config.bgColor)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {score.category}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", config.color)}
                      >
                        {config.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {score.comment}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Strengths */}
      {feedback.strengths.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            Strengths
          </h2>
          <Card>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {feedback.strengths.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Areas to Improve */}
      {feedback.improvements.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Areas to Improve
          </h2>
          <Card>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {feedback.improvements.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Don't Miss */}
      {feedback.dont_miss.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Don&apos;t Miss
          </h2>
          <Card className="border-amber-200 dark:border-amber-900/50">
            <CardContent className="p-4">
              <ul className="space-y-2">
                {feedback.dont_miss.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Overall Comment */}
      {feedback.overall_comment && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Attending Comment</h2>
          <Card className="border-primary/20 bg-accent/30">
            <CardContent className="p-4">
              <p className="text-sm leading-relaxed italic">
                {feedback.overall_comment}
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => router.push("/osce")}
          className="flex-1"
        >
          Back to OSCE
        </Button>
        <Button
          onClick={() => router.push(`/osce/${sessionId}/door-prep`)}
          variant="ghost"
          className="flex-1"
        >
          Review Door Prep
        </Button>
        <Button
          onClick={() => router.push(`/osce/${sessionId}/soap-note`)}
          variant="ghost"
          className="flex-1"
        >
          Review SOAP Note
        </Button>
      </div>
    </div>
  );
}
