import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Building2, 
  Calendar, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  RotateCcw,
  Sparkles,
  ChevronDown,
  Layers,
  Edit3,
  Save,
  Check,
  Share2,
  FileText,
  Loader2
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useLanguageStore } from '@/store/languageStore';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import PrintPreviewModal from '@/components/PrintPreviewModal';
import { fetchAllActiveForms, getFormWithFields, StoredForm, FormFieldItem, buildFieldTree } from '@/utils/formStorage';
import { syncStandardFormsToDatabase } from '@/utils/syncForms';

export interface DynamicMatrixColumn {
  id: string;
  name: string;
  labelEn: string;
  labelMr: string;
  fieldType: string;
  calculationFormula?: any;
  parentPathEn?: string;
  parentPathMr?: string;
}

export interface DynamicHeaderCell {
  id: string;
  label: string;
  labelMr: string;
  labelEn: string;
  colSpan: number;
  rowSpan: number;
  isLeaf: boolean;
  fieldId?: string;
}

export interface DynamicHeaderTier {
  cells: DynamicHeaderCell[];
}

export interface FacilityRow {
  id: string;
  rawId?: string;
  srNo: number;
  nameEn: string;
  nameMr: string;
  isPhcHq?: boolean;
  submitted: boolean;
  submissionId?: string;
  values: Record<string, any>;
}

// Helpers for multi-tier header computation
function getLeafCount(node: FormFieldItem): number {
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  return node.children.reduce((sum, child) => sum + getLeafCount(child), 0);
}

function getMaxDepth(nodes: FormFieldItem[]): number {
  if (!nodes || nodes.length === 0) return 1;
  let max = 1;
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      const childDepth = 1 + getMaxDepth(node.children);
      if (childDepth > max) max = childDepth;
    }
  }
  return max;
}

function collectLeafColumns(
  nodes: FormFieldItem[], 
  parentPathEn: string = '', 
  parentPathMr: string = ''
): DynamicMatrixColumn[] {
  const leaves: DynamicMatrixColumn[] = [];
  
  function walk(n: FormFieldItem, currPathEn: string, currPathMr: string) {
    const lEn = n.labelEn || n.name || 'Field';
    const lMr = n.labelMr || n.labelEn || n.name || 'Field';
    const nextPathEn = currPathEn ? `${currPathEn} > ${lEn}` : lEn;
    const nextPathMr = currPathMr ? `${currPathMr} > ${lMr}` : lMr;

    if (!n.children || n.children.length === 0) {
      leaves.push({
        id: n.id,
        name: n.name || n.id,
        labelEn: lEn,
        labelMr: lMr,
        fieldType: String(n.type || 'Text'),
        calculationFormula: n.calculation,
        parentPathEn: currPathEn,
        parentPathMr: currPathMr
      });
    } else {
      n.children.forEach(child => walk(child, nextPathEn, nextPathMr));
    }
  }

  nodes.forEach(root => walk(root, '', ''));
  return leaves;
}

function buildDynamicHeaderTiers(
  roots: FormFieldItem[], 
  maxDepth: number, 
  language: 'mr' | 'en' = 'mr'
): DynamicHeaderTier[] {
  const tiers: DynamicHeaderTier[] = Array.from({ length: maxDepth }, () => ({ cells: [] }));

  // Add Sr. No. and Facility Name spanning all tiers vertically at Tier 0
  tiers[0].cells.push({
    id: 'col_sr_no',
    label: language === 'mr' ? 'अ.क्र.' : 'Sr No',
    labelMr: 'अ.क्र.',
    labelEn: 'Sr No',
    colSpan: 1,
    rowSpan: maxDepth,
    isLeaf: true
  });

  tiers[0].cells.push({
    id: 'col_facility_name',
    label: language === 'mr' ? 'आरोग्य केंद्राचे नाव' : 'Name Of Health Center',
    labelMr: 'आरोग्य केंद्राचे नाव',
    labelEn: 'Name Of Health Center',
    colSpan: 1,
    rowSpan: maxDepth,
    isLeaf: true
  });

  function processNode(node: FormFieldItem, currentTier: number) {
    const isLeaf = !node.children || node.children.length === 0;
    const colSpan = getLeafCount(node);
    const rowSpan = isLeaf ? (maxDepth - currentTier) : 1;

    const labelMr = node.labelMr || node.labelEn || node.name || 'Field';
    const labelEn = node.labelEn || node.labelMr || node.name || 'Field';
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
      node.children.forEach(child => processNode(child, currentTier + 1));
    }
  }

  roots.forEach(root => processNode(root, 0));

  return tiers;
}

