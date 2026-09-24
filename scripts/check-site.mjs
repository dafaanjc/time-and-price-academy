// Pemeriksa hasil build: tautan internal dan metadata berbagi (share).
// Dijalankan oleh `npm run validate` setelah `astro build`.
// 1. Setiap href/src/action internal memakai `base` dan menunjuk ke file yang ada di dist/.
//    Tautan relatif (../slug/) dan anchor (#id) juga diperiksa.
// 2. canonical dan og:url absolut, sesuai `site` + `base`, dan menunjuk ke halaman yang ada.
// 3. og:image absolut, menunjuk ke PNG 1200×630 yang ada; twitter:card = summary_large_image.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { base, site } from '../astro.config.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const basePath = `/${base.replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '');
const origin = new URL(site).origin;
const errors = [];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.html') ? [path] : [];
  });

/** URL path (dengan base) → file di dist/, atau undefined bila tidak ada. */
function resolveInDist(urlPath) {
  if (!urlPath.startsWith(`${basePath}/`) && urlPath !== basePath) return undefined;
  const local = decodeURIComponent(urlPath.slice(basePath.length)) || '/';
  const candidates = local.endsWith('/')
    ? [join(dist, local, 'index.html')]
    : [join(dist, local), join(dist, `${local}.html`), join(dist, local, 'index.html')];
  return candidates.find((p) => existsSync(p) && statSync(p).isFile());
}

/** Path URL halaman (dengan base) untuk file HTML di dist/. */
function pageUrlPath(file) {
  const rel = relative(dist, file).split(sep).join('/');
  return `${basePath}/${rel.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}`;
}

const meta = (html, key) =>
  html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1]?.replaceAll('&amp;', '&');

const imageCache = new Map();
async function checkImage(file) {
  if (!imageCache.has(file)) {
    imageCache.set(file, sharp(file).metadata().then((m) => `${m.format} ${m.width}x${m.height}`));
  }
  return imageCache.get(file);
}

const pages = walk(dist);
if (pages.length === 0) errors.push('dist/ kosong: jalankan `astro build` lebih dulu');

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const page = relative(root, file).split(sep).join('/');
  const pageUrl = new URL(pageUrlPath(file), origin);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  // --- 1. Tautan internal ---
  const refs = [
    ...[...html.matchAll(/\s(?:href|src|action)="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/url\(#([^)]+)\)/g)].map((m) => `#${m[1]}`),
  ];
  for (const ref of refs) {
    if (/^(mailto:|tel:|data:|javascript:)/.test(ref)) continue;
    if (ref.startsWith('#')) {
      if (ref.length > 1 && !ids.has(ref.slice(1))) errors.push(`${page}: anchor "${ref}" tidak ada`);
      continue;
    }
    const url = new URL(ref.replaceAll('&amp;', '&'), pageUrl);
    if (url.origin !== origin) continue; // eksternal
    if (!resolveInDist(url.pathname)) {
      const hint = url.pathname.startsWith(`${basePath}/`) ? 'file tidak ada' : `tanpa base "${basePath}"`;
      errors.push(`${page}: tautan "${ref}" rusak (${hint})`);
    }
  }

  // --- 2. canonical & og:url (tidak berlaku untuk halaman noindex, mis. 404) ---
  const noindex = meta(html, "robots")?.includes("noindex");
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  for (const [name, value] of [['canonical', canonical], ['og:url', meta(html, 'og:url')]]) {
    if (noindex) {
      if (value) errors.push(`${page}: halaman noindex tidak boleh punya ${name}`);
      continue;
    }
    if (!value) {
      errors.push(`${page}: ${name} hilang`);
      continue;
    }
    const url = new URL(value);
    if (url.origin !== origin || !resolveInDist(url.pathname)) errors.push(`${page}: ${name} "${value}" tidak valid`);
  }

  // --- 3. og:image & twitter ---
  const image = meta(html, 'og:image');
  if (!image) {
    errors.push(`${page}: og:image hilang`);
  } else {
    const url = new URL(image);
    const imageFile = url.origin === origin ? resolveInDist(url.pathname) : undefined;
    if (!imageFile) {
      errors.push(`${page}: og:image "${image}" tidak ada di dist/`);
    } else {
      const actual = await checkImage(imageFile);
      if (actual !== 'png 1200x630') errors.push(`${page}: og:image harus png 1200x630, didapat ${actual}`);
    }
  }
  if (meta(html, 'twitter:card') !== 'summary_large_image') errors.push(`${page}: twitter:card bukan summary_large_image`);
  if (!meta(html, 'og:image:alt')) errors.push(`${page}: og:image:alt hilang`);
}

if (errors.length > 0) {
  console.error(`Pemeriksaan situs gagal (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `Pemeriksaan situs OK: ${pages.length} halaman, ${imageCache.size} gambar OG, semua tautan internal di ${origin}${basePath}/ valid.`,
);
