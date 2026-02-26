-- Migration: OSCE Practice Sessions
-- Adds fcm_osce_sessions table for the three-phase OSCE practice flow

CREATE TABLE IF NOT EXISTS fcm_osce_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES fcm_users(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES fcm_cases(id),
  practice_case_id TEXT,
  case_source TEXT NOT NULL CHECK (case_source IN ('scheduled', 'practice', 'custom')),
  door_prep JSONB,
  door_prep_submitted_at TIMESTAMPTZ,
  soap_note JSONB,
  soap_submitted_at TIMESTAMPTZ,
  feedback JSONB,
  feedback_generated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'door_prep'
    CHECK (status IN ('door_prep', 'soap_note', 'completed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  chat_interactions_count INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_osce_sessions_user ON fcm_osce_sessions(user_id);
CREATE INDEX idx_osce_sessions_case ON fcm_osce_sessions(case_id);

-- Add chat_interactions_count if table already exists
ALTER TABLE fcm_osce_sessions ADD COLUMN IF NOT EXISTS chat_interactions_count INTEGER DEFAULT 0;

ALTER TABLE fcm_osce_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for fcm_osce_sessions" ON fcm_osce_sessions FOR ALL USING (true) WITH CHECK (true);
