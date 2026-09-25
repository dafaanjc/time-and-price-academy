// Pemeriksa merek. Dijalankan oleh `npm run validate` setelah build.
// 1. Kode di src/ tidak boleh menulis langsung nama merek, produk, penulis, atau tagline.
//    Semua harus lewat `siteConfig` (src/config/site.ts).
// 2. Setiap halaman hasil build wajib memuat author, og:site_name, lang, dan atribusi footer.
//    Halaman konsep juga wajib memuat atribusi di byline dan article:author.
//    Header memuat wordmark tipografis; emblem maksimal satu per halaman (beranda: di panggung hero, versi gelap).
// 3. package.json harus mencantumkan author yang sama.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteConfig } from '../src/config/site.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const errors = [];

const walk = (dir, exts) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path, exts);
    return exts.some((ext) => path.endsWith(ext)) ? [path] : [];
  });

const rel = (path) => relative(root, path).split(sep).join('/');

// --- 1. Sumber ---------------------------------------------------------------
// Konten MDX (src/content) boleh menyebut nama produk dalam prosa, jadi tidak dipindai.
const forbidden = [siteConfig.masterBrand, siteConfig.product, siteConfig.author, ...siteConfig.taglineParts, siteConfig.heroLine];
const sourceDirs = ['components', 'layouts', 'pages', 'lib', 'data', 'styles'].map((d) => join(root, 'src', d));

for (const file of sourceDirs.flatMap((d) => walk(d, ['.astro', '.ts', '.js', '.mjs', '.css']))) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const literal of forbidden) {
        if (line.includes(literal)) {
          errors.push(`${rel(file)}:${i + 1}: "${literal}" ditulis langsung; pakai siteConfig`);
        }
      }
    });
}

// --- 2. Hasil build ----------------------------------------------------------
const escapeHtml = (text) => text.replaceAll('&', '&amp;');
const attr = (html, pattern) => html.match(pattern)?.[1];
const dist = join(root, 'dist');
const pages = walk(dist, ['.html']);

if (pages.length === 0) errors.push('dist/ kosong: jalankan `astro build` lebih dulu');

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const page = rel(file);
  const expect = (ok, message) => ok || errors.push(`${page}: ${message}`);

  expect(attr(html, /<html[^>]*\slang="([^"]+)"/) === siteConfig.lang, `lang harus "${siteConfig.lang}"`);
  expect(attr(html, /<meta name="author" content="([^"]*)"/) === siteConfig.author, 'meta author salah/hilang');
  expect(
    attr(html, /<meta property="og:site_name" content="([^"]*)"/) === escapeHtml(siteConfig.name),
    'og:site_name salah/hilang',
  );
  expect(/<footer[\s\S]*?<\/footer>/.exec(html)?.[0].includes(escapeHtml(siteConfig.attribution)), 'atribusi footer hilang');

  // Header: wordmark tipografis (induk + produk), bukan gambar.
  const header = /<header class="site-header[\s\S]*?<\/header>/.exec(html)?.[0] ?? '';
  expect(
    header.includes(escapeHtml(siteConfig.masterBrand)) && header.includes(escapeHtml(siteConfig.product)),
    'wordmark header (induk │ produk) hilang',
  );
  expect(!/<img\b/.test(header), 'header tidak boleh memuat gambar (emblem hanya di beranda/footer)');

  // Emblem resmi: maksimal satu per halaman; beranda wajib menampilkannya di panggung hero.
  const emblems = (html.match(/<picture class="emblem\b/g) ?? []).length;
  expect(emblems <= 1, `emblem muncul ${emblems}× (maksimal 1 per halaman)`);
  if (page === 'dist/index.html') expect(/class="emblem emblem--plate"/.test(html), 'emblem panggung hilang di hero beranda');

  // Halaman konsep = dist/konsep/<slug>/index.html (bukan indeks dist/konsep/index.html).
  if (/^dist\/konsep\/[^/]+\/index\.html$/.test(page)) {
    expect(
      /class="byline__text"[^>]*>([^<]*)</.exec(html)?.[1] === escapeHtml(siteConfig.articleAttribution),
      `atribusi byline "${siteConfig.articleAttribution}" hilang`,
    );
    const metaLine = /<p class="label concept-meta[^>]*>[\s\S]*?<\/p>/.exec(html)?.[0] ?? '';
    expect(
      metaLine.includes(escapeHtml(siteConfig.author)) && metaLine.includes(escapeHtml(siteConfig.masterBrand)),
      'baris metadata header harus memuat author dan merek',
    );
    expect(
      attr(html, /<meta property="article:author" content="([^"]*)"/) === siteConfig.author,
      'article:author salah/hilang',
    );
  }
}

// --- 3. package.json ---------------------------------------------------------
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.author !== siteConfig.author) errors.push(`package.json: author harus "${siteConfig.author}"`);

// --- 4. Ikon buatan lama tidak boleh kembali (hanya aset resmi yang dipakai) ---
if (existsSync(join(root, 'public', 'favicon.svg')) || existsSync(join(dist, 'favicon.svg'))) {
  errors.push('favicon.svg (ikon buatan, bukan aset resmi) tidak boleh ada');
}

if (errors.length > 0) {
  console.error(`Pemeriksaan merek gagal (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Pemeriksaan merek OK: ${pages.length} halaman, author "${siteConfig.author}", merek "${siteConfig.masterBrand}".`);
