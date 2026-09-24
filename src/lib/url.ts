// Semua URL internal lewat modul ini, agar situs tetap benar saat di-host di sub-path
// (GitHub Pages: https://<user>.github.io/<repo>/, lihat `base` di astro.config.mjs).

/** Path halaman tetap, TANPA base. Gunakan bersama `withBase()`. */
export const routes = {
  home: '/',
  learningPaths: '/jalur-belajar/',
  map: '/peta/',
  search: '/cari/',
  searchIndex: '/search-index.json',
  favicon: '/favicon.svg',
  ogDefault: '/og/default.png',
} as const;

const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Tambahkan `base` ke path internal yang diawali "/". */
export function withBase(path: string): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** URL absolut untuk canonical/OG/salin tautan. `undefined` bila `site` belum di-set. */
export function absoluteUrl(pathWithBase: string, site: URL | undefined): string | undefined {
  return site ? new URL(pathWithBase, site).href : undefined;
}

/** Alamat situs yang ringkas untuk ditampilkan, mis. "dafaanjc.github.io/time-and-price-academy". */
export function displayUrl(site: URL | undefined): string {
  if (!site) return '';
  const url = new URL(withBase(routes.home), site);
  return `${url.host}${url.pathname.replace(/\/$/, '')}`;
}

/** Path gambar OG (sudah dengan base) untuk sebuah konsep. */
export function conceptOgImage(id: string): string {
  return withBase(`/og/konsep/${id}.png`);
}
