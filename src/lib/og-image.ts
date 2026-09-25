// Template gambar OpenGraph (1200×630 PNG), dirender saat build dengan sharp.
// Arah "Kabinet Risiko" (docs/redesign-brief.md): kertas terang, teks Bodoni Moda / Newsreader, dan emblem
// sebagai pelat ukiran gelap berbingkai ganda di kanan (geometri sama dengan Emblem.astro, src/lib/emblem.ts).
// Teks dirender dari font TTF di src/assets/fonts agar hasilnya identik di semua mesin.
import { resolve } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { siteConfig } from '../config/site';
import { emblemFiles } from './brand-assets';
import { palette } from './brand-palette';
import {
  artBox,
  artFadeRadii,
  emblemGeometry,
  emblemInscription,
  EMBLEM_VIEWBOX,
  glyphAngles,
  separatorPath,
} from './emblem';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Build selalu dijalankan dari root proyek (npm scripts), jadi path relatif ke cwd.
// Spesifikasi Pango "Keluarga, Gaya": koma memisahkan nama keluarga dari gaya (nama keluarga TTF di tabel name).
const fontsDir = resolve('src/assets/fonts');
const fonts = {
  display: { file: resolve(fontsDir, 'BodoniModa-Medium.ttf'), spec: 'Bodoni Moda Medium,', svgFamily: 'Bodoni Moda Medium' },
  text: { file: resolve(fontsDir, 'Newsreader-Regular.ttf'), spec: 'Newsreader,' },
  italic: { file: resolve(fontsDir, 'Newsreader-Italic.ttf'), spec: 'Newsreader, Italic' },
  strong: { file: resolve(fontsDir, 'Newsreader-SemiBold.ttf'), spec: 'Newsreader SemiBold,' },
};
type Font = { file: string; spec: string };

const PAD_X = 80;
const HEADER_Y = 64;
const RULE_Y = 530;
// Pelat emblem di kanan, sejajar header; teks mendapat sisa lebar di kiri.
const PLATE_SIZE = 430;
const PLATE_X = OG_WIDTH - PAD_X - PLATE_SIZE;
const PLATE_Y = RULE_Y - 36 - PLATE_SIZE;
const TEXT_WIDTH = PLATE_X - PAD_X - 56;

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
      font: `${font.spec} ${size}`,
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

const TITLE_SIZES = [80, 72, 64, 58, 52];
// Jarak baris bawaan Bodoni Moda ±1,52× ukuran huruf (terlalu longgar untuk judul) dan vips hanya bisa
// menambah jarak, jadi judul dibungkus per kata lalu baris-barisnya disusun sendiri dengan jarak 1,05×.
const TITLE_LEADING = 1.05;

/** Bungkus per kata agar tiap baris ≤ `width`; baris eksplisit (\n) dipertahankan. */
async function wrapLines(text: string, font: Font, size: number, width: number): Promise<string[]> {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && (await renderText(candidate, font, size, palette.ink)).width > width) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

async function stackLines(lines: string[], font: Font, size: number, color: string): Promise<TextImage> {
  const images = await Promise.all(lines.map((line) => renderText(line, font, size, color)));
  const pitch = Math.round(size * TITLE_LEADING);
  const width = Math.max(...images.map((img) => img.width));
  const height = pitch * (images.length - 1) + (images.at(-1)?.height ?? 0);
  const data = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(images.map((img, i) => ({ input: img.data, left: 0, top: i * pitch })))
    .png()
    .toBuffer();
  return { data, width, height };
}

/**
 * Judul sebesar mungkin yang (1) muat dalam `maxHeight` dan (2) tidak lebih dari
 * max(2, jumlah baris eksplisit) baris, agar kalimat pendek tidak terpecah janggal.
 * Bila tidak ada yang memenuhi, dipakai ukuran terkecil.
 */
async function fitTitle(title: string, maxHeight: number): Promise<TextImage> {
  const maxLines = Math.max(2, title.split('\n').length);
  let image: TextImage | undefined;
  for (const size of TITLE_SIZES) {
    const lines = await wrapLines(title, fonts.display, size, TEXT_WIDTH);
    image = await stackLines(lines, fonts.display, size, palette.ink);
    if (image.height <= maxHeight && lines.length <= maxLines) return image;
  }
  return image as TextImage;
}

