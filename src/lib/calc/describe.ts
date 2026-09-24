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
