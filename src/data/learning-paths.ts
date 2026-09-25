// Jalur belajar bertingkat: Fondasi (probabilitas, nilai harapan, varians) → Psikologi (heuristik & bias)
// → Keuangan Perilaku (keputusan di bawah risiko). Tingkat sebuah jalur tidak ditulis manual; ia dihitung
// dari `requires` (pathTiers di bawah): jalur tanpa `requires` = tahap 1, lainnya = 1 + tahap
// terdalam jalur yang dibutuhkan. Semua aturan di bawah divalidasi saat build (lib/validate.ts).

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  /**
   * Id jalur yang perlu diselesaikan lebih dulu. Jalur yang dirujuk harus muncul lebih awal di array ini.
   * Prasyarat sebuah langkah boleh dipenuhi oleh langkah sebelumnya di jalur ini **atau** oleh langkah
   * di jalur yang dibutuhkan (termasuk secara berantai).
   */
  requires?: string[];
  /** Slug konsep, berurutan. Divalidasi saat build terhadap koleksi `concepts`. */
  steps: string[];
}

export const learningPaths: LearningPath[] = [
  {
    id: 'fondasi-risiko',
    title: 'Fondasi Risiko',
    description:
      'Enam langkah dari pengertian risiko hingga cara mengukur seberapa jauh hasil bisa menyimpang.',
    steps: [
      'risk',
      'risk-vs-uncertainty',
      'probability',
      'probability-distribution',
      'expected-value',
      'variance-and-volatility',
    ],
  },
  {
    id: 'heuristik-dan-bias',
    title: 'Heuristik dan Bias',
    description:
      'Dari batas kemampuan berhitung manusia ke jalan pintas yang dipakai untuk menilai peluang, dan kesalahan sistematis yang menyertainya.',
    requires: ['fondasi-risiko'],
    steps: ['bounded-rationality', 'heuristics', 'representativeness', 'availability', 'anchoring', 'overconfidence'],
  },
  {
    id: 'keputusan-di-bawah-risiko',
    title: 'Keputusan di Bawah Risiko',
    description:
      'Bagaimana orang benar-benar memilih ketika hasilnya tidak pasti: titik acuan, aversi kerugian, teori prospek, dan jejaknya di perilaku investor.',
    requires: ['heuristik-dan-bias'],
    steps: ['reference-point', 'loss-aversion', 'prospect-theory', 'framing-effect', 'disposition-effect'],
  },
];

/** Tahap setiap jalur. `requires` dijamin merujuk jalur sebelumnya (validate.ts), jadi satu lintasan cukup. */
export function pathTiers(paths: Pick<LearningPath, 'id' | 'requires'>[]): Map<string, number> {
  const tiers = new Map<string, number>();
  for (const p of paths) {
    tiers.set(p.id, 1 + Math.max(0, ...(p.requires ?? []).map((r) => tiers.get(r) ?? 0)));
  }
  return tiers;
}