export default function FacilityMatrixReport() {
  const { language } = useLanguageStore();
  const { employee } = useAuth();
  
  // Available Forms from DB
  const [availableForms, setAvailableForms] = useState<StoredForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [currentForm, setCurrentForm] = useState<StoredForm | null>(null);
  
  // Dynamic Structure for Selected Form
  const [headerTiers, setHeaderTiers] = useState<DynamicHeaderTier[]>([]);
  const [leafColumns, setLeafColumns] = useState<DynamicMatrixColumn[]>([]);

  // Filters
  const [selectedPhcName, setSelectedPhcName] = useState<string>('प्राथमिक आरोग्य केंद्र भादा');
  const [selectedFormTitle, setSelectedFormTitle] = useState<string>('दैनिक अहवाल');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [phcList, setPhcList] = useState<any[]>([]);
  const [subcentreList, setSubcentreList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Standard Sub-centres under PHC Bhada as baseline
  const defaultFacilities: FacilityRow[] = [
    { id: 'sc-1', srNo: 1, nameEn: 'Sub-Centre Alamala', nameMr: 'उपकेंद्र आलमला', submitted: false, values: {} },
    { id: 'sc-2', srNo: 2, nameEn: 'Sub-Centre Korangala', nameMr: 'उपकेंद्र कोरंगळा', submitted: false, values: {} },
    { id: 'sc-3', srNo: 3, nameEn: 'Sub-Centre Borgaon', nameMr: 'उपकेंद्र बोरगाव', submitted: false, values: {} },
    { id: 'sc-4', srNo: 4, nameEn: 'Sub-Centre Bhada', nameMr: 'उपकेंद्र भादा', submitted: false, values: {} },
    { id: 'sc-5', srNo: 5, nameEn: 'Sub-Centre Bheta', nameMr: 'उपकेंद्र भेटा', submitted: false, values: {} },
    { id: 'sc-6', srNo: 6, nameEn: 'Sub-Centre Lakhangaon', nameMr: 'उपकेंद्र लखनगाव', submitted: false, values: {} },
    { id: 'sc-7', srNo: 7, nameEn: 'Sub-Centre Shivli', nameMr: 'उपकेंद्र शिवली', submitted: false, values: {} },
    { id: 'sc-8', srNo: 8, nameEn: 'Primary Health Centre Bhada', nameMr: 'प्राथमिक आरोग्य केंद्र भादा', isPhcHq: true, submitted: false, values: {} },
  ];

  const [facilities, setFacilities] = useState<FacilityRow[]>(defaultFacilities);

  // 1. Initial Load of Forms and PHCs
  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        // Fetch PHCs
        const { data: phcs } = await supabase.from('phcs').select('id, name').order('name');
        if (phcs && phcs.length > 0) {
          setPhcList(phcs);
        }

        // Fetch Subcentres
        const { data: scs } = await (supabase.from('sub_centres') as any).select('id, name, phc_id').order('name');
        if (scs && scs.length > 0) {
          setSubcentreList(scs);
        }

        // Fetch all active forms from Supabase
        let forms = await fetchAllActiveForms();
        if (!forms || forms.length === 0) {
          await syncStandardFormsToDatabase();
          forms = await fetchAllActiveForms();
        }

        setAvailableForms(forms || []);

        if (forms && forms.length > 0) {
          setSelectedFormId(forms[0].id);
          setSelectedFormTitle(forms[0].name);
        }
      } catch (err) {
        console.warn('Error in initData:', err);
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, []);

  // 2. When selectedFormId changes: load full form fields and build dynamic tiers & columns
  useEffect(() => {
    async function loadSelectedFormStructure() {
      if (!selectedFormId) return;
      setDataLoading(true);

      try {
        const fullForm = await getFormWithFields(selectedFormId);
        if (fullForm) {
          setCurrentForm(fullForm);
          setSelectedFormTitle(fullForm.name);

          // Build field tree
          const rawFields = fullForm.fields || [];
          if (rawFields.length > 0) {
            const tree = buildFieldTree(rawFields);
            const depth = getMaxDepth(tree);
            const tiers = buildDynamicHeaderTiers(tree, depth, language);
            const leaves = collectLeafColumns(tree);

            setHeaderTiers(tiers);
            setLeafColumns(leaves);
          } else {
            // Fallback for form with no fields yet
            setHeaderTiers([
              {
                cells: [
                  { id: 'col_sr_no', label: language === 'mr' ? 'अ.क्र.' : 'Sr No', labelMr: 'अ.क्र.', labelEn: 'Sr No', colSpan: 1, rowSpan: 1, isLeaf: true },
                  { id: 'col_facility_name', label: language === 'mr' ? 'आरोग्य केंद्राचे नाव' : 'Name Of Health Center', labelMr: 'आरोग्य केंद्राचे नाव', labelEn: 'Name Of Health Center', colSpan: 1, rowSpan: 1, isLeaf: true },
                  { id: 'col_val', label: language === 'mr' ? 'संख्या / नोंद' : 'Count / Value', labelMr: 'संख्या / नोंद', labelEn: 'Count / Value', colSpan: 1, rowSpan: 1, isLeaf: true }
                ]
              }
            ]);
            setLeafColumns([
              { id: 'value', name: 'value', labelEn: 'Count / Value', labelMr: 'संख्या / नोंद', fieldType: 'Number' }
            ]);
          }
        }
      } catch (err) {
        console.error('Error loading form structure:', err);
      } finally {
        setDataLoading(false);
      }
    }

    loadSelectedFormStructure();
  }, [selectedFormId, language]);

  // 3. Load Submissions and populate Facility Rows when Form, PHC or Date changes
  useEffect(() => {
    async function loadFacilitySubmissions() {
      if (!currentForm && !selectedFormId) return;

      try {
        // Resolve Facilities for this PHC
        let currentPhc = phcList.find(p => selectedPhcName.includes(p.name));
        let matchedSubcentres = subcentreList;

        if (currentPhc) {
          matchedSubcentres = subcentreList.filter(s => s.phc_id === currentPhc.id);
        }

        let baseRows: FacilityRow[] = [];
        if (matchedSubcentres && matchedSubcentres.length > 0) {
          baseRows = matchedSubcentres.map((sc, i) => ({
            id: `sc-${sc.id}`,
            rawId: sc.id,
            srNo: i + 1,
            nameEn: `Sub-Centre ${sc.name}`,
            nameMr: `उपकेंद्र ${sc.name}`,
            submitted: false,
            values: {}
          }));

          // Add PHC HQ row at the end
          baseRows.push({
            id: 'phc-hq',
            rawId: currentPhc?.id,
            srNo: baseRows.length + 1,
            nameEn: `${selectedPhcName} (HQ)`,
            nameMr: `${selectedPhcName} (मुख्यालय)`,
            isPhcHq: true,
            submitted: false,
            values: {}
          });
        } else {
          // Fallback to Bhada facilities
          baseRows = defaultFacilities.map(f => ({ ...f, values: {}, submitted: false }));
        }

        // Fetch submissions for this form & date from Supabase
        if (isSupabaseConfigured()) {
          const formIdentifier = currentForm?.id || selectedFormId;
          const formCodeIdentifier = currentForm?.code;

          let query = (supabase.from('report_submissions') as any)
            .select('id, sub_centre_id, village_id, period_start, period_end, status, created_at');

          if (formCodeIdentifier && formCodeIdentifier !== formIdentifier) {
            query = query.or(`form_id.eq.${formIdentifier},form_id.eq.${formCodeIdentifier}`);
          } else {
            query = query.eq('form_id', formIdentifier);
          }

          // Date filter: submissions encompassing or matching selectedDate
          query = query.lte('period_start', selectedDate).gte('period_end', selectedDate);

          const { data: subs, error: subErr } = await query;

          if (!subErr && subs && subs.length > 0) {
            const subIds = subs.map((s: any) => s.id);
            const { data: vals, error: valErr } = await (supabase
              .from('report_submission_values') as any)
              .select('submission_id, field_id, value_text, value_numeric, value_boolean, value_date')
              .in('submission_id', subIds);

            const valuesBySub = new Map<string, Record<string, any>>();
            if (!valErr && vals) {
              vals.forEach((v: any) => {
                if (!valuesBySub.has(v.submission_id)) {
                  valuesBySub.set(v.submission_id, {});
                }
                const subMap = valuesBySub.get(v.submission_id)!;
                // Store by field_id
                const val = v.value_numeric !== null && v.value_numeric !== undefined 
                  ? v.value_numeric 
                  : (v.value_text || (v.value_boolean !== null ? (v.value_boolean ? 1 : 0) : ''));
                subMap[v.field_id] = val;
              });
            }

            // Map submissions back to facility rows
            baseRows = baseRows.map(fac => {
              const matchedSub = subs.find((s: any) => {
                if (fac.isPhcHq) {
                  return s.sub_centre_id === null || s.sub_centre_id === fac.rawId;
                }
                return s.sub_centre_id === fac.rawId || fac.id.includes(s.sub_centre_id);
              });

              if (matchedSub) {
                const subValues = valuesBySub.get(matchedSub.id) || {};
                
                // Map field IDs and names to facility values
                const rowValues: Record<string, any> = {};
                leafColumns.forEach(col => {
                  if (subValues[col.id] !== undefined) {
                    rowValues[col.id] = subValues[col.id];
                  } else if (subValues[col.name] !== undefined) {
                    rowValues[col.id] = subValues[col.name];
                  } else {
                    rowValues[col.id] = 0;
                  }
                });

                return {
                  ...fac,
                  submitted: true,
                  submissionId: matchedSub.id,
                  values: rowValues
                };
              }

              return fac;
            });
          }
        }

        setFacilities(baseRows);
      } catch (err) {
        console.warn('Error loading submissions:', err);
      }
    }

    loadFacilitySubmissions();
  }, [selectedFormId, currentForm, selectedPhcName, selectedDate, phcList, subcentreList, leafColumns.length]);

  // Format date as DD-MM-YYYY
  const formattedDate = () => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return selectedDate;
    } catch {
      return selectedDate;
    }
  };

  // Calculate Column Totals dynamically for any form
  const calculateTotal = (colId: string): number => {
    return facilities.reduce((sum, row) => {
      const v = row.values[colId];
      return sum + (Number(v) || 0);
    }, 0);
  };

  // In-place Cell Value Change
  const handleValueChange = (facilityId: string, colId: string, val: string) => {
    const num = val === '' ? 0 : Number(val) || 0;
    setFacilities(prev => prev.map(f => {
      if (f.id === facilityId) {
        const updated = { ...f.values, [colId]: num };
        
        // Check if any leaf column has calculation formula (e.g. Total = A + B)
        leafColumns.forEach(col => {
          if (col.calculationFormula) {
            try {
              const cf = col.calculationFormula;
              if (cf.type === 'sum' && Array.isArray(cf.sourceFieldIds)) {
                let calcSum = 0;
                cf.sourceFieldIds.forEach((srcId: string) => {
                  calcSum += Number(updated[srcId]) || 0;
                });
                updated[col.id] = calcSum;
              }
            } catch (e) {
              // Ignore calculation err
            }
          }
        });

        // Mark as submitted if has any non-zero value
        const hasData = Object.values(updated).some((v: any) => Number(v) > 0);
        return { ...f, values: updated, submitted: hasData };
      }
      return f;
    }));
  };

  // Save Modified Matrix Values directly to Supabase
  const handleSaveMatrixEntries = async () => {
    if (!isSupabaseConfigured() || !currentForm) {
      alert(language === 'mr' ? 'डेटाबेस उपलब्ध नाही.' : 'Database is not connected.');
      return;
    }

    setIsSaving(true);
    try {
      for (const fac of facilities) {
        // Only save if has values or is submitted
        const hasValues = Object.keys(fac.values).length > 0 && Object.values(fac.values).some(v => v !== '' && v !== null && v !== undefined);
        if (!hasValues) continue;

        let subId = fac.submissionId;
        const subCentreId = fac.isPhcHq ? null : (fac.rawId || null);

        if (subId) {
          // Update submission timestamp
          await (supabase.from('report_submissions') as any)
            .update({
              status: 'Submitted',
              submitted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', subId);

          // Delete old values
          await (supabase.from('report_submission_values') as any).delete().eq('submission_id', subId);
        } else {
          // Insert new submission
          const { data: newSub, error: insErr } = await (supabase.from('report_submissions') as any)
            .insert({
              form_id: currentForm.id,
              employee_id: employee?.id || null,
              sub_centre_id: subCentreId,
              period_start: selectedDate,
              period_end: selectedDate,
              status: 'Submitted',
              submitted_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (insErr || !newSub) continue;
          subId = newSub.id;
        }

        // Insert fresh values for all leaf columns
        if (subId && leafColumns.length > 0) {
          const valuesToInsert = leafColumns.map(col => {
            const rawVal = fac.values[col.id];
            const isNum = col.fieldType === 'Number' || typeof rawVal === 'number';
            return {
              submission_id: subId,
              field_id: col.id,
              value_text: rawVal !== undefined && rawVal !== null ? String(rawVal) : '0',
              value_numeric: isNum ? (Number(rawVal) || 0) : null
            };
          });

          await (supabase.from('report_submission_values') as any).insert(valuesToInsert);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setEditMode(false);
    } catch (err: any) {
      console.error('Error saving matrix entries:', err);
      alert(language === 'mr' ? 'डेटा जतन करताना त्रुटी आली.' : 'Error saving entries to database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Non-reporting facilities (defaulters)
  const nonReportingFacilities = facilities.filter(f => !f.submitted);
  const nonReportingListText = nonReportingFacilities
    .map(f => language === 'mr' ? f.nameMr : f.nameEn)
    .join(', ');

  // Professional Print Handler with dynamic columns
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;

    const reportTitle = `${selectedPhcName} ${selectedFormTitle}`;
    const reportDate = formattedDate();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", "Mukta", sans-serif;
          }
          body {
            margin: 0;
            padding: 10px;
            color: #000000;
            background: #ffffff;
            font-size: 11px;
          }
          .title-container {
            text-align: center;
            margin-bottom: 8px;
          }
          .main-heading {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 4px 0;
          }
          .sub-heading {
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            margin: 0 0 10px 0;
          }
          .header-line {
            border-bottom: 2px solid #2563eb;
            margin-bottom: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            border: 1px solid #94a3b8;
          }
          th, td {
            border: 1px solid #94a3b8;
            padding: 4px 3px;
            text-align: center;
            font-size: 10px;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 700;
          }
          .col-sr {
            width: 35px;
          }
          .col-name {
            width: 160px;
            text-align: left;
            padding-left: 6px;
          }
          .total-row td {
            font-weight: 800;
            background-color: #ffffff;
            border-top: 2px solid #000000;
            border-bottom: 2px solid #000000;
          }
          .defaulter-section {
            margin-top: 14px;
            font-size: 12px;
            font-weight: 800;
            color: #dc2626;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="title-container">
          <h1 class="main-heading">${reportTitle}</h1>
          <div class="sub-heading">Report for ${reportDate}</div>
        </div>
        <div class="header-line"></div>

        <table>
          <thead>
            ${headerTiers.map(tier => `
              <tr>
                ${tier.cells.map(cell => `
                  <th colSpan="${cell.colSpan}" rowSpan="${cell.rowSpan}" class="${cell.id === 'col_sr_no' ? 'col-sr' : (cell.id === 'col_facility_name' ? 'col-name' : '')}">
                    ${cell.label}
                  </th>
                `).join('')}
              </tr>
            `).join('')}
          </thead>
          <tbody>
            ${facilities.map(f => `
              <tr>
                <td>${f.srNo}</td>
                <td style="text-align: left; padding-left: 6px;">${language === 'mr' ? f.nameMr : f.nameEn}</td>
                ${leafColumns.map(col => `
                  <td>${f.values[col.id] !== undefined ? f.values[col.id] : 0}</td>
                `).join('')}
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2" style="text-align: center; font-weight: bold;">${language === 'mr' ? 'Total (एकूण)' : 'Total'}</td>
              ${leafColumns.map(col => `
                <td>${calculateTotal(col.id)}</td>
              `).join('')}
            </tr>
          </tbody>
        </table>

        <div class="defaulter-section">
          ${language === 'mr' ? 'आज अहवाल सादर न करणाऱ्या आरोग्य संस्था :' : 'Health institutions that did not submit report today :'} ${nonReportingListText || (language === 'mr' ? 'निरंक (सर्व संस्थांनी अहवाल सादर केला)' : 'Nil (All institutions reported)')}
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // PDF Download Handler (Dynamic Multi-Tier Landscape A4)
  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const reportTitle = `${selectedPhcName} ${selectedFormTitle}`;
    const reportDate = formattedDate();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Heading
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(reportTitle, pageWidth / 2, 14, { align: 'center' });

    // 2. Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Report for ${reportDate}`, pageWidth / 2, 20, { align: 'center' });

    // Divider
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(12, 23, pageWidth - 12, 23);

    // Multi-level Header structure for AutoTable
    const head = headerTiers.map(tier => {
      return tier.cells.map(cell => ({
        content: cell.label,
        colSpan: cell.colSpan,
        rowSpan: cell.rowSpan,
        styles: {
          halign: (cell.id === 'col_facility_name' ? 'left' : 'center') as any,
          valign: 'middle' as any
        }
      }));
    });

    const body = facilities.map(f => [
      f.srNo,
      language === 'mr' ? f.nameMr : f.nameEn,
      ...leafColumns.map(col => (f.values[col.id] !== undefined ? f.values[col.id] : 0))
    ]);

    // Add Total Row
    const totalRow = [
      { content: 'Total', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
      ...leafColumns.map(col => calculateTotal(col.id))
    ];

    body.push(totalRow as any);

    autoTable(doc, {
      startY: 26,
      head: head as any,
      body: body as any,
      theme: 'grid',
      styles: {
        fontSize: leafColumns.length > 12 ? 6.5 : 7.5,
        cellPadding: 1.5,
        halign: 'center' as const,
        lineColor: [180, 190, 200],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
        lineWidth: 0.3,
        lineColor: [148, 163, 184]
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: leafColumns.length > 12 ? 35 : 42, halign: 'left' as const },
      },
      didDrawPage: (data) => {
        // Red defaulter text at bottom
        const finalY = (data as any).cursor.y + 8;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // Red-600
        
        const defaulterTitle = language === 'mr' 
          ? 'आज अहवाल सादर न करणाऱ्या आरोग्य संस्था : ' 
          : 'Health institutions that did not submit report today : ';
        
        const splitText = doc.splitTextToSize(defaulterTitle + (nonReportingListText || 'Nil'), pageWidth - 24);
        doc.text(splitText, 12, finalY);
      }
    });

    doc.save(`${selectedPhcName.replace(/\s+/g, '_')}_${selectedFormTitle.replace(/\s+/g, '_')}_${formattedDate()}.pdf`);
  };

  // Excel Download Handler with dynamic columns
  const handleDownloadExcel = () => {
    const wsData: any[][] = [
      [`${selectedPhcName} ${selectedFormTitle}`],
      [`Report for ${formattedDate()}`],
      [],
      [
        'Sr No',
        'Name Of Health Center',
        ...leafColumns.map(col => {
          const path = language === 'mr' ? col.parentPathMr : col.parentPathEn;
          const lbl = language === 'mr' ? col.labelMr : col.labelEn;
          return path ? `${path} > ${lbl}` : lbl;
        })
      ]
    ];

    facilities.forEach(f => {
      wsData.push([
        f.srNo,
        language === 'mr' ? f.nameMr : f.nameEn,
        ...leafColumns.map(col => f.values[col.id] !== undefined ? f.values[col.id] : 0)
      ]);
    });

    // Total Row
    wsData.push([
      'Total',
      '',
      ...leafColumns.map(col => calculateTotal(col.id))
    ]);

    wsData.push([]);
    wsData.push([
      language === 'mr' ? 'आज अहवाल सादर न करणाऱ्या आरोग्य संस्था :' : 'Health institutions that did not submit report today :',
      nonReportingListText || 'Nil'
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matrix_Report');
    XLSX.writeFile(wb, `${selectedPhcName.replace(/\s+/g, '_')}_Matrix_Report_${formattedDate()}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Top Filter and Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              {language === 'mr' ? 'संस्थानिहाय अहवाल मॅट्रिक्स' : 'Facility Matrix Report'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {language === 'mr' ? 'सर्व अहवाल प्रपत्रांचे डायनॅमिक कॉलम्स' : 'Dynamic Form Fields Consolidation'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            {language === 'mr' ? 'प्राथमिक आरोग्य केंद्रनिहाय एकत्रित अहवाल' : 'PHC & Sub-centre Consolidated Report'}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {editMode ? (
            <button
              onClick={handleSaveMatrixEntries}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {language === 'mr' ? 'बदल जतन करा (Save)' : 'Save Entries'}
            </button>
          ) : null}

          <button
            onClick={() => setEditMode(!editMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              editMode 
                ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700' 
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            {editMode ? (language === 'mr' ? 'संपादन बंद करा' : 'Exit Fast Entry') : (language === 'mr' ? 'जलद डेटा एन्ट्री' : 'Fast Matrix Entry')}
          </button>

          <button
            onClick={() => setShowPrintPreview(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            {language === 'mr' ? 'प्रिंट प्रिव्ह्यू (Print Preview)' : 'Print Preview Mode'}
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            {language === 'mr' ? 'थेट प्रिंट' : 'Quick Print'}
          </button>

          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>

          <button
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {language === 'mr' ? 'सर्व उपकेंद्रांची आकडेवारी यशस्वीरीत्या जतन झाली आहे!' : 'Facility matrix values saved successfully!'}
        </div>
      )}

      {/* Selectors Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* PHC Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {language === 'mr' ? 'प्राथमिक आरोग्य केंद्र (PHC):' : 'Select PHC:'}
          </label>
          <select
            value={selectedPhcName}
            onChange={(e) => setSelectedPhcName(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="प्राथमिक आरोग्य केंद्र भादा">प्राथमिक आरोग्य केंद्र भादा (PHC Bhada)</option>
            {phcList.filter(p => p.name !== 'भादा' && p.name !== 'Bhada').map(p => (
              <option key={p.id} value={`प्राथमिक आरोग्य केंद्र ${p.name}`}>
                प्राथमिक आरोग्य केंद्र {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Form Title Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {language === 'mr' ? 'अहवाल प्रकार / फॉर्म निवडा (Select Form):' : 'Select Form / Report:'}
          </label>
          <select
            value={selectedFormId}
            onChange={(e) => {
              const fId = e.target.value;
              setSelectedFormId(fId);
              const found = availableForms.find(f => f.id === fId);
              if (found) {
                setSelectedFormTitle(found.name);
              }
            }}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {/* User-created Custom Forms */}
            {availableForms.filter(f => !f.id.startsWith('std_')).length > 0 && (
              <optgroup label={language === 'mr' ? '🌟 उपलब्ध सर्व सक्रिय अहवाल' : '🌟 Active Reports'}>
                {availableForms.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.reporting_period || 'Daily/Monthly'})
                  </option>
                ))}
              </optgroup>
            )}

            {availableForms.length === 0 && (
              <option value="">{language === 'mr' ? 'कोणतेही फॉर्म उपलब्ध नाहीत' : 'No forms available'}</option>
            )}
          </select>
        </div>

        {/* Date Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {language === 'mr' ? 'अहवाल तारीख (Report Date):' : 'Report Date:'}
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Official Printable Matrix Report Sheet */}
      <div className="bg-white border-2 border-slate-300 rounded-xl shadow-md p-6 sm:p-8 overflow-hidden">
        {/* Header matching sample image */}
        <div className="text-center pb-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
            {selectedPhcName} {selectedFormTitle}
          </h2>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Report for {formattedDate()}
          </p>
          <div className="w-full h-0.5 bg-blue-600 mt-3 mx-auto"></div>
        </div>

        {dataLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm font-medium">{language === 'mr' ? 'अहवाल स्तंभ व माहिती लोड होत आहे...' : 'Loading dynamic report fields...'}</p>
          </div>
        ) : (
          /* Matrix Grid Table Container */
          <div className="overflow-x-auto mt-4">
            <table className="w-full border-collapse border border-slate-300 text-center text-xs">
              {/* Dynamic Header Tiers */}
              <thead>
                {headerTiers.map((tier, tIdx) => (
                  <tr key={`tier-${tIdx}`} className={`text-[11px] font-bold ${tIdx === 0 ? 'bg-slate-100 text-slate-800' : 'bg-slate-50 text-slate-600'}`}>
                    {tier.cells.map(cell => (
                      <th
                        key={cell.id}
                        colSpan={cell.colSpan}
                        rowSpan={cell.rowSpan}
                        className={`border border-slate-300 px-2 py-2 text-center align-middle ${
                          cell.id === 'col_sr_no' 
                            ? 'w-10' 
                            : cell.id === 'col_facility_name' 
                            ? 'min-w-[180px] text-left font-bold text-slate-800' 
                            : 'min-w-[70px]'
                        }`}
                      >
                        {cell.label}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              {/* Body */}
              <tbody>
                {facilities.map((fac) => (
                  <tr key={fac.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="border border-slate-300 px-2 py-2 text-slate-600 font-semibold text-center">
                      {fac.srNo}
                    </td>
                    <td className={`border border-slate-300 px-3 py-2 text-left font-bold ${fac.isPhcHq ? 'text-blue-900 bg-blue-50/20' : 'text-slate-800'}`}>
                      {language === 'mr' ? fac.nameMr : fac.nameEn}
                    </td>
                    {leafColumns.map((col) => (
                      <td key={col.id} className="border border-slate-300 px-1 py-1.5 text-center font-medium text-slate-800">
                        {editMode ? (
                          <input
                            type={col.fieldType === 'Number' ? 'number' : 'text'}
                            value={fac.values[col.id] !== undefined ? fac.values[col.id] : 0}
                            onChange={(e) => handleValueChange(fac.id, col.id, e.target.value)}
                            className="w-14 text-center py-0.5 text-xs border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        ) : (
                          fac.values[col.id] !== undefined ? fac.values[col.id] : 0
                        )}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="bg-slate-100 font-bold border-t-2 border-b-2 border-slate-400">
                  <td colSpan={2} className="border border-slate-300 px-4 py-2.5 text-center font-extrabold text-sm text-slate-900">
                    {language === 'mr' ? 'Total (एकूण)' : 'Total'}
                  </td>
                  {leafColumns.map((col) => (
                    <td key={col.id} className="border border-slate-300 px-1 py-2 text-center font-extrabold text-slate-950">
                      {col.fieldType === 'Number' || typeof facilities[0]?.values[col.id] === 'number'
                        ? calculateTotal(col.id) 
                        : '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Red Defaulter Alert section below table matching sample */}
        <div className="mt-6 pt-3 border-t border-slate-200">
          <p className="text-sm font-extrabold text-red-600 leading-relaxed">
            <span className="underline mr-1">
              {language === 'mr' ? 'आज अहवाल सादर न करणाऱ्या आरोग्य संस्था :' : 'Health institutions that did not submit report today :'}
            </span>
            {nonReportingListText || (language === 'mr' ? 'निरंक (सर्व उपकेंद्रांनी वेळेत अहवाल सादर केला)' : 'Nil (All institutions submitted)')}
          </p>
        </div>
      </div>

      {/* Dedicated Print Preview Modal with Full CSS Print Controls */}
      {showPrintPreview && (
        <PrintPreviewModal
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          customReportTitle={`${selectedPhcName} ${selectedFormTitle}`}
          customSubTitle={`Report for ${formattedDate()}`}
          initialOrientation="landscape"
          onDirectExcelExport={handleDownloadExcel}
          customContent={
            <div className="space-y-4">
              {/* Official Enclosed Government Header Box */}
              <div className="border-2 border-slate-900 text-slate-950 text-[11px] mb-3 bg-white avoid-break shadow-xs">
                <div className="border-b border-slate-900 py-1.5 px-3 text-center font-extrabold uppercase tracking-wide text-xs bg-slate-100">
                  PUBLIC HEALTH DEPARTMENT - GOVERNMENT OF MAHARASHTRA
                </div>
                <div className="border-b border-slate-900 py-1 px-3 text-center font-extrabold text-sm text-slate-900">
                  Report Title: {selectedPhcName} {selectedFormTitle}
                </div>
                <div className="border-b border-slate-900 py-0.5 px-3 text-center font-semibold text-[11px] text-slate-700 bg-slate-50/50">
                  Reporting Period: {formattedDate()}
                </div>
                <div className="border-b border-slate-900 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900 text-[10.5px]">
                  <div className="px-2.5 py-1">
                    <span className="font-bold">District:</span> {employee?.district_id || 'Latur'}
                  </div>
                  <div className="px-2.5 py-1">
                    <span className="font-bold">Taluka:</span> {employee?.taluka_id || 'Ausa'}
                  </div>
                  <div className="px-2.5 py-1">
                    <span className="font-bold">PHC:</span> {selectedPhcName}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900 text-[10.5px]">
                  <div className="px-2.5 py-1">
                    <span className="font-bold">Sub-Centres:</span> {facilities.length - 1} Sub-centres + HQ
                  </div>
                  <div className="px-2.5 py-1">
                    <span className="font-bold">Report Type:</span> Facility Matrix Summary
                  </div>
                  <div className="px-2.5 py-1">
                    <span className="font-bold">Generated:</span> {new Date().toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>

              {/* Printable Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-slate-900 text-center text-[10px]">
                  <thead>
                    {headerTiers.map((tier, tIdx) => (
                      <tr key={`print-tier-${tIdx}`} className="bg-slate-100 font-bold text-slate-900 border-b border-slate-900">
                        {tier.cells.map(cell => (
                          <th
                            key={`p-${cell.id}`}
                            colSpan={cell.colSpan}
                            rowSpan={cell.rowSpan}
                            className={`border border-slate-900 px-2 py-1.5 ${
                              cell.id === 'col_sr_no' 
                                ? 'w-8 text-center' 
                                : cell.id === 'col_facility_name' 
                                ? 'min-w-[150px] text-left' 
                                : 'text-center'
                            }`}
                          >
                            {cell.label}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {facilities.map((fac) => (
                      <tr key={`print-${fac.id}`} className="hover:bg-slate-50 print-row">
                        <td className="border border-slate-900 px-1 py-1 text-center font-medium">{fac.srNo}</td>
                        <td className={`border border-slate-900 px-2 py-1 text-left font-bold ${fac.isPhcHq ? 'text-blue-900 bg-blue-50/20' : 'text-slate-800'}`}>
                          {language === 'mr' ? fac.nameMr : fac.nameEn}
                        </td>
                        {leafColumns.map((col) => (
                          <td key={`val-${col.id}`} className="border border-slate-900 px-1 py-1 text-center font-medium">
                            {fac.values[col.id] !== undefined ? fac.values[col.id] : 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold border-t-2 border-b-2 border-slate-900">
                      <td colSpan={2} className="border border-slate-900 px-2 py-1.5 text-center font-extrabold text-slate-900">
                        {language === 'mr' ? 'Total (एकूण)' : 'Total'}
                      </td>
                      {leafColumns.map((col) => (
                        <td key={`tot-${col.id}`} className="border border-slate-900 px-1 py-1.5 text-center font-extrabold text-slate-950">
                          {col.fieldType === 'Number' || typeof facilities[0]?.values[col.id] === 'number'
                            ? calculateTotal(col.id) 
                            : '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Defaulter Alert */}
              <div className="pt-2">
                <p className="text-xs font-bold text-red-600">
                  <span className="underline mr-1">
                    {language === 'mr' ? 'आज अहवाल सादर न करणाऱ्या आरोग्य संस्था :' : 'Health institutions that did not submit report today :'}
                  </span>
                  {nonReportingListText || (language === 'mr' ? 'निरंक (सर्व उपकेंद्रांनी अहवाल सादर केला)' : 'Nil (All reported)')}
                </p>
              </div>

              {/* Signatures */}
              <div className="pt-8 flex justify-between items-end avoid-break text-[10px] text-slate-700">
                <div className="text-center w-44 sig-box">
                  <div className="h-8"></div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                    {language === 'mr' ? 'वैद्यकीय अधिकारी स्वाक्षरी' : 'Medical Officer Sign'}
                  </div>
                  <div className="text-slate-500 text-[9px]">{selectedPhcName}</div>
                </div>

                <div className="text-center w-44 sig-box">
                  <div className="h-8"></div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                    {language === 'mr' ? 'तालुका आरोग्य अधिकारी (THO)' : 'Taluka Health Officer (THO)'}
                  </div>
                  <div className="text-slate-500 text-[9px]">स्वाक्षरी व शिक्का</div>
                </div>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}


