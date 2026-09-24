import { getCollection, type CollectionEntry } from 'astro:content';
import { categories, type CategoryId } from '../data/categories';
import { learningPaths, type LearningPath } from '../data/learning-paths';
import { validateConcepts } from './validate';
import { layoutGraph, type GraphLayout } from './graph';

export type Concept = CollectionEntry<'concepts'>;

export const difficultyLabels: Record<Concept['data']['difficulty'], string> = {
  beginner: 'Dasar',
  intermediate: 'Menengah',
  advanced: 'Lanjutan',
};

export const statusLabels: Record<Concept['data']['status'], string> = {
  draft: 'Draf',
  review: 'Ditinjau',
  published: 'Terbit',
};

export function conceptHref(id: string): string {
  return `/konsep/${id}/`;
}

export function categoryHref(id: CategoryId): string {
  return `/kategori/${id}/`;
}

const categoryOrder = new Map(categories.map((c, i) => [c.id, i]));

function compareConcepts(a: Concept, b: Concept): number {
  const byCategory = (categoryOrder.get(a.data.category) ?? 0) - (categoryOrder.get(b.data.category) ?? 0);
  return byCategory || a.data.order - b.data.order || a.id.localeCompare(b.id);
}

let cache: Promise<Concept[]> | undefined;

/** Semua konsep, terurut dan tervalidasi. Build gagal bila validasi gagal. */
export function getConcepts(): Promise<Concept[]> {
  cache ??= loadConcepts();
  return cache;
}

async function loadConcepts(): Promise<Concept[]> {
  const concepts = (await getCollection('concepts')).sort(compareConcepts);
  const errors = validateConcepts(concepts, learningPaths);
  if (errors.length > 0) {
    throw new Error(`Validasi konten gagal:\n- ${errors.join('\n- ')}`);
  }
  return concepts;
}

export async function getConceptsByCategory(): Promise<Map<CategoryId, Concept[]>> {
  const concepts = await getConcepts();
  return new Map(categories.map((c) => [c.id, concepts.filter((x) => x.data.category === c.id)]));
}

export interface ResolvedPath extends Omit<LearningPath, 'steps'> {
  steps: Concept[];
}

export async function getLearningPaths(): Promise<ResolvedPath[]> {
  return Promise.all(learningPaths.map(async (p) => ({ ...p, steps: await getConceptsByIds(p.steps) })));
}

/** Konsep untuk daftar slug, dengan urutan slug dipertahankan. Slug sudah divalidasi. */
export async function getConceptsByIds(ids: string[]): Promise<Concept[]> {
  const byId = new Map((await getConcepts()).map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is Concept => c !== undefined);
}

export interface PathContext {
  path: ResolvedPath;
  /** Indeks berbasis 0 di dalam jalur. */
  index: number;
  prev?: Concept;
  next?: Concept;
}

/** Posisi konsep di jalur belajar pertama yang memuatnya, bila ada. */
export async function getPathContext(id: string): Promise<PathContext | undefined> {
  for (const path of await getLearningPaths()) {
    const index = path.steps.findIndex((c) => c.id === id);
    if (index === -1) continue;
    return { path, index, prev: path.steps[index - 1], next: path.steps[index + 1] };
  }
  return undefined;
}

/** Tata letak graf prasyarat untuk semua konsep, dalam urutan kategori dan `order`. */
export async function getKnowledgeGraph(): Promise<GraphLayout> {
  const concepts = await getConcepts();
  return layoutGraph(
    concepts.map((c) => ({
      id: c.id,
      title: c.data.title,
      href: conceptHref(c.id),
      prerequisites: c.data.prerequisites,
    })),
  );
}
