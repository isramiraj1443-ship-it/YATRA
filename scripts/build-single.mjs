#!/usr/bin/env node
/**
 * build-single.mjs — Gabungkan 8 berkas .gs menjadi SATU berkas Code.gs.
 *
 * Tujuan: pengguna yang sudah punya Code.gs lama cukup MENIMPA isinya
 * (Ctrl+A lalu tempel), tanpa perlu membuat 8 berkas baru. Dengan begitu
 * error "Identifier 'APP_VERSION' has already been declared" tidak mungkin
 * terjadi, karena tidak ada dua berkas yang mendeklarasikan hal yang sama.
 *
 * Keluaran: dist/Code.gs
 * Jalankan: npm run build:single
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'apps-script');
const OUT_DIR = join(ROOT, 'dist');

const files = readdirSync(SRC)
  .filter((f) => f.endsWith('.gs'))
  .sort(); // 00_Config .. 07_Router

if (files.length === 0) {
  console.error('❌ Tidak ada berkas .gs di apps-script/');
  process.exit(1);
}

const version =
  (readFileSync(join(SRC, '00_Config.gs'), 'utf8').match(
    /^const APP_VERSION\s*=\s*'([^']+)'/m
  ) || [, '?'])[1];

const header = `/**
 * ============================================================================
 *  YATRA v${version} — Pencatat Perjalanan Pramuka Penggalang
 *  BERKAS TUNGGAL (hasil gabungan otomatis dari ${files.length} modul)
 * ============================================================================
 *
 *  CARA PAKAI
 *  ----------
 *  1. Buka proyek Apps Script Anda.
 *  2. Buka berkas Code.gs, tekan Ctrl+A, lalu tempel SELURUH isi berkas ini.
 *  3. Pastikan TIDAK ADA berkas .gs lain di proyek. Proyek yang benar hanya
 *     berisi: Code.gs, Index.html, appsscript.json.
 *  4. Jalankan fungsi setup() sekali, lalu Deploy > New deployment > Web app.
 *
 *  JANGAN EDIT BERKAS INI LANGSUNG.
 *  Berkas ini dibangkitkan oleh: npm run build:single
 *  Sunting sumbernya di apps-script/*.gs, lalu jalankan ulang perintah itu.
 *
 *  Dibangkitkan: ${new Date().toISOString()}
 * ============================================================================
 */

`;

const parts = files.map((f) => {
  let code = readFileSync(join(SRC, f), 'utf8');

  // Buang header blok komentar pembuka tiap modul agar tidak berulang-ulang,
  // tetapi simpan nama modulnya sebagai penanda bagian.
  code = code.replace(/^\uFEFF/, '').trim();

  const banner =
    '/* ' +
    '='.repeat(74) +
    '\n' +
    ` * BAGIAN: ${f}\n` +
    ' * ' +
    '='.repeat(74) +
    ' */\n';

  return banner + code + '\n';
});

const bundle = header + parts.join('\n\n');

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, 'Code.gs');
writeFileSync(outPath, bundle, 'utf8');

const kb = (Buffer.byteLength(bundle, 'utf8') / 1024).toFixed(1);
const lines = bundle.split('\n').length;
console.log(`✅ dist/Code.gs dibuat — ${kb} KB, ${lines} baris, dari ${files.length} modul:`);
files.forEach((f) => console.log(`   • ${f}`));
