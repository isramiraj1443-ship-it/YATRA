/**
 * ============================================================================
 *  YATRA v3.0.0 — Pencatat Perjalanan Pramuka Penggalang
 *  BERKAS TUNGGAL (hasil gabungan otomatis dari 8 modul)
 * ============================================================================
 *
 *  CARA PAKAI
 *  ----------
 *  1. Buka proyek Apps Script Anda.
 *  2. Buka berkas Code.gs, tekan Ctrl+A, lalu tempel SELURUH isi berkas ini.
 *  3. Pastikan TIDAK ADA berkas .gs lain di proyek. Proyek yang benar hanya
 *     berisi: Code.gs, Index.html, appsscript.json.
 *  4. Jalankan fungsi setup() sekali, lalu Deploy > New deployment > Web app.
 *
 *  JANGAN EDIT BERKAS INI LANGSUNG.
 *  Berkas ini dibangkitkan oleh: npm run build:single
 *  Sunting sumbernya di apps-script/*.gs, lalu jalankan ulang perintah itu.
 *
 *  Dibangkitkan: 2026-09-08T05:53:06.766Z
 * ============================================================================
 */

/* ==========================================================================
 * BAGIAN: 00_Config.gs
 * ========================================================================== */
/**
 * YATRA v3 — 00_Config.gs
 * Konstanta global, skema sheet, dan katalog master data.
 * Semua ID Drive/Spreadsheet dibaca dari Script Properties bila tersedia,
 * sehingga repo publik tidak perlu menyimpan ID milik gugus depan lain.
 */

/* ---------------------------------------------------------------- VERSI */
const APP_NAME    = 'YATRA';
const APP_VERSION = '3.0.0';
const APP_TAGLINE = 'Catatan Perjalanan Pramuka Penggalang';

/* ================================================== ID TETAP (HARD-CODED)
 * Nilai di bawah dipakai langsung — sama seperti Code.gs versi Anda.
 * Bila suatu saat ingin memindahkannya ke Script Properties (mis. agar repo
 * publik tidak memuat ID milik gugus depan), cukup isi properti dengan nama
 * yang sama; nilai properti akan menimpa nilai di bawah ini secara otomatis.
 * ======================================================================== */
const SPREADSHEET_ID       = '18gV5HKxVhPEMA7tcD9VmASJmM2FGylb9QTX83tXo5QU';
const SKK_BASE_FOLDER_ID   = '18xHtG_s61LhEUVR5rAdoRnICU0oUJGsh';
/** Folder induk tempat SEMUA folder YATRA (bukti, rute, laporan, kartu, profil, aset) dibuat. */
const YATRA_ROOT_FOLDER_ID = '11oKxXakCkW4KwlEnrwpuHEZ9HxlHwfkM';
/** Logo resmi YATRA (di-pin ke commit agar tautan tidak pernah berubah isi). */
const LOGO_URL      = 'https://raw.githubusercontent.com/isramiraj1443-ship-it/YATRA/1bece3303df65f85aad47888af7cfdf314825ead/icons/icon-512.png';
const LOGO_URL_SM   = 'https://raw.githubusercontent.com/isramiraj1443-ship-it/YATRA/1bece3303df65f85aad47888af7cfdf314825ead/icons/icon-192.png';
/** Cadangan bila commit di atas suatu saat dihapus. */
const LOGO_URL_FALLBACK = 'https://raw.githubusercontent.com/isramiraj1443-ship-it/YATRA/main/icons/icon-512.png';

const GUDEP_NAME = 'Gugus Depan';
const PANGKALAN  = 'Dewan Penggalang';

/** Baca Script Property bila ada; bila tidak, pakai nilai tetap di atas. */
function prop_(key) {
  try {
    const v = PropertiesService.getScriptProperties().getProperty(key);
    if (v) return String(v).trim();
  } catch (e) { /* abaikan bila properti tidak dapat dibaca */ }
  const FALLBACK = {
    SPREADSHEET_ID: SPREADSHEET_ID,
    SKK_BASE_FOLDER_ID: SKK_BASE_FOLDER_ID,
    ROOT_FOLDER_ID: YATRA_ROOT_FOLDER_ID,
    LOGO_URL: LOGO_URL,
    GUDEP_NAME: GUDEP_NAME,
    PANGKALAN: PANGKALAN
  };
  return FALLBACK[key] || '';
}
function SPREADSHEET_ID_()     { return prop_('SPREADSHEET_ID'); }
function SKK_BASE_FOLDER_ID_() { return prop_('SKK_BASE_FOLDER_ID'); }
function ROOT_FOLDER_ID_()     { return prop_('ROOT_FOLDER_ID'); }
function LOGO_URL_()           { return prop_('LOGO_URL'); }

/* --------------------------------------------------------- NAMA FOLDER */
const PHOTO_FOLDER_NAME  = 'YATRA_Bukti_Rute';
const ROUTE_FOLDER_NAME  = 'YATRA_Gambar_Rute';
const REPORT_FOLDER_NAME = 'YATRA_Laporan';
const CARD_FOLDER_NAME   = 'YATRA_Kartu_Pencapaian';
const PROFILE_DIR_NAME   = 'YATRA_Profil';
const ASSET_FOLDER_NAME  = 'YATRA_Aset';

/** Alias objek agar mudah diiterasi saat membuat folder. */
const FOLDER = {
  PHOTOS  : PHOTO_FOLDER_NAME,
  ROUTES  : ROUTE_FOLDER_NAME,
  REPORTS : REPORT_FOLDER_NAME,
  CARDS   : CARD_FOLDER_NAME,
  PROFILES: PROFILE_DIR_NAME,
  ASSETS  : ASSET_FOLDER_NAME
};

/* -------------------------------------------------------- KEBIJAKAN AUTH
 * Catatan keamanan: atas permintaan pengelola, password disimpan APA ADANYA
 * (plaintext) agar pembina mudah membantu anggota yang lupa password.
 * Seluruh endpoint DIAGNOSTIK yang dulu membocorkan password sudah dihapus;
 * password hanya bisa dilihat lewat Spreadsheet oleh pemilik/admin.
 */
const PASSWORD_PLAINTEXT  = true;
const ADMIN_DEFAULT_PASS  = 'admin123';
const FORCE_ADMIN_DEFAULT = false;   // v3: tidak lagi memaksa reset tiap request
const SESSION_DAYS        = 7;
const LOGIN_MAX_ATTEMPT   = 8;       // percobaan gagal per 15 menit per username
const LOGIN_WINDOW_MIN    = 15;

/* --------------------------------------------------- SEED AKUN PENGGALANG */
const PGL_BATCH_ENABLED  = true;
const PGL_BATCH_SUFFIX   = 'DGW2026';
const PGL_BATCH_COUNT    = 50;
const PGL_BATCH_PASS     = '12345678';
const PGL_BATCH_GOLONGAN = 'Penggalang';
const PGL_BATCH_MIX      = true;

/* ------------------------------------------------------- JENIS AKTIVITAS */
const ACTIVITY_TYPES = [
  { key:'gerak-jalan', label:'Gerak Jalan',    icon:'🥾', pace:true,  met:4.3 },
  { key:'lari',        label:'Lari',           icon:'🏃', pace:true,  met:9.8 },
  { key:'jalan',       label:'Jalan Kaki',     icon:'🚶', pace:true,  met:3.5 },
  { key:'hiking',      label:'Hiking',         icon:'⛰️', pace:true,  met:6.0 },
  { key:'sepeda',      label:'Bersepeda',      icon:'🚴', pace:false, met:7.5 },
  { key:'renang',      label:'Renang',         icon:'🏊', pace:false, met:7.0 },
  { key:'gym',         label:'Gym / Olahraga', icon:'💪', pace:false, met:5.0 },
  { key:'olahraga',    label:'Olahraga Lain',  icon:'⚽', pace:false, met:5.5 },
  { key:'lombad',      label:'Lomba / Event',  icon:'🏅', pace:false, met:6.5 },
  { key:'penjelajahan',label:'Penjelajahan',   icon:'🧭', pace:true,  met:5.5 },
  { key:'perkemahan',  label:'Perkemahan',     icon:'⛺', pace:false, met:4.0 },
  { key:'bakti',       label:'Bakti Masyarakat',icon:'🤝',pace:false, met:3.8 }
];

/* --------------------------------------------------------- SKU & SKK */
const SKU_LEVELS = ['ramu', 'rakit', 'terap'];
const SKU_LABELS = { ramu:'Penggalang Ramu', rakit:'Penggalang Rakit', terap:'Penggalang Terap' };

const SKK_QUALIFYING_TYPES = ['gerak-jalan', 'jalan', 'hiking', 'penjelajahan'];
const SKK_LEVELS        = ['purwa', 'madya', 'utama'];
const SKK_LEVEL_LABELS  = { purwa:'Purwa', madya:'Madya', utama:'Utama' };
const SKK_LEVEL_FOLDERS = { purwa:'SKK Purwa', madya:'SKK Madya', utama:'SKK Utama' };

const SUB_STATUS_PENDING  = 'menunggu';
const SUB_STATUS_PASSED   = 'lulus';
const SUB_STATUS_REJECTED = 'ditolak';

/** Kriteria SKK Gerak Jalan bawaan (dapat diubah admin lewat menu Konfigurasi SKK). */
const SKK_DEFAULT_CONFIG = [
  // golongan, gender, level, jarak(km), min perjalanan, aktif, catatan
  ['Penggalang','putra','purwa', 10, 2, 'TRUE','Menempuh 10 km sebanyak 2 kali'],
  ['Penggalang','putra','madya', 15, 2, 'TRUE','Menempuh 15 km sebanyak 2 kali'],
  ['Penggalang','putra','utama', 25, 2, 'TRUE','Menempuh 25 km sebanyak 2 kali'],
  ['Penggalang','putri','purwa',  8, 2, 'TRUE','Menempuh 8 km sebanyak 2 kali'],
  ['Penggalang','putri','madya', 12, 2, 'TRUE','Menempuh 12 km sebanyak 2 kali'],
  ['Penggalang','putri','utama', 15, 2, 'TRUE','Menempuh 15 km sebanyak 2 kali']
];

/* ------------------------------------------- BUTIR SKU (checklist digital)
 * Ringkasan butir SKU Penggalang yang relevan dengan pencatatan perjalanan.
 * Admin/Pembina dapat menambah butir lewat sheet SKU_Items.
 */
const SKU_DEFAULT_ITEMS = [
  ['ramu','R-01','Rajin dan giat mengikuti latihan Pasukan Penggalang','Kehadiran'],
  ['ramu','R-02','Dapat menjelaskan Dasa Darma dan Tri Satya','Pengetahuan'],
  ['ramu','R-03','Melakukan olahraga/gerak jalan secara teratur','Kesehatan'],
  ['ramu','R-04','Dapat menggunakan kompas dan membuat peta pita','Keterampilan'],
  ['ramu','R-05','Menempuh perjalanan minimal 5 km','Perjalanan'],
  ['rakit','K-01','Menjadi contoh baik di Pasukan','Kepemimpinan'],
  ['rakit','K-02','Dapat memimpin regu dalam penjelajahan','Kepemimpinan'],
  ['rakit','K-03','Menempuh perjalanan minimal 10 km','Perjalanan'],
  ['rakit','K-04','Dapat membuat laporan perjalanan lengkap','Keterampilan'],
  ['terap','T-01','Dapat merencanakan dan memimpin kegiatan perkemahan','Kepemimpinan'],
  ['terap','T-02','Menempuh perjalanan minimal 20 km','Perjalanan'],
  ['terap','T-03','Melaksanakan kegiatan bakti masyarakat','Bakti'],
  ['terap','T-04','Membina anggota Penggalang Ramu/Rakit','Kepemimpinan']
];

/* ---------------------------------------------------- BADGE / GAMIFIKASI */
const BADGES = [
  { key:'langkah-pertama', name:'Langkah Pertama', icon:'👟', desc:'Mencatat perjalanan pertama',            rule:{ type:'count',    min:1 } },
  { key:'rutin-10',        name:'Rajin Berlatih',  icon:'📅', desc:'10 perjalanan tercatat',                 rule:{ type:'count',    min:10 } },
  { key:'rutin-50',        name:'Penjelajah Tekun',icon:'🎖️', desc:'50 perjalanan tercatat',                rule:{ type:'count',    min:50 } },
  { key:'jarak-25',        name:'25 Kilometer',    icon:'🥉', desc:'Total jarak 25 km',                      rule:{ type:'distance', min:25 } },
  { key:'jarak-100',       name:'Seratus Km',      icon:'🥈', desc:'Total jarak 100 km',                     rule:{ type:'distance', min:100 } },
  { key:'jarak-250',       name:'Pengembara',      icon:'🥇', desc:'Total jarak 250 km',                     rule:{ type:'distance', min:250 } },
  { key:'jarak-500',       name:'Sang Penjelajah', icon:'🏆', desc:'Total jarak 500 km',                     rule:{ type:'distance', min:500 } },
  { key:'streak-3',        name:'Tiga Hari Beruntun',icon:'🔥',desc:'Aktif 3 hari berturut-turut',          rule:{ type:'streak',   min:3 } },
  { key:'streak-7',        name:'Sepekan Penuh',   icon:'⚡', desc:'Aktif 7 hari berturut-turut',            rule:{ type:'streak',   min:7 } },
  { key:'streak-30',       name:'Sebulan Konsisten',icon:'💎',desc:'Aktif 30 hari berturut-turut',          rule:{ type:'streak',   min:30 } },
  { key:'long-10',         name:'Gerak Jalan 10K', icon:'🥾', desc:'Satu perjalanan ≥ 10 km',                rule:{ type:'single',   min:10 } },
  { key:'long-25',         name:'Perjalanan 25K',  icon:'🧭', desc:'Satu perjalanan ≥ 25 km',                rule:{ type:'single',   min:25 } },
  { key:'elev-1000',       name:'Pendaki',         icon:'⛰️', desc:'Total elevasi 1.000 m',                 rule:{ type:'elevation',min:1000 } },
  { key:'skk-purwa',       name:'SKK Purwa',       icon:'🎗️', desc:'SKK Gerak Jalan Purwa tervalidasi',     rule:{ type:'skk', level:'purwa' } },
  { key:'skk-madya',       name:'SKK Madya',       icon:'🏵️', desc:'SKK Gerak Jalan Madya tervalidasi',     rule:{ type:'skk', level:'madya' } },
  { key:'skk-utama',       name:'SKK Utama',       icon:'👑', desc:'SKK Gerak Jalan Utama tervalidasi',      rule:{ type:'skk', level:'utama' } },
  { key:'tim-solid',       name:'Regu Solid',      icon:'🤝', desc:'Regu mencatat total ≥ 100 km',           rule:{ type:'regu',     min:100 } },
  { key:'bakti',           name:'Bakti Masyarakat',icon:'❤️', desc:'Mencatat kegiatan bakti masyarakat',     rule:{ type:'hasType',  key:'bakti' } }
];

