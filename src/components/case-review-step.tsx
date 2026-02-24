"use client";

import type { PracticeCase } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CaseReviewStepProps {
  practiceCase: PracticeCase;
  onContinue: () => void;
}

interface VitalEntry {
  label: string;
  value: string;
  isAbnormal: boolean;
}

function parseVitals(vitals: Record<string, string>): VitalEntry[] {
  return Object.entries(vitals).map(([label, value]) => ({
    label,
    value,
    isAbnormal: checkAbnormal(label, value),
  }));
}

function checkAbnormal(label: string, value: string): boolean {
  const key = label.toLowerCase();
  const num = parseFloat(value.replace(/[^\d.]/g, ""));
  if (isNaN(num)) return false;

  if (key.includes("heart rate") || key.includes("pulse")) return num > 100 || num < 60;
  if (key.includes("respiratory")) return num > 20;
  if (key.includes("spo2") || key.includes("oxygen")) return num < 95;
  if (key.includes("temperature") || key.includes("temp")) {
    // Extract Celsius value (appears first in "36.6°C (97.9°F)" format)
    const celsiusMatch = value.match(/([\d.]+)\s*°?C/);
    if (celsiusMatch) {
      const c = parseFloat(celsiusMatch[1]);
      return c > 38 || c < 36;
    }
    // Fallback: extract Fahrenheit
    const fahrenheitMatch = value.match(/([\d.]+)\s*°?F/);
    if (fahrenheitMatch) {
      const f = parseFloat(fahrenheitMatch[1]);
      return f > 100.4 || f < 96.8;
    }
    return false;
  }
  if (key.includes("blood pressure") || key.includes("bp")) {
    // Extract systolic
    const match = value.match(/(\d+)\//);
    if (match) {
      const systolic = parseInt(match[1]);
      return systolic > 140 || systolic < 90;
    }
  }
  return false;
}

function getPatientHistory(fullCaseData: Record<string, unknown>): string | null {
  const osce = fullCaseData.OSCE_Examination as Record<string, unknown> | undefined;
  if (!osce) return null;

  const patient = osce.Patient_Actor as Record<string, unknown> | undefined;
  if (!patient) return null;

  return (patient.History as string) || null;
}

function getPhysicalFindings(fullCaseData: Record<string, unknown>): Record<string, unknown> | null {
  const osce = fullCaseData.OSCE_Examination as Record<string, unknown> | undefined;
  if (!osce) return null;

  return (osce.Physical_Examination_Findings as Record<string, unknown>) || null;
}

function getSymptoms(fullCaseData: Record<string, unknown>): string[] {
  const osce = fullCaseData.OSCE_Examination as Record<string, unknown> | undefined;
  if (!osce) return [];

  const patient = osce.Patient_Actor as Record<string, unknown> | undefined;
  if (!patient) return [];

  const symptoms = patient.Symptoms as Record<string, unknown> | undefined;
  if (!symptoms) return [];

  const result: string[] = [];
  if (symptoms.Primary_Symptom) result.push(symptoms.Primary_Symptom as string);
  if (Array.isArray(symptoms.Secondary_Symptoms)) {
    result.push(...(symptoms.Secondary_Symptoms as string[]));
  }
  return result;
}

function getPastMedicalHistory(fullCaseData: Record<string, unknown>): string | null {
  const osce = fullCaseData.OSCE_Examination as Record<string, unknown> | undefined;
  if (!osce) return null;
  const patient = osce.Patient_Actor as Record<string, unknown> | undefined;
  if (!patient) return null;
  return (patient.Past_Medical_History as string) || null;
}

function getSocialHistory(fullCaseData: Record<string, unknown>): string | null {
  const osce = fullCaseData.OSCE_Examination as Record<string, unknown> | undefined;
  if (!osce) return null;
  const patient = osce.Patient_Actor as Record<string, unknown> | undefined;
  if (!patient) return null;
  return (patient.Social_History as string) || null;
}

export function CaseReviewStep({ practiceCase, onContinue }: CaseReviewStepProps) {
  const vitals = parseVitals(practiceCase.vitals);
  const history = getPatientHistory(practiceCase.full_case_data);
  const symptoms = getSymptoms(practiceCase.full_case_data);
  const pmh = getPastMedicalHistory(practiceCase.full_case_data);
  const socialHx = getSocialHistory(practiceCase.full_case_data);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Case Presentation</h2>
        <p className="text-sm text-muted-foreground">
          Review the case before gathering your history and exam
        </p>
      </div>

      {/* Demographics + Chief Complaint */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {practiceCase.patient_age && practiceCase.patient_gender && (
              <Badge variant="secondary">
                {practiceCase.patient_age}yo {practiceCase.patient_gender}
              </Badge>
            )}
            {practiceCase.body_system && (
              <Badge variant="outline">{practiceCase.body_system}</Badge>
            )}
            <Badge variant="outline">{practiceCase.difficulty}</Badge>
          </div>
          <h3 className="text-lg font-semibold">{practiceCase.chief_complaint}</h3>
        </CardContent>
      </Card>

      {/* Vitals Grid */}
      {vitals.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-3">Vital Signs</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {vitals.map((v) => (
                <div
                  key={v.label}
                  className={cn(
                    "rounded-lg border p-2.5 text-center",
                    v.isAbnormal
                      ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                      : "border-border"
                  )}
                >
                  <p className="text-xs text-muted-foreground">{v.label}</p>
                  <p
                    className={cn(
                      "text-sm font-semibold mt-0.5",
                      v.isAbnormal && "text-red-700 dark:text-red-400"
                    )}
                  >
                    {v.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold">History of Present Illness</h4>
            <p className="text-sm leading-relaxed text-foreground/90">{history}</p>

            {symptoms.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Key Symptoms</p>
                <div className="flex flex-wrap gap-1.5">
                  {symptoms.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {pmh && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Past Medical History</p>
                <p className="text-sm text-foreground/80">{pmh}</p>
              </div>
            )}

            {socialHx && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Social History</p>
                <p className="text-sm text-foreground/80">{socialHx}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <Button onClick={onContinue} className="w-full h-11" size="lg">
        Continue to Gather
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
