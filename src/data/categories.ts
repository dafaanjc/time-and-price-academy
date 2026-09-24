export const categoryIds = [
  'foundations',
  'risk-management',
  'psychology',
  'behavioral-finance',
  'decision-theory',
] as const;

export type CategoryId = (typeof categoryIds)[number];

/**
 * Gambar isometrik SVG yang mewakili kategori (digambar oleh components/figures/CategoryMotif.astro):
 * - axes: kurva distribusi berdiri di bidang waktu × harga, penanda rata-rata di lantai
 * - band: jejak harga di dalam bidang batas atas, dengan garis batas rugi di bawahnya
 * - oscillation: jejak yang berayun makin lebar setelah satu kejatuhan
 * - kink: pita kurva nilai dengan patahan di titik acuan (rugi terasa lebih curam)
 * - tree: pohon keputusan di lantai (simpul pilihan → peluang), tiang setinggi hasil di tiap daun
 */
export const categoryMotifs = ['axes', 'band', 'oscillation', 'kink', 'tree'] as const;
export type CategoryMotif = (typeof categoryMotifs)[number];

export interface Category {
  id: CategoryId;
  title: string;
  description: string;
  motif: CategoryMotif;
}

// Urutan array ini adalah urutan tampil di sidebar dan homepage.
export const categories: Category[] = [
  {
    id: 'foundations',
    title: 'Fondasi',
    motif: 'axes',
    description:
      'Konsep dasar untuk membaca risiko: probabilitas, distribusi, nilai harapan, dan variabilitas.',
  },
  {
    id: 'risk-management',
    title: 'Manajemen Risiko',
    motif: 'band',
    description: 'Cara mengukur, membatasi, dan mengelola risiko dalam keputusan keuangan.',
  },
  {
    id: 'psychology',
    title: 'Psikologi',
    motif: 'oscillation',
    description: 'Bagaimana emosi dan kondisi mental memengaruhi cara kita menghadapi risiko.',
  },
  {
    id: 'behavioral-finance',
    title: 'Keuangan Perilaku',
    motif: 'kink',
    description: 'Pola perilaku dan bias yang muncul ketika manusia mengambil keputusan keuangan.',
  },
  {
    id: 'decision-theory',
    title: 'Teori Keputusan',
    motif: 'tree',
    description: 'Kerangka untuk memilih tindakan terbaik ketika hasilnya tidak pasti.',
  },
];

export function getCategory(id: CategoryId): Category {
  const category = categories.find((c) => c.id === id);
  if (!category) throw new Error(`Kategori tidak dikenal: ${id}`);
  return category;
}

/** Nomor kategori berformat "01 / 05" (urutan tampil / jumlah kategori). */
export function categoryIndexLabel(id: CategoryId): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(categories.findIndex((c) => c.id === id) + 1)} / ${pad(categories.length)}`;
}
