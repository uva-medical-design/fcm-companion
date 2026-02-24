"use client";

import { cn } from "@/lib/utils";

interface CalibrationDataPoint {
  label: string;
  confidence: number; // 1-5
  wasCorrect: boolean;
}

interface ConfidenceCalibrationProps {
  dataPoints: CalibrationDataPoint[];
}

export function ConfidenceCalibration({
  dataPoints,
}: ConfidenceCalibrationProps) {
  if (dataPoints.length === 0) return null;

  const maxConfidence = 5;

  // Compute summary counts
  const wellCalibrated = dataPoints.filter(
    (p) => p.wasCorrect && p.confidence >= 4
  ).length;
  const overconfident = dataPoints.filter(
    (p) => !p.wasCorrect && p.confidence >= 4
  ).length;
  const underconfident = dataPoints.filter(
    (p) => p.wasCorrect && p.confidence < 4
  ).length;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold">Confidence Calibration</h4>
        <p className="text-xs text-muted-foreground">
          How well does confidence match accuracy?
        </p>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 text-xs">
        {wellCalibrated > 0 && (
          <span className="flex items-center gap-1.5 rounded-md bg-green-100 dark:bg-green-950/40 px-2 py-1 text-green-700 dark:text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {wellCalibrated} well calibrated
          </span>
        )}
        {overconfident > 0 && (
          <span className="flex items-center gap-1.5 rounded-md bg-red-100 dark:bg-red-950/40 px-2 py-1 text-red-700 dark:text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {overconfident} overconfident
          </span>
        )}
        {underconfident > 0 && (
          <span className="flex items-center gap-1.5 rounded-md bg-amber-100 dark:bg-amber-950/40 px-2 py-1 text-amber-700 dark:text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            {underconfident} underconfident
          </span>
        )}
      </div>

      {/* Per-item bars */}
      <div className="space-y-2">
        {dataPoints.map((point, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate max-w-[200px]">{point.label}</span>
              <span
                className={cn(
                  "font-medium",
                  point.wasCorrect
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {point.wasCorrect ? "Correct" : "Incorrect"}
              </span>
            </div>
            <div className="relative h-6 w-full rounded-full bg-muted">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-all",
                  point.wasCorrect
                    ? point.confidence >= 4
                      ? "bg-green-500"
                      : "bg-amber-400"
                    : point.confidence >= 4
                      ? "bg-red-500"
                      : "bg-blue-400"
                )}
                style={{
                  width: `${(point.confidence / maxConfidence) * 100}%`,
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {point.confidence}/5
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Well calibrated
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Overconfident
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Underconfident
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-400" /> Appropriate uncertainty
        </span>
      </div>
    </div>
  );
}
