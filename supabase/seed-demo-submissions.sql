-- Demo Submissions for Presenter Mode
-- Run after seed.sql to populate /present with realistic data
-- These create submissions for the Chest Pain case (FCM-CV-001) from 5 students

-- ============================================
-- SUBMISSIONS for FCM-CV-001 (Chest Pain)
-- ============================================

-- Student 1: Demo Student — strong submission, hits correct diagnosis + can't-miss items
INSERT INTO fcm_submissions (user_id, case_id, diagnoses, status, submitted_at)
SELECT
  u.id,
  c.id,
  '[
    {"diagnosis": "Acute Pericarditis", "sort_order": 0, "confidence": 4, "reasoning": "Pleuritic chest pain with positional relief, recent URI"},
    {"diagnosis": "Acute Coronary Syndrome", "sort_order": 1, "confidence": 3, "reasoning": "Family history of premature CAD, though young age makes this less likely"},
    {"diagnosis": "Myocarditis", "sort_order": 2, "confidence": 2, "reasoning": "Post-viral inflammation could affect myocardium"},
    {"diagnosis": "Pulmonary Embolism", "sort_order": 3, "confidence": 2, "reasoning": "Always consider in acute chest pain, though low pretest probability"},
    {"diagnosis": "Costochondritis", "sort_order": 4, "confidence": 2, "reasoning": "Reproducible chest wall tenderness"}
  ]'::jsonb,
  'submitted',
  NOW() - INTERVAL '2 hours'
FROM fcm_users u, fcm_cases c
WHERE u.email = 'demo.student@virginia.edu' AND c.case_id = 'FCM-CV-001'
ON CONFLICT (user_id, case_id) DO UPDATE SET
  diagnoses = EXCLUDED.diagnoses, status = EXCLUDED.status, submitted_at = EXCLUDED.submitted_at;

-- Student 2: Alex Rivera — good but missed PE
INSERT INTO fcm_submissions (user_id, case_id, diagnoses, status, submitted_at)
SELECT
  u.id,
  c.id,
  '[
    {"diagnosis": "Acute Pericarditis", "sort_order": 0, "confidence": 5, "reasoning": "Classic presentation with pleuritic pain and positional relief"},
    {"diagnosis": "Costochondritis", "sort_order": 1, "confidence": 3, "reasoning": "Common cause of chest pain in young adults"},
    {"diagnosis": "Acute Coronary Syndrome", "sort_order": 2, "confidence": 2, "reasoning": "Family history concerning but age argues against"},
    {"diagnosis": "GERD", "sort_order": 3, "confidence": 2, "reasoning": "Could cause burning chest pain"}
  ]'::jsonb,
  'submitted',
  NOW() - INTERVAL '1 hour 45 minutes'
FROM fcm_users u, fcm_cases c
WHERE u.email = 'alex.rivera@virginia.edu' AND c.case_id = 'FCM-CV-001'
ON CONFLICT (user_id, case_id) DO UPDATE SET
  diagnoses = EXCLUDED.diagnoses, status = EXCLUDED.status, submitted_at = EXCLUDED.submitted_at;

-- Student 3: Jordan Kim — thorough, includes uncommon differentials
INSERT INTO fcm_submissions (user_id, case_id, diagnoses, status, submitted_at)
SELECT
  u.id,
  c.id,
  '[
    {"diagnosis": "Acute Pericarditis", "sort_order": 0, "confidence": 4, "reasoning": "Positional pain, friction rub possible"},
    {"diagnosis": "Acute Coronary Syndrome", "sort_order": 1, "confidence": 3, "reasoning": "Cannot rule out given family history"},
    {"diagnosis": "Aortic Dissection", "sort_order": 2, "confidence": 1, "reasoning": "Unlikely but catastrophic — must consider"},
    {"diagnosis": "Pulmonary Embolism", "sort_order": 3, "confidence": 2, "reasoning": "Young athlete, possible dehydration risk"},
    {"diagnosis": "Pneumothorax", "sort_order": 4, "confidence": 2, "reasoning": "Tall young male — spontaneous pneumothorax possible"},
    {"diagnosis": "Myocarditis", "sort_order": 5, "confidence": 2, "reasoning": "Post-viral, could explain tachycardia"}
  ]'::jsonb,
  'submitted',
  NOW() - INTERVAL '1 hour 30 minutes'
