"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, FcmSubmission, FeedbackResult } from "@/types";
import { VINDICATE_CATEGORIES } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeedbackNarrative } from "@/components/feedback-narrative";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  StickyNote,
  RotateCcw,
  Eye,
  Brain,
} from "lucide-react";

function DiagnosisLink({ term }: { term: string }) {
  return (
    <a
      href={`https://www.statpearls.com/point-of-care/${encodeURIComponent(term)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors"
    >
      {term}
    </a>
  );
}

export default function FeedbackPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useUser();
  const router = useRouter();
  const [caseData, setCaseData] = useState<FcmCase | null>(null);
  const [submission, setSubmission] = useState<FcmSubmission | null>(null);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExpert, setShowExpert] = useState(false);

  async function generateFeedback() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user!.id, case_id: caseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate feedback");
      } else if (data.feedback) {
        setFeedback(data.feedback);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    }
    setGenerating(false);
  }

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const [caseResult, subResult] = await Promise.all([
        supabase.from("fcm_cases").select("*").eq("id", caseId).single(),
        supabase
          .from("fcm_submissions")
          .select("*")
          .eq("user_id", user!.id)
          .eq("case_id", caseId)
          .single(),
      ]);

      if (caseResult.data) setCaseData(caseResult.data);
      if (subResult.data) {
        setSubmission(subResult.data);
        if (subResult.data.feedback && subResult.data.feedback.ai_narrative) {
          setFeedback(subResult.data.feedback);
          setLoading(false);
          return;
        }
      }

      // Generate feedback if not cached
      if (subResult.data && !subResult.data.feedback?.ai_narrative) {
        setLoading(false);
        await generateFeedback();
      } else {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, caseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          No submission found. Build your differential first.
        </p>
        <Button variant="outline" onClick={() => router.push(`/cases/${caseId}`)}>
          Go to Case
        </Button>
      </div>
    );
  }

  const coveredCount = feedback
    ? Object.values(feedback.vindicate_coverage).filter(Boolean).length
    : 0;

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/cases/${caseId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to case
        </button>
        {caseData && (
          <h1 className="text-lg font-semibold">{caseData.chief_complaint}</h1>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          Your Feedback
        </p>
      </div>

      {generating && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Generating your feedback...</span>
          </CardContent>
        </Card>
      )}

      {error && !generating && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={generateFeedback}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {feedback && (
        <>
          {/* Phase 1: AI Narrative */}
          <Card className="border-primary/30 bg-accent/30">
            <CardContent className="p-4">
              <FeedbackNarrative text={feedback.ai_narrative} />
            </CardContent>
          </Card>

          {/* Phase 1: VINDICATE Coverage Grid */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                VINDICATE Coverage — {coveredCount} of 9
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {VINDICATE_CATEGORIES.map((cat) => {
                  const covered = feedback.vindicate_coverage[cat.key];
                  return (
                    <div
                      key={cat.key}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2 text-xs",
                        covered
                          ? "border-primary/30 bg-accent/50 text-accent-foreground"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md text-xs font-medium",
                          covered
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {cat.key === "I2" ? "I" : cat.key}
                      </span>
                      <span className="truncate">{cat.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Phase 1: Your Differential — Tiered */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your Differential</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedback.tiered_differential.most_likely.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Most Likely
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.tiered_differential.most_likely.map((d) => (
                      <Badge key={d} variant="success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {feedback.tiered_differential.moderate.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Moderate Likelihood
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.tiered_differential.moderate.map((d) => (
                      <Badge key={d} variant="secondary">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {feedback.tiered_differential.less_likely.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Less Likely
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.tiered_differential.less_likely.map((d) => (
                      <Badge key={d} variant="outline">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {feedback.tiered_differential.unlikely_important.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Unlikely but Important
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.tiered_differential.unlikely_important.map((d) => (
                      <Badge key={d} variant="warning">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {feedback.unmatched.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Additional (not in answer key)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.unmatched.map((d) => (
                      <Badge key={d} variant="outline">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phase 1: Summary counts (without revealing missed names) */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">
                  {feedback.common_hit.length} of {feedback.common_hit.length + feedback.common_missed.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Common diagnoses identified</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">
                  {feedback.cant_miss_hit.length} of {feedback.cant_miss_hit.length + feedback.cant_miss_missed.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Can&apos;t-miss diagnoses identified</p>
              </CardContent>
            </Card>
          </div>

          {/* Phase 2 toggle */}
          {!showExpert ? (
            <Button
              onClick={() => setShowExpert(true)}
              variant="outline"
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              Show Expert Differential
            </Button>
          ) : (
            <>
              {/* Phase 2: Full Common + Can't-Miss hit/missed lists */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">Common</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {feedback.common_hit.length > 0 && (
                      <div className="space-y-1">
                        {feedback.common_hit.map((d) => (
                          <div
                            key={d}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                            <DiagnosisLink term={d} />
                          </div>
                        ))}
                      </div>
                    )}
                    {feedback.common_missed.length > 0 && (
                      <div className="space-y-1">
                        {feedback.common_missed.map((d) => (
                          <div
                            key={d}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                          >
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <DiagnosisLink term={d} />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Can&apos;t-Miss
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {feedback.cant_miss_hit.length > 0 && (
                      <div className="space-y-1">
                        {feedback.cant_miss_hit.map((d) => (
                          <div
                            key={d}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                            <DiagnosisLink term={d} />
                          </div>
                        ))}
                      </div>
                    )}
                    {feedback.cant_miss_missed.length > 0 && (
                      <div className="space-y-1">
                        {feedback.cant_miss_missed.map((d) => (
                          <div
                            key={d}
                            className="flex items-center gap-1.5 text-xs text-amber-700"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <DiagnosisLink term={d} />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Phase 2: Fuzzy match corrections */}
              {feedback.fuzzy_matched && feedback.fuzzy_matched.length > 0 && (
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">Close Matches</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {feedback.fuzzy_matched.map((fm) => (
                      <div
                        key={fm.student}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>
                          &ldquo;{fm.student}&rdquo; matched to <span className="font-medium">{fm.matched_to}</span>
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/notes")}
            >
              <StickyNote className="h-4 w-4 mr-1" />
              Add Notes
            </Button>
            <Button
              className="flex-1"
              onClick={() => router.push(`/cases/${caseId}/refresh`)}
            >
              <Brain className="h-4 w-4 mr-1" />
              Quick Quiz
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
