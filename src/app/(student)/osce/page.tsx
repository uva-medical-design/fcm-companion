"use client";

import { useEffect, useState, useMemo } from "react";
import { useUser } from "@/lib/user-context";
import { useRouter } from "next/navigation";
import { PRACTICE_CASES } from "@/data/practice-cases";
import type { PracticeCase } from "@/types";
import type { OsceSession } from "@/types/osce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { OsceProgress } from "@/components/osce-progress";
import {
  Loader2,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OscePage() {
  const { user } = useUser();
  const router = useRouter();
  const [sessions, setSessions] = useState<OsceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [bodySystemFilter, setBodySystemFilter] = useState("");
  const [showAllPast, setShowAllPast] = useState(false);

  // Fetch existing sessions
  useEffect(() => {
    async function fetchSessions() {
      if (!user) return;
      try {
        const res = await fetch(`/api/osce-session?user_id=${user.id}`);
        const data = await res.json();
        if (data.sessions) setSessions(data.sessions);
      } catch (err) {
        console.error("Failed to fetch OSCE sessions:", err);
      }
      setLoading(false);
    }
    fetchSessions();
  }, [user]);

  // Derive unique body systems from practice cases
  const bodySystems = useMemo(() => {
    const systems = new Set<string>();
    for (const c of PRACTICE_CASES) {
      if (c.body_system) systems.add(c.body_system);
    }
    return Array.from(systems).sort();
  }, []);

  // Filter practice cases
  const filteredCases = useMemo(() => {
    const q = search.toLowerCase().trim();
    return PRACTICE_CASES.filter((c) => {
      if (bodySystemFilter && c.body_system !== bodySystemFilter) return false;
      if (q) {
        const searchable = [c.chief_complaint, c.title, c.body_system]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [search, bodySystemFilter]);

  // Split sessions
  const inProgressSessions = sessions.filter(
    (s) => s.status === "door_prep" || s.status === "soap_note"
  );
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const visibleCompleted = showAllPast
    ? completedSessions
    : completedSessions.slice(0, 5);

  // Look up practice case info by ID
  function getCaseInfo(
    practiceId: string | null
  ): PracticeCase | undefined {
    if (!practiceId) return undefined;
    return PRACTICE_CASES.find((c) => c.id === practiceId);
  }

  async function startSession(practiceCase: PracticeCase) {
    if (!user || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/osce-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          practice_case_id: practiceCase.id,
          case_source: "practice",
        }),
      });
      const data = await res.json();
      if (data.session) {
        router.push(`/osce/${data.session.id}/door-prep`);
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    }
    setCreating(false);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function ratingColor(rating: string): string {
    switch (rating) {
      case "excellent":
        return "bg-green-500";
      case "good":
        return "bg-blue-500";
      case "developing":
        return "bg-amber-400";
      case "needs_work":
        return "bg-muted-foreground/40";
      default:
        return "bg-muted-foreground/20";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">OSCE Prep</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Structured 3-phase clinical simulation: Door Prep, SOAP Note, AI
          Feedback
        </p>
      </div>

      {/* Continue Sessions */}
      {inProgressSessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Continue Session
          </h2>
          {inProgressSessions.map((session) => {
            const caseInfo = getCaseInfo(session.practice_case_id);
            const nextPath =
              session.status === "door_prep" ? "door-prep" : "soap-note";
            return (
              <Card key={session.id} className="border-amber-200 dark:border-amber-900/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {caseInfo?.chief_complaint || "Unknown case"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {caseInfo?.body_system && (
                          <Badge variant="outline" className="text-xs">
                            {caseInfo.body_system}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Started {formatDate(session.started_at)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <OsceProgress currentStep={session.status} />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(`/osce/${session.id}/${nextPath}`)
                      }
                    >
                      Resume
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {/* Past Sessions */}
      {completedSessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Past Sessions
          </h2>
          {visibleCompleted.map((session) => {
            const caseInfo = getCaseInfo(session.practice_case_id);
            const rubricDots = session.feedback?.rubric || [];
            return (
              <Card
                key={session.id}
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() =>
                  router.push(`/osce/${session.id}/feedback`)
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {caseInfo?.chief_complaint || "Unknown case"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {caseInfo?.body_system && (
                          <Badge variant="outline" className="text-xs">
                            {caseInfo.body_system}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {session.completed_at
                            ? formatDate(session.completed_at)
                            : formatDate(session.created_at)}
                        </span>
                      </div>
                    </div>
                    {/* Rubric dot summary */}
                    <div className="flex items-center gap-1 shrink-0">
                      {rubricDots.map((r, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            ratingColor(r.rating)
                          )}
                          title={`${r.category}: ${r.rating}`}
                        />
                      ))}
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {completedSessions.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllPast(!showAllPast)}
              className="w-full text-muted-foreground"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 mr-1 transition-transform",
                  showAllPast && "rotate-180"
                )}
              />
              {showAllPast
                ? "Show less"
                : `Show all ${completedSessions.length} sessions`}
            </Button>
          )}
        </section>
      )}

      {/* Start New Session */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          Start New Session
        </h2>

        {/* Search + filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cases..."
              className="pl-9"
            />
          </div>
          {bodySystems.length > 1 && (
            <select
              value={bodySystemFilter}
              onChange={(e) => setBodySystemFilter(e.target.value)}
              aria-label="Filter by body system"
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">All Systems</option>
              {bodySystems.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Case list */}
        <div className="space-y-2">
          {filteredCases.slice(0, 20).map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{c.chief_complaint}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {c.body_system && (
                      <Badge variant="outline">{c.body_system}</Badge>
                    )}
                    <Badge variant="outline">{c.difficulty}</Badge>
                    {c.patient_age && c.patient_gender && (
                      <span>
                        {c.patient_age}yo {c.patient_gender}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => startSession(c)}
                    disabled={creating}
                  >
                    {creating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Start"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCases.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No cases match your search.
            </p>
          </div>
        )}

        {filteredCases.length > 20 && (
          <p className="text-xs text-center text-muted-foreground">
            Showing 20 of {filteredCases.length} cases. Refine your search to
            see more.
          </p>
        )}
      </section>
    </div>
  );
}
