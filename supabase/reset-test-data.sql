-- Reset function: clears student-generated test data only
-- Preserves: fcm_users, fcm_cases, fcm_schedule, fcm_settings
-- Run in Supabase Dashboard SQL Editor, or via CLI
CREATE OR REPLACE FUNCTION reset_test_data()
RETURNS jsonb AS $$
DECLARE
  sub_count integer;
  notes_count integer;
  osce_count integer;
BEGIN
  -- Count before deletion for confirmation
  SELECT count(*) INTO sub_count FROM fcm_submissions;
  SELECT count(*) INTO notes_count FROM fcm_notes;
  SELECT count(*) INTO osce_count FROM fcm_osce_responses;

  -- Truncate student activity tables
  TRUNCATE TABLE fcm_submissions RESTART IDENTITY CASCADE;
  TRUNCATE TABLE fcm_notes RESTART IDENTITY CASCADE;
  TRUNCATE TABLE fcm_osce_responses RESTART IDENTITY CASCADE;

  RETURN jsonb_build_object(
    'cleared', jsonb_build_object(
      'submissions', sub_count,
      'notes', notes_count,
      'osce_responses', osce_count
    ),
    'preserved', ARRAY['fcm_users', 'fcm_cases', 'fcm_schedule', 'fcm_settings'],
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
