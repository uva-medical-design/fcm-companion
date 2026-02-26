"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useUser } from "@/lib/user-context";
import { useRouter } from "next/navigation";
import { PRACTICE_CASES } from "@/data/practice-cases";
import type { PracticeCase } from "@/types";
import type {
  OsceSession,
  SoapNoteData,
  RevisedDiagnosis,
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
  Stethoscope,
  Eye,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SoapNotePage({
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
  const [diagnoses, setDiagnoses] = useState<RevisedDiagnosis[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isReadOnly = session?.status === "completed";

  // Extract S/O from practice case
  function extractSubjectiveObjective(pc: PracticeCase): {
    subjective: string;
    objective: string;
  } {
    const exam = pc.full_case_data?.OSCE_Examination as Record<
      string,
      unknown
    > | null;
    if (!exam) return { subjective: "", objective: "" };

    const patientActor = exam.Patient_Actor as Record<string, unknown> | null;
    const peFindings = exam.Physical_Examination_Findings as Record<
      string,
      unknown
    > | null;
    const testResults = exam.Test_Results as Record<string, unknown> | null;

    // Build subjective from patient history
    let subjective = "";
    if (patientActor) {
      const parts: string[] = [];
      if (patientActor.History) parts.push(String(patientActor.History));
      if (patientActor.Past_Medical_History)
        parts.push(`PMH: ${patientActor.Past_Medical_History}`);
      if (patientActor.Social_History)
        parts.push(`Social: ${patientActor.Social_History}`);
      if (patientActor.Review_of_Systems)
        parts.push(`ROS: ${patientActor.Review_of_Systems}`);

      const symptoms = patientActor.Symptoms as Record<
        string,
        unknown
      > | null;
      if (symptoms?.Secondary_Symptoms) {
        const sec = symptoms.Secondary_Symptoms as string[];
        if (sec.length > 0) {
          parts.push(`Associated symptoms: ${sec.join(", ")}`);
        }
      }
      subjective = parts.join("\n\n");
    }

    // Build objective from PE findings + test results
    let objective = "";
    const objParts: string[] = [];

    if (peFindings) {
      function flattenObj(
        obj: Record<string, unknown>,
        prefix = ""
      ): string[] {
        const lines: string[] = [];
        for (const [key, val] of Object.entries(obj)) {
          const label = key.replace(/_/g, " ");
          if (typeof val === "string") {
            lines.push(`${prefix}${label}: ${val}`);
          } else if (typeof val === "object" && val !== null) {
            lines.push(
              ...flattenObj(val as Record<string, unknown>, `${label} - `)
            );
          }
        }
        return lines;
      }
      // Skip Vital_Signs since already shown on door card
      const peCopy = { ...peFindings };
      delete peCopy.Vital_Signs;
      const peLines = flattenObj(peCopy);
      if (peLines.length > 0) {
        objParts.push("Physical Exam:\n" + peLines.join("\n"));
      }
    }

    if (testResults) {
      function flattenTests(obj: Record<string, unknown>): string[] {
        const lines: string[] = [];
        for (const [key, val] of Object.entries(obj)) {
          const label = key.replace(/_/g, " ");
          if (typeof val === "string") {
            lines.push(`${label}: ${val}`);
          } else if (typeof val === "object" && val !== null) {
            const inner = val as Record<string, unknown>;
            if (inner.Findings) {
              lines.push(`${label}: ${inner.Findings}`);
            } else if (inner.Comments) {
              lines.push(`${label}: ${inner.Comments}`);
            } else {
              for (const [k2, v2] of Object.entries(inner)) {
                if (typeof v2 === "string") {
                  lines.push(`${label} - ${k2.replace(/_/g, " ")}: ${v2}`);
                } else if (typeof v2 === "object" && v2 !== null) {
                  const inner2 = v2 as Record<string, unknown>;
                  if (inner2.Findings) {
                    lines.push(
                      `${label} - ${k2.replace(/_/g, " ")}: ${inner2.Findings}`
                    );
                  }
                }
              }
            }
          }
        }
        return lines;
      }
      const testLines = flattenTests(testResults);
      if (testLines.length > 0) {
        objParts.push("Test Results:\n" + testLines.join("\n"));
      }
    }

    objective = objParts.join("\n\n");

    return { subjective, objective };
  }

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

          // Load existing SOAP note diagnoses or seed from door prep
          if (s.soap_note?.diagnoses) {
            setDiagnoses(s.soap_note.diagnoses);
          } else if (s.door_prep?.diagnoses) {
            // Pre-populate from door prep
            const seeded: RevisedDiagnosis[] = s.door_prep.diagnoses.map(
              (d) => ({
                id: d.id,
                diagnosis: d.diagnosis,
                supportingEvidence: [],
                diagnosticPlan: [],
                therapeuticPlan: [],
                confidence: d.confidence,
                sort_order: d.sort_order,
              })
            );
            setDiagnoses(seeded);
          }

          // Redirect if not yet ready for SOAP
          if (s.status === "door_prep") {
            router.push(`/osce/${sessionId}/door-prep`);
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

  // Autosave
  const autosave = useCallback(
    (updatedDiagnoses: RevisedDiagnosis[]) => {
      if (isReadOnly) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!practiceCase) return;
        const { subjective, objective } =
          extractSubjectiveObjective(practiceCase);
        try {
          await fetch(`/api/osce-session/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              soap_note: { subjective, objective, diagnoses: updatedDiagnoses },
            }),
          });
        } catch (err) {
          console.error("Autosave failed:", err);
        }
      }, 500);
    },
    [sessionId, isReadOnly, practiceCase]
  );

  useEffect(() => {
    if (!isReadOnly && diagnoses.length > 0) {
      autosave(diagnoses);
    }
  }, [diagnoses, autosave, isReadOnly]);

  function addDiagnosis(name: string) {
    const newDx: RevisedDiagnosis = {
      id: crypto.randomUUID(),
      diagnosis: name,
      supportingEvidence: [],
      diagnosticPlan: [],
      therapeuticPlan: [],
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

  function updateDiagnosis(id: string, updates: Partial<RevisedDiagnosis>) {
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
    field: "supportingEvidence" | "diagnosticPlan" | "therapeuticPlan",
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
    field: "supportingEvidence" | "diagnosticPlan" | "therapeuticPlan",
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

  async function submitSoapNote() {
    if (diagnoses.length === 0 || submitting || !practiceCase) return;
    setSubmitting(true);
    try {
      const { subjective, objective } =
        extractSubjectiveObjective(practiceCase);
      const now = new Date().toISOString();

      // Save SOAP note
      await fetch(`/api/osce-session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soap_note: { subjective, objective, diagnoses },
          soap_submitted_at: now,
        }),
      });

      // Generate feedback
      const feedbackRes = await fetch("/api/osce-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (feedbackRes.ok) {
        router.push(`/osce/${sessionId}/feedback`);
      } else {
        setError(
          "Feedback generation failed. Your work has been saved — you can try again."
        );
      }
    } catch {
      setError("Failed to submit. Please try again.");
    }
    setSubmitting(false);
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

  const soData = practiceCase
    ? extractSubjectiveObjective(practiceCase)
    : null;
  const hasExamData = soData && (soData.subjective || soData.objective);

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
          if (step === "door_prep") {
            router.push(`/osce/${sessionId}/door-prep`);
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

      {/* S/O Display */}
      {hasExamData ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium">
              Encounter Findings
            </h2>
          </div>

          {soData.subjective && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    S — Subjective
                  </Badge>
                </div>
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  {soData.subjective}
                </p>
              </CardContent>
            </Card>
          )}

          {soData.objective && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    O — Objective
                  </Badge>
                </div>
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  {soData.objective}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No structured exam data available for this case. Use your
              clinical judgment to revise your differential below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Revised Differential */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">
          Revised Differential ({diagnoses.length})
        </h2>
        <p className="text-xs text-muted-foreground">
          Review the encounter findings above. Revise your differential with
          supporting evidence, diagnostic plans, and therapeutic plans.
        </p>

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
                : "Your door prep diagnoses are pre-populated above. Revise them based on the encounter findings."}
            </CardContent>
          </Card>
        )}

        {diagnoses.map((dx, idx) => {
          const isExpanded = isReadOnly
            ? expandedId === dx.id
            : true;

          return (
            <SoapDiagnosisCard
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
              onAddEvidence={(v) =>
                addListItem(dx.id, "supportingEvidence", v)
              }
              onRemoveEvidence={(i) =>
                removeListItem(dx.id, "supportingEvidence", i)
              }
              onAddDiagPlan={(v) =>
                addListItem(dx.id, "diagnosticPlan", v)
              }
              onRemoveDiagPlan={(i) =>
                removeListItem(dx.id, "diagnosticPlan", i)
              }
              onAddTherapPlan={(v) =>
                addListItem(dx.id, "therapeuticPlan", v)
              }
              onRemoveTherapPlan={(i) =>
                removeListItem(dx.id, "therapeuticPlan", i)
              }
            />
          );
        })}
      </div>

      {/* Submit */}
      {!isReadOnly && (
        <Button
          onClick={submitSoapNote}
          disabled={diagnoses.length === 0 || submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating Feedback...
            </>
          ) : (
            "Submit SOAP Note & Get Feedback"
          )}
        </Button>
      )}
    </div>
  );
}

