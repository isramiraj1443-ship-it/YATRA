# Panduan Kontribusi YATRA

Terima kasih telah membantu mengembangkan YATRA untuk gerakan Pramuka. 🇮🇩

## Prinsip Proyek

1. **Sederhana dan gratis** — hanya mengandalkan Google Workspace dan hosting statis.
2. **Bahasa Indonesia** — seluruh teks antarmuka, pesan kesalahan, dan komentar kode.
3. **Mobile-first** — mayoritas pengguna adalah penggalang dengan ponsel kelas menengah.
4. **Tanpa dependensi berat** — grafik, kompresi gambar, dan parser GPX dibuat sendiri.
   Satu-satunya pustaka eksternal adalah Leaflet untuk peta.
5. **Hemat kuota** — perhatikan batas eksekusi Apps Script dan penyimpanan Drive.

## Alur Kerja

```bash
git clone https://github.com/<akun>/YATRA.git
cd YATRA
npm install
npm run dev        # server statis di http://localhost:3000
```

Untuk menguji dengan backend nyata, buat `.env.local` berisi `GAS_WEB_APP_URL`
lalu jalankan `npx vercel dev`.

### Aturan penting

> **Jangan pernah mengedit `apps-script/Index.html` secara manual.**
> Berkas itu dihasilkan otomatis oleh `scripts/build-gas.mjs` dari `index.html`, `css/app.css`, dan `js/*.js` di root.
> Setelah mengubah UI, jalankan:
> ```bash
> npm run build:gas
> ```
> lalu commit hasilnya. CI akan menolak PR yang lupa langkah ini.

### Menambah fungsi API baru

Ada **tiga** tempat yang harus disinkronkan:

1. Tulis fungsinya di modul `.gs` yang sesuai, dengan `token` sebagai parameter pertama.
2. Daftarkan namanya di `API_FUNCTIONS` pada `apps-script/07_Router.gs`.
3. Daftarkan namanya di `ALLOWED` pada `api/[fn].js`.

Fungsi yang tidak ada di ketiganya akan ditolak.

### Menambah kolom sheet baru

1. Tambahkan nama kolom di akhir array header pada `00_Config.gs`.
2. Jangan menyisipkan di tengah — indeks kolom dihitung otomatis dari urutan.
3. `getSheet_()` akan memperbaiki header sheet lama secara otomatis.

### Menambah lencana baru

Tambahkan entri pada `BADGES` di `00_Config.gs`, lalu tangani tipe aturannya
di `evaluateBadges_()` pada `05_Regu_Gamifikasi.gs`.

## Gaya Kode

- Indentasi 2 spasi.
- Fungsi privat Apps Script diakhiri garis bawah: `namaFungsi_()`.
- Fungsi yang dipanggil klien diawali `gs`: `gsNamaFungsi()`.
- Pesan kesalahan harus dapat dipahami penggalang, bukan istilah teknis.
- Komentar menjelaskan **mengapa**, bukan mengulang **apa**.

## Format Commit

```
feat: tambah rekap kehadiran latihan mingguan
fix: perbaiki perhitungan streak saat lintas bulan
docs: perjelas langkah deploy Vercel
style: rapikan jarak kartu statistik
refactor: pisahkan logika badge ke modul sendiri
```

## Sebelum Membuka PR

- [ ] `node --check` lolos untuk semua berkas yang diubah
- [ ] `npm run build:gas` sudah dijalankan dan hasilnya di-commit
- [ ] Diuji di ponsel (atau emulasi perangkat di DevTools)
- [ ] Tidak ada ID Spreadsheet/Drive atau URL `/exec` yang ikut ter-commit
- [ ] Menyertakan tangkapan layar bila mengubah tampilan

## Melaporkan Kerentanan Keamanan

Jangan membuka issue publik. Kirim surel ke pemelihara repositori dengan
subjek `[KEAMANAN] YATRA`, sertakan langkah reproduksi dan dampaknya.
