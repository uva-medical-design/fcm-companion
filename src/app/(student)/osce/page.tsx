"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, PracticeCase, OsceSession, OSCEFeedbackResult, RubricScore } from "@/types";
import { PRACTICE_CASES } from "@/data/practice-cases";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Play, RotateCcw, Stethoscope, ChevronRight, ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const ratingDotClass: Record<string, string> = {
  excellent: "bg-green-500",
  good: "bg-blue-500",
  developing: "bg-amber-400",
  needs_work: "bg-muted-foreground",
};

function RubricDots({ scores }: { scores: RubricScore[] }) {
  if (!scores.length) return null;
  return (
    <div className="flex gap-1">
      {scores.map((s, i) => (
        <div
          key={i}
          title={`${s.category}: ${s.rating}`}
          className={cn("h-2 w-2 rounded-full", ratingDotClass[s.rating] ?? "bg-muted")}
        />
      ))}
    </div>
  );
}

function getCaseLabel(
  session: OsceSession,
  scheduledCases: FcmCase[]
): string {
  if (session.case_source === "practice" && session.practice_case_id) {
    const pc = PRACTICE_CASES.find((c: PracticeCase) => c.id === session.practice_case_id);
    return pc?.chief_complaint ?? "Practice Case";
  }
  if (session.case_id) {
    const sc = scheduledCases.find((c) => c.id === session.case_id);
    return sc?.chief_complaint ?? "Scheduled Case";
  }
  return "Case";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function OscePage() {
  const { user } = useUser();
  const router = useRouter();
  const [scheduledCases, setScheduledCases] = useState<FcmCase[]>([]);
  const [sessions, setSessions] = useState<OsceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);

  // Practice Library filters
  const [practiceSearch, setPracticeSearch] = useState("");
  const [practiceBodySystem, setPracticeBodySystem] = useState("");
  const [practiceSort, setPracticeSort] = useState<"default" | "alpha" | "difficulty">("default");

  const SESSIONS_PREVIEW = 5;

  const oscePracticeCases = PRACTICE_CASES.filter((c: PracticeCase) => c.has_structured_exam);

  // Derive unique body systems from OSCE practice cases
  const bodySystems = useMemo(() => {
    const systems = new Set<string>();
    for (const c of oscePracticeCases) {
      if (c.body_system) systems.add(c.body_system);
    }
    return Array.from(systems).sort();
  }, [oscePracticeCases]);

  // Filter and sort practice cases
  const filteredPracticeCases = useMemo(() => {
    const q = practiceSearch.toLowerCase().trim();
    let result = oscePracticeCases.filter((c: PracticeCase) => {
      if (practiceBodySystem && c.body_system !== practiceBodySystem) return false;
      if (q) {
        const searchable = [
          c.chief_complaint,
          c.patient_age ? `${c.patient_age}` : "",
          c.patient_gender ?? "",
          c.body_system ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });

    if (practiceSort === "alpha") {
      result = [...result].sort((a, b) =>
        a.chief_complaint.localeCompare(b.chief_complaint)
      );
    } else if (practiceSort === "difficulty") {
      const order: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
      result = [...result].sort(
        (a, b) => (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1)
      );
    }

    return result;
  }, [oscePracticeCases, practiceSearch, practiceBodySystem, practiceSort]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      const { data: submissions } = await supabase
        .from("fcm_submissions")
        .select("case_id")
        .eq("user_id", user.id)
        .in("status", ["submitted", "resubmitted"]);

      if (submissions && submissions.length > 0) {
        const caseIds = submissions.map((s) => s.case_id);
        const { data: cases } = await supabase
          .from("fcm_cases")
          .select("*")
          .in("id", caseIds)
          .order("sort_order");
        if (cases) setScheduledCases(cases);
      }

      const res = await fetch(`/api/osce-session?user_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }

      setLoading(false);
    }

    fetchData();
  }, [user]);

  async function startSession(
    caseSource: "scheduled" | "practice",
    caseId?: string,
    practiceCaseId?: string
  ) {
    if (!user || starting) return;
    const key = caseId || practiceCaseId || "";
    setStarting(key);

    try {
      const res = await fetch("/api/osce-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          case_source: caseSource,
          case_id: caseId || null,
          practice_case_id: practiceCaseId || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/osce/${data.session.id}/door-prep`);
      }
    } catch {
      // ignore
    } finally {
      setStarting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin-slow text-primary" />
      </div>
    );
  }

  const q = practiceSearch.toLowerCase().trim();

  const inProgressSessions = sessions.filter((s) => {
    if (s.status === "completed") return false;
    if (!q) return true;
    return getCaseLabel(s, scheduledCases).toLowerCase().includes(q);
  });

  const completedSessions = sessions.filter((s) => {
    if (s.status !== "completed") return false;
    if (!q) return true;
    return getCaseLabel(s, scheduledCases).toLowerCase().includes(q);
  });

  const filteredScheduledCases = scheduledCases.filter((c) => {
    if (!q) return true;
    return [c.chief_complaint, c.body_system ?? "", c.difficulty ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">OSCE Practice</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Practice the full OSCE workflow: Door Prep, SOAP Note, and AI Feedback
        </p>
      </div>

      {/* Search & Filters */}
      {oscePracticeCases.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={practiceSearch}
              onChange={(e) => setPracticeSearch(e.target.value)}
              placeholder="Search by complaint, demographics..."
              className="pl-9 h-11"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={practiceBodySystem}
              onChange={(e) => setPracticeBodySystem(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">All Body Systems</option>
              {bodySystems.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={practiceSort}
              onChange={(e) => setPracticeSort(e.target.value as "default" | "alpha" | "difficulty")}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              <option value="default">Default Order</option>
              <option value="alpha">Alphabetical</option>
              <option value="difficulty">Difficulty</option>
            </select>
            {(practiceSearch || practiceBodySystem || practiceSort !== "default") && (
              <button
                type="button"
                onClick={() => {
                  setPracticeSearch("");
                  setPracticeBodySystem("");
                  setPracticeSort("default");
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* In-progress sessions */}
      {inProgressSessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Continue Session
          </h2>
          {inProgressSessions.map((session) => {
            const phaseLabel = session.status === "door_prep" ? "Door Prep" : "SOAP Note";
            const resumePath =
              session.status === "door_prep"
                ? `/osce/${session.id}/door-prep`
                : `/osce/${session.id}/soap-note`;
            return (
              <Card key={session.id} className="border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getCaseLabel(session, scheduledCases)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        In progress — {phaseLabel}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => router.push(resumePath)} className="shrink-0">
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Resume
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {/* Completed sessions */}
      {completedSessions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Past Sessions
            </h2>
            <span className="text-xs text-muted-foreground">
              {completedSessions.length} attempt{completedSessions.length !== 1 ? "s" : ""}
            </span>
          </div>
          {(showAllSessions ? completedSessions : completedSessions.slice(0, SESSIONS_PREVIEW)).map((session) => {
            const fb = session.feedback as OSCEFeedbackResult | null;
            const rubric = fb?.rubric_scores ?? [];
            const label = getCaseLabel(session, scheduledCases);
            const date = session.completed_at ?? session.updated_at;
            return (
              <Card
                key={session.id}
                className="cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => router.push(`/osce/${session.id}/feedback`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate">{label}</p>
                      <div className="flex items-center gap-2">
                        <RubricDots scores={rubric} />
                        {date && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(date)}
                          </span>
                        )}
                      </div>
                      {fb?.strengths?.[0] && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {fb.strengths[0]}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {completedSessions.length > SESSIONS_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllSessions((v) => !v)}
              className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
            >
              {showAllSessions ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show all {completedSessions.length} sessions
                </>
              )}
            </button>
          )}
        </section>
      )}

      {/* Scheduled cases */}
      {filteredScheduledCases.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Your Cases
          </h2>
          {filteredScheduledCases.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{c.chief_complaint}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  {c.body_system && <Badge variant="outline">{c.body_system}</Badge>}
                  <Badge variant="outline">{c.difficulty}</Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => startSession("scheduled", c.id)}
                  disabled={starting === c.id}
                >
                  {starting === c.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin-slow mr-1" />
                  ) : (
                    <Play className="h-3.5 w-3.5 mr-1" />
                  )}
                  Start Practice
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Practice Library */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Practice Library
          </h2>
          <span className="text-xs text-muted-foreground">
            {filteredPracticeCases.length} case{filteredPracticeCases.length !== 1 ? "s" : ""}
          </span>
        </div>

        {oscePracticeCases.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No OSCE-format practice cases available.
            </CardContent>
          </Card>
        ) : filteredPracticeCases.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No cases match your search.
            </p>
          </div>
        ) : (
          filteredPracticeCases.map((c: PracticeCase) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{c.chief_complaint}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  {c.patient_age && c.patient_gender && (
                    <span>{c.patient_age}yo {c.patient_gender}</span>
                  )}
                  {c.body_system && <Badge variant="outline">{c.body_system}</Badge>}
                  <Badge variant="outline">{c.difficulty}</Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => startSession("practice", undefined, c.id)}
                  disabled={starting === c.id}
                >
                  {starting === c.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin-slow mr-1" />
                  ) : (
                    <Play className="h-3.5 w-3.5 mr-1" />
                  )}
                  Start Practice
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
