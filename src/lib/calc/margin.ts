// Status margin akun dan jarak ke margin call / stop out. Fungsi murni.
// Lihat konsep "Leverage & Margin". Level margin call/stop out berbeda tiap broker: selalu input.

export interface MarginInput {
  /** Ekuitas akun (rupiah). */
  equity: number;
  /** Ukuran posisi terbuka (lot). */
  lots: number;
  /** Margin yang dikunci per 1 lot (rupiah). */
  marginPerLot: number;
  /** Nilai per poin per 1 lot (rupiah). */
  valuePerPointPerLot: number;
  /** Level margin call dalam persen, mis. 100. */
  marginCallLevel: number;
  /** Level stop out dalam persen, mis. 50. */
  stopOutLevel: number;
}

export interface MarginResult {
  usedMargin: number;
  freeMargin: number;
  /** Margin level dalam persen; Infinity bila tidak ada posisi. */
  marginLevel: number;
  /** Poin pergerakan melawan posisi sampai margin level = level margin call (0 bila sudah lewat). */
  pointsToMarginCall: number;
  pointsToStopOut: number;
  /** Rugi (rupiah) saat stop out tercapai. */
  lossAtStopOut: number;
}

/** Poin melawan posisi sampai ekuitas turun ke `level`% dari margin terpakai. */
function pointsToLevel(input: MarginInput, used: number, level: number): number {
  const lossAllowed = input.equity - (level / 100) * used;
  const perPoint = input.lots * input.valuePerPointPerLot;
  if (perPoint <= 0) return Infinity;
  return Math.max(0, lossAllowed / perPoint);
}

export function marginStatus(input: MarginInput): MarginResult {
  const usedMargin = input.lots * input.marginPerLot;
  const marginLevel = usedMargin > 0 ? (input.equity / usedMargin) * 100 : Infinity;
  const lossAtStopOut = Math.max(0, input.equity - (input.stopOutLevel / 100) * usedMargin);
  return {
    usedMargin,
    freeMargin: input.equity - usedMargin,
    marginLevel,
    pointsToMarginCall: pointsToLevel(input, usedMargin, input.marginCallLevel),
    pointsToStopOut: pointsToLevel(input, usedMargin, input.stopOutLevel),
    lossAtStopOut: usedMargin > 0 ? lossAtStopOut : 0,
  };
}
