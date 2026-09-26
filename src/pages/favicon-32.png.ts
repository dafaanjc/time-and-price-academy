import type { APIRoute } from 'astro';
import { faviconPng } from '../lib/favicon';

// Favicon PNG 32×32 (cadangan untuk peramban tanpa dukungan favicon SVG): monogram jam pasir.
export const GET: APIRoute = async () =>
  new Response(await faviconPng(32), { headers: { 'Content-Type': 'image/png' } });
