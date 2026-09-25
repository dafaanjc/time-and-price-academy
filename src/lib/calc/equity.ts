// Kurva ekuitas dan drawdown: rangkaian transaksi dengan risiko tetap (persen modal BERJALAN), sehingga
// hasil berlipat (compounding). Fungsi murni, dipakai alat SimulasiEkuitas.
// Lihat konsep "Nilai Harapan", "Varians & Volatilitas", dan "Risiko Kehancuran".
import { mulberry32, type ExpectancyInput } from './expected-value';

export interface EquityInput extends ExpectancyInput {
  /** Risiko per transaksi, persen modal berjalan (rugi saat kalah = 1R = riskPercent%). */
  riskPercent: number;
}

/**
 * `paths` rangkaian `trades` transaksi. Ekuitas dinyatakan dalam persen modal awal (dimulai 100).
 * Menang: × (1 + risk × avgWinR); kalah: × (1 − risk).
 */
export function simulateEquity(input: EquityInput, paths: number, trades: number, seed: number): number[][] {
  const random = mulberry32(seed);
  const p = input.winRate / 100;
  const up = 1 + (input.riskPercent / 100) * input.avgWinR;
  const down = 1 - input.riskPercent / 100;
  return Array.from({ length: paths }, () => {
    const series = [100];
    let equity = 100;
    for (let i = 0; i < trades; i++) {
      equity *= random() < p ? up : down;
      series.push(equity);
    }
    return series;
  });
}

/** Ekuitas yang diharapkan (rata-rata semua kemungkinan) setelah tiap transaksi. */
export function expectedEquity(input: EquityInput, trades: number): number[] {
  const p = input.winRate / 100;
  const growth = 1 + (input.riskPercent / 100) * (p * input.avgWinR - (1 - p));
  return Array.from({ length: trades + 1 }, (_, i) => 100 * growth ** i);
}

/** Penurunan terdalam dari puncak sebelumnya, dalam persen puncak. */
export function maxDrawdown(series: number[]): number {
  let peak = -Infinity;
  let deepest = 0;
  for (const v of series) {
    peak = Math.max(peak, v);
    if (peak > 0) deepest = Math.max(deepest, ((peak - v) / peak) * 100);
  }
  return deepest;
}

