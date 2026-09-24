export interface LearningPath {
  id: string;
  title: string;
  description: string;
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
];
