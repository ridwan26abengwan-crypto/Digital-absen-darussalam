import * as XLSX from 'xlsx';
import type {
  EmploymentStatus,
  ImportValidationRow,
  SchoolClass,
  Student,
  StudentAttendance,
  Teacher,
  TeacherAttendance,
} from '../types';
import type { StudentRecapRow, TeacherRecapRow } from './attendanceLogic';

export interface TeacherImportPayload {
  namaLengkap: string;
  nip: string;
  nuptk: string;
  nik: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string;
  tanggalLahir: string;
  pendidikanTerakhir: string;
  jabatan: string;
  statusKepegawaian: EmploymentStatus;
  nomorHp: string;
  alamat: string;
  email: string;
  username: string;
}

export interface StudentImportPayload {
  nis: string;
  nisn: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string;
  tanggalLahir: string;
  agama: string;
  alamat: string;
  namaAyah: string;
  namaIbu: string;
  nomorHpOrtu: string;
  kelasNama: string;
  tahunPelajaran: string;
}

export interface ClassImportPayload {
  namaRombel: string;
  kelas: number;
  tahunPelajaran: string;
  waliKelasNama: string;
  kapasitas: number;
}

const VALID_EMPLOYMENT: EmploymentStatus[] = ['PNS', 'PPPK', 'GTY', 'GTT', 'Honorer'];

export function validateTeacherImportRows(
  rawRows: Record<string, unknown>[]
): ImportValidationRow<TeacherImportPayload>[] {
  return rawRows.map((row, idx) => {
    const errors: string[] = [];
    const namaLengkap = String(row['Nama Lengkap'] ?? row['namaLengkap'] ?? '').trim();
    const jkRaw = String(row['Jenis Kelamin (L/P)'] ?? row['jenisKelamin'] ?? 'L')
      .trim()
      .toUpperCase();
    const jenisKelamin: 'L' | 'P' = jkRaw === 'P' ? 'P' : 'L';
    const jabatan = String(row['Jabatan'] ?? row['jabatan'] ?? 'Guru Kelas').trim();
    const statusRaw = String(row['Status Kepegawaian'] ?? row['statusKepegawaian'] ?? 'GTY').trim();
    const statusKepegawaian: EmploymentStatus = VALID_EMPLOYMENT.includes(
      statusRaw as EmploymentStatus
    )
      ? (statusRaw as EmploymentStatus)
      : 'GTY';

    if (!namaLengkap) {
      errors.push('Nama Lengkap wajib diisi');
    }
    if (jkRaw && jkRaw !== 'L' && jkRaw !== 'P') {
      errors.push('Jenis Kelamin harus L atau P');
    }
    if (!jabatan) {
      errors.push('Jabatan wajib diisi');
    }
    if (statusRaw && !VALID_EMPLOYMENT.includes(statusRaw as EmploymentStatus)) {
      errors.push('Status Kepegawaian harus PNS/PPPK/GTY/GTT/Honorer');
    }

    return {
      rowNumber: idx + 2,
      isValid: errors.length === 0,
      errors,
      data: {
        namaLengkap,
        nip: String(row['NIP'] ?? row['nip'] ?? '').trim(),
        nuptk: String(row['NUPTK'] ?? row['nuptk'] ?? '').trim(),
        nik: String(row['NIK'] ?? row['nik'] ?? '').trim(),
        jenisKelamin,
        tempatLahir: String(row['Tempat Lahir'] ?? row['tempatLahir'] ?? '').trim(),
        tanggalLahir: String(row['Tanggal Lahir'] ?? row['tanggalLahir'] ?? '').trim(),
        pendidikanTerakhir: String(row['Pendidikan Terakhir'] ?? row['pendidikanTerakhir'] ?? 'S1').trim(),
        jabatan,
        statusKepegawaian,
        nomorHp: String(row['Nomor HP'] ?? row['nomorHp'] ?? '').trim(),
        alamat: String(row['Alamat'] ?? row['alamat'] ?? '').trim(),
        email: String(row['Email'] ?? row['email'] ?? '').trim(),
        username: String(row['Username'] ?? row['username'] ?? '').trim(),
      },
    };
  });
}

