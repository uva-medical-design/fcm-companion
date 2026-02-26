"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { VINDICATE_CATEGORIES } from "@/types";
import { supabase } from "@/lib/supabase";
import type { FcmCase } from "@/types";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardData {
  submission_count: number;
  total_students: number;
  diagnosis_frequency: { diagnosis: string; count: number }[];
  vindicate_coverage: Record<string, number>;
  cant_miss_details: { diagnosis: string; hit_count: number; total: number }[];
  vindicate_gaps: string[];
  diagnosis_by_tier: Record<string, { diagnosis: string; hit_count: number; total: number }[]>;
  sentiment_summary: Record<string, number>;
  suggested_focus: string[];
}

const SLIDE_COUNT = 4;
const AUTO_ADVANCE_MS = 15000;

export default function PresentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const caseId = searchParams.get("case_id");

  const [caseData, setCaseData] = useState<FcmCase | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!caseId) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const [caseResult, dashResult] = await Promise.all([
          supabase.from("fcm_cases").select("*").eq("id", caseId).single(),
          fetch(`/api/dashboard?case_id=${caseId}`).then((r) => r.json()),
        ]);
        if (caseResult.data) setCaseData(caseResult.data);
        if (dashResult && !dashResult.error) setData(dashResult);
      } catch (err) {
        console.error("Present page load error:", err);
      }
      setLoading(false);
    }
    load();
  }, [caseId]);

  // Auto-advance
  useEffect(() => {
    if (paused || !data) return;
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % SLIDE_COUNT);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused, data]);

  const prev = useCallback(() => {
    setPaused(true);
    setSlide((s) => (s - 1 + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  const next = useCallback(() => {
    setPaused(true);
    setSlide((s) => (s + 1) % SLIDE_COUNT);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") router.push("/dashboard");
      if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prev, next, router]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!caseId) {
    return (
      <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl">No case selected</p>
        <p className="text-sm text-slate-400">Select a case from the <button onClick={() => router.push("/dashboard")} className="underline hover:text-white">faculty dashboard</button> to launch presenter mode.</p>
      </div>
    );
  }

  if (!data || !caseData) {
    return (
      <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl">No data available</p>
        <p className="text-sm text-slate-400">Could not load case data. <button onClick={() => router.push("/dashboard")} className="underline hover:text-white">Return to dashboard</button></p>
      </div>
    );
  }

  const maxFreq = data.diagnosis_frequency[0]?.count || 1;
  // Build a set of answer key diagnosis names (lowercased) for highlighting
  const answerKeyNames = new Set(
    (caseData.differential_answer_key || []).map((e) => e.diagnosis.toLowerCase().trim())
  );
  const cantMissNames = new Set(
    (caseData.differential_answer_key || []).filter((e) => e.is_cant_miss).map((e) => e.diagnosis.toLowerCase().trim())
  );
  // Missed answer key diagnoses (not in student top responses)
  const studentDiagSet = new Set(data.diagnosis_frequency.map((d) => d.diagnosis.toLowerCase().trim()));
  const missedAnswerKey = (caseData.differential_answer_key || [])
    .filter((e) => !studentDiagSet.has(e.diagnosis.toLowerCase().trim()))
    .map((e) => e.diagnosis);

  const sentimentTotal = Object.values(data.sentiment_summary).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 bg-slate-900 text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-800/50 border-b border-slate-700">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{caseData.chief_complaint}</h1>
          <p className="text-sm text-slate-400">
            {data.submission_count} of {data.total_students} submitted
            {sentimentTotal > 0 && (
              <span className="ml-4 text-slate-500">
                {data.sentiment_summary.confident || 0} confident,{" "}
                {data.sentiment_summary.uncertain || 0} uncertain,{" "}
                {data.sentiment_summary.lost || 0} lost
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <button
                key={i}
                onClick={() => { setSlide(i); setPaused(true); }}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-colors",
                  i === slide ? "bg-white" : "bg-slate-600 hover:bg-slate-500"
                )}
              />
            ))}
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-600"
          >
            {paused ? "Auto" : "Pause"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            aria-label="Exit presentation"
            className="p-1.5 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center px-8 py-6 overflow-y-auto">
        <div className="w-full max-w-5xl">
          {slide === 0 && <Slide1Diagnoses
            frequency={data.diagnosis_frequency}
            maxFreq={maxFreq}
            answerKeyNames={answerKeyNames}
            cantMissNames={cantMissNames}
            missedAnswerKey={missedAnswerKey}
          />}
          {slide === 1 && <Slide2Vindicate
            coverage={data.vindicate_coverage}
            submissionCount={data.submission_count}
            gaps={data.vindicate_gaps}
          />}
          {slide === 2 && <Slide3CantMiss
            details={data.cant_miss_details}
          />}
          {slide === 3 && <Slide4Focus
            suggestedFocus={data.suggested_focus}
          />}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="fixed left-4 top-1/2 -translate-y-1/2 p-2 bg-slate-800/80 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="fixed right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-800/80 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}

// ─── Slide 1: What Did Everyone Think? ─────────────────────────────
function Slide1Diagnoses({
  frequency,
  maxFreq,
  answerKeyNames,
  cantMissNames,
  missedAnswerKey,
}: {
  frequency: { diagnosis: string; count: number }[];
  maxFreq: number;
  answerKeyNames: Set<string>;
  cantMissNames: Set<string>;
  missedAnswerKey: string[];
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center">What Did Everyone Think?</h2>
      <div className="space-y-3">
        {frequency.slice(0, 10).map((item) => {
          const isAnswerKey = answerKeyNames.has(item.diagnosis);
          const isCantMiss = cantMissNames.has(item.diagnosis);
          return (
            <div key={item.diagnosis} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-lg capitalize",
                  isCantMiss ? "text-amber-400 font-semibold" :
                  isAnswerKey ? "text-green-400 font-medium" : "text-slate-300"
                )}>
                  {item.diagnosis}
                  {isCantMiss && " *"}
                </span>
                <span className="text-slate-400 text-sm">{item.count} student{item.count !== 1 ? "s" : ""}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isCantMiss ? "bg-amber-500" :
                    isAnswerKey ? "bg-green-500" : "bg-blue-500"
                  )}
                  style={{ width: `${(item.count / maxFreq) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {missedAnswerKey.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-sm text-red-400 mb-2">Missed from answer key:</p>
          <div className="flex flex-wrap gap-2">
            {missedAnswerKey.map((d) => (
              <span key={d} className="px-3 py-1 rounded-full bg-red-900/50 text-red-300 text-sm">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Slide 2: VINDICATE Coverage ────────────────────────────────────
function Slide2Vindicate({
  coverage,
  submissionCount,
  gaps,
}: {
  coverage: Record<string, number>;
  submissionCount: number;
  gaps: string[];
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center">VINDICATE Coverage</h2>
      <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
        {VINDICATE_CATEGORIES.map((cat) => {
          const count = coverage[cat.key] || 0;
          const pct = submissionCount > 0 ? Math.round((count / submissionCount) * 100) : 0;
          const isGap = gaps.includes(cat.key);
          return (
            <div
              key={cat.key}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                isGap
                  ? "border-red-500/50 bg-red-900/20 animate-pulse"
                  : pct > 50
                  ? "border-green-500/30 bg-green-900/10"
                  : "border-slate-600 bg-slate-800/50"
              )}
            >
              <span className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold",
                isGap ? "bg-red-900/50 text-red-300" :
                pct > 50 ? "bg-green-900/50 text-green-300" :
                "bg-slate-700 text-slate-300"
              )}>
                {cat.key === "I2" ? "I" : cat.key}
              </span>
              <span className="text-sm text-slate-400">{cat.label}</span>
              <span className={cn(
                "text-2xl font-bold",
                isGap ? "text-red-400" : pct > 50 ? "text-green-400" : "text-slate-300"
              )}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Slide 3: Can't-Miss Check ──────────────────────────────────────
function Slide3CantMiss({
  details,
}: {
  details: { diagnosis: string; hit_count: number; total: number }[];
}) {
  if (details.length === 0) {
    return (
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Can&apos;t-Miss Check</h2>
        <p className="text-xl text-slate-400">No can&apos;t-miss diagnoses defined for this case.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center">Can&apos;t-Miss Check</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {details.map((d) => {
          const pct = d.total > 0 ? Math.round((d.hit_count / d.total) * 100) : 0;
          const missedByAll = d.hit_count === 0 && d.total > 0;
          return (
            <div
              key={d.diagnosis}
              className={cn(
                "rounded-xl border p-5 space-y-3",
                missedByAll
                  ? "border-red-500 bg-red-900/20"
                  : "border-slate-600 bg-slate-800/50"
              )}
            >
              <h3 className={cn(
                "text-xl font-semibold",
                missedByAll ? "text-red-300" : "text-white"
              )}>
                {d.diagnosis}
              </h3>
              <p className="text-slate-400">
                {d.hit_count} of {d.total} students caught this
              </p>
              <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    missedByAll ? "bg-red-500" :
                    pct < 50 ? "bg-amber-500" : "bg-green-500"
                  )}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Slide 4: Suggested Focus ──────────────────────────────────────
function Slide4Focus({
  suggestedFocus,
}: {
  suggestedFocus: string[];
}) {
  if (suggestedFocus.length === 0) {
    return (
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Discussion Focus</h2>
        <p className="text-xl text-slate-400">No specific focus areas identified — great coverage!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-center">Discussion Focus</h2>
      <div className="space-y-4 max-w-3xl mx-auto">
        {suggestedFocus.map((focus, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-xl border border-slate-600 bg-slate-800/50 p-5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">
              {i + 1}
            </span>
            <p className="text-xl text-slate-200">{focus}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
