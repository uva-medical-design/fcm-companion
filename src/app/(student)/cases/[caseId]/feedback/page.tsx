"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, FcmSubmission, FeedbackResult, AnswerKeyEntry } from "@/types";
import { VINDICATE_CATEGORIES } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackNarrative } from "@/components/feedback-narrative";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Sparkles,
  StickyNote,
  RotateCcw,
  Eye,
  Brain,
  Send,
  MessageSquare,
  BookOpen,
  GitBranch,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Clinical reasoning frameworks by chief complaint (Farah's design)
// 4 distinct visual renderers: quadrant, branch, danger, system
type FrameworkType = "quadrant" | "branch" | "danger" | "system";

interface QuadrantRegion { structures: string; dx: string[] }
interface BranchCategory { branches: Record<string, string[]> }
interface DangerCategory { color: string; dx: string[]; clue: string }
interface SystemCategory { dx: string[] }

interface ClinicalFramework {
  type: FrameworkType;
  title: string;
  subtitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

const REASONING_FRAMEWORKS: Record<string, ClinicalFramework> = {
  Cardiovascular: {
    type: "branch",
    title: "Cardiac vs. Non-Cardiac",
    subtitle: "First branch: Is this the heart, or something else?",
    data: {
      "Cardiac": {
        branches: {
          "ACS / Ischemic": ["STEMI", "NSTEMI", "Unstable Angina"],
          "Structural": ["Aortic Dissection", "Pericarditis", "Myocarditis"],
        },
      },
      "Non-Cardiac": {
        branches: {
          "Pulmonary": ["Pulmonary Embolism", "Pneumothorax", "Pneumonia"],
          "GI": ["GERD", "Esophageal Spasm"],
          "MSK": ["Costochondritis", "Rib Fracture"],
        },
      },
    },
  },
  Gastrointestinal: {
    type: "quadrant",
    title: "Think in Quadrants",
    subtitle: "Map diagnoses to anatomy \u2014 what lives in each quadrant?",
    data: {
      RUQ: { structures: "Liver \u00b7 Gallbladder \u00b7 Duodenum \u00b7 R. Kidney", dx: ["Cholecystitis", "Hepatitis", "Choledocholithiasis", "Duodenal Ulcer"] },
      LUQ: { structures: "Spleen \u00b7 Stomach \u00b7 Pancreas tail \u00b7 L. Kidney", dx: ["Splenic Rupture", "Gastric Ulcer", "Pancreatitis"] },
      RLQ: { structures: "Appendix \u00b7 Cecum \u00b7 R. Ovary \u00b7 R. Ureter", dx: ["Appendicitis", "Ectopic Pregnancy", "Ovarian Torsion", "Nephrolithiasis"] },
      LLQ: { structures: "Sigmoid \u00b7 L. Ovary \u00b7 L. Ureter", dx: ["Diverticulitis", "Ectopic Pregnancy", "Ovarian Torsion"] },
      Diffuse: { structures: "Peritoneum \u00b7 Mesentery \u00b7 Small Bowel", dx: ["SBO", "Mesenteric Ischemia", "Gastroenteritis", "Peritonitis"] },
    },
  },
  Musculoskeletal: {
    type: "danger",
    title: "Mono vs. Poly \u2014 Inflammatory vs. Non-Inflammatory",
    subtitle: "How many joints? Hot/swollen? Acute or chronic?",
    data: {
      "Monoarticular Acute": { color: "#ef4444", dx: ["Septic Arthritis", "Gout", "Pseudogout", "Hemarthrosis", "Fracture"], clue: "Always rule out septic joint \u2014 aspirate if hot, swollen, acute" },
      "Polyarticular Inflammatory": { color: "#f59e0b", dx: ["RA", "SLE", "Reactive Arthritis", "Psoriatic Arthritis"], clue: "Morning stiffness >30 min \u00b7 symmetric \u00b7 improves with activity" },
      "Non-Inflammatory": { color: "#3b82f6", dx: ["Osteoarthritis", "Fibromyalgia", "Tendinopathy", "Bursitis"], clue: "Worse with activity \u00b7 better with rest \u00b7 bony enlargement" },
    },
  },
  Neurological: {
    type: "danger",
    title: "Primary vs. Secondary",
    subtitle: "Rule out dangerous causes first \u2014 then pattern-match primary headaches",
    data: {
      "Secondary (Dangerous)": { color: "#ef4444", dx: ["Subarachnoid Hemorrhage", "Meningitis", "Intracranial Mass", "Temporal Arteritis", "Cerebral Venous Thrombosis"], clue: "Thunderclap \u00b7 worst ever \u00b7 fever + stiffness \u00b7 focal neuro \u00b7 papilledema" },
      "Primary (Benign)": { color: "#3b82f6", dx: ["Tension Headache", "Migraine", "Cluster Headache", "Medication Overuse"], clue: "Recurrent \u00b7 stereotyped pattern \u00b7 normal neuro exam" },
    },
  },
  Pulmonary: {
    type: "system",
    title: "Organ System Approach",
    subtitle: "SOB can come from lungs, heart, or neither \u2014 think broadly",
    data: {
      "Pulmonary": { dx: ["Asthma", "COPD", "Pneumonia", "PE", "Pneumothorax", "Pleural Effusion"] },
      "Cardiac": { dx: ["Heart Failure", "ACS", "Tamponade", "Valvular Disease", "Arrhythmia"] },
      "Hematologic": { dx: ["Anemia", "Methemoglobinemia", "CO Poisoning"] },
      "Other": { dx: ["Anxiety", "Metabolic Acidosis", "Neuromuscular Weakness"] },
    },
  },
  Syncope: {
    type: "branch",
    title: "Reflex \u2192 Cardiac \u2192 Orthostatic",
    subtitle: "Three buckets: most is benign, but cardiac syncope kills",
    data: {
      "Reflex (Benign)": { branches: { "Vasovagal": ["Emotional trigger", "Prolonged standing"], "Situational": ["Cough syncope", "Micturition syncope"] } },
      "Cardiac": { branches: { "Arrhythmia": ["VT/VF", "Heart Block", "Long QT", "Brugada"], "Structural": ["Aortic Stenosis", "HOCM", "PE", "Tamponade"] } },
      "Orthostatic": { branches: { "Volume": ["Dehydration", "Hemorrhage"], "Autonomic": ["Diabetic Neuropathy", "Medications"] } },
    },
  },
};

// Extract all diagnoses from a framework for matching
function getFrameworkDiagnoses(framework: ClinicalFramework): string[] {
  const all: string[] = [];
  for (const val of Object.values(framework.data)) {
    if (val.dx) all.push(...val.dx);
    if (val.branches) {
      for (const items of Object.values(val.branches) as string[][]) {
        all.push(...items);
      }
    }
  }
  return all;
}

// 4 Framework Renderers (Farah's design)
function QuadrantRenderer({ data, studentSet }: { data: Record<string, QuadrantRegion>; studentSet: Set<string> }) {
  const order = ["LUQ", "RUQ", "LLQ", "RLQ", "Diffuse"];
  return (
    <div className="grid grid-cols-2 gap-2">
      {order.map((key) => {
        const region = data[key] as QuadrantRegion;
        if (!region) return null;
        return (
          <div key={key} className={cn("rounded-xl border bg-accent/30 p-3", key === "Diffuse" && "col-span-2")}>
            <p className="font-bold text-sm text-primary">{key}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{region.structures}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {region.dx.map((d) => {
                const hit = studentSet.has(d.toLowerCase());
                return (
                  <span key={d} className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full border",
                    hit
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 font-semibold"
                      : "bg-background border-border text-muted-foreground"
                  )}>
                    {hit && "\u2713 "}{d}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BranchRenderer({ data, studentSet }: { data: Record<string, BranchCategory>; studentSet: Set<string> }) {
  return (
    <div className="space-y-2.5">
      {Object.entries(data).map(([cat, info]) => (
        <div key={cat} className="rounded-xl border bg-accent/30 p-3">
          <p className="font-bold text-sm text-primary mb-1.5">{cat}</p>
          {info.branches && Object.entries(info.branches).map(([sub, items]) => (
            <div key={sub} className="mb-1.5 ml-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                <span className="opacity-50">\u251c\u2500</span> {sub}
              </p>
              <div className="flex flex-wrap gap-1 ml-3.5">
                {(items as string[]).map((d) => {
                  const hit = studentSet.has(d.toLowerCase());
                  return (
                    <span key={d} className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full border",
                      hit
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 font-semibold"
                        : "bg-background border-border text-muted-foreground"
                    )}>
                      {hit && "\u2713 "}{d}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DangerRenderer({ data, studentSet }: { data: Record<string, DangerCategory>; studentSet: Set<string> }) {
  return (
    <div className="space-y-2.5">
      {Object.entries(data).map(([cat, info]) => {
        const isDanger = info.color === "#ef4444";
        return (
          <div key={cat} className={cn(
            "rounded-xl border p-3",
            isDanger
              ? "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10"
              : info.color === "#f59e0b"
                ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10"
                : "border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/10"
          )}>
            <p className={cn("font-bold text-sm mb-0.5", isDanger ? "text-red-700 dark:text-red-400" : info.color === "#f59e0b" ? "text-amber-700 dark:text-amber-400" : "text-blue-700 dark:text-blue-400")}>
              {cat}
            </p>
            {info.clue && (
              <p className="text-[10px] text-muted-foreground italic mb-1.5">{info.clue}</p>
            )}
            <div className="flex flex-wrap gap-1">
              {info.dx.map((d) => {
                const hit = studentSet.has(d.toLowerCase());
                return (
                  <span key={d} className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full border",
                    hit
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 font-semibold"
                      : "bg-background border-border text-muted-foreground"
                  )}>
                    {hit && "\u2713 "}{d}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SystemRenderer({ data, studentSet }: { data: Record<string, SystemCategory>; studentSet: Set<string> }) {
  return (
    <div className="space-y-2.5">
      {Object.entries(data).map(([sys, info]) => (
        <div key={sys} className="rounded-xl border bg-accent/30 p-3">
          <p className="font-bold text-sm text-primary mb-1.5">{sys}</p>
          <div className="flex flex-wrap gap-1">
            {info.dx.map((d) => {
              const hit = studentSet.has(d.toLowerCase());
              return (
                <span key={d} className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full border",
                  hit
                    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 font-semibold"
                    : "bg-background border-border text-muted-foreground"
                )}>
                  {hit && "\u2713 "}{d}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const frameworkRenderers: Record<FrameworkType, React.ComponentType<{ data: Record<string, unknown>; studentSet: Set<string> }>> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quadrant: QuadrantRenderer as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  branch: BranchRenderer as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  danger: DangerRenderer as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  system: SystemRenderer as any,
};

function findFramework(caseData: FcmCase | null): ClinicalFramework | null {
  if (!caseData) return null;
  if (caseData.body_system && REASONING_FRAMEWORKS[caseData.body_system]) {
    return REASONING_FRAMEWORKS[caseData.body_system];
  }
  const cc = (caseData.chief_complaint || "").toLowerCase();
  if (cc.includes("chest pain")) return REASONING_FRAMEWORKS.Cardiovascular;
  if (cc.includes("abdominal") || cc.includes("belly")) return REASONING_FRAMEWORKS.Gastrointestinal;
  if (cc.includes("headache")) return REASONING_FRAMEWORKS.Neurological;
  if (cc.includes("joint") || cc.includes("knee") || cc.includes("hip")) return REASONING_FRAMEWORKS.Musculoskeletal;
  if (cc.includes("breath") || cc.includes("dyspnea") || cc.includes("sob")) return REASONING_FRAMEWORKS.Pulmonary;
  if (cc.includes("syncope") || cc.includes("faint")) return REASONING_FRAMEWORKS.Syncope;
  return null;
}

function DiagnosisLink({ term }: { term: string }) {
  return (
    <a
      href={`https://www.statpearls.com/point-of-care/${encodeURIComponent(term)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors"
    >
      {term}
    </a>
  );
}

function VindicateBadge({ category }: { category: string }) {
  const cat = VINDICATE_CATEGORIES.find((c) => c.key === category);
  if (!cat) return null;
  return (
    <span className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
      {cat.key === "I2" ? "I" : cat.key}
    </span>
  );
}

export default function FeedbackPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useUser();
  const router = useRouter();
  const [caseData, setCaseData] = useState<FcmCase | null>(null);
  const [submission, setSubmission] = useState<FcmSubmission | null>(null);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExpert, setShowExpert] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [topicFreeText, setTopicFreeText] = useState("");
  const [topicsSent, setTopicsSent] = useState(false);
  const [sendingTopics, setSendingTopics] = useState(false);
  // Quick takeaway
  const [takeaway, setTakeaway] = useState("");
  const [takeawaySaved, setTakeawaySaved] = useState(false);
  const [savingTakeaway, setSavingTakeaway] = useState(false);
  const [sessionDatePast, setSessionDatePast] = useState(false);
  const [showFramework, setShowFramework] = useState(false);
  const [hoveredBarSection, setHoveredBarSection] = useState<string | null>(null);

  async function generateFeedback() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user!.id, case_id: caseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate feedback");
      } else if (data.feedback) {
        setFeedback(data.feedback);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    }
    setGenerating(false);
  }

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const [caseResult, subResult, noteResult, captureResult] = await Promise.all([
        supabase.from("fcm_cases").select("*").eq("id", caseId).single(),
        supabase
          .from("fcm_submissions")
          .select("*")
          .eq("user_id", user!.id)
          .eq("case_id", caseId)
          .single(),
        supabase
          .from("fcm_notes")
          .select("content")
          .eq("user_id", user!.id)
          .eq("case_id", caseId)
          .eq("is_sent_to_instructor", true)
          .maybeSingle(),
        supabase
          .from("fcm_session_captures")
          .select("takeaway")
          .eq("user_id", user!.id)
          .eq("case_id", caseId)
          .maybeSingle(),
      ]);

      if (caseResult.data) {
        setCaseData(caseResult.data);
        // Check if session date is today or past
        // Look up schedule for this case
        const { data: scheduleData } = await supabase
          .from("fcm_schedule")
          .select("session_date")
          .eq("case_id", caseId)
          .limit(1)
          .maybeSingle();
        if (scheduleData?.session_date) {
          const sessionDate = new Date(scheduleData.session_date);
          setSessionDatePast(sessionDate <= new Date());
        } else {
          // No schedule — always show
          setSessionDatePast(true);
        }
      }

      // Check if topic vote already sent
      if (noteResult.data?.content?.includes("[TOPIC VOTE]")) {
        setTopicsSent(true);
      }

      // Check if takeaway already saved
      if (captureResult.data?.takeaway) {
        setTakeaway(captureResult.data.takeaway);
        setTakeawaySaved(true);
      }

      if (subResult.data) {
        setSubmission(subResult.data);
        if (subResult.data.feedback && subResult.data.feedback.ai_narrative) {
          setFeedback(subResult.data.feedback);
          setLoading(false);
          return;
        }
      }

      // Generate feedback if not cached
      if (subResult.data && !subResult.data.feedback?.ai_narrative) {
        setLoading(false);
        await generateFeedback();
      } else {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, caseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          No submission found. Build your differential first.
        </p>
        <Button variant="outline" onClick={() => router.push(`/cases/${caseId}`)}>
          Go to Case
        </Button>
      </div>
    );
  }

  const coveredCount = feedback
    ? Object.values(feedback.vindicate_coverage).filter(Boolean).length
    : 0;

  // Build reverse mapping: VINDICATE category → student diagnoses
  const categoryToDiagnoses: Record<string, string[]> = {};
  if (feedback?.diagnosis_categories) {
    for (const [diag, cat] of Object.entries(feedback.diagnosis_categories)) {
      if (!categoryToDiagnoses[cat]) categoryToDiagnoses[cat] = [];
      categoryToDiagnoses[cat].push(diag);
    }
  }

  // Group answer key by tier for expert view
  const answerKey = caseData?.differential_answer_key || [];
  const matchedDiagnoses = new Set([
    ...((feedback?.common_hit) || []),
    ...((feedback?.cant_miss_hit) || []),
    ...((feedback?.tiered_differential.most_likely) || []),
    ...((feedback?.tiered_differential.moderate) || []),
    ...((feedback?.tiered_differential.less_likely) || []),
    ...((feedback?.tiered_differential.unlikely_important) || []),
  ]);
  const tierOrder: { key: AnswerKeyEntry["tier"]; label: string }[] = [
    { key: "most_likely", label: "Most Likely" },
    { key: "moderate", label: "Moderate Likelihood" },
    { key: "less_likely", label: "Less Likely" },
    { key: "unlikely_important", label: "Unlikely but Important" },
  ];

  // Coverage bar: Matched / Only Yours / Missed (Farah's design)
  const matchedDxList = feedback ? [
    ...feedback.tiered_differential.most_likely,
    ...feedback.tiered_differential.moderate,
    ...feedback.tiered_differential.less_likely,
    ...feedback.tiered_differential.unlikely_important,
  ] : [];
  const studentOnlyList = feedback?.unmatched || [];
  const expertOnlyList = answerKey
    .map((e) => e.diagnosis)
    .filter((d) => !matchedDiagnoses.has(d));
  const coverageTotal = new Set([...matchedDxList, ...studentOnlyList, ...expertOnlyList]).size || 1;
  const coverageSections = [
    { key: "matched", label: "Matched", items: matchedDxList, pct: (matchedDxList.length / coverageTotal) * 100, colorClass: "bg-green-500", pillBg: "bg-green-50 dark:bg-green-950/30", pillBorder: "border-green-200 dark:border-green-800", pillText: "text-green-800 dark:text-green-200", barText: "text-white" },
    { key: "yours", label: "Only Yours", items: studentOnlyList, pct: (studentOnlyList.length / coverageTotal) * 100, colorClass: "bg-blue-500", pillBg: "bg-blue-50 dark:bg-blue-950/30", pillBorder: "border-blue-200 dark:border-blue-800", pillText: "text-blue-800 dark:text-blue-200", barText: "text-white" },
    { key: "missed", label: "Missed", items: expertOnlyList, pct: (expertOnlyList.length / coverageTotal) * 100, colorClass: "bg-muted", pillBg: "bg-muted", pillBorder: "border-border", pillText: "text-muted-foreground", barText: "text-muted-foreground" },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/cases/${caseId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to case
        </button>
        {caseData && (
          <h1 className="text-lg font-semibold">{caseData.chief_complaint}</h1>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          Your Feedback
        </p>
      </div>

      {generating && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Generating your feedback...</span>
          </CardContent>
        </Card>
      )}

      {error && !generating && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={generateFeedback}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {feedback && (
        <>
          {/* Positive Affirmation Banner */}
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-200">
                  {submission?.diagnoses?.length >= 5
                    ? "Impressive work — you built a thorough differential!"
                    : submission?.diagnoses?.length >= 3
                      ? "Nice job working through this case!"
                      : "Great start — every differential you build strengthens your clinical reasoning."}
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  You considered {submission?.diagnoses?.length || 0} diagnos{(submission?.diagnoses?.length || 0) === 1 ? "is" : "es"} across {coveredCount} VINDICATE categor{coveredCount === 1 ? "y" : "ies"}.
                  {feedback.cant_miss_hit.length > 0 && ` You caught ${feedback.cant_miss_hit.length} can\u2019t-miss diagnosis${feedback.cant_miss_hit.length === 1 ? "" : "es"}.`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Phase 1: AI Narrative */}
          <Card className="border-primary/30 bg-accent/30">
            <CardContent className="p-4">
              <FeedbackNarrative text={feedback.ai_narrative} />
            </CardContent>
          </Card>

          {/* Coverage Bar — Matched / Only Yours / Missed (Farah's design) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your Coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Stacked bar */}
              <div className="flex h-8 rounded-full overflow-hidden bg-muted">
                {coverageSections.map((s) => s.pct > 0 && (
                  <div
                    key={s.key}
                    className={cn("flex items-center justify-center text-[11px] font-semibold cursor-pointer transition-opacity", s.colorClass, s.barText)}
                    style={{ width: `${s.pct}%`, opacity: hoveredBarSection && hoveredBarSection !== s.key ? 0.4 : 1 }}
                    onMouseEnter={() => setHoveredBarSection(s.key)}
                    onMouseLeave={() => setHoveredBarSection(null)}
                  >
                    {s.pct > 12 ? s.items.length : ""}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex gap-4 flex-wrap">
                {coverageSections.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={cn("flex items-center gap-1.5 text-xs cursor-pointer transition-opacity", hoveredBarSection && hoveredBarSection !== s.key && "opacity-40")}
                    onMouseEnter={() => setHoveredBarSection(s.key)}
                    onMouseLeave={() => setHoveredBarSection(null)}
                  >
                    <span className={cn("w-2.5 h-2.5 rounded-full", s.colorClass)} />
                    <span><strong>{s.items.length}</strong> {s.label}</span>
                  </button>
                ))}
              </div>

              {/* Expanded pills for hovered section */}
              {hoveredBarSection && (
                <div className="rounded-lg bg-accent/50 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                    {coverageSections.find((s) => s.key === hoveredBarSection)?.label}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {coverageSections.find((s) => s.key === hoveredBarSection)?.items.map((d) => {
                      const sec = coverageSections.find((s) => s.key === hoveredBarSection)!;
                      return (
                        <span key={d} className={cn("text-[11px] px-2 py-0.5 rounded-full border", sec.pillBg, sec.pillBorder, sec.pillText)}>
                          {d}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Common / Can't-Miss stat boxes (integrated into coverage bar) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="group relative cursor-pointer">
                  <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-2 text-center transition-shadow group-hover:shadow-md">
                    <p className="text-xl font-extrabold text-green-800 dark:text-green-200">
                      {feedback.common_hit.length}/{feedback.common_hit.length + feedback.common_missed.length}
                    </p>
                    <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">Common</p>
                  </div>
                  {(feedback.common_hit.length > 0 || feedback.common_missed.length > 0) && (
                    <div className="hidden group-hover:block absolute top-full left-0 right-0 z-20 mt-1.5 rounded-xl bg-background border border-green-200 dark:border-green-800 shadow-lg p-3">
                      <p className="text-[10px] font-bold text-green-800 dark:text-green-200 uppercase tracking-wide mb-1.5">Common Diagnoses</p>
                      {feedback.common_hit.length > 0 && (
                        <div className={cn(feedback.common_missed.length > 0 && "mb-2")}>
                          <p className="text-[9px] font-semibold text-green-600 dark:text-green-400 mb-1">{"\u2713"} You got</p>
                          <div className="flex flex-wrap gap-1">
                            {feedback.common_hit.map((d) => (
                              <span key={d} className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 font-semibold">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {feedback.common_missed.length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold text-red-600 dark:text-red-400 mb-1">{"\u2717"} Missed</p>
                          <div className="flex flex-wrap gap-1">
                            {feedback.common_missed.map((d) => (
                              <span key={d} className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="group relative cursor-pointer">
                  <div className={cn(
                    "rounded-lg border p-2 text-center transition-shadow group-hover:shadow-md",
                    feedback.cant_miss_missed.length > 0
                      ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                      : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                  )}>
                    <p className={cn(
                      "text-xl font-extrabold",
                      feedback.cant_miss_missed.length > 0 ? "text-red-700 dark:text-red-400" : "text-green-800 dark:text-green-200"
                    )}>
                      {feedback.cant_miss_hit.length}/{feedback.cant_miss_hit.length + feedback.cant_miss_missed.length}
                    </p>
                    <p className={cn("text-[10px] font-medium", feedback.cant_miss_missed.length > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                      Can&apos;t-Miss
                    </p>
                  </div>
                  {(feedback.cant_miss_hit.length > 0 || feedback.cant_miss_missed.length > 0) && (
                    <div className="hidden group-hover:block absolute top-full left-0 right-0 z-20 mt-1.5 rounded-xl bg-background border border-border shadow-lg p-3">
                      <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1.5">Can&apos;t-Miss Diagnoses</p>
                      {feedback.cant_miss_hit.length > 0 && (
                        <div className={cn(feedback.cant_miss_missed.length > 0 && "mb-2")}>
                          <p className="text-[9px] font-semibold text-green-600 dark:text-green-400 mb-1">{"\u2713"} You got</p>
                          <div className="flex flex-wrap gap-1">
                            {feedback.cant_miss_hit.map((d) => (
                              <span key={d} className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 font-semibold">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {feedback.cant_miss_missed.length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold text-red-600 dark:text-red-400 mb-1">{"\u26A0"} Missed — don&apos;t forget these</p>
                          <div className="flex flex-wrap gap-1">
                            {feedback.cant_miss_missed.map((d) => (
                              <span key={d} className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 font-semibold">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phase 1: VINDICATE Coverage Grid with diagnosis labels */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Category Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {VINDICATE_CATEGORIES.map((cat) => {
                  const covered = feedback.vindicate_coverage[cat.key];
                  const diagsInCat = categoryToDiagnoses[cat.key] || [];
                  return (
                    <div
                      key={cat.key}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border p-2 text-xs",
                        covered
                          ? "border-primary/30 bg-accent/50 text-accent-foreground"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md text-xs font-medium shrink-0",
                            covered
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {cat.key === "I2" ? "I" : cat.key}
                        </span>
                        <span className="truncate">{cat.label}</span>
                      </div>
                      {diagsInCat.length > 0 && (
                        <div className="pl-8 space-y-0.5">
                          {diagsInCat.map((d) => (
                            <p key={d} className="text-[10px] text-muted-foreground truncate">
                              {d}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Phase 1: Your Differential — Tiered */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your Differential</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedback.tiered_differential.most_likely.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Most Likely
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.tiered_differential.most_likely.map((d) => (
                      <Badge key={d} variant="success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {feedback.tiered_differential.moderate.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Moderate Likelihood
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.tiered_differential.moderate.map((d) => (
                      <Badge key={d} variant="secondary">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {feedback.tiered_differential.less_likely.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Less Likely
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.tiered_differential.less_likely.map((d) => (
                      <Badge key={d} variant="outline">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {feedback.tiered_differential.unlikely_important.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Unlikely but Important
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.tiered_differential.unlikely_important.map((d) => (
                      <Badge key={d} variant="warning">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {feedback.unmatched.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Additional (not in answer key)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.unmatched.map((d) => (
                      <Badge key={d} variant="outline">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinical Reasoning Framework (Farah's design — 4 typed renderers) */}
          {(() => {
            const framework = findFramework(caseData);
            if (!framework) return null;
            const Renderer = frameworkRenderers[framework.type];
            const studentDxSet = new Set(
              (submission?.diagnoses || []).map((d) => d.diagnosis.toLowerCase())
            );
            return (
              <Card>
                <CardHeader className="pb-2">
                  <button
                    type="button"
                    onClick={() => setShowFramework(!showFramework)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <CardTitle className="text-base flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      {framework.title}
                    </CardTitle>
                    {showFramework ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground mt-1">{framework.subtitle}</p>
                </CardHeader>
                {showFramework && (
                  <CardContent className="space-y-3">
                    <Renderer data={framework.data} studentSet={studentDxSet} />
                    <div className="flex gap-3 text-[10px] text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200">{"\u2713"} Listed</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-background border border-border text-muted-foreground">To consider</span>
                      </span>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })()}

          {/* Topics for Discussion */}
          <Card id="topics">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Topics for Discussion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topicsSent ? (
                <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Topics sent to your instructor
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    What would you like to discuss in the small group session?
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ...VINDICATE_CATEGORIES
                        .filter((cat) => !feedback.vindicate_coverage[cat.key])
                        .map((cat) => cat.label),
                      "Clinical reasoning",
                      "Physical exam approach",
                      "Patient communication",
                    ].map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() =>
                          setSelectedTopics((prev) => {
                            const next = new Set(prev);
                            if (next.has(topic)) next.delete(topic);
                            else next.add(topic);
                            return next;
                          })
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          selectedTopics.has(topic)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-accent"
                        )}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={topicFreeText}
                    onChange={(e) => setTopicFreeText(e.target.value)}
                    placeholder="Anything else you want to discuss? (optional)"
                    className="min-h-16 text-sm"
                    rows={2}
                  />
                  <Button
                    size="sm"
                    disabled={selectedTopics.size === 0 && !topicFreeText.trim() || sendingTopics}
                    onClick={async () => {
                      if (!user?.id) return;
                      setSendingTopics(true);
                      const topics = Array.from(selectedTopics).join(", ");
                      const freeText = topicFreeText.trim();
                      let content = `[TOPIC VOTE] ${topics}`;
                      if (freeText) content += ` | Free text: "${freeText}"`;
                      await fetch("/api/notes", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          user_id: user.id,
                          case_id: caseId,
                          content,
                          is_sent_to_instructor: true,
                        }),
                      });
                      setTopicsSent(true);
                      setSendingTopics(false);
                    }}
                  >
                    {sendingTopics ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Topics
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Phase 2 toggle — Expert Differential */}
          {!showExpert ? (
            <Button
              onClick={() => setShowExpert(true)}
              variant="outline"
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              Show Expert Differential
            </Button>
          ) : (
            <>
              {/* Enhanced expert view: full answer key by tier */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Expert Differential
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tierOrder.map(({ key: tier, label: tierLabel }) => {
                    const entries = answerKey.filter((e) => e.tier === tier);
                    if (entries.length === 0) return null;
                    return (
                      <div key={tier}>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          {tierLabel}
                        </p>
                        <div className="space-y-1.5">
                          {entries.map((entry) => {
                            const isMatched = matchedDiagnoses.has(entry.diagnosis);
                            return (
                              <div
                                key={entry.diagnosis}
                                className="flex items-center gap-2 text-xs"
                              >
                                {isMatched ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                                )}
                                <DiagnosisLink term={entry.diagnosis} />
                                <VindicateBadge category={entry.vindicate_category} />
                                {entry.is_common && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    common
                                  </Badge>
                                )}
                                {entry.is_cant_miss && (
                                  <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                    can&apos;t-miss
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Teaching Points */}
                  {caseData?.key_teaching_points && caseData.key_teaching_points.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Key Teaching Points
                      </p>
                      <ul className="space-y-1.5 text-xs">
                        {caseData.key_teaching_points.map((point, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary mt-0.5 shrink-0">-</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Fuzzy match corrections */}
              {feedback.fuzzy_matched && feedback.fuzzy_matched.length > 0 && (
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">Close Matches</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {feedback.fuzzy_matched.map((fm) => (
                      <div
                        key={fm.student}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>
                          &ldquo;{fm.student}&rdquo; matched to <span className="font-medium">{fm.matched_to}</span>
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Quick Takeaway */}
          {sessionDatePast && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Quick Takeaway
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {takeawaySaved ? (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Takeaway saved: &ldquo;{takeaway}&rdquo;
                    </p>
                  </div>
                ) : (
                  <>
                    <Textarea
                      value={takeaway}
                      onChange={(e) => setTakeaway(e.target.value)}
                      placeholder="What's one thing you'll remember from today's session?"
                      className="min-h-16 text-sm"
                      rows={2}
                    />
                    <Button
                      size="sm"
                      disabled={!takeaway.trim() || savingTakeaway}
                      onClick={async () => {
                        if (!user?.id) return;
                        setSavingTakeaway(true);
                        await fetch("/api/session-captures", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            user_id: user.id,
                            case_id: caseId,
                            takeaway: takeaway.trim(),
                          }),
                        });
                        setTakeawaySaved(true);
                        setSavingTakeaway(false);
                      }}
                    >
                      {savingTakeaway ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Save
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/notes")}
            >
              <StickyNote className="h-4 w-4 mr-1" />
              Add Notes
            </Button>
            <Button
              className="flex-1"
              onClick={() => router.push(`/cases/${caseId}/refresh`)}
            >
              <Brain className="h-4 w-4 mr-1" />
              Quick Quiz
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
