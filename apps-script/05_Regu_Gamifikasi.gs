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
