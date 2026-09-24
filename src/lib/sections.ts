// ID bagian yang dirender oleh ConceptLayout. Heading di body MDX tidak boleh
// menghasilkan ID yang sama (dicek oleh validate.ts).
export const layoutSectionIds = {
  related: 'konsep-terkait',
  prerequisites: 'prasyarat',
  sources: 'sumber',
} as const;

export const reservedSectionIds: ReadonlySet<string> = new Set(Object.values(layoutSectionIds));

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
