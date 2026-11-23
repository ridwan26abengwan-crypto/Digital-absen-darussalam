import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useToast } from '../../contexts/ToastContext';
import {
  saveSchoolClass,
  saveStudent,
  saveTeacher,
} from '../../services/firestoreService';
import type { ImportValidationRow } from '../../types';
import { buildStudentRecap, buildTeacherRecap } from '../../utils/attendanceLogic';
import {
  downloadExcelTemplate,
  exportClassesToExcel,
  exportStudentAttendanceToExcel,
  exportStudentRecapToExcel,
  exportStudentsToExcel,
  exportTeacherAttendanceToExcel,
  exportTeacherRecapToExcel,
  exportTeachersToExcel,
  parseSpreadsheetFile,
  validateClassImportRows,
  validateStudentImportRows,
  validateTeacherImportRows,
  type ClassImportPayload,
  type StudentImportPayload,
  type TeacherImportPayload,
} from '../../utils/excelUtils';

type ImportMode = 'guru' | 'siswa' | 'kelas';

export const ImportExportPage: React.FC = () => {
  const { userProfile } = useAuth();
  const {
    teachers,
    students,
    classes,
    teacherAttendances,
    studentAttendances,
    schoolSettings,
  } = useSchoolData();
  const { showToast } = useToast();

  const [mode, setMode] = useState<ImportMode>('guru');
  const [teacherRows, setTeacherRows] = useState<ImportValidationRow<TeacherImportPayload>[]>([]);
  const [studentRows, setStudentRows] = useState<ImportValidationRow<StudentImportPayload>[]>([]);
  const [classRows, setClassRows] = useState<ImportValidationRow<ClassImportPayload>[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await parseSpreadsheetFile(file);
      if (raw.length === 0) {
        showToast('File spreadsheet kosong atau format tidak terbaca.', 'warning');
        return;
      }
      if (mode === 'guru') {
        setTeacherRows(validateTeacherImportRows(raw));
      } else if (mode === 'siswa') {
        setStudentRows(
          validateStudentImportRows(raw, classes, schoolSettings.tahunPelajaranAktif)
        );
      } else {
        setClassRows(validateClassImportRows(raw, schoolSettings.tahunPelajaranAktif));
      }
      showToast(`Berhasil membaca ${raw.length} baris dari ${file.name}.`, 'info');
    } catch {
      showToast('Gagal membaca file Excel/CSV. Pastikan format valid.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const activeRows =
    mode === 'guru' ? teacherRows : mode === 'siswa' ? studentRows : classRows;
  const invalidCount = activeRows.filter((r) => !r.isValid).length;
  const validCount = activeRows.filter((r) => r.isValid).length;

  const handleCommitImport = async () => {
    if (!userProfile || validCount === 0) return;
    setImporting(true);
    const actor = { user: userProfile.nama, uid: userProfile.uid, role: userProfile.role };
    let saved = 0;

    try {
      if (mode === 'guru') {
        for (const r of teacherRows.filter((x) => x.isValid)) {
          await saveTeacher(
            {
              ...r.data,
              userId: '',
              foto: '',
              statusAkun: 'ACTIVE',
            },
            actor
          );
          saved += 1;
        }
        setTeacherRows([]);
      } else if (mode === 'siswa') {
        const classByName = new Map(
          classes.map((c) => [c.namaRombel.toLowerCase(), c])
        );
        for (const r of studentRows.filter((x) => x.isValid)) {
          const cls = classByName.get(r.data.kelasNama.toLowerCase());
          if (!cls) continue;
          await saveStudent(
            {
              ...r.data,
              classId: cls.classId,
              kelasNama: cls.namaRombel,
              waliKelasUid: cls.waliKelasUid ?? '',
              status: 'AKTIF',
              foto: '',
            },
            actor
          );
          saved += 1;
        }
        setStudentRows([]);
      } else {
        const teacherByName = new Map(
          teachers.map((t) => [t.namaLengkap.toLowerCase(), t])
        );
        for (const r of classRows.filter((x) => x.isValid)) {
          const wali = teacherByName.get(r.data.waliKelasNama.toLowerCase());
          await saveSchoolClass(
            {
              namaRombel: r.data.namaRombel,
              kelas: r.data.kelas,
              tahunPelajaran: r.data.tahunPelajaran,
              waliKelasId: wali?.teacherId ?? '',
              waliKelasUid: wali?.userId ?? '',
              waliKelasNama: wali?.namaLengkap ?? r.data.waliKelasNama,
              kapasitas: r.data.kapasitas,
            },
            actor
          );
          saved += 1;
        }
        setClassRows([]);
      }
      showToast(`${saved} data valid berhasil disimpan ke Cloud Firestore.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sebagian data gagal diimpor.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      {/* Import Center */}
      <div className="surface-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Import Data Massal (.xlsx, .xls, .csv)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unduh template resmi, unggah file, periksa validasi per baris, lalu simpan ke Firestore.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 self-start sm:self-auto">
            {(['guru', 'siswa', 'kelas'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                  mode === m
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Import {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => downloadExcelTemplate(mode)}
            className="btn-secondary"
          >
            <Download className="w-4 h-4" />
            Download Template {mode.toUpperCase()}
          </button>

          <label className="btn-primary cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload File Excel / CSV
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {activeRows.length > 0 && (
          <div className="space-y-4">
            <div className="surface-subtle flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> {validCount} baris valid
                </span>
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-semibold">
                    <AlertTriangle className="w-4 h-4" /> {invalidCount} baris bermasalah
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={importing || validCount === 0}
                onClick={handleCommitImport}
                className="btn-primary"
              >
                {importing ? 'Menyimpan ke Cloud...' : `Simpan ${validCount} Data Valid`}
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="table-head-cell">Baris</th>
                    <th className="table-head-cell">Ringkasan Data</th>
                    <th className="table-head-cell">Status Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {activeRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono tabular-nums">#{row.rowNumber}</td>
                      <td className="px-4 py-3">
                        {mode === 'guru' &&
                          `${(row.data as TeacherImportPayload).namaLengkap || '(Kosong)'} · ${(row.data as TeacherImportPayload).jabatan}`}
                        {mode === 'siswa' &&
                          `${(row.data as StudentImportPayload).nis || '(No NIS)'} · ${(row.data as StudentImportPayload).namaLengkap || '(Kosong)'} · Kelas ${(row.data as StudentImportPayload).kelasNama}`}
                        {mode === 'kelas' &&
                          `Rombel ${(row.data as ClassImportPayload).namaRombel} · Kelas ${(row.data as ClassImportPayload).kelas}`}
                      </td>
                      <td className="px-4 py-3">
                        {row.isValid ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            Valid
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-medium">
                            {row.errors.join('; ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Export Center */}
      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Pusat Export Excel (.xlsx)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Unduh seluruh arsip data induk dan rekapitulasi absensi langsung dalam format Excel.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              label: `Data Guru (${teachers.length})`,
              onClick: () => exportTeachersToExcel(teachers),
            },
            {
              label: `Data Siswa (${students.length})`,
              onClick: () => exportStudentsToExcel(students),
            },
            {
              label: `Data Kelas / Rombel (${classes.length})`,
              onClick: () => exportClassesToExcel(classes),
            },
            {
              label: `Absensi Guru (${teacherAttendances.length})`,
              onClick: () => exportTeacherAttendanceToExcel(teacherAttendances),
            },
            {
              label: `Absensi Siswa (${studentAttendances.length})`,
              onClick: () => exportStudentAttendanceToExcel(studentAttendances),
            },
            {
              label: `Rekap Bulanan (${ym})`,
              onClick: () =>
                exportTeacherRecapToExcel(
                  buildTeacherRecap(
                    teachers,
                    teacherAttendances.filter((a) => a.tanggal.startsWith(ym))
                  ),
                  ym
                ),
            },
            {
              label: `Rekap Tahunan (${now.getFullYear()})`,
              onClick: () =>
                exportStudentRecapToExcel(
                  buildStudentRecap(students, studentAttendances),
                  String(now.getFullYear())
                ),
            },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.onClick}
              className="surface-subtle flex items-center justify-between gap-2 px-4 py-3.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                {btn.label}
              </span>
              <Download className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
