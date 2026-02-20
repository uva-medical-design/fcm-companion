"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase } from "@/types";
import { VINDICATE_CATEGORIES } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Users,
  BarChart3,
  AlertTriangle,
  MessageSquare,
  Loader2,
} from "lucide-react";

interface DashboardData {
  submission_count: number;
  total_students: number;
  diagnosis_frequency: { diagnosis: string; count: number }[];
  vindicate_coverage: Record<string, number>;
  cant_miss_rate: number | null;
  flagged_questions: { content: string; student: string }[];
  topic_votes: Record<string, number>;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [cases, setCases] = useState<FcmCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    async function fetchCases() {
      const { data } = await supabase
        .from("fcm_cases")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (data) {
        setCases(data);
        if (data.length > 0) setSelectedCaseId(data[0].id);
      }
      setLoading(false);
    }
    fetchCases();
  }, []);

  useEffect(() => {
    if (!selectedCaseId) return;

    async function fetchDashboard() {
      setLoadingData(true);
      try {
        const res = await fetch(`/api/dashboard?case_id=${selectedCaseId}`);
        const json = await res.json();
        setData(json);
      } catch {
        // silently fail
      }
      setLoadingData(false);
    }

    fetchDashboard();
  }, [selectedCaseId]);

  const selectedCase = cases.find((c) => c.id === selectedCaseId);
  const maxFreq = data?.diagnosis_frequency[0]?.count || 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold">Instructor Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Anonymized aggregate view of student submissions
        </p>
      </div>

      {/* Case selector */}
      <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
        <SelectTrigger className="w-full md:w-96">
          <SelectValue placeholder="Select a case" />
        </SelectTrigger>
        <SelectContent>
          {cases.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.chief_complaint}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loadingData && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading data...
        </div>
      )}

      {data && !loadingData && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Submissions
                  </span>
                </div>
                <p className="text-2xl font-semibold mt-1">
                  {data.submission_count}
                  <span className="text-sm text-muted-foreground font-normal">
                    /{data.total_students}
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Unique Diagnoses
                  </span>
                </div>
                <p className="text-2xl font-semibold mt-1">
                  {data.diagnosis_frequency.length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs text-muted-foreground">
                    Can&apos;t-Miss Rate
                  </span>
                </div>
                <p className="text-2xl font-semibold mt-1">
                  {data.cant_miss_rate !== null
                    ? `${data.cant_miss_rate}%`
                    : "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Questions
                  </span>
                </div>
                <p className="text-2xl font-semibold mt-1">
                  {data.flagged_questions.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Diagnosis Heat Map */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Diagnosis Frequency
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.diagnosis_frequency.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No submissions yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.diagnosis_frequency.slice(0, 15).map((item) => (
                    <div key={item.diagnosis} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize">{item.diagnosis}</span>
                        <span className="text-muted-foreground">
                          {item.count} student{item.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${(item.count / maxFreq) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* VINDICATE Coverage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                VINDICATE Category Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {VINDICATE_CATEGORIES.map((cat) => {
                  const count = data.vindicate_coverage[cat.key] || 0;
                  const pct =
                    data.submission_count > 0
                      ? Math.round(
                          (count / data.submission_count) * 100
                        )
                      : 0;
                  return (
                    <div
                      key={cat.key}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg border"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium",
                          count > 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {cat.key === "I2" ? "I" : cat.key}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {cat.label}
                      </span>
                      <span className="text-xs font-medium">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Discussion Topics */}
          {data.topic_votes && Object.keys(data.topic_votes).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Discussion Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(data.topic_votes)
                    .sort(([, a], [, b]) => b - a)
                    .map(([topic, count]) => {
                      const maxVotes = Math.max(...Object.values(data.topic_votes));
                      return (
                        <div key={topic} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{topic}</span>
                            <span className="text-muted-foreground">
                              {count} vote{count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/70 transition-all"
                              style={{
                                width: `${(count / maxVotes) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flagged Questions */}
          {data.flagged_questions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Student Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.flagged_questions.map((q, i) => (
                    <div
                      key={i}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <p>{q.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        — {q.student}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