/** Poin pengalaman: dipakai untuk level anggota. */
const XP = { perActivity:10, perKm:5, perBadge:25, perSkuItem:15, perSkkLevel:100 };
const LEVEL_TITLES = ['Tunas','Penjelajah Muda','Penjelajah','Penjelajah Madya','Penjelajah Utama','Perintis','Pandu Sejati'];

/* ------------------------------------------------------- SKEMA SPREADSHEET */
const USER_HEADERS = ['username','password','salt','name','golongan','gender','role','apiKey','skkLevel',
  'createdAt','nickname','targetKm','sku','profilePhotoId','regu','pasukan','phone','birthDate','active','xp','lastLogin'];

const ACT_HEADERS = ['id','username','date','type','title','distanceKm','durationMin','location','lat','lng',
  'elevationM','calories','notes','photoIds','routeMapId','routePolyline','skkLevel','createdAt','updatedAt',
  'source','verified','verifiedBy','regu'];

const SUB_HEADERS = ['id','username','level','date','status','folderId','notes','createdAt','validatedAt','validatedBy','feedback'];

const SHEET_HEADERS = {
  Users          : USER_HEADERS,
  Activities     : ACT_HEADERS,
  Sessions       : ['token','username','createdAt','expiresAt','userAgent'],
  SKK_Config     : ['golongan','gender','level','distanceKm','minTrips','enabled','note'],
  SKK_Submissions: SUB_HEADERS,
  SKU_Items      : ['level','code','title','category','enabled'],
  SKU_Progress   : ['id','username','level','code','status','date','validatedBy','validatedAt','notes'],
  Regu           : ['id','name','pasukan','gender','leader','motto','color','createdAt'],
  Badges         : ['username','badgeKey','earnedAt'],
  Announcements  : ['id','title','body','level','createdBy','createdAt','active'],
  AuditLog       : ['at','username','action','detail'],
  Config         : ['key','label','icon','pace','met']
};
const ALL_SHEET_NAMES = Object.keys(SHEET_HEADERS);

/** Indeks kolom (0-based) supaya kode tidak memakai angka ajaib. */
const U = {}; USER_HEADERS.forEach(function (h, i) { U[h] = i; });
const A = {}; ACT_HEADERS.forEach(function (h, i) { A[h] = i; });
const S_ = {}; SUB_HEADERS.forEach(function (h, i) { S_[h] = i; });

const MAX_PHOTO_BYTES = 200 * 1024;   // 200 KB per foto (dikompres di klien)


/* ==========================================================================
 * BAGIAN: 01_Core.gs
 * ========================================================================== */
/**
 * YATRA v3 — 01_Core.gs
 * Utilitas dasar: akses spreadsheet, folder Drive, format, dan setup.
 */

/* ------------------------------------------------------------ SPREADSHEET */
function getSpreadsheet_() {
  const id = SPREADSHEET_ID_();
  if (!id) throw new Error('SPREADSHEET_ID belum diatur di Script Properties.');
  return SpreadsheetApp.openById(id);
}

/** Ambil sheet + jamin header benar (self-healing). */
function getSheet_(name) {
  const ss = getSpreadsheet_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const hdr = SHEET_HEADERS[name] || [];
  if (hdr.length) {
    if (sh.getLastRow() === 0) {
      sh.appendRow(hdr);
    } else {
      const cur = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), hdr.length)).getValues()[0];
      const same = hdr.every(function (h, i) { return String(cur[i] || '') === h; });
      if (!same) sh.getRange(1, 1, 1, hdr.length).setValues([hdr]);
    }
  }
  return sh;
}

function sheetRows_(name) {
  const sh = getSheet_(name);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, SHEET_HEADERS[name].length).getValues();
}

/* ----------------------------------------------------------------- FORMAT */
function getTimeZone_() { try { return Session.getScriptTimeZone(); } catch (e) { return 'Asia/Jakarta'; } }
function todayStr_()     { return Utilities.formatDate(new Date(), getTimeZone_(), 'yyyy-MM-dd'); }
function nowStr_()       { return Utilities.formatDate(new Date(), getTimeZone_(), 'yyyy-MM-dd HH:mm'); }
function fmtDate_(d)     { return Utilities.formatDate(d, getTimeZone_(), 'yyyy-MM-dd'); }
function round2(n)       { return Math.round(Number(n) * 100) / 100; }
function round1(n)       { return Math.round(Number(n) * 10) / 10; }
function toNum(v)        { if (v === '' || v == null) return null; const n = Number(v); return isNaN(n) ? null : n; }
function parseNum(v)     { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
function uid_(n)         { return Utilities.getUuid().replace(/-/g, '').slice(0, n || 8).toUpperCase(); }
function slug_(s)        { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function str_(v)         { return String(v == null ? '' : v).trim(); }
function low_(v)         { return str_(v).toLowerCase(); }

/* -------------------------------------------------------------- RENTANG */
function inRange_(dateStr, range) {
  if (!range || range === 'all') return true;
  if (!dateStr) return false;
  const tz = getTimeZone_();
  const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  let start;
  switch (range) {
    case 'today':      start = today; break;
    case 'this_week':  { start = new Date(today); start.setDate(today.getDate() - ((today.getDay() + 6) % 7)); break; }
    case 'this_month': start = new Date(today.getFullYear(), today.getMonth(), 1); break;
    case 'this_year':  start = new Date(today.getFullYear(), 0, 1); break;
    case 'last_7':     { start = new Date(today); start.setDate(today.getDate() - 6); break; }
    case 'last_30':    { start = new Date(today); start.setDate(today.getDate() - 29); break; }
    case 'last_90':    { start = new Date(today); start.setDate(today.getDate() - 89); break; }
    default: return true;
  }
  return fmtDate_(d) >= fmtDate_(start);
}

/* ----------------------------------------------------------------- DRIVE */
function rootFolder_() {
  const id = ROOT_FOLDER_ID_();
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* jatuh ke root */ } }
  return getOrCreateInRoot_('YATRA');
}
function getOrCreateInRoot_(name) {
  const it = DriveApp.getRootFolder().getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(name);
}
function getDriveFolder_(name, parent) {
  const p = parent || rootFolder_();
  const it = p.getFoldersByName(name);
  return it.hasNext() ? it.next() : p.createFolder(name);
}
function shareAnyone_(file) {
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* Drive terbatas */ }
  return file;
}
function thumbUrl_(fid, w) { return fid ? ('https://drive.google.com/thumbnail?id=' + fid + '&sz=w' + (w || 1200)) : ''; }
function deleteDriveFiles_(ids) {
  (ids || []).forEach(function (id) {
    try { const f = DriveApp.getFilesById(id); if (f.hasNext()) f.next().setTrashed(true); } catch (e) {}
  });
}
function base64Decode_(b64) {
  const parts = String(b64).split(',');
  return Utilities.base64Decode(parts.length > 1 ? parts[1] : b64);
}
function dataUriToBlob_(dataUri, name) {
  let mime = 'image/jpeg';
  const m = String(dataUri).match(/^data:([^;]+);/);
  if (m) mime = m[1];
  return Utilities.newBlob(base64Decode_(dataUri), mime, name || 'foto.jpg');
}

/* Folder profil per anggota: YATRA_Profil/<UserID - Panggilan> */
function userFolderName_(u) { return (u.username || 'user') + ' - ' + str_(u.nickname || u.name); }
function getUserDirFolder_(u) {
  return getDriveFolder_(userFolderName_(u), getDriveFolder_(FOLDER.PROFILES));
}

/* ------------------------------------------------------------------ LOGO */
/**
 * Unduh logo sekali lalu simpan di Drive (folder YATRA_Aset).
 * Setelah tersimpan, aplikasi tidak pernah lagi bergantung pada GitHub —
 * penting agar kartu pencapaian & laporan tetap berlogo meski tautan mati.
 */
function cacheLogo_() {
  try {
    const folder = getDriveFolder_(FOLDER.ASSETS);
    const fl = folder.getFilesByName('yatra_logo.png');
    if (fl.hasNext()) return fl.next().getId();

    // Coba URL utama (di-pin ke commit), lalu cadangan di branch main.
    const candidates = [LOGO_URL_(), LOGO_URL_FALLBACK].filter(function (u) { return !!u; });
    for (let i = 0; i < candidates.length; i++) {
      try {
        const res = UrlFetchApp.fetch(candidates[i], { muteHttpExceptions: true, followRedirects: true });
        if (res.getResponseCode() !== 200) continue;
        const blob = res.getBlob().setName('yatra_logo.png');
        if (!blob.getBytes().length) continue;
        return shareAnyone_(folder.createFile(blob)).getId();
      } catch (e) { /* coba kandidat berikutnya */ }
    }
    return '';
  } catch (e) { return ''; }
}

/** Paksa unduh ulang logo (pakai bila logo di GitHub diganti). */
function refreshLogo_() {
  try {
    const fl = getDriveFolder_(FOLDER.ASSETS).getFilesByName('yatra_logo.png');
    while (fl.hasNext()) fl.next().setTrashed(true);
  } catch (e) {}
  return cacheLogo_();
}
function logoFile_() {
  try {
    const fl = getDriveFolder_(FOLDER.ASSETS).getFilesByName('yatra_logo.png');
    if (fl.hasNext()) return fl.next();
  } catch (e) {}
  return null;
}
function logoDataUri_() {
  const f = logoFile_();
  if (!f) return '';
  try { return 'data:image/png;base64,' + Utilities.base64Encode(f.getBlob().getBytes()); } catch (e) { return ''; }
}

/* ------------------------------------------------------------ AUDIT LOG */
function audit_(username, action, detail) {
  try {
    getSheet_('AuditLog').appendRow([nowStr_(), username || '-', action || '', typeof detail === 'string' ? detail : JSON.stringify(detail || {})]);
  } catch (e) {}
}

/* ================================================================== SETUP */
const SETUP_MARKER = 'YATRA_SETUP_V3';

/** Setup lengkap — jalankan sekali dari editor Apps Script. */
function setup() {
  const light = setupLight_();
  const heavy = setupHeavy_();
  Logger.log('✅ Setup YATRA %s selesai.\n%s', APP_VERSION, JSON.stringify({ light: light, heavy: heavy }, null, 2));
  return { ok: true, version: APP_VERSION, light: light, heavy: heavy };
}

/** Setup ringan — sheet + seed data. Cepat, dipanggil tiap request. */
function setupLight_() {
  ALL_SHEET_NAMES.forEach(function (n) { try { getSheet_(n).setFrozenRows(1); } catch (e) {} });
  seedConfig_();
  seedSkkConfig_();
  seedSkuItems_();
  seedRegu_();
  const admin = seedAdmin_();
  const batch = PGL_BATCH_ENABLED ? seedBatchPenggalang_() : { skipped: true };
  try { ensureBaseFolder_(); } catch (e) { /* folder SKK boleh belum ada — tidak memblokir login */ }
  return { admin: admin, batch: batch };
}

/** Setup berat — folder Drive + cache logo. */
function setupHeavy_() {
  const res = {};
  try { res.folders = ensureFolders_(); } catch (e) { res.folderError = String(e && e.message || e); }
  try { res.logo = cacheLogo_(); } catch (e) {}
  try { PropertiesService.getScriptProperties().setProperty(SETUP_MARKER, '1'); } catch (e) {}
  return res;
}

/** Pindahkan folder YATRA yang terlanjur dibuat di Drive root ke dalam folder induk,
 *  agar seluruh data terkumpul rapi di satu tempat (hindari duplikat/tercecer). */
function migrateFolders_() {
  let moved = 0;
  const parent = rootFolder_();
  Object.keys(FOLDER).forEach(function (k) {
    const name = FOLDER[k];
    try {
      const it = DriveApp.getFoldersByName(name);
      while (it.hasNext()) {
        const f = it.next();
        let inside = false;
        const pars = f.getParents();
        while (pars.hasNext()) { if (pars.next().getId() === parent.getId()) { inside = true; break; } }
        if (inside) continue;
        try { parent.addFolder(f); DriveApp.getRootFolder().removeFolder(f); moved++; } catch (e) { /* abaikan */ }
      }
    } catch (e) { /* abaikan */ }
  });
  return moved;
}

function ensureFolders_() {
  const res = { root: rootFolder_().getId() };
  res.migrated = migrateFolders_();
  Object.keys(FOLDER).forEach(function (k) { res[k.toLowerCase()] = getDriveFolder_(FOLDER[k]).getId(); });
  try {
    const base = DriveApp.getFolderById(SKK_BASE_FOLDER_ID_());
    res.skk = {};
    Object.keys(SKK_LEVEL_FOLDERS).forEach(function (lv) {
      res.skk[lv] = getDriveFolder_(SKK_LEVEL_FOLDERS[lv], base).getId();
    });
  } catch (e) { res.skkError = 'Folder SKK utama tidak dapat diakses.'; }
  res.userProfiles = ensureAllUserFolders_();
  return res;
}

/** Pastikan folder profil per-anggota ada: YATRA_Profil/<UserID - Panggilan>. */
function ensureUserFolder_(u) { return getUserDirFolder_(u); }

/** Buat folder profil untuk SEMUA anggota agar tiap orang punya tempat simpan sendiri. */
function ensureAllUserFolders_() {
  const users = getAllUsers_();
  const result = { count: users.length, created: 0, failed: 0 };
  users.forEach(function (u) {
    try { ensureUserFolder_(u); result.created++; } catch (e) { result.failed++; }
  });
  return result;
}

/** Buat folder profil untuk semua anggota (jalankan manual bila perlu). */
function bootstrapCreateUserFolders() {
  const users = getAllUsers_();
  let ok = 0, fail = 0;
  users.forEach(function (u) { try { getUserDirFolder_(u); ok++; } catch (e) { fail++; } });
  return { total: users.length, created: ok, failed: fail };
}

