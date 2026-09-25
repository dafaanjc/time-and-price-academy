import { describe, expect, it } from 'vitest';
import { losingStreak } from '../src/lib/calc/drawdown';
import {
  halfWidth,
  hourglassGeometry,
  hourglassScale,
  hourglassState,
  levelForFraction,
  describeHourglass,
  formatRecovery,
  remainingAfterLosses,
} from '../src/lib/hourglass';

describe('remainingAfterLosses', () => {
  it('sama dengan losingStreak mode fixed', () => {
    for (const risk of [1, 2, 5, 10]) {
      for (const n of [1, 5, 10, 20]) {
        expect(remainingAfterLosses(risk, n)).toBeCloseTo(losingStreak(risk, n, 'fixed').at(-1)!.remainingPercent, 9);
      }
    }
  });

  it('cocok dengan tabel 10 kali kalah di konten (dibulatkan 0,1)', () => {
    const r = (risk: number) => Math.round(remainingAfterLosses(risk, 10) * 10) / 10;
    expect(r(1)).toBe(90.4);
    expect(r(5)).toBe(59.9);
    expect(r(10)).toBe(34.9);
  });

  it('tanpa kekalahan modal utuh', () => {
    expect(remainingAfterLosses(5, 0)).toBe(100);
  });
});

describe('levelForFraction', () => {
  it('batas: kosong di leher, penuh di tutup', () => {
    expect(levelForFraction(0)).toBe(0);
    expect(levelForFraction(1)).toBeCloseTo(1, 6);
  });

  it('monoton naik', () => {
    let prev = -1;
    for (let f = 0; f <= 1.0001; f += 0.05) {
      const u = levelForFraction(f);
      expect(u).toBeGreaterThan(prev);
      prev = u;
    }
  });

  it('separuh volume berada di atas separuh tinggi (bahu lebih lebar dari leher)', () => {
    expect(levelForFraction(0.5)).toBeGreaterThan(0.5);
  });

  it('dijepit ke 0–1', () => {
    expect(levelForFraction(-1)).toBe(0);
    expect(levelForFraction(2)).toBeCloseTo(1, 6);
  });
});

describe('hourglassGeometry', () => {
  const geo = hourglassGeometry();

  it('lebar kaca: leher sempit, tutup lebar', () => {
    expect(halfWidth(0, 60, 2.5)).toBe(2.5);
    expect(halfWidth(1, 60, 2.5)).toBeCloseTo(60, 6);
  });

  it('path tertutup dan tetap di dalam viewBox', () => {
    for (const d of [geo.glass, geo.topBulb, geo.bottomBulb]) {
      expect(d.endsWith('Z')).toBe(true);
      for (const [, x, y] of d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)) {
        expect(Number(x)).toBeGreaterThanOrEqual(0);
        expect(Number(x)).toBeLessThanOrEqual(geo.width);
        expect(Number(y)).toBeGreaterThanOrEqual(geo.top);
        expect(Number(y)).toBeLessThanOrEqual(geo.bottom);
      }
    }
  });

  it('skala: 100% di tutup, turun menuju leher, mayor tiap 25%', () => {
    const scale = hourglassScale(geo);
    expect(scale[0]).toMatchObject({ percent: 100, y: geo.top, major: true });
    const ys = scale.map((s) => s.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    expect(scale.filter((s) => s.major).map((s) => s.percent)).toEqual([100, 75, 50, 25]);
  });
});

describe('hourglassState', () => {
  const geo = hourglassGeometry();

  it('pasir atas dan bawah simetris terhadap leher', () => {
    const s = hourglassState(geo, 5, 10);
    expect(s.topLevel + s.bottomLevel).toBeCloseTo(2 * geo.neck, 0);
  });

  it('risiko lebih besar menguras lebih cepat dan membuka leher lebih lebar', () => {
    const small = hourglassState(geo, 1, 10);
    const big = hourglassState(geo, 10, 10);
    expect(big.topLevel).toBeGreaterThan(small.topLevel);
    expect(big.stream).toBeGreaterThan(small.stream);
  });

  it('pembanding 1% sama dengan level 1%', () => {
    expect(hourglassState(geo, 5, 10).referenceLevel).toBe(hourglassState(geo, 1, 10).topLevel);
  });

  it('pemulihan: turun 50% butuh naik 100%', () => {
    const s = hourglassState(geo, 50, 1);
    expect(s.remaining).toBe(50);
    expect(s.recovery).toBeCloseTo(100, 9);
  });
});

describe('describeHourglass', () => {
  const geo = hourglassGeometry();

  it('menyebut sisa modal, pemulihan, dan pembanding 1% dalam format Indonesia', () => {
    expect(describeHourglass(hourglassState(geo, 5, 10))).toBe(
      'Setelah 10 kali salah beruntun dengan risiko 5% per transaksi, sisa modal 59,9% dari modal awal. ' +
        'Untuk kembali ke modal awal dibutuhkan kenaikan 67%. Dengan risiko 1%, sisa modal 90,4%.',
    );
  });

  it('tanpa pembanding saat risiko sudah 1%, dan kalimat khusus untuk 0 dan 1 kali salah', () => {
    expect(describeHourglass(hourglassState(geo, 1, 10))).not.toContain('Dengan risiko 1%');
    expect(describeHourglass(hourglassState(geo, 2, 0))).toContain('modal masih 100%');
    expect(describeHourglass(hourglassState(geo, 2, 1))).toMatch(/^Setelah 1 kali salah dengan/);
  });
});

describe('formatRecovery', () => {
  it('tanpa tanda plus saat belum ada kerugian', () => {
    expect(formatRecovery(0)).toBe('0%');
    expect(formatRecovery(67.03)).toBe('+67%');
  });
});
