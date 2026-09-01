import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PreparedReportData, StructuredReportRow } from './reportDataHelper';

export interface PDFExportOptions {
  filename?: string;
  title?: string;
  reportCode?: string;
  district?: string;
  taluka?: string;
  phc?: string;
  subcentre?: string;
  village?: string;
  period?: string;
  generatedBy?: string;
  employeeType?: string;
  status?: string;
  submittedAt?: string;
  orientation?: 'portrait' | 'landscape';
  language?: 'mr' | 'en' | 'bilingual';
}

/**
 * Enhanced PDF Exporter supporting A4 Paper in Portrait and Landscape orientations,
 * with structured hierarchical display of Field Headings and Subfields.
 */
export const exportStructuredReportToPDF = (
  reportData: PreparedReportData,
  options: PDFExportOptions = {}
) => {
  const orientation = options.orientation || 'portrait';
  const lang = options.language || 'mr';

  // Initialize jsPDF with explicit A4 paper and orientation
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  const title = options.title || reportData.formName || 'Health Report';
  const filename = options.filename || `${reportData.formName.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_')}_${orientation}_A4`;
  const period = options.period || `${reportData.periodStart} to ${reportData.periodEnd}`;
  const status = options.status || reportData.status || 'Submitted';

  // 1. Top Decorative Brand Strip
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 4.5, 'F');

  // Accent Sub-strip
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 4.5, pageWidth, 1.5, 'F');

  // 2. Official Header
  let currentY = 12;

  // Header Subtitle / Dept name
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'bold');
  doc.text('PUBLIC HEALTH DEPARTMENT • DISTRICT HEALTH ADMINISTRATION', margin, currentY);

  // Orientation Badge on the Right
  const orientationBadgeText = `A4 ${orientation.toUpperCase()}`;
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(pageWidth - margin - 26, currentY - 4, 26, 6, 1, 1, 'FD');
  doc.text(orientationBadgeText, pageWidth - margin - 23, currentY);

  currentY += 7;

  // Main Report Title
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFont('helvetica', 'bold');
  const splitTitle = doc.splitTextToSize(title, contentWidth - 30);
  doc.text(splitTitle, margin, currentY);
  currentY += (splitTitle.length * 6) + 1;

  // 3. Metadata Summary Card / Grid
  const metaBoxY = currentY;
  const metaBoxHeight = orientation === 'landscape' ? 22 : 26;

  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(margin, metaBoxY, contentWidth, metaBoxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85); // Slate-700

  if (orientation === 'landscape') {
    // 4-column layout for Landscape
    const colWidth = contentWidth / 4;
    
    // Row 1
    doc.text(`District: ${options.district || reportData.district || 'Latur'}`, margin + 4, metaBoxY + 6);
    doc.text(`Taluka: ${options.taluka || reportData.taluka || 'Latur'}`, margin + 4 + colWidth, metaBoxY + 6);
    doc.text(`PHC: ${options.phc || reportData.phc || 'PHC'}`, margin + 4 + (colWidth * 2), metaBoxY + 6);
    doc.text(`Sub-Centre: ${options.subcentre || reportData.subcentre || 'Sub-centre'}`, margin + 4 + (colWidth * 3), metaBoxY + 6);

    // Row 2
    doc.text(`Village: ${options.village || reportData.village || 'All Villages'}`, margin + 4, metaBoxY + 13);
    doc.text(`Period: ${period}`, margin + 4 + colWidth, metaBoxY + 13);
    doc.text(`Submitted By: ${reportData.submittedBy} (${reportData.employeeType})`, margin + 4 + (colWidth * 2), metaBoxY + 13);
    
    // Status text with badge style
    doc.text(`Status: ${status} | Date: ${reportData.submittedAt || 'Recent'}`, margin + 4 + (colWidth * 3), metaBoxY + 13);

    // Row 3 (Guidance info)
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`* Hierarchical subfields are grouped under their respective Main Field Headings below.`, margin + 4, metaBoxY + 19);

  } else {
    // 2-column layout for Portrait
    const colWidth = contentWidth / 2;

    // Row 1
    doc.text(`District: ${options.district || reportData.district || 'Latur'}`, margin + 4, metaBoxY + 6);
    doc.text(`PHC: ${options.phc || reportData.phc || 'PHC'}`, margin + 4 + colWidth, metaBoxY + 6);

    // Row 2
    doc.text(`Sub-Centre: ${options.subcentre || reportData.subcentre || 'Sub-centre'}`, margin + 4, metaBoxY + 12);
    doc.text(`Village: ${options.village || reportData.village || 'All Villages'}`, margin + 4 + colWidth, metaBoxY + 12);

    // Row 3
    doc.text(`Period: ${period}`, margin + 4, metaBoxY + 18);
    doc.text(`Staff: ${reportData.submittedBy} (${reportData.employeeType})`, margin + 4 + colWidth, metaBoxY + 18);

    // Row 4
    doc.text(`Status: ${status}`, margin + 4, metaBoxY + 23);
    doc.text(`Submission Date: ${reportData.submittedAt || 'Draft'}`, margin + 4 + colWidth, metaBoxY + 23);
  }

  currentY = metaBoxY + metaBoxHeight + 5;

  // 4. AutoTable Generation with Subfield Hierarchy & Field Headings
  let tableHeaders: string[] = [];
  let tableBody: any[][] = [];
  let columnStyles: any = {};

  if (orientation === 'landscape') {
    // 6 Columns for Landscape
    tableHeaders = [
      'Sr. No.',
      'Main Field Heading / Category',
      'Indicator / Subfield Name',
      'Field Type',
      'Reported Value',
      'Status'
    ];

    columnStyles = {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 60, fontStyle: 'bold' },
      2: { cellWidth: 95 },
      3: { cellWidth: 32, halign: 'center' },
      4: { cellWidth: 42, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 24, halign: 'center' }
    };

    tableBody = reportData.rows.map((r: StructuredReportRow) => {
      const isHeader = r.isHeader;
      const indicatorText = isHeader
        ? `📂 [Group Header] ${r.displayLabel}`
        : r.displayLabel;

      return [
        r.srNo,
        r.mainCategory || '-',
        indicatorText,
        r.fieldType,
        isHeader ? '-' : r.value,
        r.status
      ];
    });

  } else {
    // 4 Columns for Portrait (A4 Standard)
    tableHeaders = [
      'Sr.',
      'Health Metric / Subfield Indicator',
      'Reported Value',
      'Status'
    ];

    columnStyles = {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 104 },
      2: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 24, halign: 'center' }
    };

    tableBody = reportData.rows.map((r: StructuredReportRow) => {
      const isHeader = r.isHeader;
      const indicatorText = isHeader
        ? `📂 [GROUP] ${r.displayLabel}`
        : r.displayLabel;

      return [
        r.srNo,
        indicatorText,
        isHeader ? '[Category]' : r.value,
        r.status
      ];
    });
  }

  // Draw AutoTable
  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 3.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [226, 232, 240], // Slate-200
      lineWidth: 0.2,
      textColor: [30, 41, 59]
    },
    columnStyles,
    didParseCell: (data) => {
      // Highlight Group Header Rows
      const rowIndex = data.row.index;
      const rowData = reportData.rows[rowIndex];

      if (rowData && rowData.isHeader) {
        data.cell.styles.fillColor = [241, 245, 249]; // Slate-100 highlight
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 23, 42]; // Slate-900
      } else if (rowData && rowData.depth > 0) {
        // Subfield styling
        if (data.column.index === (orientation === 'landscape' ? 2 : 1)) {
          data.cell.styles.textColor = [51, 65, 85];
        }
      }
    },
    margin: { left: margin, right: margin, bottom: 25 }
  });

  // 5. Signatures & Page Footers
  const pageCount = (doc as any).internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Bottom Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    // Left Footer: System info
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated via ZP Health Portal on ${new Date().toLocaleString()} | Official A4 ${orientation.toUpperCase()} Document`,
      margin,
      pageHeight - 9
    );

    // Right Footer: Page counter
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin - 18,
      pageHeight - 9
    );

    // On the final page, add official signature boxes if space permits
    if (i === pageCount) {
      const finalY = (doc as any).lastAutoTable?.finalY || currentY;
      if (finalY < pageHeight - 40) {
        const sigY = pageHeight - 24;
        
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        
        // Health Worker Sign
        doc.text('________________________________________', margin + 5, sigY);
        doc.text(`Submitted By: ${reportData.submittedBy}`, margin + 5, sigY + 4);
        doc.text(`(${reportData.employeeType})`, margin + 5, sigY + 8);

        // Medical Officer Sign
        const rightSigX = pageWidth - margin - 75;
        doc.text('________________________________________', rightSigX, sigY);
        doc.text('Verified By: Medical Officer / Controller', rightSigX, sigY + 4);
        doc.text('Primary Health Centre / District Office', rightSigX, sigY + 8);
      }
    }
  }

  // Trigger download
  doc.save(`${filename}.pdf`);
};

/**
 * Standard legacy exportToPDF compatible wrapper with orientation support
 */
export const exportToPDF = (
  headers: string[],
  data: any[][],
  options: PDFExportOptions & { [key: string]: any }
) => {
  const orientation = options.orientation || 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const {
    filename = 'report',
    title = 'Health Report',
    district = 'Latur District',
    taluka = 'All',
    phc = 'All',
    subcentre = 'All',
    period = new Date().toLocaleDateString(),
    generatedBy = 'Health Staff'
  } = options;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header styling
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 4, 'F');

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 16);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`District: ${district} | Taluka: ${taluka} | PHC: ${phc} | Sub-Centre: ${subcentre}`, margin, 22);
  doc.text(`Reporting Period: ${period} | Orientation: A4 ${orientation.toUpperCase()}`, margin, 27);

  autoTable(doc, {
    startY: 32,
    head: [headers],
    body: data,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 8,
      cellPadding: 3.5,
      textColor: [30, 41, 59]
    },
    margin: { left: margin, right: margin, bottom: 20 }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text(`Generated on: ${new Date().toLocaleString()} | By: ${generatedBy}`, margin, pageHeight - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 8);
  }

  doc.save(`${filename}.pdf`);
};
