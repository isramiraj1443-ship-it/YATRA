#!/usr/bin/env node
/**
 * YATRA — build-gas.mjs
 * Menggabungkan index.html + CSS + JS menjadi satu berkas
 * apps-script/Index.html agar bisa disajikan HtmlService.
 *
 * Jalankan:  npm run build:gas
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// Logo ditanam sebagai data URI: Index.html jadi mandiri, tampil instan,
// dan tidak rusak bila GitHub tidak dapat diakses dari jaringan sekolah.
const LOGO_FILE = join(root, 'icons', 'icon-inline.png');
const LOGO_DATA_URI =
  'data:image/png;base64,' + readFileSync(LOGO_FILE).toString('base64');
const SCRIPTS  = ['api', 'utils', 'charts', 'tracker', 'app'];

let html = read('index.html');
const css = read('css/app.css');
const js  = SCRIPTS.map((n) => `/* ---- ${n}.js ---- */\n` + read(`js/${n}.js`)).join('\n\n');

// Hapus tautan yang tidak berlaku di HtmlService (tidak ada path statis)
html = html
  .replace(/<link rel="manifest"[^>]*>\s*/g, '')
  .replace(/<link rel="(icon|apple-touch-icon)"[^>]*>\s*/g, '')
  .replace('<link rel="stylesheet" href="/css/app.css">', `<style>\n${css}\n</style>`);

SCRIPTS.forEach((n) => {
  html = html.replace(new RegExp(`<script src="/js/${n}\\.js" defer></script>\\s*`, 'g'), '');
});

html = html
  .replace(/src="\/icons\/icon-192\.png"/g, `src="${LOGO_DATA_URI}"`)
  .replace('</body>', `<script>\n${js}\n</script>\n</body>`);

writeFileSync(join(root, 'apps-script/Index.html'), html);
console.log(`✅ apps-script/Index.html dibuat (${(html.length / 1024).toFixed(1)} KB)`);
