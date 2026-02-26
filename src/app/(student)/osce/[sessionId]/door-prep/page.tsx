"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { useOsceAutosave } from "@/lib/use-osce-autosave";
import type { OsceSession, DoorPrepDiagnosis, DoorPrepData, PracticeCase, FcmCase } from "@/types";
import { PRACTICE_CASES } from "@/data/practice-cases";
import { supabase } from "@/lib/supabase";
import { OsceProgress } from "@/components/osce-progress";
import { OsceChatPanel } from "@/components/osce-chat-panel";
import type { OsceChatSessionContext } from "@/components/osce-chat-panel";
import { DiagnosisInput } from "@/components/diagnosis-input";
import { DoorPrepDiagnosisRow } from "@/components/door-prep-diagnosis-row";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstructionBanner } from "@/components/instruction-banner";
import { Loader2, ClipboardList, ArrowRight, Eye } from "lucide-react";

export default function DoorPrepPage() {
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<OsceSession | null>(null);
  const [caseInfo, setCaseInfo] = useState<{
    chief_complaint: string;
    patient_name?: string | null;
    patient_age?: number | null;
    patient_gender?: string | null;
    vitals?: Record<string, string>;
    body_system?: string | null;
  } | null>(null);
  const [diagnoses, setDiagnoses] = useState<DoorPrepDiagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const readOnly = session?.status === "completed" || session?.status === "soap_note";

  const doorPrepData: DoorPrepData = { diagnoses };
  const { saveStatus } = useOsceAutosave(sessionId, "door_prep", doorPrepData, !readOnly && diagnoses.length > 0);

  // Load session and case info
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

        // Restore saved door prep data
        if (sess.door_prep) {
          const saved = sess.door_prep as DoorPrepData;
          if (saved.diagnoses?.length > 0) {
            setDiagnoses(saved.diagnoses);
          }
        }

        // Load case info
        if (sess.case_source === "practice" && sess.practice_case_id) {
          const pc = PRACTICE_CASES.find((c: PracticeCase) => c.id === sess.practice_case_id);
          if (pc) {
            setCaseInfo({
              chief_complaint: pc.chief_complaint,
              patient_age: pc.patient_age,
              patient_gender: pc.patient_gender,
              vitals: pc.vitals,
              body_system: pc.body_system,
            });
          }
        } else if (sess.case_id) {
          const { data: caseData } = await supabase
            .from("fcm_cases")
            .select("chief_complaint, patient_name, patient_age, patient_gender, vitals, body_system")
            .eq("id", sess.case_id)
            .single();
          if (caseData) setCaseInfo(caseData);
        }
      } catch {
        router.push("/osce");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [sessionId, router]);

  const addDiagnosis = useCallback(
    (name: string) => {
      setDiagnoses((prev) => [
        ...prev,
        {
          diagnosis: name,
          confidence: undefined,
          history_questions: [],
          pe_maneuvers: [],
          sort_order: prev.length,
        },
      ]);
    },
    []
  );

  function removeDiagnosis(i: number) {
    setDiagnoses((prev) => prev.filter((_, idx) => idx !== i));
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

  function updateDiagnosis(i: number, updated: DoorPrepDiagnosis) {
    setDiagnoses((prev) => prev.map((d, idx) => (idx === i ? updated : d)));
  }

  async function handleSubmit() {
    if (diagnoses.length === 0 || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/osce-session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          door_prep: { diagnoses },
          door_prep_submitted_at: new Date().toISOString(),
          status: "soap_note",
        }),
      });

      if (res.ok) {
        router.push(`/osce/${sessionId}/soap-note`);
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

  const sessionContext: OsceChatSessionContext = {
    chief_complaint: caseInfo?.chief_complaint,
    patient_age: caseInfo?.patient_age,
    patient_gender: caseInfo?.patient_gender,
    vitals: caseInfo?.vitals,
    current_entries: diagnoses.length > 0
      ? `Diagnoses: ${diagnoses.map((d) => d.diagnosis).join(", ")}. ` +
        `History questions: ${diagnoses.flatMap((d) => d.history_questions.filter((q) => q.trim())).join("; ") || "none"}. ` +
        `PE maneuvers: ${diagnoses.flatMap((d) => d.pe_maneuvers).join(", ") || "none"}.`
      : "No diagnoses entered yet.",
  };

  return (
    <div className="flex gap-4 p-4 max-w-5xl mx-auto">
      <div className="flex-1 min-w-0 space-y-4">
        <OsceProgress currentPhase="door_prep" sessionId={sessionId} sessionCompleted={readOnly} />

        {/* Door card — sticky so demographics stay visible while scrolling */}
        {caseInfo && (
          <Card className="border-primary/30 bg-accent/20 sticky top-2 z-10">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary uppercase">
                  Door Information
                </span>
              </div>
              <p className="text-sm font-medium">{caseInfo.chief_complaint}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {caseInfo.patient_name && (
                  <span className="font-medium">{caseInfo.patient_name}</span>
                )}
                {(caseInfo.patient_age || caseInfo.patient_gender) && (
                  <span>
                    {caseInfo.patient_age ? `${caseInfo.patient_age}yo` : ""}
                    {caseInfo.patient_age && caseInfo.patient_gender ? " " : ""}
                    {caseInfo.patient_gender ?? ""}
                  </span>
                )}
                {caseInfo.body_system && (
                  <Badge variant="outline" className="text-[10px]">
                    {caseInfo.body_system}
                  </Badge>
                )}
              </div>
              {caseInfo.vitals && Object.keys(caseInfo.vitals).length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                  {Object.entries(caseInfo.vitals).map(([key, val]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span> {val}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Read-only banner */}
        {readOnly && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            <Eye className="h-3.5 w-3.5 shrink-0" />
            Viewing submitted door prep — read only
          </div>
        )}

        {/* Instructions (active only) */}
        {!readOnly && (
          <InstructionBanner>
            Build your differential: for each diagnosis, list the history questions
            you would ask and the PE maneuvers you would perform.
          </InstructionBanner>
        )}

        {/* Diagnosis input (active only) */}
        {!readOnly && (
          <DiagnosisInput
            onAdd={addDiagnosis}
            existingDiagnoses={diagnoses.map((d) => d.diagnosis)}
          />
        )}

        {/* Diagnosis rows */}
        <div className="space-y-3">
          {diagnoses.map((d, i) => (
            <DoorPrepDiagnosisRow
              key={`${d.diagnosis}-${i}`}
              diagnosis={d}
              index={i}
              total={diagnoses.length}
              disabled={readOnly}
              onRemove={removeDiagnosis}
              onMoveUp={(idx) => moveDiagnosis(idx, "up")}
              onMoveDown={(idx) => moveDiagnosis(idx, "down")}
              onUpdate={updateDiagnosis}
            />
          ))}
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
                Continue to SOAP Note
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
      <OsceChatPanel
        sessionId={sessionId}
        phase="door_prep"
        sessionContext={sessionContext}
      />
    </div>
  );
}
