import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  BookOpen,
  Clock,
  FileText,
  GraduationCap,
  UserCheck,
  Users,
} from 'lucide-react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  computeStudentDashboardStats,
  computeTeacherDashboardStats,
  formatTanggalIndonesia,
  formatTanggalISO,
} from '../../utils/attendanceLogic';
import { SkeletonTable, StatusLabel } from '../../components/UiStates';

export const AdminDashboardPage: React.FC = () => {
  const {
    teachers,
    students,
    classes,
    teacherAttendances,
    studentAttendances,
    schoolSettings,
    dataLoading,
  } = useSchoolData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const today = formatTanggalISO(new Date());

  const todayTeacherAtt = useMemo(
    () => teacherAttendances.filter((a) => a.tanggal === today),
    [teacherAttendances, today]
  );

  const todayStudentAtt = useMemo(
    () => studentAttendances.filter((a) => a.tanggal === today),
    [studentAttendances, today]
  );

  const teacherStats = useMemo(
    () => computeTeacherDashboardStats(teachers, todayTeacherAtt),
    [teachers, todayTeacherAtt]
  );

  const studentStats = useMemo(
    () => computeStudentDashboardStats(students, todayStudentAtt),
    [students, todayStudentAtt]
  );

  const teacherPresentCount = teacherStats.hadir + teacherStats.terlambat + teacherStats.dinas;
  const teacherAttendancePct =
    teacherStats.totalGuru > 0
      ? Math.round((teacherPresentCount / teacherStats.totalGuru) * 100)
      : 0;
  const studentAttendancePct =
    studentStats.totalSiswa > 0
      ? Math.round(((studentStats.hadir + studentStats.dispensasi) / studentStats.totalSiswa) * 100)
      : 0;

  const teacherChartData = useMemo(
    () => [
      { name: 'Hadir', jumlah: teacherStats.hadir, fill: '#059669' },
      { name: 'Terlambat', jumlah: teacherStats.terlambat, fill: '#D97706' },
      { name: 'Izin', jumlah: teacherStats.izin, fill: '#0284C7' },
      { name: 'Sakit', jumlah: teacherStats.sakit, fill: '#EA580C' },
      { name: 'Dinas', jumlah: teacherStats.dinas, fill: '#4F46E5' },
      { name: 'Alpa', jumlah: teacherStats.alpa, fill: '#DC2626' },
      { name: 'Belum', jumlah: teacherStats.belumAbsen, fill: '#64748B' },
    ],
    [teacherStats]
  );

  const classRecapChartData = useMemo(() => {
    return classes.map((cls) => {
      const classAtt = todayStudentAtt.filter((a) => a.classId === cls.classId);
      const hadir = classAtt.filter((a) => a.status === 'H' || a.status === 'D').length;
      const tidakHadir = classAtt.filter(
        (a) => a.status === 'S' || a.status === 'I' || a.status === 'A'
      ).length;
      return {
        kelas: cls.namaRombel,
        Hadir: hadir,
        TidakHadir: tidakHadir,
      };
    });
  }, [classes, todayStudentAtt]);

  const monthlyTrendData = useMemo(() => {
    const byMonth = new Map<string, { total: number; present: number }>();
    for (const att of teacherAttendances) {
      const monthKey = att.tanggal.slice(0, 7);
      const curr = byMonth.get(monthKey) ?? { total: 0, present: 0 };
      curr.total += 1;
      if (att.status === 'HADIR' || att.status === 'TERLAMBAT' || att.status === 'DINAS') {
        curr.present += 1;
      }
      byMonth.set(monthKey, curr);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, val]) => ({
        bulan: month,
        persentase: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
        jumlah: val.total,
      }));
  }, [teacherAttendances]);

  const liveActivity = useMemo(() => {
    return [...todayTeacherAtt]
      .sort((a, b) => (b.jamMasuk || '').localeCompare(a.jamMasuk || ''))
      .slice(0, 7);
  }, [todayTeacherAtt]);

  const gridStroke = isDark ? '#1e293b' : '#e2e8f0';
  const axisTickStyle = { fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' };
  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#1e293b' : '#e2e8f0',
    borderRadius: '12px',
    fontSize: '12px',
    color: isDark ? '#f1f5f9' : '#0f172a',
  };

  if (dataLoading) {
    return <SkeletonTable rows={6} cols={4} />;
  }

  return (
    <div className="space-y-6">
      {/* Executive Header Strip */}
      <div className="surface-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {schoolSettings.namaMadrasah} · TP {schoolSettings.tahunPelajaranAktif}
          </p>
          <h2 className="mt-1 font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Ringkasan Kehadiran Harian
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {formatTanggalIndonesia(today)} · Batas masuk guru pukul{' '}
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
              {schoolSettings.jamMasukBatas} WIB
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link to="/admin/absensi-guru" className="btn-secondary">
            <Users className="w-4 h-4" />
            Monitor Guru
          </Link>
          <Link to="/admin/laporan" className="btn-primary">
            <FileText className="w-4 h-4" />
            Cetak Laporan
          </Link>
        </div>
      </div>

      {/* 4 Proportional Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="surface-card p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Kehadiran Guru Hari Ini
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {teacherPresentCount}
                </span>
                <span className="font-mono text-sm text-slate-400 tabular-nums">
                  / {teacherStats.totalGuru} guru
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            <span>Hadir {teacherStats.hadir} · Telat {teacherStats.terlambat}</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {teacherAttendancePct}%
            </span>
          </div>
        </div>

        <div className="surface-card p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Guru Belum Absen
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {teacherStats.belumAbsen}
                </span>
                <span className="text-xs font-medium text-slate-400">guru aktif</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            <span>Izin {teacherStats.izin} · Sakit {teacherStats.sakit} · Alpa {teacherStats.alpa}</span>
          </div>
        </div>

        <div className="surface-card p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Kehadiran Siswa Hari Ini
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {studentStats.hadir}
                </span>
                <span className="font-mono text-sm text-slate-400 tabular-nums">
                  / {studentStats.totalSiswa} siswa
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            <span>S {studentStats.sakit} · I {studentStats.izin} · A {studentStats.alpa} · D {studentStats.dispensasi}</span>
            <span className="font-bold text-sky-700 dark:text-sky-400">
              {studentAttendancePct}%
            </span>
          </div>
        </div>

        <div className="surface-card p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Rombel &amp; Data Induk
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {classes.length}
                </span>
                <span className="text-xs font-medium text-slate-400">rombel (1–6)</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums">
              {studentStats.totalSiswa} Siswa · {teacherStats.totalGuru} Guru
            </span>
            <Link
              to="/admin/rekap"
              className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Rekap <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Charts + Live Activity (8:4 Proportional Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 surface-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Distribusi Absensi Guru Hari Ini
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pembaruan otomatis secara realtime dari seluruh perangkat guru
              </p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teacherChartData} barSize={34}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={axisTickStyle} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={axisTickStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? '#1e293b' : '#f1f5f9', opacity: 0.5 }} />
                <Bar dataKey="jumlah" name="Jumlah Guru" radius={[8, 8, 0, 0]}>
                  {teacherChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 surface-card p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Aktivitas Terbaru
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Absensi masuk hari ini</p>
            </div>
            <Link
              to="/admin/absensi-guru"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              Semua
            </Link>
          </div>

          <div className="mt-2 flex-1 divide-y divide-slate-100 dark:divide-slate-800/80">
            {liveActivity.length === 0 ? (
              <div className="h-full min-h-[200px] flex items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400 px-4">
                Belum ada guru yang mencatat absensi hari ini.
              </div>
            ) : (
              liveActivity.map((item) => {
                const variant =
                  item.status === 'HADIR'
                    ? 'emerald'
                    : item.status === 'TERLAMBAT' || item.status === 'SAKIT'
                      ? 'amber'
                      : item.status === 'ALPA'
                        ? 'rose'
                        : 'sky';
                return (
                  <div
                    key={item.attendanceId}
                    className="py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.namaGuru}
                      </p>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        Masuk {item.jamMasuk}
                        {item.jamPulang ? ` · Pulang ${item.jamPulang}` : ''}
                      </p>
                    </div>
                    <StatusLabel status={item.status} variant={variant} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Charts Row (6:6 Proportional Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-card p-5 sm:p-6">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Rekap Absensi Siswa per Rombel
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Perbandingan kehadiran siswa hari ini di setiap kelas
          </p>
          <div className="mt-4 h-64 w-full">
            {classRecapChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                Tambahkan kelas / rombel untuk melihat grafik per kelas.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classRecapChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="kelas" tick={axisTickStyle} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axisTickStyle} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Hadir" fill="#059669" radius={[6, 6, 0, 0]} />
                  <Bar
                    dataKey="TidakHadir"
                    name="Tidak Hadir (S/I/A)"
                    fill="#DC2626"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="surface-card p-5 sm:p-6">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Tren Persentase Kehadiran Guru Bulanan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Akumulasi kehadiran guru pada Cloud Firestore
          </p>
          <div className="mt-4 h-64 w-full">
            {monthlyTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                Belum ada histori bulanan untuk ditampilkan.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="bulan" tick={axisTickStyle} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    tick={axisTickStyle}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="persentase"
                    name="Kehadiran (%)"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#059669' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
