import { describe, expect, it } from 'vitest';
import { losingStreak, recoveryNeeded } from '../src/lib/calc/drawdown';
import { breakevenWinRate, expectancyR, mulberry32, simulatePaths, summarize } from '../src/lib/calc/expected-value';
import { marginStatus } from '../src/lib/calc/margin';
import { positionSize, riskForLots } from '../src/lib/calc/position-size';

// Angka yang diuji di sini sama dengan angka di konten (konsep & masalah trader),
// sehingga tabel di halaman tidak bisa diam-diam berbeda dari rumusnya.
const base = { capital: 50_000_000, riskPercent: 1, valuePerPointPerLot: 10_000 };

describe('positionSize', () => {
  it.each([
    [100, 0.5],
    [50, 1],
    [200, 0.25],
  ])('stop loss %i poin → %f lot', (stopPoints, lots) => {
    const r = positionSize({ ...base, stopPoints });
    expect(r.riskAmount).toBe(500_000);
    expect(r.lots).toBeCloseTo(lots, 10);
  });

  it('membulatkan ke bawah, tidak pernah ke atas', () => {
    const r = positionSize({ capital: 10_000_000, riskPercent: 1, stopPoints: 37, valuePerPointPerLot: 10_000 });
    expect(r.lots).toBeCloseTo(0.27, 10);
    expect(r.lossAtStop).toBeLessThanOrEqual(r.riskAmount);
  });

  it('tahan galat floating point (0,3 bukan 0,29)', () => {
    const r = positionSize({ capital: 3_000_000, riskPercent: 1, stopPoints: 10, valuePerPointPerLot: 10_000 });
    expect(r.lots).toBeCloseTo(0.3, 10);
  });

  it('menghasilkan 0 bila di bawah lot minimum', () => {
    const r = positionSize({ capital: 1_000_000, riskPercent: 1, stopPoints: 200, valuePerPointPerLot: 10_000 });
    expect(r.lots).toBe(0);
  });

  it('risiko sebenarnya dari lot tertentu (tabel "lot kebesaran")', () => {
    for (const [lots, pct] of [
      [0.5, 1],
      [1, 2],
      [2, 4],
    ] as const) {
      const r = riskForLots({ capital: base.capital, stopPoints: 100, valuePerPointPerLot: 10_000, lots });
      expect(r.riskPercent).toBeCloseTo(pct);
    }
  });
});

describe('marginStatus (tabel di konsep Leverage & Margin)', () => {
  const account = {
    equity: 10_000_000,
    marginPerLot: 5_000_000,
    valuePerPointPerLot: 10_000,
    marginCallLevel: 100,
    stopOutLevel: 50,
  };

  it.each([
    [0.2, 1000, 4500, 4750, 9_500_000],
    [1, 200, 500, 750, 7_500_000],
    [1.8, 111, 56, 306, 5_500_000],
  ])('%f lot → level %i persen, ±%i poin ke MC, ±%i poin ke SO, rugi %i saat SO', (lots, level, toMc, toSo, loss) => {
    const r = marginStatus({ ...account, lots });
    expect(Math.round(r.marginLevel)).toBe(level);
    expect(Math.round(r.pointsToMarginCall)).toBe(toMc);
    expect(Math.round(r.pointsToStopOut)).toBe(toSo);
    expect(r.lossAtStopOut).toBeCloseTo(loss);
  });

  it('tanpa posisi: margin level tak terhingga, tanpa risiko stop out', () => {
    const r = marginStatus({ ...account, lots: 0 });
    expect(r.marginLevel).toBe(Infinity);
    expect(r.lossAtStopOut).toBe(0);
  });

  it('jarak tidak pernah negatif bila akun sudah di bawah level', () => {
    expect(marginStatus({ ...account, equity: 4_000_000, lots: 1.8 }).pointsToMarginCall).toBe(0);
  });
});

describe('drawdown (tabel di konsep Risiko Kehancuran)', () => {
  it.each([
    [10, 11.1],
    [20, 25],
    [30, 42.9],
    [50, 100],
    [75, 300],
    [90, 900],
  ])('turun %i persen butuh naik %f persen', (down, up) => {
    expect(recoveryNeeded(down)).toBeCloseTo(up, 1);
  });

  it.each([
    [1, 90.4],
    [2, 81.7],
    [5, 59.9],
    [10, 34.9],
  ])('10 kalah beruntun, risiko tetap %i persen → sisa %f persen', (risk, left) => {
    expect(losingStreak(risk, 10, 'fixed').at(-1)?.remainingPercent).toBeCloseTo(left, 1);
  });

  it('menggandakan risiko setelah rugi: 6 kali kalah → sisa 37% (vs 94,1% bila tetap)', () => {
    const doubled = losingStreak(1, 6, 'double');
    expect(doubled.map((r) => r.riskPercent)).toEqual([1, 2, 4, 8, 16, 32]);
    expect(doubled.at(-1)?.remainingPercent).toBeCloseTo(37);
    expect(losingStreak(1, 6, 'fixed').at(-1)?.remainingPercent).toBeCloseTo(94.1, 1);
  });

  it('modal tidak pernah di bawah 0', () => {
    expect(losingStreak(10, 20, 'double').at(-1)?.remainingPercent).toBe(0);
  });
});

describe('nilai harapan', () => {
  it('40% menang, +2R → +0,2R per transaksi; impas di 33,3%', () => {
    expect(expectancyR({ winRate: 40, avgWinR: 2 })).toBeCloseTo(0.2);
    expect(breakevenWinRate(2)).toBeCloseTo(33.33, 2);
  });

  it('simulasi deterministik untuk seed yang sama', () => {
    const a = simulatePaths({ winRate: 40, avgWinR: 2 }, 5, 50, 42);
    expect(simulatePaths({ winRate: 40, avgWinR: 2 }, 5, 50, 42)).toEqual(a);
    expect(a).toHaveLength(5);
    expect(a[0]).toHaveLength(51);
  });

  it('PRNG menghasilkan angka di [0, 1)', () => {
    const random = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('ringkasan simulasi', () => {
    const s = summarize([
      [0, 1, -1, 2],
      [0, -1, -2, -3],
    ]);
    expect(s).toEqual({ endedLosing: 1, worstEnd: -3, bestEnd: 2, deepestDrawdown: 3 });
  });
});
