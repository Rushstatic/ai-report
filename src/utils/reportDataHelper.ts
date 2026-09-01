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

export interface MatrixHeaderCell {
  id: string;
  label: string;
  labelMr: string;
  labelEn: string;
  colSpan: number;
  rowSpan: number;
  isLeaf: boolean;
  fieldId?: string;
}

export interface MatrixHeaderTier {
  cells: MatrixHeaderCell[];
}

export interface MatrixLeafColumn {
  id: string;
  name: string;
  label: string;
  labelMr: string;
  labelEn: string;
  fieldType: string;
}

export interface MatrixReportTable {
  headerTiers: MatrixHeaderTier[];
  leafColumns: MatrixLeafColumn[];
  rows: {
    srNo: number | string;
    label?: string;
    values: Record<string, string | number>;
  }[];
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
  matrixTable?: MatrixReportTable;
}

/**
 * Calculates leaf count for hierarchical columns
 */
function getLeafCount(node: FormFieldItem): number {
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  return node.children.reduce((sum, child) => sum + getLeafCount(child), 0);
}

/**
 * Calculates maximum depth of the field tree
 */
function getMaxDepth(nodes: FormFieldItem[]): number {
  let max = 1;
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      const childDepth = 1 + getMaxDepth(node.children);
      if (childDepth > max) max = childDepth;
    }
  }
  return max;
}

/**
 * Collects all leaf columns in left-to-right order
 */
function collectLeafColumns(nodes: FormFieldItem[], language: 'mr' | 'en' = 'mr'): MatrixLeafColumn[] {
  const leaves: MatrixLeafColumn[] = [];
  function walk(n: FormFieldItem) {
    if (!n.children || n.children.length === 0) {
      leaves.push({
        id: n.id,
        name: n.name || n.id,
        label: language === 'mr' ? (n.labelMr || n.labelEn) : (n.labelEn || n.labelMr),
        labelMr: n.labelMr || n.labelEn || 'Field',
        labelEn: n.labelEn || n.labelMr || 'Field',
        fieldType: String(n.type || 'Text')
      });
    } else {
      n.children.forEach(walk);
    }
  }
  nodes.forEach(walk);
  return leaves;
}

/**
 * Constructs multi-tier matrix header rows with exact colSpan and rowSpan
 */
function buildMatrixHeaderTiers(
  roots: FormFieldItem[],
  maxDepth: number,
  language: 'mr' | 'en' = 'mr'
): MatrixHeaderTier[] {
  const tiers: MatrixHeaderTier[] = Array.from({ length: maxDepth }, () => ({ cells: [] }));

  // Add Sr. No. column spanning all tiers vertically at the first position
  tiers[0].cells.push({
    id: 'sr_no',
    label: language === 'mr' ? 'अ.क्र.' : 'sr no',
    labelMr: 'अ.क्र.',
    labelEn: 'sr no',
    colSpan: 1,
    rowSpan: maxDepth,
    isLeaf: true
  });

  function processNode(node: FormFieldItem, currentTier: number) {
    const isLeaf = !node.children || node.children.length === 0;
    const colSpan = getLeafCount(node);
    const rowSpan = isLeaf ? (maxDepth - currentTier) : 1;

    const labelMr = node.labelMr || node.labelEn || 'Field';
    const labelEn = node.labelEn || node.labelMr || 'Field';
    const label = language === 'mr' ? labelMr : labelEn;

    tiers[currentTier].cells.push({
      id: node.id,
      label,
      labelMr,
      labelEn,
      colSpan,
      rowSpan,
      isLeaf,
      fieldId: isLeaf ? node.id : undefined
    });

    if (!isLeaf && node.children) {
      node.children.forEach((child) => processNode(child, currentTier + 1));
    }
  }

  roots.forEach((root) => processNode(root, 0));

  return tiers;
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
  const rawValuesObj: Record<string, string | number> = {};

  valuesData.forEach((v) => {
    if (v.field_id) {
      valuesMap.set(v.field_id, v);

      let val: string | number = '-';
      if (v.value_numeric !== null && v.value_numeric !== undefined) {
        val = v.value_numeric;
      } else if (v.value_boolean !== null && v.value_boolean !== undefined) {
        val = v.value_boolean ? (language === 'mr' ? 'होय' : 'Yes') : (language === 'mr' ? 'नाही' : 'No');
      } else if (v.value_date) {
        val = String(v.value_date);
      } else if (v.value_text) {
        val = String(v.value_text);
      }
      rawValuesObj[v.field_id] = val;
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

  // Construct Matrix Report Table representation
  let matrixTable: MatrixReportTable | undefined = undefined;
  if (fieldTree.length > 0) {
    const maxDepth = Math.max(1, getMaxDepth(fieldTree));
    const headerTiers = buildMatrixHeaderTiers(fieldTree, maxDepth, language);
    const leafColumns = collectLeafColumns(fieldTree, language);

    // Build data rows (Row 1 for current submission)
    const dataRows = [
      {
        srNo: 1,
        label: report.villages?.name || report.employees?.sub_centres?.name || 'Record 1',
        values: rawValuesObj
      }
    ];

    matrixTable = {
      headerTiers,
      leafColumns,
      rows: dataRows
    };
  }

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

  // Resolve Taluka cleanly (prevent UUID leaks)
  let talukaResolved = 'Ausa / औसा';
  if (report.employees?.talukas?.name) {
    talukaResolved = report.employees.talukas.name;
  } else if (report.employees?.phcs?.talukas?.name) {
    talukaResolved = report.employees.phcs.talukas.name;
  } else if (report.employees?.taluka_id) {
    const tId = String(report.employees.taluka_id);
    if (tId.length > 25) {
      // It's a UUID, try to query or format cleanly
      try {
        const { data: talData } = await (supabase.from('talukas') as any).select('name').eq('id', tId).maybeSingle();
        if (talData?.name) {
          talukaResolved = talData.name;
        } else {
          talukaResolved = 'Ausa (औसा)';
        }
      } catch {
        talukaResolved = 'Ausa (औसा)';
      }
    } else {
      talukaResolved = tId;
    }
  }

  // Clean PHC, Subcentre, Village names
  const phcName = report.employees?.phcs?.name || (report.phc_name || 'Phc Bhada');
  const scName = report.employees?.sub_centres?.name || (report.subcentre_name || 'Bhada');
  const villageName = report.villages?.name || (report.village_name || 'Bhada');

  return {
    reportId: report.id,
    formId: formId || 'FORM',
    formName: formObj?.name || report.forms?.name || 'गृहभेटी',
    formCode: formObj?.code || report.forms?.code,
    reportingPeriod: formObj?.reporting_period || report.forms?.reporting_period || 'Monthly',
    district: 'Latur District / लातूर जिल्हा',
    taluka: talukaResolved,
    phc: phcName,
    subcentre: scName,
    village: villageName,
    periodStart: report.period_start || '2026-07-31',
    periodEnd: report.period_end || '2026-08-30',
    submittedBy: report.employees?.name || 'Shaikh Yunus',
    employeeType: report.employees?.employee_type || 'MPW',
    submittedAt: report.submitted_at ? new Date(report.submitted_at).toLocaleString() : 'Recent',
    status: report.status || 'Submitted',
    rows: structuredRows,
    hasSubfields: detectedSubfields,
    matrixTable
  };
}
