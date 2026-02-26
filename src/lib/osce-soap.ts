import type { SoapContext } from "@/types";

/**
 * Flatten a possibly-nested value to a clean readable string.
 * Never produces JSON syntax — always human-readable.
 */
function flattenValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => flattenValue(v))
      .filter(Boolean)
      .join(", ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && String(v).trim())
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${flattenValue(v)}`)
      .join(" | ");
  }
  return "";
}

/**
 * Convert a label+value pair into bullet strings.
 * Returns an array of "• text" strings.
 */
function toBullets(label: string, value: unknown): string[] {
  if (!value) return [];

  if (typeof value === "string" && value.trim()) {
    // Split on semicolons, commas that look like list separators, or newlines
    const parts = value
      .split(/[;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    if (parts.length > 1) {
      return parts.map((p) => `• ${p}`);
    }
    return [`• ${label}: ${value.trim()}`];
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && String(v).trim())
      .map(([k, v]) => `• ${k.replace(/_/g, " ")}: ${flattenValue(v)}`);
    return entries;
  }

  if (Array.isArray(value)) {
    return (value as unknown[])
      .map((v) => flattenValue(v))
      .filter(Boolean)
      .map((s) => `• ${s}`);
  }

  return [];
}

/**
 * Deterministic extraction of Subjective/Objective from OSCE-format practice case data.
 * Returns null if the data doesn't have structured exam format.
 * Output is formatted as clean bullet points — no JSON syntax ever rendered.
 */
export function extractSoapContext(
  fullCaseData: Record<string, unknown>
): SoapContext | null {
  const patientActor = fullCaseData.Patient_Actor as Record<string, unknown> | undefined;
  const physicalExam = fullCaseData.Physical_Examination_Findings as Record<string, unknown> | undefined;

  if (!patientActor && !physicalExam) return null;

  const subjectiveBullets: string[] = [];

  if (patientActor) {
    const fields = [
      { key: "History", label: "HPI" },
      { key: "Symptoms", label: "Symptoms" },
      { key: "PMH", label: "PMH" },
      { key: "Past_Medical_History", label: "PMH" },
      { key: "Medications", label: "Medications" },
      { key: "Allergies", label: "Allergies" },
      { key: "Social_History", label: "Social Hx" },
      { key: "Family_History", label: "Family Hx" },
      { key: "ROS", label: "ROS" },
      { key: "Review_of_Systems", label: "ROS" },
    ];

    for (const { key, label } of fields) {
      const value = patientActor[key];
      if (!value) continue;
      subjectiveBullets.push(...toBullets(label, value));
    }
  }

  const objectiveBullets: string[] = [];

  if (physicalExam) {
    for (const [k, v] of Object.entries(physicalExam)) {
      if (!v) continue;
      const label = k.replace(/_/g, " ");
      const flat = flattenValue(v);
      if (flat) objectiveBullets.push(`• ${label}: ${flat}`);
    }
  }

  const testResults = fullCaseData.Test_Results as Record<string, unknown> | undefined;
  if (testResults) {
    for (const [k, v] of Object.entries(testResults)) {
      if (!v) continue;
      const label = k.replace(/_/g, " ");
      const flat = flattenValue(v);
      if (flat) objectiveBullets.push(`• ${label}: ${flat}`);
    }
  }

  if (subjectiveBullets.length === 0 && objectiveBullets.length === 0) return null;

  return {
    subjective: subjectiveBullets.join("\n") || "• No subjective data available",
    objective: objectiveBullets.join("\n") || "• No objective data available",
  };
}

/**
 * Build a prompt for Claude to generate S/O context as clean bullets.
 */
export function buildSoapContextPrompt(
  chiefComplaint: string,
  correctDiagnosis: string,
  availableData: Record<string, unknown>
): string {
  // Summarize available data safely — no raw JSON to Claude either
  const summary = Object.keys(availableData).join(", ") || "none";

  return `You are a medical education assistant. A student is practicing OSCE.

Chief Complaint: ${chiefComplaint}
Correct Diagnosis: ${correctDiagnosis}
Available data fields: ${summary}

Generate a realistic post-encounter Subjective and Objective for this case. Return JSON with two fields — each must be an array of short bullet strings (1 finding per bullet, clinical shorthand, no full sentences):

{
  "subjective": [
    "22M, chest pain x 2 days",
    "Sharp, worse lying down, better sitting forward",
    "Fever 100.8, recent URI 1 week ago",
    "No SOB, no leg swelling",
    "No prior cardiac history, no medications, NKDA"
  ],
  "objective": [
    "HR 92 | BP 128/78 | RR 18 | Temp 100.8°F | SpO2 98%",
    "Alert, mildly uncomfortable, sitting upright",
    "Pericardial friction rub at LLSB",
    "Lungs CTA bilaterally",
    "No edema"
  ]
}

Rules:
- 4-8 bullets per section
- Short clinical language — abbreviations OK (SOB, NKDA, CTA, LLSB, etc.)
- One finding per bullet
- No JSON artifacts, no full sentences
- Respond with valid JSON only`;
}
