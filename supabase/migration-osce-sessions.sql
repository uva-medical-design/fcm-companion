CREATE TABLE IF NOT EXISTS fcm_osce_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES fcm_users(id) NOT NULL,
  case_id UUID REFERENCES fcm_cases(id),
  practice_case_id TEXT,
  case_source TEXT NOT NULL CHECK (case_source IN ('scheduled','practice','custom')),
  door_prep JSONB,
  door_prep_submitted_at TIMESTAMPTZ,
  soap_note JSONB,
  soap_submitted_at TIMESTAMPTZ,
  feedback JSONB,
  feedback_generated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'door_prep' CHECK (status IN ('door_prep','soap_note','completed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_osce_sessions_user ON fcm_osce_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_osce_sessions_case ON fcm_osce_sessions(case_id);

ALTER TABLE fcm_osce_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON fcm_osce_sessions FOR ALL USING (true) WITH CHECK (true);
