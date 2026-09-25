import { describe, expect, it } from 'vitest';
import { describeDistribution, describeEquity, describeMaxStop, formatChance } from '../src/lib/calc/describe';
import {
  cumulative,
  density,
  distributionChart,
  distributionDomain,
  distributionLabels,
  distributionTicks,
  erf,
  horizon,
} from '../src/lib/calc/distribution';
import {
  drawdownHistogram,
  equityChart,
  expectedEquity,
  maxDrawdown,
  percentile,
  simulateEquity,
  summarizeEquity,
} from '../src/lib/calc/equity';
import { maxStopForLots, positionSize } from '../src/lib/calc/position-size';

/** Integrasi numerik (aturan trapesium) untuk memeriksa kepadatan terhadap CDF. */
const integrate = (f: (x: number) => number, a: number, b: number, n = 20_000) => {
  const h = (b - a) / n;
  let sum = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) sum += f(a + i * h);
  return sum * h;
};

describe('distribusi: normal vs ekor tebal', () => {
  it('erf cocok dengan nilai tabel', () => {
    expect(erf(0)).toBeCloseTo(0, 6);
    expect(erf(1)).toBeCloseTo(0.8427008, 6);
    expect(erf(-2)).toBeCloseTo(-0.9953223, 6);
  });

  it('aturan 68–95 pada model normal', () => {
    const within = (k: number) => cumulative(k, 0, 1) - cumulative(-k, 0, 1);
    expect(within(1)).toBeCloseTo(0.6827, 3);
    expect(within(2)).toBeCloseTo(0.9545, 3);
  });

  it.each(['normal', 'fat'] as const)('kepadatan %s berintegral 1 dan konsisten dengan CDF', (model) => {
    const mean = 2;
    const sd = 6;
    expect(integrate((x) => density(x, mean, sd, model), -2000, 2000, 400_000)).toBeCloseTo(1, 3);
    expect(integrate((x) => density(x, mean, sd, model), -1000, -4, 200_000)).toBeCloseTo(cumulative(-4, mean, sd, model), 3);
  });

  it('model ekor tebal (σ sama) memberi peluang lebih besar untuk hasil ekstrem', () => {
    const extreme = (model: 'normal' | 'fat') => cumulative(-3, 0, 1, model);
    expect(extreme('fat')).toBeGreaterThan(extreme('normal') * 3);
    expect(cumulative(0, 0, 1, 'fat')).toBeCloseTo(0.5, 10);
  });

  it('horizon: rata-rata ∝ t, simpangan baku ∝ √t', () => {
    expect(horizon({ meanPerPeriod: 0.5, sdPerPeriod: 3, periods: 4 })).toEqual({ mean: 2, sd: 6 });
  });

  it('domain x memakai langkah tetap dan memuat ambang', () => {
    expect(distributionDomain(2, 6, -10)).toBe(40);
    expect(distributionDomain(0, 1, -2)).toBe(5);
    expect(distributionDomain(0, 1, -30)).toBe(40);
  });

  it('koordinat grafik: E di posisi rata-rata, label σ disembunyikan bila rapat', () => {
    const chart = distributionChart(0, 5, -10);
    expect(chart.domain).toBe(20);
    expect(chart.at.mean).toBe(50);
    expect(chart.at.threshold).toBe(25);
    expect(chart.tail.startsWith('M0,240')).toBe(true);
    expect(distributionLabels(chart.at)).toEqual({ showSigma: true, thresholdRow: 1 });
    expect(distributionLabels(distributionChart(0, 0.5, -1).at).showSigma).toBe(false);
    expect(distributionTicks(40)).toEqual(['−40%', '−20%', '0%', '+20%', '+40%']);
  });
});

