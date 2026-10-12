# Kept — Private Zero-Knowledge Vault

A private zero-knowledge password and banking vault built on React 19, Vite PWA, Supabase, and the **Omarchy** minimalist design system.

## 1. Fitur Utama

- **Zero-Knowledge Architecture:**
  - Client-side Argon2id key derivation
  - AES-256-GCM encryption menggunakan Web Crypto API
  - Master Password tidak pernah dikirim ke server atau disimpan di database
- **Omarchy Design System:**
  - Interface light-first minimalis
  - Grid 4px dengan densitas ringkas
  - Tipografi Geist Variable dan JetBrains Mono Variable
  - Dukungan multi-tema: `Light`, `Dark`, `Tokyo Night`, dan `Catppuccin`
- **Keamanan & Pemulihan (Vault Lifecycle):**
  - **Emergency Recovery Key:** Kunci pemulihan 24-karakter untuk membuka kembali vault jika lupa Master Password
  - **Ganti Master Password:** Re-enkripsi seluruh item vault secara otomatis dengan salt & verifier baru
  - **Ganti Password Akun:** Pembaruan password login langsung di menu Settings
  - **WebAuthn Biometric Unlock:** Buka vault dengan Touch ID, Windows Hello, atau sidik jari perangkat
- **Sinkronisasi Offline (Conflict Resolution):**
  - Penyimpanan lokal IndexedDB dengan antrean mutasi offline
  - Deteksi dan resolusi konflik otomatis saat online kembali (zero-data-loss conflict branching)
  - Indikator status koneksi dan antrean sinkronisasi
- **Manajemen Kredensial:**
  - Passwords (Social Media, Web, Project)
  - Kartu Bank / ATM (mode tampilan Realistic dan Abstrak)
  - Secure Notes terenkripsi
  - Custom fields terenkripsi
- **Portabilitas Data:**
  - Ekspor cadangan JSON terenkripsi
  - Impor CSV browser

## 2. Instalasi & Menjalankan

```powershell
npm install
npm run dev
```

Untuk build produksi PWA:

```powershell
npm run build
npm run preview
```

## 3. Konfigurasi Lingkungan (.env.local)

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## 4. Emergency Recovery Kit

Saat setup awal, Kept menghasilkan **Emergency Recovery Key** (contoh: `KEPT-A1B2-C3D4-E5F6-G7H8-J9K0`). Unduh lembar darurat atau simpan kode ini di tempat yang aman.