export function validateStudentImportRows(
  rawRows: Record<string, unknown>[],
  availableClasses: SchoolClass[],
  defaultTahunPelajaran = '2026/2027'
): ImportValidationRow<StudentImportPayload>[] {
  const classNames = new Set(availableClasses.map((c) => c.namaRombel.toLowerCase()));
  return rawRows.map((row, idx) => {
    const errors: string[] = [];
    const nis = String(row['NIS'] ?? row['nis'] ?? '').trim();
    const namaLengkap = String(row['Nama Lengkap'] ?? row['namaLengkap'] ?? '').trim();
    const jkRaw = String(row['Jenis Kelamin (L/P)'] ?? row['jenisKelamin'] ?? 'L')
      .trim()
      .toUpperCase();
    const jenisKelamin: 'L' | 'P' = jkRaw === 'P' ? 'P' : 'L';
    const kelasNama = String(row['Kelas / Rombel'] ?? row['kelasNama'] ?? '').trim();
    const tahunPelajaran = String(
      row['Tahun Pelajaran'] ?? row['tahunPelajaran'] ?? defaultTahunPelajaran
    ).trim();

    if (!nis) errors.push('NIS wajib diisi');
    if (!namaLengkap) errors.push('Nama Lengkap wajib diisi');
    if (jkRaw && jkRaw !== 'L' && jkRaw !== 'P') errors.push('Jenis Kelamin harus L atau P');
    if (!kelasNama) {
      errors.push('Kelas / Rombel wajib diisi');
    } else if (classNames.size > 0 && !classNames.has(kelasNama.toLowerCase())) {
      errors.push(`Rombel "${kelasNama}" belum terdaftar di Data Kelas`);
    }

    return {
      rowNumber: idx + 2,
      isValid: errors.length === 0,
      errors,
      data: {
        nis,
        nisn: String(row['NISN'] ?? row['nisn'] ?? '').trim(),
        namaLengkap,
        jenisKelamin,
        tempatLahir: String(row['Tempat Lahir'] ?? row['tempatLahir'] ?? '').trim(),
        tanggalLahir: String(row['Tanggal Lahir'] ?? row['tanggalLahir'] ?? '').trim(),
        agama: String(row['Agama'] ?? row['agama'] ?? 'Islam').trim(),
        alamat: String(row['Alamat'] ?? row['alamat'] ?? '').trim(),
        namaAyah: String(row['Nama Ayah'] ?? row['namaAyah'] ?? '').trim(),
        namaIbu: String(row['Nama Ibu'] ?? row['namaIbu'] ?? '').trim(),
        nomorHpOrtu: String(row['No HP Orang Tua'] ?? row['nomorHpOrtu'] ?? '').trim(),
        kelasNama,
        tahunPelajaran,
      },
    };
  });
}

export function validateClassImportRows(
  rawRows: Record<string, unknown>[],
  defaultTahunPelajaran = '2026/2027'
): ImportValidationRow<ClassImportPayload>[] {
  return rawRows.map((row, idx) => {
    const errors: string[] = [];
    const namaRombel = String(row['Nama Rombel'] ?? row['namaRombel'] ?? '').trim();
    const kelasNum = Number(row['Tingkat Kelas (1-6)'] ?? row['kelas'] ?? 0);
    const kapasitasNum = Number(row['Kapasitas'] ?? row['kapasitas'] ?? 28);
    const tahunPelajaran = String(
      row['Tahun Pelajaran'] ?? row['tahunPelajaran'] ?? defaultTahunPelajaran
    ).trim();

    if (!namaRombel) errors.push('Nama Rombel wajib diisi');
    if (!Number.isInteger(kelasNum) || kelasNum < 1 || kelasNum > 6) {
      errors.push('Tingkat Kelas harus angka 1 sampai 6');
    }
    if (!Number.isInteger(kapasitasNum) || kapasitasNum < 1 || kapasitasNum > 100) {
      errors.push('Kapasitas harus antara 1 sampai 100');
    }

    return {
      rowNumber: idx + 2,
      isValid: errors.length === 0,
      errors,
      data: {
        namaRombel,
        kelas: Number.isInteger(kelasNum) ? kelasNum : 1,
        tahunPelajaran,
        waliKelasNama: String(row['Wali Kelas'] ?? row['waliKelasNama'] ?? '').trim(),
        kapasitas: Number.isInteger(kapasitasNum) ? kapasitasNum : 28,
      },
    };
  });
}

