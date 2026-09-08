#!/usr/bin/env node
/**
 * check-repo.mjs — Pastikan repo lengkap SEBELUM di-push ke GitHub.
 *
 * Dibuat setelah menemukan repo ter-upload tanpa manifest.webmanifest,
 * sw.js, offline.html, folder apps-script/, dan scripts/ — sehingga PWA
 * gagal dipasang dan semua perintah npm error.
 *
 * Jalankan: npm run check:repo
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const p = (f) => join(ROOT, f);

let fail = 0;
let warn = 0;

const bad = (m) => { fail++; console.log(`  ❌ ${m}`); };
const wrn = (m) => { warn++; console.log(`  ⚠️  ${m}`); };
const ok  = (m) => console.log(`  ✅ ${m}`);

console.log('\n🔍 Memeriksa kelengkapan repo\n');

/* 1. Berkas wajib ---------------------------------------------------- */
console.log('1) Berkas wajib');
const REQUIRED = [
  'index.html', 'offline.html', 'manifest.webmanifest', 'sw.js',
  'css/app.css',
  'js/api.js', 'js/utils.js', 'js/charts.js', 'js/tracker.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'icons/icon-inline.png',
  'api/[fn].js',
  'apps-script/00_Config.gs', 'apps-script/01_Core.gs', 'apps-script/02_Auth.gs',
  'apps-script/03_Activity.gs', 'apps-script/04_SKK_SKU.gs',
  'apps-script/05_Regu_Gamifikasi.gs', 'apps-script/06_Admin_Report.gs',
  'apps-script/07_Router.gs', 'apps-script/Index.html', 'apps-script/appsscript.json',
  'dist/Code.gs',
  'scripts/build-gas.mjs', 'scripts/build-single.mjs',
  'scripts/check-globals.mjs', 'scripts/check-api-sync.mjs', 'scripts/smoke-test.mjs',
  'package.json', 'vercel.json', 'README.md', 'LICENSE', '.gitignore', '.env.example'
];
const missing = REQUIRED.filter((f) => !existsSync(p(f)));
if (missing.length) missing.forEach((f) => bad(`HILANG: ${f}`));
else ok(`${REQUIRED.length} berkas wajib lengkap`);

/* 2. Semua rujukan di index.html benar-benar ada ---------------------- */
console.log('\n2) Rujukan index.html');
if (existsSync(p('index.html'))) {
  const html = readFileSync(p('index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="(\/[^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !u.startsWith('//'));
  const uniq = [...new Set(refs)];
  const broken = uniq.filter((u) => !existsSync(p(u.replace(/^\//, ''))));
  if (broken.length) broken.forEach((u) => bad(`rujukan mati: ${u}`));
  else ok(`${uniq.length} rujukan lokal semuanya ada`);
}

/* 3. Service worker terdaftar & aset cache-nya ada -------------------- */
console.log('\n3) Service worker');
if (existsSync(p('sw.js'))) {
  const sw = readFileSync(p('sw.js'), 'utf8');
  const assets = [...sw.matchAll(/'(\/[^']*)'/g)]
    .map((m) => m[1])
    .filter((u) => /\.(html|css|js|png|webmanifest)$/.test(u));
  const broken = [...new Set(assets)].filter((u) => !existsSync(p(u.replace(/^\//, ''))));
  if (broken.length) broken.forEach((u) => bad(`sw.js menyimpan aset tak ada: ${u}`));
  else ok(`${assets.length} aset precache valid`);
} else bad('sw.js tidak ada — PWA tidak bisa offline / tidak bisa dipasang');

/* 4. Manifest PWA ----------------------------------------------------- */
console.log('\n4) Manifest PWA');
if (existsSync(p('manifest.webmanifest'))) {
  try {
    const m = JSON.parse(readFileSync(p('manifest.webmanifest'), 'utf8'));
    ['name', 'short_name', 'start_url', 'display', 'icons'].forEach((k) => {
      if (!m[k]) bad(`manifest tanpa field "${k}"`);
    });
    const brokenIcons = (m.icons || []).filter((i) => !existsSync(p(i.src.replace(/^\//, ''))));
    brokenIcons.forEach((i) => bad(`ikon manifest tidak ada: ${i.src}`));
    if (!(m.icons || []).some((i) => (i.purpose || '').includes('maskable')))
      wrn('tidak ada ikon "maskable" — ikon bisa terpotong di Android');
    if (!brokenIcons.length) ok(`manifest valid, ${(m.icons || []).length} ikon`);
  } catch (e) { bad('manifest.webmanifest bukan JSON valid'); }
} else bad('manifest.webmanifest tidak ada — PWA tidak bisa di-install');

/* 5. package.json: skrip menunjuk berkas yang ada --------------------- */
console.log('\n5) package.json');
try {
  const pkg = JSON.parse(readFileSync(p('package.json'), 'utf8'));
  const files = [...new Set(
    Object.values(pkg.scripts || {}).flatMap((c) => c.match(/scripts\/[\w.-]+\.mjs/g) || [])
  )];
  const broken = files.filter((f) => !existsSync(p(f)));
  if (broken.length) broken.forEach((f) => bad(`skrip npm menunjuk berkas tak ada: ${f}`));
  else ok(`${files.length} skrip npm menunjuk berkas yang valid`);
} catch (e) { bad('package.json tidak dapat dibaca'); }

/* 6. Index.html hasil build sinkron ----------------------------------- */
console.log('\n6) Sinkronisasi build');
if (existsSync(p('apps-script/Index.html')) && existsSync(p('js/app.js'))) {
  const built = readFileSync(p('apps-script/Index.html'), 'utf8');
  const appJs = readFileSync(p('js/app.js'), 'utf8');
  const probe = appJs.split('\n').find((l) => l.includes('function') && l.length > 40);
  if (probe && !built.includes(probe.trim().slice(0, 40)))
    wrn('apps-script/Index.html mungkin usang — jalankan npm run build:gas');
  else ok('Index.html tampak sinkron');
}

/* 7. Rahasia tidak ikut ter-commit ------------------------------------ */
console.log('\n7) Keamanan');
['.env', '.env.local', '.clasprc.json', 'apps-script/.clasp.json'].forEach((f) => {
  if (existsSync(p(f))) {
    const gi = existsSync(p('.gitignore')) ? readFileSync(p('.gitignore'), 'utf8') : '';
    const covered = /^\.env(\.\*)?$/m.test(gi) || gi.includes(f);
    if (!covered) bad(`${f} ada tapi TIDAK diabaikan .gitignore`);
  }
});
const gasUrl = /AKfycb[A-Za-z0-9_-]{20,}/;
const codeFiles = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(js|mjs|gs|json|html)$/.test(e.name)) codeFiles.push(full);
  }
})(ROOT);
const leaked = codeFiles.filter((f) => gasUrl.test(readFileSync(f, 'utf8')));
if (leaked.length) leaked.forEach((f) => bad(`URL deployment ter-hardcode: ${f.replace(ROOT + '/', '')}`));
else ok('tidak ada URL deployment di dalam kode');

/* Hasil ---------------------------------------------------------------- */
console.log('\n' + '─'.repeat(50));
if (fail) console.log(`❌ ${fail} masalah${warn ? `, ${warn} peringatan` : ''} — perbaiki sebelum push.`);
else console.log(`✅ Repo lengkap dan siap di-push${warn ? ` (${warn} peringatan)` : ''}.`);
console.log('─'.repeat(50) + '\n');
process.exit(fail ? 1 : 0);
