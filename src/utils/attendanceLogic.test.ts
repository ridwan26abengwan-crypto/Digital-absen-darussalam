import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPdfFilename,
  buildStudentAttendanceId,
  buildStudentRecap,
  buildTeacherAttendanceId,
  buildTeacherRecap,
  computeStudentDashboardStats,
  computeTeacherDashboardStats,
  determineTeacherAttendanceStatus,
  formatTanggalIndonesia,
  normalizeLoginIdentifier,
} from './attendanceLogic';
import type { Student, StudentAttendance, Teacher, TeacherAttendance } from '../types';

test('normalizeLoginIdentifier maps username MIS DARUSSALAM to auth email and preserves direct emails', () => {
  assert.equal(normalizeLoginIdentifier('MIS DARUSSALAM'), 'mis.darussalam@misdarussalam.sch.id');
  assert.equal(normalizeLoginIdentifier('  ahmad.fadloli  '), 'ahmad.fadloli@misdarussalam.sch.id');
  assert.equal(normalizeLoginIdentifier('Guru@Example.com'), 'guru@example.com');
  assert.equal(normalizeLoginIdentifier('   '), '');
});

test('deterministic attendance IDs combine entityId and date cleanly', () => {
  assert.equal(buildTeacherAttendanceId('tch-01', '2026-11-23'), 'tch-01_2026-11-23');
  assert.equal(buildStudentAttendanceId('std-99', '2026-11-23'), 'std-99_2026-11-23');
});

test('determineTeacherAttendanceStatus flags late arrival when HADIR is past cutoff', () => {
  assert.equal(determineTeacherAttendanceStatus('07:05', '07:15', 'HADIR'), 'HADIR');
  assert.equal(determineTeacherAttendanceStatus('07:15', '07:15', 'HADIR'), 'HADIR');
  assert.equal(determineTeacherAttendanceStatus('07:16', '07:15', 'HADIR'), 'TERLAMBAT');
  assert.equal(determineTeacherAttendanceStatus('09:00', '07:15', 'DINAS'), 'DINAS');
  assert.equal(determineTeacherAttendanceStatus('08:30', '07:15', 'SAKIT'), 'SAKIT');
});

test('computeTeacherDashboardStats computes accurate counts and belumAbsen', () => {
  const teachers: Teacher[] = [
    {
      teacherId: 't1',
      namaLengkap: 'Ahmad Fadloli',
      jenisKelamin: 'L',
      jabatan: 'Wali Kelas 5',
      statusKepegawaian: 'GTY',
      statusAkun: 'ACTIVE',
    },
    {
      teacherId: 't2',
      namaLengkap: 'Siti Aminah',
      jenisKelamin: 'P',
      jabatan: 'Wali Kelas 1',
      statusKepegawaian: 'GTY',
      statusAkun: 'ACTIVE',
    },
    {
      teacherId: 't3',
      namaLengkap: 'Ridwan',
      jenisKelamin: 'L',
      jabatan: 'Guru PJOK',
      statusKepegawaian: 'GTT',
      statusAkun: 'ACTIVE',
    },
  ];

  const todayAtt: TeacherAttendance[] = [
    {
      attendanceId: 't1_2026-11-23',
      teacherId: 't1',
      userId: 'u1',
      namaGuru: 'Ahmad Fadloli',
      tanggal: '2026-11-23',
      jamMasuk: '07:05',
      status: 'HADIR',
    },
    {
      attendanceId: 't3_2026-11-23',
      teacherId: 't3',
      userId: 'u3',
      namaGuru: 'Ridwan',
      tanggal: '2026-11-23',
      jamMasuk: '07:25',
      status: 'TERLAMBAT',
    },
  ];

  const stats = computeTeacherDashboardStats(teachers, todayAtt);
  assert.equal(stats.totalGuru, 3);
  assert.equal(stats.hadir, 1);
  assert.equal(stats.terlambat, 1);
  assert.equal(stats.belumAbsen, 1);
});

