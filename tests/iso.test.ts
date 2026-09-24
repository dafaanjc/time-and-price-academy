import { describe, expect, it } from 'vitest';
import { buildTimePriceGeometry, isoPath, normalPdf, project, steps, timePriceScene } from '../src/lib/iso';

describe('project', () => {
  it('menaruh titik asal di (0, 0)', () => {
    expect(project({ t: 0, p: 0, d: 0 }, 10)).toEqual([0, 0]);
  });

  it('waktu ke kanan-bawah, harga ke atas, kepadatan ke kiri-bawah', () => {
    const [tx, ty] = project({ t: 1, p: 0, d: 0 }, 10);
    const [px, py] = project({ t: 0, p: 1, d: 0 }, 10);
    const [dx, dy] = project({ t: 0, p: 0, d: 1 }, 10);
    expect(tx).toBeGreaterThan(0);
    expect(ty).toBeGreaterThan(0);
    expect([px, py]).toEqual([0, -10]);
    expect(dx).toBeLessThan(0);
    expect(dy).toBeGreaterThan(0);
    // Sudut 30°: kemiringan tan 30° ≈ 0,577.
    expect(ty / tx).toBeCloseTo(Math.tan(Math.PI / 6), 2);
  });
});

describe('isoPath', () => {
  it('membuat perintah M lalu L, dan Z bila ditutup', () => {
    const pts = [
      { t: 0, p: 0, d: 0 },
      { t: 0, p: 1, d: 0 },
    ];
    expect(isoPath(pts, 10)).toBe('M0 0 L0 -10');
    expect(isoPath(pts, 10, true)).toBe('M0 0 L0 -10 Z');
  });
});

describe('normalPdf & steps', () => {
  it('puncak normal baku ≈ 0,399 dan simetris', () => {
    expect(normalPdf(0, 0, 1)).toBeCloseTo(0.3989, 4);
    expect(normalPdf(-1.3, 0, 1)).toBeCloseTo(normalPdf(1.3, 0, 1), 10);
  });

  it('steps inklusif di kedua ujung', () => {
    expect(steps(0, 1, 4)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});

describe('buildTimePriceGeometry', () => {
  const g = buildTimePriceGeometry();
  const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

  it('semua path berisi angka hingga (tanpa NaN)', () => {
    for (const d of [g.history, g.density, g.densityArea, g.envelopeUpper, g.envelopeLower, g.wallGrid, g.floorGrid]) {
      expect(d).not.toMatch(/NaN|Infinity/);
      expect(numbers(d).length).toBeGreaterThan(3);
    }
  });

  it('nilai harapan berada di waktu horizon, di ketinggian rata-rata', () => {
    const { unit, horizon, mean } = timePriceScene;
    expect(g.evPoint).toEqual(project({ t: horizon, p: mean, d: 0 }, unit));
  });

  it('jalur harga berakhir di titik "sekarang"', () => {
    const end = numbers(g.history).slice(-2);
    expect(end).toEqual(g.nowPoint);
  });
});
