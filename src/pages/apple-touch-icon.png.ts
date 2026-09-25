import type { APIRoute } from 'astro';
import { faviconPng } from '../lib/favicon';

// Ikon layar beranda iOS (180×180): monogram jam pasir di atas pelat gelap.
export const GET: APIRoute = async () =>
  new Response(await faviconPng(180), { headers: { 'Content-Type': 'image/png' } });
