// Ukuran posisi dari batas risiko dan jarak stop loss. Fungsi murni (dipakai contoh statis
// di beranda dan, nanti, kalkulator interaktif). Lihat konsep "Ukuran Posisi".

export interface PositionSizeInput {
  /** Modal/ekuitas dalam rupiah. */
  capital: number;
  /** Risiko per transaksi dalam persen modal, mis. 1 untuk 1%. */
  riskPercent: number;
  /** Jarak stop loss dalam poin. */
  stopPoints: number;
  /** Nilai per poin untuk 1 lot, dalam rupiah (spesifikasi instrumen/broker). */
  valuePerPointPerLot: number;
  /** Langkah lot terkecil yang tersedia, mis. 0,01. */
  lotStep?: number;
}

export interface PositionSizeResult {
  /** Risiko per transaksi dalam rupiah. */
  riskAmount: number;
  /** Ukuran posisi, dibulatkan KE BAWAH ke langkah lot. */
  lots: number;
  /** Rugi bila stop loss tersentuh dengan ukuran yang sudah dibulatkan. */
  lossAtStop: number;
}

export function positionSize(input: PositionSizeInput): PositionSizeResult {
  const { capital, riskPercent, stopPoints, valuePerPointPerLot, lotStep = 0.01 } = input;
  const riskAmount = (capital * riskPercent) / 100;
  const rawLots = riskAmount / (stopPoints * valuePerPointPerLot);
  // Pembulatan ke bawah dengan toleransi galat floating point (mis. 0.49999999 → 0.5).
  const lots = Math.floor(rawLots / lotStep + 1e-9) * lotStep;
  return { riskAmount, lots, lossAtStop: lots * stopPoints * valuePerPointPerLot };
}

/** Risiko sebenarnya bila memakai ukuran lot tertentu (mis. "lot yang biasa dipakai"). */
export function riskForLots(input: Omit<PositionSizeInput, 'riskPercent' | 'lotStep'> & { lots: number }): {
  riskAmount: number;
  riskPercent: number;
} {
  const riskAmount = input.lots * input.stopPoints * input.valuePerPointPerLot;
  return { riskAmount, riskPercent: input.capital > 0 ? (riskAmount / input.capital) * 100 : 0 };
}

const GAUGE_STEPS = [1, 2, 3, 5, 10, 20, 30, 50, 100];

/**
 * Skala meter risiko pada alat ukuran posisi: 0 sampai `max` (angka bulat dari GAUGE_STEPS, cukup untuk
 * ±2,5× batas dan risiko aktual), dengan posisi batas dan risiko aktual dalam persen lebar skala (0–100).
 */
export function riskGauge(limitPercent: number, actualPercent: number): { max: number; limitAt: number; actualAt: number } {
  const need = Math.max(limitPercent * 2.5, actualPercent * 1.1, 0);
  const max = GAUGE_STEPS.find((s) => s >= need) ?? GAUGE_STEPS[GAUGE_STEPS.length - 1]!;
  const at = (v: number) => Math.max(0, Math.min(100, (v / max) * 100));
  return { max, limitAt: at(limitPercent), actualAt: at(actualPercent) };
}

/**
 * Jarak stop loss terjauh (poin) agar `lots` tertentu tetap dalam batas risiko: kebalikan dari ukuran
 * posisi. Menjawab "dengan lot yang biasa gue pakai, stop gue harus sedekat apa?".
 */
export function maxStopForLots(input: Omit<PositionSizeInput, 'stopPoints' | 'lotStep'> & { lots: number }): number {
  const { capital, riskPercent, valuePerPointPerLot, lots } = input;
  if (lots <= 0 || valuePerPointPerLot <= 0) return Infinity;
  return (capital * riskPercent) / 100 / (lots * valuePerPointPerLot);
}
