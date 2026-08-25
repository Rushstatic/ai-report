-- ==============================================================================
-- SEED LIVE STANDARD HEALTH REPORTING FORMS, SECTIONS AND FIELDS
-- Ensures real UUID forms for MPW, ANM, CHO, and Universal Sub-centre reporting
-- ==============================================================================

-- 1. SC Monthly Composite Report
INSERT INTO public.forms (id, code, name, description, reporting_period, report_type, target_role, active)
VALUES (
  'b1000000-0000-0000-0000-000000000001',
  'SC_MONTHLY_COMPOSITE',
  'Monthly Sub-centre Composite Report (मासिक उपकेंद्र सर्वसमावेशक अहवाल)',
  'Routine general monthly morbidity, maternal health, and immunization coverage data.',
  'Monthly',
  'VILLAGE_NUMERICAL',
  'ALL',
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  target_role = EXCLUDED.target_role,
  active = true;

-- 2. MPW Malaria Weekly Surveillance
INSERT INTO public.forms (id, code, name, description, reporting_period, report_type, target_role, active)
VALUES (
  'b1000000-0000-0000-0000-000000000002',
  'MPW_MALARIA_WEEKLY',
  'Weekly Vector Borne Disease & Malaria Surveillance (हिवताप व किटकजन्य रोग साप्ताहिक अहवाल)',
  'BSER, fever cases, blood slide collection, and vector control field logs for Multipurpose Health Workers.',
  'Weekly',
  'VILLAGE_PROGRESS',
  'MPW',
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  target_role = EXCLUDED.target_role,
  active = true;

-- 3. MPW Drinking Water Quality Log
INSERT INTO public.forms (id, code, name, description, reporting_period, report_type, target_role, active)
VALUES (
  'b1000000-0000-0000-0000-000000000003',
  'MPW_WATER_CHLORINATION',
  'Drinking Water Quality & TCL Chlorination Log (पिण्याचे पाणी व टीसीएल क्लोरीनेशन नोंद)',
  'Weekly OT test results, TCL bleaching powder stock, and water tank chlorination.',
  'Weekly',
  'VILLAGE_PROGRESS',
  'MPW',
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  target_role = EXCLUDED.target_role,
  active = true;

-- 4. ANM RCH Monthly Progress
INSERT INTO public.forms (id, code, name, description, reporting_period, report_type, target_role, active)
VALUES (
  'b1000000-0000-0000-0000-000000000004',
  'ANM_RCH_MONTHLY',
  'Maternal & Child Health Progress - RCH (माता व बाल संगोपन मासिक प्रगती अहवाल)',
  'Maternal care, early ANC registrations, high risk pregnancies, and institutional delivery tracking.',
  'Monthly',
  'VILLAGE_NUMERICAL',
  'ANM',
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  target_role = EXCLUDED.target_role,
  active = true;

-- 5. ANM Routine Immunization
INSERT INTO public.forms (id, code, name, description, reporting_period, report_type, target_role, active)
VALUES (
  'b1000000-0000-0000-0000-000000000005',
  'ANM_IMMUNIZATION_MONTHLY',
  'Routine Immunization Coverage & Session Report (नियमित लसीकरण व सत्र अहवाल)',
  'Vaccine doses administered, session site completion, and dropout tracking.',
  'Monthly',
  'VILLAGE_NUMERICAL',
  'ANM',
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  target_role = EXCLUDED.target_role,
  active = true;

-- 6. CHO NCD & Teleconsultation
INSERT INTO public.forms (id, code, name, description, reporting_period, report_type, target_role, active)
VALUES (
  'b1000000-0000-0000-0000-000000000006',
  'CHO_NCD_TELECONSULT',
  'HWC NCD Screening & Teleconsultation Progress (NCD असंसर्गजन्य रोग व टेलीमेडिसिन)',
  'Hypertension, Diabetes, Cancer screening (30+ population) and e-Sanjeevani teleconsultation reporting.',
  'Monthly',
  'VILLAGE_NUMERICAL',
  'CHO',
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  target_role = EXCLUDED.target_role,
  active = true;

-- 7. CHO Wellness & Outreach
INSERT INTO public.forms (id, code, name, description, reporting_period, report_type, target_role, active)
VALUES (
  'b1000000-0000-0000-0000-000000000007',
  'CHO_WELLNESS_ACTIVITIES',
  'HWC Wellness Activities & Community Health Day (आरोग्य वर्धिनी वेलनेस व योग सत्र)',
  'Sub-centre level wellness sessions, Yoga days, VHSNC meetings, and adolescent health.',
  'Monthly',
  'SUBCENTRE_LEVEL',
  'CHO',
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  target_role = EXCLUDED.target_role,
  active = true;
