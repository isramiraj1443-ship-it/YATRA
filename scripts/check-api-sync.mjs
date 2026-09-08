#!/usr/bin/env node
/**
 * Memastikan allowlist fungsi API identik di tiga tempat:
 *   1. API_FUNCTIONS di apps-script/07_Router.gs
 *   2. ALLOWED       di api/[fn].js
 *   3. Fungsi gs* yang benar-benar didefinisikan di apps-script/*.gs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const names = (src, marker) => {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error(`Penanda "${marker}" tidak ditemukan.`);
  const block = src.slice(i, src.indexOf(marker.includes('Set') ? ']);' : '];', i));
  return new Set([...block.matchAll(/'(gs[A-Za-z0-9_]+)'/g)].map((m) => m[1]));
};

const router = names(read('apps-script/07_Router.gs'), 'const API_FUNCTIONS = [');
const proxy  = names(read('api/[fn].js'), 'const ALLOWED = new Set([');

const defined = new Set();
readdirSync(join(root, 'apps-script'))
  .filter((f) => f.endsWith('.gs'))
  .forEach((f) => {
    for (const m of read(`apps-script/${f}`).matchAll(/^function (gs[A-Za-z0-9_]+)\s*\(/gm)) defined.add(m[1]);
  });

const diff = (a, b) => [...a].filter((x) => !b.has(x));
const problems = [];

const missingInProxy  = diff(router, proxy);
const missingInRouter = diff(proxy, router);
const notImplemented  = diff(router, defined);

if (missingInProxy.length)  problems.push(`Ada di 07_Router.gs tapi tidak di api/[fn].js: ${missingInProxy.join(', ')}`);
if (missingInRouter.length) problems.push(`Ada di api/[fn].js tapi tidak di 07_Router.gs: ${missingInRouter.join(', ')}`);
if (notImplemented.length)  problems.push(`Terdaftar tapi fungsinya tidak ada: ${notImplemented.join(', ')}`);

if (problems.length) {
  problems.forEach((p) => console.error('❌ ' + p));
  process.exit(1);
}
console.log(`✅ Allowlist API sinkron (${router.size} fungsi).`);
