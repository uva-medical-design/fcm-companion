"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, OsceResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OsceRubric } from "@/components/osce-rubric";
import type { RubricScore } from "@/components/osce-rubric";
import {
  Loader2,
  ArrowLeft,
  ChevronDown,
  Mic,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HistoryEntry extends OsceResponse {
  fcm_cases: Pick<FcmCase, "chief_complaint" | "body_system" | "difficulty">;
}

export default function OsceHistoryPage() {
  const { user } = useUser();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      const { data } = await supabase
        .from("fcm_osce_responses")
        .select("*, fcm_cases(chief_complaint, body_system, difficulty)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setEntries(data as HistoryEntry[]);
      setLoading(false);
    }

    fetchHistory();
  }, [user]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getAvgScore(evaluation: Record<string, unknown>): number | null {
    const rubric = evaluation?.rubric as RubricScore[] | undefined;
    if (!rubric || rubric.length === 0) return null;
    return rubric.reduce((sum, s) => sum + s.score, 0) / rubric.length;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Link
        href="/osce"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to OSCE Prep
      </Link>

      <div>
        <h1 className="text-lg font-semibold">OSCE History</h1>
        <p className="text-sm text-muted-foreground">
          Your past OSCE practice attempts
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No OSCE attempts yet. Practice a case to see your history.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const avgScore = getAvgScore(entry.evaluation);
            const rubric = (entry.evaluation?.rubric || []) as RubricScore[];
            const narrative = (entry.evaluation?.narrative ||
              entry.evaluation?.text ||
              "") as string;

            return (
              <Card key={entry.id}>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : entry.id)
                  }
                  className="w-full text-left"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm">
                        {entry.fcm_cases?.chief_complaint || "Unknown case"}
                      </CardTitle>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="gap-1">
                        {entry.response_type === "voice" ? (
                          <Mic className="h-3 w-3" />
                        ) : (
                          <FileText className="h-3 w-3" />
                        )}
                        {entry.response_type}
                      </Badge>
                      {entry.fcm_cases?.body_system && (
                        <Badge variant="secondary">
                          {entry.fcm_cases.body_system}
                        </Badge>
                      )}
                      {avgScore !== null && (
                        <span
                          className={cn(
                            "font-medium rounded-md px-1.5 py-0.5",
                            avgScore >= 4
                              ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                              : avgScore >= 3
                                ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                                : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400"
                          )}
                        >
                          {avgScore.toFixed(1)}/5
                        </span>
                      )}
                      <span className="text-muted-foreground ml-auto">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </button>

                {isExpanded && (
                  <CardContent className="pt-0 border-t">
                    <div className="pt-3 space-y-3">
                      {/* Student's response */}
                      {entry.response_content && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Your response:
                          </p>
                          <p className="text-sm bg-muted/50 rounded-lg p-3">
                            {entry.response_content}
                          </p>
                        </div>
                      )}

                      {/* Structured rubric or plain text */}
                      {rubric.length > 0 ? (
                        <OsceRubric scores={rubric} narrative={narrative} />
                      ) : narrative ? (
                        <div className="rounded-lg border p-3">
                          <p className="text-sm leading-relaxed">{narrative}</p>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
