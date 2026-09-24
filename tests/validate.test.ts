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
