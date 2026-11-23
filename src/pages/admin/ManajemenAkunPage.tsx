import React, { useState } from 'react';
import { KeyRound, Plus, ShieldCheck, UserCheck, UserX, X } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useToast } from '../../contexts/ToastContext';
import {
  provisionAccountForTeacher,
  toggleUserStatus,
} from '../../services/firestoreService';
import type { UserProfile, UserRole } from '../../types';
import { SkeletonTable, StatusLabel } from '../../components/UiStates';

export const ManajemenAkunPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { users, teachers, dataLoading } = useSchoolData();
  const { showToast, confirm } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('GURU');
  const [saving, setSaving] = useState(false);

  const unlinkedTeachers = teachers.filter((t) => !t.userId);

  const handleToggle = async (u: UserProfile) => {
    if (!userProfile) return;
    if (u.uid === userProfile.uid) {
      showToast('Anda tidak dapat menonaktifkan akun Anda sendiri.', 'warning');
      return;
    }
    const next = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const ok = await confirm({
      title: next === 'ACTIVE' ? 'Aktifkan Akun' : 'Nonaktifkan Akun',
      description: `Ubah status login ${u.nama} (${u.username}) menjadi ${next}?`,
      confirmLabel: 'Ya, Ubah',
      danger: next === 'INACTIVE',
    });
    if (!ok) return;
    await toggleUserStatus(u, next, {
      user: userProfile.nama,
      uid: userProfile.uid,
      role: userProfile.role,
    });
    showToast(`Status akun ${u.nama} diperbarui.`, 'success');
  };

  const handleResetPassword = async (u: UserProfile) => {
    try {
      await sendPasswordResetEmail(auth, u.email);
      showToast(`Email reset kata sandi dikirim ke ${u.email}.`, 'success');
    } catch {
      showToast(
        'Gagal mengirim email reset. Pastikan email valid dan provider Email/Password aktif.',
        'error'
      );
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    const teacher = teachers.find((t) => t.teacherId === selectedTeacherId);
    if (!teacher) {
      showToast('Pilih guru yang akan dibuatkan akun.', 'error');
      return;
    }
    if (username.trim().length < 3 || password.length < 8) {
      showToast('Username minimal 3 karakter dan kata sandi minimal 8 karakter.', 'error');
      return;
    }
    setSaving(true);
    try {
      await provisionAccountForTeacher(teacher, username, password, role, {
        user: userProfile.nama,
        uid: userProfile.uid,
        role: userProfile.role,
      });
      showToast(`Akun login ${teacher.namaLengkap} berhasil dibuat.`, 'success');
      setModalOpen(false);
      setUsername('');
      setPassword('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuat akun login.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (dataLoading) return <SkeletonTable rows={6} cols={5} />;

  return (
    <div className="space-y-5">
      <div className="surface-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Manajemen Akun Pengguna
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola akun Admin dan Guru yang terhubung dengan Firebase Authentication.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedTeacherId(unlinkedTeachers[0]?.teacherId ?? '');
            setModalOpen(true);
          }}
          disabled={unlinkedTeachers.length === 0}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Buat Akun Guru ({unlinkedTeachers.length} tersedia)
        </button>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="table-head-cell">Nama Pengguna</th>
                <th className="table-head-cell">Username</th>
                <th className="table-head-cell">Email Auth</th>
                <th className="table-head-cell">Role</th>
                <th className="table-head-cell">Status</th>
                <th className="table-head-cell text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {users.map((u) => (
                <tr
                  key={u.uid}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="table-body-cell font-semibold text-slate-900 dark:text-white">
                    {u.nama}
                  </td>
                  <td className="table-body-cell font-mono text-xs">{u.username}</td>
                  <td className="table-body-cell font-mono text-xs text-slate-500 dark:text-slate-400">
                    {u.email}
                  </td>
                  <td className="table-body-cell">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {u.role}
                    </span>
                  </td>
                  <td className="table-body-cell">
                    <StatusLabel
                      status={u.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                      variant={u.status === 'ACTIVE' ? 'emerald' : 'rose'}
                    />
                  </td>
                  <td className="table-body-cell">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleResetPassword(u)}
                        title="Kirim Email Reset Password"
                        aria-label={`Reset password ${u.nama}`}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-600 transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(u)}
                        title={u.status === 'ACTIVE' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                        aria-label={`Toggle status ${u.nama}`}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {u.status === 'ACTIVE' ? (
                          <UserX className="w-4 h-4 text-rose-600" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md surface-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Buat Akun Login Baru
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup modal akun"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Guru
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="field-input"
                  required
                >
                  <option value="">-- Pilih Guru --</option>
                  {unlinkedTeachers.map((t) => (
                    <option key={t.teacherId} value={t.teacherId}>
                      {t.namaLengkap}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Username atau Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="mis. ahmad.fadloli"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="field-input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Peran (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="field-input"
                >
                  <option value="GURU">GURU</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
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
                  {saving ? 'Menyimpan...' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
