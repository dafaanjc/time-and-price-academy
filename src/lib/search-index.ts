import { getCategory } from '../data/categories';
import { conceptHref, difficultyLabels, getConcepts } from './concepts';
import { getProblems, problemHref } from './problems';

export interface SearchEntry {
  href: string;
  /** Jenis halaman, ditampilkan di hasil: "Konsep" atau "Masalah trader". */
  kind: string;
  title: string;
  termEn: string;
  category: string;
  difficulty: string;
  description: string;
  /** Sinonim/istilah yang biasa diketik trader (mis. "MC", "revenge trading"). */
  keywords: string;
  /** Isi sebagai teks polos, untuk pencocokan saja. */
  body: string;
}

/** Ubah MDX menjadi teks polos seadanya: cukup untuk pencarian, bukan untuk ditampilkan. */
function plainText(mdx: string): string {
  return mdx
    .replace(/<\/?[A-Z][A-Za-z]*(?:\s[^>]*)?>/g, ' ') // tag komponen MDX, mis. <Contoh jenis="trading">
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`|>]/g, ' ')
    .replace(/-{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function buildSearchIndex(): Promise<SearchEntry[]> {
  const [concepts, problems] = await Promise.all([getConcepts(), getProblems()]);
  const conceptEntries = concepts.map((c) => ({
    href: conceptHref(c.id),
    kind: 'Konsep',
    title: c.data.title,
    termEn: c.data.termEn ?? '',
    category: getCategory(c.data.category).title,
    difficulty: difficultyLabels[c.data.difficulty],
    description: c.data.description,
    keywords: c.data.keywords.join(' '),
    body: plainText(c.body ?? ''),
  }));
  const problemEntries = problems.map((p) => ({
    href: problemHref(p.id),
    kind: 'Masalah trader',
    title: p.data.title,
    termEn: '',
    category: '',
    difficulty: '',
    description: `${p.data.decision} ${p.data.description}`,
    keywords: p.data.keywords.join(' '),
    body: plainText(p.body ?? ''),
  }));
  return [...problemEntries, ...conceptEntries];
}
