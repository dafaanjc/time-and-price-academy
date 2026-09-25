import { describe, expect, it } from 'vitest';
import { categories } from '../src/data/categories';
import { learningPaths, pathTiers } from '../src/data/learning-paths';

describe('pathTiers', () => {
  it('tahap = 1 + tahap terdalam jalur yang dibutuhkan', () => {
    const tiers = pathTiers([
      { id: 'a' },
      { id: 'b', requires: ['a'] },
      { id: 'c' },
      { id: 'd', requires: ['b', 'c'] },
    ]);
    expect(Object.fromEntries(tiers)).toEqual({ a: 1, b: 2, c: 1, d: 3 });
  });

  it('kurikulum: Fondasi → Heuristik dan Bias → Keputusan di Bawah Risiko', () => {
    expect(Object.fromEntries(pathTiers(learningPaths))).toEqual({
      'fondasi-risiko': 1,
      'heuristik-dan-bias': 2,
      'keputusan-di-bawah-risiko': 3,
    });
  });
});

describe('categories', () => {
  it('id topik unik di dalam setiap kategori', () => {
    for (const c of categories) {
      const ids = (c.topics ?? []).map((t) => t.id);
      expect(new Set(ids).size, c.id).toBe(ids.length);
    }
  });
});
