import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Download,
  Edit,
  Eye,
  GraduationCap,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useToast } from '../../contexts/ToastContext';
import {
  deleteStudent,
  saveStudent,
  uploadFileToStorage,
} from '../../services/firestoreService';
import type { Student } from '../../types';
import { exportStudentsToExcel } from '../../utils/excelUtils';
import { studentFormSchema } from '../../utils/validationSchemas';
import { EmptyState, SkeletonTable, StatusLabel } from '../../components/UiStates';

type StudentFormValues = z.infer<typeof studentFormSchema>;

export const DataSiswaPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { students, classes, schoolSettings, dataLoading } = useSchoolData();
  const { showToast, confirm } = useToast();

  const isAdmin = userProfile?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      nis: '',
      nisn: '',
      namaLengkap: '',
      jenisKelamin: 'L',
      tempatLahir: '',
      tanggalLahir: '',
      agama: 'Islam',
      alamat: '',
      namaAyah: '',
      namaIbu: '',
      nomorHpOrtu: '',
      classId: '',
      tahunPelajaran: schoolSettings.tahunPelajaranAktif || '2026/2027',
      status: 'AKTIF',
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter !== 'ALL' && s.classId !== classFilter) return false;
      if (!q) return true;
      return (
        s.namaLengkap.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        (s.nisn ?? '').toLowerCase().includes(q) ||
        s.kelasNama.toLowerCase().includes(q)
      );
    });
  }, [students, search, classFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openAdd = () => {
    setEditingStudent(null);
    setPhotoFile(null);
    form.reset({
      nis: '',
      nisn: '',
      namaLengkap: '',
      jenisKelamin: 'L',
      tempatLahir: '',
      tanggalLahir: '',
      agama: 'Islam',
      alamat: '',
      namaAyah: '',
      namaIbu: '',
      nomorHpOrtu: '',
      classId: classes[0]?.classId ?? '',
      tahunPelajaran: schoolSettings.tahunPelajaranAktif || '2026/2027',
      status: 'AKTIF',
    });
    setModalOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditingStudent(s);
    setPhotoFile(null);
    form.reset({
      nis: s.nis,
      nisn: s.nisn ?? '',
      namaLengkap: s.namaLengkap,
      jenisKelamin: s.jenisKelamin,
      tempatLahir: s.tempatLahir ?? '',
      tanggalLahir: s.tanggalLahir ?? '',
      agama: s.agama ?? 'Islam',
      alamat: s.alamat ?? '',
      namaAyah: s.namaAyah ?? '',
      namaIbu: s.namaIbu ?? '',
      nomorHpOrtu: s.nomorHpOrtu ?? '',
      classId: s.classId,
      tahunPelajaran: s.tahunPelajaran,
      status: s.status,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: StudentFormValues) => {
    if (!userProfile) return;
    const selectedClass = classes.find((c) => c.classId === values.classId);
    if (!selectedClass) {
      showToast('Pilih kelas / rombel yang valid terlebih dahulu.', 'error');
      return;
    }

    setSaving(true);
    try {
      let fotoUrl = editingStudent?.foto ?? '';
      if (photoFile) {
        fotoUrl = await uploadFileToStorage(
          'students',
          editingStudent?.studentId ?? 'profile',
          photoFile
        );
      }

      await saveStudent(
        {
          studentId: editingStudent?.studentId,
          ...values,
          kelasNama: selectedClass.namaRombel,
          waliKelasUid: selectedClass.waliKelasUid ?? '',
          foto: fotoUrl,
        },
        { user: userProfile.nama, uid: userProfile.uid, role: userProfile.role }
      );
      showToast(
        editingStudent ? 'Data siswa berhasil diperbarui.' : 'Data siswa baru berhasil disimpan.',
        'success'
      );
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan data siswa', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: Student) => {
    if (!userProfile) return;
    const ok = await confirm({
      title: 'Hapus Data Siswa',
      description: `Hapus data siswa ${s.namaLengkap} (${s.nis}) secara permanen?`,
      confirmLabel: 'Hapus',
      danger: true,
    });
    if (!ok) return;
    await deleteStudent(s, {
      user: userProfile.nama,
      uid: userProfile.uid,
      role: userProfile.role,
    });
    showToast('Data siswa berhasil dihapus.', 'success');
  };

  return (
    <div className="space-y-5">
      <div className="surface-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama siswa, NIS, atau NISN..."
              aria-label="Cari data siswa"
              className="field-input pl-10 py-2"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter kelas"
            className="field-input py-2 w-auto min-w-[160px]"
          >
            <option value="ALL">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                Kelas {c.namaRombel}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => exportStudentsToExcel(filtered)}
            className="btn-secondary"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={openAdd}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Tambah Siswa
            </button>
          )}
        </div>
      </div>

      {dataLoading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : paged.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Belum ada data siswa"
          description={
            isAdmin
              ? 'Pastikan Kelas / Rombel telah dibuat terlebih dahulu, lalu tambahkan atau import data siswa.'
              : 'Belum ada siswa pada kelas yang Anda ampu.'
          }
          actionLabel={isAdmin && classes.length > 0 ? 'Tambah Siswa' : undefined}
          onAction={isAdmin && classes.length > 0 ? openAdd : undefined}
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="table-head-cell">Siswa</th>
                  <th className="table-head-cell">NIS / NISN</th>
                  <th className="table-head-cell">L/P</th>
                  <th className="table-head-cell">Kelas</th>
                  <th className="table-head-cell">Orang Tua</th>
                  <th className="table-head-cell">Status</th>
                  <th className="table-head-cell text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paged.map((s) => (
                  <tr
                    key={s.studentId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="table-body-cell font-semibold text-slate-900 dark:text-white">
                      {s.namaLengkap}
                    </td>
                    <td className="table-body-cell font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                      <div>{s.nis}</div>
                      <div className="text-slate-400">{s.nisn || ''}</div>
                    </td>
                    <td className="table-body-cell text-xs font-medium">{s.jenisKelamin}</td>
                    <td className="table-body-cell font-medium">{s.kelasNama}</td>
                    <td className="table-body-cell text-xs text-slate-600 dark:text-slate-300">
                      <div>{s.namaAyah || s.namaIbu || '-'}</div>
                      <div className="text-slate-400 font-mono">{s.nomorHpOrtu || ''}</div>
                    </td>
                    <td className="table-body-cell">
                      <StatusLabel
                        status={s.status}
                        variant={s.status === 'AKTIF' ? 'emerald' : 'slate'}
                      />
                    </td>
                    <td className="table-body-cell">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailStudent(s)}
                          aria-label={`Detail ${s.namaLengkap}`}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(s)}
                              aria-label={`Edit ${s.namaLengkap}`}
                              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-700 transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(s)}
                              aria-label={`Hapus ${s.namaLengkap}`}
                              className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Menampilkan {paged.length} dari {filtered.length} siswa
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Sebelumnya
              </button>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 tabular-nums px-1">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div className="w-full max-w-2xl surface-card p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Data Siswa'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup form siswa"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    NIS *
                  </label>
                  <input
                    {...form.register('nis')}
                    className="field-input font-mono"
                  />
                  {form.formState.errors.nis && (
                    <p className="text-xs text-rose-600 mt-1">{form.formState.errors.nis.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    NISN
                  </label>
                  <input
                    {...form.register('nisn')}
                    className="field-input font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Lengkap *
                  </label>
                  <input
                    {...form.register('namaLengkap')}
                    className="field-input"
                  />
                  {form.formState.errors.namaLengkap && (
                    <p className="text-xs text-rose-600 mt-1">
                      {form.formState.errors.namaLengkap.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kelas / Rombel *
                  </label>
                  <select
                    {...form.register('classId')}
                    className="field-input"
                  >
                    <option value="">-- Pilih Rombel --</option>
                    {classes.map((c) => (
                      <option key={c.classId} value={c.classId}>
                        Kelas {c.namaRombel} ({c.tahunPelajaran})
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.classId && (
                    <p className="text-xs text-rose-600 mt-1">
                      {form.formState.errors.classId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Jenis Kelamin *
                  </label>
                  <select
                    {...form.register('jenisKelamin')}
                    className="field-input"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tempat Lahir
                  </label>
                  <input
                    {...form.register('tempatLahir')}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    {...form.register('tanggalLahir')}
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Ayah
                  </label>
                  <input
                    {...form.register('namaAyah')}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Ibu
                  </label>
                  <input
                    {...form.register('namaIbu')}
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    No HP Orang Tua
                  </label>
                  <input
                    {...form.register('nomorHpOrtu')}
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Status Siswa
                  </label>
                  <select
                    {...form.register('status')}
                    className="field-input"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="LULUS">LULUS</option>
                    <option value="PINDAH">PINDAH</option>
                    <option value="NONAKTIF">NONAKTIF</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Alamat
                  </label>
                  <input
                    {...form.register('alamat')}
                    className="field-input"
                  />
                </div>

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
                    Foto Siswa
                  </label>
                  <label className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{photoFile ? photoFile.name : 'Pilih foto siswa'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
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
                  {saving ? 'Menyimpan...' : 'Simpan Data Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-lg surface-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Detail Data Siswa
              </h3>
              <button
                type="button"
                onClick={() => setDetailStudent(null)}
                aria-label="Tutup detail siswa"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Nama Lengkap</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {detailStudent.namaLengkap}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Kelas</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {detailStudent.kelasNama}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">NIS / NISN</p>
                <p className="font-mono text-xs mt-0.5">
                  {detailStudent.nis} / {detailStudent.nisn || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tempat, Tgl Lahir</p>
                <p className="mt-0.5">
                  {detailStudent.tempatLahir || '-'}, {detailStudent.tanggalLahir || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ayah / Ibu</p>
                <p className="mt-0.5">
                  {detailStudent.namaAyah || '-'} / {detailStudent.namaIbu || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">No HP Orang Tua</p>
                <p className="font-mono mt-0.5">{detailStudent.nomorHpOrtu || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">Alamat</p>
                <p className="mt-0.5">{detailStudent.alamat || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
