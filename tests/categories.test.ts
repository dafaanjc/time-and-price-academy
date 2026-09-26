import { describe, expect, it } from 'vitest';
import { categories, categoryObjects } from '../src/data/categories';

describe('categories', () => {
  it('setiap kategori punya objek ukiran sendiri (unik, dari daftar yang digambar)', () => {
    const objects = categories.map((c) => c.object);
    expect(new Set(objects).size).toBe(objects.length);
    for (const object of objects) expect(categoryObjects).toContain(object);
  });
});
