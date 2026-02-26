"use client";

import { useState, useRef } from "react";
import type { PracticeCase } from "@/types";
import type { MatchResult } from "@/components/simulation-flow";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, X, Plus, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CanonicalElement {
  id: string;
  text: string;
  importance: "key" | "supporting" | "minor";
  category: "history" | "exam";
}

interface GatherStepProps {
  practiceCase: PracticeCase;
  initialHistoryEntries: string[];
  initialExamEntries: string[];
  previousMatches?: {
    history: MatchResult[];
    exam: MatchResult[];
  };
  onComplete: (
    historyEntries: string[],
    examEntries: string[],
    historyMatches: MatchResult[],
    examMatches: MatchResult[],
  ) => void;
  logEvent: (event_type: string, event_data: Record<string, unknown>) => void;
}

function extractCanonicalElements(fullCaseData: Record<string, unknown>): CanonicalElement[] {
  const elements: CanonicalElement[] = [];
  const osce = fullCaseData.OSCE_Examination as Record<string, unknown> | undefined;
  if (!osce) return elements;

  // Extract from Patient_Actor
  const patient = osce.Patient_Actor as Record<string, unknown> | undefined;
  if (patient) {
    // Symptoms
    const symptoms = patient.Symptoms as Record<string, unknown> | undefined;
    if (symptoms) {
      if (symptoms.Primary_Symptom) {
        elements.push({
          id: `symptom-primary`,
          text: symptoms.Primary_Symptom as string,
          importance: "key",
          category: "history",
        });
      }
      if (Array.isArray(symptoms.Secondary_Symptoms)) {
        (symptoms.Secondary_Symptoms as string[]).forEach((s, i) => {
          elements.push({
            id: `symptom-secondary-${i}`,
            text: s,
            importance: "supporting",
            category: "history",
          });
        });
      }
    }

    // PMH
    const pmh = patient.Past_Medical_History as string | undefined;
    if (pmh && pmh !== "No significant past medical history." && pmh.length > 10) {
      elements.push({
        id: "pmh",
        text: `Past medical history: ${pmh}`,
        importance: "supporting",
        category: "history",
      });
    }

    // Social History
    const shx = patient.Social_History as string | undefined;
    if (shx && shx.length > 10) {
      elements.push({
        id: "social-hx",
        text: `Social history: ${shx}`,
        importance: "minor",
        category: "history",
      });
    }

    // Review of Systems
    const ros = patient.Review_of_Systems as string | undefined;
    if (ros && ros.length > 10) {
      elements.push({
        id: "ros",
        text: `Review of systems: ${ros}`,
        importance: "minor",
        category: "history",
      });
    }
  }

  // Extract from Physical_Examination_Findings
  const exam = osce.Physical_Examination_Findings as Record<string, unknown> | undefined;
  if (exam) {
    function extractExamFindings(obj: Record<string, unknown>, prefix: string) {
      for (const [key, val] of Object.entries(obj)) {
        if (key === "Vital_Signs") continue; // Already shown in Step 1
        const label = key.replace(/_/g, " ");
        if (typeof val === "string" && val.length > 5) {
          elements.push({
            id: `exam-${prefix}-${key}`.toLowerCase(),
            text: `${label}: ${val}`,
            importance: "key",
            category: "exam",
          });
        } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          extractExamFindings(val as Record<string, unknown>, `${prefix}-${key}`);
        }
      }
    }
    extractExamFindings(exam, "");
  }

  return elements;
}

