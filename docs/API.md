# Referensi API YATRA v3

## Konvensi

Semua pemanggilan menggunakan `POST` dengan `Content-Type: application/json`.

**Melalui proxy PWA (disarankan):**
```
POST https://yatra-anda.vercel.app/api/<namaFungsi>
Body: { "token": "<token sesi>", "args": [arg1, arg2, ...] }
```

**Langsung ke Apps Script:**
```
POST https://script.google.com/macros/s/.../exec
Body: { "fn": "<namaFungsi>", "token": "<token>", "args": [...] }
```

**Bentuk respons:**
```json
{ "ok": true,  ...data... }
{ "ok": false, "error": "Pesan kesalahan dalam Bahasa Indonesia." }
```

Semua fungsi (kecuali `gsLogin` dan `gsPing`) memerlukan token sesi yang valid.
Token diperoleh dari `gsLogin` dan berlaku 7 hari.

---

## Autentikasi

### `gsPing()`
Cek kesehatan server. Tidak butuh token.
```json
{ "ok": true, "app": "YATRA", "version": "3.0.0", "time": "2026-09-08 09:12", "tz": "Asia/Jakarta" }
```

### `gsLogin(username, password)`
```json
// args: ["dgw20261", "12345678"]
{
  "ok": true,
  "token": "b3f1...",
  "user": { "username": "dgw20261", "name": "...", "regu": "Elang", "role": "user", ... },
  "profileComplete": true
}
```
Gagal 8× dalam 15 menit → akun dikunci sementara.

### `gsLogout()` · `gsCurrentUser()`

### `gsInitData()`
Data awal aplikasi: profil, daftar jenis kegiatan, regu, katalog lencana, pengumuman aktif, identitas gugus depan.

---

## Profil

| Fungsi | Argumen | Keterangan |
|---|---|---|
| `gsSaveProfile` | `profile` | `{name, nickname, golongan, gender, sku, regu, pasukan, phone}` |
| `gsSaveProfilePhoto` | `dataUri` | JPEG base64, maks 200 KB |
| `gsSetTarget` | `targetKm` | Target jarak bulanan |
| `gsChangePassword` | `oldPass, newPass` | Password baru minimal 6 karakter |
| `gsMyApiKey` | — | Kunci untuk integrasi pihak ketiga |
| `gsRegenerateApiKey` | — | Buat kunci baru (kunci lama batal) |

---

## Perjalanan

### `gsAddActivity(payload)`
```json
{
  "type": "gerak-jalan",
  "date": "2026-09-08",
  "title": "Gerak jalan pagi",
  "location": "Alun-alun Surakarta",
  "distanceKm": 10.4,
  "durationMin": 96,
  "elevationM": 45,
  "notes": "Latihan rutin regu Elang",
  "photos": [{ "data": "data:image/jpeg;base64,...", "name": "bukti.jpg" }],
  "points": [{ "lat": -7.5655, "lng": 110.8317 }],
  "source": "gps"
}
```

Validasi server:
- `durationMin` wajib > 0 dan ≤ 1440
- `distanceKm` ≥ 0 dan ≤ 300
- `date` tidak boleh di masa depan
- Maksimal 5 foto, masing-masing ≤ 200 KB
- Perjalanan dengan jenis + tanggal + jarak + durasi identik ditolak (kirim `allowDuplicate: true` untuk memaksa)

Respons menyertakan `newBadges` bila ada lencana baru.

### Lainnya

| Fungsi | Argumen |
|---|---|
| `gsListActivities` | `{range, type, q, limit}` |
| `gsGetActivity` | `id` |
| `gsUpdateActivity` | `id, patch` |
| `gsDeleteActivity` | `id` |
| `gsGetStats` | `range` |
| `gsGenerateRouteImage` | `points[]` |
| `gsReverseGeocode` | `lat, lng` |

Nilai `range` yang didukung: `today`, `this_week`, `this_month`, `this_year`,
`last_7`, `last_30`, `last_90`, `all`.

---

## SKK Gerak Jalan

| Fungsi | Keterangan |
|---|---|
| `gsGetSkk()` | Progres semua tingkat + daftar bukti + status pengajuan |
| `gsSkkSubmit(level, notes)` | Ajukan validasi; ditolak bila syarat belum terpenuhi |
| `gsSkkMySubmissions()` | Riwayat pengajuan |

