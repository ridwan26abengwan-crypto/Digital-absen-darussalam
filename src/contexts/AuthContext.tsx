import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '../firebase/config';
import { ensureDefaultSchoolDocs, writeAuditLog } from '../services/firestoreService';
import type { UserProfile } from '../types';
import { normalizeLoginIdentifier, sanitizeString } from '../utils/attendanceLogic';
import { translateFirebaseAuthError, type AuthGuidanceType } from '../utils/authErrorMessages';

interface AuthContextValue {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  authReady: boolean;
  authError: string | null;
  providerNeedsConsoleEnable: boolean;
  authGuidance: AuthGuidanceType;
  clearAuthError: () => void;
  loginWithIdentifier: (identifier: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  setupFirstAdmin: (params: {
    nama: string;
    username: string;
    email?: string;
    password: string;
  }) => Promise<void>;
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const BOOTSTRAP_ADMIN_EMAIL = 'rdwanwannn@gmail.com';

function extractErrorCode(err: unknown): string {
  const rawCode = (err as { code?: string })?.code;
  if (typeof rawCode === 'string' && rawCode.trim()) {
    return rawCode.trim();
  }
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
    return 'permission-denied';
  }
  return '';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [providerNeedsConsoleEnable, setProviderNeedsConsoleEnable] = useState(false);
  const [authGuidance, setAuthGuidance] = useState<AuthGuidanceType>(null);

  useEffect(() => {
    void testConnection();
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setFirebaseUser(user);

      if (!user) {
        setUserProfile(null);
        setAuthReady(true);
        return;
      }

      // Check if user profile document exists
      const userRef = doc(db, 'users', user.uid);
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          // If signed in with bootstrap owner email via Google, provision ADMIN profile
          if (user.email === BOOTSTRAP_ADMIN_EMAIL && user.emailVerified) {
            const profilePayload: UserProfile = {
              uid: user.uid,
              nama: sanitizeString(user.displayName || 'MIS DARUSSALAM', 120),
              email: user.email,
              username: 'MIS DARUSSALAM',
              role: 'ADMIN',
              teacherId: '',
              status: 'ACTIVE',
              photoUrl: user.photoURL ?? '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userRef, profilePayload);
            await ensureDefaultSchoolDocs({
              user: profilePayload.nama,
              uid: user.uid,
              role: 'ADMIN',
            });
          }
        }
      } catch (err) {
        console.error('Error checking initial user profile:', err);
        const code = extractErrorCode(err);
        if (code) {
          const translated = translateFirebaseAuthError(
            code,
            typeof window !== 'undefined' ? window.location.hostname : ''
          );
          setAuthError(translated.message);
          setProviderNeedsConsoleEnable(translated.needsProviderEnable);
          setAuthGuidance(translated.guidance);
        }
      }

      unsubProfile = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (data.status === 'INACTIVE') {
              setAuthError('Akun Anda sedang dinonaktifkan oleh Admin Madrasah.');
              setUserProfile(null);
              void signOut(auth);
            } else {
              setUserProfile(data);
            }
          } else {
            setUserProfile(null);
          }
          setAuthReady(true);
        },
        (error) => {
          setAuthReady(true);
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const clearAuthError = () => {
    setAuthError(null);
    setProviderNeedsConsoleEnable(false);
    setAuthGuidance(null);
  };

  const applyTranslatedError = (code: string) => {
    const translated = translateFirebaseAuthError(
      code,
      typeof window !== 'undefined' ? window.location.hostname : ''
    );
    setAuthError(translated.message);
    setProviderNeedsConsoleEnable(translated.needsProviderEnable);
    setAuthGuidance(translated.guidance);
  };

  const loginWithIdentifier = async (identifier: string, password: string) => {
    clearAuthError();
    const authEmail = normalizeLoginIdentifier(identifier);
    try {
      const cred = await signInWithEmailAndPassword(auth, authEmail, password);
      const userSnap = await getDoc(doc(db, 'users', cred.user.uid));
      if (!userSnap.exists()) {
        await signOut(auth);
        setAuthError('Profil pengguna belum terdaftar di sistem madrasah.');
        throw new Error('PROFILE_NOT_FOUND');
      }
      const profile = userSnap.data() as UserProfile;
      if (profile.status !== 'ACTIVE') {
        await signOut(auth);
        setAuthError('Akun Anda berstatus nonaktif. Hubungi Admin Madrasah.');
        throw new Error('ACCOUNT_INACTIVE');
      }
      try {
        await writeAuditLog({
          user: profile.nama,
          uid: profile.uid,
          role: profile.role,
          aktivitas: 'Login ke sistem',
          data: `Perangkat: ${navigator.userAgent.slice(0, 80)}`,
        });
      } catch {
        // Non-fatal audit failure
      }
    } catch (err: unknown) {
      const code = extractErrorCode(err);
      if (code) {
        applyTranslatedError(code);
      }
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    clearAuthError();
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const userSnap = await getDoc(doc(db, 'users', cred.user.uid));
      if (!userSnap.exists() && cred.user.email !== BOOTSTRAP_ADMIN_EMAIL) {
        await signOut(auth);
        setAuthError(
          'Akun Google ini belum didaftarkan oleh Admin Madrasah. Minta Admin mendaftarkan akun Anda terlebih dahulu.'
        );
        throw new Error('UNAUTHORIZED_GOOGLE_USER');
      }
      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        if (profile.status !== 'ACTIVE') {
          await signOut(auth);
          setAuthError('Akun Anda berstatus nonaktif. Hubungi Admin Madrasah.');
          throw new Error('ACCOUNT_INACTIVE');
        }
        try {
          await writeAuditLog({
            user: profile.nama,
            uid: profile.uid,
            role: profile.role,
            aktivitas: 'Login melalui Google Auth',
            data: profile.email,
          });
        } catch {
          // Non-fatal audit failure
        }
      }
    } catch (err: unknown) {
      const code = extractErrorCode(err);
      if (code) {
        applyTranslatedError(code);
      }
      throw err;
    }
  };