/** Pastikan folder SKK utama dapat diakses (tidak memblokir bila gagal). */
function ensureBaseFolder_() {
  try { return DriveApp.getFolderById(SKK_BASE_FOLDER_ID_()); }
  catch (e) { throw new Error('Folder SKK utama tidak ditemukan / tidak dapat diakses.'); }
}
function setupMarker_() {
  try { return PropertiesService.getScriptProperties().getProperty(SETUP_MARKER) === '1'; }
  catch (e) { return false; }
}
function setSetupMarker_() {
  try { PropertiesService.getScriptProperties().setProperty(SETUP_MARKER, '1'); } catch (e) {}
}

/** Fungsi publik untuk dijalankan manual dari editor: buat semua folder. */
function bootstrapCreateFolders() { return ensureFolders_(); }

function pendingSetup_() { try { setupLight_(); } catch (e) { Logger.log('setupLight gagal: ' + e); } }

/* ---------------------------------------------------------------- SEEDERS */
function seedConfig_() {
  const sh = getSheet_('Config');
  if (sh.getLastRow() > 1) return 'ada';
  const rows = ACTIVITY_TYPES.map(function (t) { return [t.key, t.label, t.icon, t.pace ? 'TRUE' : 'FALSE', t.met]; });
  sh.getRange(2, 1, rows.length, 5).setValues(rows);
  return 'dibuat';
}
function seedSkkConfig_() {
  const sh = getSheet_('SKK_Config');
  if (sh.getLastRow() > 1) return 'ada';
  sh.getRange(2, 1, SKK_DEFAULT_CONFIG.length, 7).setValues(SKK_DEFAULT_CONFIG);
  return 'dibuat';
}
function seedSkuItems_() {
  const sh = getSheet_('SKU_Items');
  if (sh.getLastRow() > 1) return 'ada';
  const rows = SKU_DEFAULT_ITEMS.map(function (r) { return r.concat(['TRUE']); });
  sh.getRange(2, 1, rows.length, 5).setValues(rows);
  return 'dibuat';
}
function seedRegu_() {
  const sh = getSheet_('Regu');
  if (sh.getLastRow() > 1) return 'ada';
  const def = [
    ['REGU-ELANG',  'Elang',  'Pasukan Putra', 'putra', '', 'Terbang Tinggi Menggapai Cita', '#e74c3c', nowStr_()],
    ['REGU-RAJAWALI','Rajawali','Pasukan Putra','putra', '', 'Tangguh dan Setia',            '#f39c12', nowStr_()],
    ['REGU-HARIMAU','Harimau','Pasukan Putra', 'putra', '', 'Berani Karena Benar',           '#27ae60', nowStr_()],
    ['REGU-MELATI', 'Melati', 'Pasukan Putri', 'putri', '', 'Harum Namanya Indah Budinya',   '#9b59b6', nowStr_()],
    ['REGU-ANGGREK','Anggrek','Pasukan Putri', 'putri', '', 'Anggun dan Mandiri',            '#e91e63', nowStr_()],
    ['REGU-MAWAR',  'Mawar',  'Pasukan Putri', 'putri', '', 'Indah dan Kuat',                '#00bcd4', nowStr_()]
  ];
  sh.getRange(2, 1, def.length, 8).setValues(def);
  return 'dibuat';
}
function seedAdmin_() {
  const sh = getSheet_('Users');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (low_(rows[i][U.username]) === 'admin') {
      const stored = str_(rows[i][U.password]);
      if (!stored || (FORCE_ADMIN_DEFAULT && stored !== ADMIN_DEFAULT_PASS)) {
        sh.getRange(i + 1, U.password + 1).setValue(ADMIN_DEFAULT_PASS);
      }
      if (!str_(rows[i][U.name]))     sh.getRange(i + 1, U.name + 1).setValue('Administrator');
      if (!str_(rows[i][U.nickname])) sh.getRange(i + 1, U.nickname + 1).setValue('Admin');
      if (!str_(rows[i][U.golongan])) sh.getRange(i + 1, U.golongan + 1).setValue('Penggalang');
      if (!str_(rows[i][U.gender]))   sh.getRange(i + 1, U.gender + 1).setValue('putra');
      if (!str_(rows[i][U.role]))     sh.getRange(i + 1, U.role + 1).setValue('admin');
      return 'ada';
    }
  }
  addUserInternal_(sh, { username:'admin', password:ADMIN_DEFAULT_PASS, name:'Administrator',
    nickname:'Admin', golongan:'Penggalang', gender:'putra', role:'admin' });
  return 'dibuat';
}
function batchGender_(n) { return PGL_BATCH_MIX ? (n % 2 === 1 ? 'putra' : 'putri') : 'putra'; }
function seedBatchPenggalang_() {
  const sh = getSheet_('Users');
  const rows = sh.getDataRange().getValues();
  const seen = {};
  for (let i = 1; i < rows.length; i++) if (rows[i][U.username]) seen[low_(rows[i][U.username])] = true;
  const regus = getReguList_();
  const putra = regus.filter(function (r) { return r.gender === 'putra'; });
  const putri = regus.filter(function (r) { return r.gender === 'putri'; });
  let added = 0, skipped = 0;
  for (let n = 1; n <= PGL_BATCH_COUNT; n++) {
    const id = PGL_BATCH_SUFFIX + n;
    if (seen[id.toLowerCase()]) { skipped++; continue; }
    const g = batchGender_(n);
    const pool = g === 'putra' ? putra : putri;
    const regu = pool.length ? pool[Math.floor((n - 1) / 2) % pool.length].name : '';
    addUserInternal_(sh, { username:id, password:PGL_BATCH_PASS, name:'Anggota ' + id, nickname:id,
      golongan:PGL_BATCH_GOLONGAN, gender:g, role:'user', regu:regu, pasukan:(g === 'putra' ? 'Pasukan Putra' : 'Pasukan Putri') });
    added++;
  }
  return { added: added, skipped: skipped, range: PGL_BATCH_SUFFIX + '1–' + PGL_BATCH_SUFFIX + PGL_BATCH_COUNT };
}


/* ==========================================================================
 * BAGIAN: 02_Auth.gs
 * ========================================================================== */
/**
 * YATRA v3 — 02_Auth.gs
 * Login, sesi, profil pengguna, dan pengelolaan akun.
 *
 * CATATAN: password disimpan plaintext sesuai kebijakan pengelola.
 * Seluruh endpoint diagnostik yang membocorkan password telah DIHAPUS di v3.
 */

/* -------------------------------------------------------------- HELPERS */
function publicUser_(row) {
  return {
    username      : str_(row[U.username]),
    name          : str_(row[U.name]),
    nickname      : str_(row[U.nickname]),
    golongan      : str_(row[U.golongan]),
    gender        : str_(row[U.gender]),
    role          : str_(row[U.role]) || 'user',
    skkLevel      : str_(row[U.skkLevel]),
    sku           : str_(row[U.sku]),
    apiKey        : str_(row[U.apiKey]),
    targetKm      : Number(row[U.targetKm]) || 0,
    profilePhotoId: str_(row[U.profilePhotoId]),
    regu          : str_(row[U.regu]),
    pasukan       : str_(row[U.pasukan]),
    phone         : str_(row[U.phone]),
    birthDate     : row[U.birthDate] instanceof Date ? fmtDate_(row[U.birthDate]) : str_(row[U.birthDate]),
    active        : str_(row[U.active]).toUpperCase() !== 'FALSE',
    xp            : Number(row[U.xp]) || 0
  };
}
function getAllUsers_() {
  return sheetRows_('Users').filter(function (r) { return r[U.username]; }).map(publicUser_);
}
function getUsersMap_() {
  const m = {};
  getAllUsers_().forEach(function (u) { m[u.username.toLowerCase()] = u; });
  return m;
}
function findUserRow_(username) {
  const sh = getSheet_('Users');
  const rows = sh.getDataRange().getValues();
  const key = low_(username);
  for (let i = 1; i < rows.length; i++) if (low_(rows[i][U.username]) === key) return { sheet: sh, index: i, row: rows[i] };
  return null;
}
function getUserByUsername_(username) {
  const f = findUserRow_(username);
  if (!f) throw new Error('Pengguna tidak ditemukan.');
  return publicUser_(f.row);
}
function makeApiKey_() { return 'yatra_' + Utilities.getUuid().replace(/-/g, '').slice(0, 24); }
function profileComplete_(u) { return !!(u.name && u.nickname && u.golongan && u.gender); }
function requireCompleteProfile_(u) {
  if (!profileComplete_(u)) throw new Error('Lengkapi data diri (nama, nama panggilan, golongan, putra/putri) di menu Profil.');
}

function addUserInternal_(sh, u) {
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (low_(rows[i][U.username]) === low_(u.username)) throw new Error('UserID "' + u.username + '" sudah dipakai.');
  }
  const row = new Array(USER_HEADERS.length).fill('');
  row[U.username]  = u.username;
  row[U.password]  = String(u.password || '');
  row[U.name]      = u.name || '';
  row[U.golongan]  = u.golongan || '';
  row[U.gender]    = u.gender || '';
  row[U.role]      = u.role || 'user';
  row[U.apiKey]    = makeApiKey_();
  row[U.createdAt] = nowStr_();
  row[U.nickname]  = u.nickname || '';
  row[U.targetKm]  = Number(u.targetKm) || 0;
  row[U.sku]       = u.sku || '';
  row[U.regu]      = u.regu || '';
  row[U.pasukan]   = u.pasukan || '';
  row[U.phone]     = u.phone || '';
  row[U.active]    = 'TRUE';
  row[U.xp]        = 0;
  sh.appendRow(row);
  return row;
}

/* ------------------------------------------------------- RATE LIMIT LOGIN */
function loginAttemptKey_(username) { return 'LOGIN_FAIL_' + low_(username); }
function loginTooMany_(username) {
  try {
    const raw = CacheService.getScriptCache().get(loginAttemptKey_(username));
    return raw ? Number(raw) >= LOGIN_MAX_ATTEMPT : false;
  } catch (e) { return false; }
}
function loginFailed_(username) {
  try {
    const c = CacheService.getScriptCache(), k = loginAttemptKey_(username);
    c.put(k, String((Number(c.get(k)) || 0) + 1), LOGIN_WINDOW_MIN * 60);
  } catch (e) {}
}
function loginReset_(username) { try { CacheService.getScriptCache().remove(loginAttemptKey_(username)); } catch (e) {} }

/* ------------------------------------------------------------------ LOGIN */
/** Parameter pertama `token` diabaikan — dipertahankan agar seragam dengan dispatcher. */
function gsLogin(token, username, password) {
  pendingSetup_();
  const user = low_(username);
  const pass = String(password == null ? '' : password).replace(/^\s+|\s+$/g, '');
  if (!user || !pass) return { ok: false, error: 'UserID dan password wajib diisi.' };
  if (loginTooMany_(user)) return { ok: false, error: 'Terlalu banyak percobaan gagal. Coba lagi dalam ' + LOGIN_WINDOW_MIN + ' menit.' };

  const f = findUserRow_(user);
  if (!f || str_(f.row[U.password]) !== pass) {
    loginFailed_(user);
    audit_(user, 'login_gagal', '');
    return { ok: false, error: 'UserID atau password salah.' };
  }
  if (str_(f.row[U.active]).toUpperCase() === 'FALSE') {
    return { ok: false, error: 'Akun dinonaktifkan. Hubungi pembina.' };
  }
  loginReset_(user);

  const tk = Utilities.getUuid();
  const now = new Date();
  const exp = new Date(now.getTime() + SESSION_DAYS * 24 * 3600 * 1000);
  getSheet_('Sessions').appendRow([tk, user, now, exp, '']);
  f.sheet.getRange(f.index + 1, U.lastLogin + 1).setValue(nowStr_());
  audit_(user, 'login', '');

  const pu = publicUser_(f.row);
  return { ok: true, token: tk, user: pu, profileComplete: profileComplete_(pu), version: APP_VERSION };
}

function gsLogout(token) {
  const sh = getSheet_('Sessions');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === token) { sh.deleteRow(i + 1); break; }
  }
  return { ok: true };
}

function requireSession_(token) {
  if (!token) throw new Error('Sesi tidak ditemukan. Silakan masuk kembali.');
  const rows = sheetRows_('Sessions');
  const now = new Date();
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === token) {
      const exp = rows[i][3];
      if (exp && new Date(exp) < now) throw new Error('Sesi kedaluwarsa. Silakan masuk kembali.');
      return str_(rows[i][1]);
    }
  }
  throw new Error('Sesi tidak valid. Silakan masuk kembali.');
}
function requireAdmin_(token) {
  const u = getUserByUsername_(requireSession_(token));
  if (u.role !== 'admin' && u.role !== 'pembina') throw new Error('Akses ditolak: khusus admin/pembina.');
  return u;
}
function requireSuperAdmin_(token) {
  const u = getUserByUsername_(requireSession_(token));
  if (u.role !== 'admin') throw new Error('Akses ditolak: khusus admin.');
  return u;
}
function findByApiKey_(key) {
  if (!key) return null;
  const rows = sheetRows_('Users');
  for (let i = 0; i < rows.length; i++) if (str_(rows[i][U.apiKey]) === String(key)) return publicUser_(rows[i]);
  return null;
}

/** Bersihkan sesi kedaluwarsa (pasang trigger harian). */
function cleanupSessions() {
  const sh = getSheet_('Sessions');
  const rows = sh.getDataRange().getValues();
  const now = new Date();
  let removed = 0;
  for (let i = rows.length - 1; i >= 1; i--) {
    const exp = rows[i][3];
    if (exp && new Date(exp) < now) { sh.deleteRow(i + 1); removed++; }
  }
  return { removed: removed };
}

/* ------------------------------------------------------------------ DATA */
function gsCurrentUser(token) {
  const u = getUserByUsername_(requireSession_(token));
  return { ok: true, user: u, profileComplete: profileComplete_(u) };
}

function gsInitData(token) {
  pendingSetup_();
  const username = requireSession_(token);
  const u = getUserByUsername_(username);
  return {
    ok: true,
    user           : u,
    profileComplete: profileComplete_(u),
    types          : ACTIVITY_TYPES,
    skuLevels      : SKU_LEVELS,
    skuLabels      : SKU_LABELS,
    skkLevels      : SKK_LEVELS,
    skkLabels      : SKK_LEVEL_LABELS,
    regus          : getReguList_(),
    badges         : BADGES,
    announcements  : activeAnnouncements_(),
    version        : APP_VERSION,
    app            : { name: APP_NAME, tagline: APP_TAGLINE, gudep: prop_('GUDEP_NAME'), pangkalan: prop_('PANGKALAN') }
  };
}

