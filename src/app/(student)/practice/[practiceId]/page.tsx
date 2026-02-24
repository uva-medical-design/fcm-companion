"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { PRACTICE_CASES } from "@/data/practice-cases";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { DiagnosisEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DiagnosisInput } from "@/components/diagnosis-input";
import { DiagnosisRow } from "@/components/diagnosis-row";
import { DdxRanking } from "@/components/ddx-ranking";
import { FeedbackNarrative } from "@/components/feedback-narrative";
import { JourneyTimeline } from "@/components/journey-timeline";
import type { PracticeEvent } from "@/components/journey-timeline";
import { SimulationFlow } from "@/components/simulation-flow";
import {
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PracticeFeedback {
  narrative: string;
  correct_diagnosis: string;
  student_got_it: boolean;
}

export default function PracticeCasePage() {
  const { practiceId } = useParams<{ practiceId: string }>();
  const { user } = useUser();
  const practiceCase = PRACTICE_CASES.find((c) => c.id === practiceId);

  const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [practiceMode, setPracticeMode] = useState<"differential" | "full" | "simulation">("differential");
  const [listView, setListView] = useState<"detail" | "rank">("detail");
  const [showCaseDetails, setShowCaseDetails] = useState(false);
  const [practiceEvents, setPracticeEvents] = useState<PracticeEvent[]>([]);
  const eventsRef = useRef<PracticeEvent[]>([]);

  // Log a practice event (in-memory + fire-and-forget to DB)
  function logEvent(event_type: string, event_data: Record<string, unknown>) {
    const event: PracticeEvent = {
      event_type,
      event_data,
      created_at: new Date().toISOString(),
    };
    eventsRef.current = [...eventsRef.current, event];
    setPracticeEvents([...eventsRef.current]);

    // Fire-and-forget to Supabase (ok if it fails)
    if (user && practiceId) {
      supabase
        .from("fcm_practice_events")
        .insert({
          user_id: user.id,
          practice_case_id: practiceId,
          event_type,
          event_data,
        })
        .then(() => {});
    }
  }

  // Load mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("practice-mode");
    if (savedMode === "full" || savedMode === "simulation") setPracticeMode(savedMode);
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    if (!practiceId) return;
    const saved = localStorage.getItem(`practice-${practiceId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.diagnoses) setDiagnoses(data.diagnoses);
        if (data.feedback) {
          setFeedback(data.feedback);
          setSubmitted(true);
        }
      } catch {
        // ignore
      }
    }
  }, [practiceId]);

  const addDiagnosis = useCallback(
    (name: string) => {
      setDiagnoses((prev) => [
        ...prev,
        { diagnosis: name, sort_order: prev.length },
      ]);
      logEvent("diagnosis_added", { diagnosis: name });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function removeDiagnosis(index: number) {
    const removed = diagnoses[index];
    setDiagnoses((prev) =>
      prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, sort_order: i }))
    );
    if (removed) logEvent("diagnosis_removed", { diagnosis: removed.diagnosis });
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setDiagnoses((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((d, i) => ({ ...d, sort_order: i }));
    });
  }

  function moveDown(index: number) {
    setDiagnoses((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((d, i) => ({ ...d, sort_order: i }));
    });
  }

  function updateConfidence(index: number, confidence: number) {
    const prev = diagnoses[index];
    setDiagnoses((d) =>
      d.map((entry, i) => (i === index ? { ...entry, confidence } : entry))
    );
    logEvent("confidence_changed", {
      diagnosis: prev?.diagnosis,
      old_confidence: prev?.confidence,
      new_confidence: confidence,
    });
  }

  function updateReasoning(index: number, reasoning: string) {
    setDiagnoses((prev) =>
      prev.map((d, i) => (i === index ? { ...d, reasoning } : d))
    );
  }

  async function handleSubmit() {
    if (!practiceCase || diagnoses.length === 0) return;
    setSubmitting(true);
    logEvent("submitted", { count: diagnoses.length });

    try {
      const res = await fetch("/api/practice-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnoses: diagnoses.map((d) => d.diagnosis),
          correct_diagnosis: practiceCase.correct_diagnosis,
          chief_complaint: practiceCase.chief_complaint,
          patient_age: practiceCase.patient_age,
          patient_gender: practiceCase.patient_gender,
        }),
      });
      const data = await res.json();
      setFeedback(data);
      setSubmitted(true);

      // Save to localStorage
      localStorage.setItem(
        `practice-${practiceId}`,
        JSON.stringify({ diagnoses, feedback: data })
      );
    } catch {
      // Fallback: just reveal the answer
      const got = diagnoses.some(
        (d) =>
          d.diagnosis.toLowerCase() ===
          practiceCase.correct_diagnosis.toLowerCase()
      );
      const fallback: PracticeFeedback = {
        narrative: got
          ? "You identified the correct diagnosis."
          : "The correct diagnosis was not in your differential.",
        correct_diagnosis: practiceCase.correct_diagnosis,
        student_got_it: got,
      };
      setFeedback(fallback);
      setSubmitted(true);
      localStorage.setItem(
        `practice-${practiceId}`,
        JSON.stringify({ diagnoses, feedback: fallback })
      );
    }

    setSubmitting(false);
  }

  function handleRetry() {
    setSubmitted(false);
    setFeedback(null);
    setDiagnoses([]);
    setPracticeEvents([]);
    eventsRef.current = [];
    localStorage.removeItem(`practice-${practiceId}`);
  }

  if (!practiceCase) {
    return (
      <div className="p-4 space-y-4">
        <Link
          href="/practice"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Try a Case
        </Link>
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Case not found.</p>
          </div>
        </div>
      </div>
    );
  }

  // Simulation mode renders a completely different flow
  if (practiceMode === "simulation") {
    return (
      <div className="p-4 space-y-4 pb-8">
        <Link
          href="/practice"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Try a Case
        </Link>
        <SimulationFlow practiceCase={practiceCase} practiceId={practiceId} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Back navigation */}
      <Link
        href="/practice"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Try a Case
      </Link>

      {/* Case header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-semibold leading-tight">
            {practiceCase.chief_complaint}
          </h1>
          {practiceMode === "full" && practiceCase.body_system && (
            <Badge variant="secondary" className="shrink-0">
              {practiceCase.body_system}
            </Badge>
          )}
        </div>
        {practiceCase.patient_age && practiceCase.patient_gender && (
          <p className="text-sm text-muted-foreground">
            {practiceCase.patient_age}yo {practiceCase.patient_gender}
          </p>
        )}
        {practiceMode === "full" && (
          <>
            <Badge variant="outline" className="text-xs">
              {practiceCase.difficulty}
            </Badge>
            {practiceCase.vitals && Object.keys(practiceCase.vitals).length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {Object.entries(practiceCase.vitals).map(([k, v]) => (
                  <span key={k}>{k}: {v}</span>
                ))}
              </div>
            )}
            {practiceCase.full_case_data && Object.keys(practiceCase.full_case_data).length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowCaseDetails(!showCaseDetails)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showCaseDetails && "rotate-180")} />
                  {showCaseDetails ? "Hide" : "Show"} Case Details
                </button>
                {showCaseDetails && (
                  <Card className="mt-2">
                    <CardContent className="p-3 text-xs space-y-2">
                      {Object.entries(practiceCase.full_case_data).map(([section, content]) => (
                        <div key={section}>
                          <p className="font-medium capitalize">{section.replace(/_/g, " ")}</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {typeof content === "string" ? content : JSON.stringify(content, null, 2)}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Feedback result */}
      {submitted && feedback && (
        <Card className={cn(
          "py-3",
          feedback.student_got_it
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
            : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
        )}>
          <CardContent className="px-4 py-0 space-y-3">
            <div className="flex items-center gap-2">
              {feedback.student_got_it ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <p className="text-sm font-medium">
                Correct Diagnosis: {feedback.correct_diagnosis}
              </p>
            </div>
            <FeedbackNarrative text={feedback.narrative} />
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Journey Timeline (after submission) */}
      {submitted && practiceEvents.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <JourneyTimeline events={practiceEvents} />
          </CardContent>
        </Card>
      )}

      {/* Diagnosis input */}
      {!submitted && (
        <>
          <DiagnosisInput
            onAdd={addDiagnosis}
            existingDiagnoses={diagnoses.map((d) => d.diagnosis)}
          />

          {/* Guidance */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {diagnoses.length}{" "}
              {diagnoses.length === 1 ? "diagnosis" : "diagnoses"}
            </p>
            {diagnoses.length > 0 && diagnoses.length < 8 && (
              <p className="text-xs text-muted-foreground">
                Aim for 8–10 diagnoses for a thorough differential.
              </p>
            )}
          </div>
        </>
      )}

      {/* View toggle + Diagnosis list */}
      {diagnoses.length > 0 && (
        <div className="space-y-2">
          {!submitted && diagnoses.length >= 2 && (
            <div className="flex rounded-lg border p-0.5 w-fit">
              <button
                type="button"
                onClick={() => setListView("detail")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  listView === "detail"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Detail
              </button>
              <button
                type="button"
                onClick={() => setListView("rank")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  listView === "rank"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Rank
              </button>
            </div>
          )}

          {listView === "rank" && !submitted ? (
            <DdxRanking
              diagnoses={diagnoses}
              onReorder={setDiagnoses}
              onRemove={removeDiagnosis}
            />
          ) : (
            diagnoses.map((entry, index) => (
              <DiagnosisRow
                key={`${entry.diagnosis}-${entry.sort_order}`}
                entry={entry}
                index={index}
                total={diagnoses.length}
                disabled={submitted}
                onRemove={removeDiagnosis}
                onMoveUp={moveUp}
                onMoveDown={moveDown}
                onUpdateConfidence={updateConfidence}
                onUpdateReasoning={updateReasoning}
              />
            ))
          )}
        </div>
      )}

      {/* Empty state */}
      {diagnoses.length === 0 && !submitted && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Start building your differential by adding diagnoses above.
          </p>
        </div>
      )}

      {/* Submit button */}
      {!submitted && diagnoses.length > 0 && (
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-12 text-base"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit &amp; Reveal Answer
            </>
          )}
        </Button>
      )}
    </div>
  );
}
