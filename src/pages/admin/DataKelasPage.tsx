import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Download, Edit, Plus, Trash2, X } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useToast } from '../../contexts/ToastContext';
import { deleteSchoolClass, saveSchoolClass } from '../../services/firestoreService';
import type { SchoolClass } from '../../types';
import { exportClassesToExcel } from '../../utils/excelUtils';
import { classFormSchema } from '../../utils/validationSchemas';
import { EmptyState, SkeletonTable } from '../../components/UiStates';

type ClassFormValues = z.infer<typeof classFormSchema>;

export const DataKelasPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { classes, teachers, students, schoolSettings, dataLoading } = useSchoolData();
  const { showToast, confirm } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      namaRombel: '',
      kelas: 1,
      tahunPelajaran: schoolSettings.tahunPelajaranAktif || '2026/2027',
      waliKelasId: '',
      kapasitas: 28,
    },
  });

  const openAdd = () => {
    setEditingClass(null);
    form.reset({
      namaRombel: '',
      kelas: 1,
      tahunPelajaran: schoolSettings.tahunPelajaranAktif || '2026/2027',
      waliKelasId: '',
      kapasitas: 28,
    });
    setModalOpen(true);
  };

  const openEdit = (cls: SchoolClass) => {
    setEditingClass(cls);
    form.reset({
      namaRombel: cls.namaRombel,
      kelas: cls.kelas,
      tahunPelajaran: cls.tahunPelajaran,
      waliKelasId: cls.waliKelasId ?? '',
      kapasitas: cls.kapasitas,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: ClassFormValues) => {
    if (!userProfile) return;
    const wali = teachers.find((t) => t.teacherId === values.waliKelasId);
    setSaving(true);
    try {
      await saveSchoolClass(
        {
          classId: editingClass?.classId,
          namaRombel: values.namaRombel,
          kelas: values.kelas,
          tahunPelajaran: values.tahunPelajaran,
          waliKelasId: wali?.teacherId ?? '',
          waliKelasUid: wali?.userId ?? '',
          waliKelasNama: wali?.namaLengkap ?? '',
          kapasitas: values.kapasitas,
        },
        { user: userProfile.nama, uid: userProfile.uid, role: userProfile.role }
      );
      showToast(
        editingClass ? 'Data kelas berhasil diperbarui.' : 'Kelas / rombel baru berhasil dibuat.',
        'success'
      );
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan data kelas', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cls: SchoolClass) => {
    if (!userProfile) return;
    const ok = await confirm({
      title: 'Hapus Kelas / Rombel',
      description: `Hapus rombel ${cls.namaRombel}? Pastikan tidak ada siswa aktif di rombel ini.`,
      confirmLabel: 'Hapus',
      danger: true,
    });
    if (!ok) return;
    await deleteSchoolClass(cls, {
      user: userProfile.nama,
      uid: userProfile.uid,
      role: userProfile.role,
    });
    showToast('Rombel berhasil dihapus.', 'success');
  };

  return (
    <div className="space-y-5">
      <div className="surface-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Manajemen Kelas &amp; Rombongan Belajar (Kelas 1 – 6)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Atur tingkat kelas, wali kelas, dan kapasitas rombel aktif.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => exportClassesToExcel(classes)}
            className="btn-secondary"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Tambah Kelas
          </button>
        </div>
      </div>

      {dataLoading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada rombongan belajar"
          description="Buat kelas 1 sampai 6 beserta wali kelas agar siswa dapat didaftarkan dan diabsen."
          actionLabel="Tambah Kelas Pertama"
          onAction={openAdd}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => {
            const count = students.filter(
              (s) => s.classId === cls.classId && s.status === 'AKTIF'
            ).length;
            const ratio = cls.kapasitas > 0 ? Math.min(100, Math.round((count / cls.kapasitas) * 100)) : 0;
            return (
              <div
                key={cls.classId}
                className="surface-card p-5 flex flex-col justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-800/80"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        Kelas {cls.kelas} · {cls.tahunPelajaran}
                      </span>
                      <h3 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white">
                        Rombel {cls.namaRombel}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(cls)}
                        aria-label={`Edit kelas ${cls.namaRombel}`}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cls)}
                        aria-label={`Hapus kelas ${cls.namaRombel}`}
                        className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400">Wali Kelas</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                        {cls.waliKelasNama || 'Belum ditentukan'}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-slate-500 dark:text-slate-400">Siswa Aktif / Kapasitas</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                          {count} / {cls.kapasitas}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md surface-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {editingClass ? 'Edit Kelas / Rombel' : 'Tambah Kelas / Rombel'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup form kelas"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tingkat Kelas (1–6) *
                </label>
                <select
                  {...form.register('kelas', { valueAsNumber: true })}
                  className="field-input"
                >
                  {[1, 2, 3, 4, 5, 6].map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Rombel *
                </label>
                <input
                  {...form.register('namaRombel')}
                  placeholder="Contoh: 1A, 2B, 5A"
                  className="field-input"
                />
                {form.formState.errors.namaRombel && (
                  <p className="text-xs text-rose-600 mt-1">
                    {form.formState.errors.namaRombel.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Wali Kelas
                </label>
                <select
                  {...form.register('waliKelasId')}
                  className="field-input"
                >
                  <option value="">-- Pilih Wali Kelas --</option>
                  {teachers
                    .filter((t) => t.statusAkun === 'ACTIVE')
                    .map((t) => (
                      <option key={t.teacherId} value={t.teacherId}>
                        {t.namaLengkap} {t.userId ? '' : '(Belum ada akun login)'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tahun Pelajaran *
                  </label>
                  <input
                    {...form.register('tahunPelajaran')}
                    className="field-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kapasitas *
                  </label>
                  <input
                    type="number"
                    {...form.register('kapasitas', { valueAsNumber: true })}
                    className="field-input font-mono"
                  />
                </div>
              </div>

              <div className="pt-3.5 flex justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