test('computeStudentDashboardStats and buildStudentRecap calculate H/S/I/A/D and percentage', () => {
  const students: Student[] = [
    {
      studentId: 's1',
      nis: '1001',
      namaLengkap: 'Aisyah',
      jenisKelamin: 'P',
      classId: 'c5',
      kelasNama: '5A',
      tahunPelajaran: '2026/2027',
      status: 'AKTIF',
    },
    {
      studentId: 's2',
      nis: '1002',
      namaLengkap: 'Budi',
      jenisKelamin: 'L',
      classId: 'c5',
      kelasNama: '5A',
      tahunPelajaran: '2026/2027',
      status: 'AKTIF',
    },
  ];

  const att: StudentAttendance[] = [
    {
      attendanceId: 's1_2026-11-22',
      studentId: 's1',
      studentName: 'Aisyah',
      classId: 'c5',
      tanggal: '2026-11-22',
      status: 'H',
      teacherId: 't1',
      teacherUid: 'u1',
    },
    {
      attendanceId: 's1_2026-11-23',
      studentId: 's1',
      studentName: 'Aisyah',
      classId: 'c5',
      tanggal: '2026-11-23',
      status: 'D',
      teacherId: 't1',
      teacherUid: 'u1',
    },
    {
      attendanceId: 's2_2026-11-23',
      studentId: 's2',
      studentName: 'Budi',
      classId: 'c5',
      tanggal: '2026-11-23',
      status: 'S',
      teacherId: 't1',
      teacherUid: 'u1',
    },
  ];

  const todayStats = computeStudentDashboardStats(
    students,
    att.filter((a) => a.tanggal === '2026-11-23')
  );
  assert.equal(todayStats.totalSiswa, 2);
  assert.equal(todayStats.dispensasi, 1);
  assert.equal(todayStats.sakit, 1);

  const recap = buildStudentRecap(students, att);
  assert.equal(recap[0].hadir, 1);
  assert.equal(recap[0].dispensasi, 1);
  assert.equal(recap[0].persentase, 100);
  assert.equal(recap[1].sakit, 1);
  assert.equal(recap[1].persentase, 0);
});

test('buildTeacherRecap and buildPdfFilename format outputs accurately', () => {
  const teachers: Teacher[] = [
    {
      teacherId: 't1',
      namaLengkap: 'Ahmad Fadloli',
      nip: '19880101',
      jenisKelamin: 'L',
      jabatan: 'Guru Kelas',
      statusKepegawaian: 'GTY',
      statusAkun: 'ACTIVE',
    },
  ];
  const att: TeacherAttendance[] = [
    {
      attendanceId: 't1_2026-11-22',
      teacherId: 't1',
      userId: 'u1',
      namaGuru: 'Ahmad Fadloli',
      tanggal: '2026-11-22',
      jamMasuk: '07:00',
      status: 'HADIR',
    },
    {
      attendanceId: 't1_2026-11-23',
      teacherId: 't1',
      userId: 'u1',
      namaGuru: 'Ahmad Fadloli',
      tanggal: '2026-11-23',
      jamMasuk: '07:00',
      status: 'IZIN',
    },
  ];

  const recap = buildTeacherRecap(teachers, att);
  assert.equal(recap[0].hadir, 1);
  assert.equal(recap[0].izin, 1);
  assert.equal(recap[0].persentase, 50);

  assert.equal(
    buildPdfFilename('ABSENSI_GURU', 'November 2026'),
    'Laporan_Absensi_Guru_November_2026.pdf'
  );
  assert.equal(
    buildPdfFilename('ABSENSI_SISWA', 'November 2026', 'Kelas 5'),
    'Laporan_Absensi_Siswa_Kelas_5_November_2026.pdf'
  );
  assert.equal(formatTanggalIndonesia('2026-11-23'), '23 November 2026');
});
