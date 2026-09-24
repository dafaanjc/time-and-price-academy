// Akses data masalah trader. Masalah merujuk konsep; teori tetap tinggal di halaman konsep.
import { getCollection, type CollectionEntry } from 'astro:content';
import { getConcepts, type Concept } from './concepts';
import { computeLayers } from './graph';
import { withBase } from './url';
import { validateProblems } from './validate';

export type Problem = CollectionEntry<'problems'>;

export function problemHref(id: string): string {
  return withBase(`/masalah/${id}/`);
}

let cache: Promise<Problem[]> | undefined;

/** Semua masalah, terurut dan tervalidasi terhadap koleksi konsep. Build gagal bila validasi gagal. */
export function getProblems(): Promise<Problem[]> {
  cache ??= loadProblems();
  return cache;
}

async function loadProblems(): Promise<Problem[]> {
  const [problems, concepts] = await Promise.all([getCollection('problems'), getConcepts()]);
  problems.sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
  const errors = validateProblems(problems, new Set(concepts.map((c) => c.id)));
  if (errors.length > 0) {
    throw new Error(`Validasi masalah trader gagal:\n- ${errors.join('\n- ')}`);
  }
  return problems;
}

/** Masalah yang merujuk sebuah konsep: tautan balik otomatis di halaman konsep. */
export async function getProblemsForConcept(conceptId: string): Promise<Problem[]> {
  return (await getProblems()).filter((p) => p.data.concepts.includes(conceptId));
}

/** Konsep yang dirujuk masalah, dalam urutan di frontmatter. */
export async function getProblemConcepts(problem: Problem): Promise<Concept[]> {
  const byId = new Map((await getConcepts()).map((c) => [c.id, c]));
  return problem.data.concepts.map((id) => byId.get(id)).filter((c): c is Concept => c !== undefined);
}

/**
 * "Baca dulu": semua prasyarat (langsung maupun tidak langsung) dari konsep yang dirujuk,
 * tanpa konsep yang dirujuk itu sendiri, diurutkan dari yang paling dasar (tingkat graf).
 */
export async function getReadFirst(problem: Problem): Promise<Concept[]> {
  const concepts = await getConcepts();
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const layers = computeLayers(concepts.map((c) => ({ id: c.id, title: '', href: '', prerequisites: c.data.prerequisites })));

  const direct = new Set(problem.data.concepts);
  const ancestors = new Set<string>();
  const visit = (id: string): void => {
    for (const p of byId.get(id)?.data.prerequisites ?? []) {
      if (ancestors.has(p)) continue;
      ancestors.add(p);
      visit(p);
    }
  };
  direct.forEach(visit);

  const order = new Map(concepts.map((c, i) => [c.id, i]));
  return [...ancestors]
    .filter((id) => !direct.has(id))
    .sort((a, b) => (layers.get(a) ?? 0) - (layers.get(b) ?? 0) || (order.get(a) ?? 0) - (order.get(b) ?? 0))
    .map((id) => byId.get(id))
    .filter((c): c is Concept => c !== undefined);
}
