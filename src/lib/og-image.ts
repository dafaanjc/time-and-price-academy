// Template gambar OpenGraph (1200×630 PNG), dirender saat build dengan sharp.
// Teks dirender dari font TTF di src/assets/fonts agar hasilnya identik di semua mesin.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { siteConfig } from '../config/site';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Salinan token tema terang dari src/styles/global.css (:root). Gambar OG selalu bertema terang.
const theme = {
  paper: '#f7f4ee',
  ink: '#1c2126',
  inkSoft: '#4a525a',
  inkFaint: '#686f76',
  line: '#e2ddd3',
  accent: '#1f5873',
};

// Build selalu dijalankan dari root proyek (npm scripts), jadi path relatif ke cwd.
const fontsDir = resolve('src/assets/fonts');
const fonts = {
  serif: { file: resolve(fontsDir, 'SourceSerif4-SemiBold.ttf'), family: 'Source Serif 4 SemiBold' },
  serifItalic: { file: resolve(fontsDir, 'SourceSerif4-Italic.ttf'), family: 'Source Serif 4 Italic' },
  sans: { file: resolve(fontsDir, 'SourceSans3-Regular.ttf'), family: 'Source Sans 3' },
  sansBold: { file: resolve(fontsDir, 'SourceSans3-SemiBold.ttf'), family: 'Source Sans 3 SemiBold' },
};
type Font = (typeof fonts)[keyof typeof fonts];

const PAD_X = 88;
const TEXT_WIDTH = OG_WIDTH - PAD_X * 2;
const HEADER_Y = 64;
const RULE_Y = 530;

export interface OgImageContent {
  /** Label kecil di atas judul, mis. nama kategori. */
  kicker?: string;
  title: string;
  /** Baris miring di bawah judul, mis. istilah asli. */
  subtitle?: string;
  description?: string;
  /** Alamat situs ringkas di pojok kanan bawah. */
  url: string;
}

interface TextImage {
  data: Buffer;
  width: number;
  height: number;
}

function escapeMarkup(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function renderText(
  text: string,
  font: Font,
  size: number,
  color: string,
  options: { width?: number; letterSpacing?: number; align?: 'left' | 'right' } = {},
): Promise<TextImage> {
  const spacing = options.letterSpacing ? ` letter_spacing="${options.letterSpacing}"` : '';
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${color}"${spacing}>${escapeMarkup(text)}</span>`,
      font: `${font.family} ${size}`,
      fontfile: font.file,
      width: options.width,
      align: options.align ?? 'left',
      wrap: 'word',
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Judul sebesar mungkin yang muat dalam `maxHeight` (maks. ~3 baris). */
async function fitTitle(title: string, maxHeight: number): Promise<TextImage> {
  let image = await renderText(title, fonts.serif, 84, theme.ink, { width: TEXT_WIDTH });
  for (const size of [76, 68, 60, 52]) {
    if (image.height <= maxHeight) break;
    image = await renderText(title, fonts.serif, size, theme.ink, { width: TEXT_WIDTH });
  }
  return image;
}

/** Deskripsi maksimal `maxHeight`; kata di akhir dipangkas dengan elipsis bila terlalu panjang. */
async function fitDescription(description: string, maxHeight: number): Promise<TextImage> {
  const words = description.split(' ');
  let text = description;
  let image = await renderText(text, fonts.sans, 32, theme.inkSoft, { width: TEXT_WIDTH });
  while (image.height > maxHeight && words.length > 1) {
    words.pop();
    text = `${words.join(' ').replace(/[,;:.]$/, '')}…`;
    image = await renderText(text, fonts.sans, 32, theme.inkSoft, { width: TEXT_WIDTH });
  }
  return image;
}

function frameSvg(): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
      <rect width="100%" height="100%" fill="${theme.paper}"/>
      <rect width="14" height="100%" fill="${theme.accent}"/>
      <rect x="${PAD_X}" y="${RULE_Y}" width="${TEXT_WIDTH}" height="2" fill="${theme.line}"/>
    </svg>`,
  );
}

export async function renderOgImage(content: OgImageContent): Promise<Buffer> {
  const logo = await sharp(readFileSync(resolve('public/favicon.svg'))).resize(48, 48).png().toBuffer();
  const eyebrow = await renderText(
    `${siteConfig.product} · ${siteConfig.masterBrand}`.toUpperCase(),
    fonts.sansBold,
    22,
    theme.inkFaint,
    { letterSpacing: 2048 },
  );
  const attribution = await renderText(siteConfig.attribution, fonts.sansBold, 24, theme.inkSoft);
  const url = await renderText(content.url, fonts.sans, 22, theme.inkFaint);

  // Blok tengah: kicker, judul, subjudul, deskripsi, dipusatkan vertikal di antara header dan garis.
  // Elemen pendukung dirender dulu; judul mendapat sisa ruang sehingga blok tidak pernah meluber.
  const GAP = 18;
  const areaTop = HEADER_Y + 48 + 24;
  const areaHeight = RULE_Y - 24 - areaTop;
  const kicker = content.kicker
    ? await renderText(content.kicker.toUpperCase(), fonts.sansBold, 24, theme.accent, { letterSpacing: 1536 })
    : undefined;
  const subtitle = content.subtitle
    ? await renderText(content.subtitle, fonts.serifItalic, 34, theme.inkFaint, { width: TEXT_WIDTH })
    : undefined;
  const description = content.description ? await fitDescription(content.description, 84) : undefined;
  const supporting = [kicker, subtitle, description].filter((x): x is TextImage => x !== undefined);
  const titleRoom = areaHeight - supporting.reduce((sum, img) => sum + img.height + GAP, 0);
  const title = await fitTitle(content.title, Math.min(300, titleRoom));

  const block = [kicker, title, subtitle, description].filter((x): x is TextImage => x !== undefined);
  const blockHeight = block.reduce((sum, img) => sum + img.height, 0) + GAP * (block.length - 1);
  let y = Math.max(areaTop, Math.round(areaTop + (areaHeight - blockHeight) / 2));

  const layers: OverlayOptions[] = [
    { input: logo, left: PAD_X, top: HEADER_Y },
    { input: eyebrow.data, left: PAD_X + 48 + 18, top: HEADER_Y + Math.round((48 - eyebrow.height) / 2) },
  ];
  for (const img of block) {
    layers.push({ input: img.data, left: PAD_X, top: y });
    y += img.height + GAP;
  }
  const footerY = RULE_Y + 30;
  layers.push({ input: attribution.data, left: PAD_X, top: footerY });
  layers.push({ input: url.data, left: OG_WIDTH - PAD_X - url.width, top: footerY + attribution.height - url.height });

  return sharp(frameSvg()).composite(layers).png().toBuffer();
}
