import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  Users, 
  MapPin, 
  Settings, 
  LogOut,
  Menu,
  X,
  Building,
  Bell,
  PenSquare
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation, TranslationKey } from '@/locales/translations';
import { useAuth } from '@/hooks/useAuth';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getNavigation = (employeeType?: string) => {
  const isDistrictController = employeeType === 'DISTRICT_CONTROLLER';
  const isTalukaController = employeeType === 'TALUKA_CONTROLLER';
  const isPHCController = employeeType === 'PHC_CONTROLLER';
  const isController = isDistrictController || isTalukaController || isPHCController;

  const nav = [
    { nameKey: 'nav.dashboard', href: '/', icon: LayoutDashboard },
    { nameKey: 'nav.dataEntry', href: '/reports/entry', icon: PenSquare },
    { nameKey: 'nav.myReports', href: '/reports/my', icon: FileText },
  ];

  if (isController) {
    nav.push({ nameKey: 'nav.pendingReports', href: '/reports/pending', icon: CheckSquare });
    nav.push({ nameKey: 'nav.employees', href: '/employees', icon: Users });
    nav.push({ nameKey: 'nav.hierarchy', href: '/hierarchy', icon: MapPin });
  }

  if (isDistrictController) {
    nav.push({ nameKey: 'nav.formBuilder', href: '/forms/builder', icon: Settings });
  }

  return nav;
};

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { language, setLanguage } = useLanguageStore();
  const t = useTranslation(language);
  const { employee, signOut } = useAuth();
  
  const navigation = getNavigation(employee?.employee_type);

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans flex flex-col lg:flex-row overflow-hidden">
      {/* Mobile sidebar */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", sidebarOpen ? "block" : "hidden")}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-[#0F172A] text-white flex flex-col">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-blue-400">{t('header.title')}</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">{t('header.subtitle')}</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.nameKey}
                  to={item.href}
                  className={cn(
                    isActive ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800",
                    "group flex items-center px-4 py-3 rounded-lg transition-colors"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={cn(
                    isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100",
                    "mr-3 flex-shrink-0 h-5 w-5"
                  )} />
                  <span className="text-sm font-medium">{t(item.nameKey as TranslationKey)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white">
                {employee?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-white">{employee?.name || 'User'}</p>
                <p className="text-[10px] text-slate-400">{employee?.employee_type?.replace('_', ' ') || 'Guest'}</p>
              </div>
              <button onClick={() => signOut()} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors" title="Log out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-[#0F172A] lg:text-white">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-tight text-blue-400">{t('header.title')}</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">{t('header.subtitle')}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.nameKey}
                to={item.href}
                className={cn(
                  isActive ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800",
                  "group flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                )}
              >
                <item.icon className={cn(
                  isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100",
                  "flex-shrink-0 h-5 w-5"
                )} />
                <span className="text-sm font-medium">{t(item.nameKey as TranslationKey)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white">
              {employee?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{employee?.name || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{employee?.employee_type?.replace('_', ' ') || 'Guest'}</p>
            </div>
            <button onClick={() => signOut()} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors" title="Log out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:pl-64 h-screen">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="lg:hidden text-slate-500 focus:outline-none"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-slate-500 font-medium hidden sm:inline-block">{t('header.district')}</span>
            <div className="hidden sm:block h-4 w-[1px] bg-slate-300"></div>
            <span className="text-sm text-slate-400 italic font-serif hidden sm:inline-block">जिल्हा आरोग्य अहवाल व संनियंत्रण</span>
            <span className="text-slate-800 font-medium sm:hidden">DHMS</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex bg-slate-100 p-1 rounded-md text-[11px] font-bold">
              <button 
                onClick={() => setLanguage('en')}
                className={cn("px-3 py-1 rounded transition-colors", language === 'en' ? "bg-white shadow-sm text-slate-800" : "text-slate-500")}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('mr')}
                className={cn("px-3 py-1 rounded transition-colors", language === 'mr' ? "bg-white shadow-sm text-slate-800" : "text-slate-500")}
              >
                मराठी
              </button>
            </div>
            <div className="relative flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full text-blue-700 text-xs font-bold border border-blue-100">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
              <span className="hidden sm:inline-block">{t('header.activeStatus')}</span>
              <span className="sm:hidden">Active</span>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-auto p-4 sm:p-8">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
