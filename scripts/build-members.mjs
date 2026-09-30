// Membuat versi "member" situs: semua halaman HTML dienkripsi dengan StatiCrypt.
// Jalankan SETELAH `astro build` (hasilnya ada di dist/):
//
//   STATICRYPT_PASSWORD="..." STATICRYPT_SALT="<32 hex>" npm run build:members
//
// Keluaran ada di dist-members/. Folder itulah yang di-deploy, bukan dist/.
//
// Yang dilakukan skrip ini:
// 1. Menyalin dist/ ke dist-members/.
// 2. Menyisipkan indeks pencarian ke halaman /cari/ lalu menghapus search-index.json.
//    Tanpa langkah ini, berkas itu tetap terbuka untuk umum dan berisi teks lengkap artikel.
// 3. Mengenkripsi setiap .html (kecuali 404.html) satu per satu. Mode rekursif bawaan StatiCrypt
//    tidak dipakai karena ikut mengenkripsi gambar dan font.
// 4. Memverifikasi hasilnya, termasuk uji dekripsi pada beberapa halaman.
//
// Password dibaca dari environment (STATICRYPT_PASSWORD), tidak pernah dari argumen perintah.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const out = join(root, 'dist-members');
const cli = join(root, 'node_modules', 'staticrypt', 'cli', 'index.js');
const template = join(root, 'scripts', 'members', 'password-template.html');

const env = process.env;
const fail = (message) => {
  console.error(`\nGAGAL: ${message}\n`);
  process.exit(1);
};

// ---------- Konfigurasi ----------
const password = env.STATICRYPT_PASSWORD ?? '';
if (!password) fail('STATICRYPT_PASSWORD belum diisi (environment variable).');
if (password.length < 10) console.warn('Peringatan: password kurang dari 10 karakter. Disarankan lebih panjang.');

let salt = (env.STATICRYPT_SALT ?? '').trim();
if (!salt) {
  if (env.CI) fail('STATICRYPT_SALT wajib diisi di CI agar fitur "ingat saya" tidak reset tiap deploy. Buat dengan: openssl rand -hex 16');
  salt = randomBytes(16).toString('hex');
  console.warn(`STATICRYPT_SALT kosong; memakai salt acak untuk build lokal ini: ${salt}`);
}
if (!/^[0-9a-f]{32}$/i.test(salt)) fail('STATICRYPT_SALT harus 32 karakter heksadesimal (contoh: openssl rand -hex 16).');

const rememberDays = env.MEMBERS_REMEMBER_DAYS ?? '30';
if (!/^\d+$/.test(rememberDays)) fail('MEMBERS_REMEMBER_DAYS harus bilangan bulat (hari).');

// Teks halaman password. Semuanya bisa diganti lewat environment variable.
const text = {
  title: env.MEMBERS_TITLE ?? 'Area Member',
  instructions: env.MEMBERS_INSTRUCTIONS ?? 'Halaman ini khusus member. Masukkan password yang Anda terima.',
  button: env.MEMBERS_BUTTON ?? 'Masuk',
  placeholder: env.MEMBERS_PLACEHOLDER ?? 'Password',
  remember: env.MEMBERS_REMEMBER ?? 'Ingat saya di perangkat ini',
  error: env.MEMBERS_ERROR ?? 'Password salah.',
  show: 'Tampilkan password',
  hide: 'Sembunyikan password',
};

if (!existsSync(join(dist, 'index.html'))) fail('dist/ belum ada. Jalankan `npm run build` (atau `npm run validate`) lebih dulu.');
if (!existsSync(cli)) fail('staticrypt belum terpasang. Jalankan `npm install`.');
if (!existsSync(template)) fail('scripts/members/password-template.html tidak ditemukan.');

// ---------- 1. Salin dist/ ----------
rmSync(out, { recursive: true, force: true });
cpSync(dist, out, { recursive: true });

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const rel = (file) => relative(out, file).split(sep).join('/');

