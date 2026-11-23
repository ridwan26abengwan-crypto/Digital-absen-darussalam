import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { DEFAULT_LEFT_LOGO } from '../constants/schoolDefaults';
import { useAuth } from '../contexts/AuthContext';
import { useSchoolData } from '../contexts/SchoolDataContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { PWAInstallButton } from '../components/PWAInstallButton';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: 'Ringkasan',
    items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Master Data',
    items: [
      { to: '/admin/guru', label: 'Data Guru', icon: Users },
      { to: '/admin/siswa', label: 'Data Siswa', icon: GraduationCap },
      { to: '/admin/kelas', label: 'Kelas / Rombel', icon: BookOpen },
    ],
  },
  {
    title: 'Kehadiran & Laporan',
    items: [
      { to: '/admin/absensi-guru', label: 'Absensi Guru', icon: ClipboardCheck },
      { to: '/admin/absensi-siswa', label: 'Absensi Siswa', icon: CalendarCheck },
      { to: '/admin/rekap', label: 'Rekap Absensi', icon: BarChart3 },
      { to: '/admin/laporan', label: 'Laporan Resmi', icon: FileText },
      { to: '/admin/import-export', label: 'Import / Export', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'Administrasi',
    items: [
      { to: '/admin/akun', label: 'Manajemen Akun', icon: ShieldCheck },
      { to: '/admin/pengaturan', label: 'Identitas Madrasah', icon: Settings },
      { to: '/admin/audit-log', label: 'Audit Log', icon: Activity },
      { to: '/admin/profil', label: 'Profil Saya', icon: UserCircle },
    ],
  },
];

const GURU_NAV_GROUPS: NavGroup[] = [
  {
    title: 'Portal Guru',
    items: [
      { to: '/guru/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/guru/absensi', label: 'Absensi Saya', icon: ClipboardCheck },
      { to: '/guru/absensi-siswa', label: 'Absensi Siswa', icon: CalendarCheck },
    ],
  },
  {
    title: 'Kelas & Laporan',
    items: [
      { to: '/guru/siswa', label: 'Data Siswa', icon: GraduationCap },
      { to: '/guru/rekap', label: 'Rekap Kelas', icon: BarChart3 },
      { to: '/guru/laporan', label: 'Laporan Resmi', icon: FileText },
      { to: '/guru/profil', label: 'Profil Saya', icon: UserCircle },
    ],
  },
];

export const DashboardLayout: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const { schoolSettings, isLiveSynced } = useSchoolData();
  const { theme, toggleTheme } = useTheme();
  const { confirm } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = userProfile?.role === 'ADMIN';
  const navGroups = isAdmin ? ADMIN_NAV_GROUPS : GURU_NAV_GROUPS;
  const allNavItems = navGroups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })));
  const activeNav = allNavItems.find((item) => location.pathname.startsWith(item.to));

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Keluar dari Aplikasi',
      description:
        'Apakah Anda yakin ingin mengakhiri sesi ini dan keluar dari MIS DARUSSALAM ABSENSI DIGITAL?',
      confirmLabel: 'Logout',
      cancelLabel: 'Batal',
    });
    if (ok) {
      await logout();
      navigate('/login');
    }
  };

  const renderNavLinks = (onSelect?: () => void) => (
    <nav aria-label="Navigasi Utama" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {navGroups.map((group) => (
        <div key={group.title} className="space-y-1">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500">
            {group.title}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onSelect}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const initials = (userProfile?.nama || 'MD').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-[#f4f7f6] dark:bg-[#070d12] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[264px] lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200/80 dark:border-slate-800/90 shrink-0">
          <img
            src={schoolSettings.logoKiriUrl || DEFAULT_LEFT_LOGO}
            alt="Logo MIS Darussalam"
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs"
          />
          <div className="min-w-0">
            <p className="font-display text-sm font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
              MIS DARUSSALAM
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              TP {schoolSettings.tahunPelajaranAktif} · Absensi Digital
            </p>
          </div>
        </div>

        {renderNavLinks()}

        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/90 space-y-2 shrink-0">
          <NavLink
            to={isAdmin ? '/admin/profil' : '/guru/profil'}
            className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            {userProfile?.photoUrl ? (
              <img
                src={userProfile.photoUrl}
                alt={userProfile.nama}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {userProfile?.nama}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {userProfile?.role} · {userProfile?.username}
              </p>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <aside className="relative z-10 flex w-72 max-w-[84vw] flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={schoolSettings.logoKiriUrl || DEFAULT_LEFT_LOGO}
                  alt="Logo MIS Darussalam"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 border border-slate-200 shrink-0"
                />
                <span className="font-display text-sm font-extrabold truncate">MIS DARUSSALAM</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup navigasi"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavLinks(() => setMobileMenuOpen(false))}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleLogout();
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Sesi</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[264px]">
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/90 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="hidden sm:inline text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {activeNav?.group ?? (isAdmin ? 'Admin' : 'Guru')}
              </span>
              <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-slate-300 dark:text-slate-700 shrink-0" />
              <h1 className="font-display text-base sm:text-[17px] font-bold text-slate-900 dark:text-white truncate">
                {activeNav?.label ?? 'MIS DARUSSALAM'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isLiveSynced && (
              <span
                title="Sinkronisasi realtime Cloud Firestore aktif"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono whitespace-nowrap"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cloud Sync
              </span>
            )}

            <PWAInstallButton />

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <NavLink
              to={isAdmin ? '/admin/profil' : '/guru/profil'}
              className="hidden md:flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800 hover:opacity-85 transition-opacity"
            >
              <div className="text-right leading-tight">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                  {userProfile?.nama}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {userProfile?.role}
                </p>
              </div>
              {userProfile?.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile.nama}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
              )}
            </NavLink>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
