import { describe, expect, it } from 'vitest';
import { normalize, search } from '../src/lib/search';
import type { SearchEntry } from '../src/lib/search-index';

const entry = (title: string, extra: Partial<SearchEntry> = {}): SearchEntry => ({
  href: `/${title}`,
  kind: 'Konsep',
  title,
  termEn: '',
  category: '',
  difficulty: '',
  description: '',
  keywords: '',
  body: '',
  ...extra,
});

const index = [
  entry('Risiko', { termEn: 'Risk' }),
  entry('Risiko vs Ketidakpastian', { description: 'risiko dan ketidakpastian' }),
  entry('Leverage & Margin', { keywords: 'margin call MC stop out' }),
  entry('Kenapa gue full margin?', { kind: 'Masalah trader', keywords: 'MC stop out' }),
];

describe('search', () => {
  it('judul yang persis sama selalu di urutan pertama', () => {
    expect(search(index, 'RISIKO')[0]?.entry.title).toBe('Risiko');
  });

  it('mengabaikan huruf besar dan diakritik', () => {
    expect(normalize('Probabilitás')).toBe('probabilitas');
  });

  it('menemukan istilah trader lewat keywords', () => {
    const titles = search(index, 'MC').map((r) => r.entry.title);
    expect(titles).toEqual(expect.arrayContaining(['Leverage & Margin', 'Kenapa gue full margin?']));
  });

  it('semua kata harus cocok (AND); kueri kosong tidak menghasilkan apa-apa', () => {
    expect(search(index, 'risiko margin')).toEqual([]);
    expect(search(index, '   ')).toEqual([]);
  });
});
