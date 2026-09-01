import React, { useState, useEffect, useRef } from 'react';
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
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguageStore } from '@/store/languageStore';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import PrintPreviewModal from '@/components/PrintPreviewModal';
import { fetchAllActiveForms, getFormWithFields, StoredForm, FormFieldItem, buildFieldTree } from '@/utils/formStorage';

interface MetricColumn {
  id: string;
  category: string;
  categoryMr: string;
  subCategory?: string;
  subCategoryMr?: string;
  type: 'daily' | 'pro';
  labelEn: string;
  labelMr: string;
}

interface FacilityRow {
  id: string;
  srNo: number;
  nameEn: string;
  nameMr: string;
  isPhcHq?: boolean;
  submitted: boolean;
  values: Record<string, number>;
}

export default function FacilityMatrixReport() {
  const { language } = useLanguageStore();
  const { employee } = useAuth();
  
  // Available Forms from DB & Form Builder
  const [availableForms, setAvailableForms] = useState<StoredForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('scrub_typhus');
  
  // Filters
  const [selectedPhcName, setSelectedPhcName] = useState<string>('प्राथमिक आरोग्य केंद्र भादा');
  const [selectedFormTitle, setSelectedFormTitle] = useState<string>('स्क्रब टायफस दैनिक अहवाल');
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-28');
  const [phcList, setPhcList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Standard Sub-centres under PHC Bhada as shown in sample
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

  // Load all user-created & active forms
  useEffect(() => {
    async function loadForms() {
      try {
        const forms = await fetchAllActiveForms();
        setAvailableForms(forms);
        
        // If there is any active form created by user, default to it if user hasn't chosen
        if (forms && forms.length > 0) {
          const customForm = forms.find(f => !f.id.startsWith('std_') && f.id !== 'scrub_typhus');
          if (customForm) {
            setSelectedFormId(customForm.id);
            setSelectedFormTitle(customForm.name);
          } else {
            setSelectedFormId(forms[0].id);
            setSelectedFormTitle(forms[0].name);
          }
        }
      } catch (err) {
        console.warn('Error loading forms in FacilityMatrixReport:', err);
      }
    }
    loadForms();
  }, []);

  // Metric Columns Definition matching the sample image exactly
  const metricColumns: MetricColumn[] = [
    // 1. Scrub Typhus Cases
    { id: 'cases_daily', category: 'Scrub Typhus Cases', categoryMr: 'स्क्रब टायफस रुग्ण', type: 'daily', labelEn: 'Daily', labelMr: 'दैनिक' },
    { id: 'cases_pro', category: 'Scrub Typhus Cases', categoryMr: 'स्क्रब टायफस रुग्ण', type: 'pro', labelEn: 'Pro', labelMr: 'प्रगती' },
    
    // 2. Tests Conducted
    { id: 'rdk_tests_daily', category: 'Tests Conducted', categoryMr: 'तपासलेले नमुने / चाचण्या', subCategory: 'RDK Tests', subCategoryMr: 'RDK Tests', type: 'daily', labelEn: 'Daily', labelMr: 'दैनिक' },
    { id: 'rdk_tests_pro', category: 'Tests Conducted', categoryMr: 'तपासलेले नमुने / चाचण्या', subCategory: 'RDK Tests', subCategoryMr: 'RDK Tests', type: 'pro', labelEn: 'Pro', labelMr: 'प्रगती' },
    { id: 'wf_tests_daily', category: 'Tests Conducted', categoryMr: 'तपासलेले नमुने / चाचण्या', subCategory: 'Weil-Felix Tests', subCategoryMr: 'Weil-Felix Tests', type: 'daily', labelEn: 'Daily', labelMr: 'दैनिक' },
    { id: 'wf_tests_pro', category: 'Tests Conducted', categoryMr: 'तपासलेले नमुने / चाचण्या', subCategory: 'Weil-Felix Tests', subCategoryMr: 'Weil-Felix Tests', type: 'pro', labelEn: 'Pro', labelMr: 'प्रगती' },
    { id: 'elisa_tests_daily', category: 'Tests Conducted', categoryMr: 'तपासलेले नमुने / चाचण्या', subCategory: 'ELISA IgM Tests', subCategoryMr: 'ELISA IgM Tests', type: 'daily', labelEn: 'Daily', labelMr: 'दैनिक' },
    { id: 'elisa_tests_pro', category: 'Tests Conducted', categoryMr: 'तपासलेले नमुने / चाचण्या', subCategory: 'ELISA IgM Tests', subCategoryMr: 'ELISA IgM Tests', type: 'pro', labelEn: 'Pro', labelMr: 'प्रगती' },
    { id: 'total_tests_daily', category: 'Tests Conducted', categoryMr: 'तपासलेले नमुने / चाचण्या', subCategory: 'Total Tests', subCategoryMr: 'Total Tests', type: 'daily', labelEn: 'Daily', labelMr: 'दैनिक' },
    { id: 'total_tests_pro', category: 'Tests Conducted', categoryMr: 'तपासलेले नमुने / चाचण्या', subCategory: 'Total Tests', subCategoryMr: 'Total Tests', type: 'pro', labelEn: 'Pro', labelMr: 'प्रगती' },

    // 3. Positive Cases
    { id: 'rdk_pos_daily', category: 'Positive Cases', categoryMr: 'पॉझिटिव्ह रुग्ण', subCategory: 'RDK Positive', subCategoryMr: 'RDK Positive', type: 'daily', labelEn: 'Daily', labelMr: 'दैनिक' },
    { id: 'rdk_pos_pro', category: 'Positive Cases', categoryMr: 'पॉझिटिव्ह रुग्ण', subCategory: 'RDK Positive', subCategoryMr: 'RDK Positive', type: 'pro', labelEn: 'Pro', labelMr: 'प्रगती' },
    { id: 'wf_pos_daily', category: 'Positive Cases', categoryMr: 'पॉझिटिव्ह रुग्ण', subCategory: 'Weil-Felix Positive', subCategoryMr: 'Weil-Felix Positive', type: 'daily', labelEn: 'Daily', labelMr: 'दैनिक' },
    { id: 'wf_pos_pro', category: 'Positive Cases', categoryMr: 'पॉझिटिव्ह रुग्ण', subCategory: 'Weil-Felix Positive', subCategoryMr: 'Weil-Felix Positive', type: 'pro', labelEn: 'Pro', labelMr: 'प्रगती' },
    { id: 'elisa_pos_daily', category: 'Positive Cases', categoryMr: 'पॉझिटिव्ह रुग्ण', subCategory: 'ELISA IgM Positive', subCategoryMr: 'ELISA IgM Positive', type: 'daily', labelEn: 'Daily', labelMr: 'दैनिक' },
    { id: 'elisa_pos_pro', category: 'Positive Cases', categoryMr: 'पॉझिटिव्ह रुग्ण', subCategory: 'ELISA IgM Positive', subCategoryMr: 'ELISA IgM Positive', type: 'pro', labelEn: 'Pro', labelMr: 'प्रगती' },
    { id: 'total_pos_daily', category: 'Positive Cases', categoryMr: 'पॉझिटिव्ह रुग्ण', subCategory: 'Total Positive', subCategoryMr: 'Total Positive', type: 'daily', labelEn: 'Daily', labelMr: 'दैनिक' },
    { id: 'total_pos_pro', category: 'Positive Cases', categoryMr: 'पॉझिटिव्ह रुग्ण', subCategory: 'Total Positive', subCategoryMr: 'Total Positive', type: 'pro', labelEn: 'Pro', labelMr: 'प्रगती' },

    // 4. Deaths
    { id: 'deaths_daily', category: 'Deaths', categoryMr: 'मृत्यू', type: 'daily', labelEn: 'Daily', labelMr: 'दैनिक' },
    { id: 'deaths_pro', category: 'Deaths', categoryMr: 'मृत्यू', type: 'pro', labelEn: 'Pro', labelMr: 'प्रगती' },
  ];

  // Fetch real sub-centres & PHCs if available in Supabase
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data: phcs } = await supabase.from('phcs').select('id, name').order('name');
        if (phcs && phcs.length > 0) {
          setPhcList(phcs);
        }

        // Try to query subcentres under current PHC
        const { data: subcentres } = await (supabase.from('sub_centres') as any).select('id, name').order('name');
        if (subcentres && subcentres.length > 0) {
          // If we have real DB subcentres, merge them
          const dbRows: FacilityRow[] = subcentres.map((sc: any, i: number) => ({
            id: sc.id,
            srNo: i + 1,
            nameEn: `Sub-Centre ${sc.name}`,
            nameMr: `उपकेंद्र ${sc.name}`,
            submitted: false,
            values: {}
          }));
          
          dbRows.push({
            id: 'phc-hq',
            srNo: dbRows.length + 1,
            nameEn: 'Primary Health Centre HQ',
            nameMr: selectedPhcName,
            isPhcHq: true,
            submitted: false,
            values: {}
          });

          // Check if defaultFacilities match Bhada
          if (selectedPhcName.includes('भादा') || selectedPhcName.includes('Bhada')) {
            setFacilities(defaultFacilities);
          } else {
            setFacilities(dbRows);
          }
        }
      } catch (err) {
        console.error('Error fetching facility data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedPhcName]);

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

  // Calculate Column Totals
  const calculateTotal = (colId: string): number => {
    return facilities.reduce((sum, row) => sum + (Number(row.values[colId]) || 0), 0);
  };

  // Update cell in edit mode
  const handleValueChange = (facilityId: string, colId: string, val: string) => {
    const num = val === '' ? 0 : Number(val) || 0;
    setFacilities(prev => prev.map(f => {
      if (f.id === facilityId) {
        const updated = { ...f.values, [colId]: num };
        
        // Auto-calculate Total Tests & Total Positive
        if (colId.startsWith('rdk_tests') || colId.startsWith('wf_tests') || colId.startsWith('elisa_tests')) {
          const isDaily = colId.endsWith('_daily');
          const suffix = isDaily ? '_daily' : '_pro';
          updated[`total_tests${suffix}`] = 
            (Number(updated[`rdk_tests${suffix}`]) || 0) + 
            (Number(updated[`wf_tests${suffix}`]) || 0) + 
            (Number(updated[`elisa_tests${suffix}`]) || 0);
        }

        if (colId.startsWith('rdk_pos') || colId.startsWith('wf_pos') || colId.startsWith('elisa_pos')) {
          const isDaily = colId.endsWith('_daily');
          const suffix = isDaily ? '_daily' : '_pro';
          updated[`total_pos${suffix}`] = 
            (Number(updated[`rdk_pos${suffix}`]) || 0) + 
            (Number(updated[`wf_pos${suffix}`]) || 0) + 
            (Number(updated[`elisa_pos${suffix}`]) || 0);
        }

        // Mark as submitted if has any non-zero value
        const hasData = Object.values(updated).some((v: any) => Number(v) > 0);
        return { ...f, values: updated, submitted: hasData };
      }
      return f;
    }));
  };

  // Non-reporting facilities (defaulters)
  const nonReportingFacilities = facilities.filter(f => !f.submitted);
  const nonReportingListText = nonReportingFacilities
    .map(f => language === 'mr' ? f.nameMr : f.nameEn)
    .join(', ');

  // Professional Print Handler
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
            <tr>
              <th rowspan="3" class="col-sr">Sr<br/>No</th>
              <th rowspan="3" class="col-name">Name Of Health Center</th>
              <th colspan="2">Scrub Typhus<br/>Cases</th>
              <th colspan="8">Tests Conducted</th>
              <th colspan="8">Positive Cases</th>
              <th colspan="2">Deaths</th>
            </tr>
            <tr>
              <!-- Level 2 under Tests -->
              <th colspan="2">RDK<br/>Tests</th>
              <th colspan="2">Weil-Felix<br/>Tests</th>
              <th colspan="2">ELISA IgM<br/>Tests</th>
              <th colspan="2">Total<br/>Tests</th>

              <!-- Level 2 under Positive -->
              <th colspan="2">RDK<br/>Positive</th>
              <th colspan="2">Weil-Felix<br/>Positive</th>
              <th colspan="2">ELISA IgM<br/>Positive</th>
              <th colspan="2">Total<br/>Positive</th>
            </tr>
            <tr>
              <!-- Level 3 Leaf columns -->
              <th>Daily</th><th>Pro</th>
              <th>Daily</th><th>Pro</th>
              <th>Daily</th><th>Pro</th>
              <th>Daily</th><th>Pro</th>
              <th>Daily</th><th>Pro</th>
              <th>Daily</th><th>Pro</th>
              <th>Daily</th><th>Pro</th>
              <th>Daily</th><th>Pro</th>
              <th>Daily</th><th>Pro</th>
              <th>Daily</th><th>Pro</th>
            </tr>
          </thead>
          <tbody>
            ${facilities.map(f => `
              <tr>
                <td>${f.srNo}</td>
                <td style="text-align: left; padding-left: 6px;">${language === 'mr' ? f.nameMr : f.nameEn}</td>
                ${metricColumns.map(col => `
                  <td>${f.values[col.id] !== undefined ? f.values[col.id] : 0}</td>
                `).join('')}
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2" style="text-align: center; font-weight: bold;">Total</td>
              ${metricColumns.map(col => `
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

  // PDF Download Handler (Exact Landscape A4)
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
    const head = [
      [
        { content: 'Sr\nNo', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Name Of Health Center', rowSpan: 3, styles: { halign: 'left', valign: 'middle' } },
        { content: 'Scrub Typhus\nCases', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Tests Conducted', colSpan: 8, styles: { halign: 'center' } },
        { content: 'Positive Cases', colSpan: 8, styles: { halign: 'center' } },
        { content: 'Deaths', colSpan: 2, styles: { halign: 'center' } },
      ],
      [
        // Under Tests Conducted
        { content: 'RDK\nTests', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Weil-Felix\nTests', colSpan: 2, styles: { halign: 'center' } },
        { content: 'ELISA IgM\nTests', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Total\nTests', colSpan: 2, styles: { halign: 'center' } },
        // Under Positive Cases
        { content: 'RDK\nPositive', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Weil-Felix\nPositive', colSpan: 2, styles: { halign: 'center' } },
        { content: 'ELISA IgM\nPositive', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Total\nPositive', colSpan: 2, styles: { halign: 'center' } },
      ],
      [
        // Leaf headers
        'Daily', 'Pro',
        'Daily', 'Pro',
        'Daily', 'Pro',
        'Daily', 'Pro',
        'Daily', 'Pro',
        'Daily', 'Pro',
        'Daily', 'Pro',
        'Daily', 'Pro',
        'Daily', 'Pro',
        'Daily', 'Pro',
      ]
    ];

    const body = facilities.map(f => [
      f.srNo,
      language === 'mr' ? f.nameMr : f.nameEn,
      ...metricColumns.map(col => (f.values[col.id] !== undefined ? f.values[col.id] : 0))
    ]);

    // Add Total Row
    const totalRow = [
      { content: 'Total', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
      ...metricColumns.map(col => calculateTotal(col.id))
    ];

    body.push(totalRow as any);

    autoTable(doc, {
      startY: 26,
      head: head as any,
      body: body as any,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
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
        1: { cellWidth: 42, halign: 'left' as const },
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

    doc.save(`${selectedPhcName.replace(/\s+/g, '_')}_Matrix_Report_${formattedDate()}.pdf`);
  };

  // Excel Download Handler
  const handleDownloadExcel = () => {
    const wsData: any[][] = [
      [`${selectedPhcName} ${selectedFormTitle}`],
      [`Report for ${formattedDate()}`],
      [],
      [
        'Sr No',
        'Name Of Health Center',
        'Scrub Typhus Cases (Daily)',
        'Scrub Typhus Cases (Pro)',
        'RDK Tests (Daily)',
        'RDK Tests (Pro)',
        'Weil-Felix Tests (Daily)',
        'Weil-Felix Tests (Pro)',
        'ELISA IgM Tests (Daily)',
        'ELISA IgM Tests (Pro)',
        'Total Tests (Daily)',
        'Total Tests (Pro)',
        'RDK Positive (Daily)',
        'RDK Positive (Pro)',
        'Weil-Felix Positive (Daily)',
        'Weil-Felix Positive (Pro)',
        'ELISA IgM Positive (Daily)',
        'ELISA IgM Positive (Pro)',
        'Total Positive (Daily)',
        'Total Positive (Pro)',
        'Deaths (Daily)',
        'Deaths (Pro)'
      ]
    ];

    facilities.forEach(f => {
      wsData.push([
        f.srNo,
        language === 'mr' ? f.nameMr : f.nameEn,
        ...metricColumns.map(col => f.values[col.id] !== undefined ? f.values[col.id] : 0)
      ]);
    });

    // Total Row
    wsData.push([
      'Total',
      '',
      ...metricColumns.map(col => calculateTotal(col.id))
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
              {language === 'mr' ? 'दैनिक व प्रगतीपथावरील सांख्यिकी' : 'Daily & Progressive Consolidation'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            {language === 'mr' ? 'प्राथमिक आरोग्य केंद्रनिहाय एकत्रित अहवाल' : 'PHC & Sub-centre Consolidated Report'}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
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

        {/* Form Title Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {language === 'mr' ? 'अहवाल प्रकार / फॉर्म निवडा:' : 'Select Report / Form:'}
          </label>
          <select
            value={selectedFormId}
            onChange={(e) => {
              const fId = e.target.value;
              setSelectedFormId(fId);
              const found = availableForms.find(f => f.id === fId);
              if (found) {
                setSelectedFormTitle(found.name);
              } else if (fId === 'scrub_typhus') {
                setSelectedFormTitle('स्क्रब टायफस दैनिक अहवाल');
              } else if (fId === 'epidemic') {
                setSelectedFormTitle('साथरोग दैनिक अहवाल');
              } else if (fId === 'vector_borne') {
                setSelectedFormTitle('कीटकजन्य आजार नियंत्रण अहवाल');
              }
            }}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {/* User-created Custom Forms */}
            {availableForms.filter(f => !f.id.startsWith('std_')).length > 0 && (
              <optgroup label={language === 'mr' ? '🌟 तुम्ही तयार केलेले सक्रिय अहवाल' : '🌟 Your Custom Active Forms'}>
                {availableForms.filter(f => !f.id.startsWith('std_')).map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.reporting_period || 'Daily/Monthly'})
                  </option>
                ))}
              </optgroup>
            )}

            {/* Standard / System Forms */}
            <optgroup label={language === 'mr' ? '📋 इतर शासकीय नमुना अहवाल' : '📋 Standard System Reports'}>
              <option value="scrub_typhus">स्क्रब टायफस दैनिक अहवाल (Scrub Typhus Daily)</option>
              <option value="epidemic">साथरोग दैनिक अहवाल (Epidemic Daily Surveillance)</option>
              <option value="vector_borne">कीटकजन्य आजार नियंत्रण अहवाल (Vector Borne Diseases)</option>
              {availableForms.filter(f => f.id.startsWith('std_')).map(f => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </optgroup>
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

        {/* Matrix Grid Table Container */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse border border-slate-300 text-center text-xs">
            {/* Level 1 & 2 & 3 Headers */}
            <thead>
              {/* Row 1 */}
              <tr className="bg-slate-50 text-slate-600 text-[11px] font-bold">
                <th rowSpan={3} className="border border-slate-300 px-2 py-2 w-10 text-center align-middle">
                  Sr<br/>No
                </th>
                <th rowSpan={3} className="border border-slate-300 px-3 py-2 min-w-[180px] text-left align-middle font-bold text-slate-800">
                  Name Of Health Center
                </th>
                <th colSpan={2} className="border border-slate-300 px-2 py-2 bg-slate-50/80">
                  Scrub Typhus<br/><span className="text-[10px] text-slate-400 font-normal">Cases</span>
                </th>
                <th colSpan={8} className="border border-slate-300 px-2 py-2 bg-slate-100/70 text-slate-700">
                  Tests Conducted
                </th>
                <th colSpan={8} className="border border-slate-300 px-2 py-2 bg-slate-50/80 text-slate-700">
                  Positive Cases
                </th>
                <th colSpan={2} className="border border-slate-300 px-2 py-2 bg-slate-100/70">
                  Deaths
                </th>
              </tr>

              {/* Row 2 */}
              <tr className="bg-slate-50/90 text-[10px] text-slate-500 font-semibold">
                {/* Under Tests Conducted */}
                <th colSpan={2} className="border border-slate-300 px-1 py-1.5">
                  RDK<br/>Tests
                </th>
                <th colSpan={2} className="border border-slate-300 px-1 py-1.5">
                  Weil-Felix<br/>Tests
                </th>
                <th colSpan={2} className="border border-slate-300 px-1 py-1.5">
                  ELISA IgM<br/>Tests
                </th>
                <th colSpan={2} className="border border-slate-300 px-1 py-1.5 bg-blue-50/40 text-blue-900 font-bold">
                  Total<br/>Tests
                </th>

                {/* Under Positive Cases */}
                <th colSpan={2} className="border border-slate-300 px-1 py-1.5">
                  RDK<br/>Positive
                </th>
                <th colSpan={2} className="border border-slate-300 px-1 py-1.5">
                  Weil-Felix<br/>Positive
                </th>
                <th colSpan={2} className="border border-slate-300 px-1 py-1.5">
                  ELISA IgM<br/>Positive
                </th>
                <th colSpan={2} className="border border-slate-300 px-1 py-1.5 bg-red-50/40 text-red-900 font-bold">
                  Total<br/>Positive
                </th>
              </tr>

              {/* Row 3 - Leaf Columns */}
              <tr className="bg-slate-100/60 text-[10px] text-slate-500 font-medium">
                {/* Scrub Typhus */}
                <th className="border border-slate-300 px-1 py-1">Daily</th>
                <th className="border border-slate-300 px-1 py-1">Pro</th>

                {/* Tests: RDK, WF, ELISA, Total */}
                <th className="border border-slate-300 px-1 py-1">Daily</th>
                <th className="border border-slate-300 px-1 py-1">Pro</th>
                <th className="border border-slate-300 px-1 py-1">Daily</th>
                <th className="border border-slate-300 px-1 py-1">Pro</th>
                <th className="border border-slate-300 px-1 py-1">Daily</th>
                <th className="border border-slate-300 px-1 py-1">Pro</th>
                <th className="border border-slate-300 px-1 py-1 font-bold text-blue-900">Daily</th>
                <th className="border border-slate-300 px-1 py-1 font-bold text-blue-900">Pro</th>

                {/* Positive: RDK, WF, ELISA, Total */}
                <th className="border border-slate-300 px-1 py-1">Daily</th>
                <th className="border border-slate-300 px-1 py-1">Pro</th>
                <th className="border border-slate-300 px-1 py-1">Daily</th>
                <th className="border border-slate-300 px-1 py-1">Pro</th>
                <th className="border border-slate-300 px-1 py-1">Daily</th>
                <th className="border border-slate-300 px-1 py-1">Pro</th>
                <th className="border border-slate-300 px-1 py-1 font-bold text-red-900">Daily</th>
                <th className="border border-slate-300 px-1 py-1 font-bold text-red-900">Pro</th>

                {/* Deaths */}
                <th className="border border-slate-300 px-1 py-1">Daily</th>
                <th className="border border-slate-300 px-1 py-1">Pro</th>
              </tr>
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
                  {metricColumns.map((col) => (
                    <td key={col.id} className="border border-slate-300 px-1 py-1.5 text-center font-medium text-slate-800">
                      {editMode ? (
                        <input
                          type="number"
                          min="0"
                          value={fac.values[col.id] !== undefined ? fac.values[col.id] : 0}
                          onChange={(e) => handleValueChange(fac.id, col.id, e.target.value)}
                          className="w-10 text-center py-0.5 text-xs border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      ) : (
                        fac.values[col.id] !== undefined ? fac.values[col.id] : 0
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Total Row matching sample */}
              <tr className="bg-slate-50 font-bold border-t-2 border-b-2 border-slate-400">
                <td colSpan={2} className="border border-slate-300 px-4 py-2.5 text-center font-extrabold text-sm text-slate-900">
                  {language === 'mr' ? 'Total (एकूण)' : 'Total'}
                </td>
                {metricColumns.map((col) => (
                  <td key={col.id} className="border border-slate-300 px-1 py-2 text-center font-extrabold text-slate-950">
                    {calculateTotal(col.id)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

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
                    <tr className="bg-slate-100 font-bold text-slate-900 border-b border-slate-900">
                      <th rowSpan={3} className="border border-slate-900 px-2 py-1.5 w-8">Sr No</th>
                      <th rowSpan={3} className="border border-slate-900 px-3 py-1.5 min-w-[150px] text-left">Name Of Health Center</th>
                      <th colSpan={2} className="border border-slate-900 px-2 py-1">Scrub Typhus Cases</th>
                      <th colSpan={8} className="border border-slate-900 px-2 py-1">Tests Conducted</th>
                      <th colSpan={8} className="border border-slate-900 px-2 py-1">Positive Cases</th>
                      <th colSpan={2} className="border border-slate-900 px-2 py-1">Deaths</th>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-[9px] text-slate-800 border-b border-slate-900">
                      <th colSpan={2} className="border border-slate-900 px-1 py-1">RDK Tests</th>
                      <th colSpan={2} className="border border-slate-900 px-1 py-1">Weil-Felix Tests</th>
                      <th colSpan={2} className="border border-slate-900 px-1 py-1">ELISA IgM Tests</th>
                      <th colSpan={2} className="border border-slate-900 px-1 py-1 font-bold">Total Tests</th>
                      <th colSpan={2} className="border border-slate-900 px-1 py-1">RDK Positive</th>
                      <th colSpan={2} className="border border-slate-900 px-1 py-1">Weil-Felix Positive</th>
                      <th colSpan={2} className="border border-slate-900 px-1 py-1">ELISA IgM Positive</th>
                      <th colSpan={2} className="border border-slate-900 px-1 py-1 font-bold">Total Positive</th>
                    </tr>
                    <tr className="bg-slate-50 font-medium text-[8.5px] text-slate-700 border-b border-slate-900">
                      <th className="border border-slate-900 px-1 py-0.5">Daily</th>
                      <th className="border border-slate-900 px-1 py-0.5">Pro</th>
                      <th className="border border-slate-900 px-1 py-0.5">Daily</th>
                      <th className="border border-slate-900 px-1 py-0.5">Pro</th>
                      <th className="border border-slate-900 px-1 py-0.5">Daily</th>
                      <th className="border border-slate-900 px-1 py-0.5">Pro</th>
                      <th className="border border-slate-900 px-1 py-0.5">Daily</th>
                      <th className="border border-slate-900 px-1 py-0.5">Pro</th>
                      <th className="border border-slate-900 px-1 py-0.5 font-bold">Daily</th>
                      <th className="border border-slate-900 px-1 py-0.5 font-bold">Pro</th>
                      <th className="border border-slate-900 px-1 py-0.5">Daily</th>
                      <th className="border border-slate-900 px-1 py-0.5">Pro</th>
                      <th className="border border-slate-900 px-1 py-0.5">Daily</th>
                      <th className="border border-slate-900 px-1 py-0.5">Pro</th>
                      <th className="border border-slate-900 px-1 py-0.5">Daily</th>
                      <th className="border border-slate-900 px-1 py-0.5">Pro</th>
                      <th className="border border-slate-900 px-1 py-0.5 font-bold">Daily</th>
                      <th className="border border-slate-900 px-1 py-0.5 font-bold">Pro</th>
                      <th className="border border-slate-900 px-1 py-0.5">Daily</th>
                      <th className="border border-slate-900 px-1 py-0.5">Pro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facilities.map((fac) => (
                      <tr key={fac.id} className="hover:bg-slate-50 print-row">
                        <td className="border border-slate-900 px-1 py-1 text-center font-medium">{fac.srNo}</td>
                        <td className={`border border-slate-900 px-2 py-1 text-left font-bold ${fac.isPhcHq ? 'text-blue-900 bg-blue-50/20' : 'text-slate-800'}`}>
                          {language === 'mr' ? fac.nameMr : fac.nameEn}
                        </td>
                        {metricColumns.map((col) => (
                          <td key={col.id} className="border border-slate-900 px-1 py-1 text-center font-medium">
                            {fac.values[col.id] !== undefined ? fac.values[col.id] : 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold border-t-2 border-b-2 border-slate-900">
                      <td colSpan={2} className="border border-slate-900 px-2 py-1.5 text-center font-extrabold text-slate-900">Total</td>
                      {metricColumns.map((col) => (
                        <td key={col.id} className="border border-slate-900 px-1 py-1.5 text-center font-extrabold text-slate-950">
                          {calculateTotal(col.id)}
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

