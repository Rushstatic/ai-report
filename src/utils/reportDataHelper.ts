import { supabase } from '@/lib/supabase';
import { getFormWithFields, FormFieldItem, buildFieldTree } from './formStorage';

export interface StructuredReportRow {
  srNo: string;
  fieldId: string;
  isHeader: boolean;
  depth: number;
  mainCategory: string;
  subCategory?: string;
  fieldLabelEn: string;
  fieldLabelMr: string;
  displayLabel: string;
  bilingualLabel: string;
  path: string;
  fieldType: string;
  value: string;
  status: string;
  parentFieldId?: string | null;
}

export interface PreparedReportData {
  reportId: string;
  formId: string;
  formName: string;
  formCode?: string;
  reportingPeriod: string;
  district: string;
  taluka: string;
  phc: string;
  subcentre: string;
  village: string;
  periodStart: string;
  periodEnd: string;
  submittedBy: string;
  employeeType: string;
  submittedAt?: string;
  status: string;
  rows: StructuredReportRow[];
  hasSubfields: boolean;
}

export async function prepareReportData(
  report: any,
  language: 'mr' | 'en' = 'mr'
): Promise<PreparedReportData> {
  const formId = report.form_id || report.forms?.id;
  const submissionId = report.id;

  // 1. Fetch form definition with all fields
  let formObj: any = null;
  if (formId) {
    formObj = await getFormWithFields(formId);
  }

  // 2. Fetch submission values from database
  let valuesData: any[] = [];
  if (submissionId) {
    const { data: vData } = await (supabase
      .from('report_submission_values') as any)
      .select(`
        value_text,
        value_numeric,
        value_boolean,
        value_date,
        field_id,
        form_fields (
          id,
          name,
          label_en,
          label_mr,
          field_type,
          parent_field_id,
          allow_sub_fields,
          display_order
        )
      `)
      .eq('submission_id', submissionId);

    if (vData) {
      valuesData = vData;
    }
  }

  // Create values lookup map
  const valuesMap = new Map<string, any>();
  valuesData.forEach((v) => {
    if (v.field_id) {
      valuesMap.set(v.field_id, v);
    }
  });

  // Extract fields list from formObj or fallback to valuesData form_fields
  let allFields: FormFieldItem[] = [];
  if (formObj && formObj.fields && formObj.fields.length > 0) {
    allFields = formObj.fields;
  } else if (valuesData.length > 0) {
    allFields = valuesData.map((v) => ({
      id: v.field_id,
      name: v.form_fields?.name || v.field_id,
      labelEn: v.form_fields?.label_en || v.form_fields?.name || 'Indicator',
      labelMr: v.form_fields?.label_mr || v.form_fields?.label_en || v.form_fields?.name || 'Indicator',
      type: v.form_fields?.field_type || 'Text',
      required: false,
      parent_field_id: v.form_fields?.parent_field_id || null,
      allow_sub_fields: v.form_fields?.allow_sub_fields || false,
      display_order: v.form_fields?.display_order || 0
    }));
  }

  const structuredRows: StructuredReportRow[] = [];
  let counter = 1;
  let detectedSubfields = false;

  // Build tree to maintain strict parent-child order
  const fieldTree = buildFieldTree(allFields);

  function traverseTree(
    nodes: FormFieldItem[],
    depth: number = 0,
    parentTitles: { en: string; mr: string }[] = []
  ) {
    nodes.forEach((node) => {
      const hasChildren = node.children && node.children.length > 0;
      if (hasChildren || node.parent_field_id) {
        detectedSubfields = true;
      }

      const labelEn = node.labelEn || node.name || 'Indicator';
      const labelMr = node.labelMr || labelEn;
      const currentParent = parentTitles.length > 0 ? parentTitles[parentTitles.length - 1] : null;

      const mainCategoryEn = parentTitles.length > 0 ? parentTitles[0].en : labelEn;
      const mainCategoryMr = parentTitles.length > 0 ? parentTitles[0].mr : labelMr;
      const mainCategoryDisplay = language === 'mr' ? mainCategoryMr : mainCategoryEn;

      const pathStr = [...parentTitles.map(p => language === 'mr' ? p.mr : p.en), language === 'mr' ? labelMr : labelEn].join(' > ');

      if (hasChildren) {
        // Group Header Row (Parent Heading)
        const sr = depth === 0 ? `${counter++}` : '';
        const groupDisplayLabel = language === 'mr' ? labelMr : labelEn;
        const groupBilingual = `${labelMr} / ${labelEn}`;

        structuredRows.push({
          srNo: sr,
          fieldId: node.id,
          isHeader: true,
          depth,
          mainCategory: mainCategoryDisplay,
          subCategory: currentParent ? (language === 'mr' ? currentParent.mr : currentParent.en) : undefined,
          fieldLabelEn: labelEn,
          fieldLabelMr: labelMr,
          displayLabel: groupDisplayLabel,
          bilingualLabel: groupBilingual,
          path: pathStr,
          fieldType: 'Group Header / गट शीर्षक',
          value: '', // Group header doesn't hold direct values
          status: '-',
          parentFieldId: node.parent_field_id || null
        });

        // Recursively process child fields
        traverseTree(node.children!, depth + 1, [...parentTitles, { en: labelEn, mr: labelMr }]);
      } else {
        // Leaf Field with recorded value
        const valObj = valuesMap.get(node.id);
        let formattedValue = '-';

        if (valObj) {
          if (valObj.value_numeric !== null && valObj.value_numeric !== undefined) {
            formattedValue = String(valObj.value_numeric);
          } else if (valObj.value_boolean !== null && valObj.value_boolean !== undefined) {
            formattedValue = valObj.value_boolean 
              ? (language === 'mr' ? 'होय (Yes)' : 'Yes') 
              : (language === 'mr' ? 'नाही (No)' : 'No');
          } else if (valObj.value_date) {
            formattedValue = String(valObj.value_date);
          } else if (valObj.value_text) {
            formattedValue = String(valObj.value_text);
          }
        }

        const sr = depth === 0 ? `${counter++}` : `  ↳`;
        const displayLabel = language === 'mr' ? labelMr : labelEn;
        const bilingualLabel = `${labelMr} / ${labelEn}`;

        // Indented display label for tree clarity
        const indentPrefix = depth === 0 ? '' : `${'   '.repeat(depth - 1)}└── `;
        const fullDisplayLabel = `${indentPrefix}${displayLabel}`;
        const fullBilingualLabel = `${indentPrefix}${bilingualLabel}`;

        structuredRows.push({
          srNo: sr,
          fieldId: node.id,
          isHeader: false,
          depth,
          mainCategory: mainCategoryDisplay,
          subCategory: currentParent ? (language === 'mr' ? currentParent.mr : currentParent.en) : undefined,
          fieldLabelEn: labelEn,
          fieldLabelMr: labelMr,
          displayLabel: fullDisplayLabel,
          bilingualLabel: fullBilingualLabel,
          path: pathStr,
          fieldType: String(node.type || 'Text'),
          value: formattedValue,
          status: report.status || 'Submitted',
          parentFieldId: node.parent_field_id || null
        });
      }
    });
  }

  traverseTree(fieldTree, 0, []);

  // Fallback if structuredRows is empty
  if (structuredRows.length === 0) {
    structuredRows.push({
      srNo: '1',
      fieldId: 'default',
      isHeader: false,
      depth: 0,
      mainCategory: 'General Reporting',
      fieldLabelEn: 'Status Summary',
      fieldLabelMr: 'अहवाल स्थिती',
      displayLabel: language === 'mr' ? 'अहवाल सादर केला' : 'Report Submission Completed',
      bilingualLabel: 'अहवाल सादर केला / Report Submitted',
      path: 'General > Status',
      fieldType: 'Status',
      value: report.status || 'Submitted',
      status: report.status || 'Submitted'
    });
  }

  const periodFormatted = (report.period_start && report.period_end)
    ? `${new Date(report.period_start).toLocaleDateString()} to ${new Date(report.period_end).toLocaleDateString()}`
    : 'Current Period';

  return {
    reportId: report.id,
    formId: formId || 'FORM',
    formName: formObj?.name || report.forms?.name || 'Health Report',
    formCode: formObj?.code || report.forms?.code,
    reportingPeriod: formObj?.reporting_period || report.forms?.reporting_period || 'Monthly',
    district: 'Latur District / लातूर जिल्हा',
    taluka: report.employees?.taluka_id || 'Latur Taluka',
    phc: report.employees?.phcs?.name || 'Primary Health Centre',
    subcentre: report.employees?.sub_centres?.name || 'Sub-Centre',
    village: report.villages?.name || 'All Sub-centre Villages',
    periodStart: report.period_start || '',
    periodEnd: report.period_end || '',
    submittedBy: report.employees?.name || 'Health Worker',
    employeeType: report.employees?.employee_type || 'Staff',
    submittedAt: report.submitted_at ? new Date(report.submitted_at).toLocaleString() : 'Draft',
    status: report.status || 'Submitted',
    rows: structuredRows,
    hasSubfields: detectedSubfields
  };
}
