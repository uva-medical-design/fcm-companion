"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { PRACTICE_CASES } from "@/data/practice-cases";
import type { DiagnosisEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DiagnosisInput } from "@/components/diagnosis-input";
import { DiagnosisRow } from "@/components/diagnosis-row";
import { FeedbackNarrative } from "@/components/feedback-narrative";
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
  const practiceCase = PRACTICE_CASES.find((c) => c.id === practiceId);

  const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [practiceMode, setPracticeMode] = useState<"differential" | "full">("differential");
  const [showCaseDetails, setShowCaseDetails] = useState(false);

  // Load mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("practice-mode");
    if (savedMode === "full") setPracticeMode("full");
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
    },
    []
  );

  function removeDiagnosis(index: number) {
    setDiagnoses((prev) =>
      prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, sort_order: i }))
    );
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
    setDiagnoses((prev) =>
      prev.map((d, i) => (i === index ? { ...d, confidence } : d))
    );
  }

  function updateReasoning(index: number, reasoning: string) {
    setDiagnoses((prev) =>
      prev.map((d, i) => (i === index ? { ...d, reasoning } : d))
    );
  }

  async function handleSubmit() {
    if (!practiceCase || diagnoses.length === 0) return;
    setSubmitting(true);

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

      {/* Diagnosis list */}
      {diagnoses.length > 0 && (
        <div className="space-y-2">
          {diagnoses.map((entry, index) => (
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
          ))}
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
