import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_SCHOOL_SETTINGS } from '../constants/schoolDefaults';
import {
  subscribeAcademicYears,
  subscribeAuditLogs,
  subscribeClasses,
  subscribeSchoolSettings,
  subscribeStudentAttendances,
  subscribeStudents,
  subscribeTeacherAttendances,
  subscribeTeachers,
  subscribeUsers,
} from '../services/firestoreService';
import type {
  AcademicYear,
  AuditLog,
  SchoolClass,
  SchoolSettings,
  Student,
  StudentAttendance,
  Teacher,
  TeacherAttendance,
  UserProfile,
} from '../types';
import { useAuth } from './AuthContext';

interface SchoolDataContextValue {
  schoolSettings: SchoolSettings;
  academicYears: AcademicYear[];
  teachers: Teacher[];
  students: Student[];
  classes: SchoolClass[];
  teacherAttendances: TeacherAttendance[];
  studentAttendances: StudentAttendance[];
  users: UserProfile[];
  auditLogs: AuditLog[];
  dataLoading: boolean;
  isLiveSynced: boolean;
}

const SchoolDataContext = createContext<SchoolDataContextValue | undefined>(undefined);

export const SchoolDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authReady, userProfile } = useAuth();
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teacherAttendances, setTeacherAttendances] = useState<TeacherAttendance[]>([]);
  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isLiveSynced, setIsLiveSynced] = useState(false);

  useEffect(() => {
    if (!authReady || !userProfile || userProfile.status !== 'ACTIVE') {
      setTeachers([]);
      setStudents([]);
      setClasses([]);
      setTeacherAttendances([]);
      setStudentAttendances([]);
      setUsers([]);
      setAuditLogs([]);
      setAcademicYears([]);
      setIsLiveSynced(false);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    const isAdmin = userProfile.role === 'ADMIN';
    const guruUid = isAdmin ? undefined : userProfile.uid;

    const unsubs = [
      subscribeSchoolSettings((s) => {
        setSchoolSettings(s);
        setIsLiveSynced(true);
      }),
      subscribeAcademicYears(setAcademicYears),
      subscribeTeachers((rows) => {
        setTeachers(rows);
        setDataLoading(false);
      }, guruUid),
      subscribeClasses(setClasses, guruUid),
      subscribeStudents(setStudents, guruUid),
      subscribeTeacherAttendances(setTeacherAttendances, guruUid),
      subscribeStudentAttendances(setStudentAttendances, guruUid),
    ];

    if (isAdmin) {
      unsubs.push(subscribeUsers(setUsers));
      unsubs.push(subscribeAuditLogs(setAuditLogs));
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, userProfile]);

  return (
    <SchoolDataContext.Provider
      value={{
        schoolSettings,
        academicYears,
        teachers,
        students,
        classes,
        teacherAttendances,
        studentAttendances,
        users,
        auditLogs,
        dataLoading,
        isLiveSynced,
      }}
    >
      {children}
    </SchoolDataContext.Provider>
  );
};

export function useSchoolData(): SchoolDataContextValue {
  const ctx = useContext(SchoolDataContext);
  if (!ctx) throw new Error('useSchoolData must be used within SchoolDataProvider');
  return ctx;
}