FROM fcm_users u, fcm_cases c
WHERE u.email = 'jordan.kim@virginia.edu' AND c.case_id = 'FCM-CV-001'
ON CONFLICT (user_id, case_id) DO UPDATE SET
  diagnoses = EXCLUDED.diagnoses, status = EXCLUDED.status, submitted_at = EXCLUDED.submitted_at;

-- Student 4: Sam Patel — shorter list, missed some can't-miss items
INSERT INTO fcm_submissions (user_id, case_id, diagnoses, status, submitted_at)
SELECT
  u.id,
  c.id,
  '[
    {"diagnosis": "Acute Coronary Syndrome", "sort_order": 0, "confidence": 3, "reasoning": "Strong family history drives this to top"},
    {"diagnosis": "Rib Contusion", "sort_order": 1, "confidence": 4, "reasoning": "Athlete with possible trauma history"},
    {"diagnosis": "Anxiety/Panic Attack", "sort_order": 2, "confidence": 3, "reasoning": "Young patient with family cardiac anxiety"}
  ]'::jsonb,
  'submitted',
  NOW() - INTERVAL '1 hour 15 minutes'
FROM fcm_users u, fcm_cases c
WHERE u.email = 'sam.patel@virginia.edu' AND c.case_id = 'FCM-CV-001'
ON CONFLICT (user_id, case_id) DO UPDATE SET
  diagnoses = EXCLUDED.diagnoses, status = EXCLUDED.status, submitted_at = EXCLUDED.submitted_at;

-- Student 5: Taylor Chen — good breadth but missed correct diagnosis
INSERT INTO fcm_submissions (user_id, case_id, diagnoses, status, submitted_at)
SELECT
  u.id,
  c.id,
  '[
    {"diagnosis": "Acute Coronary Syndrome", "sort_order": 0, "confidence": 4, "reasoning": "Family history most concerning feature"},
    {"diagnosis": "Pulmonary Embolism", "sort_order": 1, "confidence": 3, "reasoning": "Tachycardia with chest pain needs PE workup"},
    {"diagnosis": "Costochondritis", "sort_order": 2, "confidence": 3, "reasoning": "Musculoskeletal cause very common at this age"},
    {"diagnosis": "Pneumothorax", "sort_order": 3, "confidence": 2, "reasoning": "Sudden onset in young male"},
    {"diagnosis": "GERD", "sort_order": 4, "confidence": 1, "reasoning": "Less likely but should consider GI causes"}
  ]'::jsonb,
  'submitted',
  NOW() - INTERVAL '55 minutes'
FROM fcm_users u, fcm_cases c
WHERE u.email = 'taylor.chen@virginia.edu' AND c.case_id = 'FCM-CV-001'
ON CONFLICT (user_id, case_id) DO UPDATE SET
  diagnoses = EXCLUDED.diagnoses, status = EXCLUDED.status, submitted_at = EXCLUDED.submitted_at;

-- ============================================
-- SENTIMENTS for FCM-CV-001
-- ============================================
INSERT INTO fcm_sentiments (user_id, case_id, sentiment)
SELECT u.id, c.id, 'confident'
FROM fcm_users u, fcm_cases c
WHERE u.email = 'demo.student@virginia.edu' AND c.case_id = 'FCM-CV-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_sentiments (user_id, case_id, sentiment)
SELECT u.id, c.id, 'confident'
FROM fcm_users u, fcm_cases c
WHERE u.email = 'alex.rivera@virginia.edu' AND c.case_id = 'FCM-CV-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_sentiments (user_id, case_id, sentiment)
SELECT u.id, c.id, 'confident'
FROM fcm_users u, fcm_cases c
WHERE u.email = 'jordan.kim@virginia.edu' AND c.case_id = 'FCM-CV-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_sentiments (user_id, case_id, sentiment)
SELECT u.id, c.id, 'uncertain'
FROM fcm_users u, fcm_cases c
WHERE u.email = 'sam.patel@virginia.edu' AND c.case_id = 'FCM-CV-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_sentiments (user_id, case_id, sentiment)
SELECT u.id, c.id, 'uncertain'
FROM fcm_users u, fcm_cases c
WHERE u.email = 'taylor.chen@virginia.edu' AND c.case_id = 'FCM-CV-001'
ON CONFLICT DO NOTHING;