export async function parseSpreadsheetFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];
  const worksheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
}

export function downloadExcelTemplate(type: 'guru' | 'siswa' | 'kelas'): void {
  let headers: Record<string, string | number>[] = [];
  let filename = 'Template.xlsx';

  if (type === 'guru') {
    filename = 'Template_Import_Guru_MIS_Darussalam.xlsx';
    headers = [
      {
        'Nama Lengkap': 'Ahmad Fadloli, S.Pd.I',
        NIP: '198805122019031004',
        NUPTK: '4844766667130122',
        NIK: '3213011205880001',
        'Jenis Kelamin (L/P)': 'L',
        'Tempat Lahir': 'Subang',
        'Tanggal Lahir': '1988-05-12',
        'Pendidikan Terakhir': 'S1',
        Jabatan: 'Wali Kelas 5A',
        'Status Kepegawaian': 'GTY',
        'Nomor HP': '085612345678',
        Alamat: 'Dsn Wanasari Ds. Pinangsari Kec. Ciasem',
        Email: 'ahmad.fadloli@misdarussalam.sch.id',
        Username: 'ahmad.fadloli',
      },
    ];
  } else if (type === 'siswa') {
    filename = 'Template_Import_Siswa_MIS_Darussalam.xlsx';
    headers = [
      {
        NIS: '202601001',
        NISN: '0134567890',
        'Nama Lengkap': 'Aisyah Putri Ramadhani',
        'Jenis Kelamin (L/P)': 'P',
        'Tempat Lahir': 'Subang',
        'Tanggal Lahir': '2016-04-10',
        Agama: 'Islam',
        Alamat: 'Dsn Wanasari Ds. Pinangsari',
        'Nama Ayah': 'Hendra Wijaya',
        'Nama Ibu': 'Siti Fatimah',
        'No HP Orang Tua': '081234567890',
        'Kelas / Rombel': '1A',
        'Tahun Pelajaran': '2026/2027',
      },
    ];
  } else {
    filename = 'Template_Import_Kelas_MIS_Darussalam.xlsx';
    headers = [
      {
        'Nama Rombel': '1A',
        'Tingkat Kelas (1-6)': 1,
        'Tahun Pelajaran': '2026/2027',
        'Wali Kelas': 'Siti Aminah, S.Pd',
        Kapasitas: 28,
      },
    ];
  }

  const ws = XLSX.utils.json_to_sheet(headers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, filename);
}

