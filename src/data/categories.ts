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

/**
 * Penanda simpul di peta pengetahuan (R9): bentuk monokrom, bukan warna, agar kategori terbaca di kedua
 * tema dan tanpa bergantung pada warna. Digambar oleh `markerPath()` di src/lib/graph.ts.
 */
export const categoryMarkers = ['circle', 'square', 'diamond', 'triangle', 'cross'] as const;
export type CategoryMarker = (typeof categoryMarkers)[number];

/**
 * Sub-kategori (topik) di dalam satu kategori. Konsep memilihnya lewat frontmatter `topic`
 * (divalidasi terhadap kategori konsep di lib/validate.ts). Urutan array = urutan tampil di halaman
 * kategori. Kategori tanpa `topics` menampilkan konsepnya sebagai satu daftar.
 */
export interface CategoryTopic {
  id: string;
  title: string;
}

export interface Category {
  id: CategoryId;
  title: string;
  description: string;
  motif: CategoryMotif;
  marker: CategoryMarker;
  topics?: readonly CategoryTopic[];
}

// Urutan array ini adalah urutan tampil di sidebar dan homepage.
export const categories: Category[] = [
  {
    id: 'foundations',
    title: 'Fondasi',
    motif: 'axes',
    marker: 'circle',
    description:
      'Konsep dasar untuk membaca risiko: probabilitas, distribusi, nilai harapan, dan variabilitas.',
  },
  {
    id: 'risk-management',
    title: 'Manajemen Risiko',
    motif: 'band',
    marker: 'square',
    description: 'Cara mengukur, membatasi, dan mengelola risiko dalam keputusan keuangan.',
  },
  {
    id: 'psychology',
    title: 'Psikologi',
    motif: 'oscillation',
    marker: 'diamond',
    description: 'Bagaimana emosi dan kondisi mental memengaruhi cara kita menghadapi risiko.',
    topics: [
      { id: 'bounded-rationality', title: 'Rasionalitas Terbatas' },
      { id: 'judgment-heuristics', title: 'Heuristik Penilaian' },
      { id: 'cognitive-biases', title: 'Bias Kognitif' },
    ],
  },
  {
    id: 'behavioral-finance',
    title: 'Keuangan Perilaku',
    motif: 'kink',
    marker: 'triangle',
    description: 'Pola perilaku dan bias yang muncul ketika manusia mengambil keputusan keuangan.',
    topics: [
      { id: 'decision-under-risk', title: 'Keputusan di Bawah Risiko' },
      { id: 'investor-behavior', title: 'Perilaku Investor' },
    ],
  },
  {
    id: 'decision-theory',
    title: 'Teori Keputusan',
    motif: 'tree',
    marker: 'cross',
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

/** Topik sebuah kategori, atau undefined bila id tidak dikenal di kategori itu. */
export function getTopic(categoryId: CategoryId, topicId: string): CategoryTopic | undefined {
  return getCategory(categoryId).topics?.find((t) => t.id === topicId);
}
