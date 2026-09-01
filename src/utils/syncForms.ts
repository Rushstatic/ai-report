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
    id: 'form-scrub-typhus-daily',
    name: 'स्क्रब टायफस दैनिक अहवाल (Scrub Typhus Daily Report)',
    code: 'SCRUB_TYPHUS_DAILY',
    description: 'उपकेंद्र व प्राथमिक आरोग्य केंद्रनिहाय स्क्रब टायफस संशयित रुग्ण, चाचण्या, पॉझिटिव्ह रुग्ण व मृत्यू यांचा दैनिक व प्रगतीपथावरील अहवाल',
    reporting_period: 'Daily',
    report_type: 'SUBCENTRE_LEVEL',
    target_role: 'ALL',
    employee_wise_submission: false,
    sections: [
      {
        title: 'स्क्रब टायफस संशयित रुग्ण (Scrub Typhus Cases)',
        fields: [
          { name: 'cases_daily', label_en: 'Scrub Typhus Cases - Daily', label_mr: 'स्क्रब टायफस रुग्ण - दैनिक', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'cases_pro', label_en: 'Scrub Typhus Cases - Progressive', label_mr: 'स्क्रब टायफस रुग्ण - प्रगती', field_type: 'Number', is_required: false, placeholder: '0' },
        ]
      },
      {
        title: 'तपासलेले नमुने / चाचण्या (Tests Conducted)',
        fields: [
          { name: 'rdk_tests_daily', label_en: 'RDK Tests - Daily', label_mr: 'RDK चाचण्या - दैनिक', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'rdk_tests_pro', label_en: 'RDK Tests - Progressive', label_mr: 'RDK चाचण्या - प्रगती', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'wf_tests_daily', label_en: 'Weil-Felix Tests - Daily', label_mr: 'Weil-Felix चाचण्या - दैनिक', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'wf_tests_pro', label_en: 'Weil-Felix Tests - Progressive', label_mr: 'Weil-Felix चाचण्या - प्रगती', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'elisa_tests_daily', label_en: 'ELISA IgM Tests - Daily', label_mr: 'ELISA IgM चाचण्या - दैनिक', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'elisa_tests_pro', label_en: 'ELISA IgM Tests - Progressive', label_mr: 'ELISA IgM चाचण्या - प्रगती', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'total_tests_daily', label_en: 'Total Tests - Daily', label_mr: 'एकूण चाचण्या - दैनिक', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'total_tests_pro', label_en: 'Total Tests - Progressive', label_mr: 'एकूण चाचण्या - प्रगती', field_type: 'Number', is_required: false, placeholder: '0' },
        ]
      },
      {
        title: 'पॉझिटिव्ह रुग्ण (Positive Cases)',
        fields: [
          { name: 'rdk_pos_daily', label_en: 'RDK Positive - Daily', label_mr: 'RDK पॉझिटिव्ह - दैनिक', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'rdk_pos_pro', label_en: 'RDK Positive - Progressive', label_mr: 'RDK पॉझिटिव्ह - प्रगती', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'wf_pos_daily', label_en: 'Weil-Felix Positive - Daily', label_mr: 'Weil-Felix पॉझिटिव्ह - दैनिक', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'wf_pos_pro', label_en: 'Weil-Felix Positive - Progressive', label_mr: 'Weil-Felix पॉझिटिव्ह - प्रगती', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'elisa_pos_daily', label_en: 'ELISA IgM Positive - Daily', label_mr: 'ELISA IgM पॉझिटिव्ह - दैनिक', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'elisa_pos_pro', label_en: 'ELISA IgM Positive - Progressive', label_mr: 'ELISA IgM पॉझिटिव्ह - प्रगती', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'total_pos_daily', label_en: 'Total Positive - Daily', label_mr: 'एकूण पॉझिटिव्ह - दैनिक', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'total_pos_pro', label_en: 'Total Positive - Progressive', label_mr: 'एकूण पॉझिटिव्ह - प्रगती', field_type: 'Number', is_required: false, placeholder: '0' },
        ]
      },
      {
        title: 'मृत्यू (Deaths)',
        fields: [
          { name: 'deaths_daily', label_en: 'Deaths - Daily', label_mr: 'मृत्यू - दैनिक', field_type: 'Number', is_required: false, placeholder: '0' },
          { name: 'deaths_pro', label_en: 'Deaths - Progressive', label_mr: 'मृत्यू - प्रगती', field_type: 'Number', is_required: false, placeholder: '0' },
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