// ---------- 2. Indeks pencarian: masuk ke dalam halaman terenkripsi ----------
const indexFile = join(out, 'search-index.json');
const cariFile = join(out, 'cari', 'index.html');
if (existsSync(indexFile)) {
  if (!existsSync(cariFile)) fail('search-index.json ada tetapi cari/index.html tidak ada; tidak bisa menyisipkan indeks.');
  const data = readFileSync(indexFile, 'utf8');
  JSON.parse(data); // pastikan valid
  // JSON adalah JavaScript yang valid; karakter berbahaya di dalam <script> dinetralkan.
  const literal = data.replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const shim =
    '<script>(function(){var D=' + literal + ';var f=window.fetch;' +
    'window.fetch=function(i){var s=typeof i==="string"?i:(i&&i.url)||"";' +
    'if(s.indexOf("search-index.json")!==-1){return Promise.resolve(new Response(JSON.stringify(D),' +
    '{status:200,headers:{"Content-Type":"application/json"}}));}' +
    'return f.apply(this,arguments);};})();</script>';
  const html = readFileSync(cariFile, 'utf8');
  if (!html.includes('<head>')) fail('cari/index.html tidak memiliki tag <head> polos; format keluaran Astro berubah?');
  writeFileSync(cariFile, html.replace('<head>', `<head>${shim}`));
  rmSync(indexFile);
  console.log('Indeks pencarian dipindah ke dalam halaman /cari/ (akan ikut terenkripsi).');
}

// ---------- 3. Enkripsi HTML satu per satu ----------
const htmlFiles = walk(out).filter((f) => f.endsWith('.html') && rel(f) !== '404.html').sort();
if (htmlFiles.length === 0) fail('Tidak ada berkas HTML untuk dienkripsi.');

const flags = (file) => [
  file,
  '-d', dirname(file), // keluaran ditulis ke folder yang sama = menimpa berkas asli
  '-c', 'false', // jangan baca/tulis .staticrypt.json; salt dari environment
  '--salt', salt,
  '--remember', rememberDays,
  '--short',
  '--template', template,
  '--template-color-primary', '#1c1a16',
  '--template-color-secondary', '#f3eee4',
  '--template-title', text.title,
  '--template-instructions', text.instructions,
  '--template-button', text.button,
  '--template-placeholder', text.placeholder,
  '--template-remember', text.remember,
  '--template-error', text.error,
  '--template-toggle-show', text.show,
  '--template-toggle-hide', text.hide,
];
const run = (args) =>
  execFileSync(process.execPath, [cli, ...args], {
    env: { ...env, STATICRYPT_PASSWORD: password },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const originals = new Map(htmlFiles.map((f) => [f, readFileSync(f, 'utf8')]));
for (const file of htmlFiles) {
  try {
    run(flags(file));
  } catch (error) {
    fail(`StatiCrypt gagal pada ${rel(file)}:\n${error.stderr?.toString() || error.message}`);
  }
}
console.log(`${htmlFiles.length} halaman dienkripsi (404.html dibiarkan terbuka).`);

// ---------- 4. Verifikasi ----------
const problems = [];
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('staticrypt')) problems.push(`${rel(file)}: bukan halaman terenkripsi`);
  if (html.includes('<main') || html.includes('class="concept')) problems.push(`${rel(file)}: isi asli masih terbaca`);
}
if (existsSync(indexFile)) problems.push('search-index.json masih ada di keluaran');

// Uji dekripsi pada beberapa halaman, bandingkan dengan aslinya.
const samples = ['index.html', 'cari/index.html', htmlFiles.map(rel).find((p) => p.startsWith('konsep/') && p !== 'konsep/index.html')].filter(Boolean);
const scratch = mkdtempSync(join(tmpdir(), 'members-check-'));
for (const name of samples) {
  const file = join(out, name);
  const target = join(scratch, name.replace(/[/\\]/g, '_'));
  mkdirSync(target, { recursive: true });
  try {
    run([file, '--decrypt', '-d', target, '-c', 'false', '--salt', salt, '--short']);
    const decrypted = readFileSync(join(target, 'index.html'), 'utf8');
    if (decrypted !== originals.get(file)) problems.push(`${name}: hasil dekripsi berbeda dari aslinya`);
  } catch (error) {
    problems.push(`${name}: dekripsi gagal (${error.stderr?.toString().trim() || error.message})`);
  }
}
rmSync(scratch, { recursive: true, force: true });

if (problems.length > 0) fail(`Verifikasi gagal:\n - ${problems.join('\n - ')}`);
console.log(`Verifikasi lolos (${samples.length} halaman diuji dekripsi).`);

// ---------- 5. Berkas pendukung GitHub Pages ----------
writeFileSync(join(out, '.nojekyll'), '');
if (env.CUSTOM_DOMAIN) writeFileSync(join(out, 'CNAME'), `${env.CUSTOM_DOMAIN.trim()}\n`);

const count = walk(out).length;
console.log(`Selesai: dist-members/ berisi ${count} berkas.`);
