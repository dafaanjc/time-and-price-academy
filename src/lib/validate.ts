// Validasi lintas-entri yang tidak bisa diekspresikan oleh skema Zod per-file.
// Fungsi murni: menerima data, mengembalikan daftar pesan galat.
import type { LearningPath } from '../data/learning-paths';
import { extractHeadings, headingSlug, reservedSectionIds } from './sections';

export interface ConceptLike {
  id: string;
  filePath?: string;
  body?: string;
  data: {
    slug: string;
    prerequisites: string[];
    related: string[];
    sources: { title: string; url?: string; doi?: string; isbn?: string; publisher?: string }[];
  };
}

const PLACEHOLDER_PATTERN = /lorem|ipsum|placeholder|\btodo\b|\btbd\b|contoh sumber|example\.com/i;

function fileBaseName(filePath: string): string {
  const name = filePath.split(/[\\/]/).pop() ?? '';
  return name.replace(/\.mdx?$/, '');
}

function checkFileNames(concepts: ConceptLike[]): string[] {
  return concepts
    .filter((c) => c.filePath && fileBaseName(c.filePath) !== c.data.slug)
    .map((c) => `${c.filePath}: nama file harus sama dengan slug "${c.data.slug}"`);
}

function checkReferences(concepts: ConceptLike[], ids: Set<string>): string[] {
  const errors: string[] = [];
  for (const c of concepts) {
    const refs = [
      ...c.data.prerequisites.map((id) => ['prerequisites', id] as const),
      ...c.data.related.map((id) => ['related', id] as const),
    ];
    for (const [field, id] of refs) {
      if (id === c.id) errors.push(`${c.id}: ${field} tidak boleh merujuk dirinya sendiri`);
      else if (!ids.has(id)) errors.push(`${c.id}: ${field} merujuk konsep yang tidak ada: "${id}"`);
    }
  }
  return errors;
}

function checkCycles(concepts: ConceptLike[]): string[] {
  const prereqs = new Map(concepts.map((c) => [c.id, c.data.prerequisites]));
  const state = new Map<string, 'visiting' | 'done'>();
  const errors: string[] = [];

  const visit = (id: string, trail: string[]): void => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      errors.push(`Siklus prasyarat: ${[...trail, id].join(' → ')}`);
      return;
    }
    state.set(id, 'visiting');
    for (const next of prereqs.get(id) ?? []) visit(next, [...trail, id]);
    state.set(id, 'done');
  };

  for (const id of prereqs.keys()) visit(id, []);
  return errors;
}

function checkSources(concepts: ConceptLike[]): string[] {
  const errors: string[] = [];
  for (const c of concepts) {
    for (const s of c.data.sources) {
      const text = [s.title, s.url, s.doi, s.publisher].filter(Boolean).join(' ');
      if (PLACEHOLDER_PATTERN.test(text)) {
        errors.push(`${c.id}: sumber "${s.title}" terlihat seperti placeholder`);
      }
      if (!s.url && !s.doi && !s.isbn && !s.publisher) {
        errors.push(`${c.id}: sumber "${s.title}" harus dapat ditelusuri (url, doi, isbn, atau publisher)`);
      }
    }
  }
  return errors;
}

function checkHeadingIds(concepts: ConceptLike[]): string[] {
  const errors: string[] = [];
  for (const c of concepts) {
    for (const text of extractHeadings(c.body ?? '')) {
      const id = headingSlug(text);
      if (reservedSectionIds.has(id)) {
        errors.push(`${c.id}: heading "${text}" bentrok dengan bagian otomatis (#${id}); hapus dari body`);
      }
    }
  }
  return errors;
}

// Tautan antar-konsep di body wajib relatif (`../slug/`) agar tetap benar di bawah `base`
// (mis. GitHub Pages di sub-path). Tautan eksternal (http/https/mailto) dan anchor (#) dibiarkan.
function checkBodyLinks(concepts: ConceptLike[], ids: Set<string>): string[] {
  const errors: string[] = [];
  for (const c of concepts) {
    for (const [, target = ''] of (c.body ?? '').matchAll(/\]\(([^)\s]+)\)/g)) {
      if (target.startsWith('/')) {
        errors.push(`${c.id}: tautan "${target}" harus relatif, mis. "../slug/", agar berfungsi di bawah base`);
        continue;
      }
      const slug = /^\.\.\/([a-z0-9-]+)\/?(?:#.*)?$/.exec(target)?.[1];
      if (slug && !ids.has(slug)) errors.push(`${c.id}: tautan "${target}" merujuk konsep yang tidak ada`);
    }
  }
  return errors;
}

function checkLearningPaths(paths: LearningPath[], concepts: ConceptLike[]): string[] {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const errors: string[] = [];
  for (const path of paths) {
    path.steps.forEach((step, index) => {
      const concept = byId.get(step);
      if (!concept) {
        errors.push(`Jalur "${path.id}": langkah "${step}" bukan konsep yang ada`);
        return;
      }
      const earlier = new Set(path.steps.slice(0, index));
      const missing = concept.data.prerequisites.filter((p) => !earlier.has(p));
      if (missing.length > 0) {
        errors.push(`Jalur "${path.id}": "${step}" muncul sebelum prasyaratnya (${missing.join(', ')})`);
      }
    });
  }
  return errors;
}

export function validateConcepts(concepts: ConceptLike[], paths: LearningPath[]): string[] {
  const ids = new Set(concepts.map((c) => c.id));
  return [
    ...checkFileNames(concepts),
    ...checkReferences(concepts, ids),
    ...checkCycles(concepts),
    ...checkSources(concepts),
    ...checkHeadingIds(concepts),
    ...checkBodyLinks(concepts, ids),
    ...checkLearningPaths(paths, concepts),
  ];
}
