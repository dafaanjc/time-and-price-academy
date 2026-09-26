// Ikon situs dari monogram jam pasir (src/lib/monogram.ts): pelat gelap, tinta pelat, pasir kuningan.
// Satu sumber untuk /favicon.svg, /favicon-32.png, dan /apple-touch-icon.png.
import sharp from 'sharp';
import { palette } from './brand-palette';
import { monogramSvg } from './monogram';

export const faviconSvg = (size = 32) =>
  monogramSvg({ background: palette.plate, ink: palette.plateInk, sand: palette.plateMark }, size);

/** PNG persegi `size` px, dirender dari SVG pada ukuran akhirnya (garis tetap tajam). */
export async function faviconPng(size: number): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await sharp(Buffer.from(faviconSvg(size))).png().toBuffer());
}