/* ---------------------------------------------------------------- PROFIL */
function gsSaveProfile(token, profile) {
  const username = requireSession_(token);
  const f = findUserRow_(username);
  if (!f) throw new Error('Pengguna tidak ditemukan.');
  const p = profile || {};
  const set = function (col, v) { if (v !== undefined && v !== null) f.sheet.getRange(f.index + 1, col + 1).setValue(v); };
  set(U.name,      str_(p.name)     || str_(f.row[U.name]));
  set(U.nickname,  str_(p.nickname) || str_(f.row[U.nickname]));
  set(U.golongan,  str_(p.golongan) || str_(f.row[U.golongan]));
  set(U.gender,    str_(p.gender)   || str_(f.row[U.gender]));
  if (p.sku       !== undefined) set(U.sku,       low_(p.sku));
  if (p.regu      !== undefined) set(U.regu,      str_(p.regu));
  if (p.pasukan   !== undefined) set(U.pasukan,   str_(p.pasukan));
  if (p.phone     !== undefined) set(U.phone,     str_(p.phone));
  if (p.birthDate !== undefined) set(U.birthDate, str_(p.birthDate));
  const u = getUserByUsername_(username);
  audit_(username, 'profil_disimpan', '');
  return { ok: true, user: u, profileComplete: profileComplete_(u) };
}

function gsSaveProfilePhoto(token, dataUri) {
  const username = requireSession_(token);
  const u = getUserByUsername_(username);
  const blob = dataUriToBlob_(dataUri || '', 'foto_profil_' + username + '.jpg');
  if (blob.getBytes().length > MAX_PHOTO_BYTES) throw new Error('Foto profil terlalu besar (>200 KB). Kompres ulang lalu unggah lagi.');
  const folder = getUserDirFolder_(u);
  // hapus foto lama agar folder tetap rapi
  try {
    const old = folder.getFilesByName(blob.getName());
    while (old.hasNext()) old.next().setTrashed(true);
  } catch (e) {}
  const file = shareAnyone_(folder.createFile(blob));
  const f = findUserRow_(username);
  f.sheet.getRange(f.index + 1, U.profilePhotoId + 1).setValue(file.getId());
  return { ok: true, fileId: file.getId(), url: thumbUrl_(file.getId(), 400) };
}

function gsSetTarget(token, targetKm) {
  const username = requireSession_(token);
  const f = findUserRow_(username);
  if (!f) throw new Error('Pengguna tidak ditemukan.');
  const v = Math.max(0, Number(targetKm) || 0);
  f.sheet.getRange(f.index + 1, U.targetKm + 1).setValue(v);
  return { ok: true, targetKm: v };
}

function gsChangePassword(token, oldPass, newPass) {
  const username = requireSession_(token);
  const f = findUserRow_(username);
  if (!f) throw new Error('Pengguna tidak ditemukan.');
  if (str_(f.row[U.password]) !== String(oldPass || '')) throw new Error('Password lama salah.');
  if (!newPass || String(newPass).length < 6) throw new Error('Password baru minimal 6 karakter.');
  f.sheet.getRange(f.index + 1, U.password + 1).setValue(String(newPass));
  audit_(username, 'ganti_password', '');
  return { ok: true, message: 'Password berhasil diubah.' };
}

function gsMyApiKey(token) {
  const username = requireSession_(token);
  const f = findUserRow_(username);
  if (!f) throw new Error('Pengguna tidak ditemukan.');
  let key = str_(f.row[U.apiKey]);
  if (!key) { key = makeApiKey_(); f.sheet.getRange(f.index + 1, U.apiKey + 1).setValue(key); }
  return { ok: true, apiKey: key };
}

function gsRegenerateApiKey(token) {
  const username = requireSession_(token);
  const f = findUserRow_(username);
  const key = makeApiKey_();
  f.sheet.getRange(f.index + 1, U.apiKey + 1).setValue(key);
  return { ok: true, apiKey: key };
}


/* ==========================================================================
 * BAGIAN: 03_Activity.gs
 * ========================================================================== */
/**
 * YATRA v3 — 03_Activity.gs
 * Pencatatan perjalanan, statistik, rute, dan impor GPX.
 */

/* ------------------------------------------------------------- MAPPING */
function activityFromRow_(r) {
  const dist = toNum(r[A.distanceKm]);
  const dur  = toNum(r[A.durationMin]);
  return {
    id           : str_(r[A.id]),
    username     : low_(r[A.username]),
    date         : r[A.date] instanceof Date ? fmtDate_(r[A.date]) : str_(r[A.date]).slice(0, 10),
    type         : str_(r[A.type]),
    title        : str_(r[A.title]),
    distanceKm   : dist,
    durationMin  : dur,
    location     : str_(r[A.location]),
    lat          : toNum(r[A.lat]),
    lng          : toNum(r[A.lng]),
    elevationM   : toNum(r[A.elevationM]),
    calories     : toNum(r[A.calories]),
    notes        : str_(r[A.notes]),
    photoIds     : str_(r[A.photoIds]).split(',').filter(Boolean),
    routeMapId   : str_(r[A.routeMapId]),
    routePolyline: str_(r[A.routePolyline]),
    skkLevel     : str_(r[A.skkLevel]),
    source       : str_(r[A.source]) || 'manual',
    verified     : str_(r[A.verified]).toUpperCase() === 'TRUE',
    verifiedBy   : str_(r[A.verifiedBy]),
    regu         : str_(r[A.regu]),
    avgSpeed     : (dist && dur) ? round2(dist / (dur / 60)) : null,
    avgPace      : (dist && dur) ? round2(dur / dist) : null
  };
}

function listActivitiesInternal_(username) {
  const key = low_(username);
  const out = sheetRows_('Activities')
    .filter(function (r) { return r[A.id] && low_(r[A.username]) === key; })
    .map(activityFromRow_);
  out.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
  return out;
}
function listAllActivities_() {
  return sheetRows_('Activities').filter(function (r) { return r[A.id]; }).map(activityFromRow_);
}

/* --------------------------------------------------------------- TAMBAH */
function gsAddActivity(token, payload) {
  const username = requireSession_(token);
  return addActivityForUser_(username, payload);
}

function addActivityForUser_(username, p) {
  pendingSetup_();
  if (!p) throw new Error('Data perjalanan kosong.');
  const u = getUserByUsername_(username);
  requireCompleteProfile_(u);

  const distance = parseNum(p.distanceKm);
  const duration = parseNum(p.durationMin);
  if (duration === null || duration <= 0) throw new Error('Durasi (menit) wajib diisi dan lebih dari 0.');
  if (distance !== null && distance < 0)  throw new Error('Jarak tidak boleh negatif.');
  if (distance !== null && distance > 300) throw new Error('Jarak tidak wajar (>300 km). Periksa kembali.');
  if (duration > 24 * 60) throw new Error('Durasi tidak wajar (>24 jam). Periksa kembali.');

  const type = str_(p.type) || 'gerak-jalan';
  const date = str_(p.date) || todayStr_();
  if (date > todayStr_()) throw new Error('Tanggal tidak boleh di masa depan.');

  // anti-duplikat: jenis + tanggal + jarak sama persis dalam 1 hari
  const dup = listActivitiesInternal_(username).some(function (a) {
    return a.date === date && a.type === type && a.durationMin === duration &&
           String(a.distanceKm) === String(distance);
  });
  if (dup && !p.allowDuplicate) throw new Error('Perjalanan serupa sudah tercatat pada tanggal tersebut.');

  const photoIds = uploadPhotos_(p.photos || []);
  let routeMapId = str_(p.routeMapId), routePolyline = str_(p.routePolyline);
  if (!routeMapId && p.points && p.points.length >= 2) {
    try {
      const r = generateRouteImage_(p.points);
      if (r && r.fileId) { routeMapId = r.fileId; routePolyline = r.polyline; }
    } catch (e) { Logger.log('rute gagal: ' + e); }
  }

  let calories = parseNum(p.calories);
  if (calories === null && duration) calories = estimateCalories_(type, duration);

  const id = uid_(8);
  const row = new Array(ACT_HEADERS.length).fill('');
  row[A.id]            = id;
  row[A.username]      = low_(username);
  row[A.date]          = date;
  row[A.type]          = type;
  row[A.title]         = str_(p.title) || defaultTitle_(type, date);
  row[A.distanceKm]    = distance === null ? '' : distance;
  row[A.durationMin]   = duration;
  row[A.location]      = str_(p.location);
  row[A.lat]           = p.lat == null || p.lat === '' ? '' : p.lat;
  row[A.lng]           = p.lng == null || p.lng === '' ? '' : p.lng;
  row[A.elevationM]    = parseNum(p.elevationM) === null ? '' : parseNum(p.elevationM);
  row[A.calories]      = calories === null ? '' : Math.round(calories);
  row[A.notes]         = str_(p.notes);
  row[A.photoIds]      = photoIds.join(',');
  row[A.routeMapId]    = routeMapId;
  row[A.routePolyline] = routePolyline;
  row[A.skkLevel]      = '';
  row[A.createdAt]     = nowStr_();
  row[A.updatedAt]     = nowStr_();
  row[A.source]        = str_(p.source) || 'manual';
  row[A.verified]      = 'FALSE';
  row[A.regu]          = u.regu || '';
  getSheet_('Activities').appendRow(row);

  const newBadges = evaluateBadges_(username);
  recalcXp_(username);
  audit_(username, 'aktivitas_tambah', id);

  return {
    ok: true, id: id,
    stats    : getStatsInternal_(username, 'this_month'),
    skk      : skkProgress_(getUserByUsername_(username)),
    newBadges: newBadges
  };
}

function defaultTitle_(type, date) {
  const t = ACTIVITY_TYPES.filter(function (x) { return x.key === type; })[0];
  return (t ? t.label : 'Perjalanan') + ' ' + date;
}
function estimateCalories_(type, minutes) {
  const t = ACTIVITY_TYPES.filter(function (x) { return x.key === type; })[0];
  const met = t ? t.met : 5;
  return Math.round(met * 45 * (minutes / 60)); // asumsi berat rata-rata penggalang 45 kg
}

/* ---------------------------------------------------------------- BACA */
function gsListActivities(token, opts) {
  const username = requireSession_(token);
  let list = listActivitiesInternal_(username);
  const o = opts || {};
  if (o.range) list = list.filter(function (a) { return inRange_(a.date, o.range); });
  if (o.type)  list = list.filter(function (a) { return a.type === o.type; });
  if (o.q) {
    const q = low_(o.q);
    list = list.filter(function (a) { return low_(a.title).indexOf(q) >= 0 || low_(a.location).indexOf(q) >= 0 || low_(a.notes).indexOf(q) >= 0; });
  }
  const limit = Number(o.limit) || 0;
  return { ok: true, total: list.length, items: limit ? list.slice(0, limit) : list };
}

function gsGetActivity(token, id) {
  const username = requireSession_(token);
  const u = getUserByUsername_(username);
  const rows = sheetRows_('Activities');
  for (let i = 0; i < rows.length; i++) {
    if (str_(rows[i][A.id]) === String(id)) {
      const a = activityFromRow_(rows[i]);
      if (a.username !== low_(username) && u.role === 'user') throw new Error('Tidak berhak membuka data ini.');
      a.photoUrls = a.photoIds.map(function (f) { return thumbUrl_(f, 1200); });
      a.routeUrl  = thumbUrl_(a.routeMapId, 1200);
      return { ok: true, activity: a };
    }
  }
  throw new Error('Perjalanan tidak ditemukan.');
}

/* -------------------------------------------------------------- UBAH/HAPUS */
function gsUpdateActivity(token, id, patch) {
  const username = requireSession_(token);
  const sh = getSheet_('Activities');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (str_(rows[i][A.id]) === String(id) && low_(rows[i][A.username]) === low_(username)) {
      const p = patch || {};
      const set = function (col, v) { sh.getRange(i + 1, col + 1).setValue(v); };
      if (p.title    !== undefined) set(A.title, str_(p.title));
      if (p.type     !== undefined) set(A.type, str_(p.type));
      if (p.location !== undefined) set(A.location, str_(p.location));
      if (p.notes    !== undefined) set(A.notes, str_(p.notes));
      if (p.date     !== undefined && str_(p.date) <= todayStr_()) set(A.date, str_(p.date));
      if (p.distanceKm  !== undefined) set(A.distanceKm, parseNum(p.distanceKm) || '');
      if (p.durationMin !== undefined) set(A.durationMin, parseNum(p.durationMin) || '');
      if (p.elevationM  !== undefined) set(A.elevationM, parseNum(p.elevationM) || '');
      set(A.updatedAt, nowStr_());
      recalcXp_(username);
      audit_(username, 'aktivitas_ubah', String(id));
      return { ok: true };
    }
  }
  throw new Error('Perjalanan tidak ditemukan atau bukan milik Anda.');
}

function gsDeleteActivity(token, id) {
  const username = requireSession_(token);
  const u = getUserByUsername_(username);
  const sh = getSheet_('Activities');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const owner = low_(rows[i][A.username]);
    if (str_(rows[i][A.id]) === String(id) && (owner === low_(username) || u.role === 'admin')) {
      deleteDriveFiles_(str_(rows[i][A.photoIds]).split(',').filter(Boolean));
      if (rows[i][A.routeMapId]) deleteDriveFiles_([str_(rows[i][A.routeMapId])]);
      sh.deleteRow(i + 1);
      recalcXp_(owner);
      audit_(username, 'aktivitas_hapus', String(id));
      return { ok: true, skk: skkProgress_(getUserByUsername_(owner)) };
    }
  }
  throw new Error('Perjalanan tidak ditemukan.');
}

