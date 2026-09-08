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
const LOGO_URL             = 'https://cdn.phototourl.com/free/2026-09-08-377dd3b3-e2f2-4ffa-9b25-41d7fcd91f78.png';

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