/** Deskripsi maksimal `maxHeight`; kata di akhir dipangkas dengan elipsis bila terlalu panjang. */
async function fitDescription(description: string, maxHeight: number): Promise<TextImage> {
  const words = description.split(' ');
  let text = description;
  let image = await renderText(text, fonts.text, 30, palette.inkSoft, { width: TEXT_WIDTH });
  while (image.height > maxHeight && words.length > 1) {
    words.pop();
    text = `${words.join(' ').replace(/[,;:.]$/, '')}…`;
    image = await renderText(text, fonts.text, 30, palette.inkSoft, { width: TEXT_WIDTH });
  }
  return image;
}

function paperSvg(): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
      <rect width="100%" height="100%" fill="${palette.paper}"/>
      <rect x="${PAD_X}" y="${RULE_Y}" width="${OG_WIDTH - PAD_X * 2}" height="1" fill="${palette.rule}"/>
    </svg>`,
  );
}

/**
 * Pelat emblem (varian `og`): pelat → bingkai ganda → cincin → artwork (dipudarkan melingkar, `screen`)
 * → prasasti. librsvg tidak mendukung <textPath>, jadi tiap huruf diletakkan sendiri (sudut dari glyphAngles,
 * lebar huruf diukur dengan Pango). Pengukuran Pango juga mendaftarkan font TTF ke fontconfig, sehingga
 * librsvg dapat memakai keluarga yang sama untuk <text>.
 */
async function renderEmblemPlate(size: number): Promise<Buffer> {
  const g = emblemGeometry('og');
  const v = EMBLEM_VIEWBOX;
  const c = v / 2;
  const k = size / v;
  const hair = 1 / k; // 1px dalam satuan viewBox

  const glyphs = async (text: string, radius: number, side: 'top' | 'bottom') => {
    const chars = [...text];
    const widths = await Promise.all(
      chars.map(async (ch) =>
        ch === ' ' ? g.fontSize * 0.3 : (await renderText(ch, fonts.display, g.fontSize, palette.plateInk2)).width,
      ),
    );
    const angles = glyphAngles(widths, radius, g.letterSpacing, side);
    return chars
      .map((ch, i) => {
        const angle = angles[i] ?? 0;
        if (ch === ' ') return '';
        const a = (angle * Math.PI) / 180;
        const x = c + radius * Math.cos(a);
        const y = c + radius * Math.sin(a);
        // Atas: kaki huruf di garis dasar, kepala menghadap keluar. Bawah: kepala menghadap ke pusat.
        const rotate = side === 'top' ? angle + 90 : angle - 90;
        return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" transform="rotate(${rotate.toFixed(3)} ${x.toFixed(2)} ${y.toFixed(2)})">${escapeMarkup(ch)}</text>`;
      })
      .join('');
  };

  const [topGlyphs, bottomGlyphs] = [
    await glyphs(emblemInscription.top, g.baseline.top, 'top'),
    await glyphs(emblemInscription.bottom, g.baseline.bottom, 'bottom'),
  ];

  const frame = (inset: number, color: string) =>
    `<rect x="${inset}" y="${inset}" width="${v - 2 * inset}" height="${v - 2 * inset}" fill="none" stroke="${color}" stroke-width="${hair}"/>`;
  const plate = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${v} ${v}">
      <rect width="${v}" height="${v}" fill="${palette.plate}"/>
      ${frame(g.frame.outer, palette.plateRuleStrong)}
      ${frame(g.frame.inner, palette.plateRule)}
      <circle cx="${c}" cy="${c}" r="${g.ring.outer}" fill="none" stroke="${palette.plateMark}" stroke-width="${hair}"/>
      <circle cx="${c}" cy="${c}" r="${g.ring.inner}" fill="none" stroke="${palette.plateMark}" stroke-width="${hair}"/>
      <path d="${separatorPath(g, 0)} ${separatorPath(g, 180)}" fill="${palette.plateMark}"/>
    </svg>`,
  );
  const inscription = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${v} ${v}">
      <g font-family="${fonts.display.svgFamily}" font-size="${g.fontSize}" letter-spacing="0" text-anchor="middle" fill="${palette.plateInk2}">
        ${topGlyphs}${bottomGlyphs}
      </g>
    </svg>`,
  );

  // Artwork: versi gelap, dipudarkan melingkar (sama dengan mask CSS Emblem.astro), lalu `screen` ke pelat.
  const box = artBox(g);
  const artPx = Math.round(box.size * k);
  const fade = artFadeRadii(g);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${artPx}" height="${artPx}" viewBox="0 0 ${box.size} ${box.size}">
      <defs><radialGradient id="f" gradientUnits="userSpaceOnUse" cx="${box.size / 2}" cy="${box.size / 2}" r="${fade.end}">
        <stop offset="${fade.start / fade.end}" stop-color="#fff" stop-opacity="1"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </radialGradient></defs>
      <rect width="${box.size}" height="${box.size}" fill="url(#f)"/>
    </svg>`,
  );
  const art = await sharp(emblemFiles.plate)
    .resize(artPx, artPx)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return sharp(plate)
    .composite([
      { input: art, left: Math.round(box.x * k), top: Math.round(box.y * k), blend: 'screen' },
      { input: inscription, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

// Pelat sama untuk semua gambar OG: dirender sekali per build.
let platePromise: Promise<Buffer> | undefined;
const emblemPlate = () => (platePromise ??= renderEmblemPlate(PLATE_SIZE));

export async function renderOgImage(content: OgImageContent): Promise<Buffer> {
  const plate = await emblemPlate();
  const eyebrow = await renderText(`${siteConfig.product} · ${siteConfig.masterBrand}`, fonts.italic, 26, palette.ink3);
  const attribution = await renderText(siteConfig.attribution, fonts.strong, 24, palette.inkSoft);
  const url = await renderText(content.url, fonts.text, 22, palette.ink3);

  // Blok tengah: kicker, judul, subjudul, deskripsi, dipusatkan vertikal di antara header dan garis.
  // Elemen pendukung dirender dulu; judul mendapat sisa ruang sehingga blok tidak pernah meluber.
  const GAP = 18;
  const areaTop = HEADER_Y + eyebrow.height + 28;
  const areaHeight = RULE_Y - 24 - areaTop;
  const kicker = content.kicker ? await renderText(content.kicker, fonts.italic, 28, palette.brassInk) : undefined;
  const subtitle = content.subtitle
    ? await renderText(content.subtitle, fonts.italic, 34, palette.ink3, { width: TEXT_WIDTH })
    : undefined;
  const description = content.description ? await fitDescription(content.description, 84) : undefined;
  const supporting = [kicker, subtitle, description].filter((x): x is TextImage => x !== undefined);
  const titleRoom = areaHeight - supporting.reduce((sum, img) => sum + img.height + GAP, 0);
  const title = await fitTitle(content.title, Math.min(300, titleRoom));

  const block = [kicker, title, subtitle, description].filter((x): x is TextImage => x !== undefined);
  const blockHeight = block.reduce((sum, img) => sum + img.height, 0) + GAP * (block.length - 1);
  let y = Math.max(areaTop, Math.round(areaTop + (areaHeight - blockHeight) / 2));

  const layers: OverlayOptions[] = [
    { input: plate, left: PLATE_X, top: PLATE_Y },
    { input: eyebrow.data, left: PAD_X, top: HEADER_Y },
  ];
  for (const img of block) {
    layers.push({ input: img.data, left: PAD_X, top: y });
    y += img.height + GAP;
  }
  const footerY = RULE_Y + 30;
  layers.push({ input: attribution.data, left: PAD_X, top: footerY });
  layers.push({ input: url.data, left: OG_WIDTH - PAD_X - url.width, top: footerY + attribution.height - url.height });

  return sharp(paperSvg()).composite(layers).png().toBuffer();
}
