// Monogram jam pasir: tanda merek kecil (≤ 32px) untuk header dan favicon. Jam pasir klasik bertiang
// (pelat atas/bawah, dua tiang, kaca, pasir) seperti yang dipegang figur emblem, tetapi digambar sebagai
// tanda sederhana di kisi 32 × 32. Ini BUKAN emblem (emblem hanya lewat Emblem.astro), dan berbeda dari
// figures/HourglassGlyph (tanda teknis "anggaran" di teks).
// Satu sumber: Monogram.astro memakai path ini dengan warna token; favicon merendernya lewat monogramSvg().

export const MONOGRAM_VIEWBOX = 32;

export const monogramPaths = {
  /** Pelat atas & bawah (isi). */
  plates: 'M5 3h22v3H5z M5 26h22v3H5z',
  /** Dua tiang (garis). */
  posts: 'M7.5 6v20 M24.5 6v20',
  /** Kaca: dua bola bertemu di leher (garis). */
  glass: 'M11 6c0 6 4.2 8.2 4.6 10c-.4 1.8-4.6 4-4.6 10 M21 6c0 6-4.2 8.2-4.6 10c.4 1.8 4.6 4 4.6 10',
  /** Pasir: sisa di bola atas + tumpukan di bola bawah + aliran tipis di leher (isi). */
  sand: 'M12.6 9.5h6.8c-.5 2.2-2.2 3.6-3.4 4.6c-1.2-1-2.9-2.4-3.4-4.6z M11.6 25.4c.5-2.6 2.4-4 4.4-4.6c2 .6 3.9 2 4.4 4.6z M15.7 14.2h.6v6.8h-.6z',
} as const;

export interface MonogramColors {
  /** Latar persegi (mis. pelat untuk favicon); tanpa latar bila tidak diisi. */
  background?: string;
  ink: string;
  sand: string;
}

/** SVG mandiri (untuk favicon/ikon). Latar opsional diberi sedikit ruang agar tanda tidak menyentuh tepi. */
export function monogramSvg(colors: MonogramColors, size = MONOGRAM_VIEWBOX): string {
  const v = MONOGRAM_VIEWBOX;
  const bg = colors.background ? `<rect width="${v}" height="${v}" fill="${colors.background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${v} ${v}" width="${size}" height="${size}">${bg}<path d="${monogramPaths.plates}" fill="${colors.ink}"/><path d="${monogramPaths.posts}" fill="none" stroke="${colors.ink}" stroke-width="1.6"/><path d="${monogramPaths.glass}" fill="none" stroke="${colors.ink}" stroke-width="1.6" stroke-linecap="round"/><path d="${monogramPaths.sand}" fill="${colors.sand}"/></svg>`;
}
