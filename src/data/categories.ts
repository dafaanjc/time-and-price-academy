export const categoryIds = [
  'foundations',
  'risk-management',
  'psychology',
  'behavioral-finance',
  'decision-theory',
] as const;

export type CategoryId = (typeof categoryIds)[number];

export interface Category {
  id: CategoryId;
  title: string;
  description: string;
}

// Urutan array ini adalah urutan tampil di sidebar dan homepage.
export const categories: Category[] = [
  {
    id: 'foundations',
    title: 'Fondasi',
    description:
      'Konsep dasar untuk membaca risiko: probabilitas, distribusi, nilai harapan, dan variabilitas.',
  },
  {
    id: 'risk-management',
    title: 'Manajemen Risiko',
    description: 'Cara mengukur, membatasi, dan mengelola risiko dalam keputusan keuangan.',
  },
  {
    id: 'psychology',
    title: 'Psikologi',
    description: 'Bagaimana emosi dan kondisi mental memengaruhi cara kita menghadapi risiko.',
  },
  {
    id: 'behavioral-finance',
    title: 'Keuangan Perilaku',
    description: 'Pola perilaku dan bias yang muncul ketika manusia mengambil keputusan keuangan.',
  },
  {
    id: 'decision-theory',
    title: 'Teori Keputusan',
    description: 'Kerangka untuk memilih tindakan terbaik ketika hasilnya tidak pasti.',
  },
];

export function getCategory(id: CategoryId): Category {
  const category = categories.find((c) => c.id === id);
  if (!category) throw new Error(`Kategori tidak dikenal: ${id}`);
  return category;
}
