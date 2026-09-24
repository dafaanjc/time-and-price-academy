// Kalah beruntun dan pemulihan drawdown. Fungsi murni, hitungan pasti (tanpa angka acak).
// Lihat konsep "Risiko Kehancuran".

/** Kenaikan (persen) yang dibutuhkan untuk kembali ke modal awal setelah turun `drawdownPercent`. */
export function recoveryNeeded(drawdownPercent: number): number {
  if (drawdownPercent >= 100) return Infinity;
  return (1 / (1 - drawdownPercent / 100) - 1) * 100;
}

export interface StreakRow {
  /** Kekalahan ke-n (mulai 1). */
  loss: number;
  /** Risiko transaksi ini dalam persen modal AWAL. */
  riskPercent: number;
  /** Sisa modal (persen modal awal) setelah kekalahan ini. */
  remainingPercent: number;
}

/**
 * Rangkaian kekalahan beruntun.
 * - `fixed`: risiko tetap `riskPercent`% dari modal BERJALAN.
 * - `double`: risiko digandakan tiap kalah (1×, 2×, 4×, … dari `riskPercent`% modal AWAL), sampai modal habis.
 */
export function losingStreak(riskPercent: number, losses: number, mode: 'fixed' | 'double'): StreakRow[] {
  const rows: StreakRow[] = [];
  let remaining = 100;
  for (let n = 1; n <= losses; n++) {
    const risk = mode === 'fixed' ? (remaining * riskPercent) / 100 : Math.min(remaining, riskPercent * 2 ** (n - 1));
    remaining = Math.max(0, remaining - risk);
    rows.push({ loss: n, riskPercent: risk, remainingPercent: remaining });
  }
  return rows;
}
