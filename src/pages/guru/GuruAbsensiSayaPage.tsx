import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Clock, LogOut as CheckoutIcon } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useToast } from '../../contexts/ToastContext';
import {
  checkOutTeacherAttendance,
  submitTeacherAttendance,
} from '../../services/firestoreService';
import type { TeacherAttendanceStatus } from '../../types';
import {
  determineTeacherAttendanceStatus,
  formatJamHHmm,
  formatTanggalIndonesia,
  formatTanggalISO,
} from '../../utils/attendanceLogic';
import { teacherAttendanceSchema } from '../../utils/validationSchemas';
import { SkeletonTable, StatusLabel } from '../../components/UiStates';

type AttendanceFormValues = z.infer<typeof teacherAttendanceSchema>;

export const GuruAbsensiSayaPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { teachers, teacherAttendances, schoolSettings, dataLoading } = useSchoolData();
  const { showToast } = useToast();

  const [submitting, setSubmitting] = useState(false);

  const today = formatTanggalISO(new Date());
  const nowTime = formatJamHHmm(new Date());

  const myTeacher = useMemo(
    () =>
      teachers.find(
        (t) => t.teacherId === userProfile?.teacherId || t.userId === userProfile?.uid
      ),
    [teachers, userProfile]
  );

  const todayRecord = useMemo(
    () => teacherAttendances.find((a) => a.tanggal === today),
    [teacherAttendances, today]
  );

  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(teacherAttendanceSchema),
    defaultValues: {
      status: 'HADIR',
      keterangan: '',
    },
  });

  const onSubmit = async (values: AttendanceFormValues) => {
    if (!userProfile || !myTeacher) {
      showToast('Profil Guru Anda belum ditautkan oleh Admin. Hubungi Admin Madrasah.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const jamMasuk = formatJamHHmm(new Date());
      const finalStatus = determineTeacherAttendanceStatus(
        jamMasuk,
        schoolSettings.jamMasukBatas || '07:15',
        values.status as TeacherAttendanceStatus
      );

      const res = await submitTeacherAttendance({
        teacherId: myTeacher.teacherId,
        userId: userProfile.uid,
        namaGuru: myTeacher.namaLengkap,
        nip: myTeacher.nip,
        tanggal: today,
        jamMasuk,
        status: finalStatus,
        keterangan: values.keterangan ?? '',
        deviceInfo: navigator.userAgent.slice(0, 100),
        actorRole: userProfile.role,
      });

      if (res === 'duplicate') {
        showToast('ABSENSI HARI INI SUDAH TERCATAT', 'warning');
      } else {
        showToast(
          `Absensi berhasil dicatat (${finalStatus} · ${jamMasuk}) dan tersinkron ke Admin.`,
          'success'
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengirim absensi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (!todayRecord || !userProfile) return;
    setSubmitting(true);
    try {
      const jamPulang = formatJamHHmm(new Date());
      await checkOutTeacherAttendance({
        attendanceId: todayRecord.attendanceId,
        jamPulang,
        actor: {
          user: userProfile.nama,
          uid: userProfile.uid,
          role: userProfile.role,
        },
      });
      showToast(`Jam pulang berhasil dicatat pukul ${jamPulang}.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mencatat jam pulang.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (dataLoading) return <SkeletonTable rows={5} cols={4} />;

  return (
    <div className="space-y-6">
      <div className="surface-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Absensi Kehadiran Guru
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formatTanggalIndonesia(today)} · Batas Jam Masuk:{' '}
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                {schoolSettings.jamMasukBatas} WIB
              </span>
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums self-start sm:self-auto">
            <Clock className="w-4 h-4" />
            {nowTime} WIB
          </div>
        </div>

        {!myTeacher ? (
          <div className="mt-5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200">
            Akun Anda belum terhubung ke profil Data Guru. Silakan hubungi Admin Madrasah untuk
            menautkan akun Anda.
          </div>
        ) : todayRecord ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/70 bg-emerald-50/70 dark:bg-emerald-950/30 p-5">
              <p className="font-display text-xs font-extrabold tracking-wide text-emerald-800 dark:text-emerald-300 uppercase">
                ABSENSI HARI INI SUDAH TERCATAT
              </p>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                  <p className="mt-0.5 font-bold text-slate-900 dark:text-white">
                    {todayRecord.status}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Jam Masuk</p>
                  <p className="mt-0.5 font-mono font-semibold tabular-nums">
                    {todayRecord.jamMasuk}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Jam Pulang</p>
                  <p className="mt-0.5 font-mono font-semibold tabular-nums">
                    {todayRecord.jamPulang || 'Belum pulang'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Keterangan</p>
                  <p className="mt-0.5">{todayRecord.keterangan || '-'}</p>
                </div>
              </div>
            </div>

            {!todayRecord.jamPulang && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleCheckout}
                className="btn-primary"
              >
                <CheckoutIcon className="w-4 h-4" />
                {submitting ? 'Menyimpan...' : 'Catat Jam Pulang Sekarang'}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Pilih Status Kehadiran
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {(['HADIR', 'IZIN', 'SAKIT', 'DINAS', 'ALPA'] as const).map((st) => {
                  const selected = form.watch('status') === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => form.setValue('status', st)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all duration-150 cursor-pointer ${
                        selected
                          ? 'border-emerald-700 bg-emerald-700 text-white shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Keterangan / Catatan (Opsional)
              </label>
              <textarea
                rows={2}
                {...form.register('keterangan')}
                placeholder="Tambahkan alasan jika izin/sakit/dinas luar..."
                className="field-input"
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary px-6 py-3">
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Mengirim ke Cloud...' : 'Kirim Absensi Sekarang'}
            </button>
          </form>
        )}
      </div>

      {/* Personal Attendance History */}
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Riwayat Kehadiran Saya
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="table-head-cell">Tanggal</th>
                <th className="table-head-cell">Jam Masuk</th>
                <th className="table-head-cell">Jam Pulang</th>
                <th className="table-head-cell">Status</th>
                <th className="table-head-cell">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {teacherAttendances.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-xs text-slate-500 dark:text-slate-400"
                  >
                    Belum ada riwayat absensi.
                  </td>
                </tr>
              ) : (
                teacherAttendances.map((r) => (
                  <tr
                    key={r.attendanceId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
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
                    <td className="table-body-cell text-xs text-slate-500 dark:text-slate-400">
                      {r.keterangan || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
