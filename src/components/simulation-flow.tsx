"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PracticeCase, DiagnosisEntry } from "@/types";
import type { PracticeEvent } from "@/components/journey-timeline";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { SimulationProgress } from "@/components/simulation-progress";
import { CaseReviewStep } from "@/components/case-review-step";
import { GatherStep } from "@/components/gather-step";
import { DiagnosisInput } from "@/components/diagnosis-input";
import { DiagnosisRow } from "@/components/diagnosis-row";
import { DdxRanking } from "@/components/ddx-ranking";
import { DebriefDashboard } from "@/components/debrief-dashboard";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MatchResult {
  elementId: string;
  elementText: string;
  importance: "key" | "supporting" | "minor";
  status: "matched" | "partial" | "missed";
  matchedText?: string;
}

export interface DdxSnapshot {
  label: string;
  diagnoses: { diagnosis: string; sort_order: number }[];
  timestamp: string;
}

export interface SimulationFeedback {
  narrative: string;
  correct_diagnosis: string;
  student_got_it: boolean;
  expert_reasoning: string;
  key_takeaways: string[];
  common_pitfalls: string[];
}

interface SimulationFlowProps {
  practiceCase: PracticeCase;
  practiceId: string;
}

export function SimulationFlow({ practiceCase, practiceId }: SimulationFlowProps) {
  const { user } = useUser();
  const [step, setStep] = useState(1);

  // Step 2 state
  const [historyEntries, setHistoryEntries] = useState<string[]>([]);
  const [examEntries, setExamEntries] = useState<string[]>([]);
  const [historyMatches, setHistoryMatches] = useState<MatchResult[]>([]);
  const [examMatches, setExamMatches] = useState<MatchResult[]>([]);
  const [gatherReviewed, setGatherReviewed] = useState(false);

  // Step 3 state
  const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>([]);
  const [ddxSnapshots, setDdxSnapshots] = useState<DdxSnapshot[]>([]);
  const [listView, setListView] = useState<"detail" | "rank">("detail");
  const [submitting, setSubmitting] = useState(false);

  // Step 4 state
  const [feedback, setFeedback] = useState<SimulationFeedback | null>(null);

  // Practice events
  const [practiceEvents, setPracticeEvents] = useState<PracticeEvent[]>([]);
  const eventsRef = useRef<PracticeEvent[]>([]);

  // Restore simulation state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`sim-${practiceId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.step) setStep(data.step);
        if (data.historyEntries) setHistoryEntries(data.historyEntries);
        if (data.examEntries) setExamEntries(data.examEntries);
        if (data.historyMatches) setHistoryMatches(data.historyMatches);
        if (data.examMatches) setExamMatches(data.examMatches);
        if (data.gatherReviewed) setGatherReviewed(data.gatherReviewed);
        if (data.diagnoses) setDiagnoses(data.diagnoses);
        if (data.ddxSnapshots) setDdxSnapshots(data.ddxSnapshots);
        if (data.feedback) setFeedback(data.feedback);
        if (data.practiceEvents) {
          setPracticeEvents(data.practiceEvents);
          eventsRef.current = data.practiceEvents;
        }
      } catch {
        // ignore
      }
    }
  }, [practiceId]);

  // Save simulation state to localStorage on key changes
  useEffect(() => {
    const state = {
      step,
      historyEntries,
      examEntries,
      historyMatches,
      examMatches,
      gatherReviewed,
      diagnoses,
      ddxSnapshots,
      feedback,
      practiceEvents: eventsRef.current,
    };
    localStorage.setItem(`sim-${practiceId}`, JSON.stringify(state));
  }, [step, historyEntries, examEntries, historyMatches, examMatches, gatherReviewed, diagnoses, ddxSnapshots, feedback, practiceId]);

  function logEvent(event_type: string, event_data: Record<string, unknown>) {
    const event: PracticeEvent = {
      event_type,
      event_data,
      created_at: new Date().toISOString(),
    };
    eventsRef.current = [...eventsRef.current, event];
    setPracticeEvents([...eventsRef.current]);

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

  // Step 1 → 2
  function handleReviewComplete() {
    logEvent("simulation_review_complete", {});
    setStep(2);
  }

  // Step 2 → 3 (after gather review)
  function handleGatherComplete(
    hEntries: string[],
    eEntries: string[],
    hMatches: MatchResult[],
    eMatches: MatchResult[],
  ) {
    setHistoryEntries(hEntries);
    setExamEntries(eEntries);
    setHistoryMatches(hMatches);
    setExamMatches(eMatches);
    setGatherReviewed(true);
    logEvent("simulation_gather_complete", {
      history_count: hEntries.length,
      exam_count: eEntries.length,
      history_matched: hMatches.filter((m) => m.status === "matched").length,
      exam_matched: eMatches.filter((m) => m.status === "matched").length,
    });
    // Capture initial DDx snapshot (empty)
    setDdxSnapshots([
      {
        label: "Initial",
        diagnoses: [],
        timestamp: new Date().toISOString(),
      },
    ]);
    setStep(3);
  }

  // Step 3 — diagnosis management
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

  // Step 3 → 4 (submit + get debrief)
  async function handleDifferentialSubmit() {
    if (diagnoses.length === 0) return;
    setSubmitting(true);

    // Capture final DDx snapshot
    const finalSnapshot: DdxSnapshot = {
      label: "Final",
      diagnoses: diagnoses.map((d) => ({
        diagnosis: d.diagnosis,
        sort_order: d.sort_order,
      })),
      timestamp: new Date().toISOString(),
    };
    const allSnapshots = [...ddxSnapshots.filter((s) => s.label !== "Initial" || s.diagnoses.length > 0), finalSnapshot];
    // If there was no meaningful initial snapshot, add it from the first entries
    if (ddxSnapshots.length > 0 && ddxSnapshots[0].diagnoses.length === 0) {
      allSnapshots.unshift({
        ...ddxSnapshots[0],
        diagnoses: diagnoses.slice(0, Math.min(3, diagnoses.length)).map((d, i) => ({
          diagnosis: d.diagnosis,
          sort_order: i,
        })),
      });
    }
    setDdxSnapshots(allSnapshots);

    logEvent("submitted", { count: diagnoses.length, mode: "simulation" });

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
          mode: "simulation",
        }),
      });
      const data = await res.json();
      setFeedback(data);
      setStep(4);
    } catch {
      // Fallback
      const got = diagnoses.some(
        (d) =>
          d.diagnosis.toLowerCase() ===
          practiceCase.correct_diagnosis.toLowerCase()
      );
      setFeedback({
        narrative: got
          ? "You correctly identified the diagnosis."
          : "The correct diagnosis was not in your differential.",
        correct_diagnosis: practiceCase.correct_diagnosis,
        student_got_it: got,
        expert_reasoning: "",
        key_takeaways: [],
        common_pitfalls: [],
      });
      setStep(4);
    }

    setSubmitting(false);
  }

  function handleRetry() {
    setStep(1);
    setHistoryEntries([]);
    setExamEntries([]);
    setHistoryMatches([]);
    setExamMatches([]);
    setGatherReviewed(false);
    setDiagnoses([]);
    setDdxSnapshots([]);
    setFeedback(null);
    setPracticeEvents([]);
    eventsRef.current = [];
    localStorage.removeItem(`sim-${practiceId}`);
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <SimulationProgress
        currentStep={step}
        onNavigate={(s) => setStep(s)}
      />

      {/* Step 1: Case Review */}
      {step === 1 && (
        <CaseReviewStep
          practiceCase={practiceCase}
          onContinue={handleReviewComplete}
        />
      )}

      {/* Step 2: Gather */}
      {step === 2 && (
        <GatherStep
          practiceCase={practiceCase}
          initialHistoryEntries={historyEntries}
          initialExamEntries={examEntries}
          previousMatches={
            gatherReviewed
              ? { history: historyMatches, exam: examMatches }
              : undefined
          }
          onComplete={handleGatherComplete}
          logEvent={logEvent}
        />
      )}

      {/* Step 3: Differential */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">Build Your Differential</h2>
            <p className="text-sm text-muted-foreground">
              Add diagnoses, rank by likelihood, and rate your confidence
            </p>
          </div>

          <DiagnosisInput
            onAdd={addDiagnosis}
            existingDiagnoses={diagnoses.map((d) => d.diagnosis)}
          />

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

          {diagnoses.length > 0 && (
            <div className="space-y-2">
              {diagnoses.length >= 2 && (
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

              {listView === "rank" ? (
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
                    disabled={false}
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

          {diagnoses.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Start building your differential by adding diagnoses above.
              </p>
            </div>
          )}

          {diagnoses.length > 0 && (
            <Button
              onClick={handleDifferentialSubmit}
              disabled={submitting}
              className="w-full h-12 text-base"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit &amp; View Debrief
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Step 4: Debrief */}
      {step === 4 && feedback && (
        <DebriefDashboard
          feedback={feedback}
          diagnoses={diagnoses}
          ddxSnapshots={ddxSnapshots}
          historyMatches={historyMatches}
          examMatches={examMatches}
          practiceEvents={practiceEvents}
          practiceCase={practiceCase}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
