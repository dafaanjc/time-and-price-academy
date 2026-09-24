import { describe, expect, it } from 'vitest';
import { extractHeadings, headingSlug } from '../src/lib/sections';

describe('heading', () => {
  it('slug sesuai ID heading yang dibuat Astro untuk judul Indonesia', () => {
    expect(headingSlug('Mengapa Ini Penting')).toBe('mengapa-ini-penting');
  });

  it('mengabaikan heading di dalam blok kode', () => {
    expect(extractHeadings('```md\n## Sumber\n```\n## Ringkasan')).toEqual(['Ringkasan']);
  });
});
