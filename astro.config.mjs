// @ts-check
import { defineConfig } from 'astro/config';
import process from 'node:process';
import mdx from '@astrojs/mdx';

// Hosting: GitHub Pages untuk repo proyek → https://dafaanjc.github.io/time-and-price-academy/
// Untuk domain khusus nanti: SITE_URL=https://domain-anda BASE_PATH=/ (dan tambahkan public/CNAME).
// Semua tautan internal memakai `withBase()` (src/lib/url.ts), jadi mengganti `base` cukup di sini.
export const site = process.env.SITE_URL || 'https://dafaanjc.github.io';
export const base = process.env.BASE_PATH || '/time-and-price-academy';

export default defineConfig({
  site,
  base,
  integrations: [mdx()],
  vite: {
    build: {
      // Satu-satunya chunk besar adalah three.js (~136 kB gzip), dimuat lewat import() dinamis hanya untuk
      // kualitas medium/high dan tidak pernah masuk bundel awal. Batas ini tetap memperingatkan chunk lain.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        // Peringatan bawaan Astro: direktif "use astro:head-inject" pada modul aset MDX memang tidak
        // perlu dipertahankan oleh bundler. Hanya peringatan ini yang disaring; lainnya tetap tampil.
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && String(warning.message).includes('astro:head-inject')) return;
          warn(warning);
        },
      },
    },
  },
  markdown: {
    // Blok `text` dipakai untuk rumus; biarkan tanpa tema Shiki agar mengikuti gaya .content pre.
    syntaxHighlight: { type: 'shiki', excludeLangs: ['math', 'text'] },
  },
});
