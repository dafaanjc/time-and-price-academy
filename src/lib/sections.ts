// ID bagian yang dirender otomatis oleh layout. Heading di body MDX tidak boleh
// menghasilkan ID yang sama (dicek oleh validate.ts).

/** Bagian otomatis di halaman konsep (ConceptLayout). */
export const layoutSectionIds = {
  related: 'konsep-terkait',
  prerequisites: 'prasyarat',
  problems: 'masalah-terkait',
  sources: 'sumber',
} as const;

export const reservedSectionIds: ReadonlySet<string> = new Set(Object.values(layoutSectionIds));

/** Bagian otomatis di halaman masalah trader (ProblemLayout). */
export const problemSectionIds = {
  concepts: 'konsep-terlibat',
  readFirst: 'baca-dulu',
  sources: 'sumber',
} as const;

export const reservedProblemSectionIds: ReadonlySet<string> = new Set(Object.values(problemSectionIds));

/**
 * Heading wajib di body masalah trader, dalam urutan ini:
 * MASALAH (Situasi) → KONSEP → TEORI/BUKTI → PENERAPAN.
 */
export const requiredProblemHeadings = ['Situasi', 'Konsep di Baliknya', 'Teori dan Bukti', 'Penerapan Praktis'] as const;

/** Slug heading sederhana (huruf kecil, alfanumerik, tanda hubung). Cukup untuk judul berbahasa Indonesia. */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

/** Teks heading dari body Markdown/MDX, mengabaikan blok kode. */
export function extractHeadings(body: string): string[] {
  let inFence = false;
  const headings: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const match = inFence ? null : /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (match?.[1]) headings.push(match[1]);
  }
  return headings;
}