/* ----------------------------------------------------------- STATISTIK */
function getStatsInternal_(username, range) {
  const acts = listActivitiesInternal_(username).filter(function (a) { return inRange_(a.date, range || 'all'); });
  let dist = 0, dur = 0, elev = 0, cal = 0;
  const byType = {}, byDate = {};
  acts.forEach(function (a) {
    dist += a.distanceKm || 0;
    dur  += a.durationMin || 0;
    elev += a.elevationM || 0;
    cal  += a.calories || 0;
    byType[a.type] = (byType[a.type] || 0) + 1;
    byDate[a.date] = round2((byDate[a.date] || 0) + (a.distanceKm || 0));
  });
  const withDist = acts.filter(function (a) { return a.distanceKm; });
  const dDist = withDist.reduce(function (s, a) { return s + a.distanceKm; }, 0);
  const dDur  = withDist.reduce(function (s, a) { return s + (a.durationMin || 0); }, 0);
  let topType = '', topN = 0;
  Object.keys(byType).forEach(function (k) { if (byType[k] > topN) { topN = byType[k]; topType = k; } });
  const longest = acts.reduce(function (m, a) { return (a.distanceKm || 0) > (m ? m.distanceKm || 0 : 0) ? a : m; }, null);

  return {
    count         : acts.length,
    totalDistance : round2(dist),
    totalDuration : Math.round(dur),
    totalElevation: Math.round(elev),
    totalCalories : Math.round(cal),
    avgSpeed      : dDur ? round2(dDist / (dDur / 60)) : 0,
    avgPace       : (dDur && dDist) ? round2(dDur / dDist) : 0,
    avgDistance   : acts.length ? round2(dist / acts.length) : 0,
    topType       : topType,
    byType        : byType,
    byDate        : byDate,
    longest       : longest ? { id: longest.id, title: longest.title, distanceKm: longest.distanceKm, date: longest.date } : null,
    streak        : computeStreak_(listActivitiesInternal_(username)),
    activeDays    : Object.keys(byDate).length
  };
}
function gsGetStats(token, range) {
  return { ok: true, stats: getStatsInternal_(requireSession_(token), range || 'all') };
}

/** Streak hari beruntun (berdasarkan tanggal aktivitas, mundur dari hari ini/kemarin). */
function computeStreak_(acts) {
  if (!acts || !acts.length) return 0;
  const set = {};
  acts.forEach(function (a) { if (a.date) set[a.date] = true; });
  const d = new Date();
  if (!set[fmtDate_(d)]) d.setDate(d.getDate() - 1);  // toleransi: belum mencatat hari ini
  let n = 0;
  while (set[fmtDate_(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function trendSeries_(username, weeks) {
  const tz = getTimeZone_(), now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); mon.setHours(0, 0, 0, 0);
  const buckets = [], starts = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const s = new Date(mon); s.setDate(mon.getDate() - 7 * w);
    starts.push(s);
    buckets.push({ label: Utilities.formatDate(s, tz, 'dd/MM'), km: 0, count: 0 });
  }
  listActivitiesInternal_(username).forEach(function (a) {
    if (!a.date) return;
    const d = new Date(a.date + 'T00:00:00');
    for (let i = 0; i < starts.length; i++) {
      const e = new Date(starts[i]); e.setDate(starts[i].getDate() + 6); e.setHours(23, 59, 59, 999);
      if (d >= starts[i] && d <= e) { buckets[i].km = round2(buckets[i].km + (a.distanceKm || 0)); buckets[i].count++; break; }
    }
  });
  return buckets;
}

/* ------------------------------------------------------------ FOTO/RUTE */
function uploadPhotos_(photos) {
  const ids = [];
  if (!photos || !photos.length) return ids;
  if (photos.length > 5) throw new Error('Maksimal 5 foto per perjalanan.');
  const folder = getDriveFolder_(FOLDER.PHOTOS);
  photos.forEach(function (ph) {
    if (!ph || !ph.data) return;
    const blob = dataUriToBlob_(ph.data, ph.name || ('bukti_' + uid_(6) + '.jpg'));
    if (blob.getBytes().length > MAX_PHOTO_BYTES) throw new Error('Foto terlalu besar (>200 KB). Kompres ulang lalu coba lagi.');
    ids.push(shareAnyone_(folder.createFile(blob)).getId());
  });
  return ids;
}

function gsPhotoUrl(token, fid)        { requireSession_(token); return thumbUrl_(fid, 1200); }
function gsRouteUrl(token, fid)        { requireSession_(token); return thumbUrl_(fid, 1200); }
function gsProfilePhotoUrl(token, fid) { requireSession_(token); return thumbUrl_(fid, 400); }

function gsReverseGeocode(token, lat, lng) {
  requireSession_(token);
  if (lat == null || lat === '' || lng == null || lng === '') return '';
  try {
    const r = Maps.newGeocoder().setLanguage('id').reverseGeocode(Number(lat), Number(lng));
    if (r && r.results && r.results.length) return r.results[0].formatted_address;
  } catch (e) {}
  return '';
}

function gsGenerateRouteImage(token, points) { requireSession_(token); return generateRouteImage_(points); }
function generateRouteImage_(points) {
  if (!points || points.length < 2) throw new Error('Titik rute belum cukup.');
  const norm = points.map(function (pt) {
    return Array.isArray(pt) ? { lat: Number(pt[0]), lng: Number(pt[1]) } : { lat: Number(pt.lat), lng: Number(pt.lng) };
  }).filter(function (p) { return !isNaN(p.lat) && !isNaN(p.lng); });
  if (norm.length < 2) throw new Error('Titik rute tidak valid.');

  const simple = simplifyPoints_(norm, 300);
  const flat = [];
  simple.forEach(function (p) { flat.push(p.lat, p.lng); });
  const c = centerOf_(simple);
  try {
    const map = Maps.newStaticMap().setSize(640, 400).setLanguage('id').setCenter(c.lat, c.lng)
      .setPathStyle(6, Maps.StaticMap.Color.ORANGE, null).addPath(flat);
    map.setMarkerStyle(Maps.StaticMap.MarkerSize.SMALL, Maps.StaticMap.Color.GREEN, 'A').addMarker(simple[0].lat, simple[0].lng);
    map.setMarkerStyle(Maps.StaticMap.MarkerSize.SMALL, Maps.StaticMap.Color.RED, 'B').addMarker(simple[simple.length - 1].lat, simple[simple.length - 1].lng);
    const file = shareAnyone_(getDriveFolder_(FOLDER.ROUTES).createFile(map.getBlob().setName('rute_' + uid_(6) + '.png')));
    return { ok: true, fileId: file.getId(), url: thumbUrl_(file.getId(), 1200), polyline: Maps.encodePolyline(flat) };
  } catch (e) {
    Logger.log('Gagal membuat gambar rute: ' + e);
    return { ok: false, error: String(e && e.message || e) };
  }
}
function simplifyPoints_(pts, max) {
  if (pts.length <= max) return pts;
  const step = Math.ceil(pts.length / max), out = [];
  for (let i = 0; i < pts.length; i += step) out.push(pts[i]);
  if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
  return out;
}
function centerOf_(pts) {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  pts.forEach(function (p) {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
  });
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

/** Jarak haversine (km) — dipakai untuk validasi impor GPX di server. */
function haversineKm_(a, b) {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(s));
}


/* ==========================================================================
 * BAGIAN: 04_SKK_SKU.gs
 * ========================================================================== */
/**
 * YATRA v3 — 04_SKK_SKU.gs
 * SKK Gerak Jalan (Purwa/Madya/Utama) + checklist SKU digital Penggalang.
 */

/* ============================================================ SKK GERAK JALAN */
function getSkkCriteria_(user) {
  const gol = str_(user.golongan), gen = str_(user.gender), out = {};
  sheetRows_('SKK_Config').forEach(function (r) {
    if (String(r[5]).toUpperCase() !== 'TRUE') return;
    if (str_(r[0]) !== gol || str_(r[1]) !== gen) return;
    out[str_(r[2])] = { distanceKm: Number(r[3]) || 0, minTrips: Number(r[4]) || 1, note: str_(r[6]) };
  });
  return out;
}

function skkProgress_(user) {
  const acts     = listActivitiesInternal_(user.username);
  const criteria = getSkkCriteria_(user);
  const subs     = getSubmissionsFor_(user.username);
  const levels   = [];

  SKK_LEVELS.forEach(function (lv) {
    const c = criteria[lv];
    if (!c) return;
    const qualifying = acts.filter(function (a) {
      return SKK_QUALIFYING_TYPES.indexOf(a.type) >= 0 && a.distanceKm != null && a.distanceKm >= c.distanceKm;
    });
    const trips = qualifying.length;
    const sub   = subs.filter(function (s) { return s.level === lv; })[0] || null;
    levels.push({
      level: lv, label: SKK_LEVEL_LABELS[lv], distanceKm: c.distanceKm, minTrips: c.minTrips,
      trips: trips, pct: Math.min(100, Math.round(trips / c.minTrips * 100)),
      reached: trips >= c.minTrips, note: c.note,
      evidence: qualifying.slice(0, c.minTrips).map(function (a) {
        return { id: a.id, date: a.date, distanceKm: a.distanceKm, title: a.title };
      }),
      submission: sub ? { id: sub.id, status: sub.status, date: sub.date, feedback: sub.feedback } : null
    });
  });

  let auto = '';
  for (let i = 0; i < levels.length; i++) { if (levels[i].reached) auto = levels[i].level; else break; }
  let validated = '';
  SKK_LEVELS.forEach(function (lv) {
    if (subs.some(function (s) { return s.level === lv && s.status === SUB_STATUS_PASSED; })) validated = lv;
  });

  return {
    golongan: user.golongan, gender: user.gender, nickname: user.nickname, name: user.name, sku: user.sku,
    levels: levels, autoReached: auto, autoLabel: auto ? SKK_LEVEL_LABELS[auto] : '',
    validatedLevel: validated, validatedLabel: validated ? SKK_LEVEL_LABELS[validated] : '',
    submissions: subs,
    totalTrips: acts.filter(function (a) { return SKK_QUALIFYING_TYPES.indexOf(a.type) >= 0; }).length,
    qualifyingTypes: SKK_QUALIFYING_TYPES,
    hasProfile: !!(user.golongan && user.gender),
    profileComplete: profileComplete_(user),
    configCount: Object.keys(criteria).length
  };
}

function gsGetSkk(token) {
  return { ok: true, skk: skkProgress_(getUserByUsername_(requireSession_(token))) };
}

function getSubmissionsFor_(username) {
  const key = low_(username);
  const out = sheetRows_('SKK_Submissions')
    .filter(function (r) { return r[S_.id] && low_(r[S_.username]) === key; })
    .map(function (r) {
      return { id: str_(r[S_.id]), username: low_(r[S_.username]), level: str_(r[S_.level]),
        date: r[S_.date] instanceof Date ? fmtDate_(r[S_.date]) : str_(r[S_.date]),
        status: str_(r[S_.status]), folderId: str_(r[S_.folderId]), notes: str_(r[S_.notes]),
        validatedAt: str_(r[S_.validatedAt]), validatedBy: str_(r[S_.validatedBy]), feedback: str_(r[S_.feedback]),
        folderUrl: r[S_.folderId] ? ('https://drive.google.com/drive/folders/' + str_(r[S_.folderId])) : '' };
    });
  out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  return out;
}
function gsSkkMySubmissions(token) { return { ok: true, items: getSubmissionsFor_(requireSession_(token)) }; }

function gsSkkSubmit(token, level, notes) {
  const username = requireSession_(token);
  const user = getUserByUsername_(username);
  requireCompleteProfile_(user);
  if (!SKK_LEVEL_LABELS[level]) throw new Error('Tingkat SKK tidak valid.');

  const prog = skkProgress_(user);
  const lv = prog.levels.filter(function (l) { return l.level === level; })[0];
  if (!lv) throw new Error('Kriteria SKK untuk golongan/gender Anda belum diatur admin.');
  if (!lv.reached) throw new Error('Syarat tingkat ' + SKK_LEVEL_LABELS[level] + ' belum terpenuhi (' + lv.trips + '/' + lv.minTrips + ' perjalanan ≥ ' + lv.distanceKm + ' km).');

  const existing = getSubmissionsFor_(username).filter(function (s) { return s.level === level; })[0];
  if (existing && existing.status === SUB_STATUS_PASSED) throw new Error('Tingkat ini sudah tervalidasi.');
  if (existing && existing.status === SUB_STATUS_PENDING) throw new Error('Pengajuan tingkat ini sedang menunggu validasi pembina.');

  const folder = getSkkUserFolder_(level, user);
  const id = 'SUB-' + uid_(6);
  getSheet_('SKK_Submissions').appendRow([id, low_(username), level, todayStr_(), SUB_STATUS_PENDING,
    folder.getId(), str_(notes), nowStr_(), '', '', '']);
  audit_(username, 'skk_ajukan', level);
  return { ok: true, id: id, level: level, folderId: folder.getId(),
    folderUrl: 'https://drive.google.com/drive/folders/' + folder.getId(),
    message: 'Pengajuan terkirim. Unggah bukti tambahan ke folder Drive bila diminta pembina.' };
}

function getSkkLevelFolder_(level) {
  return getDriveFolder_(SKK_LEVEL_FOLDERS[level], DriveApp.getFolderById(SKK_BASE_FOLDER_ID_()));
}
function getSkkUserFolder_(level, user) {
  return getDriveFolder_(userFolderName_(user), getSkkLevelFolder_(level));
}

/* =================================================== CHECKLIST SKU DIGITAL */
function getSkuItems_(level) {
  return sheetRows_('SKU_Items')
    .filter(function (r) { return r[0] && String(r[4]).toUpperCase() !== 'FALSE' && (!level || low_(r[0]) === low_(level)); })
    .map(function (r) { return { level: low_(r[0]), code: str_(r[1]), title: str_(r[2]), category: str_(r[3]) }; });
}

function skuProgressFor_(username) {
  const key = low_(username);
  const map = {};
  sheetRows_('SKU_Progress').forEach(function (r) {
    if (low_(r[1]) !== key) return;
    map[low_(r[2]) + '|' + str_(r[3])] = {
      id: str_(r[0]), status: str_(r[4]),
      date: r[5] instanceof Date ? fmtDate_(r[5]) : str_(r[5]),
      validatedBy: str_(r[6]), validatedAt: str_(r[7]), notes: str_(r[8])
    };
  });
  const byLevel = {};
  SKU_LEVELS.forEach(function (lv) {
    const items = getSkuItems_(lv).map(function (it) {
      const p = map[lv + '|' + it.code] || null;
      return Object.assign({}, it, { status: p ? p.status : 'belum', progress: p });
    });
    const done = items.filter(function (i) { return i.status === 'lulus'; }).length;
    byLevel[lv] = { level: lv, label: SKU_LABELS[lv], items: items, done: done, total: items.length,
      pct: items.length ? Math.round(done / items.length * 100) : 0, complete: items.length > 0 && done === items.length };
  });
  return byLevel;
}

function gsGetSku(token) {
  const username = requireSession_(token);
  const u = getUserByUsername_(username);
  return { ok: true, current: u.sku, levels: SKU_LEVELS, labels: SKU_LABELS, progress: skuProgressFor_(username) };
}

/** Anggota mengajukan butir SKU untuk diuji pembina. */
function gsSkuClaim(token, level, code, notes) {
  const username = requireSession_(token);
  if (SKU_LEVELS.indexOf(low_(level)) < 0) throw new Error('Tingkat SKU tidak valid.');
  const items = getSkuItems_(level);
  if (!items.some(function (i) { return i.code === str_(code); })) throw new Error('Butir SKU tidak ditemukan.');

  const sh = getSheet_('SKU_Progress');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (low_(rows[i][1]) === low_(username) && low_(rows[i][2]) === low_(level) && str_(rows[i][3]) === str_(code)) {
      if (str_(rows[i][4]) === 'lulus') throw new Error('Butir ini sudah dinyatakan lulus.');
      sh.getRange(i + 1, 5).setValue('menunggu');
      sh.getRange(i + 1, 6).setValue(todayStr_());
      sh.getRange(i + 1, 9).setValue(str_(notes));
      return { ok: true, updated: true };
    }
  }
  sh.appendRow(['SKU-' + uid_(6), low_(username), low_(level), str_(code), 'menunggu', todayStr_(), '', '', str_(notes)]);
  audit_(username, 'sku_ajukan', level + '/' + code);
  return { ok: true, created: true };
}

/** Pembina/admin memvalidasi butir SKU (tanda tangan digital). */
function gsSkuValidate(token, username, level, code, status, notes) {
  const admin = requireAdmin_(token);
  const st = ['lulus', 'menunggu', 'ditolak'].indexOf(String(status)) >= 0 ? String(status) : 'menunggu';
  const sh = getSheet_('SKU_Progress');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (low_(rows[i][1]) === low_(username) && low_(rows[i][2]) === low_(level) && str_(rows[i][3]) === str_(code)) {
      sh.getRange(i + 1, 5).setValue(st);
      sh.getRange(i + 1, 7).setValue(admin.name || admin.username);
      sh.getRange(i + 1, 8).setValue(nowStr_());
      if (notes !== undefined) sh.getRange(i + 1, 9).setValue(str_(notes));
      afterSkuValidate_(username, level);
      audit_(admin.username, 'sku_validasi', username + '/' + level + '/' + code + '=' + st);
      return { ok: true, status: st };
    }
  }
  sh.appendRow(['SKU-' + uid_(6), low_(username), low_(level), str_(code), st, todayStr_(), admin.name || admin.username, nowStr_(), str_(notes)]);
  afterSkuValidate_(username, level);
  return { ok: true, status: st, created: true };
}

