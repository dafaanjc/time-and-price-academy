import { describe, expect, it } from 'vitest';
import { outcomeField } from '../src/lib/outcome-field';

const opts = { x0: 100, y0: 300, xT: 500, sigmaT: 60 };

const points = (d: string) => [...d.matchAll(/[MLH](-?[\d.]+)(?: (-?[\d.]+))?/g)].map((m) => [Number(m[1]), Number(m[2] ?? NaN)]);

describe('outcomeField', () => {
  const f = outcomeField(opts);

  it('bercabang 4 → 12 → 24 jalur, semua dari "sekarang" sampai T', () => {
    expect(f.paths).toHaveLength(24);
    for (const d of f.paths) {
      const pts = points(d);
      expect(pts[0]).toEqual([100, 300]);
      expect(pts.at(-1)![0]).toBeCloseTo(500, 0);
    }
    expect(f.branchXs).toHaveLength(2);
  });

  it('deterministik: seed sama → gambar sama; seed beda → berbeda', () => {
    expect(outcomeField(opts).paths).toEqual(f.paths);
    expect(outcomeField({ ...opts, seed: 99 }).paths).not.toEqual(f.paths);
  });

  it('jalur saudara berbagi awalan sampai titik cabang pertama', () => {
    const a = points(f.paths[0]!);
    const b = points(f.paths[1]!);
    const firstBranch = f.branchXs[0]!;
    for (let i = 0; i < a.length && a[i]![0]! <= firstBranch; i++) expect(a[i]).toEqual(b[i]);
  });

  it('selubung ±2σ melebar ∝ √t dan simetris terhadap E', () => {
    const up = points(f.upper);
    const lo = points(f.lower);
    expect(up[0]![1]).toBe(300);
    expect(300 - up.at(-1)![1]!).toBeCloseTo(120, 0);
    const mid = Math.floor(up.length / 4);
    const ratio = (300 - up[mid]![1]!) / (300 - up.at(-1)![1]!);
    expect(ratio).toBeCloseTo(Math.sqrt(mid / (up.length - 1)), 1);
    up.forEach(([, y], i) => expect(y! + lo[i]![1]!).toBeCloseTo(600, 0));
  });

  it('E datar (tanpa drift) dan kurva kepadatan berpuncak di E', () => {
    expect(f.expected).toBe('M100 300 H500');
    const d = points(f.density);
    const peak = d.reduce((a, b) => (b[0]! > a[0]! ? b : a));
    expect(peak[1]).toBeCloseTo(300, 0);
    expect(peak[0]).toBeCloseTo(556, 0);
  });
});
