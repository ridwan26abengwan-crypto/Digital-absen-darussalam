import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateClassImportRows,
  validateStudentImportRows,
  validateTeacherImportRows,
} from './excelUtils';
import type { SchoolClass } from '../types';

test('validateTeacherImportRows catches missing names and invalid status', () => {
  const res = validateTeacherImportRows([
    {
      'Nama Lengkap': 'Siti Aminah',
      'Jenis Kelamin (L/P)': 'P',
      Jabatan: 'Wali Kelas 1A',
      'Status Kepegawaian': 'GTY',
    },
    {
      'Nama Lengkap': '',
      'Jenis Kelamin (L/P)': 'X',
      Jabatan: 'Guru',
      'Status Kepegawaian': 'KONTRAK',
    },
  ]);

  assert.equal(res[0].isValid, true);
  assert.equal(res[1].isValid, false);
  assert.ok(res[1].errors.some((e) => e.includes('Nama Lengkap')));
  assert.ok(res[1].errors.some((e) => e.includes('Jenis Kelamin')));
  assert.ok(res[1].errors.some((e) => e.includes('Status Kepegawaian')));
});

test('validateStudentImportRows checks rombel existence and required fields', () => {
  const classes: SchoolClass[] = [
    {
      classId: 'c1',
      namaRombel: '1A',
      kelas: 1,
      tahunPelajaran: '2026/2027',
      kapasitas: 28,
    },
  ];

  const res = validateStudentImportRows(
    [
      { NIS: '101', 'Nama Lengkap': 'Budi', 'Jenis Kelamin (L/P)': 'L', 'Kelas / Rombel': '1A' },
      { NIS: '', 'Nama Lengkap': 'Ani', 'Jenis Kelamin (L/P)': 'P', 'Kelas / Rombel': '9Z' },
    ],
    classes
  );

  assert.equal(res[0].isValid, true);
  assert.equal(res[1].isValid, false);
  assert.ok(res[1].errors.some((e) => e.includes('NIS wajib')));
  assert.ok(res[1].errors.some((e) => e.includes('belum terdaftar')));
});

test('validateClassImportRows validates grade level 1-6 and capacity', () => {
  const res = validateClassImportRows([
    { 'Nama Rombel': '2A', 'Tingkat Kelas (1-6)': 2, Kapasitas: 30 },
    { 'Nama Rombel': '7A', 'Tingkat Kelas (1-6)': 7, Kapasitas: 0 },
  ]);

  assert.equal(res[0].isValid, true);
  assert.equal(res[1].isValid, false);
});