/** Bila semua butir satu tingkat lulus → naikkan SKU anggota. */
function afterSkuValidate_(username, level) {
  const prog = skuProgressFor_(username);
  const lv = prog[low_(level)];
  if (lv && lv.complete) {
    const f = findUserRow_(username);
    if (f) {
      const order = SKU_LEVELS.indexOf(low_(level));
      const cur   = SKU_LEVELS.indexOf(low_(f.row[U.sku]));
      if (order > cur) f.sheet.getRange(f.index + 1, U.sku + 1).setValue(low_(level));
    }
  }
  recalcXp_(username);
}

/** Daftar semua pengajuan SKU untuk panel pembina. */
function gsAdminListSkuClaims(token, statusFilter) {
  requireAdmin_(token);
  const users = getUsersMap_();
  const out = sheetRows_('SKU_Progress').filter(function (r) { return r[0]; }).map(function (r) {
    const u = users[low_(r[1])] || {};
    return { id: str_(r[0]), username: low_(r[1]), name: u.name || '', nickname: u.nickname || '', regu: u.regu || '',
      level: low_(r[2]), code: str_(r[3]), status: str_(r[4]),
      date: r[5] instanceof Date ? fmtDate_(r[5]) : str_(r[5]),
      validatedBy: str_(r[6]), validatedAt: str_(r[7]), notes: str_(r[8]),
      title: (getSkuItems_(low_(r[2])).filter(function (i) { return i.code === str_(r[3]); })[0] || {}).title || '' };
  });
  const filtered = statusFilter ? out.filter(function (o) { return o.status === statusFilter; }) : out;
  filtered.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  return { ok: true, items: filtered };
}


/* ==========================================================================
 * BAGIAN: 05_Regu_Gamifikasi.gs
 * ========================================================================== */
/**
 * YATRA v3 — 05_Regu_Gamifikasi.gs
 * Regu & Pasukan, papan peringkat, badge, XP/level, dan pengumuman.
 */

/* =================================================================== REGU */
function getReguList_() {
  return sheetRows_('Regu').filter(function (r) { return r[0]; }).map(function (r) {
    return { id: str_(r[0]), name: str_(r[1]), pasukan: str_(r[2]), gender: low_(r[3]),
      leader: str_(r[4]), motto: str_(r[5]), color: str_(r[6]) || '#fc4c02' };
  });
}
function gsListRegu(token) { requireSession_(token); return { ok: true, items: getReguList_() }; }

function gsAdminSaveRegu(token, regu) {
  requireAdmin_(token);
  const r = regu || {};
  const name = str_(r.name);
  if (!name) throw new Error('Nama regu wajib diisi.');
  const id = str_(r.id) || ('REGU-' + slug_(name).toUpperCase());
  const sh = getSheet_('Regu');
  const rows = sh.getDataRange().getValues();
  const val = [id, name, str_(r.pasukan), low_(r.gender), str_(r.leader), str_(r.motto), str_(r.color) || '#fc4c02', nowStr_()];
  for (let i = 1; i < rows.length; i++) {
    if (str_(rows[i][0]) === id) { sh.getRange(i + 1, 1, 1, 8).setValues([val]); return { ok: true, updated: true, id: id }; }
  }
  sh.appendRow(val);
  return { ok: true, created: true, id: id };
}

function gsAdminDeleteRegu(token, id) {
  requireAdmin_(token);
  const sh = getSheet_('Regu');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (str_(rows[i][0]) === String(id)) { sh.deleteRow(i + 1); return { ok: true }; }
  }
  throw new Error('Regu tidak ditemukan.');
}

/** Rekap kompetisi antar-regu. */
function reguStats_(range) {
  const users = getAllUsers_();
  const acts  = listAllActivities_().filter(function (a) { return inRange_(a.date, range || 'all'); });
  const byUser = {};
  users.forEach(function (u) { byUser[u.username.toLowerCase()] = u; });

  const agg = {};
  getReguList_().forEach(function (r) {
    agg[r.name] = { regu: r.name, id: r.id, pasukan: r.pasukan, gender: r.gender, color: r.color, motto: r.motto,
      members: 0, distanceKm: 0, durationMin: 0, count: 0, activeMembers: {} };
  });
  users.forEach(function (u) { if (u.regu && agg[u.regu] && u.role !== 'admin') agg[u.regu].members++; });
  acts.forEach(function (a) {
    const u = byUser[a.username];
    if (!u || !u.regu || !agg[u.regu] || u.role === 'admin') return;
    const g = agg[u.regu];
    g.distanceKm += a.distanceKm || 0;
    g.durationMin += a.durationMin || 0;
    g.count++;
    g.activeMembers[a.username] = true;
  });
  const out = Object.keys(agg).map(function (k) {
    const g = agg[k];
    const active = Object.keys(g.activeMembers).length;
    return { regu: g.regu, id: g.id, pasukan: g.pasukan, gender: g.gender, color: g.color, motto: g.motto,
      members: g.members, activeMembers: active, count: g.count,
      distanceKm: round2(g.distanceKm), durationMin: Math.round(g.durationMin),
      avgPerMember: g.members ? round2(g.distanceKm / g.members) : 0,
      participation: g.members ? Math.round(active / g.members * 100) : 0 };
  });
  out.sort(function (a, b) { return b.distanceKm - a.distanceKm; });
  out.forEach(function (o, i) { o.rank = i + 1; });
  return out;
}
function gsReguLeaderboard(token, range) {
  requireSession_(token);
  return { ok: true, range: range || 'all', items: reguStats_(range) };
}

/* ========================================================= LEADERBOARD */
function leaderboardInternal_(range, filter) {
  const users = getUsersMap_();
  const agg = {};
  listAllActivities_().forEach(function (a) {
    if (!inRange_(a.date, range || 'all')) return;
    if (!agg[a.username]) agg[a.username] = { dist: 0, dur: 0, count: 0, days: {} };
    const g = agg[a.username];
    g.dist += a.distanceKm || 0;
    g.dur  += a.durationMin || 0;
    g.count++;
    g.days[a.date] = true;
  });
  let out = Object.keys(agg).map(function (k) {
    const a = agg[k], u = users[k] || {};
    return { username: k, name: u.name || '', nickname: u.nickname || k, golongan: u.golongan || '',
      gender: u.gender || '', role: u.role || 'user', regu: u.regu || '', sku: u.sku || '',
      skkLevel: u.skkLevel || '', profilePhotoId: u.profilePhotoId || '', xp: u.xp || 0,
      distanceKm: round2(a.dist), durationMin: Math.round(a.dur), count: a.count,
      activeDays: Object.keys(a.days).length,
      avgSpeed: a.dur ? round2(a.dist / (a.dur / 60)) : 0 };
  });
  out = out.filter(function (o) { return o.role !== 'admin' && o.distanceKm > 0; });
  const f = filter || {};
  if (f.gender) out = out.filter(function (o) { return o.gender === f.gender; });
  if (f.regu)   out = out.filter(function (o) { return o.regu === f.regu; });
  out.sort(function (a, b) { return b.distanceKm - a.distanceKm; });
  out.forEach(function (o, i) { o.rank = i + 1; });
  return out;
}
function gsLeaderboard(token, range, filter) {
  requireSession_(token);
  const me = requireSession_(token);
  const items = leaderboardInternal_(range, filter);
  const mine = items.filter(function (i) { return i.username === low_(me); })[0] || null;
  return { ok: true, range: range || 'all', items: items, me: mine };
}

/** Halaman "Leadership": peringkat + galeri bukti perjalanan. */
function gsLeadership(token, range) {
  requireSession_(token);
  const users = getUsersMap_();
  const proofs = [];
  listAllActivities_().forEach(function (a) {
    if (!a.photoIds.length) return;
    if (!inRange_(a.date, range || 'all')) return;
    const u = users[a.username] || {};
    if (u.role === 'admin') return;
    proofs.push({ id: a.id, username: a.username, nickname: u.nickname || u.name || a.username,
      regu: u.regu || '', gender: u.gender || '', date: a.date, type: a.type, title: a.title,
      distanceKm: a.distanceKm, durationMin: a.durationMin, verified: a.verified,
      photoId: a.photoIds[0], photoUrl: thumbUrl_(a.photoIds[0], 800) });
  });
  proofs.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
  return { ok: true, ranking: leaderboardInternal_(range), regu: reguStats_(range),
    proofs: proofs.slice(0, 150), total: proofs.length };
}

/* ============================================================== BADGES */
function earnedBadges_(username) {
  const key = low_(username), out = {};
  sheetRows_('Badges').forEach(function (r) {
    if (low_(r[0]) === key) out[str_(r[1])] = str_(r[2]);
  });
  return out;
}

/** Evaluasi badge; mengembalikan daftar badge BARU yang diperoleh. */
function evaluateBadges_(username) {
  const u     = getUserByUsername_(username);
  const acts  = listActivitiesInternal_(username);
  const stats = getStatsInternal_(username, 'all');
  const skk   = skkProgress_(u);
  const owned = earnedBadges_(username);
  const maxSingle = acts.reduce(function (m, a) { return Math.max(m, a.distanceKm || 0); }, 0);
  const reguKm = u.regu ? (reguStats_('all').filter(function (r) { return r.regu === u.regu; })[0] || {}).distanceKm || 0 : 0;

  const gained = [];
  BADGES.forEach(function (b) {
    if (owned[b.key]) return;
    const r = b.rule;
    let ok = false;
    switch (r.type) {
      case 'count':     ok = stats.count >= r.min; break;
      case 'distance':  ok = stats.totalDistance >= r.min; break;
      case 'elevation': ok = stats.totalElevation >= r.min; break;
      case 'streak':    ok = stats.streak >= r.min; break;
      case 'single':    ok = maxSingle >= r.min; break;
      case 'regu':      ok = reguKm >= r.min; break;
      case 'hasType':   ok = acts.some(function (a) { return a.type === r.key; }); break;
      case 'skk':       ok = SKK_LEVELS.indexOf(skk.validatedLevel) >= SKK_LEVELS.indexOf(r.level) && !!skk.validatedLevel; break;
    }
    if (ok) gained.push(b);
  });
  if (gained.length) {
    const sh = getSheet_('Badges');
    gained.forEach(function (b) { sh.appendRow([low_(username), b.key, nowStr_()]); });
  }
  return gained;
}

function gsGetBadges(token) {
  const username = requireSession_(token);
  evaluateBadges_(username);
  const owned = earnedBadges_(username);
  const items = BADGES.map(function (b) {
    return Object.assign({}, b, { earned: !!owned[b.key], earnedAt: owned[b.key] || '' });
  });
  return { ok: true, items: items, earned: items.filter(function (i) { return i.earned; }).length, total: BADGES.length };
}

/* ================================================================== XP */
function computeXp_(username) {
  const stats = getStatsInternal_(username, 'all');
  const badges = Object.keys(earnedBadges_(username)).length;
  const sku = skuProgressFor_(username);
  let skuDone = 0;
  Object.keys(sku).forEach(function (k) { skuDone += sku[k].done; });
  const skk = skkProgress_(getUserByUsername_(username));
  const skkN = skk.validatedLevel ? (SKK_LEVELS.indexOf(skk.validatedLevel) + 1) : 0;
  return Math.round(stats.count * XP.perActivity + stats.totalDistance * XP.perKm +
                    badges * XP.perBadge + skuDone * XP.perSkuItem + skkN * XP.perSkkLevel);
}
function recalcXp_(username) {
  try {
    const xp = computeXp_(username);
    const f = findUserRow_(username);
    if (f) f.sheet.getRange(f.index + 1, U.xp + 1).setValue(xp);
    return xp;
  } catch (e) { return 0; }
}
function levelFromXp_(xp) {
  const idx = Math.min(LEVEL_TITLES.length - 1, Math.floor(Math.sqrt((Number(xp) || 0) / 250)));
  const next = Math.pow(idx + 1, 2) * 250;
  const cur  = Math.pow(idx, 2) * 250;
  return { level: idx + 1, title: LEVEL_TITLES[idx], xp: Number(xp) || 0,
    nextAt: next, pct: next > cur ? Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100)) : 100 };
}
function gsGetLevel(token) {
  const username = requireSession_(token);
  return { ok: true, level: levelFromXp_(recalcXp_(username)) };
}

