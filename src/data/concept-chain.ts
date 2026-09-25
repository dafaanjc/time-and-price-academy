// Rantai konsep inti yang dipamerkan di beranda (bagian "Sistem Belajar", components/LearningSystem.astro):
// Risiko → Ketidakpastian → Probabilitas → Distribusi → Nilai Harapan → Varians.
// Setiap langkah memakai langkah sebelumnya; glyph-nya (components/figures/ChainGlyph.astro) juga bertumpuk:
// jalur → pita → irisan → kurva → penanda rata-rata → rentang ±σ.
// `label` adalah nama pendek untuk rantai; judul lengkap tetap dari frontmatter konsep.
// Slug divalidasi saat build (LearningSystem gagal bila konsep tidak ditemukan).

export const chainGlyphs = ['path', 'band', 'slice', 'curve', 'mean', 'spread'] as const;
export type ChainGlyph = (typeof chainGlyphs)[number];

export interface ChainStep {
  id: string;
  label: string;
  /** Pertanyaan yang dijawab langkah ini, dalam bahasa sehari-hari. */
  question: string;
  glyph: ChainGlyph;
}

export const conceptChain: ChainStep[] = [
  { id: 'risk', label: 'Risiko', question: 'Apa yang bisa hilang?', glyph: 'path' },
  { id: 'risk-vs-uncertainty', label: 'Ketidakpastian', question: 'Apa yang tidak bisa diketahui?', glyph: 'band' },
  { id: 'probability', label: 'Probabilitas', question: 'Seberapa mungkin?', glyph: 'slice' },
  { id: 'probability-distribution', label: 'Distribusi', question: 'Bagaimana hasil tersebar?', glyph: 'curve' },
  { id: 'expected-value', label: 'Nilai Harapan', question: 'Berapa hasil rata-ratanya?', glyph: 'mean' },
  { id: 'variance-and-volatility', label: 'Varians', question: 'Seberapa jauh hasil menyimpang?', glyph: 'spread' },
];
