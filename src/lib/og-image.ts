// Template gambar OpenGraph (1200×630 PNG), dirender saat build dengan sharp.
// Teks dirender dari font TTF di src/assets/fonts agar hasilnya identik di semua mesin.
import { resolve } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { siteConfig } from '../config/site';
import { EMBLEM_LIGHT_ASPECT, emblemFiles, LIGHT_EMBLEM_BRIGHTNESS } from './brand-assets';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Salinan token tema terang dari src/styles/global.css (:root). Gambar OG selalu bertema terang.
// Monokrom: aksen = tinta (arah visual mengikuti emblem etsa merek induk (siteConfig.masterBrand)).
const theme = {
  paper: '#f6f3ec',
  ink: '#16191d',
  inkSoft: '#454c54',
  inkFaint: '#666d74',
  line: '#d6cfc2',
  accent: '#16191d',
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
const HEADER_Y = 64;
const RULE_Y = 530;
const RULE_WIDTH = OG_WIDTH - PAD_X * 2;
// Emblem resmi di kanan (versi terang, dilebur ke kertas); teks mendapat sisa lebar di kiri.
const EMBLEM_HEIGHT = 360;
const EMBLEM_WIDTH = Math.round(EMBLEM_HEIGHT * EMBLEM_LIGHT_ASPECT);
const TEXT_WIDTH = RULE_WIDTH - EMBLEM_WIDTH - 40;

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

const TITLE_SIZES = [84, 76, 68, 60, 52];

/**
 * Judul sebesar mungkin yang (1) muat dalam `maxHeight` dan (2) tidak lebih dari
 * max(2, jumlah baris eksplisit) baris, agar kalimat pendek tidak terpecah janggal.
 * Bila tidak ada yang memenuhi, dipakai ukuran terkecil.
 */
async function fitTitle(title: string, maxHeight: number): Promise<TextImage> {
  const maxLines = Math.max(2, title.split('\n').length);
  let image: TextImage | undefined;
  for (const size of TITLE_SIZES) {
    image = await renderText(title, fonts.serif, size, theme.ink, { width: TEXT_WIDTH });
    const lineHeight = (await renderText('Ag', fonts.serif, size, theme.ink)).height;
    const lines = Math.round(image.height / lineHeight);
    if (image.height <= maxHeight && lines <= maxLines) return image;
  }
  return image as TextImage;
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
      <rect x="${PAD_X}" y="${RULE_Y}" width="${RULE_WIDTH}" height="2" fill="${theme.line}"/>
    </svg>`,
  );
}

export async function renderOgImage(content: OgImageContent): Promise<Buffer> {
  // Sama dengan CSS BrandEmblem: kecerahan dinaikkan agar latar menjadi putih, lalu `multiply`.
  const emblem = await sharp(emblemFiles.light)
    .linear(LIGHT_EMBLEM_BRIGHTNESS, 0)
    .resize({ height: EMBLEM_HEIGHT })
    .png()
    .toBuffer();
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
  const areaTop = HEADER_Y + eyebrow.height + 32;
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
    {
      input: emblem,
      left: OG_WIDTH - PAD_X - EMBLEM_WIDTH,
      top: Math.round((HEADER_Y + RULE_Y - EMBLEM_HEIGHT) / 2),
      blend: 'multiply',
    },
    { input: eyebrow.data, left: PAD_X, top: HEADER_Y },
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
