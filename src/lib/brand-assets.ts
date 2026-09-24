// Path berkas emblem resmi untuk pemrosesan saat build (gambar OG, favicon).
// Komponen halaman memakai `import` langsung (BrandEmblem.astro) agar dioptimalkan oleh astro:assets.
import { resolve } from 'node:path';

// Build selalu dijalankan dari root proyek (npm scripts), jadi path relatif ke cwd.
export const emblemFiles = {
  /** 1024×1024, latar hitam murni. */
  dark: resolve('src/assets/Logo/black logo.png'),
  /** 433×453, latar abu-abu ±221–231. */
  light: resolve('src/assets/Logo/logos.jpeg'),
};

/**
 * Faktor kecerahan untuk versi terang agar latar abu-abunya (min. 221) menjadi putih (255),
 * sehingga `multiply` membuatnya transparan di atas kertas. Nilai yang sama dipakai di
 * CSS BrandEmblem.astro (`filter: brightness(1.16)`).
 */
export const LIGHT_EMBLEM_BRIGHTNESS = 1.16;

/** Rasio lebar/tinggi versi terang (433×453), untuk tata letak gambar OG. */
export const EMBLEM_LIGHT_ASPECT = 433 / 453;
