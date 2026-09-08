#!/usr/bin/env node
/**
 * YATRA — check-globals.mjs
 *
 * Apps Script menggabungkan SEMUA file .gs ke dalam satu global scope.
 * Dua deklarasi `const`/`let`/`function` dengan nama sama di file berbeda
 * menyebabkan seluruh proyek gagal dimuat:
 *
 *     SyntaxError: Identifier 'X' has already been declared
 *
 * Skrip ini memeriksa tabrakan tersebut di antara file apps-script/*.gs,
 * dan (opsional) terhadap file lama yang ingin Anda bandingkan.
 *
 * Pakai:
 *   node scripts/check-globals.mjs
 *   node scripts/check-globals.mjs /path/ke/Code.gs      # cek konflik dgn file lama
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Buang komentar & string agar tidak salah deteksi. */
function strip(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')          // komentar blok
    .replace(/(^|[^:])\/\/.*$/gm, '$1')        // komentar baris
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")       // string '
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')       // string "
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');      // template
}

/** Ambil hanya deklarasi TOP-LEVEL (kolom 0, tanpa indentasi). */
function topLevelDeclarations(src) {
  const out = new Map();
  strip(src).split('\n').forEach((line, i) => {
    let m = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/.exec(line);
    if (m) { out.set(m[1], { line: i + 1, kind: 'variabel' }); return; }
    m = /^function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(line);
    if (m) out.set(m[1], { line: i + 1, kind: 'fungsi' });
  });
  return out;
}

const files = readdirSync(join(root, 'apps-script'))
  .filter((f) => f.endsWith('.gs'))
  .sort();

const owner = new Map();     // identifier -> [{file, line, kind}]
files.forEach((f) => {
  topLevelDeclarations(readFileSync(join(root, 'apps-script', f), 'utf8'))
    .forEach((info, name) => {
      if (!owner.has(name)) owner.set(name, []);
      owner.get(name).push({ file: f, ...info });
    });
});

let failed = false;

// 1) Tabrakan antar file baru
const internal = [...owner.entries()].filter(([, v]) => v.length > 1);
if (internal.length) {
  failed = true;
  console.error('❌ Identifier global ganda di dalam apps-script/:');
  internal.forEach(([name, list]) => {
    console.error(`   ${name} (${list[0].kind})`);
    list.forEach((l) => console.error(`      ${l.file}:${l.line}`));
  });
} else {
  console.log(`✅ Tidak ada tabrakan global di ${files.length} file (${owner.size} identifier).`);
}

// 2) Tabrakan dengan file lama yang diberikan lewat argumen
const legacy = process.argv[2];
if (legacy) {
  if (!existsSync(legacy)) {
    console.error(`\n❌ Berkas tidak ditemukan: ${legacy}`);
    process.exit(1);
  }
  const old = topLevelDeclarations(readFileSync(legacy, 'utf8'));
  const clashes = [...old.keys()].filter((n) => owner.has(n));
  console.log(`\n🔎 Membandingkan dengan ${basename(legacy)} (${old.size} identifier top-level)`);
  if (clashes.length) {
    failed = true;
    console.error(`❌ ${clashes.length} identifier bentrok — file lama TIDAK boleh berada di proyek yang sama:\n`);
    clashes.forEach((n) => {
      const a = old.get(n);
      const b = owner.get(n)[0];
      console.error(`   ${n.padEnd(24)} ${basename(legacy)}:${String(a.line).padEnd(5)} ⟷ ${b.file}:${b.line}`);
    });
    console.error('\n👉 Hapus berkas lama tersebut dari editor Apps Script (Files → ⋮ → Delete file).');
  } else {
    console.log('✅ Tidak ada bentrokan dengan berkas lama.');
  }
}

process.exit(failed ? 1 : 0);
