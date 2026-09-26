// Geometri Emblem (pelat ukiran merek): satu sumber untuk komponen Emblem.astro dan gambar OG.
// Bidang persegi 1000 × 1000 satuan: pelat gelap → bingkai ganda → cincin prasasti (merek induk di busur atas,
// produk di busur bawah) → artwork emblem resmi di tengah, dilebur ke pelat dan dipudarkan melingkar di dalam
// cincin (hanya jubah bawah yang hilang; kepala dan jam pasir selalu utuh). Artwork tidak digambar ulang atau
// diwarnai ulang. Lihat docs/redesign-brief.md → Tahap 2.
import { siteConfig } from '../config/site';

export const EMBLEM_VIEWBOX = 1000;
const C = EMBLEM_VIEWBOX / 2;

export type EmblemVariant = 'hero' | 'footer' | 'og';

export interface EmblemGeometry {
  /** Garis bingkai ganda (inset dari tepi pelat). */
  frame: { outer: number; inner: number };
  /** Lingkaran cincin prasasti: tepi luar dan dalam pita teks. */
  ring: { outer: number; inner: number };
  /** Jari-jari garis dasar teks: busur atas (huruf menghadap keluar), busur bawah (huruf menghadap ke dalam). */
  baseline: { top: number; bottom: number };
  /** Ukuran huruf prasasti dan jarak antarhuruf (satuan viewBox). */
  fontSize: number;
  letterSpacing: number;
  /** Titik pemisah (belah ketupat kuningan) di jam 3 dan jam 9. */
  separatorRadius: number;
  separatorSize: number;
  /** Kotak artwork (persegi, terpusat) dan pudar melingkar: persen jarak ke sudut terjauh. */
  // Isi terjauh artwork dari pusat (sudut kanan atas jam pasir) ≈ ART_CONTENT_RADIUS × setengah sisi.
  art: { size: number; fadeStart: number; fadeEnd: number };
}

// Di ukuran kecil (footer) pita teks lebih lebar dan huruf lebih besar agar tetap terbaca (±10px pada 176px).
const GEOMETRY: Record<EmblemVariant, EmblemGeometry> = {
  hero: {
    frame: { outer: 14, inner: 26 },
    ring: { outer: 452, inner: 386 },
    baseline: { top: 405, bottom: 433 },
    fontSize: 40,
    letterSpacing: 9,
    separatorRadius: 419,
    separatorSize: 9,
    art: { size: 650, fadeStart: 79, fadeEnd: 85 },
  },
  footer: {
    frame: { outer: 18, inner: 34 },
    ring: { outer: 446, inner: 346 },
    baseline: { top: 372, bottom: 419 },
    fontSize: 60,
    letterSpacing: 6,
    separatorRadius: 396,
    separatorSize: 14,
    art: { size: 590, fadeStart: 79, fadeEnd: 85 },
  },
  og: {
    frame: { outer: 14, inner: 26 },
    ring: { outer: 452, inner: 380 },
    baseline: { top: 401, bottom: 435 },
    fontSize: 46,
    letterSpacing: 8,
    separatorRadius: 416,
    separatorSize: 10,
    art: { size: 640, fadeStart: 79, fadeEnd: 85 },
  },
};

/** Jarak isi terjauh (sudut kanan atas jam pasir) dari pusat, relatif terhadap setengah sisi aset (281/256). */
export const ART_CONTENT_RADIUS = 281 / 256;

export function emblemGeometry(variant: EmblemVariant): EmblemGeometry {
  return GEOMETRY[variant];
}

/** Teks prasasti dari siteConfig (tidak pernah ditulis langsung). */
export const emblemInscription = {
  top: siteConfig.masterBrand.toUpperCase(),
  bottom: siteConfig.product.toUpperCase(),
} as const;

/**
 * Busur setengah lingkaran untuk <textPath>, selalu dari kiri ke kanan agar teks terbaca tegak:
 * `top` melewati puncak (searah jarum jam), `bottom` melewati dasar (berlawanan arah jarum jam).
 */
export function inscriptionArc(radius: number, side: 'top' | 'bottom'): string {
  const sweep = side === 'top' ? 1 : 0;
  return `M ${C - radius} ${C} A ${radius} ${radius} 0 0 ${sweep} ${C + radius} ${C}`;
}

/** Belah ketupat pemisah di sudut `angleDeg` (0 = jam 3, 180 = jam 9). */
export function separatorPath(geometry: EmblemGeometry, angleDeg: number): string {
  const a = (angleDeg * Math.PI) / 180;
  const x = C + geometry.separatorRadius * Math.cos(a);
  const y = C + geometry.separatorRadius * Math.sin(a);
  const s = geometry.separatorSize;
  return `M ${round(x)} ${round(y - s)} L ${round(x + s)} ${round(y)} L ${round(x)} ${round(y + s)} L ${round(x - s)} ${round(y)} Z`;
}

/** Posisi kotak artwork dalam satuan viewBox. */
export function artBox(geometry: EmblemGeometry): { x: number; y: number; size: number } {
  const { size } = geometry.art;
  return { x: C - size / 2, y: C - size / 2, size };
}

/**
 * Jari-jari pudar artwork dalam satuan viewBox. Persen dihitung terhadap jarak pusat → sudut kotak
 * (`farthest-corner` pada CSS radial-gradient), sehingga CSS dan gambar OG memakai angka yang sama.
 */
export function artFadeRadii(geometry: EmblemGeometry): { start: number; end: number } {
  const corner = (geometry.art.size / 2) * Math.SQRT2;
  return { start: (corner * geometry.art.fadeStart) / 100, end: (corner * geometry.art.fadeEnd) / 100 };
}

/**
 * Sudut (derajat, 0 = jam 3, searah jarum jam) untuk tiap huruf prasasti yang diletakkan satu per satu
 * (dipakai gambar OG; librsvg tidak mendukung <textPath>). `widths` = lebar tiap huruf dalam satuan viewBox.
 * Busur atas berpusat di jam 12 (270°), busur bawah di jam 6 (90°) dan dibaca dari kiri ke kanan.
 */
export function glyphAngles(widths: number[], radius: number, letterSpacing: number, side: 'top' | 'bottom'): number[] {
  const advances = widths.map((w) => w + letterSpacing);
  const total = advances.reduce((sum, w) => sum + w, 0) - letterSpacing;
  const toDeg = (arc: number) => (arc / radius) * (180 / Math.PI);
  let along = -total / 2;
  return widths.map((w) => {
    const centre = along + w / 2;
    along += w + letterSpacing;
    return side === 'top' ? 270 + toDeg(centre) : 90 - toDeg(centre);
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
