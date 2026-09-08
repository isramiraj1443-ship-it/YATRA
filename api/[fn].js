/**
 * YATRA v3 — Serverless proxy (Vercel Functions)
 *
 * Meneruskan POST /api/<fn> ke Web App Apps Script (/exec) sehingga frontend
 * PWA bebas dari masalah CORS dan URL Apps Script tidak terekspos ke klien.
 *
 * Variabel lingkungan yang diperlukan (Vercel → Settings → Environment Variables):
 *   GAS_WEB_APP_URL = https://script.google.com/macros/s/AKfycb.../exec
 */

const GAS_URL = process.env.GAS_WEB_APP_URL || '';
const TIMEOUT_MS = 55000;

/** Fungsi yang boleh dipanggil dari klien (allowlist, harus sama dengan API_FUNCTIONS di Apps Script). */
const ALLOWED = new Set([
  'gsAdminEnsureFolders',
  'gsAdminRefreshLogo',
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
]);

export const config = {
  api: { bodyParser: { sizeLimit: '6mb' } }   // cukup untuk 5 foto @200 KB base64
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Gunakan metode POST.' });
  }
  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: 'GAS_WEB_APP_URL belum diatur pada environment variable.' });
  }

  const fn = String(req.query.fn || (req.body && req.body.fn) || '');
  if (!ALLOWED.has(fn)) {
    return res.status(400).json({ ok: false, error: `Fungsi "${fn}" tidak diizinkan.` });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const payload = { fn, token: body.token || '', args: Array.isArray(body.args) ? body.args : [] };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: ctrl.signal
    });
    const text = await upstream.text();
    try {
      return res.status(200).json(JSON.parse(text));
    } catch {
      // Apps Script kadang mengembalikan HTML (mis. halaman izin/login Google)
      return res.status(502).json({
        ok: false,
        error: 'Respons Apps Script tidak valid. Pastikan Web App di-deploy dengan akses "Anyone".',
        hint: text.slice(0, 200)
      });
    }
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    return res.status(aborted ? 504 : 502).json({
      ok: false,
      error: aborted ? 'Server Apps Script tidak merespons tepat waktu.' : 'Gagal menghubungi Apps Script.'
    });
  } finally {
    clearTimeout(timer);
  }
}
