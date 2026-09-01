import { useState, useEffect } from 'react';
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
  Building2,
  PenSquare,
  ShieldCheck,
  Globe2,
  Activity,
  Calendar
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
    { nameKey: 'nav.matrixReport', href: '/reports/matrix', icon: Building },
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
  const [currentDate, setCurrentDate] = useState<string>('');
  const location = useLocation();
  const { language, setLanguage } = useLanguageStore();
  const t = useTranslation(language);
  const { employee, signOut } = useAuth();
  
  const navigation = getNavigation(employee?.employee_type);

  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    setCurrentDate(formatted);
  }, [language]);

  const facilityLabel = (employee as any)?.sub_centres?.name || (employee as any)?.phcs?.name || (employee as any)?.talukas?.name || 'District HQ';

  return (
    <div className="min-h-screen bg-slate-100/70 font-sans flex flex-col lg:flex-row overflow-hidden">
      {/* Mobile sidebar overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={() => setSidebarOpen(false)} 
      />

      {/* Mobile sidebar menu */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col lg:hidden transform transition-transform duration-300 ease-in-out border-r border-slate-800 shadow-2xl",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">{t('header.title')}</h1>
              <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">{t('header.subtitle')}</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="text-slate-400 p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.nameKey}
                to={item.href}
                className={cn(
                  isActive 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold" 
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium",
                  "group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 text-sm"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className={cn(
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200",
                  "flex-shrink-0 h-4.5 w-4.5"
                )} />
                <span>{t(item.nameKey as TranslationKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3.5 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              {employee?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{employee?.name || 'User'}</p>
              <p className="text-[10px] text-blue-300 font-medium truncate flex items-center gap-1">
                <span>{employee?.employee_type?.replace(/_/g, ' ') || 'Staff'}</span>
              </p>
            </div>
            <button 
              onClick={() => signOut()} 
              className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 transition-colors cursor-pointer" 
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-slate-900 lg:text-white lg:border-r lg:border-slate-800 lg:z-30">
        <div className="p-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-white truncate">{t('header.title')}</h1>
              <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase truncate">{t('header.subtitle')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.nameKey}
                to={item.href}
                className={cn(
                  isActive 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold" 
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium",
                  "group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 text-sm"
                )}
              >
                <item.icon className={cn(
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200",
                  "flex-shrink-0 h-4.5 w-4.5"
                )} />
                <span className="truncate">{t(item.nameKey as TranslationKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3.5 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              {employee?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{employee?.name || 'User'}</p>
              <p className="text-[10px] text-blue-300 font-medium truncate">
                {employee?.employee_type?.replace(/_/g, ' ') || 'Staff'}
              </p>
            </div>
            <button 
              onClick={() => signOut()} 
              className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 transition-colors cursor-pointer" 
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col lg:pl-64 h-screen min-w-0">
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex justify-between items-center flex-shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg focus:outline-none transition-colors cursor-pointer"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-slate-800 font-bold text-sm sm:text-base truncate">
                {t('header.district')}
              </span>
              <div className="hidden sm:block h-4 w-[1px] bg-slate-200"></div>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {facilityLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            {/* Live Date display */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-medium px-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentDate}</span>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 text-xs font-bold">
              <button 
                onClick={() => setLanguage('en')}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer", 
                  language === 'en' 
                    ? "bg-white shadow-xs text-blue-700 font-semibold" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('mr')}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer", 
                  language === 'mr' 
                    ? "bg-white shadow-xs text-blue-700 font-semibold" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                मराठी
              </button>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1 rounded-full text-emerald-700 text-xs font-semibold border border-emerald-200/60">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="hidden sm:inline-block">{t('header.activeStatus')}</span>
              <span className="sm:hidden">Live</span>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  );
}