/* ========================================================= PENGUMUMAN */
function activeAnnouncements_() {
  return sheetRows_('Announcements')
    .filter(function (r) { return r[0] && String(r[6]).toUpperCase() !== 'FALSE'; })
    .map(function (r) { return { id: str_(r[0]), title: str_(r[1]), body: str_(r[2]), level: str_(r[3]) || 'info',
      createdBy: str_(r[4]), createdAt: str_(r[5]) }; })
    .reverse().slice(0, 10);
}
function gsAdminSaveAnnouncement(token, a) {
  const admin = requireAdmin_(token);
  const id = str_((a || {}).id) || ('ANN-' + uid_(6));
  const val = [id, str_(a.title), str_(a.body), str_(a.level) || 'info', admin.username, nowStr_(), a.active === false ? 'FALSE' : 'TRUE'];
  const sh = getSheet_('Announcements');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (str_(rows[i][0]) === id) { sh.getRange(i + 1, 1, 1, 7).setValues([val]); return { ok: true, updated: true }; }
  }
  sh.appendRow(val);
  return { ok: true, created: true, id: id };
}
function gsAdminDeleteAnnouncement(token, id) {
  requireAdmin_(token);
  const sh = getSheet_('Announcements');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (str_(rows[i][0]) === String(id)) { sh.deleteRow(i + 1); return { ok: true }; }
  throw new Error('Pengumuman tidak ditemukan.');
}


/* ==========================================================================
 * BAGIAN: 06_Admin_Report.gs
 * ========================================================================== */
/**
 * YATRA v3 — 06_Admin_Report.gs
 * Panel admin/pembina, konfigurasi SKK, validasi, dashboard, kartu, dan laporan.
 */

/* ================================================================ ADMIN */
function gsAdminListUsers(token, opts) {
  requireAdmin_(token);
  const o = opts || {};
  let list = getAllUsers_();
  if (o.regu)   list = list.filter(function (u) { return u.regu === o.regu; });
  if (o.gender) list = list.filter(function (u) { return u.gender === o.gender; });
  if (o.q) {
    const q = low_(o.q);
    list = list.filter(function (u) { return low_(u.username).indexOf(q) >= 0 || low_(u.name).indexOf(q) >= 0 || low_(u.nickname).indexOf(q) >= 0; });
  }
  // ringkas statistik per anggota
  const agg = {};
  listAllActivities_().forEach(function (a) {
    if (!agg[a.username]) agg[a.username] = { km: 0, n: 0, last: '' };
    agg[a.username].km += a.distanceKm || 0;
    agg[a.username].n++;
    if (a.date > agg[a.username].last) agg[a.username].last = a.date;
  });
  list.forEach(function (u) {
    const s = agg[u.username.toLowerCase()] || { km: 0, n: 0, last: '' };
    u.totalKm = round2(s.km); u.totalActivities = s.n; u.lastActivity = s.last;
    delete u.apiKey;   // jangan bocorkan kunci API anggota lain
  });
  return { ok: true, items: list, total: list.length };
}

function gsAdminAddUser(token, u) {
  requireAdmin_(token);
  const username = low_((u || {}).username);
  if (!/^[a-z0-9_.-]{3,}$/.test(username)) throw new Error('UserID minimal 3 karakter (huruf/angka/titik/garis).');
  if (!u.password || String(u.password).length < 6) throw new Error('Password minimal 6 karakter.');
  addUserInternal_(getSheet_('Users'), {
    username: username, password: u.password, name: u.name, nickname: u.nickname,
    golongan: u.golongan, gender: u.gender, role: (u.role === 'admin' || u.role === 'pembina') ? u.role : 'user',
    sku: u.sku, regu: u.regu, pasukan: u.pasukan, phone: u.phone
  });
  audit_(requireSession_(token), 'user_tambah', username);
  return { ok: true, username: username };
}

/** Tambah banyak anggota sekaligus dari teks CSV: userid,nama,panggilan,gender,regu */
function gsAdminBulkAddUsers(token, csv, defaultPass) {
  requireAdmin_(token);
  const sh = getSheet_('Users');
  const pass = String(defaultPass || PGL_BATCH_PASS);
  const out = { added: 0, failed: [], total: 0 };
  String(csv || '').split(/\r?\n/).forEach(function (line) {
    const t = line.trim();
    if (!t || /^userid/i.test(t)) return;
    out.total++;
    const c = t.split(/[,;\t]/).map(function (x) { return x.trim(); });
    try {
      addUserInternal_(sh, { username: low_(c[0]), password: pass, name: c[1] || c[0], nickname: c[2] || c[1] || c[0],
        golongan: 'Penggalang', gender: low_(c[3]) === 'putri' ? 'putri' : 'putra', role: 'user', regu: c[4] || '' });
      out.added++;
    } catch (e) { out.failed.push(c[0] + ': ' + (e.message || e)); }
  });
  return Object.assign({ ok: true }, out);
}

function gsAdminUpdateUser(token, username, patch) {
  requireAdmin_(token);
  const f = findUserRow_(username);
  if (!f) throw new Error('Pengguna tidak ditemukan.');
  const p = patch || {};
  const set = function (col, v) { f.sheet.getRange(f.index + 1, col + 1).setValue(v); };
  if (p.name     !== undefined) set(U.name, str_(p.name));
  if (p.nickname !== undefined) set(U.nickname, str_(p.nickname));
  if (p.golongan !== undefined) set(U.golongan, str_(p.golongan));
  if (p.gender   !== undefined) set(U.gender, low_(p.gender));
  if (p.regu     !== undefined) set(U.regu, str_(p.regu));
  if (p.pasukan  !== undefined) set(U.pasukan, str_(p.pasukan));
  if (p.sku      !== undefined) set(U.sku, low_(p.sku));
  if (p.role     !== undefined) set(U.role, ['admin', 'pembina', 'user'].indexOf(p.role) >= 0 ? p.role : 'user');
  if (p.active   !== undefined) set(U.active, p.active ? 'TRUE' : 'FALSE');
  audit_(requireSession_(token), 'user_ubah', String(username));
  return { ok: true, user: getUserByUsername_(username) };
}

function gsAdminResetPass(token, username, newPass) {
  requireAdmin_(token);
  if (!newPass || String(newPass).length < 6) throw new Error('Password baru minimal 6 karakter.');
  const f = findUserRow_(username);
  if (!f) throw new Error('Pengguna tidak ditemukan.');
  f.sheet.getRange(f.index + 1, U.password + 1).setValue(String(newPass));
  audit_(requireSession_(token), 'reset_password', String(username));
  return { ok: true };
}

function gsAdminDeleteUser(token, username) {
  const admin = requireSuperAdmin_(token);
  if (low_(username) === low_(admin.username)) throw new Error('Tidak dapat menghapus akun sendiri.');
  const f = findUserRow_(username);
  if (!f) throw new Error('Pengguna tidak ditemukan.');
  f.sheet.deleteRow(f.index + 1);
  audit_(admin.username, 'user_hapus', String(username));
  return { ok: true };
}

/* -------------------------------------------------------- KONFIGURASI SKK */
function gsAdminGetSkkConfig(token) {
  requireAdmin_(token);
  const items = sheetRows_('SKK_Config').filter(function (r) { return r[0] || r[2]; }).map(function (r) {
    return { golongan: str_(r[0]), gender: low_(r[1]), level: low_(r[2]), distanceKm: Number(r[3]) || 0,
      minTrips: Number(r[4]) || 1, enabled: String(r[5]).toUpperCase() === 'TRUE', note: str_(r[6]) };
  });
  return { ok: true, items: items };
}
function gsAdminSetSkkConfig(token, list) {
  requireAdmin_(token);
  const sh = getSheet_('SKK_Config');
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, 7).clearContent();
  const rows = (list || []).map(function (c) {
    return [str_(c.golongan), low_(c.gender), low_(c.level), Number(c.distanceKm) || 0,
      Number(c.minTrips) || 1, c.enabled ? 'TRUE' : 'FALSE', str_(c.note)];
  });
  if (rows.length) sh.getRange(2, 1, rows.length, 7).setValues(rows);
  audit_(requireSession_(token), 'skk_config', rows.length + ' baris');
  return { ok: true, saved: rows.length };
}

/* ---------------------------------------------------------- VALIDASI SKK */
function gsAdminListSkkSubmissions(token, statusFilter) {
  requireAdmin_(token);
  const users = getUsersMap_();
  let out = sheetRows_('SKK_Submissions').filter(function (r) { return r[S_.id]; }).map(function (r) {
    const u = users[low_(r[S_.username])] || {};
    const sub = { id: str_(r[S_.id]), username: low_(r[S_.username]), name: u.name || '', nickname: u.nickname || '',
      regu: u.regu || '', golongan: u.golongan || '', gender: u.gender || '',
      level: str_(r[S_.level]), label: SKK_LEVEL_LABELS[str_(r[S_.level])] || '',
      date: r[S_.date] instanceof Date ? fmtDate_(r[S_.date]) : str_(r[S_.date]),
      status: str_(r[S_.status]), folderId: str_(r[S_.folderId]), notes: str_(r[S_.notes]),
      validatedAt: str_(r[S_.validatedAt]), validatedBy: str_(r[S_.validatedBy]), feedback: str_(r[S_.feedback]),
      folderUrl: r[S_.folderId] ? ('https://drive.google.com/drive/folders/' + str_(r[S_.folderId])) : '' };
    try { sub.evidence = (skkProgress_(getUserByUsername_(sub.username)).levels
      .filter(function (l) { return l.level === sub.level; })[0] || {}).evidence || []; } catch (e) { sub.evidence = []; }
    return sub;
  });
  if (statusFilter) out = out.filter(function (o) { return o.status === statusFilter; });
  out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  return { ok: true, items: out, pending: out.filter(function (o) { return o.status === SUB_STATUS_PENDING; }).length };
}

function gsAdminValidateSkk(token, subId, status, feedback) {
  const admin = requireAdmin_(token);
  const sh = getSheet_('SKK_Submissions');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (str_(rows[i][S_.id]) === String(subId)) {
      const username = low_(rows[i][S_.username]), level = str_(rows[i][S_.level]);
      const st = [SUB_STATUS_PASSED, SUB_STATUS_REJECTED, SUB_STATUS_PENDING].indexOf(status) >= 0 ? status : SUB_STATUS_PENDING;
      sh.getRange(i + 1, S_.status + 1).setValue(st);
      sh.getRange(i + 1, S_.validatedAt + 1).setValue(st === SUB_STATUS_PENDING ? '' : nowStr_());
      sh.getRange(i + 1, S_.validatedBy + 1).setValue(st === SUB_STATUS_PENDING ? '' : (admin.name || admin.username));
      sh.getRange(i + 1, S_.feedback + 1).setValue(str_(feedback));
      if (st === SUB_STATUS_PASSED) { markUserSkkLevel_(username, level); evaluateBadges_(username); }
      recalcXp_(username);
      audit_(admin.username, 'skk_validasi', username + '/' + level + '=' + st);
      return { ok: true, status: st, username: username, level: level };
    }
  }
  throw new Error('Pengajuan tidak ditemukan.');
}

function markUserSkkLevel_(username, level) {
  const f = findUserRow_(username);
  if (!f) return;
  const cur = SKK_LEVELS.indexOf(low_(f.row[U.skkLevel]));
  const tgt = SKK_LEVELS.indexOf(low_(level));
  if (tgt >= 0 && tgt >= cur) f.sheet.getRange(f.index + 1, U.skkLevel + 1).setValue(low_(level));
}

/** Pembina memverifikasi keaslian sebuah perjalanan. */
function gsAdminVerifyActivity(token, id, verified) {
  const admin = requireAdmin_(token);
  const sh = getSheet_('Activities');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (str_(rows[i][A.id]) === String(id)) {
      sh.getRange(i + 1, A.verified + 1).setValue(verified ? 'TRUE' : 'FALSE');
      sh.getRange(i + 1, A.verifiedBy + 1).setValue(verified ? (admin.name || admin.username) : '');
      return { ok: true };
    }
  }
  throw new Error('Perjalanan tidak ditemukan.');
}

/** Statistik keseluruhan untuk dashboard admin. */
function gsAdminOverview(token, range) {
  requireAdmin_(token);
  const users = getAllUsers_().filter(function (u) { return u.role !== 'admin'; });
  const acts  = listAllActivities_().filter(function (a) { return inRange_(a.date, range || 'this_month'); });
  const active = {};
  let km = 0, min = 0;
  acts.forEach(function (a) { active[a.username] = true; km += a.distanceKm || 0; min += a.durationMin || 0; });
  const pendingSkk = sheetRows_('SKK_Submissions').filter(function (r) { return str_(r[S_.status]) === SUB_STATUS_PENDING; }).length;
  const pendingSku = sheetRows_('SKU_Progress').filter(function (r) { return str_(r[4]) === 'menunggu'; }).length;
  return { ok: true, range: range || 'this_month',
    members: users.length, activeMembers: Object.keys(active).length,
    activities: acts.length, totalKm: round2(km), totalMinutes: Math.round(min),
    pendingSkk: pendingSkk, pendingSku: pendingSku,
    regu: reguStats_(range), top: leaderboardInternal_(range).slice(0, 10) };
}

/* ============================================================= DASHBOARD */
function gsDashboard(token, range) {
  const username = requireSession_(token);
  const u = getUserByUsername_(username);
  const stats = getStatsInternal_(username, range || 'this_month');
  const all   = getStatsInternal_(username, 'all');
  const skk   = skkProgress_(u);
  const newBadges = evaluateBadges_(username);
  return { ok: true,
    user: u, stats: stats, allTime: all, skk: skk,
    trend: trendSeries_(username, 8),
    level: levelFromXp_(recalcXp_(username)),
    badges: gsGetBadges(token).items.filter(function (b) { return b.earned; }).slice(-6),
    newBadges: newBadges,
    target: { targetKm: u.targetKm || 0, distance: stats.totalDistance,
      pct: u.targetKm ? Math.min(100, Math.round(stats.totalDistance / u.targetKm * 100)) : 0 },
    announcements: activeAnnouncements_(),
    recent: listActivitiesInternal_(username).slice(0, 5)
  };
}

/* ============================================== KARTU PENCAPAIAN & EKSPOR */
function gsGetAchievement(token) {
  const username = requireSession_(token);
  const u = getUserByUsername_(username);
  const all = getStatsInternal_(username, 'all');
  const acts = listActivitiesInternal_(username);
  return { ok: true, user: u, stats: all, skk: skkProgress_(u),
    level: levelFromXp_(recalcXp_(username)),
    badges: BADGES.filter(function (b) { return !!earnedBadges_(username)[b.key]; }),
    dateRange: acts.length ? { from: acts[acts.length - 1].date, to: acts[0].date } : { from: '', to: '' },
    topType: all.topType, logo: logoDataUri_(),
    gudep: prop_('GUDEP_NAME'), pangkalan: prop_('PANGKALAN'),
    profilePhotoUrl: thumbUrl_(u.profilePhotoId, 400) };
}

