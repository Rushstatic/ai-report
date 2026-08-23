import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFExportOptions {
  filename: string;
  title: string;
  district?: string;
  taluka?: string;
  phc?: string;
  subcentre?: string;
  period?: string;
  generatedBy?: string;
}

export const exportToPDF = (headers: string[], data: any[][], options: PDFExportOptions) => {
  const doc = new jsPDF();
  
  const {
    filename = 'report',
    title = 'Health Report',
    district = 'Latur',
    taluka = 'All',
    phc = 'All',
    subcentre = 'All',
    period = new Date().toLocaleDateString(),
    generatedBy = 'System User'
  } = options;

  // Add Header text
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`District: ${district} | Taluka: ${taluka} | PHC: ${phc} | Sub-Centre: ${subcentre}`, 14, 28);
  doc.text(`Reporting Period: ${period}`, 14, 34);
  
  // AutoTable
  autoTable(doc, {
    startY: 40,
    head: [headers],
    body: data,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] }, // Slate-900 to match Sleek theme
    styles: { fontSize: 9, cellPadding: 4 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated on: ${new Date().toLocaleString()} | By: ${generatedBy}`, 14, doc.internal.pageSize.height - 10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
  }

  doc.save(`${filename}.pdf`);
};
