-- FCM Companion — Test Cases (5 additional cases with full answer keys)
-- Run after schema.sql and seed.sql
-- These cases provide a realistic spread across body systems for UI testing
-- Generated 2026-02-20

-- ============================================
-- CASE 4: Headache (Neurological)
-- ============================================
INSERT INTO fcm_cases (case_id, title, chief_complaint, patient_name, patient_age, patient_gender, vitals, body_system, difficulty, differential_answer_key, vindicate_categories, key_teaching_points, full_case_data, sort_order)
VALUES (
  'FCM-NEURO-001',
  'Severe Headache with Visual Changes',
  '34-year-old female with worst headache of her life',
  'Priya Sharma',
  34,
  'Female',
  '{"temperature": "98.8°F", "heart_rate": "92 bpm", "blood_pressure": "158/96 mmHg", "respiratory_rate": "16/min", "o2_sat": "99% RA", "bmi": "24.1"}'::jsonb,
  'Neurological',
  'Moderate',
  '[
    {"diagnosis": "Subarachnoid Hemorrhage", "tier": "most_likely", "vindicate_category": "V", "is_common": false, "is_cant_miss": true, "aliases": ["SAH", "subarachnoid bleed", "ruptured aneurysm", "berry aneurysm rupture"]},
    {"diagnosis": "Migraine with Aura", "tier": "most_likely", "vindicate_category": "A", "is_common": true, "is_cant_miss": false, "aliases": ["migraine", "classic migraine", "migraine headache"]},
    {"diagnosis": "Hypertensive Emergency", "tier": "moderate", "vindicate_category": "V", "is_common": true, "is_cant_miss": true, "aliases": ["hypertensive crisis", "malignant hypertension", "hypertensive urgency"]},
    {"diagnosis": "Meningitis", "tier": "moderate", "vindicate_category": "I", "is_common": false, "is_cant_miss": true, "aliases": ["bacterial meningitis", "viral meningitis", "meningoencephalitis"]},
    {"diagnosis": "Tension Headache", "tier": "less_likely", "vindicate_category": "T", "is_common": true, "is_cant_miss": false, "aliases": ["tension-type headache", "TTH", "stress headache"]},
    {"diagnosis": "Cluster Headache", "tier": "less_likely", "vindicate_category": "A", "is_common": false, "is_cant_miss": false, "aliases": ["cluster", "Horton headache"]},
    {"diagnosis": "Cerebral Venous Thrombosis", "tier": "unlikely_important", "vindicate_category": "V", "is_common": false, "is_cant_miss": true, "aliases": ["CVT", "sagittal sinus thrombosis", "cerebral venous sinus thrombosis"]},
    {"diagnosis": "Intracranial Mass", "tier": "unlikely_important", "vindicate_category": "N", "is_common": false, "is_cant_miss": true, "aliases": ["brain tumor", "intracranial neoplasm", "brain mass", "glioma"]},
    {"diagnosis": "Idiopathic Intracranial Hypertension", "tier": "less_likely", "vindicate_category": "A", "is_common": false, "is_cant_miss": false, "aliases": ["IIH", "pseudotumor cerebri", "benign intracranial hypertension"]},
    {"diagnosis": "Preeclampsia", "tier": "less_likely", "vindicate_category": "E", "is_common": false, "is_cant_miss": true, "aliases": ["pre-eclampsia", "toxemia of pregnancy"]}
  ]'::jsonb,
  '["V", "I", "N", "T", "A", "E"]'::jsonb,
  '[
    "Thunderclap headache = SAH until proven otherwise — CT head then LP if CT negative",
    "\"Worst headache of my life\" is a red flag phrase that demands immediate workup",
    "Sensitivity of CT for SAH drops from 98% at 6 hours to 86% at 72 hours — timing matters",
    "Always ask about oral contraceptives + smoking when considering CVT in young women",
    "Neck stiffness (meningismus) can appear in both SAH and meningitis — distinguish by history"
  ]'::jsonb,
  '{}'::jsonb,
  4
)
ON CONFLICT (case_id) DO NOTHING;

