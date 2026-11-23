import type {
  SchoolSettings,
  StudentAttendanceStatus,
  TeacherAttendanceStatus,
} from '../types';

export const DEFAULT_LEFT_LOGO = '/src/assets/images/logo_mis_darussalam_1795458553718.jpg';
export const DEFAULT_RIGHT_LOGO = '/src/assets/images/logo_ypi_dtq_1795458553222.jpg';
export const HERO_CAMPUS_IMAGE = '/src/assets/images/madrasah_campus_hero_1795458567647.jpg';

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  namaYayasan: 'YAYASAN PENDIDIKAN ISLAM DAARUTTAQWA (YPI-DTQ)',
  namaMadrasah: 'MADRASAH IBTIDAIYAH DARUSSALAM',
  nsm: '111232130078',
  npsm: '60708974',
  akreditasi: 'B',
  nomorAkreditasi: '031/BAN-PDM/SK/2026',
  alamat: 'Jln. Wanasari No. 1 Desa Pinangsari Kec. Ciasem Kab. Subang 41265',
  alamatSingkat: 'Dsn Wanasari, Ds. Pinangsari, Kec. Ciasem, Kab. Subang',
  telepon: '08568639720',
  kepalaMadrasah: 'Kepala Madrasah MIS Darussalam',
  nipKepalaMadrasah: '-',
  kota: 'Ciasem, Subang',
  tahunPelajaranAktif: '2026/2027',
  jamMasukBatas: '07:15',
  logoKiriUrl: DEFAULT_LEFT_LOGO,
  logoKananUrl: DEFAULT_RIGHT_LOGO,
};

export const TEACHER_STATUS_LABELS: Record<TeacherAttendanceStatus, string> = {
  HADIR: 'Hadir',
  TERLAMBAT: 'Terlambat',
  IZIN: 'Izin',
  SAKIT: 'Sakit',
  DINAS: 'Dinas Luar',
  ALPA: 'Alpa',
};

export const STUDENT_STATUS_LABELS: Record<StudentAttendanceStatus, string> = {
  H: 'Hadir',
  S: 'Sakit',
  I: 'Izin',
  A: 'Alpa',
  D: 'Dispensasi',
};

export const INDONESIAN_MONTHS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];
