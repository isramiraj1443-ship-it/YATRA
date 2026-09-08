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
