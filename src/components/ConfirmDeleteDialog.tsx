import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, Loader2, Calendar, MapPin, User, FileText, Database } from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';

export interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
  title?: string;
  description?: string;
  itemDetails?: {
    formName?: string;
    employeeName?: string;
    role?: string;
    location?: string;
    period?: string;
    status?: string;
  };
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
  title,
  description,
  itemDetails
}) => {
  const { language } = useLanguageStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const defaultTitle = language === 'mr' ? 'अहवाल हटवण्याची खात्री करा' : 'Confirm Report Deletion';
  const defaultDesc = language === 'mr' 
    ? 'तुम्हाला हा सादर केलेला अहवाल Supabase क्लाउडवरून कायमचा हटवायचा आहे का? ही कृती पूर्ववत केली जाऊ शकत नाही.'
    : 'Are you sure you want to permanently delete this submitted report from Supabase? This action cannot be undone.';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" 
        onClick={() => !isDeleting && onClose()}
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div 
          className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-200 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 border border-red-200">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-6" id="modal-title">
                  {title || defaultTitle}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'mr' ? 'Supabase डेटाबेस सुरक्षा इशारा' : 'Supabase Database Safety Warning'}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              {description || defaultDesc}
            </p>

            {/* Item Details Card */}
            {itemDetails && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                {itemDetails.formName && (
                  <div className="flex items-start gap-2 text-slate-700">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-500">{language === 'mr' ? 'प्रपत्र:' : 'Form:'} </span>
                      <span className="font-bold text-slate-900">{itemDetails.formName}</span>
                    </div>
                  </div>
                )}

                {itemDetails.employeeName && (
                  <div className="flex items-start gap-2 text-slate-700">
                    <User className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-500">{language === 'mr' ? 'कर्मचारी:' : 'Employee:'} </span>
                      <span className="font-medium text-slate-800">{itemDetails.employeeName} {itemDetails.role ? `(${itemDetails.role})` : ''}</span>
                    </div>
                  </div>
                )}

                {itemDetails.location && (
                  <div className="flex items-start gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-500">{language === 'mr' ? 'स्थान:' : 'Location:'} </span>
                      <span className="font-medium text-slate-800">{itemDetails.location}</span>
                    </div>
                  </div>
                )}

                {itemDetails.period && (
                  <div className="flex items-start gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-500">{language === 'mr' ? 'कालावधी:' : 'Period:'} </span>
                      <span className="font-medium text-slate-800">{itemDetails.period}</span>
                    </div>
                  </div>
                )}

                {itemDetails.status && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="font-semibold text-slate-500">{language === 'mr' ? 'स्थिती:' : 'Status:'}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      itemDetails.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      itemDetails.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {itemDetails.status}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Warning Callout */}
            <div className="flex items-start gap-3 bg-red-50/80 border border-red-200 rounded-xl p-3.5 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {language === 'mr' ? 'कायमस्वरूपी काढून टाकणे' : 'Permanent Supabase Deletion'}
                </p>
                <p className="mt-0.5 text-red-700/90 text-[11px]">
                  {language === 'mr'
                    ? 'या अहवालातील सर्व संबंधित नोंदी Supabase वरून कायमच्या नष्ट होतील.'
                    : 'All field entries associated with this submission will be erased from Supabase cloud.'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-row-reverse gap-3 justify-start">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirm}
              className="inline-flex justify-center items-center rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === 'mr' ? 'हटवत आहे...' : 'Deleting...'}
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {language === 'mr' ? 'होय, अहवाल हटवा' : 'Yes, Delete Report'}
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="inline-flex justify-center items-center rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {language === 'mr' ? 'रद्द करा' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteDialog;
