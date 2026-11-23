import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(2, 'Email atau username wajib diisi minimal 2 karakter'),
  password: z
    .string()
    .min(6, 'Kata sandi wajib diisi minimal 6 karakter'),
});

export const firstAdminSetupSchema = z
  .object({
    nama: z.string().trim().min(3, 'Nama lengkap admin minimal 3 karakter').max(120),
    username: z.string().trim().min(3, 'Username minimal 3 karakter').max(64),
    email: z.string().trim().email('Format email tidak valid').optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'Kata sandi minimal 8 karakter')
      .max(100, 'Kata sandi maksimal 100 karakter'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Kata sandi saat ini wajib diisi'),
    newPassword: z.string().min(8, 'Kata sandi baru minimal 8 karakter'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Konfirmasi kata sandi baru tidak cocok',
    path: ['confirmNewPassword'],
  });

export const teacherFormSchema = z.object({
  namaLengkap: z.string().trim().min(2, 'Nama lengkap guru wajib diisi').max(120),
  nip: z.string().trim().max(40).optional().or(z.literal('')),
  nuptk: z.string().trim().max(40).optional().or(z.literal('')),
  nik: z.string().trim().max(32).optional().or(z.literal('')),
  jenisKelamin: z.enum(['L', 'P'], { message: 'Pilih jenis kelamin' }),
  tempatLahir: z.string().trim().max(80).optional().or(z.literal('')),
  tanggalLahir: z.string().trim().max(20).optional().or(z.literal('')),
  pendidikanTerakhir: z.string().trim().max(40).optional().or(z.literal('')),
  jabatan: z.string().trim().min(2, 'Jabatan wajib diisi').max(80),
  statusKepegawaian: z.enum(['PNS', 'PPPK', 'GTY', 'GTT', 'Honorer'], {
    message: 'Pilih status kepegawaian',
  }),
  nomorHp: z.string().trim().max(30).optional().or(z.literal('')),
  alamat: z.string().trim().max(300).optional().or(z.literal('')),
  email: z.string().trim().email('Format email tidak valid').optional().or(z.literal('')),
  username: z.string().trim().min(3, 'Username minimal 3 karakter').max(64).optional().or(z.literal('')),
  statusAkun: z.enum(['ACTIVE', 'INACTIVE']),
  passwordAwal: z.string().trim().min(8, 'Password akun minimal 8 karakter').optional().or(z.literal('')),
});

export const studentFormSchema = z.object({
  nis: z.string().trim().min(1, 'NIS wajib diisi').max(40),
  nisn: z.string().trim().max(40).optional().or(z.literal('')),
  namaLengkap: z.string().trim().min(2, 'Nama lengkap siswa wajib diisi').max(120),
  jenisKelamin: z.enum(['L', 'P'], { message: 'Pilih jenis kelamin' }),
  tempatLahir: z.string().trim().max(80).optional().or(z.literal('')),
  tanggalLahir: z.string().trim().max(20).optional().or(z.literal('')),
  agama: z.string().trim().max(30).optional().or(z.literal('')),
  alamat: z.string().trim().max(300).optional().or(z.literal('')),
  namaAyah: z.string().trim().max(100).optional().or(z.literal('')),
  namaIbu: z.string().trim().max(100).optional().or(z.literal('')),
  nomorHpOrtu: z.string().trim().max(30).optional().or(z.literal('')),
  classId: z.string().trim().min(1, 'Kelas / rombel wajib dipilih'),
  tahunPelajaran: z.string().trim().min(4, 'Tahun pelajaran wajib diisi').max(20),
  status: z.enum(['AKTIF', 'LULUS', 'PINDAH', 'NONAKTIF']),
});

export const classFormSchema = z.object({
  namaRombel: z.string().trim().min(1, 'Nama rombel wajib diisi (mis. 1A)').max(40),
  kelas: z.number({ message: 'Tingkat kelas harus berupa angka' }).int().min(1, 'Tingkat kelas 1-6').max(6, 'Tingkat kelas 1-6'),
  tahunPelajaran: z.string().trim().min(4, 'Tahun pelajaran wajib diisi').max(20),
  waliKelasId: z.string().trim().optional().or(z.literal('')),
  kapasitas: z.number({ message: 'Kapasitas harus berupa angka' }).int().min(1, 'Kapasitas minimal 1').max(100, 'Kapasitas maksimal 100'),
});

export const schoolSettingsSchema = z.object({
  namaYayasan: z.string().trim().min(2, 'Nama yayasan wajib diisi').max(160),
  namaMadrasah: z.string().trim().min(2, 'Nama madrasah wajib diisi').max(160),
  nsm: z.string().trim().min(1, 'NSM wajib diisi').max(40),
  npsm: z.string().trim().min(1, 'NPSM wajib diisi').max(40),
  akreditasi: z.string().trim().max(20).optional().or(z.literal('')),
  nomorAkreditasi: z.string().trim().max(100).optional().or(z.literal('')),
  alamat: z.string().trim().min(5, 'Alamat lengkap wajib diisi').max(300),
  alamatSingkat: z.string().trim().max(200).optional().or(z.literal('')),
  telepon: z.string().trim().max(40).optional().or(z.literal('')),
  kepalaMadrasah: z.string().trim().min(2, 'Nama Kepala Madrasah wajib diisi').max(120),
  nipKepalaMadrasah: z.string().trim().max(40).optional().or(z.literal('')),
  kota: z.string().trim().max(60).optional().or(z.literal('')),
  tahunPelajaranAktif: z.string().trim().min(4, 'Tahun pelajaran aktif wajib diisi').max(20),
  jamMasukBatas: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, 'Format jam batas masuk harus HH:mm (contoh 07:15)'),
});

export const teacherAttendanceSchema = z.object({
  status: z.enum(['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'DINAS', 'ALPA']),
  keterangan: z.string().trim().max(300, 'Keterangan maksimal 300 karakter').optional().or(z.literal('')),
});