function gsSaveCard(token, dataUri, label) {
  const username = requireSession_(token);
  const file = shareAnyone_(getDriveFolder_(FOLDER.CARDS)
    .createFile(dataUriToBlob_(dataUri, (label || ('kartu_' + username + '_' + todayStr_())) + '.jpg')));
  return { ok: true, url: file.getUrl(), fileId: file.getId(), size: file.getSize() };
}

function gsSaveCardPdf(token, dataUri, label, w, h) {
  requireSession_(token);
  const img = dataUriToBlob_(dataUri, 'kartu.jpg');
  const doc = DocumentApp.create(label || ('kartu_' + uid_(6)));
  const pageW = 612, pageH = 792, margin = 36;
  const iw = Number(w) || 1080, ih = Number(h) || 1350;
  const scale = Math.min((pageW - 2 * margin) / iw, (pageH - 2 * margin) / ih);
  doc.getBody().insertImage(0, img).setWidth(iw * scale).setHeight(ih * scale);
  doc.saveAndClose();
  const pdf = UrlFetchApp.fetch('https://docs.google.com/document/d/' + doc.getId() + '/export?format=pdf',
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
  const saved = shareAnyone_(getDriveFolder_(FOLDER.CARDS).createFile(pdf.setName((label || 'kartu') + '.pdf')));
  try { DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {}
  return { ok: true, url: saved.getUrl(), fileId: saved.getId(), size: saved.getSize() };
}

/* ================================================================ LAPORAN */
function gsExportReport(token, format, range) {
  const u = getUserByUsername_(requireSession_(token));
  requireCompleteProfile_(u);
  return exportReport_(u, format === 'xlsx' ? 'xlsx' : 'pdf', range || 'all');
}

function exportReport_(u, format, range) {
  const ss = SpreadsheetApp.create('YATRA_' + u.username + '_' + todayStr_());
  try {
    buildReportSheet_(ss, u, range);
    SpreadsheetApp.flush();
    const blob = exportBlob_(ss.getId(), format).setName('Laporan_YATRA_' + u.username + '_' + todayStr_() + '.' + format);
    const file = shareAnyone_(getDriveFolder_(FOLDER.REPORTS).createFile(blob));
    return { ok: true, url: file.getUrl(), fileId: file.getId(), name: file.getName(), size: file.getSize(),
      download: 'https://drive.google.com/uc?export=download&id=' + file.getId() };
  } finally {
    try { DriveApp.getFileById(ss.getId()).setTrashed(true); } catch (e) {}
  }
}

function buildReportSheet_(ss, u, range) {
  const acts  = listActivitiesInternal_(u.username).filter(function (a) { return inRange_(a.date, range); });
  const stats = getStatsInternal_(u.username, range);
  const skk   = skkProgress_(u);

  const sh = ss.getSheets()[0].setName('Laporan');
  const head = [
    ['LAPORAN PERJALANAN — YATRA'],
    [prop_('GUDEP_NAME') + ' • ' + prop_('PANGKALAN')],
    [''],
    ['UserID', u.username, '', 'Nama', u.name],
    ['Panggilan', u.nickname, '', 'Regu', u.regu],
    ['Golongan', u.golongan + ' (' + u.gender + ')', '', 'SKU', SKU_LABELS[u.sku] || '-'],
    ['SKK Gerak Jalan', skk.validatedLabel || 'Belum tervalidasi', '', 'Dicetak', nowStr_()],
    [''],
    ['REKAP'],
    ['Jumlah perjalanan', stats.count, '', 'Total jarak (km)', stats.totalDistance],
    ['Total durasi (menit)', stats.totalDuration, '', 'Total elevasi (m)', stats.totalElevation],
    ['Rata-rata kecepatan (km/jam)', stats.avgSpeed, '', 'Hari aktif', stats.activeDays],
    ['']
  ];
  sh.getRange(1, 1, head.length, 5).setValues(head.map(function (r) {
    const a = r.slice(); while (a.length < 5) a.push(''); return a;
  }));
  sh.getRange(1, 1, 1, 5).merge().setFontSize(16).setFontWeight('bold');
  sh.getRange(2, 1, 1, 5).merge().setFontColor('#666');
  sh.getRange(9, 1).setFontWeight('bold');

  const start = head.length + 1;
  const cols = ['No', 'Tanggal', 'Jenis', 'Judul', 'Jarak (km)', 'Durasi (mnt)', 'Kecepatan', 'Lokasi', 'Terverifikasi', 'Catatan'];
  sh.getRange(start, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#fc4c02').setFontColor('#fff');
  if (acts.length) {
    const rows = acts.map(function (a, i) {
      return [i + 1, a.date, typeLabel_(a.type), a.title, a.distanceKm || '', a.durationMin || '',
        a.avgSpeed || '', a.location, a.verified ? 'Ya' : '-', a.notes];
    });
    sh.getRange(start + 1, 1, rows.length, cols.length).setValues(rows);
  }
  sh.autoResizeColumns(1, cols.length);
  sh.setFrozenRows(start);

  // Lembar SKK
  const sh2 = ss.insertSheet('SKK');
  sh2.getRange(1, 1, 1, 6).setValues([['Tingkat', 'Jarak Syarat (km)', 'Min. Perjalanan', 'Tercapai', 'Status', 'Catatan']])
     .setFontWeight('bold').setBackground('#fc4c02').setFontColor('#fff');
  if (skk.levels.length) {
    sh2.getRange(2, 1, skk.levels.length, 6).setValues(skk.levels.map(function (l) {
      return [l.label, l.distanceKm, l.minTrips, l.trips, l.reached ? 'Syarat terpenuhi' : 'Belum', l.note];
    }));
  }
  sh2.autoResizeColumns(1, 6);
  return ss;
}

function exportBlob_(fileId, format) {
  const url = 'https://docs.google.com/spreadsheets/d/' + fileId + '/export?format=' + (format === 'xlsx' ? 'xlsx' : 'pdf') +
              '&portrait=true&fitw=true&gridlines=false';
  return UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
}
function typeLabel_(k) {
  const t = ACTIVITY_TYPES.filter(function (x) { return x.key === k; })[0];
  return t ? t.label : k;
}

/** Laporan gabungan seluruh anggota (khusus admin/pembina). */
function gsAdminExportAll(token, format, range) {
  requireAdmin_(token);
  const ss = SpreadsheetApp.create('YATRA_Rekap_' + todayStr_());
  try {
    const users = getUsersMap_();
    const acts = listAllActivities_().filter(function (a) { return inRange_(a.date, range || 'all'); });
    const sh = ss.getSheets()[0].setName('Rekap');
    const cols = ['Tanggal', 'UserID', 'Nama', 'Regu', 'Jenis', 'Judul', 'Jarak (km)', 'Durasi (mnt)', 'Lokasi', 'Verifikasi'];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#fc4c02').setFontColor('#fff');
    if (acts.length) {
      sh.getRange(2, 1, acts.length, cols.length).setValues(acts.map(function (a) {
        const u = users[a.username] || {};
        return [a.date, a.username, u.name || '', u.regu || '', typeLabel_(a.type), a.title,
          a.distanceKm || '', a.durationMin || '', a.location, a.verified ? 'Ya' : '-'];
      }));
    }
    sh.setFrozenRows(1); sh.autoResizeColumns(1, cols.length);

    const sh2 = ss.insertSheet('Peringkat Regu');
    sh2.getRange(1, 1, 1, 6).setValues([['Peringkat', 'Regu', 'Anggota', 'Aktif', 'Total km', 'Partisipasi %']])
       .setFontWeight('bold').setBackground('#fc4c02').setFontColor('#fff');
    const rs = reguStats_(range || 'all');
    if (rs.length) sh2.getRange(2, 1, rs.length, 6).setValues(rs.map(function (r) {
      return [r.rank, r.regu, r.members, r.activeMembers, r.distanceKm, r.participation];
    }));

    SpreadsheetApp.flush();
    const blob = exportBlob_(ss.getId(), format === 'xlsx' ? 'xlsx' : 'pdf')
      .setName('Rekap_YATRA_' + todayStr_() + '.' + (format === 'xlsx' ? 'xlsx' : 'pdf'));
    const file = shareAnyone_(getDriveFolder_(FOLDER.REPORTS).createFile(blob));
    return { ok: true, url: file.getUrl(), fileId: file.getId(), name: file.getName() };
  } finally {
    try { DriveApp.getFileById(ss.getId()).setTrashed(true); } catch (e) {}
  }
}


/* ==========================================================================
 * BAGIAN: 07_Router.gs
 * ========================================================================== */
/**
 * YATRA v3 — 07_Router.gs
 * Titik masuk Web App: HTML (mode Apps Script) & JSON API (mode PWA/Vercel).
 */

/* ------------------------------------------------------------- HTML VIEW */
function doGet(e) {
  try { pendingSetup_(); } catch (err) { Logger.log('doGet setup: ' + err); }
  const page = (e && e.parameter && e.parameter.page) || 'Index';
  if (page === 'health') return jsonOut_(healthPayload_());
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle(APP_NAME + ' — ' + APP_TAGLINE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('theme-color', '#fc4c02')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
/** Dipakai Index.html: <?!= include('style') ?> */
function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

function healthPayload_() {
  return { ok: true, app: APP_NAME, version: APP_VERSION, time: nowStr_(), tz: getTimeZone_(), plaintext: PASSWORD_PLAINTEXT };
}
function gsPing() { return healthPayload_(); }

/** Admin: unduh ulang logo dari GitHub ke Drive (pakai bila logo diganti). */
function gsAdminRefreshLogo(token) {
  requireAdmin_(token);
  const id = refreshLogo_();
  return id ? { ok: true, data: { fileId: id } }
            : { ok: false, error: 'Logo gagal diunduh. Periksa URL atau izin UrlFetch.' };
}

/** Admin: rapikan struktur folder Drive (buat yang kurang, pindahkan yang tercecer). */
function gsAdminEnsureFolders(token) {
  requireAdmin_(token);
  return { ok: true, data: ensureFolders_() };
}
function appVersion() { return healthPayload_(); }

/* ------------------------------------------------------------ JSON API */
/** Semua fungsi yang boleh dipanggil lintas-origin lewat proxy /api/<fn>. */
const API_FUNCTIONS = [
  'gsAdminEnsureFolders', 'gsAdminRefreshLogo',
  'gsPing', 'gsLogin', 'gsLogout', 'gsCurrentUser', 'gsInitData',
  'gsSaveProfile', 'gsSaveProfilePhoto', 'gsSetTarget', 'gsChangePassword',
  'gsMyApiKey', 'gsRegenerateApiKey',
  'gsAddActivity', 'gsListActivities', 'gsGetActivity', 'gsUpdateActivity', 'gsDeleteActivity',
  'gsGetStats', 'gsReverseGeocode', 'gsPhotoUrl', 'gsRouteUrl', 'gsProfilePhotoUrl', 'gsGenerateRouteImage',
  'gsGetSkk', 'gsSkkSubmit', 'gsSkkMySubmissions',
  'gsGetSku', 'gsSkuClaim', 'gsSkuValidate', 'gsAdminListSkuClaims',
  'gsListRegu', 'gsReguLeaderboard', 'gsAdminSaveRegu', 'gsAdminDeleteRegu',
  'gsGetBadges', 'gsGetLevel',
  'gsLeaderboard', 'gsLeadership', 'gsDashboard', 'gsGetAchievement',
  'gsSaveCard', 'gsSaveCardPdf', 'gsExportReport',
  'gsAdminListUsers', 'gsAdminAddUser', 'gsAdminBulkAddUsers', 'gsAdminUpdateUser',
  'gsAdminResetPass', 'gsAdminDeleteUser', 'gsAdminOverview',
  'gsAdminGetSkkConfig', 'gsAdminSetSkkConfig', 'gsAdminListSkkSubmissions', 'gsAdminValidateSkk',
  'gsAdminVerifyActivity', 'gsAdminExportAll',
  'gsAdminSaveAnnouncement', 'gsAdminDeleteAnnouncement'
];

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
  const fn = String(body.fn || 'gsPing');
  try {
    if (fn === 'ping' || fn === 'version') return jsonOut_(healthPayload_());

    // Integrasi pihak ketiga (Strava/Garmin/otomasi) memakai API key, bukan sesi.
    if (fn === 'importActivity') {
      const user = findByApiKey_(body.apiKey);
      if (!user) return jsonOut_({ ok: false, error: 'API key tidak valid.' });
      return jsonOut_(addActivityForUser_(user.username, body.payload || {}));
    }

    if (API_FUNCTIONS.indexOf(fn) < 0) return jsonOut_({ ok: false, error: 'Fungsi "' + fn + '" tidak dikenal.' });
    const args = Array.isArray(body.args) ? body.args : [];
    const handler = globalThis[fn];
    if (typeof handler !== 'function') return jsonOut_({ ok: false, error: 'Handler "' + fn + '" tidak tersedia.' });
    const result = handler.apply(null, [String(body.token || '')].concat(args));
    return jsonOut_(normalize_(result));
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message || err) });
  }
}

/** Pastikan hasil selalu objek ber-flag ok agar klien konsisten. */
function normalize_(r) {
  if (r === undefined || r === null) return { ok: true };
  if (typeof r !== 'object') return { ok: true, value: r };
  if (Array.isArray(r)) return { ok: true, items: r };
  if (r.ok === undefined) r.ok = true;
  return r;
}
function jsonOut_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* --------------------------------------------------------------- TRIGGER */
/** Pasang trigger pemeliharaan harian (jalankan sekali dari editor). */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['cleanupSessions', 'dailyMaintenance'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyMaintenance').timeBased().atHour(2).everyDays(1).create();
  return { ok: true, message: 'Trigger harian dipasang pukul 02.00.' };
}
function dailyMaintenance() {
  const res = { sessions: cleanupSessions() };
  try {
    let n = 0;
    getAllUsers_().forEach(function (u) { if (u.role !== 'admin') { evaluateBadges_(u.username); recalcXp_(u.username); n++; } });
    res.recalculated = n;
  } catch (e) { res.error = String(e); }
  Logger.log(JSON.stringify(res));
  return res;
}
