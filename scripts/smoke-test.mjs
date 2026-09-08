#!/usr/bin/env node
/**
 * smoke-test.mjs — Uji cepat Web App Apps Script yang sudah di-deploy.
 *
 * Pakai:
 *   node scripts/smoke-test.mjs                 (baca GAS_WEB_APP_URL dari .env.local)
 *   node scripts/smoke-test.mjs <url-exec>
 *
 * Catatan penting soal Apps Script:
 * Web App SELALU membalas POST dengan HTTP 302 ke script.googleusercontent.com.
 * Itu normal, bukan error. fetch() dengan redirect:'follow' menanganinya otomatis
 * (POST berubah jadi GET saat mengikuti 302 — memang begitu yang diharapkan GAS).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function readEnvUrl() {
  for (const f of ['.env.local', '.env']) {
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(/^GAS_WEB_APP_URL\s*=\s*(.+)$/m);
    if (m) return m[1].trim();
  }
  return process.env.GAS_WEB_APP_URL || '';
}

const URL_EXEC = process.argv[2] || readEnvUrl();

if (!URL_EXEC || !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(URL_EXEC)) {
  console.error('❌ URL Web App tidak valid atau belum diatur.');
  console.error('   Harus berformat: https://script.google.com/macros/s/AKfycb.../exec');
  process.exit(1);
}

const TIMEOUT = 60000;

async function call(fn, args = [], token = '') {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(URL_EXEC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fn, token, args }),
      redirect: 'follow',
      signal: ctrl.signal
    });
    const text = await r.text();
    try {
      return { http: r.status, json: JSON.parse(text) };
    } catch {
      return { http: r.status, html: text.slice(0, 160) };
    }
  } finally {
    clearTimeout(t);
  }
}

let pass = 0;
let fail = 0;

function check(label, ok, detail) {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
  }
}

console.log(`\n🔍 Menguji: ${URL_EXEC}\n`);

// 1. doGet health
console.log('1) doGet ?page=health');
try {
  const r = await fetch(URL_EXEC + '?page=health', { redirect: 'follow' });
  const j = await r.json();
  check('Backend hidup', j.ok === true, `v${j.version} • ${j.tz}`);
  check('Versi 3.x', String(j.version || '').startsWith('3.'), `versi=${j.version}`);
} catch (e) {
  check('Backend hidup', false, String(e.message || e));
}

// 2. gsPing
console.log('\n2) doPost gsPing');
const ping = await call('gsPing');
check('gsPing menjawab', ping.json?.ok === true, ping.html ? 'dapat HTML — cek akses "Anyone"' : `v${ping.json?.version}`);

// 3. Login admin
console.log('\n3) Login');
const admin = await call('gsLogin', ['admin', 'admin123']);
check('Login admin', admin.json?.ok === true, admin.json?.user?.name);
const token = admin.json?.token || '';

const salah = await call('gsLogin', ['admin', 'password-salah']);
check('Password salah ditolak', salah.json?.ok === false, salah.json?.error);

// 4. Sesi
if (token) {
  console.log('\n4) Sesi & data');
  const me = await call('gsCurrentUser', [], token);
  check('Token sesi valid', me.json?.ok === true, me.json?.user?.role);

  const init = await call('gsInitData', [], token);
  check('gsInitData', init.json?.ok === true);

  const dash = await call('gsDashboard', [], token);
  check('gsDashboard', dash.json?.ok === true);

  const board = await call('gsLeaderboard', [], token);
  check('gsLeaderboard', board.json?.ok === true);
}

// 5. Keamanan
console.log('\n5) Keamanan');
const priv = await call('getSheet_');
check('Fungsi internal diblokir', priv.json?.ok === false, priv.json?.error);

const noTok = await call('gsDashboard', [], 'token-palsu');
check('Token palsu ditolak', noTok.json?.ok === false, noTok.json?.error);

console.log(`\n${'─'.repeat(46)}`);
console.log(`Hasil: ${pass} lulus, ${fail} gagal`);
console.log('─'.repeat(46) + '\n');
process.exit(fail > 0 ? 1 : 0);
