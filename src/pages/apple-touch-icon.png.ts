import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { emblemFiles } from '../lib/brand-assets';

// Ikon layar beranda iOS (180×180): emblem resmi versi gelap, hanya diperkecil.
export const GET: APIRoute = async () => {
  const png = await sharp(emblemFiles.dark).resize(180, 180).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
