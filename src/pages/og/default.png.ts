import type { APIRoute } from 'astro';
import { siteConfig } from '../../config/site';
import { renderOgImage } from '../../lib/og-image';
import { displayUrl } from '../../lib/url';

// Gambar pratinjau default: beranda dan halaman tanpa gambar khusus.
export const GET: APIRoute = async ({ site }) => {
  const png = await renderOgImage({
    // Satu baris per kalimat tagline.
    title: siteConfig.taglineParts.join('\n'),
    description: siteConfig.summary,
    url: displayUrl(site),
  });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
