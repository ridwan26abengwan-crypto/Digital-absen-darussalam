import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ClipboardCheck, Download, Edit, Plus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useToast } from '../../contexts/ToastContext';
import {
  adminUpdateTeacherAttendance,
  submitTeacherAttendance,
} from '../../services/firestoreService';
import type { TeacherAttendance, TeacherAttendanceStatus } from '../../types';
import {
  formatJamHHmm,
  formatTanggalISO,
} from '../../utils/attendanceLogic';
import { exportTeacherAttendanceToExcel } from '../../utils/excelUtils';
import { EmptyState, SkeletonTable, StatusLabel } from '../../components/UiStates';

export const AdminAbsensiGuruPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { teachers, teacherAttendances, dataLoading } = useSchoolData();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(formatTanggalISO(new Date()));
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualTeacherId, setManualTeacherId] = useState('');
  const [manualStatus, setManualStatus] = useState<TeacherAttendanceStatus>('HADIR');
  const [manualJamMasuk, setManualJamMasuk] = useState(formatJamHHmm(new Date()));
  const [manualKet, setManualKet] = useState('');

  const [editRecord, setEditRecord] = useState<TeacherAttendance | null>(null);
  const [editStatus, setEditStatus] = useState<TeacherAttendanceStatus>('HADIR');
  const [editJamMasuk, setEditJamMasuk] = useState('');
  const [editJamPulang, setEditJamPulang] = useState('');
  const [editKet, setEditKet] = useState('');

  const rowsForDate = useMemo(() => {
    return teacherAttendances
      .filter((a) => (!selectedDate || a.tanggal === selectedDate))
      .filter((a) => statusFilter === 'ALL' || a.status === statusFilter);
  }, [teacherAttendances, selectedDate, statusFilter]);

  const missingTeachers = useMemo(() => {
    const recordedIds = new Set(
      teacherAttendances.filter((a) => a.tanggal === selectedDate).map((a) => a.teacherId)
    );
    return teachers.filter((t) => t.statusAkun === 'ACTIVE' && !recordedIds.has(t.teacherId));
  }, [teachers, teacherAttendances, selectedDate]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    const teacher = teachers.find((t) => t.teacherId === manualTeacherId);
    if (!teacher) {
      showToast('Pilih guru terlebih dahulu.', 'error');
      return;
    }

    const res = await submitTeacherAttendance({
      teacherId: teacher.teacherId,
      userId: teacher.userId || userProfile.uid,
      namaGuru: teacher.namaLengkap,
      nip: teacher.nip,
      tanggal: selectedDate,
      jamMasuk: manualJamMasuk,
      status: manualStatus,
      keterangan: manualKet,
      deviceInfo: 'Input Admin',
      actorRole: 'ADMIN',
    });

    if (res === 'duplicate') {
      showToast('ABSENSI HARI INI SUDAH TERCATAT untuk guru tersebut.', 'warning');
    } else {
      showToast('Absensi guru berhasil dicatat.', 'success');
      setManualModalOpen(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord || !userProfile) return;
    await adminUpdateTeacherAttendance(
      editRecord.attendanceId,
      {
        status: editStatus,
        jamMasuk: editJamMasuk,
        jamPulang: editJamPulang,
        keterangan: editKet,
      },
      { user: userProfile.nama, uid: userProfile.uid, role: userProfile.role }
    );
    showToast('Catatan absensi guru berhasil diperbarui.', 'success');
    setEditRecord(null);
  };

  return (
    <div className="space-y-5">
      <div className="surface-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Pilih tanggal absensi guru"
              className="field-input pl-10 py-2 font-mono w-auto"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter status kehadiran"
            className="field-input py-2 w-auto min-w-[170px]"
          >
            <option value="ALL">Semua Status</option>
            <option value="HADIR">HADIR</option>
            <option value="TERLAMBAT">TERLAMBAT</option>
            <option value="IZIN">IZIN</option>
            <option value="SAKIT">SAKIT</option>
            <option value="DINAS">DINAS</option>
            <option value="ALPA">ALPA</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportTeacherAttendanceToExcel(
                rowsForDate,
                `Absensi_Guru_${selectedDate || 'Semua'}.xlsx`
              )
            }
            className="btn-secondary"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => {
              setManualTeacherId(missingTeachers[0]?.teacherId ?? teachers[0]?.teacherId ?? '');
              setManualJamMasuk(formatJamHHmm(new Date()));
              setManualKet('');
              setManualModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Catat Absensi
          </button>
        </div>
      </div>

      {missingTeachers.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/80 dark:bg-amber-950/35 px-4 py-3.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <strong className="font-semibold">{missingTeachers.length} Guru Belum Absen</strong> pada tanggal{' '}
          <span className="font-mono font-semibold">{selectedDate}</span>:{' '}
          {missingTeachers.map((t) => t.namaLengkap).join(', ')}
        </div>
      )}

      {dataLoading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : rowsForDate.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Belum ada absensi guru pada tanggal ini"
          description="Absensi yang dikirim guru dari HP atau laptop akan tampil otomatis di sini secara realtime."
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="table-head-cell">Nama Guru</th>
                  <th className="table-head-cell">Tanggal</th>
                  <th className="table-head-cell">Masuk</th>
                  <th className="table-head-cell">Pulang</th>
                  <th className="table-head-cell">Status</th>
                  <th className="table-head-cell">Keterangan</th>
                  <th className="table-head-cell text-right">Koreksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {rowsForDate.map((r) => (
                  <tr
                    key={r.attendanceId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="table-body-cell font-semibold text-slate-900 dark:text-white">
                      {r.namaGuru}
                    </td>
                    <td className="table-body-cell font-mono text-xs tabular-nums">{r.tanggal}</td>
                    <td className="table-body-cell font-mono text-xs tabular-nums">{r.jamMasuk}</td>
                    <td className="table-body-cell font-mono text-xs tabular-nums">
                      {r.jamPulang || '-'}
                    </td>
                    <td className="table-body-cell">
                      <StatusLabel
                        status={r.status}
                        variant={
                          r.status === 'HADIR'
                            ? 'emerald'
                            : r.status === 'TERLAMBAT' || r.status === 'SAKIT'
                              ? 'amber'
                              : r.status === 'ALPA'
                                ? 'rose'
                                : 'sky'
                        }
                      />
                    </td>
                    <td className="table-body-cell text-xs text-slate-600 dark:text-slate-300">
                      {r.keterangan || '-'}
                    </td>
                    <td className="table-body-cell text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditRecord(r);
                          setEditStatus(r.status);
                          setEditJamMasuk(r.jamMasuk);
                          setEditJamPulang(r.jamPulang ?? '');
                          setEditKet(r.keterangan ?? '');
                        }}
                        aria-label={`Edit absensi ${r.namaGuru}`}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Record Modal */}
      {manualModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md surface-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Catat Absensi Guru ({selectedDate})
              </h3>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                aria-label="Tutup modal"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleManualSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Guru
                </label>
                <select
                  value={manualTeacherId}
                  onChange={(e) => setManualTeacherId(e.target.value)}
                  className="field-input"
                  required
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map((t) => (
                    <option key={t.teacherId} value={t.teacherId}>
                      {t.namaLengkap}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Status
                  </label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as TeacherAttendanceStatus)}
                    className="field-input"
                  >
                    <option value="HADIR">HADIR</option>
                    <option value="TERLAMBAT">TERLAMBAT</option>
                    <option value="IZIN">IZIN</option>
                    <option value="SAKIT">SAKIT</option>
                    <option value="DINAS">DINAS</option>
                    <option value="ALPA">ALPA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Jam Masuk
                  </label>
                  <input
                    type="time"
                    value={manualJamMasuk}
                    onChange={(e) => setManualJamMasuk(e.target.value)}
                    className="field-input font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Keterangan
                </label>
                <input
                  value={manualKet}
                  onChange={(e) => setManualKet(e.target.value)}
                  placeholder="Catatan opsional"
                  className="field-input"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editRecord && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md surface-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Koreksi Absensi: {editRecord.namaGuru}
              </h3>
              <button
                type="button"
                onClick={() => setEditRecord(null)}
                aria-label="Tutup modal koreksi"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TeacherAttendanceStatus)}
                  className="field-input"
                >
                  <option value="HADIR">HADIR</option>
                  <option value="TERLAMBAT">TERLAMBAT</option>
                  <option value="IZIN">IZIN</option>
                  <option value="SAKIT">SAKIT</option>
                  <option value="DINAS">DINAS</option>
                  <option value="ALPA">ALPA</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Jam Masuk
                  </label>
                  <input
                    type="time"
                    value={editJamMasuk}
                    onChange={(e) => setEditJamMasuk(e.target.value)}
                    className="field-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Jam Pulang
                  </label>
                  <input
                    type="time"
                    value={editJamPulang}
                    onChange={(e) => setEditJamPulang(e.target.value)}
                    className="field-input font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Keterangan
                </label>
                <input
                  value={editKet}
                  onChange={(e) => setEditKet(e.target.value)}
                  className="field-input"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditRecord(null)}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