-- ============================================
-- CASE 5: Shortness of Breath (Pulmonary)
-- ============================================
INSERT INTO fcm_cases (case_id, title, chief_complaint, patient_name, patient_age, patient_gender, vitals, body_system, difficulty, differential_answer_key, vindicate_categories, key_teaching_points, full_case_data, sort_order)
VALUES (
  'FCM-PULM-001',
  'Progressive Dyspnea in a Smoker',
  '58-year-old male with worsening shortness of breath over 3 weeks',
  'Robert Daniels',
  58,
  'Male',
  '{"temperature": "99.3°F", "heart_rate": "104 bpm", "blood_pressure": "148/92 mmHg", "respiratory_rate": "24/min", "o2_sat": "91% RA", "bmi": "31.5"}'::jsonb,
  'Pulmonary',
  'Moderate',
  '[
    {"diagnosis": "COPD Exacerbation", "tier": "most_likely", "vindicate_category": "I", "is_common": true, "is_cant_miss": false, "aliases": ["COPD flare", "acute exacerbation of COPD", "AECOPD", "chronic bronchitis exacerbation", "emphysema exacerbation"]},
    {"diagnosis": "Heart Failure", "tier": "most_likely", "vindicate_category": "V", "is_common": true, "is_cant_miss": true, "aliases": ["CHF", "congestive heart failure", "decompensated heart failure", "HFrEF", "HFpEF", "left heart failure"]},
    {"diagnosis": "Pneumonia", "tier": "moderate", "vindicate_category": "I", "is_common": true, "is_cant_miss": false, "aliases": ["community-acquired pneumonia", "CAP", "bacterial pneumonia", "lobar pneumonia"]},
    {"diagnosis": "Pulmonary Embolism", "tier": "moderate", "vindicate_category": "V", "is_common": false, "is_cant_miss": true, "aliases": ["PE", "blood clot in lung", "pulmonary thromboembolism"]},
    {"diagnosis": "Lung Cancer", "tier": "moderate", "vindicate_category": "N", "is_common": false, "is_cant_miss": true, "aliases": ["bronchogenic carcinoma", "lung mass", "pulmonary malignancy", "NSCLC", "small cell lung cancer"]},
    {"diagnosis": "Pleural Effusion", "tier": "less_likely", "vindicate_category": "V", "is_common": true, "is_cant_miss": false, "aliases": ["fluid around lung", "pleural fluid"]},
    {"diagnosis": "Asthma Exacerbation", "tier": "less_likely", "vindicate_category": "A", "is_common": true, "is_cant_miss": false, "aliases": ["asthma attack", "acute asthma", "bronchospasm"]},
    {"diagnosis": "Pulmonary Fibrosis", "tier": "less_likely", "vindicate_category": "A", "is_common": false, "is_cant_miss": false, "aliases": ["IPF", "interstitial lung disease", "ILD", "idiopathic pulmonary fibrosis"]},
    {"diagnosis": "Anemia", "tier": "less_likely", "vindicate_category": "E", "is_common": true, "is_cant_miss": false, "aliases": ["low hemoglobin", "iron deficiency anemia"]},
    {"diagnosis": "Pericardial Effusion with Tamponade", "tier": "unlikely_important", "vindicate_category": "V", "is_common": false, "is_cant_miss": true, "aliases": ["cardiac tamponade", "pericardial tamponade", "tamponade"]}
  ]'::jsonb,
  '["V", "I", "N", "A", "E"]'::jsonb,
  '[
    "Dyspnea in a smoker: always consider the overlap of COPD, heart failure, and lung cancer",
    "BNP/NT-proBNP helps distinguish cardiac vs pulmonary causes of dyspnea",
    "30-pack-year history + new dyspnea = chest CT needed to rule out malignancy",
    "O2 sat of 91% is significant — this patient is hypoxic at rest",
    "Wells criteria for PE: immobility, malignancy, and tachycardia are all present here"
  ]'::jsonb,
  '{}'::jsonb,
  5
)
ON CONFLICT (case_id) DO NOTHING;

