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
// Each framework uses a different visualization approach
interface FrameworkBranch {
  name: string;
  clue?: string;
  diagnoses: string[];
  danger?: boolean;
}

interface ClinicalFramework {
  title: string;
  subtitle: string;
  branches: FrameworkBranch[];
}

// Map both chief complaint keywords AND body systems to frameworks
const REASONING_FRAMEWORKS: Record<string, ClinicalFramework> = {
  // By body system (existing keys)
  Cardiovascular: {
    title: "Cardiac vs. Non-Cardiac",
    subtitle: "First branch: Is this the heart, or something else?",
    branches: [
      { name: "ACS / Ischemic", clue: "Substernal, exertional, radiates to arm/jaw, diaphoresis", diagnoses: ["STEMI", "NSTEMI", "Unstable Angina"], danger: true },
      { name: "Structural", clue: "Positional, friction rub, diffuse ST changes", diagnoses: ["Aortic Dissection", "Pericarditis", "Myocarditis"], danger: true },
      { name: "Pulmonary", clue: "Pleuritic, dyspnea, cough, unilateral", diagnoses: ["Pulmonary Embolism", "Pneumothorax", "Pneumonia"] },
      { name: "GI", clue: "Epigastric, postprandial, burning, positional", diagnoses: ["GERD", "Esophageal Spasm"] },
      { name: "MSK", clue: "Reproducible with palpation, recent activity", diagnoses: ["Costochondritis", "Rib Fracture"] },
    ],
  },
  Gastrointestinal: {
    title: "Think in Quadrants",
    subtitle: "Map diagnoses to anatomy — what lives in each region?",
    branches: [
      { name: "RUQ", clue: "Liver, Gallbladder, Duodenum, R. Kidney", diagnoses: ["Cholecystitis", "Hepatitis", "Choledocholithiasis", "Duodenal Ulcer"] },
      { name: "LUQ", clue: "Spleen, Stomach, Pancreas tail, L. Kidney", diagnoses: ["Splenic Rupture", "Gastric Ulcer", "Pancreatitis"] },
      { name: "RLQ", clue: "Appendix, Cecum, R. Ovary, R. Ureter", diagnoses: ["Appendicitis", "Ectopic Pregnancy", "Ovarian Torsion", "Nephrolithiasis"] },
      { name: "LLQ", clue: "Sigmoid, L. Ovary, L. Ureter", diagnoses: ["Diverticulitis", "Ectopic Pregnancy", "Ovarian Torsion"] },
      { name: "Diffuse", clue: "Peritoneum, Mesentery, Small Bowel", diagnoses: ["SBO", "Mesenteric Ischemia", "Gastroenteritis", "Peritonitis"], danger: true },
    ],
  },
  Musculoskeletal: {
    title: "Mono vs. Poly — Inflammatory vs. Non-Inflammatory",
    subtitle: "How many joints? Hot/swollen? Acute or chronic?",
    branches: [
      { name: "Monoarticular Acute", clue: "Always rule out septic joint — aspirate if hot, swollen, acute", diagnoses: ["Septic Arthritis", "Gout", "Pseudogout", "Hemarthrosis", "Fracture"], danger: true },
      { name: "Polyarticular Inflammatory", clue: "Morning stiffness >30 min, symmetric, improves with activity", diagnoses: ["RA", "SLE", "Reactive Arthritis", "Psoriatic Arthritis"] },
      { name: "Non-Inflammatory", clue: "Worse with activity, better with rest, bony enlargement", diagnoses: ["Osteoarthritis", "Fibromyalgia", "Tendinopathy", "Bursitis"] },
    ],
  },
  // By chief complaint keywords
  Neurological: {
    title: "Primary vs. Secondary",
    subtitle: "Rule out dangerous causes first — then pattern-match primary headaches",
    branches: [
      { name: "Secondary (Dangerous)", clue: "Thunderclap, worst ever, fever + stiffness, focal neuro, papilledema", diagnoses: ["Subarachnoid Hemorrhage", "Meningitis", "Intracranial Mass", "Temporal Arteritis", "Cerebral Venous Thrombosis"], danger: true },
      { name: "Primary (Benign)", clue: "Recurrent, stereotyped pattern, normal neuro exam", diagnoses: ["Tension Headache", "Migraine", "Cluster Headache", "Medication Overuse"] },
    ],
  },
  Pulmonary: {
    title: "Organ System Approach",
    subtitle: "SOB can come from lungs, heart, or neither — think broadly",
    branches: [
      { name: "Pulmonary", clue: "Wheezing, crackles, decreased breath sounds, pleuritic pain", diagnoses: ["Asthma", "COPD", "Pneumonia", "PE", "Pneumothorax", "Pleural Effusion"] },
      { name: "Cardiac", clue: "Orthopnea, PND, JVD, edema, S3 gallop", diagnoses: ["Heart Failure", "ACS", "Tamponade", "Valvular Disease", "Arrhythmia"], danger: true },
      { name: "Hematologic", clue: "Pallor, fatigue, tachycardia at rest", diagnoses: ["Anemia", "Methemoglobinemia", "CO Poisoning"] },
      { name: "Other", clue: "Hyperventilation, Kussmaul breathing, weakness", diagnoses: ["Anxiety", "Metabolic Acidosis", "Neuromuscular Weakness"] },
    ],
  },
};