export function exportTeachersToExcel(teachers: Teacher[]): void {
  const rows = teachers.map((t, idx) => ({
    No: idx + 1,
    'Nama Lengkap': t.namaLengkap,
    NIP: t.nip ?? '',
    NUPTK: t.nuptk ?? '',
    NIK: t.nik ?? '',
    'Jenis Kelamin': t.jenisKelamin,
    'Tempat Lahir': t.tempatLahir ?? '',
    'Tanggal Lahir': t.tanggalLahir ?? '',
    'Pendidikan Terakhir': t.pendidikanTerakhir ?? '',
    Jabatan: t.jabatan,
    'Status Kepegawaian': t.statusKepegawaian,
    'Nomor HP': t.nomorHp ?? '',
    Alamat: t.alamat ?? '',
    Email: t.email ?? '',
    Username: t.username ?? '',
    'Status Akun': t.statusAkun,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Guru');
  XLSX.writeFile(wb, 'Data_Guru_MIS_Darussalam.xlsx');
}

export function exportStudentsToExcel(students: Student[]): void {
  const rows = students.map((s, idx) => ({
    No: idx + 1,
    NIS: s.nis,
    NISN: s.nisn ?? '',
    'Nama Lengkap': s.namaLengkap,
    'Jenis Kelamin': s.jenisKelamin,
    'Tempat Lahir': s.tempatLahir ?? '',
    'Tanggal Lahir': s.tanggalLahir ?? '',
    Agama: s.agama ?? 'Islam',
    Alamat: s.alamat ?? '',
    'Nama Ayah': s.namaAyah ?? '',
    'Nama Ibu': s.namaIbu ?? '',
    'No HP Orang Tua': s.nomorHpOrtu ?? '',
    Kelas: s.kelasNama,
    'Tahun Pelajaran': s.tahunPelajaran,
    Status: s.status,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
  XLSX.writeFile(wb, 'Data_Siswa_MIS_Darussalam.xlsx');
}

export function exportClassesToExcel(classes: SchoolClass[]): void {
  const rows = classes.map((c, idx) => ({
    No: idx + 1,
    'Nama Rombel': c.namaRombel,
    'Tingkat Kelas': c.kelas,
    'Tahun Pelajaran': c.tahunPelajaran,
    'Wali Kelas': c.waliKelasNama ?? '-',
    Kapasitas: c.kapasitas,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Kelas');
  XLSX.writeFile(wb, 'Data_Kelas_MIS_Darussalam.xlsx');
}

export function exportTeacherAttendanceToExcel(
  attendances: TeacherAttendance[],
  filename = 'Absensi_Guru_MIS_Darussalam.xlsx'
): void {
  const rows = attendances.map((a, idx) => ({
    No: idx + 1,
    Tanggal: a.tanggal,
    'Nama Guru': a.namaGuru,
    NIP: a.nip ?? '-',
    'Jam Masuk': a.jamMasuk,
    'Jam Pulang': a.jamPulang ?? '-',
    Status: a.status,
    Keterangan: a.keterangan ?? '-',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Absensi Guru');
  XLSX.writeFile(wb, filename);
}

export function exportStudentAttendanceToExcel(
  attendances: StudentAttendance[],
  filename = 'Absensi_Siswa_MIS_Darussalam.xlsx'
): void {
  const rows = attendances.map((a, idx) => ({
    No: idx + 1,
    Tanggal: a.tanggal,
    NIS: a.nis ?? '-',
    NISN: a.nisn ?? '-',
    'Nama Siswa': a.studentName,
    Kelas: a.kelasNama ?? '-',
    Status: a.status,
    Keterangan: a.keterangan ?? '-',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Absensi Siswa');
  XLSX.writeFile(wb, filename);
}

export function exportTeacherRecapToExcel(
  recap: TeacherRecapRow[],
  label = 'Bulanan'
): void {
  const rows = recap.map((r, idx) => ({
    No: idx + 1,
    'Nama Guru': r.namaLengkap,
    'NIP/NUPTK': r.nip !== '-' ? r.nip : r.nuptk,
    Jabatan: r.jabatan,
    Hadir: r.hadir,
    Terlambat: r.terlambat,
    Izin: r.izin,
    Sakit: r.sakit,
    Dinas: r.dinas,
    Alpa: r.alpa,
    'Persentase (%)': r.persentase,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Guru');
  XLSX.writeFile(wb, `Rekap_Absensi_Guru_${label.replace(/\s+/g, '_')}.xlsx`);
}

export function exportStudentRecapToExcel(
  recap: StudentRecapRow[],
  label = 'Bulanan'
): void {
  const rows = recap.map((r, idx) => ({
    No: idx + 1,
    'Nama Siswa': r.namaLengkap,
    NIS: r.nis,
    NISN: r.nisn,
    Kelas: r.kelasNama,
    Hadir: r.hadir,
    Sakit: r.sakit,
    Izin: r.izin,
    Alpa: r.alpa,
    Dispensasi: r.dispensasi,
    'Persentase (%)': r.persentase,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Siswa');
  XLSX.writeFile(wb, `Rekap_Absensi_Siswa_${label.replace(/\s+/g, '_')}.xlsx`);
}