-- ============================================
-- CASE 6: Fatigue and Weight Loss (Endocrine/Constitutional)
-- ============================================
INSERT INTO fcm_cases (case_id, title, chief_complaint, patient_name, patient_age, patient_gender, vitals, body_system, difficulty, differential_answer_key, vindicate_categories, key_teaching_points, full_case_data, sort_order)
VALUES (
  'FCM-ENDO-001',
  'Unintentional Weight Loss and Fatigue',
  '28-year-old female with 15-pound weight loss and fatigue over 2 months',
  'Maya Thompson',
  28,
  'Female',
  '{"temperature": "99.4°F", "heart_rate": "108 bpm", "blood_pressure": "118/68 mmHg", "respiratory_rate": "16/min", "o2_sat": "99% RA", "bmi": "19.2"}'::jsonb,
  'Endocrine/Metabolic',
  'Moderate',
  '[
    {"diagnosis": "Hyperthyroidism", "tier": "most_likely", "vindicate_category": "E", "is_common": true, "is_cant_miss": false, "aliases": ["Graves disease", "thyrotoxicosis", "overactive thyroid", "Graves"]},
    {"diagnosis": "Type 1 Diabetes Mellitus", "tier": "most_likely", "vindicate_category": "E", "is_common": true, "is_cant_miss": true, "aliases": ["T1DM", "type 1 diabetes", "DKA", "diabetic ketoacidosis", "new onset diabetes"]},
    {"diagnosis": "Celiac Disease", "tier": "moderate", "vindicate_category": "A", "is_common": false, "is_cant_miss": false, "aliases": ["celiac sprue", "gluten enteropathy", "celiac"]},
    {"diagnosis": "Inflammatory Bowel Disease", "tier": "moderate", "vindicate_category": "A", "is_common": false, "is_cant_miss": false, "aliases": ["IBD", "Crohn disease", "Crohns", "ulcerative colitis", "UC"]},
    {"diagnosis": "HIV/AIDS", "tier": "moderate", "vindicate_category": "I", "is_common": false, "is_cant_miss": true, "aliases": ["HIV infection", "acute HIV", "AIDS", "human immunodeficiency virus"]},
    {"diagnosis": "Depression", "tier": "less_likely", "vindicate_category": "A", "is_common": true, "is_cant_miss": false, "aliases": ["major depressive disorder", "MDD", "clinical depression"]},
    {"diagnosis": "Eating Disorder", "tier": "less_likely", "vindicate_category": "A", "is_common": false, "is_cant_miss": false, "aliases": ["anorexia nervosa", "anorexia", "bulimia"]},
    {"diagnosis": "Adrenal Insufficiency", "tier": "less_likely", "vindicate_category": "E", "is_common": false, "is_cant_miss": true, "aliases": ["Addison disease", "Addisons", "adrenal crisis", "primary adrenal insufficiency"]},
    {"diagnosis": "Lymphoma", "tier": "unlikely_important", "vindicate_category": "N", "is_common": false, "is_cant_miss": true, "aliases": ["Hodgkin lymphoma", "non-Hodgkin lymphoma", "NHL"]},
    {"diagnosis": "Tuberculosis", "tier": "unlikely_important", "vindicate_category": "I", "is_common": false, "is_cant_miss": true, "aliases": ["TB", "pulmonary TB", "tuberculosis infection"]}
  ]'::jsonb,
  '["E", "A", "I", "N"]'::jsonb,
  '[
    "Unintentional weight loss >5% in 6 months is a red flag requiring systematic workup",
    "The classic triad for hyperthyroidism: weight loss + tachycardia + heat intolerance",
    "Young adult with weight loss + polyuria + polydipsia = check glucose and A1c urgently",
    "Always screen for HIV in unexplained weight loss — acute HIV often mimics viral illness",
    "Ask about night sweats and lymphadenopathy — these B symptoms suggest lymphoma or TB"
  ]'::jsonb,
  '{}'::jsonb,
  6
)
ON CONFLICT (case_id) DO NOTHING;

