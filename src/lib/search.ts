// Pencarian sisi klien atas indeks kecil. Fungsi murni, tanpa DOM.
import type { SearchEntry } from './search-index';

/** Huruf kecil, tanpa diakritik, spasi dirapikan. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(query: string): string[] {
  return normalize(query).split(' ').filter(Boolean);
}

// Bobot per field: kecocokan di judul lebih penting daripada di isi.
const weights = { title: 10, termEn: 8, keywords: 6, description: 4, category: 2, body: 1 } as const;
type Field = keyof typeof weights;
const fields = Object.keys(weights) as Field[];

export interface SearchResult {
  entry: SearchEntry;
  score: number;
}

/**
 * Setiap kata kueri harus muncul di salah satu field (logika AND).
 * Skor = jumlah bobot field yang cocok, ditambah bonus bila judul sama persis dengan kueri
 * (terbesar) atau diawali kueri.
 */
export function search(entries: SearchEntry[], query: string): SearchResult[] {
  const terms = tokens(query);
  if (terms.length === 0) return [];

  const phrase = terms.join(' ');
  const results: SearchResult[] = [];

  for (const entry of entries) {
    const normalized = fields.map((f) => [f, normalize(entry[f])] as const);
    let score = 0;
    let matchedAll = true;

    for (const term of terms) {
      const hits = normalized.filter(([, text]) => text.includes(term));
      if (hits.length === 0) {
        matchedAll = false;
        break;
      }
      score += hits.reduce((sum, [f]) => sum + weights[f], 0);
    }

    if (!matchedAll) continue;
    const title = normalize(entry.title);
    if (title === phrase) score += 50;
    else if (title.startsWith(phrase)) score += 20;
    results.push({ entry, score });
  }

  return results.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'id'));
}
