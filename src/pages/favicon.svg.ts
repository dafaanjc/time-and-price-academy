import type { APIRoute } from 'astro';
import { faviconSvg } from '../lib/favicon';

// Favicon vektor: monogram jam pasir (tajam di semua ukuran tab).
export const GET: APIRoute = () => new Response(faviconSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
