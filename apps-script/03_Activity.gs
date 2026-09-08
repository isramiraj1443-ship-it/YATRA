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
