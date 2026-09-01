import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Download, 
  FileSpreadsheet, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCw, 
  Sliders, 
  Eye, 
  FileText, 
  Layers, 
  Check, 
  Sparkles, 
  Settings2,
  Calendar,
  Building2,
  MapPin,
  FileCheck2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { PreparedReportData } from '@/utils/reportDataHelper';
import { exportStructuredReportToPDF } from '@/utils/pdfExport';
import { exportStructuredReportToExcel } from '@/utils/excelExport';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData?: PreparedReportData | null;
  customReportTitle?: string;
  customSubTitle?: string;
  customContent?: React.ReactNode;
  initialOrientation?: 'portrait' | 'landscape';
  onDirectExcelExport?: () => void;
}

export type PaperSize = 'a4' | 'legal' | 'letter';
export type MarginOption = 'compact' | 'normal' | 'wide';
export type ColorMode = 'color' | 'monochrome';

export default function PrintPreviewModal({
  isOpen,
  onClose,
  reportData,
  customReportTitle,
  customSubTitle,
  customContent,
  initialOrientation = 'portrait',
  onDirectExcelExport
}: PrintPreviewModalProps) {
  const { language } = useLanguageStore();

  // Settings State
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(initialOrientation);
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [margins, setMargins] = useState<MarginOption>('normal');
  const [zoom, setZoom] = useState<number>(100);
  const [colorMode, setColorMode] = useState<ColorMode>('color');
  const [displayLanguage, setDisplayLanguage] = useState<'mr' | 'en' | 'bilingual'>('bilingual');

  // Toggleable Sections
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [showMetaGrid, setShowMetaGrid] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showFooterTimestamp, setShowFooterTimestamp] = useState<boolean>(true);
  const [showPageGuides, setShowPageGuides] = useState<boolean>(true);

  // Status
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setOrientation(initialOrientation);
      setZoom(100);
      setExportNotice(null);
    }
  }, [isOpen, initialOrientation]);

  if (!isOpen) return null;

  // Margin CSS values
  const getMarginStyle = () => {
    switch (margins) {
      case 'compact': return '12px 16px';
      case 'wide': return '28px 36px';
      case 'normal':
      default: return '20px 24px';
    }
  };

  const getMarginMm = () => {
    switch (margins) {
      case 'compact': return '5mm';
      case 'wide': return '15mm';
      case 'normal':
      default: return '10mm';
    }
  };

  // Dimensions based on orientation & paper size
  const getPaperDimensions = () => {
    const isLand = orientation === 'landscape';
    if (paperSize === 'legal') {
      return isLand ? { width: '355.6mm', minHeight: '215.9mm' } : { width: '215.9mm', minHeight: '355.6mm' };
    }
    if (paperSize === 'letter') {
      return isLand ? { width: '279.4mm', minHeight: '215.9mm' } : { width: '215.9mm', minHeight: '279.4mm' };
    }
    // A4 default
    return isLand ? { width: '297mm', minHeight: '210mm' } : { width: '210mm', minHeight: '297mm' };
  };

  const paperDims = getPaperDimensions();

  // Print Action using system print dialog
  const handlePrint = () => {
    // Set dynamic margin CSS variable on root before printing
    document.documentElement.style.setProperty('--print-margin', getMarginMm());
    
    // Inject temporary orientation style to ensure print engine strictly abides by user selection
    const styleEl = document.createElement('style');
    styleEl.id = 'print-override-style';
    styleEl.innerHTML = `
      @page {
        size: ${paperSize.toUpperCase()} ${orientation};
        margin: ${getMarginMm()};
      }
    `;
    document.head.appendChild(styleEl);

    window.print();

    // Clean up
    setTimeout(() => {
      const el = document.getElementById('print-override-style');
      if (el) el.remove();
    }, 1000);
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!reportData) {
      handlePrint();
      return;
    }
    setIsExporting(true);
    try {
      exportStructuredReportToPDF(reportData, {
        orientation,
        language: displayLanguage,
        title: reportData.formName,
        district: reportData.district,
        taluka: reportData.taluka,
        phc: reportData.phc,
        subcentre: reportData.subcentre,
        village: reportData.village,
        period: `${reportData.periodStart} to ${reportData.periodEnd}`,
        status: reportData.status
      });
      setExportNotice(language === 'mr' ? 'PDF यशस्वीरित्या तयार झाली!' : 'PDF downloaded successfully!');
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (onDirectExcelExport) {
      onDirectExcelExport();
      return;
    }
    if (!reportData) return;
    try {
      exportStructuredReportToExcel(reportData, {
        reportName: reportData.formName,
        districtName: reportData.district,
        talukaName: reportData.taluka,
        phcName: reportData.phc,
        subcentreName: reportData.subcentre
      });
      setExportNotice(language === 'mr' ? 'Excel फाइल डाऊनलोड झाली!' : 'Excel file downloaded successfully!');
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error('Excel export error:', err);
    }
  };

  const titleText = customReportTitle || reportData?.formName || 'आरोग्य अहवाल (Health Report)';
  const subTitleText = customSubTitle || (reportData ? `${reportData.periodStart} to ${reportData.periodEnd}` : new Date().toLocaleDateString('en-GB'));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 text-slate-100 backdrop-blur-sm print-active-dialog">
      
      {/* Top Application Bar - Controls & Actions (Hidden on Print) */}
      <div className="no-print bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-20 shadow-md">
        
        {/* Left Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                {language === 'mr' ? 'मुद्रण व अहवाल पूर्वावलोकन' : 'Report Print Preview'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                {paperSize.toUpperCase()} • {orientation.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-md">
              {titleText}
            </p>
          </div>
        </div>

        {/* Middle Quick View Controls */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-lg border border-slate-700">
          
          {/* Orientation Toggle */}
          <button
            onClick={() => setOrientation('portrait')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              orientation === 'portrait' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Portrait View (210 x 297mm)"
          >
            <span className="w-2.5 h-3.5 border border-current rounded-xs inline-block"></span>
            {language === 'mr' ? 'उभा (Portrait)' : 'Portrait'}
          </button>

          <button
            onClick={() => setOrientation('landscape')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              orientation === 'landscape' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Landscape View (297 x 210mm)"
          >
            <span className="w-3.5 h-2.5 border border-current rounded-xs inline-block"></span>
            {language === 'mr' ? 'आडवा (Landscape)' : 'Landscape'}
          </button>

          <div className="w-px h-4 bg-slate-700 mx-1"></div>

          {/* Zoom Controls */}
          <button
            onClick={() => setZoom(Math.max(50, zoom - 15))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-mono font-bold text-slate-300 px-1 min-w-[40px] text-center">
            {zoom}%
          </span>

          <button
            onClick={() => setZoom(Math.min(150, zoom + 15))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoom(100)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md text-[11px] font-bold"
            title="Reset Zoom to 100%"
          >
            100%
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {exportNotice && (
            <div className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-md text-xs font-medium flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              {exportNotice}
            </div>
          )}

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
            title="Export Excel Worksheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Download PDF Document"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-extrabold transition-all cursor-pointer shadow-sm hover:scale-102"
            title="Print Document or Save as PDF (Ctrl+P)"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            {language === 'mr' ? 'प्रिंट करा (Print)' : 'Print (Ctrl+P)'}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Layout (Sidebar Options + Interactive Paper Stage) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side Settings Panel (Hidden on Print) */}
        <div className="no-print w-72 bg-slate-900/90 border-r border-slate-800 p-4 overflow-y-auto space-y-5 flex-shrink-0 text-xs">
          
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[11px] mb-2.5">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'mr' ? 'कागद व मांडणी सेटिंग्ज' : 'Page & Layout Controls'}</span>
            </div>

            {/* Paper Size */}
            <div className="space-y-1.5 mb-3.5">
              <label className="text-slate-300 font-semibold">{language === 'mr' ? 'कागद आकार (Paper Size):' : 'Paper Size:'}</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="a4">A4 (210 × 297 mm) - Standard</option>
                <option value="legal">Legal (216 × 356 mm)</option>
                <option value="letter">Letter (216 × 279 mm)</option>
              </select>
            </div>

            {/* Margins Selection */}
            <div className="space-y-1.5 mb-3.5">
              <label className="text-slate-300 font-semibold">{language === 'mr' ? 'काठ / समासाचा आकार (Margins):' : 'Margins:'}</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['compact', 'normal', 'wide'] as MarginOption[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMargins(m)}
                    className={`py-1 rounded-md text-center font-medium capitalize border transition-all cursor-pointer ${
                      margins === m 
                        ? 'bg-blue-600 text-white border-blue-500' 
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {m === 'compact' ? (language === 'mr' ? 'कमी' : 'Narrow') : m === 'wide' ? (language === 'mr' ? 'जास्त' : 'Wide') : (language === 'mr' ? 'मानक' : 'Normal')}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Mode */}
            <div className="space-y-1.5 mb-3.5">
              <label className="text-slate-300 font-semibold">{language === 'mr' ? 'रंग छटा (Color Profile):' : 'Color Profile:'}</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setColorMode('color')}
                  className={`py-1 rounded-md text-center font-medium border transition-all cursor-pointer ${
                    colorMode === 'color' 
                      ? 'bg-blue-600 text-white border-blue-500' 
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  🎨 {language === 'mr' ? 'रंगीत' : 'Full Color'}
                </button>
                <button
                  onClick={() => setColorMode('monochrome')}
                  className={`py-1 rounded-md text-center font-medium border transition-all cursor-pointer ${
                    colorMode === 'monochrome' 
                      ? 'bg-blue-600 text-white border-blue-500' 
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  ⬛ {language === 'mr' ? 'काळा-पांढरा' : 'Grayscale'}
                </button>
              </div>
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">{language === 'mr' ? 'भाषा (Language):' : 'Report Language:'}</label>
              <select
                value={displayLanguage}
                onChange={(e) => setDisplayLanguage(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="bilingual">द्विभाषिक (Bilingual: Marathi + English)</option>
                <option value="mr">केवळ मराठी (Marathi Only)</option>
                <option value="en">English Only</option>
              </select>
            </div>
          </div>

          <div className="w-full h-px bg-slate-800"></div>

          {/* Section Visibility Toggles */}
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[11px] mb-2.5">
              <Settings2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'mr' ? 'घटक नियंत्रण (Components)' : 'Document Components'}</span>
            </div>

            <div className="space-y-2 text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showHeader}
                  onChange={(e) => setShowHeader(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>{language === 'mr' ? 'शासकीय शीर्षक (Official Masthead)' : 'Government Masthead'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showMetaGrid}
                  onChange={(e) => setShowMetaGrid(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>{language === 'mr' ? 'भौगोलिक माहिती (District/PHC Info)' : 'Hierarchy & Meta Info'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showSignatures}
                  onChange={(e) => setShowSignatures(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>{language === 'mr' ? 'स्वाक्षरी शिक्के (Signature Blocks)' : 'Signature Stamp Boxes'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showFooterTimestamp}
                  onChange={(e) => setShowFooterTimestamp(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>{language === 'mr' ? 'वेळ व पृष्ठ क्रमांक (Page & Date)' : 'Timestamp & Page Numbers'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showPageGuides}
                  onChange={(e) => setShowPageGuides(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>{language === 'mr' ? 'पृष्ठ सीमादर्शक (Page Break Marks)' : 'Show Page Break Guides'}</span>
              </label>
            </div>
          </div>

          <div className="w-full h-px bg-slate-800"></div>

          {/* Quick Guide Card */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 text-[11px] text-slate-400 space-y-1.5">
            <p className="font-bold text-slate-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {language === 'mr' ? 'मुद्रण सूचना (Print Tip):' : 'Print Tip:'}
            </p>
            <p>
              {language === 'mr'
                ? 'ब्राउझरच्या प्रिंट विंडोमध्ये "Background graphics" ऑन ठेवा, जेणेकरून रंग व रेषा स्पष्ट दिसतील.'
                : 'In your browser print dialog, enable "Background graphics" to render clean table header fills.'}
            </p>
          </div>

        </div>

        {/* Right Interactive Paper Canvas Stage */}
        <div className="flex-1 bg-slate-950 overflow-auto p-6 sm:p-10 flex justify-center items-start">
          
          {/* Simulated Paper Sheet */}
          <div 
            ref={sheetRef}
            style={{
              width: paperDims.width,
              minHeight: paperDims.minHeight,
              padding: getMarginStyle(),
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
            className={`printable-document print-page-sheet orientation-${orientation} bg-white text-slate-900 shadow-2xl rounded-sm transition-transform duration-150 relative ${
              colorMode === 'monochrome' ? 'print-monochrome grayscale' : ''
            }`}
          >

            {/* Visual Page Break Guidelines in UI Preview */}
            {showPageGuides && (
              <div className="no-print absolute inset-0 pointer-events-none border border-slate-300/40 rounded-sm">
                <div className="absolute top-2 right-2 text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                  {paperSize.toUpperCase()} • {orientation.toUpperCase()}
                </div>
              </div>
            )}

            {/* Custom Content Slot (e.g. Facility Matrix Table) */}
            {customContent ? (
              <div className="space-y-4">
                {customContent}
              </div>
            ) : reportData ? (
              /* Standard Structured Report View */
              <div className="space-y-4 text-slate-900 font-sans">
                
                {/* Official Enclosed Government Header Box (Matching Sample Format) */}
                {showHeader && (
                  <div className="border-2 border-slate-900 text-slate-950 text-[11px] mb-3 bg-white avoid-break shadow-xs">
                    {/* Row 1: Main Government Department Banner */}
                    <div className="border-b border-slate-900 py-1.5 px-3 text-center font-extrabold uppercase tracking-wide text-xs bg-slate-100">
                      PUBLIC HEALTH DEPARTMENT - GOVERNMENT OF MAHARASHTRA
                    </div>

                    {/* Row 2: Report Title */}
                    <div className="border-b border-slate-900 py-1 px-3 text-center font-extrabold text-sm text-slate-900">
                      Report Title: {reportData.formName}
                    </div>

                    {/* Row 3: Reporting Period */}
                    <div className="border-b border-slate-900 py-0.5 px-3 text-center font-semibold text-[11px] text-slate-700 bg-slate-50/50">
                      Reporting Period: {reportData.periodStart} to {reportData.periodEnd}
                    </div>

                    {/* Row 4: Administrative Hierarchy (District, Taluka, PHC) */}
                    <div className="border-b border-slate-900 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900 text-[10.5px]">
                      <div className="px-2.5 py-1">
                        <span className="font-bold">District:</span> {reportData.district}
                      </div>
                      <div className="px-2.5 py-1">
                        <span className="font-bold">Taluka:</span> {reportData.taluka}
                      </div>
                      <div className="px-2.5 py-1">
                        <span className="font-bold">PHC:</span> {reportData.phc}
                      </div>
                    </div>

                    {/* Row 5: Local Facility & Submitter (Sub-Centre, Village, Submitted By) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900 text-[10.5px]">
                      <div className="px-2.5 py-1">
                        <span className="font-bold">Sub-Centre:</span> {reportData.subcentre}
                      </div>
                      <div className="px-2.5 py-1">
                        <span className="font-bold">Village:</span> {reportData.village}
                      </div>
                      <div className="px-2.5 py-1">
                        <span className="font-bold">Submitted By:</span> {reportData.submittedBy} ({reportData.employeeType})
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary Hierarchical Matrix Table (Multi-Tier Column Headers matching sample) */}
                {reportData.matrixTable && reportData.matrixTable.headerTiers.length > 0 ? (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full border-collapse border-2 border-slate-900 text-center text-[10.5px]">
                      <thead>
                        {reportData.matrixTable.headerTiers.map((tier, tIdx) => (
                          <tr key={tIdx} className="bg-slate-100 font-bold text-slate-900 border-b border-slate-900">
                            {tier.cells.map((cell) => (
                              <th
                                key={cell.id}
                                colSpan={cell.colSpan}
                                rowSpan={cell.rowSpan}
                                className="border border-slate-900 px-2 py-1.5 text-center font-bold text-slate-900 bg-slate-100"
                              >
                                {displayLanguage === 'mr' ? cell.labelMr : displayLanguage === 'en' ? cell.labelEn : cell.label}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {reportData.matrixTable.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50 print-row">
                            <td className="border border-slate-900 px-2 py-1.5 text-center font-semibold text-slate-800">
                              {row.srNo}
                            </td>
                            {reportData.matrixTable!.leafColumns.map((col) => (
                              <td
                                key={col.id}
                                className="border border-slate-900 px-2 py-1.5 text-center font-extrabold text-slate-950"
                              >
                                {row.values[col.id] !== undefined && row.values[col.id] !== '' ? row.values[col.id] : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Standard Hierarchical Metrics Table fallback */
                  <table className="w-full border-collapse border border-slate-300 text-left text-[11px] my-3">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-400">
                        <th className="border border-slate-300 px-2 py-1.5 text-center w-9">अ.क्र.</th>
                        {orientation === 'landscape' && (
                          <th className="border border-slate-300 px-2 py-1.5 w-1/4">मुख्य गट (Category)</th>
                        )}
                        <th className="border border-slate-300 px-2.5 py-1.5">
                          {displayLanguage === 'mr' 
                            ? 'आरोग्य निर्देशक / बाब' 
                            : displayLanguage === 'en' 
                            ? 'Health Indicator / Metric' 
                            : 'आरोग्य निर्देशक / बाब (Health Metric)'}
                        </th>
                        {orientation === 'landscape' && (
                          <th className="border border-slate-300 px-2 py-1.5 text-center w-24">प्रकार</th>
                        )}
                        <th className="border border-slate-300 px-2.5 py-1.5 text-right w-28">
                          {displayLanguage === 'mr' ? 'नोंद (Value)' : 'Recorded Value'}
                        </th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center w-20">स्थिती</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.rows.map((r, idx) => {
                        if (r.isHeader) {
                          return (
                            <tr key={idx} className="bg-slate-100/90 font-bold text-slate-950 border-t border-b border-slate-300">
                              <td className="border border-slate-300 px-2 py-1 text-center font-bold text-slate-600">
                                {r.srNo}
                              </td>
                              {orientation === 'landscape' && (
                                <td className="border border-slate-300 px-2 py-1 text-blue-900 font-bold">
                                  {r.mainCategory}
                                </td>
                              )}
                              <td colSpan={orientation === 'landscape' ? 1 : 1} className="border border-slate-300 px-2.5 py-1 text-slate-900">
                                <span className="text-blue-700 mr-1.5">📁</span>
                                {displayLanguage === 'mr' ? r.fieldLabelMr || r.displayLabel : displayLanguage === 'en' ? r.fieldLabelEn || r.displayLabel : r.bilingualLabel}
                              </td>
                              {orientation === 'landscape' && (
                                <td className="border border-slate-300 px-2 py-1 text-center text-slate-500 font-medium">
                                  गट शीर्षक
                                </td>
                              )}
                              <td className="border border-slate-300 px-2.5 py-1 text-right text-slate-400 font-semibold">
                                -
                              </td>
                              <td className="border border-slate-300 px-2 py-1 text-center text-slate-400">
                                -
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 print-row">
                            <td className="border border-slate-300 px-2 py-1 text-center text-slate-500">
                              {r.srNo}
                            </td>
                            {orientation === 'landscape' && (
                              <td className="border border-slate-300 px-2 py-1 text-slate-600 text-[10px]">
                                {r.mainCategory || '-'}
                              </td>
                            )}
                            <td className={`border border-slate-300 px-2.5 py-1 ${
                              r.depth > 0 ? 'pl-6 text-slate-800 font-medium' : 'text-slate-900'
                            }`}>
                              {r.depth > 0 && <span className="text-slate-400 mr-1.5 font-bold">↳</span>}
                              {displayLanguage === 'mr' ? r.fieldLabelMr || r.displayLabel : displayLanguage === 'en' ? r.fieldLabelEn || r.displayLabel : r.bilingualLabel}
                            </td>
                            {orientation === 'landscape' && (
                              <td className="border border-slate-300 px-2 py-1 text-center text-[10px] text-slate-500">
                                {r.fieldType}
                              </td>
                            )}
                            <td className="border border-slate-300 px-2.5 py-1 text-right font-bold text-slate-950">
                              {r.value}
                            </td>
                            <td className="border border-slate-300 px-2 py-1 text-center text-[10px] text-slate-600">
                              {r.status}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Additional Detailed Field View (if matrix table was shown and user wants full breakdown) */}
                {reportData.matrixTable && reportData.rows.length > 0 && (
                  <details className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600 no-print">
                    <summary className="font-bold text-slate-800 cursor-pointer hover:text-blue-600 select-none">
                      {language === 'mr' ? '▼ सर्व बाबींची तपशीलवार यादी (Detailed Field Breakdown)' : '▼ Detailed Field Breakdown (List View)'}
                    </summary>
                    <table className="w-full border-collapse border border-slate-300 text-left text-[10.5px] mt-2">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                          <th className="border border-slate-300 px-2 py-1 text-center w-8">#</th>
                          <th className="border border-slate-300 px-2 py-1">बाब (Indicator)</th>
                          <th className="border border-slate-300 px-2 py-1 text-right w-24">नोंद (Value)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.rows.map((r, idx) => (
                          <tr key={idx} className={r.isHeader ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50/50'}>
                            <td className="border border-slate-300 px-2 py-1 text-center text-slate-500">{r.srNo}</td>
                            <td className={`border border-slate-300 px-2 py-1 ${r.depth > 0 ? 'pl-5' : ''}`}>
                              {r.isHeader && <span className="text-blue-600 mr-1">📁</span>}
                              {displayLanguage === 'mr' ? r.fieldLabelMr || r.displayLabel : r.fieldLabelEn || r.displayLabel}
                            </td>
                            <td className="border border-slate-300 px-2 py-1 text-right font-bold text-slate-900">{r.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                )}

                {/* Official Signatures Block */}
                {showSignatures && (
                  <div className="pt-6 mt-6 border-t border-slate-300 flex justify-between items-end avoid-break text-[10px] text-slate-700">
                    <div className="text-center w-48 sig-box">
                      <div className="h-10"></div>
                      <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                        {language === 'mr' ? 'कर्मचारी स्वाक्षरी (Staff)' : 'Submitted by (Staff Signature)'}
                      </div>
                      <div className="text-slate-500 text-[9px]">{reportData.submittedBy}</div>
                    </div>

                    <div className="text-center w-48 sig-box">
                      <div className="h-10"></div>
                      <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                        {language === 'mr' ? 'वैद्यकीय अधिकारी स्वाक्षरी व शिक्का' : 'Medical Officer (Sign & Seal)'}
                      </div>
                      <div className="text-slate-500 text-[9px]">प्राथमिक आरोग्य केंद्र</div>
                    </div>
                  </div>
                )}

                {/* Footer Timestamp */}
                {showFooterTimestamp && (
                  <div className="pt-4 mt-4 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-500">
                    <div>
                      Generated via ZP Health Information Portal • {new Date().toLocaleString('en-GB')}
                    </div>
                    <div>
                      Page 1 of 1 • Official Certified Copy
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-sm">
                {language === 'mr' ? 'अहवाल माहिती लोड होत आहे...' : 'No report data loaded.'}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
