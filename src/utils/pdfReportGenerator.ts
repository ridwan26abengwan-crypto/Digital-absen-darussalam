import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DEFAULT_LEFT_LOGO, DEFAULT_RIGHT_LOGO } from '../constants/schoolDefaults';
import type {
  PaperOrientation,
  PaperSize,
  ReportFilterConfig,
  SchoolClass,
  SchoolSettings,
  Student,
  StudentAttendance,
  Teacher,
  TeacherAttendance,
} from '../types';
import {
  buildPdfFilename,
  buildStudentRecap,
  buildTeacherRecap,
  formatTanggalIndonesia,
  formatTanggalISO,
} from './attendanceLogic';

async function loadImageAsDataUrl(src: string): Promise<string | null> {
  if (!src) return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = src;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 200;
    canvas.height = img.naturalHeight || 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export interface GeneratedPdfResult {
  doc: jsPDF;
  blobUrl: string;
  filename: string;
}

export interface PdfGenerationInput {
  filter: ReportFilterConfig;
  settings: SchoolSettings;
  teachers: Teacher[];
  students: Student[];
  classes: SchoolClass[];
  teacherAttendances: TeacherAttendance[];
  studentAttendances: StudentAttendance[];
  periodeLabel: string;
}

function getPaperFormat(size: PaperSize): 'a4' | [number, number] {
  // F4 Indonesian folio size in mm: 215 x 330
  return size === 'f4' ? [215, 330] : 'a4';
}

function drawKopSurat(
  doc: jsPDF,
  settings: SchoolSettings,
  leftLogoData: string | null,
  rightLogoData: string | null
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const logoSize = 20;
  const topY = 10;

  if (leftLogoData) {
    doc.addImage(leftLogoData, 'PNG', marginX, topY, logoSize, logoSize);
  }
  if (rightLogoData) {
    doc.addImage(rightLogoData, 'PNG', pageWidth - marginX - logoSize, topY, logoSize, logoSize);
  }

  const centerX = pageWidth / 2;
  doc.setTextColor(15, 23, 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(settings.namaYayasan.toUpperCase(), centerX, topY + 4, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(6, 78, 59);
  doc.text(settings.namaMadrasah.toUpperCase(), centerX, topY + 9.8, { align: 'center' });

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.text(`NSM : ${settings.nsm}    |    NPSM : ${settings.npsm}`, centerX, topY + 14.3, {
    align: 'center',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    `TERAKREDITASI : "${settings.akreditasi}" BAN-PDM Nomor : ${settings.nomorAkreditasi}`,
    centerX,
    topY + 18.5,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${settings.alamat}  Tlp. ${settings.telepon}`, centerX, topY + 22.5, {
    align: 'center',
  });

  const lineY = topY + 25.5;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(marginX, lineY, pageWidth - marginX, lineY);
  doc.setLineWidth(0.25);
  doc.line(marginX, lineY + 1.1, pageWidth - marginX, lineY + 1.1);

  return lineY + 7;
}

function drawSignatureBlock(
  doc: jsPDF,
  startY: number,
  settings: SchoolSettings,
  rightTitle: string,
  rightName: string,
  rightNip: string
): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = startY + 8;

  if (y + 38 > pageHeight - 14) {
    doc.addPage();
    y = 20;
  }

  const leftX = 24;
  const rightX = pageWidth - 78;
  const printDate = formatTanggalIndonesia(formatTanggalISO(new Date()));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);

  doc.text('Mengetahui,', leftX, y);
  doc.text('Kepala Madrasah', leftX, y + 5);

  doc.text(`${settings.kota || 'Ciasem, Subang'}, ${printDate}`, rightX, y);
  doc.text(rightTitle, rightX, y + 5);

  const nameY = y + 25;
  doc.setFont('helvetica', 'bold');
  doc.text(settings.kepalaMadrasah || '(________________________)', leftX, nameY);
  doc.text(rightName || '(________________________)', rightX, nameY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`NIP. ${settings.nipKepalaMadrasah || '_____________________'}`, leftX, nameY + 4.5);
  doc.text(`NIP. ${rightNip || '_____________________'}`, rightX, nameY + 4.5);
}

export async function generateOfficialPdfReport(
  input: PdfGenerationInput
): Promise<GeneratedPdfResult> {
  const {
    filter,
    settings,
    teachers,
    students,
    classes,
    teacherAttendances,
    studentAttendances,
    periodeLabel,
  } = input;

  const orientation: PaperOrientation = filter.orientasi;
  const format = getPaperFormat(filter.ukuranKertas);
  const doc = new jsPDF({ orientation, unit: 'mm', format });

  const [leftLogoData, rightLogoData] = await Promise.all([
    loadImageAsDataUrl(settings.logoKiriUrl || DEFAULT_LEFT_LOGO),
    loadImageAsDataUrl(settings.logoKananUrl || DEFAULT_RIGHT_LOGO),
  ]);

  let cursorY = drawKopSurat(doc, settings, leftLogoData, rightLogoData);
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;

  const selectedClass = classes.find((c) => c.classId === filter.classId);
  const selectedTeacher = teachers.find((t) => t.teacherId === filter.teacherId);
  const selectedStudent = students.find((s) => s.studentId === filter.studentId);

  const inRange = (tanggal: string) => {
    if (filter.tanggalAwal && tanggal < filter.tanggalAwal) return false;
    if (filter.tanggalAkhir && tanggal > filter.tanggalAkhir) return false;
    return true;
  };

  let rightTitle = 'Petugas / Operator';
  let rightName = '(________________________)';
  let rightNip = '-';

  const tableStyles = {
    font: 'helvetica' as const,
    fontSize: 8.5,
    cellPadding: 2.5,
    lineColor: [203, 213, 225] as [number, number, number],
    lineWidth: 0.2,
  };

  const headStyles = {
    fillColor: [6, 95, 70] as [number, number, number],
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
    halign: 'center' as const,
  };

  if (filter.jenisLaporan === 'ABSENSI_GURU') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text('LAPORAN ABSENSI GURU', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Periode : ${periodeLabel}`, marginX, cursorY);
    doc.text(`Tahun Pelajaran : ${filter.tahunPelajaran}`, marginX, cursorY + 5);
    cursorY += 9;

    const teacherMap = new Map(teachers.map((t) => [t.teacherId, t]));
    const rows = teacherAttendances
      .filter((a) => inRange(a.tanggal))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.namaGuru.localeCompare(b.namaGuru));

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX, bottom: 18 },
      showHead: 'everyPage',
      styles: tableStyles,
      headStyles,
      head: [['No', 'Nama Guru', 'NIP / NUPTK', 'Tanggal', 'Masuk', 'Pulang', 'Status', 'Keterangan']],
      body:
        rows.length > 0
          ? rows.map((r, i) => {
              const t = teacherMap.get(r.teacherId);
              const nipNuptk = r.nip || t?.nip || t?.nuptk || '-';
              return [
                i + 1,
                r.namaGuru,
                nipNuptk,
                r.tanggal,
                r.jamMasuk || '-',
                r.jamPulang || '-',
                r.status,
                r.keterangan || '-',
              ];
            })
          : [['-', 'Belum ada data absensi guru pada periode ini', '-', '-', '-', '-', '-', '-']],
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        3: { halign: 'center', cellWidth: 24 },
        4: { halign: 'center', cellWidth: 16 },
        5: { halign: 'center', cellWidth: 16 },
        6: { halign: 'center', cellWidth: 22 },
      },
    });
    rightTitle = 'Koordinator Kepegawaian';
  } else if (filter.jenisLaporan === 'PER_GURU') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text('LAPORAN KEHADIRAN GURU', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Nama     : ${selectedTeacher?.namaLengkap ?? '-'}`, marginX, cursorY);
    doc.text(`NIP      : ${selectedTeacher?.nip || '-'}`, marginX, cursorY + 4.8);
    doc.text(`NUPTK    : ${selectedTeacher?.nuptk || '-'}`, marginX, cursorY + 9.6);
    doc.text(`Jabatan  : ${selectedTeacher?.jabatan || '-'}`, pageWidth / 2, cursorY);
    doc.text(`Periode  : ${periodeLabel}`, pageWidth / 2, cursorY + 4.8);
    doc.text(`T.P.     : ${filter.tahunPelajaran}`, pageWidth / 2, cursorY + 9.6);
    cursorY += 14;

    const rows = teacherAttendances
      .filter((a) => (!filter.teacherId || a.teacherId === filter.teacherId) && inRange(a.tanggal))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX, bottom: 18 },
      showHead: 'everyPage',
      styles: tableStyles,
      headStyles,
      head: [['No', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterangan']],
      body:
        rows.length > 0
          ? rows.map((r, i) => [
              i + 1,
              r.tanggal,
              r.jamMasuk || '-',
              r.jamPulang || '-',
              r.status,
              r.keterangan || '-',
            ])
          : [['-', 'Belum ada catatan kehadiran pada periode ini', '-', '-', '-', '-']],
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 28 },
        2: { halign: 'center', cellWidth: 24 },
        3: { halign: 'center', cellWidth: 24 },
        4: { halign: 'center', cellWidth: 28 },
      },
    });

    const recap = buildTeacherRecap(
      selectedTeacher ? [selectedTeacher] : [],
      rows
    )[0];
    if (recap) {
      const afterTableY =
        (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(
        `Ringkasan: Hadir: ${recap.hadir} | Terlambat: ${recap.terlambat} | Izin: ${recap.izin} | Sakit: ${recap.sakit} | Dinas: ${recap.dinas} | Alpa: ${recap.alpa} | Persentase: ${recap.persentase}%`,
        marginX,
        afterTableY + 6
      );
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable = {
        finalY: afterTableY + 9,
      };
    }

    rightTitle = 'Guru Yang Bersangkutan';
    rightName = selectedTeacher?.namaLengkap ?? '(________________________)';
    rightNip = selectedTeacher?.nip || '-';
  } else if (filter.jenisLaporan === 'ABSENSI_SISWA' || filter.jenisLaporan === 'PER_KELAS') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text(
      filter.jenisLaporan === 'PER_KELAS'
        ? 'REKAPITULASI ABSENSI KELAS'
        : 'REKAPITULASI ABSENSI SISWA',
      pageWidth / 2,
      cursorY,
      { align: 'center' }
    );
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Kelas / Rombel  : ${selectedClass?.namaRombel ?? 'Semua Kelas'}`, marginX, cursorY);
    doc.text(`Wali Kelas      : ${selectedClass?.waliKelasNama || '-'}`, marginX, cursorY + 4.8);
    doc.text(`Periode         : ${periodeLabel}`, pageWidth / 2, cursorY);
    doc.text(`Tahun Pelajaran : ${filter.tahunPelajaran}`, pageWidth / 2, cursorY + 4.8);
    cursorY += 10;

    const targetStudents = students
      .filter((s) => !filter.classId || s.classId === filter.classId)
      .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
    const filteredAtt = studentAttendances.filter(
      (a) => (!filter.classId || a.classId === filter.classId) && inRange(a.tanggal)
    );
    const recapRows = buildStudentRecap(targetStudents, filteredAtt);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX, bottom: 18 },
      showHead: 'everyPage',
      styles: tableStyles,
      headStyles,
      head: [['No', 'Nama Siswa', 'NIS / NISN', 'H', 'S', 'I', 'A', 'D', 'Persentase']],
      body:
        recapRows.length > 0
          ? recapRows.map((r, i) => [
              i + 1,
              r.namaLengkap,
              `${r.nis}${r.nisn && r.nisn !== '-' ? ` / ${r.nisn}` : ''}`,
              r.hadir,
              r.sakit,
              r.izin,
              r.alpa,
              r.dispensasi,
              `${r.persentase}%`,
            ])
          : [['-', 'Belum ada data siswa pada kelas ini', '-', 0, 0, 0, 0, 0, '0%']],
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        3: { halign: 'center', cellWidth: 11 },
        4: { halign: 'center', cellWidth: 11 },
        5: { halign: 'center', cellWidth: 11 },
        6: { halign: 'center', cellWidth: 11 },
        7: { halign: 'center', cellWidth: 11 },
        8: { halign: 'right', cellWidth: 22 },
      },
    });

    const afterTableY =
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 20;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(
      'Keterangan: H = Hadir, S = Sakit, I = Izin, A = Alpa, D = Dispensasi',
      marginX,
      afterTableY + 5
    );
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable = {
      finalY: afterTableY + 7,
    };

    rightTitle = 'Wali Kelas';
    rightName = selectedClass?.waliKelasNama || '(________________________)';
    const wali = teachers.find((t) => t.teacherId === selectedClass?.waliKelasId);
    rightNip = wali?.nip || '-';
  } else {
    // PER_SISWA
    const cls = classes.find((c) => c.classId === selectedStudent?.classId);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text('REKAP ABSENSI SISWA', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Nama Siswa  : ${selectedStudent?.namaLengkap ?? '-'}`, marginX, cursorY);
    doc.text(`NIS / NISN  : ${selectedStudent?.nis ?? '-'} / ${selectedStudent?.nisn || '-'}`, marginX, cursorY + 4.8);
    doc.text(`Kelas       : ${selectedStudent?.kelasNama ?? '-'}`, pageWidth / 2, cursorY);
    doc.text(`Wali Kelas  : ${cls?.waliKelasNama || '-'}`, pageWidth / 2, cursorY + 4.8);
    doc.text(`T.P.        : ${filter.tahunPelajaran}`, pageWidth / 2, cursorY + 9.6);
    cursorY += 14;

    const rows = studentAttendances
      .filter((a) => (!filter.studentId || a.studentId === filter.studentId) && inRange(a.tanggal))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX, bottom: 18 },
      showHead: 'everyPage',
      styles: tableStyles,
      headStyles,
      head: [['No', 'Tanggal', 'Kelas', 'Status', 'Keterangan']],
      body:
        rows.length > 0
          ? rows.map((r, i) => [
              i + 1,
              r.tanggal,
              r.kelasNama || selectedStudent?.kelasNama || '-',
              r.status,
              r.keterangan || '-',
            ])
          : [['-', 'Belum ada riwayat absensi siswa pada periode ini', '-', '-', '-']],
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 24 },
        3: { halign: 'center', cellWidth: 20 },
      },
    });

    rightTitle = 'Wali Kelas';
    rightName = cls?.waliKelasNama || '(________________________)';
    const wali = teachers.find((t) => t.teacherId === cls?.waliKelasId);
    rightNip = wali?.nip || '-';
  }

  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 30;
  drawSignatureBlock(doc, finalY, settings, rightTitle, rightName, rightNip);

  // Add page numbers & footer on every page
  const totalPages = doc.getNumberOfPages();
  const printDateText = formatTanggalIndonesia(formatTanggalISO(new Date()));
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Dicetak pada ${printDateText} · MIS DARUSSALAM ABSENSI DIGITAL`,
      marginX,
      ph - 8
    );
    doc.text(`Halaman ${p} dari ${totalPages}`, pw - marginX, ph - 8, { align: 'right' });
  }

  const filename = buildPdfFilename(
    filter.jenisLaporan,
    periodeLabel,
    selectedClass ? `Kelas_${selectedClass.namaRombel}` : undefined
  );
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  return { doc, blobUrl, filename };
}
