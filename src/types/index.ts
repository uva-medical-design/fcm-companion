export type UserRole = "student" | "instructor" | "admin";

export interface FcmUser {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  fcm_group: string | null;
  year_level: string;
  created_at: string;
}

export interface DiagnosisEntry {
  diagnosis: string;
  /** @deprecated Use vindicate_categories instead */
  vindicate_category?: string;
  vindicate_categories?: string[];
  reasoning?: string;
  confidence?: number; // 1-5 scale
  sort_order: number;
}

export interface PracticeCase {
  id: string;
  source: string;
  title: string;
  chief_complaint: string;
  patient_age: number | null;
  patient_gender: string | null;
  vitals: Record<string, string>;
  body_system: string | null;
  difficulty: string;
  correct_diagnosis: string;
  full_case_data: Record<string, unknown>;
  has_structured_exam: boolean;
}

export interface AnswerKeyEntry {
  diagnosis: string;
  tier: "most_likely" | "moderate" | "less_likely" | "unlikely_important";
  vindicate_category: string;
  is_common: boolean;
  is_cant_miss: boolean;
  aliases: string[];
  likelihood?: string;
}

export interface FcmCase {
  id: string;
  case_id: string;
  title: string;
  chief_complaint: string;
  patient_name: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  vitals: Record<string, string>;
  body_system: string | null;
  difficulty: string;
  differential_answer_key: AnswerKeyEntry[];
  vindicate_categories: string[];
  key_teaching_points: string[];
  full_case_data: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FcmSchedule {
  id: string;
  case_id: string;
  fcm_group: string | null;
  week_label: string;
  unlock_date: string;
  due_date: string;
  session_date: string;
  semester: string;
}

export interface FcmSubmission {
  id: string;
  user_id: string;
  case_id: string;
  diagnoses: DiagnosisEntry[];
  status: "draft" | "submitted" | "resubmitted";
  submitted_at: string | null;
  feedback: FeedbackResult | null;
  feedback_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FcmNote {
  id: string;
  user_id: string;
  case_id: string;
  content: string;
  is_starred: boolean;
  is_sent_to_instructor: boolean;
  created_at: string;
  updated_at: string;
}

export interface FcmSettings {
  id: string;
  key: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string;
}

export interface FcmQuizScore {
  id: string;
  user_id: string;
  case_id: string;
  score: number;
  total: number;
  quiz_mode: "full" | "quick";
  completed_at: string;
}

export interface OsceResponse {
  id: string;
  user_id: string;
  case_id: string;
  response_type: "text" | "voice";
  response_content: string | null;
  duration_seconds: number | null;
  evaluation: Record<string, unknown>;
  created_at: string;
}

// Feedback types
export interface FeedbackResult {
  tiered_differential: {
    most_likely: string[];
    moderate: string[];
    less_likely: string[];
    unlikely_important: string[];
  };
  common_hit: string[];
  common_missed: string[];
  cant_miss_hit: string[];
  cant_miss_missed: string[];
  vindicate_coverage: Record<string, boolean>;
  unmatched: string[];
  fuzzy_matched?: { student: string; matched_to: string }[];
  ai_narrative: string;
  feedback_mode: string;
}

// Schedule with joined case data
export interface ScheduleWithCase extends FcmSchedule {
  fcm_cases: FcmCase;
}

// Submission with joined case data
export interface SubmissionWithCase extends FcmSubmission {
  fcm_cases: FcmCase;
}

// VINDICATE categories
export const VINDICATE_CATEGORIES = [
  { key: "V", label: "Vascular" },
  { key: "I", label: "Infectious" },
  { key: "N", label: "Neoplastic" },
  { key: "D", label: "Degenerative" },
  { key: "I2", label: "Iatrogenic/Intoxication" },
  { key: "C", label: "Congenital" },
  { key: "A", label: "Autoimmune/Allergic" },
  { key: "T", label: "Traumatic" },
  { key: "E", label: "Endocrine/Metabolic" },
] as const;

export type VindicateKey = typeof VINDICATE_CATEGORIES[number]["key"];
