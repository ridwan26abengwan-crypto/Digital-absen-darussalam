import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Moon,
  ShieldPlus,
  Sun,
  UserCheck,
} from 'lucide-react';
import { z } from 'zod';
import {
  DEFAULT_LEFT_LOGO,
  DEFAULT_RIGHT_LOGO,
  DEFAULT_SCHOOL_SETTINGS,
  HERO_CAMPUS_IMAGE,
} from '../../constants/schoolDefaults';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { firstAdminSetupSchema, loginSchema } from '../../utils/validationSchemas';
import { PWAInstallButton } from '../../components/PWAInstallButton';

type LoginFormValues = z.infer<typeof loginSchema>;
type SetupFormValues = z.infer<typeof firstAdminSetupSchema>;

export const LoginPage: React.FC = () => {
  const {
    userProfile,
    authReady,
    authError,
    providerNeedsConsoleEnable,
    clearAuthError,
    loginWithIdentifier,
    loginWithGoogle,
    setupFirstAdmin,
  } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const setupForm = useForm<SetupFormValues>({
    resolver: zodResolver(firstAdminSetupSchema),
    defaultValues: {
      nama: 'MIS DARUSSALAM',
      username: 'MIS DARUSSALAM',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (authReady && userProfile) {
      navigate(userProfile.role === 'ADMIN' ? '/admin/dashboard' : '/guru/dashboard', {
        replace: true,
      });
    }
  }, [authReady, userProfile, navigate]);

  const onLoginSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      await loginWithIdentifier(values.identifier, values.password);
      showToast('Login berhasil. Selamat datang di MIS DARUSSALAM.', 'success');
    } catch {
      // Error surfaced via authError state
    } finally {
      setSubmitting(false);
    }
  };

  const onSetupSubmit = async (values: SetupFormValues) => {
    setSubmitting(true);
    try {
      await setupFirstAdmin({
        nama: values.nama,
        username: values.username,
        email: values.email,
        password: values.password,
      });
      showToast('Akun Admin Awal MIS DARUSSALAM berhasil dibuat dan diaktifkan.', 'success');
    } catch {
      // Error surfaced via authError state
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      await loginWithGoogle();
      showToast('Autentikasi Google berhasil.', 'success');
    } catch {
      // Error surfaced via authError
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#f4f7f6] dark:bg-[#070d12]">
      {/* Left Institutional Visual Showcase */}
      <div className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between overflow-hidden bg-emerald-950 text-white p-10 xl:p-14">
        <img
          src={HERO_CAMPUS_IMAGE}
          alt="Lingkungan Madrasah Ibtidaiyah Darussalam"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-30 scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-emerald-950/80 to-teal-950/85" />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"
        />

        {/* Top Institutional Lockup */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={DEFAULT_LEFT_LOGO}
              alt="Logo MIS Darussalam"
              referrerPolicy="no-referrer"
              className="w-13 h-13 rounded-2xl bg-white p-1.5 object-contain shadow-lg ring-1 ring-white/20"
            />
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-amber-300/95 uppercase">
                {DEFAULT_SCHOOL_SETTINGS.namaYayasan}
              </p>
              <h2 className="font-display text-lg xl:text-xl font-extrabold tracking-tight text-white">
                {DEFAULT_SCHOOL_SETTINGS.namaMadrasah}
              </h2>
            </div>
          </div>

          <img
            src={DEFAULT_RIGHT_LOGO}
            alt="Logo YPI-DTQ"
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-xl bg-white/95 p-1 object-contain shadow-md ring-1 ring-white/20"
          />
        </div>

        {/* Center Hero Value Proposition */}
        <div className="relative z-10 max-w-xl space-y-6 my-auto py-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-wider text-emerald-300">
              Tahun Pelajaran {DEFAULT_SCHOOL_SETTINGS.tahunPelajaranAktif} · Ciasem, Kab. Subang
            </p>
            <h1 className="font-display text-4xl xl:text-[44px] font-extrabold tracking-tight leading-[1.12] text-balance text-white">
              Sistem Administrasi &amp; Absensi Digital Terpadu
            </h1>
            <p className="text-[15px] text-emerald-100/85 leading-relaxed max-w-lg">
              Pencatatan kehadiran guru dan peserta didik secara realtime lintas perangkat,
              terhubung langsung ke Cloud Firestore dan dilengkapi cetak laporan resmi berkop surat
              madrasah.
            </p>
          </div>

          <div className="pt-6 border-t border-white/15 grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-emerald-300/90 font-medium">NSM Madrasah</p>
              <p className="font-mono text-base font-bold text-white mt-1 tabular-nums">
                {DEFAULT_SCHOOL_SETTINGS.nsm}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-300/90 font-medium">NPSM</p>
              <p className="font-mono text-base font-bold text-white mt-1 tabular-nums">
                {DEFAULT_SCHOOL_SETTINGS.npsm}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-300/90 font-medium">Status Akreditasi</p>
              <p className="text-base font-bold text-white mt-1">
                &quot;{DEFAULT_SCHOOL_SETTINGS.akreditasi}&quot; BAN-PDM
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4 text-xs text-emerald-200/75 pt-4 border-t border-white/10">
          <span>{DEFAULT_SCHOOL_SETTINGS.alamat}</span>
          <span className="font-mono shrink-0">Tlp. {DEFAULT_SCHOOL_SETTINGS.telepon}</span>
        </div>
      </div>

      {/* Right Authentication Form Surface */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-4 py-8 sm:px-8 lg:px-10 xl:px-14">
        <div className="w-full max-w-[440px] mx-auto">
          <div className="flex items-center justify-between lg:justify-end gap-3 mb-5">
            <div className="flex items-center gap-3 lg:hidden">
              <img
                src={DEFAULT_LEFT_LOGO}
                alt="Logo MIS Darussalam"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-200 dark:border-slate-700 object-contain shadow-2xs"
              />
              <div>
                <p className="font-display text-sm font-extrabold text-slate-900 dark:text-white">
                  MIS DARUSSALAM
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Absensi Digital</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PWAInstallButton />
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="surface-card p-6 sm:p-8 shadow-lg shadow-slate-200/50 dark:shadow-none">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                {mode === 'login' ? 'Masuk ke Sistem' : 'First Admin Setup'}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {mode === 'login'
                  ? 'Gunakan akun Admin atau Guru yang terdaftar di Firebase Authentication.'
                  : 'Inisialisasi akun Admin utama MIS DARUSSALAM untuk pertama kali.'}
              </p>
            </div>

            {/* Segmented Mode Switch */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  clearAuthError();
                  setMode('login');
                }}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Login Pengguna
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAuthError();
                  setMode('setup');
                }}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                  mode === 'setup'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldPlus className="w-3.5 h-3.5" />
                Setup Admin Awal
              </button>
            </div>

            {authError && (
              <div className="mb-5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 p-3.5 text-xs text-rose-800 dark:text-rose-200 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <p className="leading-relaxed">{authError}</p>
                </div>
                {providerNeedsConsoleEnable && (
                  <p className="pl-6 text-[11px] text-rose-700 dark:text-rose-300">
                    Panduan: Buka Firebase Console → Authentication → Sign-in method → Tambahkan
                    provider <strong>Email/Password</strong> dan aktifkan, lalu coba kembali.
                  </p>
                )}
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Username atau Email
                  </label>
                  <input
                    id="login-identifier"
                    type="text"
                    autoComplete="username"
                    placeholder="MIS DARUSSALAM atau email"
                    {...loginForm.register('identifier')}
                    className="field-input"
                  />
                  {loginForm.formState.errors.identifier && (
                    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                      {loginForm.formState.errors.identifier.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Masukkan kata sandi"
                      {...loginForm.register('password')}
                      className="field-input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
                  <Lock className="w-4 h-4" />
                  {submitting ? 'Memproses Login...' : 'Masuk ke Dashboard'}
                </button>
              </form>
            ) : (
              <form onSubmit={setupForm.handleSubmit(onSetupSubmit)} className="space-y-4">
                <div>
                  <label
                    htmlFor="setup-nama"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Nama Tampilan Admin
                  </label>
                  <input id="setup-nama" type="text" {...setupForm.register('nama')} className="field-input" />
                  {setupForm.formState.errors.nama && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {setupForm.formState.errors.nama.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="setup-username"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Username Admin
                    </label>
                    <input
                      id="setup-username"
                      type="text"
                      {...setupForm.register('username')}
                      className="field-input"
                    />
                    {setupForm.formState.errors.username && (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                        {setupForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="setup-email"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Email (Opsional)
                    </label>
                    <input
                      id="setup-email"
                      type="email"
                      placeholder="Otomatis dari username"
                      {...setupForm.register('email')}
                      className="field-input"
                    />
                    {setupForm.formState.errors.email && (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                        {setupForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="setup-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Kata Sandi Admin Baru
                  </label>
                  <input
                    id="setup-password"
                    type="password"
                    placeholder="Minimal 8 karakter"
                    {...setupForm.register('password')}
                    className="field-input"
                  />
                  {setupForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {setupForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="setup-confirm"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Ulangi Kata Sandi
                  </label>
                  <input
                    id="setup-confirm"
                    type="password"
                    placeholder="Konfirmasi kata sandi"
                    {...setupForm.register('confirmPassword')}
                    className="field-input"
                  />
                  {setupForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {setupForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
                  <UserCheck className="w-4 h-4" />
                  {submitting ? 'Membuat Akun Admin...' : 'Aktifkan Admin Pertama'}
                </button>
              </form>
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500">
                  Atau masuk cepat dengan Google
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleLogin}
              className="btn-secondary w-full py-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3.1.6 4.2 1.7l3.1-3.1C17.4 1.8 14.9 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 12.3s.6 3.3 1.6 5.3l3.7-2.8z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.2 0 6-1.1 8-2.9l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"
                />
              </svg>
              Masuk dengan Akun Google
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {DEFAULT_SCHOOL_SETTINGS.alamatSingkat} · Tahun Pelajaran{' '}
            {DEFAULT_SCHOOL_SETTINGS.tahunPelajaranAktif}
          </p>
        </div>
      </div>
    </div>
  );
};
