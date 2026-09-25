import { describe, expect, it } from 'vitest';
import { riskGauge } from '../src/lib/calc/position-size';
import {
  branchPaths,
  buildTerrain,
  densityAt,
  field,
  historyPath,
  meanAt,
  meanPath,
  seeded,
  sigmaAt,
} from '../src/lib/risk-field/geometry';
import { pickQuality, qualitySettings, type QualityEnv } from '../src/lib/risk-field/quality';

describe('geometri Risk Field', () => {
  it('ketidakpastian melebar seiring waktu (σ naik, puncak turun)', () => {
    const t1 = field.tHorizon * 0.25;
    const t2 = field.tHorizon;
    expect(sigmaAt(t2)).toBeGreaterThan(sigmaAt(t1));
    expect(densityAt(t2, meanAt(t2))).toBeLessThan(densityAt(t1, meanAt(t1)));
    expect(sigmaAt(field.tHorizon)).toBeCloseTo(field.sigmaHorizon);
  });

  it('masa lalu tidak punya relief; puncak ada di nilai harapan dan dibatasi', () => {
    expect(densityAt(-0.5, 0)).toBe(0);
    expect(densityAt(0, 0)).toBe(0);
    const t = field.tHorizon / 2;
    expect(densityAt(t, meanAt(t))).toBeGreaterThan(densityAt(t, meanAt(t) + sigmaAt(t)));
    for (let t = 0.01; t <= field.tHorizon; t += 0.05) {
      expect(densityAt(t, meanAt(t))).toBeLessThanOrEqual(field.heightMax);
    }
  });

  it('jalur masa lalu berakhir di "sekarang" (0, 0) dan tetap di dinding', () => {
    const path = historyPath(40);
    expect(path.at(-1)).toEqual([0, 0, 0]);
    expect(path.every(([, , z]) => z === 0)).toBe(true);
    expect(path[0]![0]).toBe(field.tPast);
  });

  it('lintasan nilai harapan menempel di punggung relief sampai T', () => {
    const path = meanPath(20);
    const [t, p, z] = path.at(-1)!;
    expect(t).toBeCloseTo(field.tHorizon);
    expect(p).toBeCloseTo(field.driftHorizon);
    expect(z).toBeCloseTo(densityAt(t, p));
  });

  it('pohon cabang: 2^depth jalur dari "sekarang", tetap dalam ±2σ, deterministik', () => {
    const paths = branchPaths(3, 8);
    expect(paths).toHaveLength(8);
    for (const path of paths) {
      expect(path[0]![0]).toBe(0);
      expect(path[0]![1]).toBeCloseTo(0);
      expect(path.at(-1)![0]).toBeCloseTo(field.tHorizon);
      for (const [t, p] of path) {
        expect(Math.abs(p - meanAt(t))).toBeLessThanOrEqual(2 * sigmaAt(t) + 1e-9);
      }
    }
    expect(branchPaths(3, 8)).toEqual(paths);
  });

  it('relief: segmen berpasangan dengan bobot 0..1 per titik; detail lebih rendah = lebih ringan', () => {
    const high = buildTerrain(qualitySettings.high.detail);
    const medium = buildTerrain(qualitySettings.medium.detail);
    expect(high.positions.length).toBe(high.weights.length * 3);
    expect(high.weights.every((w) => w >= 0 && w <= 1)).toBe(true);
    expect(medium.positions.length).toBeLessThan(high.positions.length / 2);
  });

  it('pembangkit acak berbenih stabil dan dalam [0, 1)', () => {
    const a = seeded(42);
    const b = seeded(42);
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe('pickQuality', () => {
  const desktop: QualityEnv = {
    webgl: true,
    reducedMotion: false,
    saveData: false,
    coarsePointer: false,
    viewportWidth: 1440,
    deviceMemory: 8,
    cores: 8,
  };

  it('desktop kuat → high', () => {
    expect(pickQuality(desktop)).toBe('high');
  });

  it('ponsel / layar sempit / perangkat sedang → medium', () => {
    expect(pickQuality({ ...desktop, coarsePointer: true })).toBe('medium');
    expect(pickQuality({ ...desktop, viewportWidth: 390 })).toBe('medium');
    expect(pickQuality({ ...desktop, cores: 4 })).toBe('medium');
  });

  it('tanpa WebGL, gerak dikurangi, hemat data, atau perangkat sangat lemah → low (SVG)', () => {
    expect(pickQuality({ ...desktop, webgl: false })).toBe('low');
    expect(pickQuality({ ...desktop, reducedMotion: true })).toBe('low');
    expect(pickQuality({ ...desktop, saveData: true })).toBe('low');
    expect(pickQuality({ ...desktop, deviceMemory: 1 })).toBe('low');
  });

  it('info perangkat yang tidak tersedia tidak menurunkan kualitas', () => {
    expect(pickQuality({ ...desktop, deviceMemory: undefined, cores: undefined })).toBe('high');
  });
});

describe('riskGauge', () => {
  it('skala bulat yang memuat batas ×2,5 dan risiko aktual', () => {
    expect(riskGauge(1, 2)).toEqual({ max: 3, limitAt: (1 / 3) * 100, actualAt: (2 / 3) * 100 });
    expect(riskGauge(1, 8).max).toBe(10);
    expect(riskGauge(2, 0).max).toBe(5);
  });

  it('posisi dibatasi ke 0–100%', () => {
    const g = riskGauge(1, 500);
    expect(g.max).toBe(100);
    expect(g.actualAt).toBe(100);
  });
});
