"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { OsceSession, OSCEFeedbackResult, DoorPrepData, SoapNoteData } from "@/types";
import { OsceProgress } from "@/components/osce-progress";
import { RubricScoreCard } from "@/components/rubric-score-card";
import { OsceChatPanel } from "@/components/osce-chat-panel";
import type { OsceChatSessionContext } from "@/components/osce-chat-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Stethoscope,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ClipboardList,
  FileText,
} from "lucide-react";

function SubmissionReview({
  doorPrep,
  soapNote,
}: {
  doorPrep: DoorPrepData | null;
  soapNote: SoapNoteData | null;
}) {
  const [open, setOpen] = useState(false);

  if (!doorPrep && !soapNote) return null;

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Your Submission
          </h2>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="space-y-3">
          {/* Door prep */}
          {doorPrep && doorPrep.diagnoses.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Door Prep Differential
                </p>
                {doorPrep.diagnoses.map((d, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-sm font-medium">{d.diagnosis}</p>
                    {d.history_questions.filter((q) => q.trim()).length > 0 && (
                      <div className="text-xs text-muted-foreground pl-2 space-y-0.5">
                        <p className="font-medium">History questions:</p>
                        {d.history_questions.filter((q) => q.trim()).map((q, j) => (
                          <p key={j}>• {q}</p>
                        ))}
                      </div>
                    )}
                    {d.pe_maneuvers.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-2">
                        {d.pe_maneuvers.map((m, j) => (
                          <Badge key={j} variant="outline" className="text-[10px]">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* SOAP note */}
          {soapNote && soapNote.diagnoses.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  SOAP Note Differential
                </p>
                {soapNote.diagnoses.map((d, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-sm font-medium">{d.diagnosis}</p>
                    {d.evidence.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-2">
                        {d.evidence.map((e, j) => (
                          <Badge key={j} variant="secondary" className="text-[10px]">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {d.diagnostic_plan.length > 0 && (
                      <div className="text-xs text-muted-foreground pl-2">
                        <span className="font-medium">Dx: </span>
                        {d.diagnostic_plan.join(", ")}
                      </div>
                    )}
                    {d.therapeutic_plan.length > 0 && (
                      <div className="text-xs text-muted-foreground pl-2">
                        <span className="font-medium">Tx: </span>
                        {d.therapeutic_plan.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}

export default function OsceFeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<OsceSession | null>(null);
  const [feedback, setFeedback] = useState<OSCEFeedbackResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const sessRes = await fetch(`/api/osce-session/${sessionId}`);
        if (!sessRes.ok) { router.push("/osce"); return; }
        const { session: sess }: { session: OsceSession } = await sessRes.json();
        setSession(sess);

        if (sess.status === "door_prep") { router.replace(`/osce/${sessionId}/door-prep`); return; }
        if (sess.status === "soap_note") { router.replace(`/osce/${sessionId}/soap-note`); return; }

        if (sess.feedback) {
          setFeedback(sess.feedback as OSCEFeedbackResult);
          setLoading(false);
          return;
        }

        const fbRes = await fetch("/api/osce-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (fbRes.ok) {
          const { feedback: fb } = await fbRes.json();
          setFeedback(fb);
        } else {
          setError("Failed to generate feedback. Please try again.");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <Loader2 className="h-6 w-6 animate-spin-slow text-primary" />
        <p className="text-sm text-muted-foreground">Generating feedback...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <OsceProgress currentPhase="completed" sessionId={sessionId} sessionCompleted />
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sessionContext: OsceChatSessionContext = {
    current_entries: feedback
      ? `Strengths: ${feedback.strengths.join("; ")}. ` +
        `Improvements: ${feedback.improvements.join("; ")}. ` +
        (feedback.cant_miss?.length
          ? `Missed can't-miss diagnoses: ${feedback.cant_miss.join(", ")}.`
          : "")
      : "Feedback not yet loaded.",
    feedback_result: feedback,
  };

  return (
    <div className="flex gap-4 p-4 max-w-5xl mx-auto">
      <div className="flex-1 min-w-0 space-y-4">
      <OsceProgress currentPhase="completed" sessionId={sessionId} sessionCompleted />

      <div className="flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">OSCE Feedback</h1>
      </div>

      {/* Review step CTAs */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => router.push(`/osce/${sessionId}/door-prep`)}
          className="flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent/50 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Review Door Prep</p>
            <p className="text-[10px] text-muted-foreground">Step 1</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
        <button
          type="button"
          onClick={() => router.push(`/osce/${sessionId}/soap-note`)}
          className="flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent/50 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Review SOAP Note</p>
            <p className="text-[10px] text-muted-foreground">Step 2</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </div>

      {feedback && (
        <>
          {/* Rubric */}
          {feedback.rubric_scores.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Performance
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {feedback.rubric_scores.map((score, i) => (
                  <RubricScoreCard key={i} score={score} />
                ))}
              </div>
            </section>
          )}

          {/* Strengths */}
          {feedback.strengths.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Strengths
              </h2>
              <Card className="border-green-200 dark:border-green-900">
                <CardContent className="p-4 space-y-2">
                  {feedback.strengths.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Areas to Improve */}
          {feedback.improvements.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Areas to Improve
              </h2>
              <Card className="border-blue-200 dark:border-blue-900">
                <CardContent className="p-4 space-y-2">
                  {feedback.improvements.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Can't Miss */}
          {feedback.cant_miss && feedback.cant_miss.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Don&apos;t Miss
              </h2>
              <Card className="border-amber-200 dark:border-amber-900">
                <CardContent className="p-4 space-y-2">
                  {feedback.cant_miss.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}

      {/* Submission review */}
      <SubmissionReview
        doorPrep={session?.door_prep ?? null}
        soapNote={session?.soap_note ?? null}
      />

      <Button
        variant="outline"
        onClick={() => router.push("/osce")}
        className="w-full"
        size="lg"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Practice Another Case
      </Button>
      </div>
      <OsceChatPanel
        sessionId={sessionId}
        phase="feedback"
        sessionContext={sessionContext}
      />
    </div>
  );
}
