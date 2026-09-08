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
