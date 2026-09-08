# Panduan Pemasangan Lengkap YATRA v3

Panduan ini ditujukan untuk Pembina atau pengelola teknis gugus depan yang
memasang YATRA untuk pertama kali. Perkiraan waktu: **30–45 menit**.

---

## 1. Persiapan Google Drive

Masuk ke akun Google gugus depan (disarankan akun khusus, bukan pribadi).

### 1.1 Spreadsheet
1. Buka [sheets.new](https://sheets.new) → beri nama `YATRA_Database`.
2. Salin **Spreadsheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/【INI_SPREADSHEET_ID】/edit
   ```
3. **Penting:** jangan bagikan spreadsheet ini ke anggota — berisi password.

### 1.2 Folder induk
1. Di Google Drive buat folder `YATRA`.
2. Buka foldernya, salin **Folder ID** dari URL:
   ```
   https://drive.google.com/drive/folders/【INI_FOLDER_ID】
   ```

### 1.3 Folder SKK
1. Buat folder `SKK Gerak Jalan` (boleh di dalam folder `YATRA`).
2. Salin **Folder ID**-nya.

---

## 2. Memasang Backend Apps Script

### 2.1 Buat proyek
1. Buka [script.google.com](https://script.google.com) → **New project**.
2. Ganti nama proyek menjadi `YATRA v3`.

### 2.2 Salin berkas kode

> 🚨 **WAJIB: hapus dulu semua berkas `.gs` yang sudah ada.**
> Apps Script menggabungkan seluruh berkas `.gs` ke dalam satu global scope.
> Bila `Code.gs` bawaan atau versi YATRA lama masih tertinggal, proyek gagal dimuat dengan pesan
> `SyntaxError: Identifier 'APP_VERSION' has already been declared`.
> Mengganti nama berkas lama **tidak** menolong — harus dihapus (Files → ⋮ → Delete file).

Hapus `Code.gs` bawaan, lalu buat berkas baru satu per satu
(**File → New → Script file**) dengan nama **tepat** seperti berikut:

| Urutan | Nama berkas di editor | Sumber di repo |
|---|---|---|
| 1 | `00_Config` | `apps-script/00_Config.gs` |
| 2 | `01_Core` | `apps-script/01_Core.gs` |
| 3 | `02_Auth` | `apps-script/02_Auth.gs` |
| 4 | `03_Activity` | `apps-script/03_Activity.gs` |
| 5 | `04_SKK_SKU` | `apps-script/04_SKK_SKU.gs` |
| 6 | `05_Regu_Gamifikasi` | `apps-script/05_Regu_Gamifikasi.gs` |
| 7 | `06_Admin_Report` | `apps-script/06_Admin_Report.gs` |
| 8 | `07_Router` | `apps-script/07_Router.gs` |

Lalu **File → New → HTML file** dengan nama `Index`, isi dari `apps-script/Index.html`.

### 2.3 Manifest
1. **⚙ Project Settings** → centang **Show "appsscript.json" manifest file**.
2. Buka `appsscript.json` di editor → ganti isinya dengan `apps-script/appsscript.json`.

### 2.4 Script Properties
**⚙ Project Settings → Script Properties → Add script property**:

| Properti | Nilai | Wajib |
|---|---|---|
| `SPREADSHEET_ID` | dari langkah 1.1 | ✅ |
| `ROOT_FOLDER_ID` | dari langkah 1.2 | ✅ |
| `SKK_BASE_FOLDER_ID` | dari langkah 1.3 | ✅ |
| `GUDEP_NAME` | nama gugus depan | opsional |
| `PANGKALAN` | nama sekolah/pangkalan | opsional |
| `LOGO_URL` | URL PNG logo | opsional |

> ✅ **Periksa sebelum lanjut.** Panel Files harus berisi **tepat** 10 entri:
> 8 berkas script di atas, `Index.html`, dan `appsscript.json`. Tidak ada `Code.gs`.

### 2.5 Jalankan setup
1. Pilih fungsi **`setup`** di dropdown atas → tekan **Run**.
2. Akan muncul permintaan izin → **Review permissions** → pilih akun →
   **Advanced** → **Go to YATRA v3 (unsafe)** → **Allow**.
   (Peringatan "unsafe" wajar karena skrip belum diverifikasi Google, dan skrip ini milik Anda sendiri.)
3. Lihat **Execution log** — harus muncul `✅ Setup YATRA 3.0.0 selesai.`
4. Periksa spreadsheet: sudah terisi 11 sheet dan 51 akun.

### 2.6 Pasang trigger
Pilih fungsi **`installTriggers`** → **Run**. Ini menjadwalkan pemeliharaan harian pukul 02.00.

### 2.7 Deploy Web App
1. **Deploy → New deployment**.
2. Klik ikon roda gigi → **Web app**.
3. Isi:
   - Description: `YATRA v3`
   - Execute as: **Me (email Anda)**
   - Who has access: **Anyone**
4. **Deploy** → salin **Web app URL** (berakhiran `/exec`). Simpan baik-baik.

> ⚠️ Setiap kali kode diubah, Anda **harus** membuat *New deployment*
> (atau *Manage deployments → Edit → Version: New version*), bukan sekadar Ctrl+S.

### 2.8 Uji backend
Buka URL `/exec` di browser — seharusnya muncul halaman login YATRA.
Coba masuk dengan `admin` / `admin123`.

---

## 3. Memasang Frontend PWA (opsional tapi disarankan)

Manfaat: bisa dipasang di layar utama ponsel, mendukung mode offline, dan lebih cepat.

### 3.1 Siapkan repositori
```bash
git clone https://github.com/<akun-anda>/YATRA.git
cd YATRA
```

### 3.2 Deploy ke Vercel
1. Buka [vercel.com](https://vercel.com) → login dengan GitHub.
2. **Add New → Project** → pilih repositori YATRA.
3. Konfigurasi:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: **kosongkan**
   - Output Directory: **`web`**
4. **Environment Variables** → tambahkan:

   | Name | Value |
   |---|---|
   | `GAS_WEB_APP_URL` | URL `/exec` dari langkah 2.7 |

5. **Deploy** → tunggu selesai → buka URL hasil deploy.

### 3.3 Verifikasi
```bash
curl -X POST https://yatra-anda.vercel.app/api/gsPing \
     -H "Content-Type: application/json" -d '{"args":[]}'
```
Hasil yang benar:
```json
{"ok":true,"app":"YATRA","version":"3.0.0","time":"...","tz":"Asia/Jakarta"}
```

### 3.4 Pasang di ponsel
- **Android/Chrome:** menu ⋮ → *Tambahkan ke layar utama*
- **iOS/Safari:** tombol Bagikan → *Tambahkan ke Layar Utama*

---

## 4. Konfigurasi Awal Sistem

Masuk sebagai `admin` lalu:

1. **Ganti password admin** — Profil → Keamanan.
2. **Sesuaikan regu** — Panel Admin (atau langsung edit sheet `Regu`).
3. **Atur syarat SKK** — Panel Admin → *Syarat SKK*.
   Sesuaikan dengan ketentuan Kwartir/Pembina setempat.
4. **Sesuaikan butir SKU** — edit sheet `SKU_Items` bila ingin menambah butir.
5. **Daftarkan anggota** — Panel Admin → *Anggota* → impor CSV massal.
6. **Terbitkan pengumuman** perkenalan sistem.

---

## 5. Membagikan ke Anggota

Kirim ke setiap anggota:
```
Aplikasi YATRA — Catatan Perjalanan Penggalang
Tautan   : https://yatra-anda.vercel.app
UserID   : DGW20261
Password : 12345678  (segera ganti di menu Profil)

Cara pasang di HP: buka tautan → menu browser → "Tambahkan ke layar utama".
```

---

## 6. Pemeliharaan

| Berkala | Tindakan |
|---|---|
| Mingguan | Tinjau antrean validasi SKK & SKU di Panel Admin. |
| Bulanan | Ekspor rekap Excel untuk arsip gugus depan. |
| Semesteran | Backup Spreadsheet (File → Buat salinan). |
| Saat update kode | `npm run build:gas` → salin ulang → **New deployment**. |

---

## 7. Batasan Kuota Google

Akun Google gratis memiliki kuota harian Apps Script:

| Sumber daya | Kuota gratis |
|---|---|
| Waktu eksekusi skrip | 90 menit/hari |
| Panggilan UrlFetch | 20.000/hari |
| Pembuatan berkas Drive | 250/hari |
| Email | 100/hari |

Untuk ~50 anggota aktif, kuota ini lebih dari cukup.
Bila gugus depan memiliki Google Workspace for Education, kuotanya jauh lebih besar.
