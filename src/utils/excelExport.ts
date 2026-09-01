import * as XLSX from 'xlsx';
import { PreparedReportData, StructuredReportRow } from './reportDataHelper';

export interface ReportExportOptions {
  filename: string;
  districtName?: string;
  talukaName?: string;
  phcName?: string;
  subcentreName?: string;
  reportName?: string;
  period?: string;
  submittedBy?: string;
}

/**
 * Export Structured Report with Subfields, Parent Headings and Multi-tier Matrix Grid to Excel (.xlsx)
 */
export const exportStructuredReportToExcel = (
  reportData: PreparedReportData,
  options?: Partial<ReportExportOptions>
) => {
  const filename = options?.filename || `${reportData.formName.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_')}_Report`;
  const wb = XLSX.utils.book_new();

  // 1. If Matrix Table is available, create Matrix Grid Sheet
  if (reportData.matrixTable && reportData.matrixTable.headerTiers.length > 0) {
    const matrixWsData: any[][] = [
      ['PUBLIC HEALTH DEPARTMENT - GOVERNMENT OF MAHARASHTRA'],
      [`Report Title: ${reportData.formName}`],
      [`Reporting Period: ${reportData.periodStart} to ${reportData.periodEnd}`],
      [`District: ${reportData.district}`, `Taluka: ${reportData.taluka}`, `PHC: ${reportData.phc}`],
      [`Sub-Centre: ${reportData.subcentre}`, `Village: ${reportData.village}`, `Submitted By: ${reportData.submittedBy} (${reportData.employeeType})`],
      [`Status: ${reportData.status}`, `Submitted On: ${reportData.submittedAt || 'Draft'}`],
      [] // Blank row
    ];

    // Build header rows from headerTiers
    reportData.matrixTable.headerTiers.forEach((tier) => {
      const headerRow: any[] = [];
      tier.cells.forEach((cell) => {
        headerRow.push(cell.label);
        // Fill empty placeholder slots for colSpan > 1
        for (let i = 1; i < cell.colSpan; i++) {
          headerRow.push('');
        }
      });
      matrixWsData.push(headerRow);
    });

    // Add data rows
    reportData.matrixTable.rows.forEach((row) => {
      const rowValues = [
        row.srNo,
        ...reportData.matrixTable!.leafColumns.map((col) =>
          row.values[col.id] !== undefined && row.values[col.id] !== '' ? row.values[col.id] : '-'
        )
      ];
      matrixWsData.push(rowValues);
    });

    const matrixWs = XLSX.utils.aoa_to_sheet(matrixWsData);
    XLSX.utils.book_append_sheet(wb, matrixWs, "Matrix Report");
  }

  // 2. Standard Detailed Breakdown Sheet
  const wsData: any[][] = [
    ['PUBLIC HEALTH DEPARTMENT - GOVERNMENT OF MAHARASHTRA'],
    [`Report Title: ${reportData.formName}`],
    [`Reporting Period: ${reportData.periodStart} to ${reportData.periodEnd}`],
    [`District: ${reportData.district}`, `Taluka: ${reportData.taluka}`, `PHC: ${reportData.phc}`],
    [`Sub-Centre: ${reportData.subcentre}`, `Village: ${reportData.village}`, `Submitted By: ${reportData.submittedBy} (${reportData.employeeType})`],
    [`Status: ${reportData.status}`, `Submitted On: ${reportData.submittedAt || 'Draft'}`],
    [], // Blank spacing row
    // Table Headers
    [
      'Sr. No.',
      'Main Field Heading (Group / Category)',
      'Subfield / Indicator Name',
      'Hierarchy Path',
      'Field Type',
      'Reported Value',
      'Status'
    ]
  ];

  // Data Rows with Parent Headings and Indentation
  reportData.rows.forEach((r: StructuredReportRow) => {
    wsData.push([
      r.srNo,
      r.mainCategory || '-',
      r.isHeader ? `[GROUP HEADER] ${r.displayLabel}` : r.displayLabel,
      r.path || '-',
      r.fieldType,
      r.isHeader ? '-' : r.value,
      r.status
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for clean readability
  ws['!cols'] = [
    { wch: 10 }, // Sr. No.
    { wch: 32 }, // Main Heading
    { wch: 40 }, // Indicator / Subfield
    { wch: 45 }, // Hierarchy Path
    { wch: 20 }, // Field Type
    { wch: 20 }, // Value
    { wch: 15 }  // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Detailed Breakdown");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToExcel = (data: any[], options: ReportExportOptions) => {
  const { 
    filename = 'Report', 
    districtName = 'District Health System', 
    talukaName = 'All Talukas', 
    reportName = 'General Report', 
    period = new Date().toLocaleDateString()
  } = options;

  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Create custom header rows for the spreadsheet
  const wsData = [
    [districtName],
    [`Taluka: ${talukaName}`],
    [`Report: ${reportName}`],
    [`Period/Date: ${period}`],
    [], // Empty row for spacing
  ];

  // If there's data, extract headers and rows
  if (data && data.length > 0) {
    const headers = Object.keys(data[0]);
    wsData.push(headers);
    
    data.forEach(item => {
      // Map object values matching headers order
      wsData.push(headers.map(key => item[key]));
    });
  } else {
    wsData.push(["No data available"]);
  }

  // Create worksheet from array of arrays
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  const colWidths = [];
  if (data && data.length > 0) {
    const headers = Object.keys(data[0]);
    for (let i = 0; i < headers.length; i++) {
      colWidths.push({ wch: Math.max(headers[i].length + 5, 15) });
    }
    ws['!cols'] = colWidths;
  }

  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Report Data");
  
  // Trigger download
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