  const setupFirstAdmin = async (params: {
    nama: string;
    username: string;
    email?: string;
    password: string;
  }) => {
    clearAuthError();
    const authEmail = params.email?.trim()
      ? params.email.trim().toLowerCase()
      : normalizeLoginIdentifier(params.username);
    let createdAuthUser: User | null = null;
    let committedAdminProfile = false;
    try {
      const cred = await createUserWithEmailAndPassword(auth, authEmail, params.password);
      createdAuthUser = cred.user;
      const uid = cred.user.uid;
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid), {
        uid,
        nama: sanitizeString(params.nama, 120),
        email: sanitizeString(authEmail, 160),
        username: sanitizeString(params.username, 64),
        role: 'ADMIN',
        teacherId: '',
        status: 'ACTIVE',
        photoUrl: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'school_settings', 'admin_claimed'), {
        claimedByUid: uid,
        claimedAt: serverTimestamp(),
      });
      await batch.commit();
      committedAdminProfile = true;
      await ensureDefaultSchoolDocs({
        user: params.nama,
        uid,
        role: 'ADMIN',
      });
      try {
        await writeAuditLog({
          user: params.nama,
          uid,
          role: 'ADMIN',
          aktivitas: 'Melakukan First Admin Setup',
          data: params.username,
        });
      } catch {
        // Non-fatal audit failure
      }
    } catch (err: unknown) {
      if (createdAuthUser && !committedAdminProfile) {
        try {
          await createdAuthUser.delete();
        } catch {
          await signOut(auth).catch(() => {});
        }
      }
      const code = extractErrorCode(err);
      if (code) {
        applyTranslatedError(code);
      } else {
        setAuthError(
          'Setup Admin Awal gagal. Kemungkinan akun Admin pertama sudah diklaim sebelumnya.'
        );
      }
      throw err;
    }
  };

  const changeOwnPassword = async (currentPassword: string, newPassword: string) => {
    if (!firebaseUser || !firebaseUser.email) {
      throw new Error('Pengguna tidak ditemukan atau menggunakan login Google.');
    }
    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
    await reauthenticateWithCredential(firebaseUser, credential);
    await updatePassword(firebaseUser, newPassword);
    if (userProfile) {
      await writeAuditLog({
        user: userProfile.nama,
        uid: userProfile.uid,
        role: userProfile.role,
        aktivitas: 'Mengubah kata sandi akun sendiri',
        data: userProfile.username,
      });
    }
  };

  const logout = async () => {
    if (userProfile) {
      try {
        await writeAuditLog({
          user: userProfile.nama,
          uid: userProfile.uid,
          role: userProfile.role,
          aktivitas: 'Logout dari sistem',
          data: userProfile.username,
        });
      } catch {
        // Proceed with sign out even if audit log fails
      }
    }
    await signOut(auth);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        authReady,
        authError,
        providerNeedsConsoleEnable,
        authGuidance,
        clearAuthError,
        loginWithIdentifier,
        loginWithGoogle,
        setupFirstAdmin,
        changeOwnPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
