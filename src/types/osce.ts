// OSCE Practice Session Types

export interface DoorPrepDiagnosis {
  diagnosis: string;
  confidence?: number; // 1-5
  history_questions: string[];
  pe_maneuvers: string[];
  sort_order: number;
}

export interface DoorPrepData {
  diagnoses: DoorPrepDiagnosis[];
}

export interface RevisedDiagnosis {
  diagnosis: string;
  evidence: string[]; // findings mapped from S/O
  assessment: string; // free-text assessment
  diagnostic_plan: string[]; // from autocomplete
  therapeutic_plan: string[]; // from autocomplete
  sort_order: number;
}

export interface SoapNoteData {
  subjective_review: string; // student notes on S
  objective_review: string; // student notes on O
  diagnoses: RevisedDiagnosis[];
}

export interface RubricScore {
  category: string;
  rating: "excellent" | "good" | "developing" | "needs_work";
  comment: string;
}

export interface ResourceLink {
  title: string;
  url: string;
  type: "statpearls" | "uptodate" | "other";
}

export interface OSCEFeedbackResult {
  rubric_scores: RubricScore[];
  ai_narrative: string;
  strengths: string[];
  improvements: string[];
  cant_miss?: string[];
  recommended_resources: ResourceLink[];
}

export interface OsceSession {
  id: string;
  user_id: string;
  case_id: string | null;
  practice_case_id: string | null;
  case_source: "scheduled" | "practice" | "custom";
  door_prep: DoorPrepData | null;
  door_prep_submitted_at: string | null;
  soap_note: SoapNoteData | null;
  soap_submitted_at: string | null;
  feedback: OSCEFeedbackResult | null;
  feedback_generated_at: string | null;
  status: "door_prep" | "soap_note" | "completed";
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  chat_interactions_count?: number;
}

export type CaseRef =
  | { source: "scheduled"; case_id: string }
  | { source: "practice"; practice_case_id: string }
  | { source: "custom"; case_id: string };

// Vocabulary entry types
export interface PEManeuverEntry {
  id: string;
  term: string;
  abbreviations: string[];
  body_system: string;
  category: string;
  description: string;
}

export interface DiagnosticTestEntry {
  id: string;
  term: string;
  abbreviations: string[];
  category: string;
  description: string;
}

export interface TherapeuticOptionEntry {
  id: string;
  term: string;
  abbreviations: string[];
  category: string;
  description: string;
}

export interface SoapContext {
  subjective: string;
  objective: string;
}
