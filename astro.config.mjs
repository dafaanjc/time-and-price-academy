// @ts-check
import { defineConfig } from 'astro/config';
import process from 'node:process';
import mdx from '@astrojs/mdx';

// SITE_URL diperlukan agar canonical dan og:url bisa ditulis sebagai URL absolut.
// Jika tidak diisi (mis. saat pengembangan lokal), tag tersebut dilewati.
const site = process.env.SITE_URL || undefined;

export default defineConfig({
  site,
  integrations: [mdx()],
  markdown: {
    // Blok `text` dipakai untuk rumus; biarkan tanpa tema Shiki agar mengikuti gaya .content pre.
    syntaxHighlight: { type: 'shiki', excludeLangs: ['math', 'text'] },
  },
});
