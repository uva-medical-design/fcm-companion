import type {
  DoorPrepData,
  SoapNoteData,
  AnswerKeyEntry,
  RubricScore,
} from "@/types";

interface OsceDeterministicResult {
  differentialQuality: {
    total: number;
    matchedCount: number;
    matchedDiagnoses: string[];
    missedImportant: string[];
    correctDiagnosisIncluded: boolean;
  };
  historyQuality: {
    totalQuestions: number;
    avgQuestionsPerDiagnosis: number;
  };
  peQuality: {
    totalManeuvers: number;
    uniqueManeuvers: number;
  };
  soapQuality: {
    evidenceMapped: number;
    assessmentsWritten: number;
    diagnosticPlanItems: number;
    therapeuticPlanItems: number;
  };
}

/**
 * Deterministic comparison of OSCE performance against answer key.
 */
export function compareOscePerformance(
  doorPrep: DoorPrepData,
  soapNote: SoapNoteData,
  answerKey: AnswerKeyEntry[],
  correctDiagnosis: string
): OsceDeterministicResult {
  const normalize = (s: string) => s.toLowerCase().trim();

  // Build alias map
  const aliasMap = new Map<string, string>();
  for (const entry of answerKey) {
    aliasMap.set(normalize(entry.diagnosis), entry.diagnosis);
    for (const alias of entry.aliases) {
      aliasMap.set(normalize(alias), entry.diagnosis);
    }
  }

  // Match SOAP diagnoses against answer key
  const matched = new Set<string>();
  for (const d of soapNote.diagnoses) {
    const key = normalize(d.diagnosis);
    const match = aliasMap.get(key);
    if (match) matched.add(match);
  }

  // Important missed diagnoses (most_likely or can't-miss)
  const missedImportant = answerKey
    .filter(
      (e) =>
        !matched.has(e.diagnosis) &&
        (e.tier === "most_likely" || e.is_cant_miss)
    )
    .map((e) => e.diagnosis);

  const correctIncluded = soapNote.diagnoses.some(
    (d) => normalize(d.diagnosis) === normalize(correctDiagnosis) ||
      aliasMap.get(normalize(d.diagnosis)) === correctDiagnosis
  );

  // Door prep stats
  const totalQuestions = doorPrep.diagnoses.reduce(
    (sum, d) => sum + d.history_questions.filter((q) => q.trim()).length,
    0
  );
  const allManeuvers = doorPrep.diagnoses.flatMap((d) => d.pe_maneuvers);
  const uniqueManeuvers = new Set(allManeuvers.map((m) => m.toLowerCase()));

  // SOAP stats
  const evidenceMapped = soapNote.diagnoses.reduce(
    (sum, d) => sum + d.evidence.length,
    0
  );
  const assessmentsWritten = soapNote.diagnoses.filter(
    (d) => d.assessment.trim().length > 0
  ).length;
  const diagnosticPlanItems = soapNote.diagnoses.reduce(
    (sum, d) => sum + d.diagnostic_plan.length,
    0
  );
  const therapeuticPlanItems = soapNote.diagnoses.reduce(
    (sum, d) => sum + d.therapeutic_plan.length,
    0
  );

  return {
    differentialQuality: {
      total: soapNote.diagnoses.length,
      matchedCount: matched.size,
      matchedDiagnoses: Array.from(matched),
      missedImportant,
      correctDiagnosisIncluded: correctIncluded,
    },
    historyQuality: {
      totalQuestions,
      avgQuestionsPerDiagnosis: doorPrep.diagnoses.length > 0
        ? totalQuestions / doorPrep.diagnoses.length
        : 0,
    },
    peQuality: {
      totalManeuvers: allManeuvers.length,
      uniqueManeuvers: uniqueManeuvers.size,
    },
    soapQuality: {
      evidenceMapped,
      assessmentsWritten,
      diagnosticPlanItems,
      therapeuticPlanItems,
    },
  };
}

/**
 * Build Claude prompt for OSCE feedback narrative.
 */
export function buildOsceFeedbackPrompt(
  comparison: OsceDeterministicResult,
  doorPrep: DoorPrepData,
  soapNote: SoapNoteData,
  chiefComplaint: string,
  correctDiagnosis: string
): string {
  const doorDiagnoses = doorPrep.diagnoses.map((d) => d.diagnosis).join(", ");
  const soapDiagnoses = soapNote.diagnoses.map((d) => d.diagnosis).join(", ");

  return `You are a supportive attending physician evaluating a medical student's OSCE practice.

Case: ${chiefComplaint}
Correct Diagnosis: ${correctDiagnosis}

PERFORMANCE DATA:
- Door Prep differential: ${doorDiagnoses || "none"}
- History questions planned: ${comparison.historyQuality.totalQuestions} total (avg ${comparison.historyQuality.avgQuestionsPerDiagnosis.toFixed(1)}/diagnosis)
- PE maneuvers planned: ${comparison.peQuality.uniqueManeuvers} unique
- SOAP differential: ${soapDiagnoses || "none"}
- Correct diagnosis included: ${comparison.differentialQuality.correctDiagnosisIncluded ? "yes" : "no"}
- Key diagnoses missed: ${comparison.differentialQuality.missedImportant.join(", ") || "none"}
- Evidence linked to diagnoses: ${comparison.soapQuality.evidenceMapped} findings
- Diagnostic plan items: ${comparison.soapQuality.diagnosticPlanItems}
- Therapeutic plan items: ${comparison.soapQuality.therapeuticPlanItems}

Return a JSON object with these exact fields — all values must be arrays of short strings (1 sentence max each):

{
  "rubric_scores": [
    {"category": "Differential Diagnosis", "rating": "excellent|good|developing|needs_work", "comment": "one sentence"},
    {"category": "History Taking", "rating": "...", "comment": "one sentence"},
    {"category": "Physical Exam Selection", "rating": "...", "comment": "one sentence"},
    {"category": "Diagnostic Workup", "rating": "...", "comment": "one sentence"},
    {"category": "Treatment Planning", "rating": "...", "comment": "one sentence"}
  ],
  "strengths": ["one short bullet", "one short bullet", "one short bullet"],
  "improvements": ["one short bullet", "one short bullet"],
  "cant_miss": ["one short bullet about a dangerous diagnosis they should know about — or empty array if none"]
}

Rules:
- Each string is 1 sentence, plain text, no markdown, no asterisks
- Strengths: 2-3 bullets, warm and specific
- Improvements: 1-2 bullets, actionable
- Cant_miss: only include if a dangerous diagnosis was missed or a critical PE finding was overlooked
- Rate: excellent=strong, good=solid minor gaps, developing=effort but notable gaps, needs_work=significant gaps
- Never mention scores, grades, or percentages

Respond with valid JSON only, no markdown fences.`;
}
