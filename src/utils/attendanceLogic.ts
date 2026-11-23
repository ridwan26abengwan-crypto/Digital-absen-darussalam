import type {
  Student,
  StudentAttendance,
  Teacher,
  TeacherAttendance,
  TeacherAttendanceStatus,
} from '../types';

export function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}

export function sanitizeId(value: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleaned.slice(0, 128) || 'id';
}

export function normalizeLoginIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  const slug = trimmed
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
  return `${slug}@misdarussalam.sch.id`;
}

export function formatTanggalISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatJamHHmm(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatTanggalIndonesia(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate;
  }
  const [y, m, d] = isoDate.split('-').map(Number);
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return `${d} ${months[m - 1] ?? ''} ${y}`;
}

export function buildTeacherAttendanceId(teacherId: string, tanggal: string): string {
  return `${sanitizeId(teacherId)}_${tanggal}`;
}

export function buildStudentAttendanceId(studentId: string, tanggal: string): string {
  return `${sanitizeId(studentId)}_${tanggal}`;
}

export function determineTeacherAttendanceStatus(
  jamMasuk: string,
  batasJamMasuk: string,
  requestedStatus: TeacherAttendanceStatus
): TeacherAttendanceStatus {
  if (requestedStatus !== 'HADIR') {
    return requestedStatus;
  }
  if (!/^\d{2}:\d{2}$/.test(jamMasuk) || !/^\d{2}:\d{2}$/.test(batasJamMasuk)) {
    return 'HADIR';
  }
  return jamMasuk > batasJamMasuk ? 'TERLAMBAT' : 'HADIR';
}

export interface TeacherDashboardStats {
  totalGuru: number;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  dinas: number;
  alpa: number;
  belumAbsen: number;
}

export function computeTeacherDashboardStats(
  teachers: Teacher[],
  todayAttendances: TeacherAttendance[]
): TeacherDashboardStats {
  const activeTeachers = teachers.filter((t) => t.statusAkun === 'ACTIVE');
  const totalGuru = activeTeachers.length;

  const latestByTeacher = new Map<string, TeacherAttendance>();
  for (const att of todayAttendances) {
    latestByTeacher.set(att.teacherId, att);
  }

  let hadir = 0;
  let terlambat = 0;
  let izin = 0;
  let sakit = 0;
  let dinas = 0;
  let alpa = 0;

  for (const att of latestByTeacher.values()) {
    switch (att.status) {
      case 'HADIR':
        hadir += 1;
        break;
      case 'TERLAMBAT':
        terlambat += 1;
        break;
      case 'IZIN':
        izin += 1;
        break;
      case 'SAKIT':
        sakit += 1;
        break;
      case 'DINAS':
        dinas += 1;
        break;
      case 'ALPA':
        alpa += 1;
        break;
    }
  }

  const recordedCount = activeTeachers.filter((t) => latestByTeacher.has(t.teacherId)).length;
  const belumAbsen = Math.max(0, totalGuru - recordedCount);

  return {
    totalGuru,
    hadir,
    terlambat,
    izin,
    sakit,
    dinas,
    alpa,
    belumAbsen,
  };
}

export interface StudentDashboardStats {
  totalSiswa: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  dispensasi: number;
}

export function computeStudentDashboardStats(
  students: Student[],
  todayAttendances: StudentAttendance[]
): StudentDashboardStats {
  const activeStudents = students.filter((s) => s.status === 'AKTIF');
  const totalSiswa = activeStudents.length;

  let hadir = 0;
  let sakit = 0;
  let izin = 0;
  let alpa = 0;
  let dispensasi = 0;

  for (const att of todayAttendances) {
    switch (att.status) {
      case 'H':
        hadir += 1;
        break;
      case 'S':
        sakit += 1;
        break;
      case 'I':
        izin += 1;
        break;
      case 'A':
        alpa += 1;
        break;
      case 'D':
        dispensasi += 1;
        break;
    }
  }

  return {
    totalSiswa,
    hadir,
    sakit,
    izin,
    alpa,
    dispensasi,
  };
}

