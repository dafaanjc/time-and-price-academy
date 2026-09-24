// Estimasi waktu baca dari isi mentah MDX. Tidak memakai plugin remark:
// Astro 7 memakai prosesor Sätteri secara default.
const WORDS_PER_MINUTE = 200;

export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const text = body
    .replace(/^import .*$/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>[\]()-]/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
