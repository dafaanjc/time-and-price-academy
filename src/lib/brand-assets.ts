// Path berkas merek untuk pemrosesan saat build (gambar OG).
// Komponen halaman memakai `import` langsung (Emblem.astro, BrandEmblem.astro) agar dioptimalkan oleh astro:assets.
import { resolve } from 'node:path';

// Build selalu dijalankan dari root proyek (npm scripts), jadi path relatif ke cwd.
export const emblemFiles = {
  /** 1024×1024, putih di atas hitam murni: satu-satunya sumber yang tajam di ukuran besar. */
  plate: resolve('src/assets/brand/logo-plate.png'),
};
