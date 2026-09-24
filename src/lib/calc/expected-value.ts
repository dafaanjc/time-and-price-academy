// Nilai harapan dalam satuan R dan simulasi rangkaian transaksi. Fungsi murni.
// Lihat konsep "Nilai Harapan" dan "Varians & Volatilitas".

export interface ExpectancyInput {
  /** Peluang menang, 0–100 (persen). */
  winRate: number;
  /** Rata-rata untung saat menang, dalam R (1R = rugi yang direncanakan). */
  avgWinR: number;
}

/** Nilai harapan per transaksi dalam R (rugi saat kalah = 1R). */
export function expectancyR({ winRate, avgWinR }: ExpectancyInput): number {
  const p = winRate / 100;
  return p * avgWinR - (1 - p);
}

/** Peluang menang minimum (persen) agar nilai harapan ≥ 0 untuk rasio untung `avgWinR`. */
export function breakevenWinRate(avgWinR: number): number {
  return (1 / (1 + avgWinR)) * 100;
}

/** PRNG deterministik (mulberry32): simulasi yang sama untuk seed yang sama (bisa diuji & dibagikan). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `paths` rangkaian berisi `trades` transaksi. Tiap transaksi: menang +avgWinR dengan peluang winRate,
 * kalah −1R sebaliknya. Mengembalikan hasil kumulatif (R) per rangkaian, diawali 0.
 */
export function simulatePaths(input: ExpectancyInput, paths: number, trades: number, seed: number): number[][] {
  const random = mulberry32(seed);
  const p = input.winRate / 100;
  return Array.from({ length: paths }, () => {
    const cumulative = [0];
    let total = 0;
    for (let i = 0; i < trades; i++) {
      total += random() < p ? input.avgWinR : -1;
      cumulative.push(total);
    }
    return cumulative;
  });
}

export interface SimulationSummary {
  endedLosing: number;
  worstEnd: number;
  bestEnd: number;
  /** Penurunan terdalam dari puncak (R) di antara semua rangkaian. */
  deepestDrawdown: number;
}

export function summarize(paths: number[][]): SimulationSummary {
  const ends = paths.map((p) => p.at(-1) ?? 0);
  const drawdowns = paths.map((p) => {
    let peak = 0;
    let deepest = 0;
    for (const v of p) {
      peak = Math.max(peak, v);
      deepest = Math.max(deepest, peak - v);
    }
    return deepest;
  });
  return {
    endedLosing: ends.filter((e) => e < 0).length,
    worstEnd: Math.min(...ends),
    bestEnd: Math.max(...ends),
    deepestDrawdown: Math.max(...drawdowns),
  };
}
