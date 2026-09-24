export const categoryIds = [
  'foundations',
  'risk-management',
  'psychology',
  'behavioral-finance',
  'decision-theory',
] as const;

export type CategoryId = (typeof categoryIds)[number];

/**
 * Geometri SVG teknis yang mewakili kategori (digambar oleh components/figures/CategoryMotif.astro):
 * - axes: sumbu + kurva distribusi dengan penanda rata-rata
 * - band: jejak harga di dalam batas atas/bawah, dengan garis batas rugi
 * - oscillation: jejak yang berayun makin lebar setelah satu kejatuhan
 * - kink: kurva nilai dengan patahan di titik acuan (rugi terasa lebih curam)
 * - tree: pohon keputusan (simpul pilihan → simpul peluang → hasil)
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
