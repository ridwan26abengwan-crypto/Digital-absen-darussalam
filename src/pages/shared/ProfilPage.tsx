import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Save, Upload, UserCircle } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useToast } from '../../contexts/ToastContext';
import { updateOwnProfile, uploadFileToStorage } from '../../services/firestoreService';
import { changePasswordSchema } from '../../utils/validationSchemas';

type PasswordFormValues = z.infer<typeof changePasswordSchema>;

export const ProfilPage: React.FC = () => {
  const { userProfile, firebaseUser, changeOwnPassword } = useAuth();
  const { teachers } = useSchoolData();
  const { showToast } = useToast();

  const linkedTeacher = teachers.find(
    (t) => t.teacherId === userProfile?.teacherId || t.userId === userProfile?.uid
  );

  const [nama, setNama] = useState(userProfile?.nama ?? '');
  const [nomorHp, setNomorHp] = useState(linkedTeacher?.nomorHp ?? '');
  const [alamat, setAlamat] = useState(linkedTeacher?.alamat ?? '');
  const [photoUrl, setPhotoUrl] = useState(
    userProfile?.photoUrl || linkedTeacher?.foto || ''
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const isPasswordProvider =
    firebaseUser?.providerData.some((p) => p.providerId === 'password') ?? false;

  const handlePhotoUpload = async (file: File) => {
    if (!userProfile) return;
    try {
      const folder = linkedTeacher ? 'teachers' : 'logo';
      const url = await uploadFileToStorage(
        folder,
        linkedTeacher?.teacherId || userProfile.uid,
        file
      );
      setPhotoUrl(url);
      showToast('Foto profil berhasil diunggah. Klik Simpan Profil.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengunggah foto.', 'error');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || nama.trim().length < 2) {
      showToast('Nama lengkap minimal 2 karakter.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      await updateOwnProfile(
        userProfile.uid,
        nama,
        photoUrl,
        linkedTeacher?.teacherId,
        linkedTeacher ? nomorHp : undefined,
        linkedTeacher ? alamat : undefined
      );
      showToast('Profil akun berhasil diperbarui.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memperbarui profil.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (values: PasswordFormValues) => {
    setSavingPassword(true);
    try {
      await changeOwnPassword(values.currentPassword, values.newPassword);
      showToast('Kata sandi akun berhasil diubah.', 'success');
      passwordForm.reset();
    } catch (err) {
      showToast(
        err instanceof Error
          ? 'Kata sandi saat ini salah atau sesi perlu login ulang.'
          : 'Gagal mengubah kata sandi.',
        'error'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={handleSaveProfile} className="surface-card p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={userProfile?.nama || 'Profil'}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
              <UserCircle className="w-8 h-8" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {userProfile?.nama}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
              {userProfile?.role} · {userProfile?.username} · {userProfile?.email}
            </p>
            <label className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer hover:underline">
              <Upload className="w-3.5 h-3.5" />
              Ganti Foto Profil
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handlePhotoUpload(f);
                }}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Tampilan
            </label>
            <input value={nama} onChange={(e) => setNama(e.target.value)} className="field-input" />
          </div>
          {linkedTeacher && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nomor HP
                </label>
                <input
                  value={nomorHp}
                  onChange={(e) => setNomorHp(e.target.value)}
                  className="field-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Alamat
                </label>
                <input
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="field-input"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={savingProfile} className="btn-primary">
            <Save className="w-4 h-4" />
            {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </div>
      </form>

      {/* Pengaturan Akun -> Ubah Password */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <KeyRound className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Pengaturan Akun → Ubah Password
          </h3>
        </div>

        {!isPasswordProvider ? (
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Akun ini masuk menggunakan Google Sign-In. Pengelolaan kata sandi dilakukan langsung
            melalui akun Google Anda.
          </p>
        ) : (
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kata Sandi Saat Ini
              </label>
              <input
                type="password"
                {...passwordForm.register('currentPassword')}
                className="field-input"
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-rose-600 mt-1">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kata Sandi Baru
                </label>
                <input
                  type="password"
                  {...passwordForm.register('newPassword')}
                  className="field-input"
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-rose-600 mt-1">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  {...passwordForm.register('confirmNewPassword')}
                  className="field-input"
                />
                {passwordForm.formState.errors.confirmNewPassword && (
                  <p className="text-xs text-rose-600 mt-1">
                    {passwordForm.formState.errors.confirmNewPassword.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={savingPassword} className="btn-primary">
                {savingPassword ? 'Memproses...' : 'Ubah Kata Sandi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
