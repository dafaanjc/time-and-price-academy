import { getCollection, type CollectionEntry } from 'astro:content';
import {
  categories,
  getCategory,
  getTopic,
  type Category,
  type CategoryId,
  type CategoryTopic,
} from '../data/categories';
import { learningPaths, pathTiers, type LearningPath } from '../data/learning-paths';
import { validateConcepts } from './validate';
import { layoutGraph, type GraphLayout } from './graph';
import { withBase } from './url';

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
  return withBase(`/konsep/${id}/`);
}

export function categoryHref(id: CategoryId): string {
  return withBase(`/kategori/${id}/`);
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

/** Rujukan ringan ke jalur lain (untuk "Lanjutan dari" / "Jalur berikutnya"). */
export interface PathRef {
  id: string;
  title: string;
}

export interface ResolvedPath extends Omit<LearningPath, 'steps' | 'requires'> {
  steps: Concept[];
  /** Tahap 1 = tanpa `requires`; selebihnya 1 + tahap terdalam jalur yang dibutuhkan. */
  tier: number;
  requires: PathRef[];
}

export async function getLearningPaths(): Promise<ResolvedPath[]> {
  await getConcepts(); // validasi jalur berjalan di sini
  const tiers = pathTiers(learningPaths);
  const titles = new Map(learningPaths.map((p) => [p.id, p.title]));
  return Promise.all(
    learningPaths.map(async (p) => ({
      ...p,
      steps: await getConceptsByIds(p.steps),
      tier: tiers.get(p.id) ?? 1,
      requires: (p.requires ?? []).map((id) => ({ id, title: titles.get(id) ?? id })),
    })),
  );
}

/** Id anchor sebuah jalur di halaman /jalur-belajar/. */
export function pathAnchor(id: string): string {
  return `jalur-${id}`;
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
  /** Di langkah terakhir: jalur yang membutuhkan jalur ini (tahap berikutnya), bila ada. */
  nextPaths: PathRef[];
}

/** Posisi konsep di jalur belajar pertama yang memuatnya, bila ada. */
export async function getPathContext(id: string): Promise<PathContext | undefined> {
  const paths = await getLearningPaths();
  for (const path of paths) {
    const index = path.steps.findIndex((c) => c.id === id);
    if (index === -1) continue;
    const isLast = index === path.steps.length - 1;
    const nextPaths = isLast
      ? paths.filter((p) => p.requires.some((r) => r.id === path.id)).map((p) => ({ id: p.id, title: p.title }))
      : [];
    return { path, index, prev: path.steps[index - 1], next: path.steps[index + 1], nextPaths };
  }
  return undefined;
}

/** Label kategori konsep, dengan topiknya bila ada: "Psikologi · Heuristik Penilaian". */
export function conceptCategoryLabel(concept: Concept): string {
  const { category, topic } = concept.data;
  const topicTitle = topic ? getTopic(category, topic)?.title : undefined;
  return [getCategory(category).title, topicTitle].filter(Boolean).join(' · ');
}

/** Tata letak graf prasyarat untuk semua konsep, dalam urutan kategori dan `order`. */
export async function getKnowledgeGraph(): Promise<GraphLayout> {
  const concepts = await getConcepts();
  return layoutGraph(
    concepts.map((c) => ({
      id: c.id,
      title: c.data.title,
      description: c.data.description,
      href: conceptHref(c.id),
      prerequisites: c.data.prerequisites,
      group: c.data.category,
      meta: conceptCategoryLabel(c),
    })),
  );
}

export interface TopicGroup {
  /** undefined = konsep tanpa topik (atau kategori tanpa topik). */
  topic?: CategoryTopic;
  concepts: Concept[];
}

/**
 * Konsep satu kategori dikelompokkan per topik, dalam urutan `topics`; topik kosong dilewati.
 * Konsep tanpa topik dikumpulkan di kelompok terakhir tanpa judul.
 */
export function groupByTopic(category: Category, concepts: Concept[]): TopicGroup[] {
  const groups: TopicGroup[] = (category.topics ?? []).map((topic) => ({
    topic,
    concepts: concepts.filter((c) => c.data.topic === topic.id),
  }));
  const known = new Set(groups.map((g) => g.topic?.id));
  groups.push({ concepts: concepts.filter((c) => !c.data.topic || !known.has(c.data.topic)) });
  return groups.filter((g) => g.concepts.length > 0);
}

export interface CategoryIndex {
  /** Kategori yang sudah punya konsep, dalam urutan tampil. */
  active: { category: Category; concepts: Concept[] }[];
  /** Kategori yang belum punya konsep; ditampilkan ringkas sebagai "Segera hadir". */
  upcoming: Category[];
}

export async function getCategoryIndex(): Promise<CategoryIndex> {
  const grouped = await getConceptsByCategory();
  const withConcepts = categories.map((category) => ({ category, concepts: grouped.get(category.id) ?? [] }));
  return {
    active: withConcepts.filter((c) => c.concepts.length > 0),
    upcoming: withConcepts.filter((c) => c.concepts.length === 0).map((c) => c.category),
  };
}
