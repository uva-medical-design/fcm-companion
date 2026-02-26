"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, FcmSchedule, FcmSubmission } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpenCheck,
  Plus,
  Trash2,
  Clock,
  ExternalLink,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Stethoscope,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingState, EmptyState, ErrorState } from "@/components/empty-state";

// --- Static data ---

const VIDEOS_BY_SYSTEM: Record<string, { title: string; videoId: string }[]> = {
  Cardiovascular: [
    { title: "Cardiac Auscultation", videoId: "dBwr2GZCmQM" },
    { title: "JVP Assessment", videoId: "_QR9_pFt-Yk" },
    { title: "Peripheral Vascular Exam", videoId: "MFh0Fd99HQ8" },
  ],
  Gastrointestinal: [
    { title: "Abdominal Examination", videoId: "qTsjCZ9QxW8" },
    { title: "Liver Palpation", videoId: "7bTnQadYg1s" },
    { title: "Rectal Examination", videoId: "z_lBQCjJIA4" },
  ],
  Musculoskeletal: [
    { title: "Shoulder Examination", videoId: "MxwEBcVi_K4" },
    { title: "Knee Examination", videoId: "l7KdN1P0J-M" },
    { title: "Hand & Wrist Exam", videoId: "r8XqPSzxfhI" },
  ],
  Neurology: [
    { title: "Cranial Nerve Exam", videoId: "2Wl4a7nNzFQ" },
    { title: "Motor Examination", videoId: "K9C41S5hP-I" },
    { title: "Sensory Examination", videoId: "V3P6xQo2zts" },
  ],
  Pulmonology: [
    { title: "Lung Auscultation", videoId: "qs5MKyCqiP8" },
    { title: "Chest Percussion", videoId: "RRoxMwDFkXo" },
    { title: "Respiratory Assessment", videoId: "GYBc2WEznbA" },
  ],
};

const READINGS_BY_SYSTEM: Record<
  string,
  { title: string; source: string; readTime: string; url: string }[]
> = {
  Cardiovascular: [
    {
      title: "Acute Pericarditis — Diagnosis & Management",
      source: "NEJM",
      readTime: "12 min",
      url: "https://www.statpearls.com/point-of-care/27741",
    },
    {
      title: "Approach to Chest Pain",
      source: "StatPearls",
      readTime: "8 min",
      url: "https://www.statpearls.com/point-of-care/17844",
    },
  ],
  Gastrointestinal: [
    {
      title: "Acute Abdominal Pain Evaluation",
      source: "StatPearls",
      readTime: "10 min",
      url: "https://www.statpearls.com/point-of-care/17413",
    },
    {
      title: "Approach to the Patient with Abdominal Pain",
      source: "UpToDate",
      readTime: "15 min",
      url: "https://www.statpearls.com/point-of-care/22412",
    },
  ],
  Musculoskeletal: [
    {
      title: "Approach to Joint Pain",
      source: "StatPearls",
      readTime: "8 min",
      url: "https://www.statpearls.com/point-of-care/28579",
    },
    {
      title: "Septic Arthritis",
      source: "StatPearls",
      readTime: "10 min",
      url: "https://www.statpearls.com/point-of-care/30861",
    },
  ],
  Neurology: [
    {
      title: "Headache Assessment",
      source: "StatPearls",
      readTime: "10 min",
      url: "https://www.statpearls.com/point-of-care/22853",
    },
    {
      title: "Approach to the Patient with Headache",
      source: "NEJM",
      readTime: "12 min",
      url: "https://www.statpearls.com/point-of-care/22853",
    },
  ],
  Pulmonology: [
    {
      title: "Dyspnea Evaluation",
      source: "StatPearls",
      readTime: "8 min",
      url: "https://www.statpearls.com/point-of-care/21655",
    },
    {
      title: "Approach to the Patient with Dyspnea",
      source: "UpToDate",
      readTime: "12 min",
      url: "https://www.statpearls.com/point-of-care/21655",
    },
  ],
};

// --- Types ---

interface ScheduleCase {
  schedule: FcmSchedule;
  caseData: FcmCase;
  submission: FcmSubmission | null;
  daysUntilSession: number;
}