export interface TeacherRecapRow {
  teacherId: string;
  namaLengkap: string;
  nip: string;
  nuptk: string;
  jabatan: string;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  dinas: number;
  alpa: number;
  totalHari: number;
  persentase: number;
}

export function buildTeacherRecap(
  teachers: Teacher[],
  attendances: TeacherAttendance[]
): TeacherRecapRow[] {
  const byTeacher = new Map<string, TeacherAttendance[]>();
  for (const att of attendances) {
    const arr = byTeacher.get(att.teacherId) ?? [];
    arr.push(att);
    byTeacher.set(att.teacherId, arr);
  }

  return teachers.map((t) => {
    const rows = byTeacher.get(t.teacherId) ?? [];
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let dinas = 0;
    let alpa = 0;
    for (const r of rows) {
      if (r.status === 'HADIR') hadir += 1;
      else if (r.status === 'TERLAMBAT') terlambat += 1;
      else if (r.status === 'IZIN') izin += 1;
      else if (r.status === 'SAKIT') sakit += 1;
      else if (r.status === 'DINAS') dinas += 1;
      else if (r.status === 'ALPA') alpa += 1;
    }
    const totalHari = rows.length;
    const effectivePresent = hadir + terlambat + dinas;
    const persentase = totalHari > 0 ? Math.round((effectivePresent / totalHari) * 1000) / 10 : 0;
    return {
      teacherId: t.teacherId,
      namaLengkap: t.namaLengkap,
      nip: t.nip ?? '-',
      nuptk: t.nuptk ?? '-',
      jabatan: t.jabatan,
      hadir,
      terlambat,
      izin,
      sakit,
      dinas,
      alpa,
      totalHari,
      persentase,
    };
  });
}

export interface StudentRecapRow {
  studentId: string;
  namaLengkap: string;
  nis: string;
  nisn: string;
  kelasNama: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  dispensasi: number;
  totalHari: number;
  persentase: number;
}

export function buildStudentRecap(
  students: Student[],
  attendances: StudentAttendance[]
): StudentRecapRow[] {
  const byStudent = new Map<string, StudentAttendance[]>();
  for (const att of attendances) {
    const arr = byStudent.get(att.studentId) ?? [];
    arr.push(att);
    byStudent.set(att.studentId, arr);
  }

  return students.map((s) => {
    const rows = byStudent.get(s.studentId) ?? [];
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    let dispensasi = 0;
    for (const r of rows) {
      if (r.status === 'H') hadir += 1;
      else if (r.status === 'S') sakit += 1;
      else if (r.status === 'I') izin += 1;
      else if (r.status === 'A') alpa += 1;
      else if (r.status === 'D') dispensasi += 1;
    }
    const totalHari = rows.length;
    const effectivePresent = hadir + dispensasi;
    const persentase = totalHari > 0 ? Math.round((effectivePresent / totalHari) * 1000) / 10 : 0;
    return {
      studentId: s.studentId,
      namaLengkap: s.namaLengkap,
      nis: s.nis,
      nisn: s.nisn ?? '-',
      kelasNama: s.kelasNama,
      hadir,
      sakit,
      izin,
      alpa,
      dispensasi,
      totalHari,
      persentase,
    };
  });
}

export function buildPdfFilename(
  jenisLaporan: string,
  periodeLabel: string,
  kelasLabel?: string
): string {
  const clean = (s: string) =>
    s
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');

  const p = clean(periodeLabel) || '2026';
  switch (jenisLaporan) {
    case 'ABSENSI_GURU':
      return `Laporan_Absensi_Guru_${p}.pdf`;
    case 'PER_GURU':
      return `Rekap_Absensi_Guru_${p}.pdf`;
    case 'ABSENSI_SISWA':
      return `Laporan_Absensi_Siswa_${clean(kelasLabel || 'Semua_Kelas')}_${p}.pdf`;
    case 'PER_KELAS':
      return `Rekap_Absensi_${clean(kelasLabel || 'Kelas')}_${p}.pdf`;
    case 'PER_SISWA':
      return `Rekap_Absensi_Siswa_${p}.pdf`;
    default:
      return `Laporan_MIS_Darussalam_${p}.pdf`;
  }
}
