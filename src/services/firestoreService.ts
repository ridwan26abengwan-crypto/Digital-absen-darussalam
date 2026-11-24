import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  createSecondaryAuthUser,
  db,
  handleFirestoreError,
  OperationType,
  storage,
} from '../firebase/config';
import {
  DEFAULT_LEFT_LOGO,
  DEFAULT_RIGHT_LOGO,
  DEFAULT_SCHOOL_SETTINGS,
} from '../constants/schoolDefaults';
import type {
  AcademicYear,
  AuditLog,
  SchoolClass,
  SchoolSettings,
  Student,
  StudentAttendance,
  StudentAttendanceStatus,
  Teacher,
  TeacherAttendance,
  TeacherAttendanceStatus,
  UserProfile,
  UserRole,
} from '../types';
import {
  buildStudentAttendanceId,
  buildTeacherAttendanceId,
  normalizeLoginIdentifier,
  sanitizeId,
  sanitizeString,
} from '../utils/attendanceLogic';
import { formatReadableServiceError } from '../utils/authErrorMessages';

export interface SaveTeacherResult {
  teacherId: string;
  accountCreated: boolean;
  accountWarning?: string;
  needsProviderEnable?: boolean;
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export async function writeAuditLog(params: {
  user: string;
  uid: string;
  role: UserRole;
  aktivitas: string;
  data?: string;
}): Promise<void> {
  const logId = makeId('log');
  const path = `audit_logs/${logId}`;
  try {
    await setDoc(doc(db, 'audit_logs', logId), {
      logId,
      user: sanitizeString(params.user, 120) || 'System',
      uid: sanitizeId(params.uid),
      role: params.role,
      aktivitas: sanitizeString(params.aktivitas, 200),
      data: sanitizeString(params.data ?? '', 500),
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- School Settings & Academic Years ---

export function subscribeSchoolSettings(
  onData: (settings: SchoolSettings) => void
): Unsubscribe {
  const path = 'school_settings/madrasah';
  return onSnapshot(
    doc(db, 'school_settings', 'madrasah'),
    (snap) => {
      if (snap.exists()) {
        const raw = snap.data() as Partial<SchoolSettings>;
        const merged = { ...DEFAULT_SCHOOL_SETTINGS, ...raw };
        if (
          merged.logoKiriUrl === DEFAULT_RIGHT_LOGO &&
          merged.logoKananUrl === DEFAULT_LEFT_LOGO
        ) {
          merged.logoKiriUrl = DEFAULT_LEFT_LOGO;
          merged.logoKananUrl = DEFAULT_RIGHT_LOGO;
        }
        onData(merged);
      } else {
        onData(DEFAULT_SCHOOL_SETTINGS);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveSchoolSettings(
  settings: Omit<SchoolSettings, 'updatedAt'>,
  actor: { user: string; uid: string; role: UserRole }
): Promise<void> {
  const path = 'school_settings/madrasah';
  try {
    await setDoc(doc(db, 'school_settings', 'madrasah'), {
      namaYayasan: sanitizeString(settings.namaYayasan, 160),
      namaMadrasah: sanitizeString(settings.namaMadrasah, 160),
      nsm: sanitizeString(settings.nsm, 40),
      npsm: sanitizeString(settings.npsm, 40),
      akreditasi: sanitizeString(settings.akreditasi, 20),
      nomorAkreditasi: sanitizeString(settings.nomorAkreditasi, 100),
      alamat: sanitizeString(settings.alamat, 300),
      alamatSingkat: sanitizeString(settings.alamatSingkat, 200),
      telepon: sanitizeString(settings.telepon, 40),
      kepalaMadrasah: sanitizeString(settings.kepalaMadrasah, 120),
      nipKepalaMadrasah: sanitizeString(settings.nipKepalaMadrasah, 40),
      kota: sanitizeString(settings.kota, 60),
      tahunPelajaranAktif: sanitizeString(settings.tahunPelajaranAktif, 20),
      jamMasukBatas: sanitizeString(settings.jamMasukBatas, 10),
      logoKiriUrl: sanitizeString(settings.logoKiriUrl, 500),
      logoKananUrl: sanitizeString(settings.logoKananUrl, 500),
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      ...actor,
      aktivitas: 'Memperbarui identitas dan pengaturan madrasah',
      data: settings.namaMadrasah,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function ensureDefaultSchoolDocs(actor: {
  user: string;
  uid: string;
  role: UserRole;
}): Promise<void> {
  try {
    const settingsSnap = await getDoc(doc(db, 'school_settings', 'madrasah'));
    if (!settingsSnap.exists()) {
      await setDoc(doc(db, 'school_settings', 'madrasah'), {
        ...DEFAULT_SCHOOL_SETTINGS,
        updatedAt: serverTimestamp(),
      });
    }
    const yearsSnap = await getDocs(collection(db, 'academic_years'));
    if (yearsSnap.empty) {
      const yearId = 'tp_2026_2027_ganjil';
      await setDoc(doc(db, 'academic_years', yearId), {
        yearId,
        tahunPelajaran: '2026/2027',
        semester: 'Ganjil',
        isActive: true,
        tanggalMulai: '2026-07-13',
        tanggalSelesai: '2026-12-19',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog({
        ...actor,
        aktivitas: 'Inisialisasi tahun pelajaran default 2026/2027',
        data: yearId,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'school_settings');
  }
}

export function subscribeAcademicYears(
  onData: (years: AcademicYear[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'academic_years'), orderBy('tahunPelajaran', 'desc')),
    (snap) => {
      onData(snap.docs.map((d) => d.data() as AcademicYear));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'academic_years');
    }
  );
}

export async function saveAcademicYear(
  year: Omit<AcademicYear, 'createdAt' | 'updatedAt'>,
  actor: { user: string; uid: string; role: UserRole }
): Promise<void> {
  const yearId = sanitizeId(year.yearId || makeId('tp'));
  const path = `academic_years/${yearId}`;
  try {
    const batch = writeBatch(db);
    if (year.isActive) {
      const existing = await getDocs(collection(db, 'academic_years'));
      for (const d of existing.docs) {
        if (d.id !== yearId && (d.data() as AcademicYear).isActive) {
          batch.update(d.ref, { isActive: false, updatedAt: serverTimestamp() });
        }
      }
    }
    const existingDoc = await getDoc(doc(db, 'academic_years', yearId));
    if (existingDoc.exists()) {
      batch.update(doc(db, 'academic_years', yearId), {
        tahunPelajaran: sanitizeString(year.tahunPelajaran, 20),
        semester: year.semester,
        isActive: year.isActive,
        tanggalMulai: sanitizeString(year.tanggalMulai ?? '', 20),
        tanggalSelesai: sanitizeString(year.tanggalSelesai ?? '', 20),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(doc(db, 'academic_years', yearId), {
        yearId,
        tahunPelajaran: sanitizeString(year.tahunPelajaran, 20),
        semester: year.semester,
        isActive: year.isActive,
        tanggalMulai: sanitizeString(year.tanggalMulai ?? '', 20),
        tanggalSelesai: sanitizeString(year.tanggalSelesai ?? '', 20),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    await writeAuditLog({
      ...actor,
      aktivitas: 'Menyimpan tahun pelajaran',
      data: `${year.tahunPelajaran} (${year.semester})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Storage Upload ---

export async function uploadFileToStorage(
  folder: 'logo' | 'teachers' | 'students' | 'documents',
  subPath: string,
  file: File
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fullPath = subPath
    ? `${folder}/${sanitizeId(subPath)}/${Date.now()}_${safeName}`
    : `${folder}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, fullPath);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            'Upload foto ke Firebase Storage melewati batas waktu. Pastikan Firebase Storage aktif atau kosongkan foto terlebih dahulu.'
          )
        ),
      10000
    )
  );
  const snapshot = await Promise.race([uploadBytes(storageRef, file), timeoutPromise]);
  return getDownloadURL(snapshot.ref);
}

// --- Users & Accounts ---

export function subscribeUsers(onData: (users: UserProfile[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'users'), orderBy('nama', 'asc')),
    (snap) => {
      onData(snap.docs.map((d) => d.data() as UserProfile));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );
}

export async function toggleUserStatus(
  user: UserProfile,
  nextStatus: 'ACTIVE' | 'INACTIVE',
  actor: { user: string; uid: string; role: UserRole }
): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.uid), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
    if (user.teacherId) {
      batch.update(doc(db, 'teachers', user.teacherId), {
        statusAkun: nextStatus,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    await writeAuditLog({
      ...actor,
      aktivitas: `${nextStatus === 'ACTIVE' ? 'Mengaktifkan' : 'Menonaktifkan'} akun pengguna`,
      data: `${user.nama} (${user.username})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateOwnProfile(
  uid: string,
  nama: string,
  photoUrl?: string,
  teacherId?: string,
  nomorHp?: string,
  alamat?: string
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid), {
      nama: sanitizeString(nama, 120),
      ...(photoUrl !== undefined ? { photoUrl: sanitizeString(photoUrl, 500) } : {}),
      updatedAt: serverTimestamp(),
    });
    if (teacherId) {
      batch.update(doc(db, 'teachers', teacherId), {
        ...(nomorHp !== undefined ? { nomorHp: sanitizeString(nomorHp, 30) } : {}),
        ...(alamat !== undefined ? { alamat: sanitizeString(alamat, 300) } : {}),
        ...(photoUrl !== undefined ? { foto: sanitizeString(photoUrl, 500) } : {}),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Teachers CRUD ---

export function subscribeTeachers(
  onData: (teachers: Teacher[]) => void,
  onlyUserUid?: string
): Unsubscribe {
  const q = onlyUserUid
    ? query(collection(db, 'teachers'), where('userId', '==', onlyUserUid))
    : query(collection(db, 'teachers'), orderBy('namaLengkap', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Teacher));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'teachers');
    }
  );
}

export async function saveTeacher(
  input: Omit<Teacher, 'teacherId' | 'createdAt' | 'updatedAt'> & {
    teacherId?: string;
    passwordAwal?: string;
  },
  actor: { user: string; uid: string; role: UserRole }
): Promise<SaveTeacherResult> {
  const isEdit = Boolean(input.teacherId);
  const teacherId = sanitizeId(input.teacherId || makeId('tch'));
  const path = `teachers/${teacherId}`;

  let linkedUserId = input.userId ?? '';
  let accountCreated = false;
  let accountWarning: string | undefined;
  let needsProviderEnable = false;

  const loginEmail = input.email
    ? input.email.trim().toLowerCase()
    : input.username
      ? normalizeLoginIdentifier(input.username)
      : '';

  if (!isEdit && input.passwordAwal && loginEmail) {
    try {
      linkedUserId = await createSecondaryAuthUser(loginEmail, input.passwordAwal);
      accountCreated = true;
    } catch (authErr) {
      const readable = formatReadableServiceError(
        authErr,
        'Akun login guru belum dapat dibuat.'
      );
      accountWarning = readable.message;
      needsProviderEnable = readable.needsProviderEnable;
      linkedUserId = '';
    }
  }

  try {
    const batch = writeBatch(db);
    const payload: Record<string, unknown> = {
      teacherId,
      userId: sanitizeString(linkedUserId, 128),
      foto: sanitizeString(input.foto ?? '', 500),
      nip: sanitizeString(input.nip ?? '', 40),
      nuptk: sanitizeString(input.nuptk ?? '', 40),
      nik: sanitizeString(input.nik ?? '', 32),
      namaLengkap: sanitizeString(input.namaLengkap, 120),
      jenisKelamin: input.jenisKelamin,
      tempatLahir: sanitizeString(input.tempatLahir ?? '', 80),
      tanggalLahir: sanitizeString(input.tanggalLahir ?? '', 20),
      pendidikanTerakhir: sanitizeString(input.pendidikanTerakhir ?? '', 40),
      jabatan: sanitizeString(input.jabatan, 80),
      statusKepegawaian: input.statusKepegawaian,
      nomorHp: sanitizeString(input.nomorHp ?? '', 30),
      alamat: sanitizeString(input.alamat ?? '', 300),
      email: sanitizeString(loginEmail || input.email || '', 160),
      username: sanitizeString(input.username || loginEmail.split('@')[0] || teacherId, 64),
      statusAkun: input.statusAkun,
      updatedAt: serverTimestamp(),
    };

    if (isEdit) {
      batch.update(doc(db, 'teachers', teacherId), payload);
      if (linkedUserId) {
        batch.update(doc(db, 'users', linkedUserId), {
          nama: sanitizeString(input.namaLengkap, 120),
          status: input.statusAkun,
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      payload.createdAt = serverTimestamp();
      batch.set(doc(db, 'teachers', teacherId), payload);
      if (linkedUserId) {
        batch.set(doc(db, 'users', linkedUserId), {
          uid: linkedUserId,
          nama: sanitizeString(input.namaLengkap, 120),
          email: sanitizeString(loginEmail, 160),
          username: sanitizeString(input.username || loginEmail.split('@')[0] || teacherId, 64),
          role: 'GURU',
          teacherId,
          status: input.statusAkun,
          photoUrl: sanitizeString(input.foto ?? '', 500),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
    try {
      await writeAuditLog({
        ...actor,
        aktivitas: isEdit ? 'Mengubah data guru' : 'Menambah data guru baru',
        data: input.namaLengkap,
      });
    } catch {
      // Non-fatal: teacher document has already committed
    }
    return { teacherId, accountCreated, accountWarning, needsProviderEnable };
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function provisionAccountForTeacher(
  teacher: Teacher,
  usernameOrEmail: string,
  passwordAwal: string,
  role: UserRole,
  actor: { user: string; uid: string; role: UserRole }
): Promise<string> {
  const authEmail = normalizeLoginIdentifier(usernameOrEmail);
  let newUid = '';
  try {
    newUid = await createSecondaryAuthUser(authEmail, passwordAwal);
  } catch (authErr) {
    const readable = formatReadableServiceError(authErr, 'Gagal membuat akun Firebase Auth guru.');
    const customErr = new Error(readable.message) as Error & { needsProviderEnable?: boolean };
    customErr.needsProviderEnable = readable.needsProviderEnable;
    throw customErr;
  }

  const path = `users/${newUid}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', newUid), {
      uid: newUid,
      nama: sanitizeString(teacher.namaLengkap, 120),
      email: sanitizeString(authEmail, 160),
      username: sanitizeString(usernameOrEmail.trim(), 64),
      role,
      teacherId: teacher.teacherId,
      status: 'ACTIVE',
      photoUrl: sanitizeString(teacher.foto ?? '', 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'teachers', teacher.teacherId), {
      userId: newUid,
      email: sanitizeString(authEmail, 160),
      username: sanitizeString(usernameOrEmail.trim(), 64),
      statusAkun: 'ACTIVE',
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    await writeAuditLog({
      ...actor,
      aktivitas: 'Membuat akun login baru untuk guru',
      data: `${teacher.namaLengkap} (${role})`,
    });
    return newUid;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTeacher(
  teacher: Teacher,
  actor: { user: string; uid: string; role: UserRole }
): Promise<void> {
  const path = `teachers/${teacher.teacherId}`;
  try {
    await deleteDoc(doc(db, 'teachers', teacher.teacherId));
    await writeAuditLog({
      ...actor,
      aktivitas: 'Menghapus data guru',
      data: teacher.namaLengkap,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Classes CRUD ---

export function subscribeClasses(
  onData: (classes: SchoolClass[]) => void,
  waliKelasUid?: string
): Unsubscribe {
  const q = waliKelasUid
    ? query(collection(db, 'classes'), where('waliKelasUid', '==', waliKelasUid))
    : query(collection(db, 'classes'), orderBy('kelas', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as SchoolClass);
      list.sort((a, b) => a.kelas - b.kelas || a.namaRombel.localeCompare(b.namaRombel));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    }
  );
}

export async function saveSchoolClass(
  input: Omit<SchoolClass, 'classId' | 'createdAt' | 'updatedAt'> & { classId?: string },
  actor: { user: string; uid: string; role: UserRole }
): Promise<string> {
  const isEdit = Boolean(input.classId);
  const classId = sanitizeId(input.classId || makeId('cls'));
  const path = `classes/${classId}`;
  try {
    const batch = writeBatch(db);
    const payload: Record<string, unknown> = {
      classId,
      namaRombel: sanitizeString(input.namaRombel, 40),
      kelas: Number(input.kelas),
      tahunPelajaran: sanitizeString(input.tahunPelajaran, 20),
      waliKelasId: sanitizeString(input.waliKelasId ?? '', 128),
      waliKelasUid: sanitizeString(input.waliKelasUid ?? '', 128),
      waliKelasNama: sanitizeString(input.waliKelasNama ?? '', 120),
      kapasitas: Number(input.kapasitas),
      updatedAt: serverTimestamp(),
    };

    if (isEdit) {
      batch.update(doc(db, 'classes', classId), payload);
      // Sync waliKelasUid and kelasNama onto students of this class
      const classStudents = await getDocs(
        query(collection(db, 'students'), where('classId', '==', classId))
      );
      for (const s of classStudents.docs) {
        batch.update(s.ref, {
          kelasNama: sanitizeString(input.namaRombel, 40),
          waliKelasUid: sanitizeString(input.waliKelasUid ?? '', 128),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      payload.createdAt = serverTimestamp();
      batch.set(doc(db, 'classes', classId), payload);
    }

    await batch.commit();
    await writeAuditLog({
      ...actor,
      aktivitas: isEdit ? 'Mengubah data kelas / rombel' : 'Menambah kelas / rombel baru',
      data: `Rombel ${input.namaRombel} (${input.tahunPelajaran})`,
    });
    return classId;
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteSchoolClass(
  cls: SchoolClass,
  actor: { user: string; uid: string; role: UserRole }
): Promise<void> {
  const path = `classes/${cls.classId}`;
  try {
    await deleteDoc(doc(db, 'classes', cls.classId));
    await writeAuditLog({
      ...actor,
      aktivitas: 'Menghapus data kelas / rombel',
      data: cls.namaRombel,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Students CRUD ---

export function subscribeStudents(
  onData: (students: Student[]) => void,
  waliKelasUid?: string
): Unsubscribe {
  const q = waliKelasUid
    ? query(collection(db, 'students'), where('waliKelasUid', '==', waliKelasUid))
    : query(collection(db, 'students'), orderBy('namaLengkap', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Student);
      list.sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
  );
}

export async function saveStudent(
  input: Omit<Student, 'studentId' | 'createdAt' | 'updatedAt'> & { studentId?: string },
  actor: { user: string; uid: string; role: UserRole }
): Promise<string> {
  const isEdit = Boolean(input.studentId);
  const studentId = sanitizeId(input.studentId || makeId('std'));
  const path = `students/${studentId}`;
  try {
    const payload: Record<string, unknown> = {
      studentId,
      nis: sanitizeString(input.nis, 40),
      nisn: sanitizeString(input.nisn ?? '', 40),
      namaLengkap: sanitizeString(input.namaLengkap, 120),
      jenisKelamin: input.jenisKelamin,
      tempatLahir: sanitizeString(input.tempatLahir ?? '', 80),
      tanggalLahir: sanitizeString(input.tanggalLahir ?? '', 20),
      agama: sanitizeString(input.agama ?? 'Islam', 30),
      alamat: sanitizeString(input.alamat ?? '', 300),
      namaAyah: sanitizeString(input.namaAyah ?? '', 100),
      namaIbu: sanitizeString(input.namaIbu ?? '', 100),
      nomorHpOrtu: sanitizeString(input.nomorHpOrtu ?? '', 30),
      classId: sanitizeId(input.classId),
      kelasNama: sanitizeString(input.kelasNama, 40),
      waliKelasUid: sanitizeString(input.waliKelasUid ?? '', 128),
      tahunPelajaran: sanitizeString(input.tahunPelajaran, 20),
      status: input.status,
      foto: sanitizeString(input.foto ?? '', 500),
      updatedAt: serverTimestamp(),
    };

    if (isEdit) {
      await updateDoc(doc(db, 'students', studentId), payload);
    } else {
      payload.createdAt = serverTimestamp();
      await setDoc(doc(db, 'students', studentId), payload);
    }
    await writeAuditLog({
      ...actor,
      aktivitas: isEdit ? 'Mengubah data siswa' : 'Menambah data siswa baru',
      data: `${input.namaLengkap} (${input.kelasNama})`,
    });
    return studentId;
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteStudent(
  student: Student,
  actor: { user: string; uid: string; role: UserRole }
): Promise<void> {
  const path = `students/${student.studentId}`;
  try {
    await deleteDoc(doc(db, 'students', student.studentId));
    await writeAuditLog({
      ...actor,
      aktivitas: 'Menghapus data siswa',
      data: `${student.namaLengkap} (${student.nis})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Teacher Attendance (Multi-device, Duplicate-Protected, Realtime) ---

export function subscribeTeacherAttendances(
  onData: (rows: TeacherAttendance[]) => void,
  onlyUserUid?: string
): Unsubscribe {
  const q = onlyUserUid
    ? query(collection(db, 'teacher_attendance'), where('userId', '==', onlyUserUid))
    : query(collection(db, 'teacher_attendance'), orderBy('tanggal', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as TeacherAttendance);
      list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'teacher_attendance');
    }
  );
}

export async function submitTeacherAttendance(params: {
  teacherId: string;
  userId: string;
  namaGuru: string;
  nip?: string;
  tanggal: string;
  jamMasuk: string;
  status: TeacherAttendanceStatus;
  keterangan?: string;
  deviceInfo?: string;
  actorRole: UserRole;
}): Promise<'created' | 'duplicate'> {
  const attendanceId = buildTeacherAttendanceId(params.teacherId, params.tanggal);
  const refDoc = doc(db, 'teacher_attendance', attendanceId);
  const path = `teacher_attendance/${attendanceId}`;
  try {
    const existing = await getDoc(refDoc);
    if (existing.exists()) {
      return 'duplicate';
    }
    await setDoc(refDoc, {
      attendanceId,
      teacherId: sanitizeId(params.teacherId),
      userId: sanitizeId(params.userId),
      namaGuru: sanitizeString(params.namaGuru, 120),
      nip: sanitizeString(params.nip ?? '', 40),
      tanggal: params.tanggal,
      jamMasuk: sanitizeString(params.jamMasuk, 16),
      jamPulang: '',
      status: params.status,
      keterangan: sanitizeString(params.keterangan ?? '', 300),
      deviceInfo: sanitizeString(params.deviceInfo ?? 'Web Browser', 120),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      user: params.namaGuru,
      uid: params.userId,
      role: params.actorRole,
      aktivitas: `Mencatat absensi guru (${params.status})`,
      data: `${params.tanggal} ${params.jamMasuk}`,
    });
    return 'created';
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function checkOutTeacherAttendance(params: {
  attendanceId: string;
  jamPulang: string;
  keterangan?: string;
  actor: { user: string; uid: string; role: UserRole };
}): Promise<void> {
  const path = `teacher_attendance/${params.attendanceId}`;
  try {
    const payload: Record<string, unknown> = {
      jamPulang: sanitizeString(params.jamPulang, 16),
      updatedAt: serverTimestamp(),
    };
    if (params.keterangan !== undefined) {
      payload.keterangan = sanitizeString(params.keterangan, 300);
    }
    await updateDoc(doc(db, 'teacher_attendance', params.attendanceId), payload);
    await writeAuditLog({
      ...params.actor,
      aktivitas: 'Mencatat jam pulang guru',
      data: `${params.attendanceId} -> ${params.jamPulang}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdateTeacherAttendance(
  attendanceId: string,
  updates: {
    status: TeacherAttendanceStatus;
    jamMasuk: string;
    jamPulang?: string;
    keterangan?: string;
  },
  actor: { user: string; uid: string; role: UserRole }
): Promise<void> {
  const path = `teacher_attendance/${attendanceId}`;
  try {
    await updateDoc(doc(db, 'teacher_attendance', attendanceId), {
      status: updates.status,
      jamMasuk: sanitizeString(updates.jamMasuk, 16),
      jamPulang: sanitizeString(updates.jamPulang ?? '', 16),
      keterangan: sanitizeString(updates.keterangan ?? '', 300),
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      ...actor,
      aktivitas: 'Mengoreksi absensi guru',
      data: `${attendanceId} -> ${updates.status}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Student Attendance ---

export function subscribeStudentAttendances(
  onData: (rows: StudentAttendance[]) => void,
  waliKelasUid?: string
): Unsubscribe {
  const q = waliKelasUid
    ? query(collection(db, 'student_attendance'), where('waliKelasUid', '==', waliKelasUid))
    : query(collection(db, 'student_attendance'), orderBy('tanggal', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as StudentAttendance);
      list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'student_attendance');
    }
  );
}

export async function saveStudentAttendanceBatch(
  entries: Array<{
    student: Student;
    tanggal: string;
    status: StudentAttendanceStatus;
    keterangan?: string;
  }>,
  teacherInfo: { teacherId: string; teacherUid: string; namaGuru: string; role: UserRole }
): Promise<void> {
  if (entries.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const item of entries) {
      const attendanceId = buildStudentAttendanceId(item.student.studentId, item.tanggal);
      const refDoc = doc(db, 'student_attendance', attendanceId);
      const existingSnap = await getDoc(refDoc);
      if (existingSnap.exists()) {
        batch.update(refDoc, {
          status: item.status,
          keterangan: sanitizeString(item.keterangan ?? '', 300),
          teacherId: sanitizeId(teacherInfo.teacherId),
          teacherUid: sanitizeId(teacherInfo.teacherUid),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(refDoc, {
          attendanceId,
          studentId: item.student.studentId,
          studentName: sanitizeString(item.student.namaLengkap, 120),
          nis: sanitizeString(item.student.nis, 40),
          nisn: sanitizeString(item.student.nisn ?? '', 40),
          classId: item.student.classId,
          kelasNama: sanitizeString(item.student.kelasNama, 40),
          waliKelasUid: sanitizeString(item.student.waliKelasUid ?? teacherInfo.teacherUid, 128),
          tanggal: item.tanggal,
          status: item.status,
          keterangan: sanitizeString(item.keterangan ?? '', 300),
          teacherId: sanitizeId(teacherInfo.teacherId),
          teacherUid: sanitizeId(teacherInfo.teacherUid),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
    await batch.commit();
    await writeAuditLog({
      user: teacherInfo.namaGuru,
      uid: teacherInfo.teacherUid,
      role: teacherInfo.role,
      aktivitas: `Menyimpan absensi siswa (${entries.length} siswa)`,
      data: `${entries[0].student.kelasNama} - ${entries[0].tanggal}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'student_attendance');
  }
}

// --- Audit Logs ---

export function subscribeAuditLogs(onData: (logs: AuditLog[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc')),
    (snap) => {
      onData(snap.docs.map((d) => d.data() as AuditLog));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
    }
  );
}
