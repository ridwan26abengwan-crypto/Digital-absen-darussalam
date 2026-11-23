# Security Specification — MIS DARUSSALAM ABSENSI DIGITAL

## 1. Data Invariants
1. **Strict RBAC**: Only authenticated users with an `ACTIVE` profile in `/users/{uid}` (or the verified bootstrap admin email) can access system resources. `GURU` users can never elevate their own `role` to `ADMIN` or read/write other teachers' PII or attendance.
2. **Duplicate Attendance Prevention**: A teacher can only create one primary `teacher_attendance` document per date (`attendanceId == teacherId + '_' + tanggal`), and `userId` must strictly equal `request.auth.uid`.
3. **Homeroom Scoping**: A `GURU` user can only read `classes`, `students`, and `student_attendance` where `waliKelasUid == request.auth.uid` or `teacherUid == request.auth.uid`.
4. **Temporal & Immutable Integrity**: All `createdAt`, `updatedAt`, and `timestamp` fields are validated against `request.time`. `createdAt`, `uid`, `teacherId`, `studentId`, and `tanggal` cannot be mutated after creation. `audit_logs` are strictly append-only (no update/delete).
5. **Atomic First-Admin Bootstrap**: Claiming the initial `ADMIN` role requires atomically creating `/school_settings/admin_claimed` alongside `/users/{uid}` via `getAfter()`, locking out any subsequent self-assignment.

## 2. Dirty Dozen Adversarial Payloads
1. **Role Escalation on Self-Update**: `GURU` attempts `updateDoc(doc(db, 'users', guruUid), { role: 'ADMIN' })` -> `PERMISSION_DENIED`.
2. **Self-Assigned Admin After Claim**: Attacker attempts `setDoc(doc(db, 'users', attackerUid), { role: 'ADMIN', ... })` after `admin_claimed` exists -> `PERMISSION_DENIED`.
3. **Shadow Ghost Field Injection**: `GURU` submits `teacher_attendance` with extra `isApprovedByAdmin: true` key -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Attendance**: `GURU` A submits `teacher_attendance` with `userId: guruB_uid` -> `PERMISSION_DENIED`.
5. **Duplicate Date Bypass via Random ID**: `GURU` attempts `setDoc(doc(db, 'teacher_attendance', 'random-id-999'), { teacherId: 't1', tanggal: '2026-11-23', ... })` -> `PERMISSION_DENIED` (ID must match `teacherId + '_' + tanggal`).
6. **Client Timestamp Forgery**: User submits `createdAt` in the past instead of `serverTimestamp()` -> `PERMISSION_DENIED` (`createdAt != request.time`).
7. **Resource Poisoning / Oversized String**: User injects 2KB string into `teacherId` or `namaLengkap` -> `PERMISSION_DENIED`.
8. **Cross-Teacher PII Snooping**: `GURU` A attempts `getDoc(doc(db, 'teachers', guruB_teacherId))` or `getDocs(collection(db, 'teachers'))` without `userId == guruA_uid` -> `PERMISSION_DENIED`.
9. **Cross-Class Student Attendance Tampering**: `GURU` A attempts to create `student_attendance` with `teacherUid: otherGuruUid` -> `PERMISSION_DENIED`.
10. **Settings Hijack by Guru**: `GURU` attempts to overwrite `/school_settings/madrasah` -> `PERMISSION_DENIED`.
11. **Audit Log Tampering / Deletion**: Any user (even Admin) attempts `updateDoc` or `deleteDoc` on `/audit_logs/{id}` -> `PERMISSION_DENIED`.
12. **Unauthenticated Query / Read**: Unauthenticated client attempts to read `/users`, `/teachers`, `/students`, or `/school_settings` -> `PERMISSION_DENIED`.
