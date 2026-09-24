// Pemeriksa merek. Dijalankan oleh `npm run validate` setelah build.
// 1. Kode di src/ tidak boleh menulis langsung nama merek, produk, penulis, atau tagline.
//    Semua harus lewat `siteConfig` (src/config/site.ts).
// 2. Setiap halaman hasil build wajib memuat author, og:site_name, lang, dan atribusi footer.
//    Halaman konsep juga wajib memuat atribusi di byline dan article:author.
// 3. package.json harus mencantumkan author yang sama.
import { readdirSync, readFileSync, statSync } from 'node:fs';
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
const forbidden = [siteConfig.masterBrand, siteConfig.product, siteConfig.author, ...siteConfig.taglineParts];
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

  if (page.startsWith('dist/konsep/')) {
    expect(/class="byline__text"[^>]*>([^<]*)</.exec(html)?.[1] === escapeHtml(siteConfig.attribution), 'atribusi byline hilang');
    expect(
      attr(html, /<meta property="article:author" content="([^"]*)"/) === siteConfig.author,
      'article:author salah/hilang',
    );
  }
}

// --- 3. package.json ---------------------------------------------------------
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.author !== siteConfig.author) errors.push(`package.json: author harus "${siteConfig.author}"`);

if (errors.length > 0) {
  console.error(`Pemeriksaan merek gagal (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Pemeriksaan merek OK: ${pages.length} halaman, author "${siteConfig.author}", merek "${siteConfig.masterBrand}".`);
