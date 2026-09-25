import { describe, expect, it } from 'vitest';
import { validateConcepts, validateProblems, type ConceptLike } from '../src/lib/validate';

interface ConceptOptions {
  prerequisites?: string[];
  related?: string[];
  body?: string;
  sources?: ConceptLike['data']['sources'];
  filePath?: string;
}

const concept = (id: string, o: ConceptOptions = {}): ConceptLike => ({
  id,
  filePath: o.filePath ?? `${id}.mdx`,
  body: o.body ?? '',
  data: { slug: id, prerequisites: o.prerequisites ?? [], related: o.related ?? [], sources: o.sources ?? [] },
});

const path = (steps: string[]) => ({ id: 'p', title: '', description: '', steps });

describe('validateConcepts', () => {
  it('lolos untuk data valid', () => {
    expect(validateConcepts([concept('a'), concept('b', { prerequisites: ['a'] })], [path(['a', 'b'])])).toEqual([]);
  });

  it.each([
    ['rujukan hilang', [concept('a', { prerequisites: ['zzz'] })], 'tidak ada'],
    ['rujukan diri sendiri', [concept('a', { related: ['a'] })], 'dirinya sendiri'],
    ['siklus', [concept('a', { prerequisites: ['b'] }), concept('b', { prerequisites: ['a'] })], 'Siklus'],
    ['sumber placeholder', [concept('a', { sources: [{ title: 'Lorem ipsum', url: 'https://example.com' }] })], 'placeholder'],
    ['sumber tak tertelusuri', [concept('a', { sources: [{ title: 'Buku X' }] })], 'ditelusuri'],
    ['nama file ≠ slug', [concept('a', { filePath: 'lain.mdx' })], 'nama file'],
    ['heading bentrok', [concept('a', { body: '## Sumber' })], 'bentrok'],
    ['tautan absolut', [concept('a', { body: '[x](/konsep/a/)' })], 'relatif'],
    ['jenis Contoh salah', [concept('a', { body: '<Contoh jenis="saham">\n\nx\n\n</Contoh>' })], 'tidak dikenal'],
    ['Contoh tidak ditutup', [concept('a', { body: '<Contoh jenis="trading">\n\nx' })], 'ditutup'],
  ])('%s', (_, concepts, message) => {
    expect(validateConcepts(concepts, []).join('\n')).toContain(message);
  });

  it('urutan jalur belajar harus menghormati prasyarat', () => {
    const errors = validateConcepts([concept('a'), concept('b', { prerequisites: ['a'] })], [path(['b', 'a'])]);
    expect(errors.join('\n')).toContain('sebelum prasyaratnya');
  });

  describe('jalur bertingkat (requires)', () => {
    const chain = [concept('a'), concept('b', { prerequisites: ['a'] }), concept('c', { prerequisites: ['b'] })];
    const tiered = (id: string, steps: string[], requires?: string[]) => ({ id, title: '', description: '', steps, requires });

    it('prasyarat boleh dipenuhi jalur yang dibutuhkan, termasuk berantai', () => {
      const paths = [tiered('p1', ['a']), tiered('p2', ['b'], ['p1']), tiered('p3', ['c'], ['p2'])];
      expect(validateConcepts(chain, paths)).toEqual([]);
    });

    it('tanpa requires, prasyarat di jalur lain tidak dihitung', () => {
      const errors = validateConcepts(chain, [tiered('p1', ['a']), tiered('p2', ['b'])]);
      expect(errors.join('\n')).toContain('sebelum prasyaratnya (a)');
    });

    it.each([
      ['jalur tidak ada', [tiered('p1', ['a'], ['zzz'])], 'tidak ada'],
      ['jalur muncul belakangan', [tiered('p1', ['a'], ['p2']), tiered('p2', ['a'])], 'lebih awal'],
      ['id ganda', [tiered('p1', ['a']), tiered('p1', ['a'])], 'ganda'],
    ])('%s', (_, paths, message) => {
      expect(validateConcepts(chain, paths).join('\n')).toContain(message);
    });
  });

  describe('topic', () => {
    const withTopic = (category: string, topic: string): ConceptLike => ({
      ...concept('a'),
      data: { ...concept('a').data, category, topic },
    });

    it('lolos bila topic milik kategorinya', () => {
      expect(validateConcepts([withTopic('psychology', 'judgment-heuristics')], [])).toEqual([]);
    });

    it.each([
      ['topic kategori lain', withTopic('psychology', 'decision-under-risk')],
      ['kategori tanpa topik', withTopic('foundations', 'apa-saja')],
    ])('%s', (_, c) => {
      expect(validateConcepts([c], []).join('\n')).toContain('tidak dikenal');
    });
  });
});

describe('validateProblems', () => {
  const ok = '## Situasi\nx\n## Konsep di Baliknya\n[R](../../konsep/a/)\n## Teori dan Bukti\ny\n## Penerapan Praktis\nz';
  const problem = (id: string, body = ok, concepts = ['a']) => ({
    id,
    body,
    filePath: `${id}.mdx`,
    data: { slug: id, concepts, sources: [] },
  });
  const known = new Set(['a']);

  it('lolos untuk data valid', () => {
    expect(validateProblems([problem('m')], known)).toEqual([]);
  });

  it.each([
    ['konsep tidak ada', problem('m', ok, ['zzz']), 'tidak ada'],
    ['bagian wajib hilang', problem('m', ok.replace('## Penerapan Praktis', '## Lain')), 'bagian wajib hilang'],
    ['urutan bagian salah', problem('m', '## Konsep di Baliknya\n## Situasi\n## Teori dan Bukti\n## Penerapan Praktis'), 'urutan'],
    ['tautan konsep rusak', problem('m', `${ok}\n[x](../../konsep/zzz/)`), 'tidak ada'],
    ['heading bentrok', problem('m', `${ok}\n## Baca Dulu`), 'bentrok'],
  ])('%s', (_, p, message) => {
    expect(validateProblems([p], known).join('\n')).toContain(message);
  });
});
