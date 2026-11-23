export type AuthGuidanceType = 'provider' | 'domain' | 'google-bootstrap' | null;

export interface TranslatedAuthError {
  message: string;
  needsProviderEnable: boolean;
  guidance: AuthGuidanceType;
}

export function translateFirebaseAuthError(
  code: string,
  hostname = ''
): TranslatedAuthError {
  const normalized = code.trim();

  switch (normalized) {
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
    case 'auth/admin-restricted-operation':
      return {
        message:
          'Metode Email/Password belum diaktifkan di Firebase Console proyek ini. Aktifkan provider Email/Password terlebih dahulu, atau gunakan tombol "Masuk dengan Akun Google".',
        needsProviderEnable: true,
        guidance: 'provider',
      };

    case 'auth/unauthorized-domain':
      return {
        message: `Domain "${hostname || 'aplikasi ini'}" belum terdaftar di Authorized Domains Firebase Authentication.`,
        needsProviderEnable: false,
        guidance: 'domain',
      };

    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return {
        message: 'Username/Email atau kata sandi tidak sesuai.',
        needsProviderEnable: false,
        guidance: null,
      };

    case 'auth/email-already-in-use':
      return {
        message:
          'Email ini sudah terdaftar di Firebase Authentication. Jika email tertaut dengan akun Google (mis. rdwanwannn@gmail.com), silakan klik "Masuk dengan Akun Google" di bawah untuk langsung masuk sebagai Admin.',
        needsProviderEnable: false,
        guidance: 'google-bootstrap',
      };

    case 'auth/account-exists-with-different-credential':
      return {
        message:
          'Akun dengan email ini sudah terdaftar menggunakan metode masuk lain (misalnya Google). Gunakan tombol "Masuk dengan Akun Google".',
        needsProviderEnable: false,
        guidance: 'google-bootstrap',
      };

    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return {
        message:
          'Kata sandi belum memenuhi syarat keamanan Firebase (minimal 8 karakter, disarankan kombinasi huruf besar, huruf kecil, dan angka).',
        needsProviderEnable: false,
        guidance: null,
      };

    case 'auth/invalid-email':
      return {
        message: 'Format email atau username tidak valid untuk autentikasi Firebase.',
        needsProviderEnable: false,
        guidance: null,
      };

    case 'auth/too-many-requests':
      return {
        message: 'Terlalu banyak percobaan autentikasi. Silakan tunggu beberapa menit lalu coba lagi.',
        needsProviderEnable: false,
        guidance: null,
      };

    case 'auth/network-request-failed':
      return {
        message:
          'Koneksi ke layanan autentikasi Firebase terputus. Periksa koneksi internet Anda lalu coba lagi.',
        needsProviderEnable: false,
        guidance: null,
      };

    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return {
        message: 'Jendela login Google ditutup sebelum proses autentikasi selesai.',
        needsProviderEnable: false,
        guidance: null,
      };

    case 'auth/popup-blocked':
      return {
        message:
          'Popup login Google diblokir oleh browser. Izinkan popup untuk situs ini lalu coba kembali.',
        needsProviderEnable: false,
        guidance: null,
      };

    case 'permission-denied':
    case 'firestore/permission-denied':
      return {
        message:
          'Izin database Firestore ditolak (permission-denied). Kemungkinan Setup Admin Awal sudah diklaim sebelumnya atau akun belum memiliki izin ADMIN.',
        needsProviderEnable: false,
        guidance: 'google-bootstrap',
      };

    case 'unavailable':
    case 'firestore/unavailable':
      return {
        message: 'Cloud Firestore sedang tidak terjangkau. Periksa koneksi internet Anda.',
        needsProviderEnable: false,
        guidance: null,
      };

    default:
      return {
        message: `Terjadi gangguan autentikasi (${normalized || 'unknown-error'}). Periksa koneksi atau konfigurasi Firebase Authentication Anda.`,
        needsProviderEnable: false,
        guidance: null,
      };
  }
}
