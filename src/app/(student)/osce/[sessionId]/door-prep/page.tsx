"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useUser } from "@/lib/user-context";
import { useRouter } from "next/navigation";
import { PRACTICE_CASES } from "@/data/practice-cases";
import type { PracticeCase } from "@/types";
import type {
  OsceSession,
  DoorPrepData,
  DoorPrepDiagnosis,
} from "@/types/osce";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DiagnosisInput } from "@/components/diagnosis-input";
import { ConfidenceRating } from "@/components/confidence-rating";
import { OsceProgress } from "@/components/osce-progress";
import {
  Loader2,
  ArrowLeft,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  DoorOpen,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DoorPrepPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const { user } = useUser();
  const router = useRouter();
  const [session, setSession] = useState<OsceSession | null>(null);
  const [practiceCase, setPracticeCase] = useState<PracticeCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnoses, setDiagnoses] = useState<DoorPrepDiagnosis[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Whether viewing completed (read-only) session
  const isReadOnly = session?.status !== "door_prep";

  // Fetch session
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/osce-session/${sessionId}`);
        const data = await res.json();
        if (data.session) {
          const s = data.session as OsceSession;
          setSession(s);

          // Load practice case
          if (s.practice_case_id) {
            const pc = PRACTICE_CASES.find(
              (c) => c.id === s.practice_case_id
            );
            if (pc) setPracticeCase(pc);
          }

          // Load existing door prep data
          if (s.door_prep?.diagnoses) {
            setDiagnoses(s.door_prep.diagnoses);
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
  }, [sessionId]);

  // Autosave with debounce
  const autosave = useCallback(
    (data: DoorPrepData) => {
      if (isReadOnly) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/osce-session/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ door_prep: data }),
          });
        } catch (err) {
          console.error("Autosave failed:", err);
        }
      }, 500);
    },
    [sessionId, isReadOnly]
  );

  // Trigger autosave when diagnoses change
  useEffect(() => {
    if (!isReadOnly && diagnoses.length > 0) {
      autosave({ diagnoses });
    }
  }, [diagnoses, autosave, isReadOnly]);

  function addDiagnosis(name: string) {
    const newDx: DoorPrepDiagnosis = {
      id: crypto.randomUUID(),
      diagnosis: name,
      historyQuestions: [],
      peManeuvers: [],
      confidence: 3,
      sort_order: diagnoses.length,
    };
    setDiagnoses((prev) => [...prev, newDx]);
    setExpandedId(newDx.id);
  }

  function removeDiagnosis(id: string) {
    setDiagnoses((prev) =>
      prev.filter((d) => d.id !== id).map((d, i) => ({ ...d, sort_order: i }))
    );
    if (expandedId === id) setExpandedId(null);
  }

  function updateDiagnosis(
    id: string,
    updates: Partial<DoorPrepDiagnosis>
  ) {
    setDiagnoses((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  }

  function moveDiagnosis(id: string, direction: "up" | "down") {
    setDiagnoses((prev) => {
      const idx = prev.findIndex((d) => d.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const newArr = [...prev];
      [newArr[idx], newArr[newIdx]] = [newArr[newIdx], newArr[idx]];
      return newArr.map((d, i) => ({ ...d, sort_order: i }));
    });
  }

  function addListItem(
    id: string,
    field: "historyQuestions" | "peManeuvers",
    value: string
  ) {
    if (!value.trim()) return;
    setDiagnoses((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, [field]: [...d[field], value.trim()] } : d
      )
    );
  }

  function removeListItem(
    id: string,
    field: "historyQuestions" | "peManeuvers",
    index: number
  ) {
    setDiagnoses((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, [field]: d[field].filter((_, i) => i !== index) }
          : d
      )
    );
  }

  async function submitDoorPrep() {
    if (diagnoses.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      await fetch(`/api/osce-session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          door_prep: { diagnoses },
          door_prep_submitted_at: now,
          status: "soap_note",
        }),
      });
      router.push(`/osce/${sessionId}/soap-note`);
    } catch {
      setError("Failed to submit. Please try again.");
    }
    setSubmitting(false);
  }

  // Build door info from practice case
  function getDoorInfo() {
    if (!practiceCase) return null;
    const exam = practiceCase.full_case_data?.OSCE_Examination as Record<
      string,
      unknown
    > | null;
    const patientActor = exam?.Patient_Actor as Record<string, unknown> | null;

    return {
      chiefComplaint: practiceCase.chief_complaint,
      demographics: patientActor?.Demographics as string | undefined,
      age: practiceCase.patient_age,
      gender: practiceCase.patient_gender,
      vitals: practiceCase.vitals,
    };
  }

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

  const doorInfo = getDoorInfo();

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
        currentStep={session.status}
        onNavigate={(step) => {
          if (step === "soap_note" && session.status !== "door_prep") {
            router.push(`/osce/${sessionId}/soap-note`);
          }
        }}
      />

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-3">
          <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Viewing submitted work — read only
          </p>
        </div>
      )}

      {/* Door Card */}
      {doorInfo && (
        <Card className="border-primary/30 sticky top-14 z-10 bg-card/95 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DoorOpen className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase">
                Door Information
              </span>
            </div>
            <p className="text-sm font-semibold mb-2">
              {doorInfo.chiefComplaint}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {doorInfo.demographics && (
                <Badge variant="secondary">{doorInfo.demographics}</Badge>
              )}
              {!doorInfo.demographics && doorInfo.age && doorInfo.gender && (
                <Badge variant="secondary">
                  {doorInfo.age}yo {doorInfo.gender}
                </Badge>
              )}
              {practiceCase?.body_system && (
                <Badge variant="outline">{practiceCase.body_system}</Badge>
              )}
            </div>
            {/* Vitals */}
            {doorInfo.vitals && Object.keys(doorInfo.vitals).length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(doorInfo.vitals).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-medium">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diagnosis Builder */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">
          Initial Differential ({diagnoses.length})
        </h2>

        {!isReadOnly && (
          <DiagnosisInput
            onAdd={addDiagnosis}
            existingDiagnoses={diagnoses.map((d) => d.diagnosis)}
          />
        )}

        {diagnoses.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {isReadOnly
                ? "No diagnoses were submitted."
                : "Add your initial differential diagnoses above. For each, plan your history questions and PE maneuvers."}
            </CardContent>
          </Card>
        )}

        {diagnoses.map((dx, idx) => {
          const isExpanded = isReadOnly
            ? expandedId === dx.id
            : expandedId === dx.id || !isReadOnly;

          return (
            <DoorPrepDiagnosisCard
              key={dx.id}
              dx={dx}
              index={idx}
              total={diagnoses.length}
              isExpanded={isExpanded}
              isReadOnly={isReadOnly}
              onToggle={() =>
                setExpandedId(expandedId === dx.id ? null : dx.id)
              }
              onRemove={() => removeDiagnosis(dx.id)}
              onMoveUp={() => moveDiagnosis(dx.id, "up")}
              onMoveDown={() => moveDiagnosis(dx.id, "down")}
              onUpdateConfidence={(c) =>
                updateDiagnosis(dx.id, { confidence: c })
              }
              onAddHistoryQ={(v) =>
                addListItem(dx.id, "historyQuestions", v)
              }
              onRemoveHistoryQ={(i) =>
                removeListItem(dx.id, "historyQuestions", i)
              }
              onAddPE={(v) => addListItem(dx.id, "peManeuvers", v)}
              onRemovePE={(i) =>
                removeListItem(dx.id, "peManeuvers", i)
              }
            />
          );
        })}
      </div>

      {/* Submit */}
      {!isReadOnly && (
        <Button
          onClick={submitDoorPrep}
          disabled={diagnoses.length === 0 || submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            "Submit Door Prep & Continue to SOAP Note"
          )}
        </Button>
      )}
    </div>
  );
}

