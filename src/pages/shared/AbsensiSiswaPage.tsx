import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CalendarCheck, Check, Download, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useToast } from '../../contexts/ToastContext';
import { saveStudentAttendanceBatch } from '../../services/firestoreService';
import type { StudentAttendanceStatus } from '../../types';
import { formatTanggalISO } from '../../utils/attendanceLogic';
import { exportStudentAttendanceToExcel } from '../../utils/excelUtils';
import { EmptyState, SkeletonTable } from '../../components/UiStates';

const STATUS_OPTIONS: Array<{ value: StudentAttendanceStatus; label: string; short: string }> = [
  { value: 'H', label: 'Hadir', short: 'H' },
  { value: 'S', label: 'Sakit', short: 'S' },
  { value: 'I', label: 'Izin', short: 'I' },
  { value: 'A', label: 'Alpa', short: 'A' },
  { value: 'D', label: 'Dispensasi', short: 'D' },
];

export const AbsensiSiswaPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { classes, students, studentAttendances, dataLoading } = useSchoolData();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(formatTanggalISO(new Date()));
  const [selectedClassId, setSelectedClassId] = useState('');
  const [draftStatuses, setDraftStatuses] = useState<
    Record<string, { status: StudentAttendanceStatus; keterangan: string }>
  >({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].classId);
    }
  }, [classes, selectedClassId]);

  const classStudents = useMemo(() => {
    return students
      .filter((s) => s.status === 'AKTIF' && (!selectedClassId || s.classId === selectedClassId))
      .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
  }, [students, selectedClassId]);

  const existingMap = useMemo(() => {
    const map = new Map<string, { status: StudentAttendanceStatus; keterangan: string }>();
    for (const att of studentAttendances) {
      if (att.tanggal === selectedDate && (!selectedClassId || att.classId === selectedClassId)) {
        map.set(att.studentId, { status: att.status, keterangan: att.keterangan ?? '' });
      }
    }
    return map;
  }, [studentAttendances, selectedDate, selectedClassId]);

  useEffect(() => {
    const initial: Record<string, { status: StudentAttendanceStatus; keterangan: string }> = {};
    for (const st of classStudents) {
      const existing = existingMap.get(st.studentId);
      initial[st.studentId] = existing ?? { status: 'H', keterangan: '' };
    }
    setDraftStatuses(initial);
  }, [classStudents, existingMap]);

  const setAllStatus = (status: StudentAttendanceStatus) => {
    const next: Record<string, { status: StudentAttendanceStatus; keterangan: string }> = {};
    for (const st of classStudents) {
      next[st.studentId] = {
        status,
        keterangan: draftStatuses[st.studentId]?.keterangan ?? '',
      };
    }
    setDraftStatuses(next);
  };

  const handleSave = async () => {
    if (!userProfile || classStudents.length === 0) return;
    setSaving(true);
    try {
      const entries = classStudents.map((student) => ({
        student,
        tanggal: selectedDate,
        status: draftStatuses[student.studentId]?.status ?? 'H',
        keterangan: draftStatuses[student.studentId]?.keterangan ?? '',
      }));

      await saveStudentAttendanceBatch(entries, {
        teacherId: userProfile.teacherId || userProfile.uid,
        teacherUid: userProfile.uid,
        namaGuru: userProfile.nama,
        role: userProfile.role,
      });

      showToast(
        `Absensi ${entries.length} siswa pada ${selectedDate} berhasil disimpan ke cloud.`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan absensi siswa.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const todaySavedRows = useMemo(() => {
    return studentAttendances.filter(
      (a) => a.tanggal === selectedDate && (!selectedClassId || a.classId === selectedClassId)
    );
  }, [studentAttendances, selectedDate, selectedClassId]);

  return (
    <div className="space-y-5">
      <div className="surface-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Pilih tanggal absensi siswa"
              className="field-input pl-10 py-2 font-mono w-auto"
            />
          </div>

          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            aria-label="Pilih kelas"
            className="field-input py-2 w-auto min-w-[210px]"
          >
            {classes.length === 0 && <option value="">Belum ada kelas</option>}
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                Kelas {c.namaRombel} ({c.waliKelasNama || 'Tanpa Wali'})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setAllStatus('H')} className="btn-secondary">
            <Check className="w-4 h-4 text-emerald-600" />
            Tandai Semua Hadir
          </button>
          <button
            type="button"
            onClick={() =>
              exportStudentAttendanceToExcel(
                todaySavedRows,
                `Absensi_Siswa_${selectedDate}.xlsx`
              )
            }
            className="btn-secondary"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            type="button"
            disabled={saving || classStudents.length === 0}
            onClick={handleSave}
            className="btn-primary"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Absensi'}
          </button>
        </div>
      </div>

      {dataLoading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Belum ada kelas yang ditugaskan"
          description={
            userProfile?.role === 'ADMIN'
              ? 'Buat kelas terlebih dahulu di menu Kelas / Rombel sebelum mencatat absensi siswa.'
              : 'Hubungi Admin Madrasah untuk menetapkan Anda sebagai Wali Kelas pada rombel tertentu.'
          }
        />
      ) : classStudents.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Belum ada siswa aktif di kelas ini"
          description="Tambahkan data siswa pada kelas yang dipilih terlebih dahulu."
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span>
              Keterangan: <strong>H</strong> Hadir · <strong>S</strong> Sakit ·{' '}
              <strong>I</strong> Izin · <strong>A</strong> Alpa · <strong>D</strong> Dispensasi
            </span>
            <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
              Tercatat di Cloud: {existingMap.size} / {classStudents.length} siswa
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="table-head-cell w-12">No</th>
                  <th className="table-head-cell">NIS</th>
                  <th className="table-head-cell">Nama Siswa</th>
                  <th className="table-head-cell">Status Kehadiran</th>
                  <th className="table-head-cell">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {classStudents.map((st, idx) => {
                  const curr = draftStatuses[st.studentId] ?? { status: 'H', keterangan: '' };
                  return (
                    <tr
                      key={st.studentId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="table-body-cell font-mono text-xs text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="table-body-cell font-mono text-xs tabular-nums">{st.nis}</td>
                      <td className="table-body-cell font-semibold text-slate-900 dark:text-white">
                        {st.namaLengkap}
                      </td>
                      <td className="table-body-cell">
                        <div className="flex items-center gap-1.5">
                          {STATUS_OPTIONS.map((opt) => {
                            const active = curr.status === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                title={opt.label}
                                onClick={() =>
                                  setDraftStatuses((prev) => ({
                                    ...prev,
                                    [st.studentId]: { ...curr, status: opt.value },
                                  }))
                                }
                                className={`min-w-[38px] h-9 px-2.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                                  active
                                    ? opt.value === 'H'
                                      ? 'bg-emerald-700 text-white shadow-2xs'
                                      : opt.value === 'S'
                                        ? 'bg-amber-600 text-white shadow-2xs'
                                        : opt.value === 'I'
                                          ? 'bg-sky-600 text-white shadow-2xs'
                                          : opt.value === 'A'
                                            ? 'bg-rose-600 text-white shadow-2xs'
                                            : 'bg-indigo-600 text-white shadow-2xs'
                                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                {opt.short}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="table-body-cell">
                        <input
                          type="text"
                          value={curr.keterangan}
                          onChange={(e) =>
                            setDraftStatuses((prev) => ({
                              ...prev,
                              [st.studentId]: { ...curr, keterangan: e.target.value },
                            }))
                          }
                          placeholder="Catatan opsional..."
                          aria-label={`Keterangan ${st.namaLengkap}`}
                          className="field-input py-1.5 min-w-[160px] text-xs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