-- ============================================
-- CASE 7: Urinary Symptoms (Renal/GU)
-- ============================================
INSERT INTO fcm_cases (case_id, title, chief_complaint, patient_name, patient_age, patient_gender, vitals, body_system, difficulty, differential_answer_key, vindicate_categories, key_teaching_points, full_case_data, sort_order)
VALUES (
  'FCM-RENAL-001',
  'Flank Pain with Dysuria',
  '31-year-old male with left flank pain and painful urination',
  'James Okafor',
  31,
  'Male',
  '{"temperature": "101.2°F", "heart_rate": "96 bpm", "blood_pressure": "128/78 mmHg", "respiratory_rate": "18/min", "o2_sat": "99% RA", "bmi": "26.0"}'::jsonb,
  'Renal/GU',
  'Easy',
  '[
    {"diagnosis": "Pyelonephritis", "tier": "most_likely", "vindicate_category": "I", "is_common": true, "is_cant_miss": true, "aliases": ["kidney infection", "upper UTI", "acute pyelonephritis"]},
    {"diagnosis": "Nephrolithiasis", "tier": "most_likely", "vindicate_category": "T", "is_common": true, "is_cant_miss": false, "aliases": ["kidney stone", "renal calculus", "ureteral stone", "renal colic"]},
    {"diagnosis": "Urinary Tract Infection", "tier": "moderate", "vindicate_category": "I", "is_common": true, "is_cant_miss": false, "aliases": ["UTI", "cystitis", "bladder infection", "lower UTI"]},
    {"diagnosis": "Ureteropelvic Junction Obstruction", "tier": "less_likely", "vindicate_category": "D", "is_common": false, "is_cant_miss": false, "aliases": ["UPJ obstruction", "ureteral obstruction"]},
    {"diagnosis": "Renal Abscess", "tier": "less_likely", "vindicate_category": "I", "is_common": false, "is_cant_miss": true, "aliases": ["perinephric abscess", "kidney abscess"]},
    {"diagnosis": "Epididymitis", "tier": "less_likely", "vindicate_category": "I", "is_common": true, "is_cant_miss": false, "aliases": ["epididymo-orchitis", "testicular infection"]},
    {"diagnosis": "Prostatitis", "tier": "less_likely", "vindicate_category": "I", "is_common": true, "is_cant_miss": false, "aliases": ["acute prostatitis", "bacterial prostatitis"]},
    {"diagnosis": "Musculoskeletal Back Pain", "tier": "less_likely", "vindicate_category": "T", "is_common": true, "is_cant_miss": false, "aliases": ["lumbar strain", "muscle strain", "mechanical back pain"]},
    {"diagnosis": "Renal Cell Carcinoma", "tier": "unlikely_important", "vindicate_category": "N", "is_common": false, "is_cant_miss": true, "aliases": ["RCC", "kidney cancer", "renal mass"]},
    {"diagnosis": "Abdominal Aortic Aneurysm", "tier": "unlikely_important", "vindicate_category": "V", "is_common": false, "is_cant_miss": true, "aliases": ["AAA", "aortic aneurysm"]}
  ]'::jsonb,
  '["I", "T", "D", "N", "V"]'::jsonb,
  '[
    "Fever + flank pain + dysuria = pyelonephritis until proven otherwise",
    "CVA tenderness: costovertebral angle percussion — positive in pyelonephritis and stone with infection",
    "Kidney stone + fever is a urologic emergency — infected obstructed system needs urgent drainage",
    "Young males with UTI symptoms warrant STI screening (Chlamydia, Gonorrhea)",
    "Hematuria in the absence of infection or stone should raise concern for malignancy"
  ]'::jsonb,
  '{}'::jsonb,
  7
)
ON CONFLICT (case_id) DO NOTHING;

