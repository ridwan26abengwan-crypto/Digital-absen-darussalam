import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/PWAInstallButton';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SchoolDataProvider } from './contexts/SchoolDataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AdminAbsensiGuruPage } from './pages/admin/AdminAbsensiGuruPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { DataGuruPage } from './pages/admin/DataGuruPage';
import { DataKelasPage } from './pages/admin/DataKelasPage';
import { DataSiswaPage } from './pages/admin/DataSiswaPage';
import { ImportExportPage } from './pages/admin/ImportExportPage';
import { ManajemenAkunPage } from './pages/admin/ManajemenAkunPage';
import { PengaturanMadrasahPage } from './pages/admin/PengaturanMadrasahPage';
import { AccessDeniedPage } from './pages/auth/AccessDeniedPage';
import { LoginPage } from './pages/auth/LoginPage';
import { GuruAbsensiSayaPage } from './pages/guru/GuruAbsensiSayaPage';
import { GuruDashboardPage } from './pages/guru/GuruDashboardPage';
import { AbsensiSiswaPage } from './pages/shared/AbsensiSiswaPage';
import { LaporanPage } from './pages/shared/LaporanPage';
import { ProfilPage } from './pages/shared/ProfilPage';
import { RekapAbsensiPage } from './pages/shared/RekapAbsensiPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

const RootRedirect: React.FC = () => {
  const { authReady, userProfile } = useAuth();

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={userProfile.role === 'ADMIN' ? '/admin/dashboard' : '/guru/dashboard'}
      replace
    />
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <SchoolDataProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/access-denied" element={<AccessDeniedPage />} />

                  {/* Admin Protected Routes */}
                  <Route element={<ProtectedRoute allowedRole="ADMIN" />}>
                    <Route path="/admin" element={<DashboardLayout />}>
                      <Route index element={<Navigate to="/admin/dashboard" replace />} />
                      <Route path="dashboard" element={<AdminDashboardPage />} />
                      <Route path="guru" element={<DataGuruPage />} />
                      <Route path="siswa" element={<DataSiswaPage />} />
                      <Route path="kelas" element={<DataKelasPage />} />
                      <Route path="absensi-guru" element={<AdminAbsensiGuruPage />} />
                      <Route path="absensi-siswa" element={<AbsensiSiswaPage />} />
                      <Route path="rekap" element={<RekapAbsensiPage />} />
                      <Route path="laporan" element={<LaporanPage />} />
                      <Route path="import-export" element={<ImportExportPage />} />
                      <Route path="akun" element={<ManajemenAkunPage />} />
                      <Route path="pengaturan" element={<PengaturanMadrasahPage />} />
                      <Route path="audit-log" element={<AuditLogPage />} />
                      <Route path="profil" element={<ProfilPage />} />
                    </Route>
                  </Route>

                  {/* Guru Protected Routes */}
                  <Route element={<ProtectedRoute allowedRole="GURU" />}>
                    <Route path="/guru" element={<DashboardLayout />}>
                      <Route index element={<Navigate to="/guru/dashboard" replace />} />
                      <Route path="dashboard" element={<GuruDashboardPage />} />
                      <Route path="absensi" element={<GuruAbsensiSayaPage />} />
                      <Route path="absensi-siswa" element={<AbsensiSiswaPage />} />
                      <Route path="siswa" element={<DataSiswaPage />} />
                      <Route path="rekap" element={<RekapAbsensiPage />} />
                      <Route path="laporan" element={<LaporanPage />} />
                      <Route path="profil" element={<ProfilPage />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<RootRedirect />} />
                </Routes>
              </BrowserRouter>
              <OfflineIndicator />
            </SchoolDataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
