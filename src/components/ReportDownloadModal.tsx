import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Printer, 
  X, 
  Loader2, 
  Layers, 
  Check, 
  Building2, 
  MapPin, 
  Calendar, 
  UserCheck,
  Sparkles,
  Info
} from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { prepareReportData, PreparedReportData, StructuredReportRow } from '@/utils/reportDataHelper';
import { exportStructuredReportToPDF } from '@/utils/pdfExport';
import { exportStructuredReportToExcel } from '@/utils/excelExport';
import PrintPreviewModal from '@/components/PrintPreviewModal';

interface ReportDownloadModalProps {
  report: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportDownloadModal({
  report,
  isOpen,
  onClose
}: ReportDownloadModalProps) {
  const { language } = useLanguageStore();

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [downloadLang, setDownloadLang] = useState<'mr' | 'en' | 'bilingual'>('bilingual');
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [reportData, setReportData] = useState<PreparedReportData | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [showFullPrintPreview, setShowFullPrintPreview] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && report) {
      setLoadingData(true);
      setDownloadSuccess(null);
      prepareReportData(report, language === 'mr' ? 'mr' : 'en')
        .then((data) => {
          setReportData(data);
          // If report has many subfields or deep hierarchy, default to Landscape for better clarity
          if (data.hasSubfields && data.rows.some(r => r.depth > 0)) {
            // keep user choice if set, otherwise portrait
          }
        })
        .catch((err) => {
          console.error('Error preparing report data:', err);
        })
        .finally(() => {
          setLoadingData(false);
        });
    }
  }, [isOpen, report, language]);

  if (!isOpen || !report) return null;

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    setDownloading(true);
    try {
      exportStructuredReportToPDF(reportData, {
        orientation,
        language: downloadLang,
        title: reportData.formName,
        district: reportData.district,
        taluka: reportData.taluka,
        phc: reportData.phc,
        subcentre: reportData.subcentre,
        village: reportData.village,
        period: `${reportData.periodStart} to ${reportData.periodEnd}`,
        status: reportData.status
      });
      setDownloadSuccess(
        language === 'mr' 
          ? `अहवाल PDF (A4 ${orientation === 'portrait' ? 'उभा' : 'आडवा'}) डाऊनलोड झाला!` 
          : `PDF downloaded in A4 ${orientation.toUpperCase()} format!`
      );
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (error) {
      console.error('PDF export error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!reportData) return;
    try {
      exportStructuredReportToExcel(reportData, {
        reportName: reportData.formName,
        districtName: reportData.district,
        talukaName: reportData.taluka,
        phcName: reportData.phc,
        subcentreName: reportData.subcentre
      });
      setDownloadSuccess(
        language === 'mr' ? 'Excel फाइल डाऊनलोड झाली!' : 'Excel file downloaded successfully!'
      );
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (error) {
      console.error('Excel export error:', error);
    }
  };

  const handlePrint = () => {
    if (!reportData) return;
    
    // Create dedicated printable A4 window with native Devanagari styling
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const isLandscape = orientation === 'landscape';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportData.formName} - A4 Print</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif;
          }
          body {
            margin: 0;
            padding: 10px;
            color: #0f172a;
            background: #ffffff;
            font-size: 11px;
          }
          .header-banner {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .dept-title {
            font-size: 10px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .main-title {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            margin: 4px 0;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 14px;
            font-size: 10px;
          }
          .meta-item strong {
            color: #334155;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 10px;
          }
          th {
            background-color: #0f172a;
            color: #ffffff;
            font-weight: 700;
            padding: 6px 8px;
            border: 1px solid #0f172a;
            text-align: left;
          }
          td {
            padding: 5px 8px;
            border: 1px solid #cbd5e1;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          .group-header-row td {
            background-color: #e2e8f0 !important;
            font-weight: 700;
            color: #0f172a;
            font-size: 10.5px;
          }
          .subfield-indented {
            padding-left: 18px !important;
            color: #334155;
          }
          .footer-section {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
            font-size: 9px;
            color: #64748b;
          }
          .sig-box {
            text-align: center;
            width: 200px;
          }
          .sig-line {
            border-top: 1px solid #94a3b8;
            margin-top: 30px;
            padding-top: 4px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="dept-title">सार्वजनिक आरोग्य विभाग • Public Health Department</div>
            <div style="font-size: 9px; font-weight: bold; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">
              A4 ${orientation.toUpperCase()}
            </div>
          </div>
          <div class="main-title">${reportData.formName}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><strong>जिल्हा / District:</strong> ${reportData.district}</div>
          <div class="meta-item"><strong>प्रा.आ.के. / PHC:</strong> ${reportData.phc}</div>
          <div class="meta-item"><strong>उपकेंद्र / Sub-Centre:</strong> ${reportData.subcentre}</div>
          <div class="meta-item"><strong>गाव / Village:</strong> ${reportData.village}</div>
          <div class="meta-item"><strong>कालावधी / Period:</strong> ${reportData.periodStart} to ${reportData.periodEnd}</div>
          <div class="meta-item"><strong>सादरकर्ता / Staff:</strong> ${reportData.submittedBy} (${reportData.employeeType})</div>
          <div class="meta-item"><strong>स्थिती / Status:</strong> ${reportData.status}</div>
          <div class="meta-item"><strong>दिनांक / Date:</strong> ${reportData.submittedAt || '-'}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">अ.क्र.</th>
              ${isLandscape ? '<th style="width: 25%;">मुख्य गट / Main Heading</th>' : ''}
              <th>आरोग्य निर्देशक / बाब (Health Metric / Parameter)</th>
              ${isLandscape ? '<th style="width: 15%; text-align: center;">प्रकार</th>' : ''}
              <th style="width: 18%; text-align: center;">नोंदवलेली माहिती (Value)</th>
              <th style="width: 12%; text-align: center;">स्थिती</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.rows.map((r) => {
              if (r.isHeader) {
                return `
                  <tr class="group-header-row">
                    <td style="text-align: center;">${r.srNo}</td>
                    ${isLandscape ? `<td><strong>${r.mainCategory}</strong></td>` : ''}
                    <td><strong>📁 [गट / Group Heading] ${r.displayLabel}</strong></td>
                    ${isLandscape ? '<td style="text-align: center;">गट शीर्षक</td>' : ''}
                    <td style="text-align: center; color: #64748b;">-</td>
                    <td style="text-align: center;">-</td>
                  </tr>
                `;
              }
              return `
                <tr>
                  <td style="text-align: center;">${r.srNo}</td>
                  ${isLandscape ? `<td>${r.mainCategory || '-'}</td>` : ''}
                  <td class="${r.depth > 0 ? 'subfield-indented' : ''}">${r.displayLabel}</td>
                  ${isLandscape ? `<td style="text-align: center;">${r.fieldType}</td>` : ''}
                  <td style="text-align: center; font-weight: bold;">${r.value}</td>
                  <td style="text-align: center;">${r.status}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer-section">
          <div>Generated via ZP Health Management Portal • A4 ${orientation.toUpperCase()}</div>
          <div style="display: flex; gap: 40px;">
            <div class="sig-box">
              <div class="sig-line">कर्मचारी स्वाक्षरी (Staff)</div>
            </div>
            <div class="sig-box">
              <div class="sig-line">वैद्यकीय अधिकारी स्वाक्षरी (MO)</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {language === 'mr' ? 'अहवाल डाऊनलोड आणि प्रिंट पर्याय' : 'Report Download & Print Options'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {reportData?.formName || 'A4 Paper Format & Orientation'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {loadingData ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-sm font-medium">
                {language === 'mr' ? 'अहवाल रचना आणि उप-प्रश्न तपासत आहे...' : 'Loading report fields and hierarchy structure...'}
              </p>
            </div>
          ) : reportData ? (
            <>
              {/* Success alert */}
              {downloadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {downloadSuccess}
                </div>
              )}

              {/* Step 1: Orientation & Paper Size (A4) Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                  {language === 'mr' ? '१. A4 कागदाची रचना (Orientation)' : '1. Select A4 Paper Orientation'}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Portrait Option */}
                  <div
                    onClick={() => setOrientation('portrait')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                      orientation === 'portrait'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-8 h-11 rounded border flex flex-col justify-between p-1 flex-shrink-0 ${
                      orientation === 'portrait' ? 'border-blue-600 bg-blue-100' : 'border-slate-300 bg-slate-100'
                    }`}>
                      <div className="w-full h-1 bg-current opacity-40 rounded"></div>
                      <div className="space-y-0.5">
                        <div className="w-full h-0.5 bg-current opacity-30"></div>
                        <div className="w-2/3 h-0.5 bg-current opacity-30"></div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800">
                          {language === 'mr' ? '📄 उभा (Portrait - A4)' : '📄 Portrait (A4)'}
                        </h4>
                        {orientation === 'portrait' && (
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {language === 'mr' 
                          ? 'मानक उभी रचना (210 × 297 mm) - नेहमीच्या अधिकृत अहवालांसाठी उत्तम.' 
                          : 'Standard vertical layout (210 × 297 mm) for official documentation.'}
                      </p>
                    </div>
                  </div>

                  {/* Landscape Option */}
                  <div
                    onClick={() => setOrientation('landscape')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                      orientation === 'landscape'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-11 h-8 rounded border flex flex-col justify-between p-1 flex-shrink-0 ${
                      orientation === 'landscape' ? 'border-blue-600 bg-blue-100' : 'border-slate-300 bg-slate-100'
                    }`}>
                      <div className="w-full h-1 bg-current opacity-40 rounded"></div>
                      <div className="flex justify-between gap-1">
                        <div className="w-1/3 h-0.5 bg-current opacity-30"></div>
                        <div className="w-1/2 h-0.5 bg-current opacity-30"></div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800">
                          {language === 'mr' ? '📑 आडवा (Landscape - A4)' : '📑 Landscape (A4)'}
                        </h4>
                        {orientation === 'landscape' && (
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {language === 'mr' 
                          ? 'आडवी रचना (297 × 210 mm) - मुख्य गट शीर्षक व उप-प्रश्नांच्या विस्तृत तक्त्यासाठी उत्तम.' 
                          : 'Wide horizontal format (297 × 210 mm) - ideal for multi-column & category headers.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subfields and Field Heading Notice Banner */}
              {reportData.hasSubfields && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-3">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg flex-shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-blue-900">
                      {language === 'mr' ? 'उप-प्रश्न आणि मुख्य गट शीर्षक समाविष्ट' : 'Field Headings & Subfields Grouping Included'}
                    </h5>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      {language === 'mr'
                        ? 'या अहवालात उप-प्रश्न असल्याने मुख्य प्रश्नांचे शीर्षक (Group Heading) ठळकपणे दाखवले जाईल आणि त्याखाली संबंधित उप-प्रश्नांची माहिती सुटसुटीत दिसेल.'
                        : 'Main field headings will appear prominently as section headers above their nested subfield values in the generated report.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Live Preview of Hierarchical Report Structure */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    {language === 'mr' ? '२. अहवाल माहिती व रचनेचा प्रिव्ह्यू' : '2. Report Content & Hierarchy Preview'}
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {reportData.rows.length} {language === 'mr' ? 'बाबी' : 'Metrics'}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-center w-10">#</th>
                        <th className="px-3 py-2">{language === 'mr' ? 'बाब / उप-बाब' : 'Indicator / Subfield'}</th>
                        <th className="px-3 py-2 text-right">{language === 'mr' ? 'नोंदवलेली माहिती' : 'Value'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.rows.map((row, idx) => {
                        if (row.isHeader) {
                          return (
                            <tr key={idx} className="bg-slate-100/90 font-bold text-slate-900">
                              <td className="px-3 py-2 text-center text-slate-500">{row.srNo}</td>
                              <td colSpan={2} className="px-3 py-2 flex items-center gap-1.5">
                                <span className="text-blue-600 font-bold">📁 [मुख्य गट]</span>
                                {row.displayLabel}
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 text-center text-slate-400">{row.srNo}</td>
                            <td className={`px-3 py-1.5 ${row.depth > 0 ? 'pl-6 text-slate-700 font-medium' : 'text-slate-800'}`}>
                              {row.displayLabel}
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold text-slate-800">
                              {row.value}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
                  {language === 'mr' 
                    ? `निवडलेले फॉरमॅट: A4 ${orientation === 'portrait' ? 'उभा (Portrait)' : 'आडवा (Landscape)'}` 
                    : `Selected Format: A4 ${orientation.toUpperCase()}`}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setShowFullPrintPreview(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    title={language === 'mr' ? 'मुद्रण पूर्वावलोकन उघडा' : 'Open Dedicated Print Preview Mode'}
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-400" />
                    {language === 'mr' ? 'प्रिंट प्रिव्ह्यू (Print Preview)' : 'Print Preview'}
                  </button>

                  <button
                    onClick={handleDownloadExcel}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    title="Download Excel Sheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    Excel
                  </button>

                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {downloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {language === 'mr' 
                      ? `PDF डाऊनलोड (${orientation === 'portrait' ? 'उभा' : 'आडवा'})` 
                      : `Download PDF (${orientation === 'portrait' ? 'Portrait' : 'Landscape'})`}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              {language === 'mr' ? 'अहवाल सापडला नाही.' : 'No report data found.'}
            </div>
          )}

        </div>
      </div>

      {/* Dedicated Print Preview Modal with Full CSS Print Controls */}
      {showFullPrintPreview && (
        <PrintPreviewModal
          isOpen={showFullPrintPreview}
          onClose={() => setShowFullPrintPreview(false)}
          reportData={reportData}
          initialOrientation={orientation}
          onDirectExcelExport={handleDownloadExcel}
        />
      )}
    </div>
  );
}

