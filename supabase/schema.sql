-- FCM Companion Schema
-- Run against the shared Supabase instance (same as HDS Workflow Tool)
-- All tables prefixed with fcm_ to avoid collisions

-- fcm_users: Student/instructor/admin roster
CREATE TABLE IF NOT EXISTS fcm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'student',
  fcm_group TEXT,
  year_level TEXT DEFAULT 'M1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- fcm_cases: The case library (admin-managed)
CREATE TABLE IF NOT EXISTS fcm_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  chief_complaint TEXT NOT NULL,
  patient_name TEXT,
  patient_age INTEGER,
  patient_gender TEXT,
  vitals JSONB DEFAULT '{}',
  body_system TEXT,
  difficulty TEXT DEFAULT 'Moderate',
  differential_answer_key JSONB NOT NULL DEFAULT '[]',
  vindicate_categories JSONB DEFAULT '[]',
  key_teaching_points JSONB DEFAULT '[]',
  full_case_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- fcm_schedule: Maps cases to weeks and groups
CREATE TABLE IF NOT EXISTS fcm_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES fcm_cases(id) ON DELETE CASCADE,
  fcm_group TEXT,
  week_label TEXT NOT NULL,
  unlock_date DATE NOT NULL,
  due_date DATE NOT NULL,
  session_date DATE NOT NULL,
  semester TEXT DEFAULT '2026-Spring',
  UNIQUE(case_id, fcm_group, semester)
);

-- fcm_submissions: Student differential submissions
CREATE TABLE IF NOT EXISTS fcm_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES fcm_users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES fcm_cases(id) ON DELETE CASCADE,
  diagnoses JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  feedback JSONB DEFAULT '{}',
  feedback_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, case_id)
);

-- fcm_notes: Per-case student notes
CREATE TABLE IF NOT EXISTS fcm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES fcm_users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES fcm_cases(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  is_starred BOOLEAN DEFAULT false,
  is_sent_to_instructor BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, case_id)
);

-- fcm_settings: Admin-level config (key-value)
CREATE TABLE IF NOT EXISTS fcm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES fcm_users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- fcm_osce_responses: OSCE practice tracking
CREATE TABLE IF NOT EXISTS fcm_osce_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES fcm_users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES fcm_cases(id) ON DELETE CASCADE,
  response_type TEXT DEFAULT 'text',
  response_content TEXT,
  duration_seconds INTEGER,
  evaluation JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- fcm_quiz_scores: Persisted quiz attempt scores
CREATE TABLE IF NOT EXISTS fcm_quiz_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES fcm_users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES fcm_cases(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  quiz_mode TEXT NOT NULL DEFAULT 'full',
  completed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_quiz_scores_user_case ON fcm_quiz_scores(user_id, case_id);

-- RLS policies (permissive for prototype)
ALTER TABLE fcm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_osce_responses ENABLE ROW LEVEL SECURITY;

-- Allow all operations for prototype (anon key)
CREATE POLICY "Allow all for fcm_users" ON fcm_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for fcm_cases" ON fcm_cases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for fcm_schedule" ON fcm_schedule FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for fcm_submissions" ON fcm_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for fcm_notes" ON fcm_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for fcm_settings" ON fcm_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for fcm_osce_responses" ON fcm_osce_responses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE fcm_quiz_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for fcm_quiz_scores" ON fcm_quiz_scores FOR ALL USING (true) WITH CHECK (true);
