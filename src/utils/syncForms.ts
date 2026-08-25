import { supabase } from '@/lib/supabase';

export interface StandardFormDefinition {
  id: string;
  name: string;
  code: string;
  description: string;
  reporting_period: 'Daily' | 'Weekly' | 'Fortnightly' | 'Monthly';
  report_type: 'VILLAGE_NUMERICAL' | 'VILLAGE_PROGRESS' | 'LIST' | 'SUBCENTRE_LEVEL';
  target_role: string;
  employee_wise_submission?: boolean;
  sections: {
    title: string;
    fields: {
      name: string;
      label_en: string;
      label_mr: string;
      field_type: 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Yes/No';
      is_required: boolean;
      placeholder?: string;
      options?: { label_en: string; label_mr: string; value: string }[];
    }[];
  }[];
}

export const STANDARD_FORMS: StandardFormDefinition[] = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    code: 'SC_MONTHLY_COMPOSITE',
    name: 'Monthly Sub-centre Composite Report (मासिक उपकेंद्र सर्वसमावेशक अहवाल)',
    description: 'Routine general monthly morbidity, maternal health, and immunization coverage data.',
    reporting_period: 'Monthly',
    report_type: 'VILLAGE_NUMERICAL',
    target_role: 'ALL',
    employee_wise_submission: false,
    sections: [
      {
        title: 'General Health & Morbidity Indicators',
        fields: [
          { name: 'fever_cases_total', label_en: 'Total Fever Cases Examined', label_mr: 'तपासलेले एकूण तापाचे रुग्ण', field_type: 'Number', is_required: true },
          { name: 'tb_presumptive', label_en: 'Presumptive TB Suspects Identified', label_mr: 'क्षयरोग संशयित व्यक्ती', field_type: 'Number', is_required: true },
          { name: 'anc_new_reg', label_en: 'New ANC Registrations', label_mr: 'नवीन गरोदर माता नोंदणी', field_type: 'Number', is_required: true },
          { name: 'fully_immunized', label_en: 'Fully Immunized Children (0-1 yr)', label_mr: 'पूर्ण लसीकरण झालेली बालके (०-१ वर्ष)', field_type: 'Number', is_required: true },
          { name: 'diarrhea_cases', label_en: 'Diarrhea / ORS Distributed Cases', label_mr: 'अतिसार रुग्ण व ORS वाटप', field_type: 'Number', is_required: false },
          { name: 'general_remarks', label_en: 'General Remarks / Observations', label_mr: 'सर्वसाधारण शेरा व निरीक्षणे', field_type: 'Text', is_required: false },
        ]
      }
    ]
  },
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    code: 'MPW_MALARIA_WEEKLY',
    name: 'Weekly Vector Borne Disease & Malaria Surveillance (हिवताप व किटकजन्य रोग साप्ताहिक अहवाल)',
    description: 'BSER, fever cases, blood slide collection, and vector control field logs for Multipurpose Health Workers.',
    reporting_period: 'Weekly',
    report_type: 'VILLAGE_PROGRESS',
    target_role: 'MPW',
    employee_wise_submission: true,
    sections: [
      {
        title: 'Malaria & Vector Surveillance',
        fields: [
          { name: 'fever_examined', label_en: 'Total Fever Cases Examined', label_mr: 'तपासलेले एकूण तापाचे रुग्ण', field_type: 'Number', is_required: true },
          { name: 'blood_smears_collected', label_en: 'Blood Smears (BS) Collected', label_mr: 'घेतलेले रक्त नमुने (BS)', field_type: 'Number', is_required: true },
          { name: 'rdt_tests_done', label_en: 'Malaria Rapid Diagnostic Tests (RDT)', label_mr: 'मलेरिया जलद चाचण्या (RDT)', field_type: 'Number', is_required: false },
          { name: 'malaria_positive_pv', label_en: 'Malaria Positive Cases (Plasmodium Vivax)', label_mr: 'मलेरिया बाधित रुग्ण (P. Vivax)', field_type: 'Number', is_required: true },
          { name: 'malaria_positive_pf', label_en: 'Malaria Positive Cases (Plasmodium Falciparum)', label_mr: 'मलेरिया बाधित रुग्ण (P. Falciparum)', field_type: 'Number', is_required: true },
          { name: 'dengue_chikungunya_suspects', label_en: 'Suspected Dengue / Chikungunya Cases', label_mr: 'संशयित डेंग्यू / चिकनगुनिया रुग्ण', field_type: 'Number', is_required: false },
          { name: 'abate_temephos_applied', label_en: 'Water Containers Treated with Abate / Temephos', label_mr: 'अॅबेट / टेमिफॉस वापरलेले पाणी साठे', field_type: 'Number', is_required: false },
          { name: 'mpw_field_notes', label_en: 'Vector Control Field Action Notes', label_mr: 'किटक प्रतिबंधक क्षेत्रीय कार्यवाही शेरा', field_type: 'Text', is_required: false },
        ]
      }
    ]
  },
  {
    id: 'b1000000-0000-0000-0000-000000000003',
    code: 'MPW_WATER_CHLORINATION',
    name: 'Drinking Water Quality & TCL Chlorination Log (पिण्याचे पाणी व टीसीएल क्लोरीनेशन नोंद)',
    description: 'Weekly OT test results, TCL bleaching powder stock, and water tank chlorination.',
    reporting_period: 'Weekly',
    report_type: 'VILLAGE_PROGRESS',
    target_role: 'MPW',
    employee_wise_submission: true,
    sections: [
      {
        title: 'Water Source & Sanitation Inspection',
        fields: [
          { name: 'sources_inspected', label_en: 'Total Public Water Sources Inspected', label_mr: 'तपासणी केलेले एकूण सार्वजनिक पाणी स्रोत', field_type: 'Number', is_required: true },
          { name: 'ot_tests_performed', label_en: 'OT Tests Performed', label_mr: 'केलेल्या ओटी चाचण्या', field_type: 'Number', is_required: true },
          { name: 'ot_positive_samples', label_en: 'OT Test Samples with Adequate Chlorine (0.2 ppm+)', label_mr: 'योग्य क्लोरिन मात्रा आढळलेले नमुने (0.2 ppm+)', field_type: 'Number', is_required: true },
          { name: 'tanks_chlorinated', label_en: 'Water Storage Tanks Chlorinated', label_mr: 'क्लोरीनेशन केलेल्या पाण्याच्या टाक्या', field_type: 'Number', is_required: false },
          { name: 'water_remarks', label_en: 'Sanitary Defect / Water Quality Action Remarks', label_mr: 'दोष दुरुस्ती व पाणी गुणवत्ता शेरा', field_type: 'Text', is_required: false },
        ]
      }
    ]
  },
  {
    id: 'b1000000-0000-0000-0000-000000000004',
    code: 'ANM_RCH_MONTHLY',
    name: 'Maternal & Child Health Progress - RCH (माता व बाल संगोपन मासिक प्रगती अहवाल)',
    description: 'Maternal care, early ANC registrations, high risk pregnancies, and institutional delivery tracking.',
    reporting_period: 'Monthly',
    report_type: 'VILLAGE_NUMERICAL',
    target_role: 'ANM',
    employee_wise_submission: false,
    sections: [
      {
        title: 'Reproductive & Child Health Indicators',
        fields: [
          { name: 'anc_1st_trimester', label_en: 'ANC Registered within 1st Trimester (<12 wks)', label_mr: 'पहिल्या तिमाहीत नोंदणी झालेल्या गरोदर माता (<१२ आठवडे)', field_type: 'Number', is_required: true },
          { name: 'anc_total_active', label_en: 'Total Active ANC on Roster', label_mr: 'एकूण नोंदणीकृत गरोदर माता', field_type: 'Number', is_required: true },
          { name: 'high_risk_pregnancies', label_en: 'High-Risk Pregnancies Identified (HRP)', label_mr: 'जोखीमयुक्त गरोदर माता (HRP)', field_type: 'Number', is_required: true },
          { name: 'institutional_deliveries', label_en: 'Institutional Deliveries in Period', label_mr: 'संस्थात्मक प्रसूतींची संख्या', field_type: 'Number', is_required: true },
          { name: 'pnc_home_visits', label_en: 'PNC Home Visits within 48 Hours', label_mr: 'प्रसूतीनंतर ४८ तासांत गृहभेटी (PNC)', field_type: 'Number', is_required: true },
          { name: 'ifa_distributed', label_en: 'Mothers Provided 180+ IFA Tablets', label_mr: '१८०+ आयएफए गोळ्या दिलेल्या माता', field_type: 'Number', is_required: false },
          { name: 'anm_mch_remarks', label_en: 'MCH Field Action / High Risk Followup Remarks', label_mr: 'माता बाल संगोपन शेरा व संदर्भ सेवा', field_type: 'Text', is_required: false },
        ]
      }
    ]
  },
  {
    id: 'b1000000-0000-0000-0000-000000000005',
    code: 'ANM_IMMUNIZATION_MONTHLY',
    name: 'Routine Immunization Coverage & Session Report (नियमित लसीकरण व सत्र अहवाल)',
    description: 'Vaccine doses administered, session site completion, and dropout tracking.',
    reporting_period: 'Monthly',
    report_type: 'VILLAGE_NUMERICAL',
    target_role: 'ANM',
    employee_wise_submission: false,
    sections: [
      {
        title: 'Immunization Coverage Metrics',
        fields: [
          { name: 'ri_sessions_held', label_en: 'RI Sessions Planned vs Held', label_mr: 'नियोजित पैकी प्रत्यक्षात घेतलेली लसीकरण सत्रे', field_type: 'Number', is_required: true },
          { name: 'bcg_doses', label_en: 'BCG Doses Administered', label_mr: 'दिलेले बीसीजी (BCG) डोस', field_type: 'Number', is_required: true },
          { name: 'pentavalent_3_doses', label_en: 'Pentavalent-3 / DPT-3 Doses', label_mr: 'पेंटाव्हॅलेंट-३ / डीपीटी-३ डोस', field_type: 'Number', is_required: true },
          { name: 'mr_1_doses', label_en: 'Measles-Rubella (MR-1) Doses Given (9-12 mo)', label_mr: 'गोवर-रुबेला (MR-1) डोस (९-१२ महिने)', field_type: 'Number', is_required: true },
          { name: 'fully_immunized_children', label_en: 'Children Fully Immunized (0-1 Year Target)', label_mr: 'पूर्ण लसीकरण झालेली बालके (०-१ वर्ष)', field_type: 'Number', is_required: true },
          { name: 'dropout_cases', label_en: 'Vaccine Dropouts Traced & Vaccinated', label_mr: 'शोधून लसीकरण केलेले वंचित बालके (Dropouts)', field_type: 'Number', is_required: false },
          { name: 'ri_notes', label_en: 'Cold Chain & Session Remarks', label_mr: 'कोल्ड चेन व सत्र निरीक्षण शेरा', field_type: 'Text', is_required: false },
        ]
      }
    ]
  },
  {
    id: 'b1000000-0000-0000-0000-000000000006',
    code: 'CHO_NCD_TELECONSULT',
    name: 'HWC NCD Screening & Teleconsultation Progress (NCD असंसर्गजन्य रोग व टेलीमेडिसिन)',
    description: 'Hypertension, Diabetes, Cancer screening (30+ population) and e-Sanjeevani teleconsultation reporting.',
    reporting_period: 'Monthly',
    report_type: 'VILLAGE_NUMERICAL',
    target_role: 'CHO',
    employee_wise_submission: false,
    sections: [
      {
        title: 'NCD & Comprehensive Primary Care Screening',
        fields: [
          { name: 'pop_30plus_screened_htn', label_en: 'Individuals (30+ yrs) Screened for Hypertension', label_mr: 'उच्च रक्तदाब तपासणी केलेले व्यक्ती (३०+ वय)', field_type: 'Number', is_required: true },
          { name: 'pop_30plus_screened_dm', label_en: 'Individuals (30+ yrs) Screened for Diabetes (RBS/FBS)', label_mr: 'मधुमेह तपासणी केलेले व्यक्ती (३०+ वय)', field_type: 'Number', is_required: true },
          { name: 'new_htn_diagnosed', label_en: 'New Hypertension Cases Diagnosed', label_mr: 'नवीन निदान झालेले रक्तदाब रुग्ण', field_type: 'Number', is_required: true },
          { name: 'new_dm_diagnosed', label_en: 'New Diabetes Cases Diagnosed', label_mr: 'नवीन निदान झालेले मधुमेह रुग्ण', field_type: 'Number', is_required: true },
          { name: 'teleconsults_completed', label_en: 'e-Sanjeevani Teleconsultations Completed', label_mr: 'ई-संजीवनी द्वारे पूर्ण केलेले टेली-सल्लागार सत्र', field_type: 'Number', is_required: true },
          { name: 'medicines_dispensed_hwc', label_en: 'Patients Dispensed Chronic NCD Medicines at HWC', label_mr: 'औषध वाटप केलेले जुनाट आजार रुग्ण', field_type: 'Number', is_required: false },
          { name: 'cho_clinical_remarks', label_en: 'CHO Clinical & Referral Remarks', label_mr: 'सीएचओ वैद्यकीय व संदर्भ सेवा शेरा', field_type: 'Text', is_required: false },
        ]
      }
    ]
  },
  {
    id: 'b1000000-0000-0000-0000-000000000007',
    code: 'CHO_WELLNESS_ACTIVITIES',
    name: 'HWC Wellness Activities & Community Health Day (आरोग्य वर्धिनी वेलनेस व योग सत्र)',
    description: 'Sub-centre level wellness sessions, Yoga days, VHSNC meetings, and adolescent health.',
    reporting_period: 'Monthly',
    report_type: 'SUBCENTRE_LEVEL',
    target_role: 'CHO',
    employee_wise_submission: false,
    sections: [
      {
        title: 'Wellness & Community Outreach',
        fields: [
          { name: 'yoga_sessions_conducted', label_en: 'Yoga / Physical Activity Sessions Conducted', label_mr: 'घेतलेली योग / व्यायाम सत्रे', field_type: 'Number', is_required: true },
          { name: 'yoga_participants', label_en: 'Total Participants in Yoga Sessions', label_mr: 'योग सत्रातील एकूण सहभागी नागरिक', field_type: 'Number', is_required: true },
          { name: 'vhsnc_meetings_held', label_en: 'VHSNC Village Committee Meetings Attended', label_mr: 'उपस्थित राहिलेल्या ग्राम आरोग्य पाणी समिती (VHSNC) बैठका', field_type: 'Number', is_required: true },
          { name: 'adolescent_health_days', label_en: 'Adolescent Health Days (AHD) Conducted', label_mr: 'घेतलेले किशोरवयीन आरोग्य दिवस (AHD)', field_type: 'Number', is_required: false },
          { name: 'wellness_summary', label_en: 'Community Outreach Highlights & Summary', label_mr: 'सामुदायिक उपक्रम ठळक वैशिष्ट्ये व शेरा', field_type: 'Text', is_required: false },
        ]
      }
    ]
  }
];