// Sub-component for a single SOAP diagnosis card
function SoapDiagnosisCard({
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
  onAddEvidence,
  onRemoveEvidence,
  onAddDiagPlan,
  onRemoveDiagPlan,
  onAddTherapPlan,
  onRemoveTherapPlan,
}: {
  dx: RevisedDiagnosis;
  index: number;
  total: number;
  isExpanded: boolean;
  isReadOnly: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateConfidence: (c: number) => void;
  onAddEvidence: (v: string) => void;
  onRemoveEvidence: (i: number) => void;
  onAddDiagPlan: (v: string) => void;
  onRemoveDiagPlan: (i: number) => void;
  onAddTherapPlan: (v: string) => void;
  onRemoveTherapPlan: (i: number) => void;
}) {
  const [evidenceInput, setEvidenceInput] = useState("");
  const [diagPlanInput, setDiagPlanInput] = useState("");
  const [therapPlanInput, setTherapPlanInput] = useState("");

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

            {/* Supporting Evidence */}
            <ListFieldSection
              label="Supporting Evidence"
              items={dx.supportingEvidence}
              inputValue={evidenceInput}
              setInputValue={setEvidenceInput}
              onAdd={onAddEvidence}
              onRemove={onRemoveEvidence}
              placeholder='e.g., "Patient reports 3-day history of..."'
              isReadOnly={isReadOnly}
              badgeColor="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400"
            />

            {/* Diagnostic Plan */}
            <ListFieldSection
              label="Diagnostic Plan"
              items={dx.diagnosticPlan}
              inputValue={diagPlanInput}
              setInputValue={setDiagPlanInput}
              onAdd={onAddDiagPlan}
              onRemove={onRemoveDiagPlan}
              placeholder="e.g., CBC, CMP, chest X-ray"
              isReadOnly={isReadOnly}
              badgeColor="bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
            />

            {/* Therapeutic Plan */}
            <ListFieldSection
              label="Therapeutic Plan"
              items={dx.therapeuticPlan}
              inputValue={therapPlanInput}
              setInputValue={setTherapPlanInput}
              onAdd={onAddTherapPlan}
              onRemove={onRemoveTherapPlan}
              placeholder="e.g., Start metformin 500mg BID"
              isReadOnly={isReadOnly}
              badgeColor="bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Reusable list field section for evidence/plans
function ListFieldSection({
  label,
  items,
  inputValue,
  setInputValue,
  onAdd,
  onRemove,
  placeholder,
  isReadOnly,
  badgeColor,
}: {
  label: string;
  items: string[];
  inputValue: string;
  setInputValue: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder: string;
  isReadOnly: boolean;
  badgeColor: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-2 text-sm rounded-lg px-3 py-1.5",
            badgeColor
          )}
        >
          <span className="flex-1">{item}</span>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="opacity-60 hover:opacity-100 shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {!isReadOnly && (
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValue.trim()) {
                e.preventDefault();
                onAdd(inputValue);
                setInputValue("");
              }
            }}
            placeholder={placeholder}
            className="text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (inputValue.trim()) {
                onAdd(inputValue);
                setInputValue("");
              }
            }}
            disabled={!inputValue.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
