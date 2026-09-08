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