/**
 * Synchronizes standard forms with Supabase database if they don't exist yet.
 * Returns true if synchronization succeeded.
 */
export async function syncStandardFormsToDatabase(): Promise<{ success: boolean; message: string; count: number }> {
  try {
    let syncedCount = 0;

    for (const formDef of STANDARD_FORMS) {
      // 1. Check if form already exists by code or id
      const { data: existingForm } = await (supabase.from('forms') as any)
        .select('id')
        .or(`id.eq.${formDef.id},code.eq.${formDef.code}`)
        .maybeSingle();

      let currentFormId = formDef.id;

      if (!existingForm) {
        // Insert Form
        const { data: insertedForm, error: formError } = await (supabase.from('forms') as any)
          .insert({
            id: formDef.id,
            name: formDef.name,
            code: formDef.code,
            description: formDef.description,
            reporting_period: formDef.reporting_period,
            report_type: formDef.report_type,
            target_role: formDef.target_role,
            employee_wise_submission: formDef.employee_wise_submission ?? false,
            active: true
          })
          .select('id')
          .single();

        if (formError) {
          console.warn(`Could not insert form ${formDef.code}:`, formError.message);
          continue;
        }

        currentFormId = insertedForm?.id || formDef.id;
        syncedCount++;

        // 2. Insert Sections & Fields
        for (let sIdx = 0; sIdx < formDef.sections.length; sIdx++) {
          const sec = formDef.sections[sIdx];
          const { data: insertedSec, error: secError } = await (supabase.from('form_sections') as any)
            .insert({
              form_id: currentFormId,
              title: sec.title,
              display_order: sIdx + 1
            })
            .select('id')
            .single();

          if (secError || !insertedSec) {
            console.warn(`Section insert error:`, secError);
            continue;
          }

          // Insert Fields for this Section
          for (let fIdx = 0; fIdx < sec.fields.length; fIdx++) {
            const fld = sec.fields[fIdx];
            await (supabase.from('form_fields') as any).insert({
              section_id: insertedSec.id,
              name: fld.name,
              label_en: fld.label_en,
              label_mr: fld.label_mr,
              field_type: fld.field_type,
              is_required: fld.is_required,
              display_order: fIdx + 1
            });
          }
        }
      }
    }

    return {
      success: true,
      message: syncedCount > 0 
        ? `Successfully synced ${syncedCount} health reporting forms to database.` 
        : 'All standard forms are already present in the database.',
      count: syncedCount
    };
  } catch (err: any) {
    console.error('Error syncing standard forms:', err);
    return {
      success: false,
      message: err.message || 'Failed to sync forms',
      count: 0
    };
  }
}
