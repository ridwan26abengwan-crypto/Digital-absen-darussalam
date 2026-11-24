import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Download,
  Edit,
  Eye,
  KeyRound,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { z } from 'zod';
import { auth } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useToast } from '../../contexts/ToastContext';
import {
  deleteTeacher,
  provisionAccountForTeacher,
  saveTeacher,
  uploadFileToStorage,
} from '../../services/firestoreService';
import type { Teacher } from '../../types';
import { formatReadableServiceError } from '../../utils/authErrorMessages';
import { exportTeachersToExcel } from '../../utils/excelUtils';
import { teacherFormSchema } from '../../utils/validationSchemas';
import { EmptyState, SkeletonTable, StatusLabel } from '../../components/UiStates';

type TeacherFormValues = z.infer<typeof teacherFormSchema>;

export const DataGuruPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { teachers, teacherAttendances, classes, dataLoading } = useSchoolData();
  const { showToast, confirm } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [detailTeacher, setDetailTeacher] = useState<Teacher | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [accountModalTeacher, setAccountModalTeacher] = useState<Teacher | null>(null);
  const [newAccUsername, setNewAccUsername] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('');
  const [accountModalError, setAccountModalError] = useState<string | null>(null);
  const [providerBannerMessage, setProviderBannerMessage] = useState<string | null>(null);

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      namaLengkap: '',
      nip: '',
      nuptk: '',
      nik: '',
      jenisKelamin: 'L',
      tempatLahir: '',
      tanggalLahir: '',
      pendidikanTerakhir: 'S1',
      jabatan: 'Guru Kelas',
      statusKepegawaian: 'GTY',
      nomorHp: '',
      alamat: '',
      email: '',
      username: '',
      statusAkun: 'ACTIVE',
      passwordAwal: '',
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teachers.filter((t) => {
      if (statusFilter !== 'ALL' && t.statusAkun !== statusFilter) return false;
      if (!q) return true;
      return (
        t.namaLengkap.toLowerCase().includes(q) ||
        (t.nip ?? '').toLowerCase().includes(q) ||
        (t.nuptk ?? '').toLowerCase().includes(q) ||
        t.jabatan.toLowerCase().includes(q)
      );
    });
  }, [teachers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openAdd = () => {
    setEditingTeacher(null);
    setPhotoFile(null);
    setModalError(null);
    form.reset({
      namaLengkap: '',
      nip: '',
      nuptk: '',
      nik: '',
      jenisKelamin: 'L',
      tempatLahir: '',
      tanggalLahir: '',
      pendidikanTerakhir: 'S1',
      jabatan: 'Guru Kelas',
      statusKepegawaian: 'GTY',
      nomorHp: '',
      alamat: '',
      email: '',
      username: '',
      statusAkun: 'ACTIVE',
      passwordAwal: '',
    });
    setModalOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setPhotoFile(null);
    setModalError(null);
    form.reset({
      namaLengkap: t.namaLengkap,
      nip: t.nip ?? '',
      nuptk: t.nuptk ?? '',
      nik: t.nik ?? '',
      jenisKelamin: t.jenisKelamin,
      tempatLahir: t.tempatLahir ?? '',
      tanggalLahir: t.tanggalLahir ?? '',
      pendidikanTerakhir: t.pendidikanTerakhir ?? 'S1',
      jabatan: t.jabatan,
      statusKepegawaian: t.statusKepegawaian,
      nomorHp: t.nomorHp ?? '',
      alamat: t.alamat ?? '',
      email: t.email ?? '',
      username: t.username ?? '',
      statusAkun: t.statusAkun,
      passwordAwal: '',
    });
    setModalOpen(true);
  };

  const onInvalid = () => {
    const msg = 'Mohon lengkapi atau perbaiki kolom formulir yang ditandai merah.';
    setModalError(msg);
    showToast(msg, 'error');
  };

  const onSubmit = async (values: TeacherFormValues) => {
    if (!userProfile) {
      const msg = 'Sesi admin belum siap. Silakan muat ulang halaman lalu coba kembali.';
      setModalError(msg);
      showToast(msg, 'error');
      return;
    }
    setModalError(null);
    setSaving(true);
    try {
      let fotoUrl = editingTeacher?.foto ?? '';
      if (photoFile) {
        try {
          fotoUrl = await uploadFileToStorage(
            'teachers',
            editingTeacher?.teacherId ?? 'profile',
            photoFile
          );
        } catch (uploadErr) {
          const uploadMsg =
            uploadErr instanceof Error && uploadErr.message.includes('batas waktu')
              ? uploadErr.message
              : 'Gagal mengunggah foto ke Firebase Storage. Kosongkan pilihan foto lalu simpan data guru tanpa foto.';
          setModalError(uploadMsg);
          showToast(uploadMsg, 'error');
          return;
        }
      }

      const result = await saveTeacher(
        {
          teacherId: editingTeacher?.teacherId,
          userId: editingTeacher?.userId ?? '',
          foto: fotoUrl,
          nip: values.nip ?? '',
          nuptk: values.nuptk ?? '',
          nik: values.nik ?? '',
          namaLengkap: values.namaLengkap,
          jenisKelamin: values.jenisKelamin,
          tempatLahir: values.tempatLahir ?? '',
          tanggalLahir: values.tanggalLahir ?? '',
          pendidikanTerakhir: values.pendidikanTerakhir ?? '',
          jabatan: values.jabatan,
          statusKepegawaian: values.statusKepegawaian,
          nomorHp: values.nomorHp ?? '',
          alamat: values.alamat ?? '',
          email: values.email ?? '',
          username: values.username ?? '',
          statusAkun: values.statusAkun,
          passwordAwal: values.passwordAwal || undefined,
        },
        { user: userProfile.nama, uid: userProfile.uid, role: userProfile.role }
      );
      if (result.accountWarning) {
        if (result.needsProviderEnable) {
          setProviderBannerMessage(
            `Data guru "${values.namaLengkap}" sudah tersimpan, namun akun login belum dapat dibuat otomatis karena Email/Password belum diaktifkan di Firebase Console.`
          );
        }
        showToast(
          `Data guru berhasil disimpan, namun akun login belum dibuat: ${result.accountWarning}`,
          'warning'
        );
      } else {
        setProviderBannerMessage(null);
        showToast(
          editingTeacher ? 'Data guru berhasil diperbarui.' : 'Data guru baru berhasil disimpan.',
          'success'
        );
      }
      setModalOpen(false);
    } catch (err) {
      const readable = formatReadableServiceError(err, 'Gagal menyimpan data guru.');
      if (readable.needsProviderEnable) {
        setProviderBannerMessage(readable.message);
      }
      setModalError(readable.message);
      showToast(readable.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (t: Teacher) => {
    if (!userProfile) return;
    const next = t.statusAkun === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const ok = await confirm({
      title: next === 'ACTIVE' ? 'Aktifkan Guru' : 'Nonaktifkan Guru',
      description: `Ubah status akun ${t.namaLengkap} menjadi ${next === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF'}?`,
      confirmLabel: 'Ya, Ubah Status',
      danger: next === 'INACTIVE',
    });
    if (!ok) return;
    try {
      await saveTeacher(
        { ...t, statusAkun: next },
        { user: userProfile.nama, uid: userProfile.uid, role: userProfile.role }
      );
      showToast(`Status ${t.namaLengkap} berhasil diperbarui.`, 'success');
    } catch (err) {
      const readable = formatReadableServiceError(err, 'Gagal mengubah status guru.');
      showToast(readable.message, 'error');
    }
  };

  const handleDelete = async (t: Teacher) => {
    if (!userProfile) return;
    const ok = await confirm({
      title: 'Hapus Data Guru',
      description: `Hapus permanen data guru ${t.namaLengkap}? Riwayat absensi tidak akan dihapus.`,
      confirmLabel: 'Hapus',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteTeacher(t, {
        user: userProfile.nama,
        uid: userProfile.uid,
        role: userProfile.role,
      });
      showToast('Data guru berhasil dihapus.', 'success');
    } catch (err) {
      const readable = formatReadableServiceError(err, 'Gagal menghapus data guru.');
      showToast(readable.message, 'error');
    }
  };

  const handleResetAccess = async (t: Teacher) => {
    if (t.email && t.userId) {
      try {
        await sendPasswordResetEmail(auth, t.email);
        showToast(`Email reset kata sandi dikirim ke ${t.email}.`, 'success');
      } catch {
        showToast(
          'Pengiriman email reset gagal. Pastikan Email/Password aktif dan alamat email valid.',
          'error'
        );
      }
    } else {
      setAccountModalTeacher(t);
      setNewAccUsername(t.username || t.namaLengkap.toLowerCase().replace(/\s+/g, '.'));
      setNewAccPassword('');
      setAccountModalError(null);
    }
  };

  const handleProvisionAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountModalTeacher || !userProfile) return;
    if (newAccUsername.trim().length < 3 || newAccPassword.length < 8) {
      const msg = 'Username minimal 3 karakter dan kata sandi minimal 8 karakter.';
      setAccountModalError(msg);
      showToast(msg, 'error');
      return;
    }
    setAccountModalError(null);
    setSaving(true);
    try {
      await provisionAccountForTeacher(
        accountModalTeacher,
        newAccUsername,
        newAccPassword,
        'GURU',
        { user: userProfile.nama, uid: userProfile.uid, role: userProfile.role }
      );
      setProviderBannerMessage(null);
      showToast(`Akun login untuk ${accountModalTeacher.namaLengkap} berhasil dibuat.`, 'success');
      setAccountModalTeacher(null);
    } catch (err) {
      const readable = formatReadableServiceError(err, 'Gagal membuat akun login guru.');
      if (readable.needsProviderEnable) {
        setProviderBannerMessage(readable.message);
      }
      setAccountModalError(readable.message);
      showToast(readable.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {providerBannerMessage && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/60 p-4 text-xs text-amber-900 dark:text-amber-100 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="font-semibold leading-relaxed">{providerBannerMessage}</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-200">
                Aktifkan di{' '}
                <a
                  href="https://console.firebase.google.com/project/awesome-incentive-c5v9p/authentication/providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline hover:text-amber-950 dark:hover:text-white"
                >
                  Firebase Console → Authentication → Sign-in method → Email/Password
                </a>
                , lalu klik ikon kunci (Buat Akun Login) pada baris guru terkait.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProviderBannerMessage(null)}
            aria-label="Tutup pemberitahuan"
            className="p-1 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
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
              placeholder="Cari nama, NIP, NUPTK, atau jabatan..."
              aria-label="Cari data guru"
              className="field-input pl-10 py-2"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {st === 'ALL' ? 'Semua' : st === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => exportTeachersToExcel(filtered)}
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
            Tambah Guru
          </button>
        </div>
      </div>

      {/* Table */}
      {dataLoading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : paged.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada data guru"
          description="Tambahkan data guru dan tenaga kependidikan MIS Darussalam atau import melalui file Excel."
          actionLabel="Tambah Guru Pertama"
          onAction={openAdd}
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="table-head-cell">Guru</th>
                  <th className="table-head-cell">NIP / NUPTK</th>
                  <th className="table-head-cell">Jabatan</th>
                  <th className="table-head-cell">Kepegawaian</th>
                  <th className="table-head-cell">Akun Login</th>
                  <th className="table-head-cell">Status</th>
                  <th className="table-head-cell text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paged.map((t) => (
                  <tr
                    key={t.teacherId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="table-body-cell">
                      <div className="flex items-center gap-3">
                        {t.foto ? (
                          <img
                            src={t.foto}
                            alt={t.namaLengkap}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {t.namaLengkap.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {t.namaLengkap}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t.nomorHp || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-body-cell font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                      <div>{t.nip || '-'}</div>
                      <div className="text-slate-400">{t.nuptk || ''}</div>
                    </td>
                    <td className="table-body-cell text-slate-700 dark:text-slate-200">{t.jabatan}</td>
                    <td className="table-body-cell text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t.statusKepegawaian}
                    </td>
                    <td className="table-body-cell text-xs">
                      {t.userId ? (
                        <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                          {t.username || t.email}
                        </span>
                      ) : (
                        <span className="text-slate-400">Belum terhubung</span>
                      )}
                    </td>
                    <td className="table-body-cell">
                      <StatusLabel
                        status={t.statusAkun === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                        variant={t.statusAkun === 'ACTIVE' ? 'emerald' : 'rose'}
                      />
                    </td>
                    <td className="table-body-cell">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailTeacher(t)}
                          aria-label={`Detail ${t.namaLengkap}`}
                          title="Detail Guru"
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          aria-label={`Edit ${t.namaLengkap}`}
                          title="Edit Guru"
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetAccess(t)}
                          aria-label={`Reset atau buat akun ${t.namaLengkap}`}
                          title={t.userId ? 'Reset Akses Akun' : 'Buat Akun Login'}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-600 transition-colors cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(t)}
                          aria-label={`Ubah status ${t.namaLengkap}`}
                          title={t.statusAkun === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {t.statusAkun === 'ACTIVE' ? (
                            <UserX className="w-4 h-4 text-amber-600" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t)}
                          aria-label={`Hapus ${t.namaLengkap}`}
                          title="Hapus Guru"
                          className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Menampilkan {paged.length} dari {filtered.length} guru
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
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-950/55 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
        >
          <div className="w-full max-w-2xl surface-card p-5 sm:p-6 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {editingTeacher ? 'Edit Data Guru' : 'Tambah Data Guru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup form guru"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <p className="leading-relaxed">{modalError}</p>
              </div>
            )}

            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    NIP
                  </label>
                  <input
                    {...form.register('nip')}
                    className="field-input font-mono"
                  />
                  {form.formState.errors.nip && (
                    <p className="text-xs text-rose-600 mt-1">{form.formState.errors.nip.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    NUPTK
                  </label>
                  <input
                    {...form.register('nuptk')}
                    className="field-input font-mono"
                  />
                  {form.formState.errors.nuptk && (
                    <p className="text-xs text-rose-600 mt-1">{form.formState.errors.nuptk.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    NIK
                  </label>
                  <input
                    {...form.register('nik')}
                    className="field-input font-mono"
                  />
                  {form.formState.errors.nik && (
                    <p className="text-xs text-rose-600 mt-1">{form.formState.errors.nik.message}</p>
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
                  {form.formState.errors.tempatLahir && (
                    <p className="text-xs text-rose-600 mt-1">
                      {form.formState.errors.tempatLahir.message}
                    </p>
                  )}
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
                    Pendidikan Terakhir
                  </label>
                  <input
                    {...form.register('pendidikanTerakhir')}
                    placeholder="S1 / S2 / D3"
                    className="field-input"
                  />
                  {form.formState.errors.pendidikanTerakhir && (
                    <p className="text-xs text-rose-600 mt-1">
                      {form.formState.errors.pendidikanTerakhir.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Jabatan *
                  </label>
                  <input
                    {...form.register('jabatan')}
                    className="field-input"
                  />
                  {form.formState.errors.jabatan && (
                    <p className="text-xs text-rose-600 mt-1">
                      {form.formState.errors.jabatan.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Status Kepegawaian *
                  </label>
                  <select
                    {...form.register('statusKepegawaian')}
                    className="field-input"
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="GTY">GTY</option>
                    <option value="GTT">GTT</option>
                    <option value="Honorer">Honorer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nomor HP
                  </label>
                  <input
                    {...form.register('nomorHp')}
                    className="field-input"
                  />
                  {form.formState.errors.nomorHp && (
                    <p className="text-xs text-rose-600 mt-1">
                      {form.formState.errors.nomorHp.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Alamat
                  </label>
                  <input
                    {...form.register('alamat')}
                    className="field-input"
                  />
                  {form.formState.errors.alamat && (
                    <p className="text-xs text-rose-600 mt-1">
                      {form.formState.errors.alamat.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Username Akun
                  </label>
                  <input
                    {...form.register('username')}
                    placeholder="mis. ahmad.fadloli"
                    className="field-input"
                  />
                  {form.formState.errors.username && (
                    <p className="text-xs text-rose-600 mt-1">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Akun
                  </label>
                  <input
                    type="email"
                    {...form.register('email')}
                    placeholder="Opsional (otomatis jika kosong)"
                    className="field-input"
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-rose-600 mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {!editingTeacher && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Kata Sandi Akun Awal (Opsional)
                    </label>
                    <input
                      type="password"
                      {...form.register('passwordAwal')}
                      placeholder="Min. 8 karakter untuk langsung buat akun"
                      className="field-input"
                    />
                    {form.formState.errors.passwordAwal && (
                      <p className="text-xs text-rose-600 mt-1">
                        {form.formState.errors.passwordAwal.message}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Memerlukan provider Email/Password aktif di Firebase Console. Kosongkan jika
                      ingin membuat akun guru nanti.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Foto Profil (Firebase Storage)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors min-w-0">
                      <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {photoFile ? photoFile.name : 'Pilih file foto (.jpg/.png)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {photoFile && (
                      <button
                        type="button"
                        onClick={() => setPhotoFile(null)}
                        aria-label="Hapus pilihan foto"
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
                  {saving ? 'Menyimpan...' : 'Simpan Data Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailTeacher && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div className="w-full max-w-xl surface-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Detail Informasi Guru
              </h3>
              <button
                type="button"
                onClick={() => setDetailTeacher(null)}
                aria-label="Tutup detail guru"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Nama Lengkap</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {detailTeacher.namaLengkap}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Jabatan</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {detailTeacher.jabatan}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">NIP / NUPTK</p>
                <p className="font-mono text-xs mt-0.5">
                  {detailTeacher.nip || '-'} / {detailTeacher.nuptk || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Wali Kelas</p>
                <p className="font-medium mt-0.5">
                  {classes
                    .filter((c) => c.waliKelasId === detailTeacher.teacherId)
                    .map((c) => c.namaRombel)
                    .join(', ') || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Email / Username</p>
                <p className="text-xs font-mono mt-0.5">
                  {detailTeacher.email || '-'} ({detailTeacher.username || '-'})
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total Kehadiran Tercatat
                </p>
                <p className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 tabular-nums">
                  {teacherAttendances.filter((a) => a.teacherId === detailTeacher.teacherId).length}{' '}
                  hari
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">Alamat</p>
                <p className="mt-0.5">{detailTeacher.alamat || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provision Auth Account Modal */}
      {accountModalTeacher && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md surface-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Buat Akun Login untuk {accountModalTeacher.namaLengkap}
              </h3>
              <button
                type="button"
                onClick={() => setAccountModalTeacher(null)}
                aria-label="Tutup modal akun"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleProvisionAccount} className="mt-4 space-y-4">
              {accountModalError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <p className="leading-relaxed">{accountModalError}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Username atau Email
                </label>
                <input
                  type="text"
                  value={newAccUsername}
                  onChange={(e) => setNewAccUsername(e.target.value)}
                  className="field-input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kata Sandi Awal
                </label>
                <input
                  type="password"
                  value={newAccPassword}
                  onChange={(e) => setNewAccPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="field-input"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAccountModalTeacher(null)}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Membuat Akun...' : 'Buat Akun Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
