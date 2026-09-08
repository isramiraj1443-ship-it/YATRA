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
