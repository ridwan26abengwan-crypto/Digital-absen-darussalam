export type UserRole = 'ADMIN' | 'GURU';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';

export type TeacherAttendanceStatus =
  | 'HADIR'
  | 'TERLAMBAT'
  | 'IZIN'
  | 'SAKIT'
  | 'DINAS'
  | 'ALPA';

export type StudentAttendanceStatus = 'H' | 'S' | 'I' | 'A' | 'D';

export type EmploymentStatus = 'PNS' | 'PPPK' | 'GTY' | 'GTT' | 'Honorer';
export type StudentStatus = 'AKTIF' | 'LULUS' | 'PINDAH' | 'NONAKTIF';

export interface UserProfile {
  uid: string;
  nama: string;
  email: string;
  username: string;
  role: UserRole;
  teacherId?: string;
  status: AccountStatus;
  photoUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Teacher {
  teacherId: string;
  userId?: string;
  foto?: string;
  nip?: string;
  nuptk?: string;
  nik?: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir?: string;
  tanggalLahir?: string;
  pendidikanTerakhir?: string;
  jabatan: string;
  statusKepegawaian: EmploymentStatus;
  nomorHp?: string;
  alamat?: string;
  email?: string;
  username?: string;
  statusAkun: AccountStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Student {
  studentId: string;
  nis: string;
  nisn?: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir?: string;
  tanggalLahir?: string;
  agama?: string;
  alamat?: string;
  namaAyah?: string;
  namaIbu?: string;
  nomorHpOrtu?: string;
  classId: string;
  kelasNama: string;
  waliKelasUid?: string;
  tahunPelajaran: string;
  status: StudentStatus;
  foto?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SchoolClass {
  classId: string;
  namaRombel: string;
  kelas: number;
  tahunPelajaran: string;
  waliKelasId?: string;
  waliKelasUid?: string;
  waliKelasNama?: string;
  kapasitas: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TeacherAttendance {
  attendanceId: string;
  teacherId: string;
  userId: string;
  namaGuru: string;
  nip?: string;
  tanggal: string;
  jamMasuk: string;
  jamPulang?: string;
  status: TeacherAttendanceStatus;
  keterangan?: string;
  deviceInfo?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudentAttendance {
  attendanceId: string;
  studentId: string;
  studentName: string;
  nis?: string;
  nisn?: string;
  classId: string;
  kelasNama?: string;
  waliKelasUid?: string;
  tanggal: string;
  status: StudentAttendanceStatus;
  keterangan?: string;
  teacherId: string;
  teacherUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AcademicYear {
  yearId: string;
  tahunPelajaran: string;
  semester: 'Ganjil' | 'Genap';
  isActive: boolean;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SchoolSettings {
  namaYayasan: string;
  namaMadrasah: string;
  nsm: string;
  npsm: string;
  akreditasi: string;
  nomorAkreditasi: string;
  alamat: string;
  alamatSingkat: string;
  telepon: string;
  kepalaMadrasah: string;
  nipKepalaMadrasah: string;
  kota: string;
  tahunPelajaranAktif: string;
  jamMasukBatas: string;
  logoKiriUrl: string;
  logoKananUrl: string;
  updatedAt?: unknown;
}

export interface AuditLog {
  logId: string;
  user: string;
  uid: string;
  role: UserRole;
  aktivitas: string;
  data?: string;
  timestamp?: unknown;
}

export type ReportType =
  | 'ABSENSI_GURU'
  | 'ABSENSI_SISWA'
  | 'PER_GURU'
  | 'PER_SISWA'
  | 'PER_KELAS';

export type PaperOrientation = 'portrait' | 'landscape';
export type PaperSize = 'a4' | 'f4';

export interface ReportFilterConfig {
  jenisLaporan: ReportType;
  tanggalAwal: string;
  tanggalAkhir: string;
  bulan: string;
  tahun: string;
  teacherId: string;
  classId: string;
  studentId: string;
  tahunPelajaran: string;
  orientasi: PaperOrientation;
  ukuranKertas: PaperSize;
}

export interface ImportValidationRow<T> {
  rowNumber: number;
  data: T;
  errors: string[];
  isValid: boolean;
}