// Also allow lookup by chief complaint text
function findFramework(caseData: FcmCase | null): ClinicalFramework | null {
  if (!caseData) return null;
  // Try body system first
  if (caseData.body_system && REASONING_FRAMEWORKS[caseData.body_system]) {
    return REASONING_FRAMEWORKS[caseData.body_system];
  }
  // Try chief complaint keywords
  const cc = (caseData.chief_complaint || "").toLowerCase();
  if (cc.includes("chest pain")) return REASONING_FRAMEWORKS.Cardiovascular;
  if (cc.includes("abdominal") || cc.includes("belly")) return REASONING_FRAMEWORKS.Gastrointestinal;
  if (cc.includes("headache")) return REASONING_FRAMEWORKS.Neurological;
  if (cc.includes("joint") || cc.includes("knee") || cc.includes("hip")) return REASONING_FRAMEWORKS.Musculoskeletal;
  if (cc.includes("breath") || cc.includes("dyspnea") || cc.includes("sob")) return REASONING_FRAMEWORKS.Pulmonary;
  if (cc.includes("syncope") || cc.includes("faint")) return REASONING_FRAMEWORKS.Cardiovascular;
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

          {/* Coverage Bar — visual progress indicator */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                VINDICATE Coverage — {coveredCount} of 9
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="flex gap-1 mb-1">
                {VINDICATE_CATEGORIES.map((cat) => {
                  const covered = feedback.vindicate_coverage[cat.key];
                  return (
                    <div
                      key={cat.key}
                      className={cn(
                        "h-3 flex-1 rounded-sm transition-colors",
                        covered
                          ? "bg-primary"
                          : "bg-muted"
                      )}
                      title={`${cat.key === "I2" ? "I (Iatrogenic)" : cat.key} — ${cat.label}${covered ? " ✓" : ""}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>V I N D I C A T E</span>
                <span>{Math.round((coveredCount / 9) * 100)}%</span>
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

          {/* Phase 1: Summary counts with expandable detail */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="group cursor-pointer hover:shadow-md transition-all">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {feedback.common_hit.length} of {feedback.common_hit.length + feedback.common_missed.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Common diagnoses</p>
                <div className="hidden group-hover:block mt-2 pt-2 border-t text-left space-y-1.5">
                  {feedback.common_hit.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-green-600 dark:text-green-400 mb-0.5">You got</p>
                      <div className="flex flex-wrap gap-1">
                        {feedback.common_hit.map((d) => (
                          <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {feedback.common_missed.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-red-600 dark:text-red-400 mb-0.5">Missed</p>
                      <div className="flex flex-wrap gap-1">
                        {feedback.common_missed.map((d) => (
                          <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className={cn(
              "group cursor-pointer hover:shadow-md transition-all",
              feedback.cant_miss_missed.length > 0 && "border-red-200 dark:border-red-900/50"
            )}>
              <CardContent className="p-4 text-center">
                <p className={cn(
                  "text-2xl font-bold",
                  feedback.cant_miss_missed.length > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-700 dark:text-green-400"
                )}>
                  {feedback.cant_miss_hit.length} of {feedback.cant_miss_hit.length + feedback.cant_miss_missed.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Can&apos;t-miss diagnoses</p>
                <div className="hidden group-hover:block mt-2 pt-2 border-t text-left space-y-1.5">
                  {feedback.cant_miss_hit.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-green-600 dark:text-green-400 mb-0.5">You got</p>
                      <div className="flex flex-wrap gap-1">
                        {feedback.cant_miss_hit.map((d) => (
                          <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {feedback.cant_miss_missed.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-red-600 dark:text-red-400 mb-0.5">Don&apos;t forget</p>
                      <div className="flex flex-wrap gap-1">
                        {feedback.cant_miss_missed.map((d) => (
                          <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Clinical Reasoning Framework (Farah's design) */}
          {(() => {
            const framework = findFramework(caseData);
            if (!framework) return null;
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
                    {framework.branches.map((branch) => {
                      const matchedInBranch = branch.diagnoses.filter((d) =>
                        matchedDiagnoses.has(d) ||
                        [...matchedDiagnoses].some((m) => m.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(m.toLowerCase()))
                      );
                      const hasCoverage = matchedInBranch.length > 0;
                      return (
                        <div
                          key={branch.name}
                          className={cn(
                            "rounded-lg border p-3 space-y-1.5",
                            hasCoverage
                              ? "border-primary/30 bg-accent/30"
                              : branch.danger
                                ? "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10"
                                : "border-border"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded",
                              hasCoverage
                                ? "bg-primary text-primary-foreground"
                                : branch.danger
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                  : "bg-muted text-muted-foreground"
                            )}>
                              {branch.danger && !hasCoverage ? "! " : ""}{branch.name}
                            </span>
                            {hasCoverage && (
                              <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            )}
                            {branch.danger && !hasCoverage && (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                            )}
                          </div>
                          {branch.clue && (
                            <p className="text-[11px] text-muted-foreground">
                              {branch.clue}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {branch.diagnoses.map((d) => {
                              const isHit = matchedInBranch.some(
                                (m) => m.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(m.toLowerCase())
                              ) || matchedDiagnoses.has(d);
                              return (
                                <span
                                  key={d}
                                  className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded border",
                                    isHit
                                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                                      : "bg-background border-border text-muted-foreground"
                                  )}
                                >
                                  {d}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-muted-foreground italic">
                      Green = you covered it. Red = high-danger category to consider. Explore uncovered branches to broaden your differential.
                    </p>
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