export function GatherStep({
  practiceCase,
  initialHistoryEntries,
  initialExamEntries,
  previousMatches,
  onComplete,
  logEvent,
}: GatherStepProps) {
  const [historyEntries, setHistoryEntries] = useState<string[]>(initialHistoryEntries);
  const [examEntries, setExamEntries] = useState<string[]>(initialExamEntries);
  const [historyInput, setHistoryInput] = useState("");
  const [examInput, setExamInput] = useState("");
  const [matching, setMatching] = useState(false);
  const [reviewed, setReviewed] = useState(!!previousMatches);
  const [historyMatches, setHistoryMatches] = useState<MatchResult[]>(previousMatches?.history || []);
  const [examMatches, setExamMatches] = useState<MatchResult[]>(previousMatches?.exam || []);
  const historyInputRef = useRef<HTMLInputElement>(null);
  const examInputRef = useRef<HTMLInputElement>(null);

  function addHistoryEntry() {
    const trimmed = historyInput.trim();
    if (!trimmed || historyEntries.includes(trimmed)) return;
    setHistoryEntries((prev) => [...prev, trimmed]);
    setHistoryInput("");
    logEvent("gather_history_added", { text: trimmed });
    historyInputRef.current?.focus();
  }

  function addExamEntry() {
    const trimmed = examInput.trim();
    if (!trimmed || examEntries.includes(trimmed)) return;
    setExamEntries((prev) => [...prev, trimmed]);
    setExamInput("");
    logEvent("gather_exam_added", { text: trimmed });
    examInputRef.current?.focus();
  }

  function removeHistory(index: number) {
    setHistoryEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExam(index: number) {
    setExamEntries((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitAndReview() {
    if (historyEntries.length === 0 && examEntries.length === 0) return;
    setMatching(true);

    const canonical = extractCanonicalElements(practiceCase.full_case_data);
    const historyElements = canonical.filter((e) => e.category === "history");
    const examElements = canonical.filter((e) => e.category === "exam");

    try {
      const res = await fetch("/api/match-elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentHistoryEntries: historyEntries,
          studentExamEntries: examEntries,
          historyElements: historyElements.map((e) => ({
            id: e.id,
            text: e.text,
            importance: e.importance,
          })),
          examElements: examElements.map((e) => ({
            id: e.id,
            text: e.text,
            importance: e.importance,
          })),
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHistoryMatches(data.historyMatches || []);
      setExamMatches(data.examMatches || []);
    } catch {
      // Fallback: simple substring matching
      const hMatches = historyElements.map((el) => {
        const found = historyEntries.some(
          (entry) =>
            el.text.toLowerCase().includes(entry.toLowerCase()) ||
            entry.toLowerCase().includes(el.text.toLowerCase().split(":").pop()?.trim() || "")
        );
        return {
          elementId: el.id,
          elementText: el.text,
          importance: el.importance,
          status: found ? "matched" : "missed",
        } as MatchResult;
      });
      const eMatches = examElements.map((el) => {
        const found = examEntries.some(
          (entry) =>
            el.text.toLowerCase().includes(entry.toLowerCase()) ||
            entry.toLowerCase().includes(el.text.toLowerCase().split(":").pop()?.trim() || "")
        );
        return {
          elementId: el.id,
          elementText: el.text,
          importance: el.importance,
          status: found ? "matched" : "missed",
        } as MatchResult;
      });
      setHistoryMatches(hMatches);
      setExamMatches(eMatches);
    }

    setMatching(false);
    setReviewed(true);
  }

  function handleContinue() {
    onComplete(historyEntries, examEntries, historyMatches, examMatches);
  }

  const statusIcon = {
    matched: <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />,
    partial: <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />,
    missed: <XCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />,
  };

  const statusColor = {
    matched: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30",
    partial: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
    missed: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">History &amp; Exam</h2>
        <p className="text-sm text-muted-foreground">
          What history questions would you ask? What exam findings would you look for?
        </p>
      </div>

      {/* History Questions Input */}
      {!reviewed && (
        <>
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold">History Questions</h4>
              <div className="flex gap-2">
                <input
                  ref={historyInputRef}
                  type="text"
                  value={historyInput}
                  onChange={(e) => setHistoryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHistoryEntry()}
                  placeholder="e.g., Duration of symptoms, family history..."
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addHistoryEntry}
                  disabled={!historyInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {historyEntries.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {historyEntries.map((entry, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {entry}
                      <button
                        type="button"
                        onClick={() => removeHistory(i)}
                        className="rounded-full hover:bg-foreground/10 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {historyEntries.length} {historyEntries.length === 1 ? "item" : "items"}
              </p>
            </CardContent>
          </Card>

          {/* Exam Findings Input */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold">Exam Findings to Look For</h4>
              <div className="flex gap-2">
                <input
                  ref={examInputRef}
                  type="text"
                  value={examInput}
                  onChange={(e) => setExamInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addExamEntry()}
                  placeholder="e.g., Heart murmur, abdominal tenderness..."
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addExamEntry}
                  disabled={!examInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {examEntries.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {examEntries.map((entry, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {entry}
                      <button
                        type="button"
                        onClick={() => removeExam(i)}
                        className="rounded-full hover:bg-foreground/10 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {examEntries.length} {examEntries.length === 1 ? "item" : "items"}
              </p>
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmitAndReview}
            disabled={matching || (historyEntries.length === 0 && examEntries.length === 0)}
            className="w-full h-11"
            size="lg"
          >
            {matching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Matching...
              </>
            ) : (
              "Submit & Review"
            )}
          </Button>
        </>
      )}

      {/* Annotated Reveal */}
      {reviewed && (
        <>
          {historyMatches.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">History Review</h4>
                  <span className="text-xs text-muted-foreground">
                    {historyMatches.filter((m) => m.status === "matched").length}/{historyMatches.length} identified
                  </span>
                </div>
                <div className="space-y-2">
                  {historyMatches.map((match) => (
                    <div
                      key={match.elementId}
                      className={cn("rounded-lg border p-2.5 flex items-start gap-2", statusColor[match.status])}
                    >
                      {statusIcon[match.status]}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{match.elementText}</p>
                        {match.matchedText && match.status !== "missed" && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Matched: &ldquo;{match.matchedText}&rdquo;
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs shrink-0",
                          match.importance === "key" && "border-primary text-primary"
                        )}
                      >
                        {match.importance}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {examMatches.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Exam Review</h4>
                  <span className="text-xs text-muted-foreground">
                    {examMatches.filter((m) => m.status === "matched").length}/{examMatches.length} identified
                  </span>
                </div>
                <div className="space-y-2">
                  {examMatches.map((match) => (
                    <div
                      key={match.elementId}
                      className={cn("rounded-lg border p-2.5 flex items-start gap-2", statusColor[match.status])}
                    >
                      {statusIcon[match.status]}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{match.elementText}</p>
                        {match.matchedText && match.status !== "missed" && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Matched: &ldquo;{match.matchedText}&rdquo;
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs shrink-0",
                          match.importance === "key" && "border-primary text-primary"
                        )}
                      >
                        {match.importance}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleContinue} className="w-full h-11" size="lg">
            Continue to Differential
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </>
      )}
    </div>
  );
}