describe('kurva ekuitas dan drawdown', () => {
  const input = { winRate: 40, avgWinR: 2, riskPercent: 2 };

  it('simulasi deterministik per seed, dimulai 100', () => {
    const a = simulateEquity(input, 5, 50, 7);
    expect(a).toEqual(simulateEquity(input, 5, 50, 7));
    expect(a.every((p) => p[0] === 100 && p.length === 51)).toBe(true);
  });

  it('menang dan kalah berlipat dari modal berjalan', () => {
    const always = simulateEquity({ ...input, winRate: 100 }, 1, 2, 1)[0]!;
    expect(always[2]).toBeCloseTo(100 * 1.04 * 1.04, 10);
    const never = simulateEquity({ ...input, winRate: 0 }, 1, 2, 1)[0]!;
    expect(never[2]).toBeCloseTo(100 * 0.98 * 0.98, 10);
  });

  it('ekuitas harapan tumbuh sebesar risiko × nilai harapan per transaksi', () => {
    // EV = 0,4 × 2 − 0,6 = +0,2R → +0,4% per transaksi pada risiko 2%.
    expect(expectedEquity(input, 1)[1]).toBeCloseTo(100.4, 10);
  });

  it('drawdown maksimum dari puncak, bukan dari modal awal', () => {
    expect(maxDrawdown([100, 120, 90, 130, 117])).toBeCloseTo(25, 10);
    expect(maxDrawdown([100, 101, 102])).toBe(0);
  });

  it('persentil dengan interpolasi linear', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([0, 10], 25)).toBe(2.5);
  });

  it('ringkasan menghitung porsi yang melewati ambang', () => {
    const s = summarizeEquity([[100, 70], [100, 110], [100, 95, 120]], 20);
    expect(s.hitThreshold).toBeCloseTo(1 / 3, 10);
    expect(s.endedBelowStart).toBeCloseTo(1 / 3, 10);
    expect(s.medianEnd).toBe(110);
  });

  it('risiko lebih besar → drawdown lebih dalam (strategi yang sama, seed yang sama)', () => {
    const dd = (riskPercent: number) => summarizeEquity(simulateEquity({ ...input, riskPercent }, 200, 100, 1), 20).medianMaxDrawdown;
    expect(dd(5)).toBeGreaterThan(dd(1) * 3);
  });

  it('grafik: garis modal awal dan histogram di dalam bidang', () => {
    const paths = simulateEquity(input, 200, 100, 1);
    const chart = equityChart(paths, expectedEquity(input, 100), 24);
    expect(chart.samples).toHaveLength(24);
    expect(chart.min).toBeLessThan(100);
    expect(chart.max).toBeGreaterThan(100);
    expect(chart.startY).toBeGreaterThan(0);
    expect(chart.startY).toBeLessThan(chart.height);
    const hist = drawdownHistogram(summarizeEquity(paths, 20).drawdowns, 20);
    expect(hist.domain).toBeGreaterThanOrEqual(23);
    expect(hist.thresholdX).toBeCloseTo((20 / hist.domain) * 640, 0);
    expect(hist.outline.startsWith('M0,120')).toBe(true);
  });
});

describe('ukuran posisi: stop maksimum untuk lot tertentu', () => {
  const base = { capital: 50_000_000, riskPercent: 1, valuePerPointPerLot: 10_000 };

  it('kebalikan dari ukuran posisi', () => {
    expect(maxStopForLots({ ...base, lots: 1 })).toBe(50);
    expect(maxStopForLots({ ...base, lots: 0.5 })).toBe(100);
    expect(positionSize({ ...base, stopPoints: maxStopForLots({ ...base, lots: 0.25 }) }).lots).toBeCloseTo(0.25, 10);
    expect(maxStopForLots({ ...base, lots: 0 })).toBe(Infinity);
  });

  it('kalimat ringkasan', () => {
    expect(describeMaxStop(1, 50, 100)).toContain('harus dalam 50 poin');
    expect(describeMaxStop(0.5, 100, 100)).toContain('boleh sejauh 100 poin');
  });
});

describe('kalimat ringkasan instrumen baru', () => {
  it('peluang kecil dan besar tidak dibulatkan menjadi 0% / 100%', () => {
    expect(formatChance(0.0004)).toBe('< 0,1%');
    expect(formatChance(0.9996)).toBe('> 99,9%');
    expect(formatChance(0.1234)).toBe('12,3%');
    expect(formatChance(0)).toBe('0%');
  });

  it('distribusi menyebut rentang dan kedua model', () => {
    const text = describeDistribution({ periods: 4, mean: 2, sd: 6, threshold: -10, pNormal: 0.0228, pFat: 0.03 });
    expect(text).toContain('−4% sampai +8%');
    expect(text).toContain('(model ekor tebal)');
  });

  it('ekuitas menyebut nilai harapan dan ambang', () => {
    const text = describeEquity({
      paths: 200,
      trades: 100,
      evR: 0.2,
      threshold: 20,
      medianEnd: 140,
      p5End: 80,
      p95End: 240,
      endedBelowStart: 0.1,
      hitThreshold: 0.35,
      medianMaxDrawdown: 17.26,
    });
    expect(text).toContain('+0,2R');
    expect(text).toContain('35% rangkaian pernah turun 20%');
  });
});
