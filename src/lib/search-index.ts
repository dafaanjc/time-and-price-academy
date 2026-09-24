import { getCategory } from '../data/categories';
import { conceptHref, difficultyLabels, getConcepts } from './concepts';

export interface SearchEntry {
  href: string;
  title: string;
  termEn: string;
  category: string;
  difficulty: string;
  description: string;
  /** Isi konsep sebagai teks polos, untuk pencocokan saja. */
  body: string;
}

/** Ubah MDX menjadi teks polos seadanya: cukup untuk pencarian, bukan untuk ditampilkan. */
function plainText(mdx: string): string {
  return mdx
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`|>]/g, ' ')
    .replace(/-{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function buildSearchIndex(): Promise<SearchEntry[]> {
  const concepts = await getConcepts();
  return concepts.map((c) => ({
    href: conceptHref(c.id),
    title: c.data.title,
    termEn: c.data.termEn ?? '',
    category: getCategory(c.data.category).title,
    difficulty: difficultyLabels[c.data.difficulty],
    description: c.data.description,
    body: plainText(c.body ?? ''),
  }));
}