// Sub-component for a single Door Prep diagnosis card
function DoorPrepDiagnosisCard({
  dx,
  index,
  total,
  isExpanded,
  isReadOnly,
  onToggle,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateConfidence,
  onAddHistoryQ,
  onRemoveHistoryQ,
  onAddPE,
  onRemovePE,
}: {
  dx: DoorPrepDiagnosis;
  index: number;
  total: number;
  isExpanded: boolean;
  isReadOnly: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateConfidence: (c: number) => void;
  onAddHistoryQ: (v: string) => void;
  onRemoveHistoryQ: (i: number) => void;
  onAddPE: (v: string) => void;
  onRemovePE: (i: number) => void;
}) {
  const [historyInput, setHistoryInput] = useState("");
  const [peInput, setPeInput] = useState("");

  return (
    <Card className="py-3">
      <CardContent className="px-4 py-0 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2 min-w-0 flex-1 text-left"
          >
            <span className="text-xs text-muted-foreground font-medium shrink-0">
              {index + 1}.
            </span>
            <span className="text-sm font-medium truncate">
              {dx.diagnosis}
            </span>
            {isReadOnly && (
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0",
                  isExpanded && "rotate-180"
                )}
              />
            )}
          </button>
          {!isReadOnly && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onMoveUp}
                disabled={index === 0}
                className="h-7 w-7"
                aria-label="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onMoveDown}
                disabled={index === total - 1}
                className="h-7 w-7"
                aria-label="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                aria-label="Remove diagnosis"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="space-y-3 pt-1">
            {/* Confidence */}
            {isReadOnly ? (
              <div className="text-xs text-muted-foreground">
                Confidence: {dx.confidence}/5
              </div>
            ) : (
              <ConfidenceRating
                value={dx.confidence}
                onChange={onUpdateConfidence}
              />
            )}

            {/* History Questions */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                History Questions to Ask
              </p>
              {dx.historyQuestions.map((q, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-1.5"
                >
                  <span className="flex-1">{q}</span>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveHistoryQ(i)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {!isReadOnly && (
                <div className="flex gap-2">
                  <Input
                    value={historyInput}
                    onChange={(e) => setHistoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && historyInput.trim()) {
                        e.preventDefault();
                        onAddHistoryQ(historyInput);
                        setHistoryInput("");
                      }
                    }}
                    placeholder="e.g., Duration of symptoms?"
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (historyInput.trim()) {
                        onAddHistoryQ(historyInput);
                        setHistoryInput("");
                      }
                    }}
                    disabled={!historyInput.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* PE Maneuvers */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                PE Maneuvers to Perform
              </p>
              {dx.peManeuvers.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-1.5"
                >
                  <span className="flex-1">{m}</span>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => onRemovePE(i)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {!isReadOnly && (
                <div className="flex gap-2">
                  <Input
                    value={peInput}
                    onChange={(e) => setPeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && peInput.trim()) {
                        e.preventDefault();
                        onAddPE(peInput);
                        setPeInput("");
                      }
                    }}
                    placeholder="e.g., Auscultate lungs"
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (peInput.trim()) {
                        onAddPE(peInput);
                        setPeInput("");
                      }
                    }}
                    disabled={!peInput.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
