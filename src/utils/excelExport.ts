import * as XLSX from 'xlsx';

export interface ReportExportOptions {
  filename: string;
  districtName?: string;
  talukaName?: string;
  reportName?: string;
  period?: string;
}

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
  
  // Style headers - simple approach for basic xlsx
  // Make the title row larger (Note: pure xlsx doesn't support deep styling without Pro version, 
  // but we can adjust column widths)
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