/** Persentil (0–100) dengan interpolasi linear. `values` tidak diubah. */
export function percentile(values: number[], q: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (Math.max(0, Math.min(100, q)) / 100) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

export interface EquitySummary {
  medianEnd: number;
  p5End: number;
  p95End: number;
  /** Porsi rangkaian (0–1) yang berakhir di bawah modal awal. */
  endedBelowStart: number;
  /** Porsi rangkaian (0–1) yang pernah turun ≥ ambang drawdown dari puncak. */
  hitThreshold: number;
  medianMaxDrawdown: number;
  p95MaxDrawdown: number;
  /** Drawdown maksimum per rangkaian (untuk histogram). */
  drawdowns: number[];
}

export function summarizeEquity(paths: number[][], thresholdPercent: number): EquitySummary {
  const ends = paths.map((p) => p.at(-1) ?? 100);
  const drawdowns = paths.map(maxDrawdown);
  const n = Math.max(1, paths.length);
  return {
    medianEnd: percentile(ends, 50),
    p5End: percentile(ends, 5),
    p95End: percentile(ends, 95),
    endedBelowStart: ends.filter((e) => e < 100).length / n,
    hitThreshold: drawdowns.filter((d) => d >= thresholdPercent).length / n,
    medianMaxDrawdown: percentile(drawdowns, 50),
    p95MaxDrawdown: percentile(drawdowns, 95),
    drawdowns,
  };
}

const EQUITY_STEPS = [110, 125, 150, 200, 300, 500, 1000, 2000, 5000];
const DRAWDOWN_STEPS = [10, 20, 40, 60, 80, 100];

export interface EquityChart {
  width: number;
  height: number;
  /** Batas sumbu y (persen modal awal). */
  min: number;
  max: number;
  /** `points` untuk rangkaian contoh, persentil 5/95, median, dan nilai harapan. */
  samples: string[];
  p5: string;
  p95: string;
  median: string;
  expected: string;
  /** Posisi y (satuan viewBox) dan (0–100, persen tinggi) garis modal awal. */
  startY: number;
  startAt: number;
}

/**
 * Koordinat SVG kurva ekuitas: waktu (transaksi) ke kanan, ekuitas ke atas. Batas atas dari langkah tetap
 * agar skala tidak melompat kecil-kecil setiap input berubah; batas bawah 0 atau kelipatan 25 di bawah hasil.
 */
export function equityChart(paths: number[][], expected: number[], sampleCount: number, width = 640, height = 240): EquityChart {
  const trades = Math.max(1, (paths[0]?.length ?? 1) - 1);
  const steps = Array.from({ length: trades + 1 }, (_, i) => paths.map((p) => p[i] ?? 100));
  const p5 = steps.map((s) => percentile(s, 5));
  const p50 = steps.map((s) => percentile(s, 50));
  const p95 = steps.map((s) => percentile(s, 95));
  const shown = paths.slice(0, sampleCount);
  const high = Math.max(...p95, ...expected, ...shown.flat(), 100);
  const low = Math.min(...p5, ...shown.flat(), 100);
  const max = EQUITY_STEPS.find((s) => s >= high * 1.02) ?? Math.ceil(high / 1000) * 1000;
  const min = Math.max(0, Math.floor((low * 0.98) / 25) * 25);
  const span = max - min || 1;
  const fmt = (n: number) => Math.round(n * 10) / 10;
  const x = (i: number) => (i / trades) * width;
  const y = (v: number) => height - ((Math.min(max, Math.max(min, v)) - min) / span) * height;
  const line = (series: number[]) => series.map((v, i) => `${fmt(x(i))},${fmt(y(v))}`).join(' ');
  return {
    width,
    height,
    min,
    max,
    samples: shown.map(line),
    p5: line(p5),
    p95: line(p95),
    median: line(p50),
    expected: line(expected),
    startY: fmt(y(100)),
    startAt: Math.round((y(100) / height) * 1000) / 10,
  };
}

export interface DrawdownHistogram {
  width: number;
  height: number;
  /** Batas kanan sumbu x (persen drawdown). */
  domain: number;
  /** Garis tangga (outline histogram). */
  outline: string;
  /** Area bin di atas/sama dengan ambang. */
  beyond: string;
  thresholdX: number;
  thresholdAt: number;
}

/** Histogram drawdown maksimum: 20 bin dari 0 sampai domain, digambar sebagai garis tangga. */
export function drawdownHistogram(drawdowns: number[], thresholdPercent: number, width = 640, height = 120, bins = 20): DrawdownHistogram {
  const need = Math.max(percentile(drawdowns, 99) * 1.05, thresholdPercent * 1.15);
  const domain = DRAWDOWN_STEPS.find((s) => s >= need) ?? 100;
  const counts = new Array<number>(bins).fill(0);
  for (const d of drawdowns) counts[Math.min(bins - 1, Math.floor((d / domain) * bins))]! += 1;
  const peak = Math.max(1, ...counts);
  const fmt = (n: number) => Math.round(n * 10) / 10;
  const bw = width / bins;
  const y = (c: number) => fmt(height - (c / peak) * height * 0.9);
  const thresholdX = fmt(Math.min(width, (thresholdPercent / domain) * width));

  let outline = `M0,${height}`;
  let beyond = '';
  counts.forEach((c, i) => {
    const x0 = fmt(i * bw);
    const x1 = fmt((i + 1) * bw);
    outline += ` L${x0},${y(c)} L${x1},${y(c)}`;
    // Bagian bin yang berada di kanan ambang.
    const from = Math.max(x0, thresholdX);
    if (c > 0 && x1 > from) beyond += `M${fmt(from)},${height} L${fmt(from)},${y(c)} L${x1},${y(c)} L${x1},${height} Z `;
  });
  outline += ` L${width},${height}`;
  return { width, height, domain, outline, beyond: beyond.trim(), thresholdX, thresholdAt: Math.round((thresholdX / width) * 1000) / 10 };
}
