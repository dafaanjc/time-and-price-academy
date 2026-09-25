// Kalimat ringkasan hasil alat hitung. Dipakai di server (hasil awal) dan di browser (setelah input
// berubah), jadi teksnya selalu sama. Fungsi murni.
import { formatNumber, formatRupiah } from '../format';
import type { MarginInput, MarginResult } from './margin';
import type { PositionSizeResult } from './position-size';

export function describePositionSize(result: PositionSizeResult, minLot: number): string {
  if (result.lots < minLot) {
    return `Posisi terkecil (${formatNumber(minLot)} lot) sudah melebihi batas risiko ${formatRupiah(result.riskAmount)} dengan stop loss ini.`;
  }
  return `Dengan batas risiko ${formatRupiah(result.riskAmount)}, ukuran posisi maksimum ${formatNumber(result.lots)} lot.`;
}

export function describeUsualLots(lots: number, riskAmount: number, riskPercent: number, planPercent: number): string {
  const ratio = planPercent > 0 ? riskPercent / planPercent : 0;
  const base = `Dengan ${formatNumber(lots)} lot, rugi di stop loss ${formatRupiah(riskAmount)} (${formatNumber(riskPercent)}% modal)`;
  return ratio > 1.001 ? `${base}, ${formatNumber(ratio)}× batas risiko Anda.` : `${base}, masih dalam batas risiko.`;
}

export function describeMargin(input: MarginInput, r: MarginResult): string {
  if (input.lots <= 0) return 'Belum ada posisi terbuka: margin level tidak terbatas.';
  const level = formatNumber(Math.round(r.marginLevel));
  const toMc = formatNumber(Math.round(r.pointsToMarginCall));
  const toSo = formatNumber(Math.round(r.pointsToStopOut));
  return `Margin level ${level}%: sekitar ${toMc} poin melawan posisi sampai margin call dan ${toSo} poin sampai stop out.`;
}

export function describeStreak(losses: number, fixedLeft: number, doubledLeft: number): string {
  const recovery = (left: number) =>
    left <= 0 ? 'modal habis' : `perlu naik ${formatNumber(Math.round(((100 / left - 1) * 100) * 10) / 10)}% untuk pulih`;
  return (
    `Setelah ${losses} kali kalah: risiko tetap menyisakan ${formatNumber(Math.round(fixedLeft * 10) / 10)}% modal ` +
    `(${recovery(fixedLeft)}); menggandakan risiko menyisakan ${formatNumber(Math.round(doubledLeft * 10) / 10)}% ` +
    `(${recovery(doubledLeft)}).`
  );
}

export function describeExpectancy(ev: number, breakeven: number, paths: number, trades: number, s: {
  endedLosing: number;
  worstEnd: number;
  bestEnd: number;
  deepestDrawdown: number;
}): string {
  const r = (v: number, digits = 1) => {
    const f = 10 ** digits;
    return `${v >= 0 ? '+' : '−'}${formatNumber(Math.abs(Math.round(v * f) / f))}R`;
  };
  return (
    // Nilai harapan 2 desimal, sama dengan tampilan hasil di alat.
    `Nilai harapan ${r(ev, 2)} per transaksi (impas di peluang menang ${formatNumber(Math.round(breakeven * 10) / 10)}%). ` +
    `Dari ${paths} simulasi ${trades} transaksi, ${s.endedLosing} berakhir rugi; hasil akhir ${r(s.worstEnd)} sampai ${r(s.bestEnd)}; ` +
    `penurunan terdalam ${formatNumber(Math.round(s.deepestDrawdown * 10) / 10)}R.`
  );
}

export function describeMaxStop(lots: number, maxStopPoints: number, stopPoints: number): string {
  const max = formatNumber(Math.floor(maxStopPoints));
  const fits = stopPoints <= maxStopPoints * 1.001;
  return fits
    ? `Dengan ${formatNumber(lots)} lot, stop loss boleh sejauh ${max} poin sebelum melewati batas.`
    : `Agar ${formatNumber(lots)} lot tetap dalam batas, stop loss harus dalam ${max} poin, atau lot diperkecil.`;
}

/** Persen peluang yang mudah dibaca: < 0,1% ditulis "< 0,1%". */
export function formatChance(p: number): string {
  const pct = p * 100;
  if (pct > 0 && pct < 0.1) return '< 0,1%';
  if (pct < 99.9 || pct >= 100) return `${formatNumber(Math.round(pct * 10) / 10)}%`;
  return '> 99,9%';
}

const signedPct = (v: number) => `${v >= 0 ? '+' : '−'}${formatNumber(Math.abs(Math.round(v * 10) / 10))}%`;

export function describeDistribution(d: {
  periods: number;
  mean: number;
  sd: number;
  threshold: number;
  pNormal: number;
  pFat?: number;
}): string {
  const range = (k: number) => `${signedPct(d.mean - k * d.sd)} sampai ${signedPct(d.mean + k * d.sd)}`;
  const base =
    `Setelah ${d.periods} periode: rata-rata ${signedPct(d.mean)}, simpangan baku ${formatNumber(Math.round(d.sd * 10) / 10)}%. ` +
    `Sekitar 68% hasil di ${range(1)}; sekitar 95% di ${range(2)}. ` +
    `Peluang hasil ${signedPct(d.threshold)} atau lebih buruk: ${formatChance(d.pNormal)} (model normal)`;
  return d.pFat === undefined ? `${base}.` : `${base}, ${formatChance(d.pFat)} (model ekor tebal).`;
}

export function describeEquity(d: {
  paths: number;
  trades: number;
  evR: number;
  threshold: number;
  medianEnd: number;
  p5End: number;
  p95End: number;
  endedBelowStart: number;
  hitThreshold: number;
  medianMaxDrawdown: number;
}): string {
  const r = `${d.evR >= 0 ? '+' : '−'}${formatNumber(Math.abs(Math.round(d.evR * 100) / 100))}R`;
  const eq = (v: number) => `${formatNumber(Math.round(v))}%`;
  return (
    `Nilai harapan ${r} per transaksi. Dari ${d.paths} simulasi ${d.trades} transaksi, median modal akhir ${eq(d.medianEnd)} ` +
    `dari modal awal (90% rangkaian di ${eq(d.p5End)}–${eq(d.p95End)}); ${formatChance(d.endedBelowStart)} berakhir di bawah modal awal. ` +
    `${formatChance(d.hitThreshold)} rangkaian pernah turun ${formatNumber(d.threshold)}% atau lebih dari puncaknya; ` +
    `median penurunan terdalam ${formatNumber(Math.round(d.medianMaxDrawdown * 10) / 10)}%.`
  );
}
