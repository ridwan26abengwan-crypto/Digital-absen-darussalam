import React, { useEffect, useState } from 'react';
import { Download, Eye, FileSpreadsheet, Printer, X } from 'lucide-react';
import { INDONESIAN_MONTHS } from '../../constants/schoolDefaults';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useToast } from '../../contexts/ToastContext';
import type {
  PaperOrientation,
  PaperSize,
  ReportFilterConfig,
  ReportType,
} from '../../types';
import { formatTanggalISO } from '../../utils/attendanceLogic';
import {
  exportStudentAttendanceToExcel,
  exportTeacherAttendanceToExcel,
} from '../../utils/excelUtils';
import {
  generateOfficialPdfReport,
  type GeneratedPdfResult,
} from '../../utils/pdfReportGenerator';
import { ReportHeader } from '../../components/ReportHeader';

export const LaporanPage: React.FC = () => {
  const { userProfile } = useAuth();
  const {
    schoolSettings,
    teachers,
    students,
    classes,
    teacherAttendances,
    studentAttendances,
  } = useSchoolData();
  const { showToast } = useToast();

  const isAdmin = userProfile?.role === 'ADMIN';
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = String(now.getFullYear());

  const [filter, setFilter] = useState<ReportFilterConfig>({
    jenisLaporan: isAdmin ? 'ABSENSI_GURU' : 'ABSENSI_SISWA',
    tanggalAwal: `${currentYear}-${currentMonth}-01`,
    tanggalAkhir: formatTanggalISO(now),
    bulan: currentMonth,
    tahun: currentYear,
    teacherId: '',
    classId: '',
    studentId: '',
    tahunPelajaran: schoolSettings.tahunPelajaranAktif || '2026/2027',
    orientasi: 'landscape',
    ukuranKertas: 'a4',
  });

  const [generating, setGenerating] = useState(false);
  const [previewResult, setPreviewResult] = useState<GeneratedPdfResult | null>(null);

  useEffect(() => {
    return () => {
      if (previewResult?.blobUrl) {
        URL.revokeObjectURL(previewResult.blobUrl);
      }
    };
  }, [previewResult]);

  const monthLabel =
    INDONESIAN_MONTHS.find((m) => m.value === filter.bulan)?.label ?? filter.bulan;
  const periodeLabel = `${monthLabel} ${filter.tahun}`;

  const handleGenerate = async (mode: 'preview' | 'download' | 'print') => {
    setGenerating(true);
    try {
      const result = await generateOfficialPdfReport({
        filter,
        settings: schoolSettings,
        teachers,
        students,
        classes,
        teacherAttendances,
        studentAttendances,
        periodeLabel,
      });

      if (mode === 'preview') {
        if (previewResult?.blobUrl) {
          URL.revokeObjectURL(previewResult.blobUrl);
        }
        setPreviewResult(result);
      } else if (mode === 'download') {
        result.doc.save(result.filename);
        URL.revokeObjectURL(result.blobUrl);
        showToast(`PDF berhasil diunduh: ${result.filename}`, 'success');
      } else {
        result.doc.autoPrint();
        if (previewResult?.blobUrl) {
          URL.revokeObjectURL(previewResult.blobUrl);
        }
        setPreviewResult(result);
        showToast('Dokumen siap dicetak melalui pratinjau PDF.', 'info');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyusun laporan PDF', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportExcel = () => {
    if (filter.jenisLaporan === 'ABSENSI_GURU' || filter.jenisLaporan === 'PER_GURU') {
      const rows = teacherAttendances.filter(
        (a) =>
          (!filter.teacherId || a.teacherId === filter.teacherId) &&
          (!filter.tanggalAwal || a.tanggal >= filter.tanggalAwal) &&
          (!filter.tanggalAkhir || a.tanggal <= filter.tanggalAkhir)
      );
      exportTeacherAttendanceToExcel(rows, `Laporan_Guru_${periodeLabel}.xlsx`);
    } else {
      const rows = studentAttendances.filter(
        (a) =>
          (!filter.classId || a.classId === filter.classId) &&
          (!filter.studentId || a.studentId === filter.studentId) &&
          (!filter.tanggalAwal || a.tanggal >= filter.tanggalAwal) &&
          (!filter.tanggalAkhir || a.tanggal <= filter.tanggalAkhir)
      );
      exportStudentAttendanceToExcel(rows, `Laporan_Siswa_${periodeLabel}.xlsx`);
    }
    showToast('File Excel berhasil diekspor.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Live Kop Surat Reference Preview (always crisp white paper sheet) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white p-5 sm:p-6 shadow-xs">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Pratinjau Kop Surat Resmi Laporan PDF
        </p>
        <ReportHeader settings={schoolSettings} compact />
      </div>

      {/* Filter Card */}
      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Filter &amp; Pengaturan Cetak Laporan
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Semua laporan menggunakan Kop Surat Resmi MIS Darussalam &amp; YPI-DTQ, tanda tangan
          Kepala Madrasah, penomoran halaman otomatis, serta dukungan kertas A4 / F4.
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Jenis Laporan
            </label>
            <select
              value={filter.jenisLaporan}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, jenisLaporan: e.target.value as ReportType }))
              }
              className="field-input"
            >
              {isAdmin && <option value="ABSENSI_GURU">Laporan Absensi Guru</option>}
              <option value="ABSENSI_SISWA">Laporan Absensi Siswa</option>
              {isAdmin && <option value="PER_GURU">Laporan Per Guru</option>}
              <option value="PER_SISWA">Laporan Per Siswa</option>
              <option value="PER_KELAS">Laporan Per Kelas</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tanggal Awal
            </label>
            <input
              type="date"
              value={filter.tanggalAwal}
              onChange={(e) => setFilter((prev) => ({ ...prev, tanggalAwal: e.target.value }))}
              className="field-input font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={filter.tanggalAkhir}
              onChange={(e) => setFilter((prev) => ({ ...prev, tanggalAkhir: e.target.value }))}
              className="field-input font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tahun Pelajaran
            </label>
            <input
              type="text"
              value={filter.tahunPelajaran}
              onChange={(e) => setFilter((prev) => ({ ...prev, tahunPelajaran: e.target.value }))}
              className="field-input font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Bulan (Judul / Nama File)
            </label>
            <select
              value={filter.bulan}
              onChange={(e) => setFilter((prev) => ({ ...prev, bulan: e.target.value }))}
              className="field-input"
            >
              {INDONESIAN_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tahun
            </label>
            <input
              type="number"
              value={filter.tahun}
              onChange={(e) => setFilter((prev) => ({ ...prev, tahun: e.target.value }))}
              className="field-input font-mono"
            />
          </div>

          {(filter.jenisLaporan === 'PER_GURU' || filter.jenisLaporan === 'ABSENSI_GURU') &&
            isAdmin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Guru
                </label>
                <select
                  value={filter.teacherId}
                  onChange={(e) => setFilter((prev) => ({ ...prev, teacherId: e.target.value }))}
                  className="field-input"
                >
                  <option value="">-- Semua Guru --</option>
                  {teachers.map((t) => (
                    <option key={t.teacherId} value={t.teacherId}>
                      {t.namaLengkap}
                    </option>
                  ))}
                </select>
              </div>
            )}

          {(filter.jenisLaporan === 'ABSENSI_SISWA' ||
            filter.jenisLaporan === 'PER_KELAS' ||
            filter.jenisLaporan === 'PER_SISWA') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Pilih Kelas / Rombel
              </label>
              <select
                value={filter.classId}
                onChange={(e) => setFilter((prev) => ({ ...prev, classId: e.target.value }))}
                className="field-input"
              >
                <option value="">-- Semua Kelas --</option>
                {classes.map((c) => (
                  <option key={c.classId} value={c.classId}>
                    Kelas {c.namaRombel}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filter.jenisLaporan === 'PER_SISWA' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Pilih Siswa
              </label>
              <select
                value={filter.studentId}
                onChange={(e) => setFilter((prev) => ({ ...prev, studentId: e.target.value }))}
                className="field-input"
              >
                <option value="">-- Pilih Siswa --</option>
                {students
                  .filter((s) => !filter.classId || s.classId === filter.classId)
                  .map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.namaLengkap} ({s.kelasNama})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Orientasi Kertas
            </label>
            <select
              value={filter.orientasi}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, orientasi: e.target.value as PaperOrientation }))
              }
              className="field-input"
            >
              <option value="landscape">Landscape (Lebar)</option>
              <option value="portrait">Portrait (Tegak)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ukuran Kertas
            </label>
            <select
              value={filter.ukuranKertas}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, ukuranKertas: e.target.value as PaperSize }))
              }
              className="field-input"
            >
              <option value="a4">A4 (210 × 297 mm)</option>
              <option value="f4">F4 / Folio (215 × 330 mm)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerate('preview')}
            className="btn-primary"
          >
            <Eye className="w-4 h-4" />
            {generating ? 'Menyusun PDF...' : 'Preview PDF'}
          </button>

          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerate('print')}
            className="btn-secondary"
          >
            <Printer className="w-4 h-4" />
            Cetak PDF
          </button>

          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerate('download')}
            className="btn-secondary text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>

          <button type="button" onClick={handleExportExcel} className="btn-secondary">
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Preview PDF Modal */}
      {previewResult && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/75 backdrop-blur-xs p-3 sm:p-6"
        >
          <div className="flex items-center justify-between gap-4 rounded-t-2xl bg-white dark:bg-slate-900 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                Pratinjau Dokumen PDF: {previewResult.filename}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ukuran {filter.ukuranKertas.toUpperCase()} · {filter.orientasi}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  previewResult.doc.save(previewResult.filename);
                  showToast(`PDF berhasil diunduh: ${previewResult.filename}`, 'success');
                }}
                className="btn-primary py-2"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewResult.blobUrl);
                  setPreviewResult(null);
                }}
                aria-label="Tutup pratinjau PDF"
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-slate-800 rounded-b-2xl overflow-hidden">
            <iframe
              title="Pratinjau PDF Laporan MIS Darussalam"
              src={previewResult.blobUrl}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
};
