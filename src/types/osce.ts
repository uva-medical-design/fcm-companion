export interface OsceSession {
  id: string;
  user_id: string;
  case_id: string | null;
  practice_case_id: string | null;
  case_source: 'scheduled' | 'practice' | 'custom';
  door_prep: DoorPrepData | null;
  door_prep_submitted_at: string | null;
  soap_note: SoapNoteData | null;
  soap_submitted_at: string | null;
  feedback: OsceFeedbackResult | null;
  feedback_generated_at: string | null;
  status: 'door_prep' | 'soap_note' | 'completed';
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoorPrepDiagnosis {
  id: string;
  diagnosis: string;
  historyQuestions: string[];
  peManeuvers: string[];
  confidence: number;
  sort_order: number;
}

export interface DoorPrepData {
  diagnoses: DoorPrepDiagnosis[];
}

export interface RevisedDiagnosis {
  id: string;
  diagnosis: string;
  supportingEvidence: string[];
  diagnosticPlan: string[];
  therapeuticPlan: string[];
  confidence: number;
  sort_order: number;
}

export interface SoapNoteData {
  subjective: string;
  objective: string;
  diagnoses: RevisedDiagnosis[];
  highlights?: { text: string; type: 'highlight' | 'bold' }[];
}

export interface RubricScore {
  category: string;
  rating: 'excellent' | 'good' | 'developing' | 'needs_work';
  comment: string;
}

export interface OsceFeedbackResult {
  rubric: RubricScore[];
  strengths: string[];
  improvements: string[];
  dont_miss: string[];
  overall_comment: string;
}
