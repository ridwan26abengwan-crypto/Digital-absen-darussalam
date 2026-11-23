import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import {
  computeStudentDashboardStats,
  formatTanggalIndonesia,
  formatTanggalISO,
} from '../../utils/attendanceLogic';
import { SkeletonTable, StatusLabel } from '../../components/UiStates';

export const GuruDashboardPage: React.FC = () => {
  const { userProfile } = useAuth();
  const {
    classes,
    students,
    teacherAttendances,
    studentAttendances,
    schoolSettings,
    dataLoading,
  } = useSchoolData();

  const today = formatTanggalISO(new Date());

  const todayMyAttendance = useMemo(
    () => teacherAttendances.find((a) => a.tanggal === today),
    [teacherAttendances, today]
  );

  const todayStudentAtt = useMemo(
    () => studentAttendances.filter((a) => a.tanggal === today),
    [studentAttendances, today]
  );

  const studentStats = useMemo(
    () => computeStudentDashboardStats(students, todayStudentAtt),
    [students, todayStudentAtt]
  );

  if (dataLoading) return <SkeletonTable rows={5} cols={4} />;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="surface-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {schoolSettings.namaMadrasah} · Tahun Pelajaran {schoolSettings.tahunPelajaranAktif}
          </p>
          <h2 className="mt-1 font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Assalamu&apos;alaikum, {userProfile?.nama}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {formatTanggalIndonesia(today)} · Batas masuk pukul{' '}
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
              {schoolSettings.jamMasukBatas} WIB
            </span>
          </p>
        </div>

        <Link to="/guru/absensi" className="btn-primary self-start sm:self-auto">
          <ClipboardCheck className="w-4 h-4" />
          {todayMyAttendance ? 'Lihat Absensi Hari Ini' : 'Isi Absensi Sekarang'}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 3 Proportional Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="surface-card p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Status Absensi Saya Hari Ini
              </p>
              <p
                className={`mt-2 font-display text-2xl font-extrabold ${
                  todayMyAttendance
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {todayMyAttendance ? todayMyAttendance.status : 'Belum Tercatat'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
            {todayMyAttendance
              ? `Masuk ${todayMyAttendance.jamMasuk} · Pulang ${todayMyAttendance.jamPulang || '-'}`
              : `Batas masuk ${schoolSettings.jamMasukBatas} WIB`}
          </p>
        </div>

        <div className="surface-card p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Kelas Ampuan Saya
              </p>
              <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                {classes.length > 0 ? classes.map((c) => c.namaRombel).join(', ') : '-'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <p className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {students.length} siswa aktif terdaftar
          </p>
        </div>

        <div className="surface-card p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Kehadiran Siswa Hari Ini
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {studentStats.hadir}
                </span>
                <span className="font-mono text-sm text-slate-400 tabular-nums">
                  / {studentStats.totalSiswa} siswa
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <p className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            S {studentStats.sakit} · I {studentStats.izin} · A {studentStats.alpa} · D{' '}
            {studentStats.dispensasi}
          </p>
        </div>
      </div>

      {/* Quick Actions & Personal History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 surface-card p-5 sm:p-6">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mb-4">
            Akses Cepat Guru
          </h3>
          <div className="space-y-3">
            <Link
              to="/guru/absensi"
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Absensi Saya</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Catat hadir, pulang, atau izin
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/guru/absensi-siswa"
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Absensi Siswa
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Input kehadiran H / S / I / A / D
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/guru/laporan"
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Laporan PDF Resmi
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Unduh rekap kelas berkop surat
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-7 surface-card p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Riwayat Absensi Saya Terbaru
            </h3>
            <Link
              to="/guru/absensi"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Lihat Semua
            </Link>
          </div>
          {teacherAttendances.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-12 text-center">
              Belum ada riwayat absensi yang tercatat.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-1">
              {teacherAttendances.slice(0, 6).map((att) => (
                <div
                  key={att.attendanceId}
                  className="py-3 flex items-center justify-between gap-4 text-sm"
                >
                  <div>
                    <p className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {att.tanggal}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                      Masuk {att.jamMasuk} · Pulang {att.jamPulang || '-'}
                    </p>
                  </div>
                  <StatusLabel
                    status={att.status}
                    variant={
                      att.status === 'HADIR'
                        ? 'emerald'
                        : att.status === 'TERLAMBAT' || att.status === 'SAKIT'
                          ? 'amber'
                          : att.status === 'ALPA'
                            ? 'rose'
                            : 'sky'
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
