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

  // 2. Official Header Box (Enclosed Format Matching Government Guidelines)
  let currentY = 12;

  const boxX = margin;
  const boxWidth = contentWidth;
  const rowHeight = 6.5;
  const totalBoxHeight = rowHeight * 5;

  // Outer Border Box
  doc.setDrawColor(15, 23, 42); // Slate-900
  doc.setLineWidth(0.4);
  doc.rect(boxX, currentY, boxWidth, totalBoxHeight, 'S');

  // Horizontal Grid Lines inside Header Box
  doc.setLineWidth(0.2);
  doc.line(boxX, currentY + rowHeight, boxX + boxWidth, currentY + rowHeight);
  doc.line(boxX, currentY + (rowHeight * 2), boxX + boxWidth, currentY + (rowHeight * 2));
  doc.line(boxX, currentY + (rowHeight * 3), boxX + boxWidth, currentY + (rowHeight * 3));
  doc.line(boxX, currentY + (rowHeight * 4), boxX + boxWidth, currentY + (rowHeight * 4));

  // Row 1: Header Banner (Top title)
  doc.setFillColor(241, 245, 249);
  doc.rect(boxX + 0.2, currentY + 0.2, boxWidth - 0.4, rowHeight - 0.4, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('PUBLIC HEALTH DEPARTMENT - GOVERNMENT OF MAHARASHTRA', pageWidth / 2, currentY + 4.5, { align: 'center' });

  // Row 2: Report Title
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Report Title: ${title}`, pageWidth / 2, currentY + rowHeight + 4.5, { align: 'center' });

  // Row 3: Reporting Period
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Reporting Period: ${period}`, pageWidth / 2, currentY + (rowHeight * 2) + 4.5, { align: 'center' });

  // Row 4: District / Taluka / PHC (3 Columns)
  const col1W = boxWidth / 3;
  doc.line(boxX + col1W, currentY + (rowHeight * 3), boxX + col1W, currentY + (rowHeight * 4));
  doc.line(boxX + (col1W * 2), currentY + (rowHeight * 3), boxX + (col1W * 2), currentY + (rowHeight * 4));

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`District: `, boxX + 3, currentY + (rowHeight * 3) + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${options.district || reportData.district || 'Latur'}`, boxX + 16, currentY + (rowHeight * 3) + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`Taluka: `, boxX + col1W + 3, currentY + (rowHeight * 3) + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${options.taluka || reportData.taluka || 'Latur'}`, boxX + col1W + 15, currentY + (rowHeight * 3) + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`PHC: `, boxX + (col1W * 2) + 3, currentY + (rowHeight * 3) + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${options.phc || reportData.phc || 'PHC'}`, boxX + (col1W * 2) + 12, currentY + (rowHeight * 3) + 4.5);

  // Row 5: Sub-Centre / Village / Submitted By (3 Columns)
  doc.line(boxX + col1W, currentY + (rowHeight * 4), boxX + col1W, currentY + (rowHeight * 5));
  doc.line(boxX + (col1W * 2), currentY + (rowHeight * 4), boxX + (col1W * 2), currentY + (rowHeight * 5));

  doc.setFont('helvetica', 'bold');
  doc.text(`Sub-Centre: `, boxX + 3, currentY + (rowHeight * 4) + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${options.subcentre || reportData.subcentre || 'Sub-centre'}`, boxX + 20, currentY + (rowHeight * 4) + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`Village: `, boxX + col1W + 3, currentY + (rowHeight * 4) + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${options.village || reportData.village || 'All Villages'}`, boxX + col1W + 15, currentY + (rowHeight * 4) + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`Submitted By: `, boxX + (col1W * 2) + 3, currentY + (rowHeight * 4) + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${reportData.submittedBy} (${reportData.employeeType})`, boxX + (col1W * 2) + 23, currentY + (rowHeight * 4) + 4.5);

  currentY += totalBoxHeight + 5;

  // 4. AutoTable Generation (Hierarchical Matrix Header OR Standard List)
  if (reportData.matrixTable && reportData.matrixTable.headerTiers.length > 0) {
    // Multi-tier Matrix Header Table (e.g. Home Visits, Fever Cases, etc.)
    const matrixHead = reportData.matrixTable.headerTiers.map((tier) =>
      tier.cells.map((cell) => ({
        content: lang === 'mr' ? cell.labelMr : lang === 'en' ? cell.labelEn : cell.label,
        colSpan: cell.colSpan,
        rowSpan: cell.rowSpan,
        styles: {
          halign: 'center' as const,
          valign: 'middle' as const,
          fontStyle: 'bold' as const,
          fillColor: [241, 245, 249] as [number, number, number],
          textColor: [15, 23, 42] as [number, number, number],
          lineWidth: 0.2,
          lineColor: [15, 23, 42] as [number, number, number]
        }
      }))
    );

    const matrixBody = reportData.matrixTable.rows.map((row) => [
      row.srNo,
      ...reportData.matrixTable!.leafColumns.map((col) =>
        row.values[col.id] !== undefined && row.values[col.id] !== '' ? String(row.values[col.id]) : '-'
      )
    ]);

    autoTable(doc, {
      startY: currentY,
      head: matrixHead,
      body: matrixBody,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        lineColor: [15, 23, 42], // Slate-900 border
        lineWidth: 0.2,
        textColor: [15, 23, 42],
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42]
      },
      margin: { left: margin, right: margin, bottom: 25 }
    });
  } else {
    // Standard Structured Table
    let tableHeaders: string[] = [];
    let tableBody: any[][] = [];
    let columnStyles: any = {};

    if (orientation === 'landscape') {
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

    autoTable(doc, {
      startY: currentY,
      head: [tableHeaders],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3.5
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        textColor: [30, 41, 59]
      },
      columnStyles,
      didParseCell: (data) => {
        const rowIndex = data.row.index;
        const rowData = reportData.rows[rowIndex];

        if (rowData && rowData.isHeader) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42];
        }
      },
      margin: { left: margin, right: margin, bottom: 25 }
    });
  }

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
