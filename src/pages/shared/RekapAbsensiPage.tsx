import React, { useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { INDONESIAN_MONTHS } from '../../constants/schoolDefaults';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import {
  buildStudentRecap,
  buildTeacherRecap,
  computeTeacherDashboardStats,
} from '../../utils/attendanceLogic';
import {
  exportStudentRecapToExcel,
  exportTeacherRecapToExcel,
} from '../../utils/excelUtils';
import { EmptyState, SkeletonTable } from '../../components/UiStates';

export const RekapAbsensiPage: React.FC = () => {
  const { userProfile } = useAuth();
  const {
    teachers,
    students,
    classes,
    teacherAttendances,
    studentAttendances,
    schoolSettings,
    dataLoading,
  } = useSchoolData();

  const isAdmin = userProfile?.role === 'ADMIN';
  const now = new Date();

  const [tab, setTab] = useState<'guru_harian' | 'guru_bulanan' | 'guru_tahunan' | 'siswa'>(
    isAdmin ? 'guru_bulanan' : 'siswa'
  );
  const [bulan, setBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [tahun, setTahun] = useState(String(now.getFullYear()));
  const [classFilter, setClassFilter] = useState('ALL');

  const monthPrefix = `${tahun}-${bulan}`;

  const dailyTeacherRecap = useMemo(() => {
    const dates = Array.from(
      new Set(
        teacherAttendances
          .filter((a) => a.tanggal.startsWith(monthPrefix))
          .map((a) => a.tanggal)
      )
    ).sort((a, b) => b.localeCompare(a));

    return dates.map((tgl) => {
      const dayAtt = teacherAttendances.filter((a) => a.tanggal === tgl);
      const stats = computeTeacherDashboardStats(teachers, dayAtt);
      return { tanggal: tgl, ...stats };
    });
  }, [teacherAttendances, teachers, monthPrefix]);

  const monthlyTeacherRecap = useMemo(() => {
    const rows = teacherAttendances.filter((a) => a.tanggal.startsWith(monthPrefix));
    return buildTeacherRecap(teachers, rows);
  }, [teachers, teacherAttendances, monthPrefix]);

  const yearlyTeacherRecap = useMemo(() => {
    const rows = teacherAttendances.filter((a) => a.tanggal.startsWith(tahun));
    return buildTeacherRecap(teachers, rows);
  }, [teachers, teacherAttendances, tahun]);

  const studentRecap = useMemo(() => {
    const targetStudents = students.filter(
      (s) => classFilter === 'ALL' || s.classId === classFilter
    );
    const targetAtt = studentAttendances.filter(
      (a) =>
        a.tanggal.startsWith(monthPrefix) &&
        (classFilter === 'ALL' || a.classId === classFilter)
    );
    return buildStudentRecap(targetStudents, targetAtt);
  }, [students, studentAttendances, monthPrefix, classFilter]);

  if (dataLoading) return <SkeletonTable rows={6} cols={6} />;

  return (
    <div className="space-y-5">
      <div className="surface-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
            {[
              { id: 'guru_harian', label: 'Guru Harian' },
              { id: 'guru_bulanan', label: 'Guru Bulanan' },
              { id: 'guru_tahunan', label: 'Guru Tahunan' },
              { id: 'siswa', label: 'Rekap Siswa' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as typeof tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  tab === item.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Rekapitulasi Kehadiran Siswa
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tahun Pelajaran {schoolSettings.tahunPelajaranAktif}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {tab !== 'guru_tahunan' && (
            <select
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              aria-label="Pilih bulan rekap"
              className="field-input py-2 w-auto text-xs font-medium"
            >
              {INDONESIAN_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}

          <input
            type="number"
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            aria-label="Tahun rekap"
            className="field-input py-2 w-24 text-xs font-mono"
          />

          {tab === 'siswa' && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              aria-label="Filter kelas rekap"
              className="field-input py-2 w-auto text-xs"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  Kelas {c.namaRombel}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              if (tab === 'guru_bulanan') exportTeacherRecapToExcel(monthlyTeacherRecap, monthPrefix);
              else if (tab === 'guru_tahunan') exportTeacherRecapToExcel(yearlyTeacherRecap, tahun);
              else if (tab === 'siswa') exportStudentRecapToExcel(studentRecap, monthPrefix);
              else exportTeacherRecapToExcel(monthlyTeacherRecap, `Harian_${monthPrefix}`);
            }}
            className="btn-primary"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {tab === 'guru_harian' && isAdmin && (
        <div className="surface-card overflow-hidden">
          {dailyTeacherRecap.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Belum ada rekap harian pada bulan ini"
              description="Data akan muncul otomatis saat guru mencatat kehadiran."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="table-head-cell">Tanggal</th>
                    <th className="table-head-cell text-right">Jumlah Guru</th>
                    <th className="table-head-cell text-right">Hadir</th>
                    <th className="table-head-cell text-right">Terlambat</th>
                    <th className="table-head-cell text-right">Izin</th>
                    <th className="table-head-cell text-right">Sakit</th>
                    <th className="table-head-cell text-right">Dinas</th>
                    <th className="table-head-cell text-right">Alpa</th>
                    <th className="table-head-cell text-right">Belum Absen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-xs tabular-nums">
                  {dailyTeacherRecap.map((r) => (
                    <tr
                      key={r.tanggal}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="table-body-cell font-semibold">{r.tanggal}</td>
                      <td className="table-body-cell text-right">{r.totalGuru}</td>
                      <td className="table-body-cell text-right text-emerald-700 dark:text-emerald-400 font-bold">
                        {r.hadir}
                      </td>
                      <td className="table-body-cell text-right text-amber-600">{r.terlambat}</td>
                      <td className="table-body-cell text-right text-sky-600">{r.izin}</td>
                      <td className="table-body-cell text-right text-orange-600">{r.sakit}</td>
                      <td className="table-body-cell text-right text-indigo-600">{r.dinas}</td>
                      <td className="table-body-cell text-right text-rose-600">{r.alpa}</td>
                      <td className="table-body-cell text-right text-slate-500">{r.belumAbsen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(tab === 'guru_bulanan' || tab === 'guru_tahunan') && isAdmin && (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="table-head-cell">Nama Guru</th>
                  <th className="table-head-cell text-right">Hadir</th>
                  <th className="table-head-cell text-right">Terlambat</th>
                  <th className="table-head-cell text-right">Izin</th>
                  <th className="table-head-cell text-right">Sakit</th>
                  <th className="table-head-cell text-right">Dinas</th>
                  <th className="table-head-cell text-right">Alpa</th>
                  <th className="table-head-cell text-right">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {(tab === 'guru_bulanan' ? monthlyTeacherRecap : yearlyTeacherRecap).map((r) => (
                  <tr
                    key={r.teacherId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="table-body-cell font-semibold text-slate-900 dark:text-white">
                      {r.namaLengkap}
                    </td>
                    <td className="table-body-cell text-right font-mono tabular-nums">{r.hadir}</td>
                    <td className="table-body-cell text-right font-mono tabular-nums">
                      {r.terlambat}
                    </td>
                    <td className="table-body-cell text-right font-mono tabular-nums">{r.izin}</td>
                    <td className="table-body-cell text-right font-mono tabular-nums">{r.sakit}</td>
                    <td className="table-body-cell text-right font-mono tabular-nums">{r.dinas}</td>
                    <td className="table-body-cell text-right font-mono tabular-nums">{r.alpa}</td>
                    <td className="table-body-cell text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {r.persentase}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'siswa' && (
        <div className="surface-card overflow-hidden">
          {studentRecap.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Belum ada data rekap siswa"
              description="Data akan terisi otomatis setelah absensi siswa disimpan."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="table-head-cell">Nama Siswa</th>
                    <th className="table-head-cell">NIS / NISN</th>
                    <th className="table-head-cell">Kelas</th>
                    <th className="table-head-cell text-right">H</th>
                    <th className="table-head-cell text-right">S</th>
                    <th className="table-head-cell text-right">I</th>
                    <th className="table-head-cell text-right">A</th>
                    <th className="table-head-cell text-right">D</th>
                    <th className="table-head-cell text-right">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {studentRecap.map((r) => (
                    <tr
                      key={r.studentId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="table-body-cell font-semibold text-slate-900 dark:text-white">
                        {r.namaLengkap}
                      </td>
                      <td className="table-body-cell font-mono text-xs tabular-nums">
                        {r.nis} / {r.nisn}
                      </td>
                      <td className="table-body-cell">{r.kelasNama}</td>
                      <td className="table-body-cell text-right font-mono tabular-nums">{r.hadir}</td>
                      <td className="table-body-cell text-right font-mono tabular-nums">{r.sakit}</td>
                      <td className="table-body-cell text-right font-mono tabular-nums">{r.izin}</td>
                      <td className="table-body-cell text-right font-mono tabular-nums">{r.alpa}</td>
                      <td className="table-body-cell text-right font-mono tabular-nums">
                        {r.dispensasi}
                      </td>
                      <td className="table-body-cell text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {r.persentase}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
