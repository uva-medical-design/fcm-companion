-- fcm_practice_events: Lightweight event log for practice case actions
-- Used to build the "Your Decision Path" journey timeline
CREATE TABLE IF NOT EXISTS fcm_practice_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES fcm_users(id) ON DELETE CASCADE,
  practice_case_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'diagnosis_added', 'diagnosis_removed', 'diagnosis_reordered', 'confidence_changed', 'submitted'
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_practice_events_user_case ON fcm_practice_events(user_id, practice_case_id);

ALTER TABLE fcm_practice_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for fcm_practice_events" ON fcm_practice_events FOR ALL USING (true) WITH CHECK (true);