interface Maneuver {
  name: string;
  lookingFor: string;
}

interface PlanData {
  historyQs: string[];
  maneuvers: Maneuver[];
}

// --- Helpers ---

function getCountdownBadge(days: number) {
  if (days <= 0) return { label: "Today!", variant: "default" as const, className: "bg-green-600 hover:bg-green-700 text-white" };
  if (days === 1) return { label: "Tomorrow", variant: "warning" as const, className: "" };
  return { label: `${days} days away`, variant: "secondary" as const, className: "" };
}

function getChecklistKey(caseId: string) {
  return `fcm-checklist-${caseId}`;
}

function getWatchedKey() {
  return "fcm-videos-watched";
}

function loadChecklist(caseId: string): boolean[] {
  try {
    const stored = localStorage.getItem(getChecklistKey(caseId));
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [false, false, false, false];
}

function saveChecklist(caseId: string, items: boolean[]) {
  localStorage.setItem(getChecklistKey(caseId), JSON.stringify(items));
}

function loadWatchedVideos(): Set<string> {
  try {
    const stored = localStorage.getItem(getWatchedKey());
    if (stored) return new Set(JSON.parse(stored));
  } catch { /* ignore */ }
  return new Set();
}

function saveWatchedVideos(watched: Set<string>) {
  localStorage.setItem(getWatchedKey(), JSON.stringify([...watched]));
}

// --- Demo data ---

const DEMO_CASE: ScheduleCase = {
  schedule: {
    id: "demo-schedule",
    case_id: "demo-case",
    fcm_group: null,
    week_label: "Demo Week",
    unlock_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    session_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    semester: "Demo",
  },
  caseData: {
    id: "demo-case",
    case_id: "demo-case",
    title: "Chest Pain in Young Athlete",
    chief_complaint: "Chest Pain in Young Athlete",
    patient_name: "Demo Patient",
    patient_age: 22,
    patient_gender: "Male",
    vitals: {},
    body_system: "Cardiovascular",
    difficulty: "moderate",
    differential_answer_key: [],
    vindicate_categories: [],
    key_teaching_points: [],
    full_case_data: {},
    is_active: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  submission: null,
  daysUntilSession: 2,
};

// --- Collapsible Section ---

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{title}</span>
          {badge}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

// --- Main Page ---

export default function PlanPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scheduledCases, setScheduledCases] = useState<ScheduleCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");

  // Plan data
  const [historyQs, setHistoryQs] = useState<string[]>(["", "", "", "", ""]);
  const [maneuvers, setManeuvers] = useState<Maneuver[]>([
    { name: "", lookingFor: "" },
    { name: "", lookingFor: "" },
    { name: "", lookingFor: "" },
  ]);
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false, false]);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());

  // Save state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI suggestions
  const [aiLoading, setAiLoading] = useState(false);

  // Derived
  const selectedCase = scheduledCases.find((sc) => sc.caseData.id === selectedCaseId);
  const bodySystem = selectedCase?.caseData.body_system || "";
  const videos = VIDEOS_BY_SYSTEM[bodySystem] || [];
  const readings = READINGS_BY_SYSTEM[bodySystem] || [];

  // Fetch scheduled cases
  useEffect(() => {
    if (isDemo) {
      setScheduledCases([DEMO_CASE]);
      setSelectedCaseId(DEMO_CASE.caseData.id);
      setLoading(false);
      return;
    }

    if (!user) return;

    async function fetchCases() {
      try {
        const [schedulesRes, submissionsRes] = await Promise.all([
          supabase
            .from("fcm_schedule")
            .select("*, fcm_cases(*)")
            .or(`fcm_group.eq.${user!.fcm_group},fcm_group.is.null`)
            .order("session_date", { ascending: true }),
          supabase
            .from("fcm_submissions")
            .select("*")
            .eq("user_id", user!.id),
        ]);

        if (schedulesRes.error) throw schedulesRes.error;

        const now = new Date();
        const cases: ScheduleCase[] = (schedulesRes.data || []).map((s) => {
          const sessionDate = new Date(s.session_date + "T00:00:00");
          const daysUntil = Math.round(
            (sessionDate.getTime() - now.getTime()) / 86400000
          );
          const submission =
            submissionsRes.data?.find(
              (sub: FcmSubmission) => sub.case_id === s.case_id
            ) || null;
          return {
            schedule: s,
            caseData: s.fcm_cases,
            submission,
            daysUntilSession: daysUntil,
          };
        });

        setScheduledCases(cases);
        // Auto-select the nearest upcoming case
        const upcoming = cases.filter((c) => c.daysUntilSession >= 0);
        if (upcoming.length > 0) {
          setSelectedCaseId(upcoming[0].caseData.id);
        } else if (cases.length > 0) {
          setSelectedCaseId(cases[cases.length - 1].caseData.id);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchCases();
  }, [user, isDemo]);

  // Load plan data from localStorage + DB when case changes
  useEffect(() => {
    if (!selectedCaseId) return;

    // Load checklist from localStorage
    setChecklist(loadChecklist(selectedCaseId));
    setWatchedVideos(loadWatchedVideos());

    // Load plan data from Supabase (via notes)
    if (!isDemo && user) {
      supabase
        .from("fcm_notes")
        .select("*")
        .eq("user_id", user.id)
        .eq("case_id", selectedCaseId)
        .eq("is_starred", true)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.content) {
            try {
              const parsed = JSON.parse(data.content);
              if (parsed.__planv2) {
                const plan = parsed.__planv2 as PlanData;
                if (plan.historyQs?.length) setHistoryQs(plan.historyQs.map(q => String(q ?? "")));
                if (plan.maneuvers?.length) setManeuvers(plan.maneuvers.map(m => ({ name: String(m.name ?? ""), lookingFor: String(m.lookingFor ?? "") })));
              }
            } catch {
              // Not plan data, ignore
            }
          }
        });
    }

    // Check submission status for checklist item 4
    if (!isDemo && user) {
      supabase
        .from("fcm_submissions")
        .select("status")
        .eq("user_id", user.id)
        .eq("case_id", selectedCaseId)
        .maybeSingle()
        .then(({ data }) => {
          if (
            data?.status === "submitted" ||
            data?.status === "resubmitted"
          ) {
            setChecklist((prev) => {
              const next = [...prev];
              next[3] = true;
              saveChecklist(selectedCaseId, next);
              return next;
            });
          }
        });
    }
  }, [selectedCaseId, user, isDemo]);

  // Auto-compute checklist items 0-2 from data
  useEffect(() => {
    if (!selectedCaseId) return;

    setChecklist((prev) => {
      const next = [...prev];
      // Item 0: any video watched for this system
      const systemVideos = VIDEOS_BY_SYSTEM[bodySystem] || [];
      next[0] = systemVideos.some((v) => watchedVideos.has(v.videoId));
      // Item 1: any history question filled
      next[1] = historyQs.some((q) => (q || "").trim().length > 0);
      // Item 2: any maneuver filled
      next[2] = maneuvers.some((m) => (m.name || "").trim().length > 0);
      // Item 3 stays as-is (DB-driven)
      saveChecklist(selectedCaseId, next);
      return next;
    });
  }, [watchedVideos, historyQs, maneuvers, bodySystem, selectedCaseId]);

  // Debounced autosave to DB
  const autosave = useCallback(
    (qs: string[], mans: Maneuver[]) => {
      if (!user || !selectedCaseId || isDemo) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (saveResetRef.current) clearTimeout(saveResetRef.current);

      setSaveStatus("saving");

      saveTimerRef.current = setTimeout(async () => {
        try {
          const planData: PlanData = { historyQs: qs, maneuvers: mans };
          await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: user.id,
              case_id: selectedCaseId,
              content: JSON.stringify({ __planv2: planData }),
              is_starred: true,
            }),
          });
          setSaveStatus("saved");
          saveResetRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
          setSaveStatus("idle");
        }
      }, 1000);
    },
    [user, selectedCaseId, isDemo]
  );

  // History question handlers
  function updateHistoryQ(index: number, value: string) {
    const next = [...historyQs];
    next[index] = value;
    setHistoryQs(next);
    autosave(next, maneuvers);
  }

  function addHistoryQ() {
    const next = [...historyQs, ""];
    setHistoryQs(next);
    autosave(next, maneuvers);
  }

  function removeHistoryQ(index: number) {
    const next = historyQs.filter((_, i) => i !== index);
    setHistoryQs(next);
    autosave(next, maneuvers);
  }

  // Maneuver handlers
  function updateManeuver(index: number, field: keyof Maneuver, value: string) {
    const next = [...maneuvers];
    next[index] = { ...next[index], [field]: value };
    setManeuvers(next);
    autosave(historyQs, next);
  }

  function addManeuver() {
    const next = [...maneuvers, { name: "", lookingFor: "" }];
    setManeuvers(next);
    autosave(historyQs, next);
  }

  function removeManeuver(index: number) {
    const next = maneuvers.filter((_, i) => i !== index);
    setManeuvers(next);
    autosave(historyQs, next);
  }

  // Video tracking
  function handleWatchVideo(videoId: string) {
    const next = new Set(watchedVideos);
    next.add(videoId);
    setWatchedVideos(next);
    saveWatchedVideos(next);
    window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
  }

  // AI suggestions
  async function generateAiQuestions() {
    if (!selectedCase) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/plan-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chief_complaint: selectedCase.caseData.chief_complaint,
          body_system: selectedCase.caseData.body_system,
          patient_age: selectedCase.caseData.patient_age,
          patient_gender: selectedCase.caseData.patient_gender,
        }),
      });
      const data = await res.json();
      if (data.questions?.length) {
        const questions: string[] = data.questions.map(
          (q: { category: string; question: string }) =>
            `[${q.category}] ${q.question}`
        );
        setHistoryQs(questions);
        autosave(questions, maneuvers);
      }
    } catch {
      // Silently fail
    } finally {
      setAiLoading(false);
    }
  }

  // --- Progress bar ---
  const completedCount = checklist.filter(Boolean).length;
  const progressPct = (completedCount / 4) * 100;

  // --- Loading / Error states ---

  if (loading) {
    return <LoadingState message="Loading your cases..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load cases"
        description="Check your connection and try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (scheduledCases.length === 0) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Plan Ahead</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Prepare for your next FCM session
          </p>
        </div>
        <EmptyState
          icon={BookOpenCheck}
          title="No cases scheduled yet"
          description="Your instructor will add cases here as the course progresses. Check back soon."
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Plan Ahead</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prepare for your next FCM session
        </p>
      </div>

      {/* Case selector + countdown */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[280px]">
            <SelectValue placeholder="Select a case..." />
          </SelectTrigger>
          <SelectContent>
            {scheduledCases.map((sc) => (
              <SelectItem key={sc.caseData.id} value={sc.caseData.id}>
                {sc.caseData.chief_complaint}
                {sc.caseData.body_system ? ` (${sc.caseData.body_system})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedCase && (
          <Badge
            variant={getCountdownBadge(selectedCase.daysUntilSession).variant}
            className={cn(
              "shrink-0",
              getCountdownBadge(selectedCase.daysUntilSession).className
            )}
          >
            <Clock className="h-3 w-3 mr-1" />
            {getCountdownBadge(selectedCase.daysUntilSession).label}
          </Badge>
        )}

        {/* Save indicator */}
        {saveStatus !== "idle" && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-green-600" />
                Saved
              </>
            )}
          </span>
        )}
      </div>

      {selectedCase && (
        <>
          {/* Checklist + Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpenCheck className="h-4 w-4 text-primary" />
                Preparation Checklist
                <Badge variant="secondary" className="ml-auto">
                  {completedCount}/4
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Items */}
              <div className="space-y-2">
                {[
                  "Watch relevant exam videos",
                  "Write patient history questions",
                  "Plan physical exam maneuvers",
                  "Submit differential diagnosis",
                ].map((label, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      checklist[i]
                        ? "bg-green-50 dark:bg-green-950/30"
                        : "bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        checklist[i]
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {checklist[i] && <Check className="h-3 w-3" />}
                    </div>
                    <span
                      className={cn(
                        checklist[i] && "text-muted-foreground line-through"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* History Questions */}
          <CollapsibleSection
            title="History Questions"
            icon={BookOpen}
            defaultOpen
            badge={
              historyQs.filter((q) => (q || "").trim()).length > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  {historyQs.filter((q) => (q || "").trim()).length} written
                </Badge>
              ) : null
            }
          >
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Plan the history questions you want to ask this patient. Think
                about what information will help you narrow your differential.
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={generateAiQuestions}
                disabled={aiLoading}
                className="w-full sm:w-auto"
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                {aiLoading ? "Generating..." : "Suggest questions with AI"}
              </Button>

              {historyQs.map((q, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs text-muted-foreground pt-2.5 w-5 shrink-0 text-right">
                    {i + 1}.
                  </span>
                  <Textarea
                    value={q}
                    onChange={(e) => updateHistoryQ(i, e.target.value)}
                    placeholder={`Question ${i + 1}...`}
                    className="min-h-[40px] text-sm flex-1"
                    rows={1}
                  />
                  {historyQs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeHistoryQ(i)}
                      className="mt-1.5 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addHistoryQ}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Question
              </Button>
            </div>
          </CollapsibleSection>

          {/* Physical Exam Maneuvers */}
          <CollapsibleSection
            title="Physical Exam Maneuvers"
            icon={Stethoscope}
            defaultOpen
            badge={
              maneuvers.filter((m) => (m.name || "").trim()).length > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  {maneuvers.filter((m) => (m.name || "").trim()).length} planned
                </Badge>
              ) : null
            }
          >
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Plan which physical exam maneuvers you want to perform and what
                findings you expect.
              </p>

              {/* Column headers */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_32px] gap-2 px-0">
                <span className="text-xs font-medium text-muted-foreground pl-7">
                  Maneuver
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  What I&apos;m Looking For
                </span>
              </div>

              {maneuvers.map((m, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row gap-2 items-start"
                >
                  <span className="text-xs text-muted-foreground pt-2.5 w-5 shrink-0 text-right hidden sm:block">
                    {i + 1}.
                  </span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    <Textarea
                      value={m.name}
                      onChange={(e) =>
                        updateManeuver(i, "name", e.target.value)
                      }
                      placeholder="Maneuver name..."
                      className="min-h-[40px] text-sm"
                      rows={1}
                    />
                    <Textarea
                      value={m.lookingFor}
                      onChange={(e) =>
                        updateManeuver(i, "lookingFor", e.target.value)
                      }
                      placeholder="Expected finding..."
                      className="min-h-[40px] text-sm"
                      rows={1}
                    />
                  </div>
                  {maneuvers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeManeuver(i)}
                      className="mt-1.5 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addManeuver}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Maneuver
              </Button>
            </div>
          </CollapsibleSection>

          {/* Exam Videos */}
          {videos.length > 0 && (
            <CollapsibleSection
              title="Exam Videos"
              icon={Play}
              badge={
                <Badge variant="secondary" className="text-xs">
                  Stanford Medicine 25 &middot; {bodySystem}
                </Badge>
              }
            >
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Review these Stanford Medicine 25 videos to prepare your
                  physical exam technique.
                </p>
                {videos.map((v) => {
                  const isWatched = watchedVideos.has(v.videoId);
                  return (
                    <button
                      key={v.videoId}
                      onClick={() => handleWatchVideo(v.videoId)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
                        isWatched &&
                          "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          isWatched
                            ? "bg-green-600 text-white"
                            : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        )}
                      >
                        {isWatched ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </div>
                      <span className="flex-1">{v.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Recommended Reading */}
          {readings.length > 0 && (
            <CollapsibleSection
              title="Recommended Reading"
              icon={BookOpen}
              badge={
                <Badge variant="secondary" className="text-xs">
                  {bodySystem}
                </Badge>
              }
            >
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Review these articles to deepen your understanding of the
                  differential for this presentation.
                </p>
                {readings.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{r.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant={
                            r.source === "NEJM"
                              ? "default"
                              : r.source === "UpToDate"
                                ? "warning"
                                : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {r.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {r.readTime}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </a>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </>
      )}
    </div>
  );
}
