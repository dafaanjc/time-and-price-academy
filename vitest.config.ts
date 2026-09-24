import { defineConfig } from 'vitest/config';

// Uji fungsi murni di src/lib (kalkulator, validasi, pencarian, graf). Tidak memerlukan Astro.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