Jenis kegiatan yang dihitung untuk SKK: `gerak-jalan`, `jalan`, `hiking`, `penjelajahan`.

---

## SKU Digital

| Fungsi | Peran | Keterangan |
|---|---|---|
| `gsGetSku()` | anggota | Progres semua tingkat + status tiap butir |
| `gsSkuClaim(level, code, notes)` | anggota | Ajukan butir untuk diuji |
| `gsSkuValidate(username, level, code, status, notes)` | pembina | `status`: `lulus`/`ditolak`/`menunggu` |
| `gsAdminListSkuClaims(statusFilter)` | pembina | Antrean pengajuan |

---

## Regu & Peringkat

| Fungsi | Keterangan |
|---|---|
| `gsListRegu()` | Daftar regu |
| `gsReguLeaderboard(range)` | Peringkat regu + partisipasi |
| `gsLeaderboard(range, filter)` | Peringkat individu; `filter`: `{gender, regu}` |
| `gsLeadership(range)` | Peringkat + galeri bukti foto |
| `gsAdminSaveRegu(regu)` · `gsAdminDeleteRegu(id)` | Khusus pembina |

---

## Gamifikasi

- `gsGetBadges()` — 18 lencana beserta status perolehan.
- `gsGetLevel()` — XP, level, gelar, dan persentase menuju level berikutnya.

Rumus XP: `10/aktivitas + 5/km + 25/lencana + 15/butir SKU + 100/tingkat SKK`.
Level dihitung `floor(sqrt(XP / 250)) + 1`, maksimum 7 tingkat.

---

## Dashboard & Laporan

| Fungsi | Keterangan |
|---|---|
| `gsDashboard(range)` | Statistik, tren 8 pekan, level, lencana, target, pengumuman, 5 perjalanan terakhir |
| `gsGetAchievement()` | Data untuk kartu pencapaian |
| `gsSaveCard(dataUri, label)` | Simpan kartu JPG ke Drive |
| `gsSaveCardPdf(dataUri, label, w, h)` | Simpan kartu sebagai PDF |
| `gsExportReport(format, range)` | `pdf` / `xlsx` per anggota |
| `gsAdminExportAll(format, range)` | Rekap seluruh anggota (pembina) |

---

## Administrasi

| Fungsi | Peran |
|---|---|
| `gsAdminOverview(range)` | pembina |
| `gsAdminListUsers(opts)` | pembina |
| `gsAdminAddUser(user)` | pembina |
| `gsAdminBulkAddUsers(csv, defaultPass)` | pembina |
| `gsAdminUpdateUser(username, patch)` | pembina |
| `gsAdminResetPass(username, newPass)` | pembina |
| `gsAdminDeleteUser(username)` | **admin saja** |
| `gsAdminGetSkkConfig()` / `gsAdminSetSkkConfig(list)` | pembina |
| `gsAdminListSkkSubmissions(status)` / `gsAdminValidateSkk(id, status, feedback)` | pembina |
| `gsAdminVerifyActivity(id, verified)` | pembina |
| `gsAdminSaveAnnouncement(a)` / `gsAdminDeleteAnnouncement(id)` | pembina |

---

## Integrasi Pihak Ketiga

Tanpa sesi, memakai API key anggota (`gsMyApiKey`). **Hanya ke URL Apps Script langsung**:

```bash
curl -X POST "$GAS_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "fn": "importActivity",
    "apiKey": "yatra_a1b2c3d4e5f6g7h8i9j0",
    "payload": {
      "type": "lari",
      "date": "2026-09-08",
      "distanceKm": 5.2,
      "durationMin": 32,
      "location": "Stadion Manahan"
    }
  }'
```

Cocok untuk otomasi IFTTT/Zapier dari Strava atau Google Fit.

---

## Kode Kesalahan Umum

| Pesan | Arti |
|---|---|
| `Sesi tidak valid. Silakan masuk kembali.` | Token salah atau sudah dihapus |
| `Sesi kedaluwarsa.` | Lebih dari 7 hari |
| `Akses ditolak: khusus admin/pembina.` | Peran tidak mencukupi |
| `Lengkapi data diri…` | Profil belum lengkap |
| `Foto terlalu besar (>200 KB).` | Kompresi klien gagal |
| `Terlalu banyak percobaan gagal.` | Rate limit login |
| `Perjalanan serupa sudah tercatat…` | Terdeteksi duplikat |