-- ============================================
-- CASE 8: Joint Pain (Rheumatologic)
-- ============================================
INSERT INTO fcm_cases (case_id, title, chief_complaint, patient_name, patient_age, patient_gender, vitals, body_system, difficulty, differential_answer_key, vindicate_categories, key_teaching_points, full_case_data, sort_order)
VALUES (
  'FCM-RHEUM-001',
  'Acute Monoarticular Joint Pain',
  '62-year-old male with acute right knee swelling and pain',
  'William Chang',
  62,
  'Male',
  '{"temperature": "100.8°F", "heart_rate": "86 bpm", "blood_pressure": "142/88 mmHg", "respiratory_rate": "14/min", "o2_sat": "98% RA", "bmi": "30.2"}'::jsonb,
  'Musculoskeletal',
  'Easy',
  '[
    {"diagnosis": "Gout", "tier": "most_likely", "vindicate_category": "E", "is_common": true, "is_cant_miss": false, "aliases": ["gouty arthritis", "acute gout", "crystal arthropathy", "uric acid arthritis"]},
    {"diagnosis": "Septic Arthritis", "tier": "most_likely", "vindicate_category": "I", "is_common": false, "is_cant_miss": true, "aliases": ["septic joint", "infectious arthritis", "bacterial arthritis", "joint infection"]},
    {"diagnosis": "Pseudogout", "tier": "moderate", "vindicate_category": "E", "is_common": true, "is_cant_miss": false, "aliases": ["CPPD", "calcium pyrophosphate deposition", "calcium pyrophosphate disease", "chondrocalcinosis"]},
    {"diagnosis": "Osteoarthritis Flare", "tier": "moderate", "vindicate_category": "D", "is_common": true, "is_cant_miss": false, "aliases": ["OA flare", "degenerative arthritis", "degenerative joint disease"]},
    {"diagnosis": "Reactive Arthritis", "tier": "less_likely", "vindicate_category": "A", "is_common": false, "is_cant_miss": false, "aliases": ["Reiter syndrome", "reactive joint", "post-infectious arthritis"]},
    {"diagnosis": "Meniscal Tear", "tier": "less_likely", "vindicate_category": "T", "is_common": true, "is_cant_miss": false, "aliases": ["torn meniscus", "meniscus tear", "knee meniscus injury"]},
    {"diagnosis": "Rheumatoid Arthritis", "tier": "less_likely", "vindicate_category": "A", "is_common": true, "is_cant_miss": false, "aliases": ["RA", "rheumatoid"]},
    {"diagnosis": "Hemarthrosis", "tier": "less_likely", "vindicate_category": "V", "is_common": false, "is_cant_miss": false, "aliases": ["blood in joint", "joint hemorrhage"]},
    {"diagnosis": "Lyme Arthritis", "tier": "unlikely_important", "vindicate_category": "I", "is_common": false, "is_cant_miss": true, "aliases": ["Lyme disease", "Borrelia arthritis"]},
    {"diagnosis": "Prosthetic Joint Infection", "tier": "unlikely_important", "vindicate_category": "I", "is_common": false, "is_cant_miss": true, "aliases": ["infected prosthesis", "periprosthetic joint infection", "PJI"]}
  ]'::jsonb,
  '["E", "I", "D", "A", "T", "V"]'::jsonb,
  '[
    "Hot, swollen, red joint = septic arthritis until proven otherwise — arthrocentesis is MANDATORY",
    "Cannot distinguish gout from septic arthritis clinically — joint fluid analysis is the gold standard",
    "Synovial fluid: WBC >50,000 with >90% PMNs = septic until culture says otherwise",
    "Gout: negatively birefringent needle-shaped crystals; Pseudogout: positively birefringent rhomboid crystals",
    "Risk factors for septic joint: prior joint disease, prosthesis, immunosuppression, recent bacteremia"
  ]'::jsonb,
  '{}'::jsonb,
  8
)
ON CONFLICT (case_id) DO NOTHING;

-- ============================================
-- SCHEDULE for new cases (Weeks 10-14)
-- ============================================

-- Group A schedule
INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group A', 'Week 10 — FCM 1B', '2026-03-09', '2026-03-12', '2026-03-12', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-NEURO-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group A', 'Week 11 — FCM 1B', '2026-03-16', '2026-03-19', '2026-03-19', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-PULM-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group A', 'Week 12 — FCM 1B', '2026-03-23', '2026-03-26', '2026-03-26', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-ENDO-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group A', 'Week 13 — FCM 1B', '2026-03-30', '2026-04-02', '2026-04-02', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-RENAL-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group A', 'Week 14 — FCM 1B', '2026-04-06', '2026-04-09', '2026-04-09', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-RHEUM-001'
ON CONFLICT DO NOTHING;

-- Group B schedule (offset by one day)
INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group B', 'Week 10 — FCM 1B', '2026-03-09', '2026-03-13', '2026-03-13', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-NEURO-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group B', 'Week 11 — FCM 1B', '2026-03-16', '2026-03-20', '2026-03-20', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-PULM-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group B', 'Week 12 — FCM 1B', '2026-03-23', '2026-03-27', '2026-03-27', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-ENDO-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group B', 'Week 13 — FCM 1B', '2026-03-30', '2026-04-03', '2026-04-03', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-RENAL-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group B', 'Week 14 — FCM 1B', '2026-04-06', '2026-04-10', '2026-04-10', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-RHEUM-001'
ON CONFLICT DO NOTHING;
