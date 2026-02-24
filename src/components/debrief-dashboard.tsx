"use client";

import type { DiagnosisEntry, PracticeCase } from "@/types";
import type { MatchResult, DdxSnapshot, SimulationFeedback } from "@/components/simulation-flow";
import type { PracticeEvent } from "@/components/journey-timeline";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeedbackNarrative } from "@/components/feedback-narrative";
import { ConfidenceCalibration } from "@/components/confidence-calibration";
import { JourneyTimeline } from "@/components/journey-timeline";
import { DdxEvolution } from "@/components/ddx-evolution";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Lightbulb,
  AlertOctagon,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DebriefDashboardProps {
  feedback: SimulationFeedback;
  diagnoses: DiagnosisEntry[];
  ddxSnapshots: DdxSnapshot[];
  historyMatches: MatchResult[];
  examMatches: MatchResult[];
  practiceEvents: PracticeEvent[];
  practiceCase: PracticeCase;
  onRetry: () => void;
}

export function DebriefDashboard({
  feedback,
  diagnoses,
  ddxSnapshots,
  historyMatches,
  examMatches,
  practiceEvents,
  practiceCase,
  onRetry,
}: DebriefDashboardProps) {
  const allMatches = [...historyMatches, ...examMatches];
  const matchedCount = allMatches.filter((m) => m.status === "matched").length;
  const totalElements = allMatches.length;

  // Build calibration data from diagnoses with confidence
  const calibrationData = diagnoses
    .filter((d) => d.confidence != null)
    .map((d) => {
      const correctLower = feedback.correct_diagnosis.toLowerCase().trim();
      const dLower = d.diagnosis.toLowerCase().trim();
      const wasCorrect =
        dLower === correctLower ||
        dLower.includes(correctLower) ||
        correctLower.includes(dLower);
      return {
        label: d.diagnosis,
        confidence: d.confidence!,
        wasCorrect,
      };
    });

  const statusIcon = {
    matched: <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />,
    partial: <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />,
    missed: <XCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />,
  };

  const statusColor = {
    matched: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30",
    partial: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
    missed: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Case Debrief</h2>
        <p className="text-sm text-muted-foreground">
          Review your performance across all simulation steps
        </p>
      </div>

      {/* 1. Summary Card */}
      <Card
        className={cn(
          "py-3",
          feedback.student_got_it
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
            : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
        )}
      >
        <CardContent className="px-4 py-0 space-y-3">
          <div className="flex items-center gap-2">
            {feedback.student_got_it ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                Correct Diagnosis: {feedback.correct_diagnosis}
              </p>
              {totalElements > 0 && (
                <p className="text-xs text-muted-foreground">
                  H&amp;P: {matchedCount}/{totalElements} elements identified
                </p>
              )}
            </div>
          </div>
          <FeedbackNarrative text={feedback.narrative} />
        </CardContent>
      </Card>

      {/* 2. History/Exam Review */}
      {allMatches.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {historyMatches.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">History Review</h4>
                  <span className="text-xs text-muted-foreground">
                    {historyMatches.filter((m) => m.status === "matched").length}/{historyMatches.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {historyMatches.map((match) => (
                    <div
                      key={match.elementId}
                      className={cn("rounded-lg border p-2 flex items-center gap-2 text-sm", statusColor[match.status])}
                    >
                      {statusIcon[match.status]}
                      <span className="flex-1 truncate">{match.elementText}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {match.importance}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {examMatches.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Exam Review</h4>
                  <span className="text-xs text-muted-foreground">
                    {examMatches.filter((m) => m.status === "matched").length}/{examMatches.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {examMatches.map((match) => (
                    <div
                      key={match.elementId}
                      className={cn("rounded-lg border p-2 flex items-center gap-2 text-sm", statusColor[match.status])}
                    >
                      {statusIcon[match.status]}
                      <span className="flex-1 truncate">{match.elementText}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {match.importance}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. DDx Evolution */}
      {ddxSnapshots.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <DdxEvolution
              snapshots={ddxSnapshots}
              correctDiagnosis={feedback.correct_diagnosis}
            />
          </CardContent>
        </Card>
      )}

      {/* 4. Confidence Calibration */}
      {calibrationData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <ConfidenceCalibration dataPoints={calibrationData} />
          </CardContent>
        </Card>
      )}

      {/* 5. Journey Timeline */}
      {practiceEvents.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <JourneyTimeline events={practiceEvents} />
          </CardContent>
        </Card>
      )}

      {/* 6. Expert Reasoning */}
      {feedback.expert_reasoning && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Expert Reasoning</h4>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {feedback.expert_reasoning}
            </p>
            {/* Student reasoning comparison */}
            {diagnoses.some((d) => d.reasoning) && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Your Reasoning</p>
                <div className="space-y-1.5">
                  {diagnoses
                    .filter((d) => d.reasoning)
                    .slice(0, 3)
                    .map((d, i) => (
                      <p key={i} className="text-xs text-foreground/80">
                        <span className="font-medium">{d.diagnosis}:</span> {d.reasoning}
                      </p>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 7. Teaching Concepts */}
      {(feedback.key_takeaways?.length > 0 || feedback.common_pitfalls?.length > 0) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {feedback.key_takeaways?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <h4 className="text-sm font-semibold">Key Takeaways</h4>
                </div>
                <ul className="space-y-1.5">
                  {feedback.key_takeaways.map((point, i) => (
                    <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
                      <span className="text-muted-foreground shrink-0 mt-0.5 text-xs">{i + 1}.</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.common_pitfalls?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4 text-red-500" />
                  <h4 className="text-sm font-semibold">Common Pitfalls</h4>
                </div>
                <ul className="space-y-1.5">
                  {feedback.common_pitfalls.map((pitfall, i) => (
                    <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
                      <span className="text-red-400 shrink-0 mt-0.5 text-xs">!</span>
                      {pitfall}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Try Again */}
      <Button variant="outline" onClick={onRetry} className="w-full h-11" size="lg">
        <RotateCcw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}
