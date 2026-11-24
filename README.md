# MIS DARUSSALAM ABSENSI DIGITAL

Sistem administrasi dan absensi digital berbasis cloud realtime untuk **Madrasah Ibtidaiyah Darussalam** — Yayasan Pendidikan Islam Daaruttaqwa (YPI-DTQ).

## Identitas Madrasah
- **Yayasan**: Yayasan Pendidikan Islam Daaruttaqwa (YPI-DTQ)
- **Madrasah**: Madrasah Ibtidaiyah Darussalam
- **NSM**: 111232130078 · **NPSM**: 60708974
- **Akreditasi**: "B" BAN-PDM Nomor : 031/BAN-PDM/SK/2026
- **Alamat**: Jln. Wanasari No. 1 Desa Pinangsari Kec. Ciasem Kab. Subang 41265
- **Telepon**: 08568639720

## Fitur Utama
- **Autentikasi & RBAC**: Firebase Authentication (`ADMIN` & `GURU`), First Admin Setup, serta proteksi rute dan Firestore Security Rules.
- **Realtime Multi-Perangkat**: Sinkronisasi langsung melalui Cloud Firestore `onSnapshot()` antara perangkat HP Guru dan Panel Admin.
- **Anti-Duplikasi Absensi**: Kombinasi deterministik `teacherId_tanggal` dan `studentId_tanggal` mencegah duplikasi walaupun guru berganti perangkat.
- **Manajemen Data Induk**: CRUD Guru, Siswa, Kelas/Rombel (Kelas 1–6), Tahun Pelajaran, Manajemen Akun, serta Audit Log permanen.
- **Laporan PDF Profesional**: Kop Surat resmi YPI-DTQ / MIS Darussalam, dukungan **Preview PDF**, **Cetak PDF**, **Download PDF**, orientasi Portrait/Landscape, ukuran kertas **A4 / F4**, penomoran halaman, serta blok tanda tangan Kepala Madrasah dan Wali Kelas.
- **Import & Export Excel**: Template `.xlsx`, validasi baris sebelum simpan, serta ekspor data guru, siswa, kelas, absensi, dan rekap bulanan/tahunan.
- **PWA & Dark Mode**: Dapat diinstal ke perangkat Android/iOS/Desktop dengan Service Worker dan mode gelap.

## Panduan Setup & Deployment

1. **Firebase Setup**:
   - Aktifkan **Authentication → Sign-in method → Email/Password** (dan Google jika diperlukan) pada Firebase Console proyek Anda.
   - Aktifkan **Cloud Firestore**, **Firebase Storage**, dan deploy `firestore.rules`, `firestore.indexes.json`, serta `storage.rules`.
2. **Environment Variables**:
   - Salin `.env.example` menjadi `.env` jika menggunakan konfigurasi custom, atau gunakan `firebase-applet-config.json` yang sudah terhubung.
3. **Instalasi & Build**:
   ```bash
   npm install
   npm run dev
   npm run build
   ```
4. **Deploy ke Cloudflare Workers (`workers.dev`)**:
   - Konfigurasi sudah tersedia di `wrangler.jsonc` (`"not_found_handling": "single-page-application"`) dan `public/_headers`.
   - Build Command: `npm run build` · Deploy Command: `npx wrangler deploy` (output directory `dist`).
   - Wajib tambahkan domain `digital-absen-darussalam.ridwan26abengwan.workers.dev` pada **Firebase Console → Authentication → Settings → Authorized domains** agar login Google berfungsi.
5. **Deploy ke Vercel**:
   - Konfigurasi SPA sudah tersedia di `vercel.json`. Hubungkan repositori ke Vercel, atur Build Command `npm run build` dan Output Directory `dist`.
6. **Deploy ke Firebase Hosting**:
   ```bash
   firebase deploy
   ```
