import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftRight, CalendarPlus, Check, Save, Upload } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useToast } from '../../contexts/ToastContext';
import {
  saveAcademicYear,
  saveSchoolSettings,
  uploadFileToStorage,
} from '../../services/firestoreService';
import { schoolSettingsSchema } from '../../utils/validationSchemas';
import { ReportHeader } from '../../components/ReportHeader';

type SettingsFormValues = z.infer<typeof schoolSettingsSchema>;

export const PengaturanMadrasahPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { schoolSettings, academicYears } = useSchoolData();
  const { showToast } = useToast();

  const [leftLogoUrl, setLeftLogoUrl] = useState(schoolSettings.logoKiriUrl);
  const [rightLogoUrl, setRightLogoUrl] = useState(schoolSettings.logoKananUrl);
  const [saving, setSaving] = useState(false);

  const [newTp, setNewTp] = useState('2026/2027');
  const [newSemester, setNewSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(schoolSettingsSchema),
    defaultValues: {
      namaYayasan: schoolSettings.namaYayasan,
      namaMadrasah: schoolSettings.namaMadrasah,
      nsm: schoolSettings.nsm,
      npsm: schoolSettings.npsm,
      akreditasi: schoolSettings.akreditasi,
      nomorAkreditasi: schoolSettings.nomorAkreditasi,
      alamat: schoolSettings.alamat,
      alamatSingkat: schoolSettings.alamatSingkat,
      telepon: schoolSettings.telepon,
      kepalaMadrasah: schoolSettings.kepalaMadrasah,
      nipKepalaMadrasah: schoolSettings.nipKepalaMadrasah,
      kota: schoolSettings.kota,
      tahunPelajaranAktif: schoolSettings.tahunPelajaranAktif,
      jamMasukBatas: schoolSettings.jamMasukBatas,
    },
  });

  useEffect(() => {
    form.reset({
      namaYayasan: schoolSettings.namaYayasan,
      namaMadrasah: schoolSettings.namaMadrasah,
      nsm: schoolSettings.nsm,
      npsm: schoolSettings.npsm,
      akreditasi: schoolSettings.akreditasi,
      nomorAkreditasi: schoolSettings.nomorAkreditasi,
      alamat: schoolSettings.alamat,
      alamatSingkat: schoolSettings.alamatSingkat,
      telepon: schoolSettings.telepon,
      kepalaMadrasah: schoolSettings.kepalaMadrasah,
      nipKepalaMadrasah: schoolSettings.nipKepalaMadrasah,
      kota: schoolSettings.kota,
      tahunPelajaranAktif: schoolSettings.tahunPelajaranAktif,
      jamMasukBatas: schoolSettings.jamMasukBatas,
    });
    setLeftLogoUrl(schoolSettings.logoKiriUrl);
    setRightLogoUrl(schoolSettings.logoKananUrl);
  }, [schoolSettings, form]);

  const handleUploadLogo = async (side: 'left' | 'right', file: File) => {
    try {
      const url = await uploadFileToStorage('logo', '', file);
      if (side === 'left') setLeftLogoUrl(url);
      else setRightLogoUrl(url);
      showToast('Logo berhasil diunggah ke Firebase Storage. Klik Simpan Pengaturan.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengunggah logo.', 'error');
    }
  };

  const onSubmit = async (values: SettingsFormValues) => {
    if (!userProfile) return;
    setSaving(true);
    try {
      await saveSchoolSettings(
        {
          namaYayasan: values.namaYayasan,
          namaMadrasah: values.namaMadrasah,
          nsm: values.nsm,
          npsm: values.npsm,
          akreditasi: values.akreditasi ?? '',
          nomorAkreditasi: values.nomorAkreditasi ?? '',
          alamat: values.alamat,
          alamatSingkat: values.alamatSingkat ?? '',
          telepon: values.telepon ?? '',
          kepalaMadrasah: values.kepalaMadrasah,
          nipKepalaMadrasah: values.nipKepalaMadrasah ?? '',
          kota: values.kota ?? '',
          tahunPelajaranAktif: values.tahunPelajaranAktif,
          jamMasukBatas: values.jamMasukBatas,
          logoKiriUrl: leftLogoUrl,
          logoKananUrl: rightLogoUrl,
        },
        { user: userProfile.nama, uid: userProfile.uid, role: userProfile.role }
      );
      showToast('Identitas Madrasah & Kop Surat berhasil disimpan.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    const yearId = `tp_${newTp.replace(/[^a-zA-Z0-9]/g, '_')}_${newSemester.toLowerCase()}`;
    await saveAcademicYear(
      {
        yearId,
        tahunPelajaran: newTp,
        semester: newSemester,
        isActive: true,
      },
      { user: userProfile.nama, uid: userProfile.uid, role: userProfile.role }
    );
    showToast(`Tahun Pelajaran ${newTp} (${newSemester}) diaktifkan.`, 'success');
  };

  const watched = form.watch();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white p-5 sm:p-6 shadow-xs">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Pratinjau Kop Surat Resmi (Live)
        </p>
        <ReportHeader
          settings={{
            ...schoolSettings,
            ...watched,
            akreditasi: watched.akreditasi ?? '',
            nomorAkreditasi: watched.nomorAkreditasi ?? '',
            alamatSingkat: watched.alamatSingkat ?? '',
            telepon: watched.telepon ?? '',
            nipKepalaMadrasah: watched.nipKepalaMadrasah ?? '',
            kota: watched.kota ?? '',
            logoKiriUrl: leftLogoUrl,
            logoKananUrl: rightLogoUrl,
          }}
        />
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="surface-card p-6 space-y-5"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Pengaturan → Identitas Madrasah
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Konfigurasi identitas resmi, kop surat laporan PDF, serta batas jam masuk guru.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Yayasan *
            </label>
            <input
              {...form.register('namaYayasan')}
              className="field-input"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Madrasah *
            </label>
            <input
              {...form.register('namaMadrasah')}
              className="field-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              NSM *
            </label>
            <input
              {...form.register('nsm')}
              className="field-input font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              NPSM *
            </label>
            <input
              {...form.register('npsm')}
              className="field-input font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Peringkat Akreditasi
            </label>
            <input
              {...form.register('akreditasi')}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nomor SK Akreditasi
            </label>
            <input
              {...form.register('nomorAkreditasi')}
              className="field-input"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Alamat Resmi Kop Surat *
            </label>
            <input
              {...form.register('alamat')}
              className="field-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nomor Telepon
            </label>
            <input
              {...form.register('telepon')}
              className="field-input font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kota / Lokasi Tanda Tangan
            </label>
            <input
              {...form.register('kota')}
              className="field-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Kepala Madrasah *
            </label>
            <input
              {...form.register('kepalaMadrasah')}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              NIP Kepala Madrasah
            </label>
            <input
              {...form.register('nipKepalaMadrasah')}
              className="field-input font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tahun Pelajaran Aktif *
            </label>
            <input
              {...form.register('tahunPelajaranAktif')}
              className="field-input font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Batas Jam Masuk Guru (Otomatis Terlambat) *
            </label>
            <input
              type="time"
              {...form.register('jamMasukBatas')}
              className="field-input font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Upload Logo Kiri (MIS Darussalam)
            </label>
            <label className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <Upload className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Ganti Logo Kiri via Firebase Storage</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUploadLogo('left', f);
                }}
              />
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Upload Logo Kanan (YPI-DTQ)
            </label>
            <label className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <Upload className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Ganti Logo Kanan via Firebase Storage</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUploadLogo('right', f);
                }}
              />
            </label>
          </div>
          <div className="sm:col-span-2 flex justify-start">
            <button
              type="button"
              onClick={() => {
                setLeftLogoUrl(rightLogoUrl);
                setRightLogoUrl(leftLogoUrl);
                showToast('Posisi logo kiri dan kanan ditukar. Klik Simpan untuk menerapkan.', 'info');
              }}
              className="btn-secondary"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Tukar Posisi Logo Kiri &harr; Kanan
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan Madrasah'}
          </button>
        </div>
      </form>

      {/* Academic Years Section */}
      <div className="surface-card p-6 space-y-4">
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Tahun Pelajaran
        </h3>
        <form onSubmit={handleAddYear} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tahun Pelajaran
            </label>
            <input
              value={newTp}
              onChange={(e) => setNewTp(e.target.value)}
              placeholder="2026/2027"
              className="field-input font-mono w-36"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Semester
            </label>
            <select
              value={newSemester}
              onChange={(e) => setNewSemester(e.target.value as 'Ganjil' | 'Genap')}
              className="field-input w-36"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <button
            type="submit"
            className="btn-primary"
          >
            <CalendarPlus className="w-4 h-4" />
            Tambah &amp; Aktifkan
          </button>
        </form>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {academicYears.map((y) => (
            <div key={y.yearId} className="py-3 flex items-center justify-between text-sm">
              <div>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {y.tahunPelajaran}
                </span>{' '}
                · Semester {y.semester}
              </div>
              {y.isActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> Aktif
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    userProfile &&
                    saveAcademicYear(
                      { ...y, isActive: true },
                      { user: userProfile.nama, uid: userProfile.uid, role: userProfile.role }
                    )
                  }
                  className="text-xs font-semibold text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
                >
                  Aktifkan
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
