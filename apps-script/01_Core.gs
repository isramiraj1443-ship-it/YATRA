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
function cacheLogo_() {
  try {
    const folder = getDriveFolder_(FOLDER.ASSETS);
    const fl = folder.getFilesByName('yatra_logo.png');
    if (fl.hasNext()) return fl.next().getId();
    const url = LOGO_URL_();
    if (!url) return '';
    const blob = UrlFetchApp.fetch(url).getBlob().setName('yatra_logo.png');
    return shareAnyone_(folder.createFile(blob)).getId();
  } catch (e) { return ''; }
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
