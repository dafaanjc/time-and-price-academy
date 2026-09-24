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
