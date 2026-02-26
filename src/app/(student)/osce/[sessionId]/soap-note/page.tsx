"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { useOsceAutosave } from "@/lib/use-osce-autosave";
import type {
  OsceSession,
  DoorPrepData,
  RevisedDiagnosis,
  SoapNoteData,
  SoapContext,
} from "@/types";
import { OsceProgress } from "@/components/osce-progress";
import { DiagnosisInput } from "@/components/diagnosis-input";
import { RevisedDiagnosisRow } from "@/components/revised-diagnosis-row";
import { extractFindings } from "@/components/evidence-mapper";
import { HighlightableText } from "@/components/highlightable-text";
import type { Annotation, LinkedFinding } from "@/components/highlightable-text";
import { InstructionBanner } from "@/components/instruction-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OsceChatPanel } from "@/components/osce-chat-panel";
import type { OsceChatSessionContext } from "@/components/osce-chat-panel";
import {
  Loader2,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  Eye,
  Stethoscope,
  ClipboardCheck,
} from "lucide-react";
/** Color palette for diagnosis-evidence linking */
const LINK_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
];

export default function SoapNotePage() {
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<OsceSession | null>(null);
  const readOnly = session?.status === "completed";
  const [soapContext, setSoapContext] = useState<SoapContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState(false);
  const [diagnoses, setDiagnoses] = useState<RevisedDiagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjAnnotations, setSubjAnnotations] = useState<Annotation[]>([]);
  const [objAnnotations, setObjAnnotations] = useState<Annotation[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Click-selected diagnosis for evidence linking (persists until toggled off)
  const [activeDiagnosisIndex, setActiveDiagnosisIndex] = useState<number | null>(null);

  const diagnosisRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const soapData: SoapNoteData = {
    subjective_review: "",
    objective_review: "",
    diagnoses,
  };
  const { saveStatus } = useOsceAutosave(
    sessionId,
    "soap_note",
    soapData,
    !readOnly && diagnoses.length > 0
  );

  // Extract findings from S/O for evidence mapper
  const findings = useMemo(() => {
    if (!soapContext) return [];
    return extractFindings(soapContext.subjective, soapContext.objective);
  }, [soapContext]);

  // Build linked findings for the active diagnosis (color-coded underlines)
  const linkedFindings = useMemo((): LinkedFinding[] => {
    if (activeDiagnosisIndex === null || !diagnoses[activeDiagnosisIndex]) return [];
    const dx = diagnoses[activeDiagnosisIndex];
    const color = LINK_COLORS[activeDiagnosisIndex % LINK_COLORS.length];
    return dx.evidence.map((text) => ({ text, color }));
  }, [activeDiagnosisIndex, diagnoses]);

  // Current evidence for the active diagnosis (for highlight state)
  const activeEvidence = useMemo((): string[] => {
    if (activeDiagnosisIndex === null || !diagnoses[activeDiagnosisIndex]) return [];
    return diagnoses[activeDiagnosisIndex].evidence;
  }, [activeDiagnosisIndex, diagnoses]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/osce-session/${sessionId}`);
        if (!res.ok) {
          router.push("/osce");
          return;
        }
        const data = await res.json();
        const sess: OsceSession = data.session;
        setSession(sess);

        if (sess.status === "door_prep") {
          router.replace(`/osce/${sessionId}/door-prep`);
          return;
        }

        if (sess.soap_note) {
          const saved = sess.soap_note as SoapNoteData;
          if (saved.diagnoses?.length > 0) {
            setDiagnoses(saved.diagnoses);
          }
        } else if (sess.door_prep) {
          const doorPrep = sess.door_prep as DoorPrepData;
          if (doorPrep.diagnoses?.length > 0) {
            setDiagnoses(
              doorPrep.diagnoses.map((d, i) => ({
                diagnosis: d.diagnosis,
                evidence: [],
                assessment: "",
                diagnostic_plan: [],
                therapeutic_plan: [],
                sort_order: i,
              }))
            );
          }
        }

        setLoading(false);
        fetchSoapContext();
      } catch {
        router.push("/osce");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [sessionId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSoapContext() {
    setContextLoading(true);
    setContextError(false);
    try {
      const ctxRes = await fetch("/api/osce-soap-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (ctxRes.ok) {
        const ctx = await ctxRes.json();
        setSoapContext(ctx);
      } else {
        setContextError(true);
      }
    } catch {
      setContextError(true);
    } finally {
      setContextLoading(false);
    }
  }

  const addDiagnosis = useCallback((name: string) => {
    setDiagnoses((prev) => [
      ...prev,
      {
        diagnosis: name,
        evidence: [],
        assessment: "",
        diagnostic_plan: [],
        therapeutic_plan: [],
        sort_order: prev.length,
      },
    ]);
  }, []);

  function removeDiagnosis(i: number) {
    setDiagnoses((prev) => prev.filter((_, idx) => idx !== i));
    if (activeDiagnosisIndex === i) setActiveDiagnosisIndex(null);
    else if (activeDiagnosisIndex !== null && activeDiagnosisIndex > i) {
      setActiveDiagnosisIndex(activeDiagnosisIndex - 1);
    }
  }

  function moveDiagnosis(i: number, direction: "up" | "down") {
    setDiagnoses((prev) => {
      const arr = [...prev];
      const j = direction === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr.map((d, idx) => ({ ...d, sort_order: idx }));
    });
  }

  function updateDiagnosis(i: number, updated: RevisedDiagnosis) {
    setDiagnoses((prev) => prev.map((d, idx) => (idx === i ? updated : d)));
  }

  /** When a finding in S/O text is clicked, toggle it as evidence on the active diagnosis */
  function handleFindingToggle(findingText: string) {
    if (activeDiagnosisIndex === null || readOnly) return;
    const dx = diagnoses[activeDiagnosisIndex];
    if (!dx) return;

    const current = dx.evidence;
    if (current.includes(findingText)) {
      updateDiagnosis(activeDiagnosisIndex, {
        ...dx,
        evidence: current.filter((f) => f !== findingText),
      });
    } else {
      updateDiagnosis(activeDiagnosisIndex, {
        ...dx,
        evidence: [...current, findingText],
      });
    }
  }

  /** When a linked finding is clicked and no diagnosis is actively selected, scroll to its diagnosis */
  function handleLinkedFindingClick(findingText: string) {
    const idx = diagnoses.findIndex((d) =>
      d.evidence.some((e) => e.toLowerCase() === findingText.toLowerCase())
    );
    if (idx !== -1) {
      setActiveDiagnosisIndex(idx);
      const el = diagnosisRefs.current.get(idx);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary/50");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary/50"), 1500);
      }
    }
  }

  async function handleSubmit() {
    if (diagnoses.length === 0 || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/osce-session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soap_note: { subjective_review: "", objective_review: "", diagnoses },
          soap_submitted_at: new Date().toISOString(),
          status: "completed",
        }),
      });

      if (res.ok) {
        router.push(`/osce/${sessionId}/feedback`);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin-slow text-primary" />
      </div>
    );
  }

  const hasActiveDiagnosis = activeDiagnosisIndex !== null && !readOnly;

  const soContent = (
    <>
      {contextLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
          <Loader2 className="h-4 w-4 animate-spin-slow" />
          Loading findings...
        </div>
      ) : contextError ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Unable to load subjective findings.
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSoapContext}
            className="shrink-0 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      ) : soapContext ? (
        <div className="space-y-3">
          <InstructionBanner>
            {hasActiveDiagnosis
              ? `Click underlined findings to link them to "${diagnoses[activeDiagnosisIndex!].diagnosis}"`
              : "Select text to highlight or bold. Open a diagnosis's evidence section to start linking."}
          </InstructionBanner>

          {/* Subjective Card */}
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-blue-500" />
                <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">
                  Subjective
                </h4>
              </div>
              <HighlightableText
                text={soapContext.subjective}
                annotations={subjAnnotations}
                onChange={setSubjAnnotations}
                className="text-sm"
                linkedFindings={linkedFindings}
                onFindingClick={handleLinkedFindingClick}
                clickableFindings={hasActiveDiagnosis ? findings : undefined}
                onClickableFindingClick={hasActiveDiagnosis ? handleFindingToggle : undefined}
                selectedEvidence={hasActiveDiagnosis ? activeEvidence : undefined}
              />
            </CardContent>
          </Card>

          {/* Objective Card */}
          <Card className="border-l-4 border-l-teal-400">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-teal-500" />
                <h4 className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase">
                  Objective
                </h4>
              </div>
              <HighlightableText
                text={soapContext.objective}
                annotations={objAnnotations}
                onChange={setObjAnnotations}
                className="text-sm"
                linkedFindings={linkedFindings}
                onFindingClick={handleLinkedFindingClick}
                clickableFindings={hasActiveDiagnosis ? findings : undefined}
                onClickableFindingClick={hasActiveDiagnosis ? handleFindingToggle : undefined}
                selectedEvidence={hasActiveDiagnosis ? activeEvidence : undefined}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No S/O data available for this case.
        </p>
      )}
    </>
  );

  const diagnosesContent = (
    <>
      {/* Instructions (active only) */}
      {!readOnly && (
        <InstructionBanner>
          Revise your differential based on the encounter. For each diagnosis, map
          supporting evidence, write an assessment, and plan diagnostic workup and
          treatment.
        </InstructionBanner>
      )}

      {/* Add diagnosis (active only) */}
      {!readOnly && (
        <DiagnosisInput
          onAdd={addDiagnosis}
          existingDiagnoses={diagnoses.map((d) => d.diagnosis)}
        />
      )}

      {/* Revised diagnosis rows */}
      <div className="space-y-3">
        {diagnoses.map((d, i) => {
          const isActive = activeDiagnosisIndex === i;
          const color = LINK_COLORS[i % LINK_COLORS.length];
          return (
            <div
              key={`${d.diagnosis}-${i}`}
              ref={(el) => {
                if (el) diagnosisRefs.current.set(i, el);
                else diagnosisRefs.current.delete(i);
              }}
              className="rounded-lg transition-shadow"
              style={{
                boxShadow: isActive ? `0 0 0 2px ${color}` : undefined,
              }}
            >
              <RevisedDiagnosisRow
                diagnosis={d}
                index={i}
                total={diagnoses.length}
                findings={findings}
                disabled={readOnly}
                isLinking={isActive}
                onEvidenceFocus={(idx) => setActiveDiagnosisIndex(idx)}
                onRemove={removeDiagnosis}
                onMoveUp={(idx) => moveDiagnosis(idx, "up")}
                onMoveDown={(idx) => moveDiagnosis(idx, "down")}
                onUpdate={updateDiagnosis}
              />
            </div>
          );
        })}
      </div>

      {/* Save status (active only) */}
      {!readOnly && saveStatus !== "idle" && (
        <p className="text-xs text-muted-foreground text-center">
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && "Saved"}
          {saveStatus === "error" && "Save failed"}
        </p>
      )}

      {/* Submit (active only) */}
      {!readOnly && (
        <Button
          onClick={handleSubmit}
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
            <>
              Submit for Feedback
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      )}
    </>
  );

  const sessionContext: OsceChatSessionContext = {
    current_entries: diagnoses.length > 0
      ? `Revised diagnoses: ${diagnoses.map((d) => d.diagnosis).join(", ")}. ` +
        `Subjective review: ${soapContext?.subjective?.slice(0, 200) ?? "not yet reviewed"}. ` +
        `Objective review: ${soapContext?.objective?.slice(0, 200) ?? "not yet reviewed"}.`
      : "No revised diagnoses entered yet.",
  };

  return (
    <div className="flex gap-4 p-4 max-w-7xl mx-auto">
      <div className="flex-1 min-w-0 space-y-4">
        <OsceProgress currentPhase="soap_note" sessionId={sessionId} sessionCompleted={readOnly} />

        {/* Read-only banner or transition message */}
        {readOnly ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            <Eye className="h-3.5 w-3.5 shrink-0" />
            Viewing submitted SOAP note — read only
          </div>
        ) : (
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                You&apos;ve completed the patient encounter. Review the findings
                below, then revise your differential with supporting evidence and
                management plans.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Two-column layout on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left column: S/O (sticky on desktop) */}
          <div className="md:sticky md:top-4 md:self-start md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto space-y-3">
            {soContent}
          </div>

          {/* Right column: Diagnoses */}
          <div className="space-y-4">
            {diagnosesContent}
          </div>
        </div>
      </div>
      <OsceChatPanel
        sessionId={sessionId}
        phase="soap_note"
        sessionContext={sessionContext}
      />
    </div>
  );
}
