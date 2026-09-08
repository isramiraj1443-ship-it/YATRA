<div align="center">

<img src="https://raw.githubusercontent.com/isramiraj1443-ship-it/YATRA/1bece3303df65f85aad47888af7cfdf314825ead/icons/icon-192.png" width="110" alt="Logo YATRA">

# YATRA

**Catatan Perjalanan Pramuka Penggalang**

Aplikasi pencatat perjalanan, latihan, dan pencapaian anggota Dewan Penggalang —
berbasis **Google Apps Script** (backend gratis di Google Workspace) dan
**Progressive Web App** yang bisa dipasang di ponsel.

![version](https://img.shields.io/badge/versi-3.0.0-fc4c02)
![platform](https://img.shields.io/badge/platform-Apps%20Script%20%2B%20PWA-2ecc71)
![license](https://img.shields.io/badge/lisensi-MIT-blue)

</div>

---

## Daftar Isi

- [Tentang YATRA](#tentang-yatra)
- [Fitur](#fitur)
- [Tangkapan Alur](#tangkapan-alur)
- [Arsitektur](#arsitektur)
- [Struktur Repositori](#struktur-repositori)
- [Pemasangan](#pemasangan)
  - [A. Backend Apps Script](#a-backend-apps-script)
  - [B. Frontend PWA di Vercel](#b-frontend-pwa-di-vercel)
  - [C. Mode Apps Script Saja](#c-mode-apps-script-saja)
- [Akun Bawaan](#akun-bawaan)
- [Panduan Pemakaian](#panduan-pemakaian)
- [Referensi API](#referensi-api)
- [Struktur Data](#struktur-data)
- [Keamanan](#keamanan)
- [Pemecahan Masalah](#pemecahan-masalah)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

---

## Tentang YATRA

*Yatra* berarti **perjalanan**. Aplikasi ini membantu Pembina dan Dewan Penggalang
mencatat setiap perjalanan latihan secara terverifikasi: dari pelacakan GPS langsung,
bukti foto, penilaian **SKK Gerak Jalan**, checklist **SKU digital**, sampai
papan peringkat antar-regu dan kartu pencapaian yang bisa dibagikan.

Seluruh data tersimpan di **Google Spreadsheet + Google Drive** milik gugus depan
sendiri — tanpa biaya server, tanpa basis data pihak ketiga.

---

## Fitur

### 🥾 Pencatatan Perjalanan
- **Pelacakan GPS langsung** dengan peta Leaflet: jarak, durasi, pace, kecepatan, elevasi, akurasi sinyal.
- **Penyaringan titik cerdas** — membuang derau GPS (< 2,5 m) dan lompatan tidak wajar (> 45 km/jam).
- **Auto-save rekaman**: aplikasi tertutup atau ponsel mati? Rekaman dipulihkan saat dibuka lagi.
- **Wake Lock** menjaga layar tetap menyala selama merekam.
- **Entri manual** untuk anggota tanpa sistem pelacak, dengan foto bukti wajib.
- **Impor GPX** dari Strava, Garmin, Xiaomi, dsb. — jarak/durasi/elevasi terisi otomatis.
- **Kompresi foto di perangkat** hingga < 200 KB sebelum diunggah (hemat kuota Drive).
- **Gambar rute otomatis** dibuat server dengan Google Static Maps.
- **Anti-duplikat** dan validasi kewajaran data (jarak ≤ 300 km, durasi ≤ 24 jam, tanggal tidak di masa depan).

### 🎗️ SKK Gerak Jalan
- Tingkat **Purwa / Madya / Utama** dengan kriteria yang dapat diatur admin per golongan & putra/putri.
- Progres otomatis dihitung dari perjalanan yang memenuhi syarat, lengkap dengan **daftar bukti**.
- Alur pengajuan → folder Drive per anggota → **validasi Pembina** (lulus / ditolak + umpan balik).

### 📋 SKU Digital (baru di v3)
- Checklist butir SKU **Ramu, Rakit, Terap** yang dapat ditambah lewat sheet `SKU_Items`.
- Anggota mengajukan butir → Pembina memvalidasi (tanda tangan digital tercatat: siapa & kapan).
- SKU anggota **naik otomatis** ketika semua butir satu tingkat dinyatakan lulus.

### 🏕️ Regu & Pasukan (baru di v3)
- Manajemen regu (nama, pasukan, pemimpin, motto, warna).
- **Kompetisi antar-regu**: total km, jumlah anggota aktif, dan **persentase partisipasi**.
- Rekap regu tersedia di panel Pembina dan dapat diekspor.

### 🏅 Gamifikasi (baru di v3)
- **18 lencana** otomatis: jarak, streak, elevasi, perjalanan tunggal, SKK, bakti masyarakat, kekompakan regu.
- **XP & level** (Tunas → Pandu Sejati) dari aktivitas, jarak, lencana, butir SKU, dan tingkat SKK.
- Animasi perayaan saat lencana baru diperoleh.

### 📊 Statistik & Laporan
- Grafik batang 8 pekan, donat komposisi kegiatan, streak, hari aktif, target bulanan.
- **Kartu pencapaian 1080×1350** — unduh JPG, simpan ke Drive, atau bagikan via Web Share API.
- Ekspor **PDF/Excel** per anggota, dan **rekap seluruh anggota** untuk Pembina.

### 📱 Pengalaman Aplikasi
- **PWA**: dapat dipasang di layar utama, ada shortcut Lacak/Catat/Peringkat.
- **Mode offline**: perjalanan yang dicatat saat offline **diantre** dan dikirim otomatis saat online.
- **Tema gelap & terang**, desain mobile-first, animasi halus, menghormati `prefers-reduced-motion`.
- **Pengumuman** dari Pembina tampil di beranda.

---

## Tangkapan Alur

```
Anggota                          Sistem                        Pembina
   │                                │                              │
   ├─ Lacak GPS / Catat manual ────►│ validasi + simpan Drive      │
   │                                ├─ hitung SKK, badge, XP       │
   ├─ Ajukan SKK Purwa ────────────►│ buat folder bukti ──────────►│ tinjau
   │                                │                              ├─ Luluskan
   │◄─ Notifikasi lencana baru ─────┤◄─ SKK tervalidasi ───────────┤
   │                                │                              │
   ├─ Ajukan butir SKU ────────────►│ ─────────────────────────────►│ tanda tangan digital
   │◄─ SKU naik otomatis ───────────┤                              │
```

---

## Arsitektur

```
┌──────────────────────────┐        ┌───────────────────────────┐
│  PWA (Vercel / statis)   │        │  Google Apps Script       │
│  index.html css/ js/    │        │  apps-script/             │
│  ├ index.html            │        │  ├ 00_Config.gs           │
│  ├ css/app.css           │  POST  │  ├ 01_Core.gs             │
│  ├ js/api.js ────────────┼───────►│  ├ 02_Auth.gs             │
│  ├ js/tracker.js         │ /api/  │  ├ 03_Activity.gs         │
│  ├ js/charts.js          │  fn    │  ├ 04_SKK_SKU.gs          │
│  ├ js/app.js             │        │  ├ 05_Regu_Gamifikasi.gs  │
│  └ sw.js (offline)       │        │  ├ 06_Admin_Report.gs     │
└──────────┬───────────────┘        │  └ 07_Router.gs (doPost)  │
           │                        └────────────┬──────────────┘
   api/[fn].js (proxy)                           │
   menyembunyikan URL GAS                        ▼
                                    ┌───────────────────────────┐
                                    │ Spreadsheet (11 sheet)    │
                                    │ Drive (foto, rute, SKK,   │
                                    │        laporan, kartu)    │
                                    └───────────────────────────┘
```

Kenapa ada proxy `api/[fn].js`? Karena Apps Script `/exec` tidak mengirim header CORS
yang ramah untuk `fetch` lintas-origin, dan URL deployment sebaiknya tidak diekspos ke klien.

---

## Struktur Repositori

```
yatra/
├── apps-script/                 # Backend Google Apps Script
│   ├── 00_Config.gs             # Konstanta, skema sheet, katalog badge/SKU
│   ├── 01_Core.gs               # Utilitas, Drive, setup & seeder
│   ├── 02_Auth.gs               # Login, sesi, profil, rate-limit
│   ├── 03_Activity.gs           # Perjalanan, statistik, rute, foto
│   ├── 04_SKK_SKU.gs            # SKK Gerak Jalan + checklist SKU
│   ├── 05_Regu_Gamifikasi.gs    # Regu, leaderboard, badge, XP, pengumuman
│   ├── 06_Admin_Report.gs       # Panel admin, validasi, kartu, laporan
│   ├── 07_Router.gs             # doGet/doPost, allowlist API, trigger
│   ├── Index.html               # UI hasil build (jangan diedit manual)
│   ├── appsscript.json          # Manifest & OAuth scope
│   └── .clasp.json.example
├── dist/Code.gs                 # ⭐ Berkas tunggal siap tempel ke Apps Script
├── index.html                   # Frontend PWA (sumber kebenaran UI)
├── offline.html
├── manifest.webmanifest
├── sw.js
├── css/app.css
├── js/{api,utils,charts,tracker,app}.js
├── icons/                       # icon-192, icon-512, maskable, inline
├── api/[fn].js                  # Serverless proxy Vercel
├── scripts/
│   ├── build-gas.mjs            # Bundler frontend → apps-script/Index.html
│   ├── build-single.mjs         # 8 modul .gs → dist/Code.gs
│   ├── check-globals.mjs        # Deteksi identifier global ganda
│   ├── check-api-sync.mjs       # Allowlist API sinkron di 3 tempat
│   └── smoke-test.mjs           # 11 uji terhadap Web App live
├── docs/                        # Panduan lengkap
├── .github/workflows/ci.yml
├── vercel.json
├── package.json
└── .env.example
```

> **Penting:** frontend berada di **root** (`index.html`, `css/`, `js/`, `icons/`)
> agar Vercel dapat menyajikannya langsung tanpa konfigurasi tambahan.
> Setelah mengubah UI, jalankan `npm run build:gas`.
> Jangan mengedit `apps-script/Index.html` langsung — akan tertimpa.

---

## Pemasangan

### ⚡ Cara tercepat — berkas tunggal (disarankan)

Anda **tidak perlu** membuat 8 berkas di editor Apps Script. Pakai berkas gabungan:

1. Buka **[`dist/Code.gs`](dist/Code.gs)**, klik **Raw**, salin semuanya.
2. Di proyek Apps Script, buka `Code.gs` → **Ctrl+A** → **tempel** (menimpa kode v2.9 lama).
3. Buat berkas HTML bernama **`Index`**, isi dengan `apps-script/Index.html`.
4. Jalankan `setup()` sekali → **Deploy → New deployment → Web app** → akses **Anyone**.

Proyek yang benar hanya berisi **3 entri**: `Code.gs`, `Index.html`, `appsscript.json`.
Karena semua kode menyatu di satu berkas, error
`Identifier ... has already been declared` **tidak mungkin muncul**.

Semua ID (Spreadsheet, folder SKK, folder induk Drive) dan `LOGO_URL` sudah
di-hardcode sesuai konfigurasi Anda — tidak ada yang perlu diisi manual.

### 🧩 Cara modular (untuk pengembang)

Salin 8 berkas dari `apps-script/` satu per satu. Wajib **hapus `Code.gs` lama**
lebih dulu — lihat [penjelasan error](#-syntaxerror-identifier-has-already-been-declared).

### ✅ Verifikasi deployment

Deployment aktif saat ini:

```
https://script.google.com/macros/s/AKfycbwnU2bjWGv4d1wLjQ_aDenL97Qm3tZIHs3BSeWs50TGJWAxJWjs_0zywr0fuyTW9jHZmA/exec
```

Uji kapan saja dengan satu perintah:

```bash
npm run smoke
```

Skrip ini memeriksa 11 hal: backend hidup, versi 3.x, `gsPing`, login admin,
penolakan password salah, validitas token, `gsInitData`/`gsDashboard`/`gsLeaderboard`,
pemblokiran fungsi internal, dan penolakan token palsu.

Cek cepat lewat browser — buka URL di atas dengan tambahan `?page=health`:

```json
{"ok":true,"app":"YATRA","version":"3.0.0","tz":"Asia/Jakarta","plaintext":true}
```

> **Soal HTTP 302.** Apps Script selalu membalas POST dengan redirect ke
> `script.googleusercontent.com`. Itu **normal, bukan error**. Klien harus
> mengikuti redirect (`curl -L`, atau `fetch` dengan `redirect:'follow'` —
> keduanya sudah dipakai di proxy `api/[fn].js`). Menguji dengan `curl` tanpa
> `-L` akan tampak seolah gagal padahal tidak.

### Detail lengkap


### A. Backend Apps Script

1. **Siapkan Google Drive**
   - Buat 1 Spreadsheet kosong → salin **Spreadsheet ID** dari URL.
   - Buat folder induk `YATRA` → salin **Folder ID**.
   - Buat folder `SKK Gerak Jalan` → salin **Folder ID**.

2. **Buat proyek Apps Script** di [script.google.com](https://script.google.com) → *New project*.

3. **Salin berkas** dari `apps-script/` ke editor (urutan nama sudah benar):
   `00_Config.gs` … `07_Router.gs` + `Index.html`.
   Aktifkan `appsscript.json` lewat *Project Settings → Show "appsscript.json"*.

4. **Isi Script Properties** (*Project Settings → Script Properties*):

   | Properti | Nilai |
   |---|---|
   | `SPREADSHEET_ID` | ID spreadsheet Anda |
   | `ROOT_FOLDER_ID` | ID folder induk YATRA |
   | `SKK_BASE_FOLDER_ID` | ID folder SKK |
   | `GUDEP_NAME` | mis. `Gudep 01.055–01.056` |
   | `PANGKALAN` | mis. `SMP Negeri 1 Surakarta` |
   | `LOGO_URL` | (opsional) URL logo PNG |

5. **Jalankan `setup()`** sekali dari editor → izinkan akses saat diminta.
   Fungsi ini membuat 11 sheet, folder Drive, akun admin, 50 akun penggalang, dan konfigurasi SKK bawaan.

6. **Jalankan `installTriggers()`** untuk pemeliharaan harian (bersihkan sesi, hitung ulang XP/lencana).

7. **Deploy** → *Deploy → New deployment → Web app*
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Salin URL `/exec`.

<details>
<summary><b>Alternatif: deploy dengan clasp (CLI)</b></summary>

```bash
npm install
npx clasp login
cp apps-script/.clasp.json.example .clasp.json   # isi scriptId
npm run deploy:gas
```
</details>

### B. Frontend PWA di Vercel

1. Push repositori ini ke GitHub.
2. Vercel → *Add New Project* → impor repo.
   - Framework Preset: **Other**
   - Build Command: *(kosongkan)*
   - Output Directory: **`web`**
3. *Settings → Environment Variables* → tambah:

   ```
   GAS_WEB_APP_URL = https://script.google.com/macros/s/AKfycbwnU2bjWGv4d1wLjQ_aDenL97Qm3tZIHs3BSeWs50TGJWAxJWjs_0zywr0fuyTW9jHZmA/exec
   ```

4. **Deploy**. Buka di ponsel → menu browser → **Tambahkan ke layar utama**.

Uji koneksi:
```bash
curl -X POST https://APLIKASI-ANDA.vercel.app/api/gsPing \
     -H "Content-Type: application/json" -d '{"args":[]}'
# → {"ok":true,"app":"YATRA","version":"3.0.0",...}
```

### C. Mode Apps Script Saja

Tidak ingin memakai Vercel? Cukup buka URL `/exec` di browser.
`Index.html` hasil build sudah berisi seluruh CSS & JS inline, dan `js/api.js`
otomatis beralih ke `google.script.run`. Fitur PWA (install & offline) tidak tersedia pada mode ini.

---

## Akun Bawaan

| Peran | UserID | Password | Keterangan |
|---|---|---|---|
| Admin | `admin` | `admin123` | **Segera ganti setelah login pertama** |
| Penggalang | `DGW20261` … `DGW202650` | `12345678` | 25 putra + 25 putri, terbagi ke 6 regu |

Regu bawaan: Elang, Rajawali, Harimau (putra); Melati, Anggrek, Mawar (putri).

---

## Panduan Pemakaian

### Untuk Anggota
1. Masuk dengan UserID dari Pembina → lengkapi profil (nama, panggilan, golongan, putra/putri, regu).
2. Tekan tombol **🥾** di tengah navigasi → **Mulai Lacak** → berjalan → **Selesai** → unggah foto → simpan.
3. Tanpa GPS? Buka **Catat Manual**, atau impor berkas **GPX** dari jam tangan/aplikasi lain.
4. Cek progres di menu **SKK**; bila syarat terpenuhi tekan **Ajukan Validasi**.
5. Kerjakan butir **SKU**, ajukan ke Pembina.
6. Buka **Kartu Pencapaian** untuk mengunduh atau membagikan pencapaian.

### Untuk Pembina / Admin
- **Profil → Panel Admin**.
- *Ringkasan* — anggota aktif, total km, antrean validasi, peringkat regu, ekspor rekap.
- *Anggota* — tambah satu per satu, **impor CSV massal**, reset password.
- *Validasi* — luluskan/tolak pengajuan SKK dan butir SKU.
- *Syarat SKK* — atur jarak & jumlah perjalanan per golongan/gender.
- *Pengumuman* — terbitkan informasi yang tampil di beranda semua anggota.

Format CSV impor massal:
```csv
userid,nama,panggilan,gender,regu
dgw202651,Ahmad Fauzi,Fauzi,putra,Elang
dgw202652,Siti Aminah,Siti,putri,Melati
```

---

## Referensi API

Semua endpoint dipanggil `POST /api/<fn>` dengan body:

```json
{ "token": "<token sesi>", "args": [ ... ] }
```

| Kategori | Fungsi |
|---|---|
| Autentikasi | `gsLogin`, `gsLogout`, `gsCurrentUser`, `gsInitData` |
| Profil | `gsSaveProfile`, `gsSaveProfilePhoto`, `gsSetTarget`, `gsChangePassword`, `gsMyApiKey` |
| Perjalanan | `gsAddActivity`, `gsListActivities`, `gsGetActivity`, `gsUpdateActivity`, `gsDeleteActivity`, `gsGetStats` |
| Rute | `gsGenerateRouteImage`, `gsReverseGeocode`, `gsPhotoUrl`, `gsRouteUrl` |
| SKK | `gsGetSkk`, `gsSkkSubmit`, `gsSkkMySubmissions` |
| SKU | `gsGetSku`, `gsSkuClaim`, `gsSkuValidate`, `gsAdminListSkuClaims` |
| Regu | `gsListRegu`, `gsReguLeaderboard`, `gsAdminSaveRegu`, `gsAdminDeleteRegu` |
| Gamifikasi | `gsGetBadges`, `gsGetLevel` |
| Peringkat | `gsLeaderboard`, `gsLeadership`, `gsDashboard`, `gsGetAchievement` |
| Laporan | `gsExportReport`, `gsSaveCard`, `gsSaveCardPdf`, `gsAdminExportAll` |
| Admin | `gsAdminListUsers`, `gsAdminAddUser`, `gsAdminBulkAddUsers`, `gsAdminUpdateUser`, `gsAdminResetPass`, `gsAdminDeleteUser`, `gsAdminOverview` |
| Validasi | `gsAdminGetSkkConfig`, `gsAdminSetSkkConfig`, `gsAdminListSkkSubmissions`, `gsAdminValidateSkk`, `gsAdminVerifyActivity` |
| Pengumuman | `gsAdminSaveAnnouncement`, `gsAdminDeleteAnnouncement` |

**Integrasi pihak ketiga** (tanpa sesi, memakai API key anggota):

```bash
curl -X POST "$GAS_WEB_APP_URL" -H "Content-Type: application/json" -d '{
  "fn": "importActivity",
  "apiKey": "yatra_xxxxxxxxxxxx",
  "payload": { "type":"lari", "date":"2026-09-08", "distanceKm":5.2, "durationMin":32 }
}'
```

Detail lengkap: [`docs/API.md`](docs/API.md).

---

## Struktur Data

| Sheet | Isi |
|---|---|
| `Users` | akun, profil, regu, XP, target |
| `Activities` | seluruh catatan perjalanan |
| `Sessions` | token sesi aktif (dibersihkan otomatis) |
| `SKK_Config` | kriteria SKK per golongan & gender |
| `SKK_Submissions` | pengajuan & hasil validasi SKK |
| `SKU_Items` | daftar butir SKU |
| `SKU_Progress` | pengajuan & validasi butir SKU |
| `Regu` | data regu/pasukan |
| `Badges` | lencana yang diperoleh anggota |
| `Announcements` | pengumuman Pembina |
| `AuditLog` | jejak aktivitas penting |

Struktur folder Drive:

```
YATRA/
├── YATRA_Bukti_Rute/
├── YATRA_Gambar_Rute/
├── YATRA_Laporan/
├── YATRA_Kartu_Pencapaian/
├── YATRA_Aset/
└── YATRA_Profil/<UserID - Panggilan>/

SKK Gerak Jalan/
├── SKK Purwa/<UserID - Panggilan>/
├── SKK Madya/…
└── SKK Utama/…
```

---

## Keamanan

Yang **diperbaiki** di v3:
- ✅ Endpoint diagnostik yang membocorkan password (`bootstrapDumpUsers`, `bootstrapDiagnose`, blok `diag` pada login) **dihapus seluruhnya**.
- ✅ **Rate limit** login: 8 percobaan gagal per 15 menit per UserID.
- ✅ **Allowlist** fungsi API di dua lapis (Apps Script & proxy) — tidak ada eksekusi fungsi sembarang.
- ✅ Sesi kedaluwarsa 7 hari + pembersihan otomatis harian.
- ✅ Kunci API anggota lain tidak pernah dikirim ke klien.
- ✅ ID Spreadsheet/Drive dipindah ke **Script Properties**, tidak keras di dalam kode.
- ✅ `AuditLog` mencatat login, perubahan data, dan validasi.

Yang **masih perlu diperhatikan**:
- ⚠️ **Password disimpan plaintext** di sheet `Users` sesuai permintaan pengelola, agar Pembina dapat membantu anggota yang lupa password.
  Konsekuensinya: **batasi akses Spreadsheet hanya untuk Pembina/Admin**, jangan bagikan tautan spreadsheet ke anggota,
  dan minta anggota tidak memakai ulang password pribadi mereka di aplikasi ini.
  Bila kelak ingin beralih ke hash, ganti perbandingan pada `gsLogin` di `02_Auth.gs` dengan
  `Utilities.computeDigest(SHA_256, pass + salt)` dan migrasikan nilai lama saat login pertama.

---

## Pemecahan Masalah

| Gejala | Penyebab & Solusi |
|---|---|
| `SyntaxError: Identifier 'X' has already been declared` | **File lama masih ada di proyek.** Lihat [penjelasan lengkap](#-syntaxerror-identifier-has-already-been-declared) di bawah. |
| `GAS_WEB_APP_URL belum diatur` | Tambahkan environment variable di Vercel lalu **redeploy**. |
| `Respons Apps Script tidak valid` | Deployment belum diatur *Who has access: **Anyone***. Buat deployment baru. |
| Login gagal terus | Jalankan `setup()` dari editor. Pastikan `SPREADSHEET_ID` benar. |
| `Folder SKK utama tidak dapat diakses` | Periksa `SKK_BASE_FOLDER_ID` dan pastikan akun deploy punya akses. |
| Foto ditolak (>200 KB) | Sudah otomatis dikompres; jika tetap gagal, kecilkan resolusi kamera. |
| GPS tidak akurat / titik melompat | Buka di ruang terbuka, aktifkan *High accuracy*. Titik dengan akurasi > 35 m dibuang otomatis. |
| Perubahan UI tidak muncul di `/exec` | Jalankan `npm run build:gas`, salin ulang `Index.html`, lalu buat **deployment baru** (bukan sekadar simpan). |
| PWA tidak bisa dipasang | Wajib HTTPS + `manifest.webmanifest` + service worker terdaftar. |
| Data lama tetap muncul | Cache klien 2 menit; tarik-segarkan halaman atau tekan Keluar lalu Masuk. |

### ❗ `SyntaxError: Identifier ... has already been declared`

Contoh pesan:
```
SyntaxError: Identifier 'APP_VERSION' has already been declared
(anonim) @ 00_Config.gs:1
```

**Penyebab.** Apps Script menggabungkan **seluruh** file `.gs` menjadi satu global scope
sebelum menjalankan apa pun. Bila file lama (`Code.gs` versi 2.9) masih berada di proyek
yang sama dengan modul baru, kedua-duanya mendeklarasikan `APP_VERSION`, `SPREADSHEET_ID`,
`doGet`, `setup`, dan **110 identifier lain** — sehingga proyek gagal di-parse.

Karena ini kegagalan saat parsing (bukan saat eksekusi), penunjuk barisnya menjadi
`00_Config.gs:1` walaupun deklarasi sebenarnya ada di baris 10. Jangan tertipu:
masalahnya bukan pada baris 1.

**Solusi.** Hapus file lama dari editor Apps Script:

1. Panel **Files** (sebelah kiri) → cari **`Code.gs`** (atau `code`, `Kode`).
2. Klik **⋮** di samping namanya → **Delete file** → konfirmasi.
3. Ulangi untuk setiap file `.gs` yang **bukan** salah satu dari 8 modul baru.

Isi proyek yang benar — persis ini, tidak lebih:

| Tipe | Nama file |
|---|---|
| Script | `00_Config` · `01_Core` · `02_Auth` · `03_Activity` · `04_SKK_SKU` · `05_Regu_Gamifikasi` · `06_Admin_Report` · `07_Router` |
| HTML | `Index` |
| JSON | `appsscript.json` |

> ⚠️ **Mengganti nama file lama tidak cukup.** `Code_lama.gs` atau `Backup.gs` tetap
> ikut dimuat dan tetap bentrok. File lama harus benar-benar **dihapus** dari proyek.
> Simpan salinannya di komputer, atau di proyek Apps Script yang terpisah.

**Mencegah di kemudian hari.** Repo ini menyertakan pemeriksa otomatis:

```bash
npm run check:globals                          # cek 8 modul saja
node scripts/check-globals.mjs /path/Code.gs   # cek konflik dengan file lama
```

Contoh keluaran ketika ada konflik:
```
❌ 110 identifier bentrok — file lama TIDAK boleh berada di proyek yang sama:
   APP_VERSION          Code.gs:356  ⟷ 00_Config.gs:5
   SPREADSHEET_ID       Code.gs:20   ⟷ 00_Config.gs:22
   doGet                Code.gs:184  ⟷ 07_Router.gs:4
   ...
```

---

## Kontribusi

1. Fork → buat branch: `git checkout -b fitur/nama-fitur`
2. Ubah UI di `index.html` / `css/` / `js/`, lalu `npm run build:gas`
3. Commit dengan gaya *conventional commits*: `feat: tambah rekap bulanan regu`
4. Buka Pull Request dengan penjelasan dan tangkapan layar bila mengubah tampilan.

Lihat [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).

---

## Lisensi

[MIT](LICENSE) — bebas digunakan dan dimodifikasi oleh gugus depan mana pun.
Bila bermanfaat, cantumkan atribusi ke proyek ini. **Salam Pramuka!** 🇮🇩
