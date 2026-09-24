import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { emblemFiles } from '../lib/brand-assets';

// Favicon sementara: emblem resmi (versi gelap) yang hanya diperkecil, tanpa dipotong/diwarnai ulang.
// Detail emblem tidak terbaca di 32px; ganti bila tersedia ikon kecil resmi.
export const GET: APIRoute = async () => {
  const png = await sharp(emblemFiles.dark).resize(32, 32).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
