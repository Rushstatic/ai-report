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
 * Export Structured Report with Subfields and Parent Headings to Excel (.xlsx)
 */
export const exportStructuredReportToExcel = (
  reportData: PreparedReportData,
  options?: Partial<ReportExportOptions>
) => {
  const filename = options?.filename || `${reportData.formName.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_')}_Report`;
  const wb = XLSX.utils.book_new();

  // 1. Header Metadata Section
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

  // 2. Data Rows with Parent Headings and Indentation
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

  XLSX.utils.book_append_sheet(wb, ws, "Report Data");
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
