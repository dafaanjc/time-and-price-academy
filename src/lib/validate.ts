// Validasi lintas-entri yang tidak bisa diekspresikan oleh skema Zod per-file.
// Fungsi murni: menerima data, mengembalikan daftar pesan galat.
import { categories } from '../data/categories';
import type { LearningPath } from '../data/learning-paths';
import {
  extractHeadings,
  headingSlug,
  requiredProblemHeadings,
  reservedProblemSectionIds,
  reservedSectionIds,
} from './sections';

interface SourceLike {
  title: string;
  url?: string;
  doi?: string;
  isbn?: string;
  publisher?: string;
}

/** Bentuk minimal entri konten (konsep atau masalah) yang diperiksa di sini. */
interface EntryLike {
  id: string;
  filePath?: string;
  body?: string;
  data: { slug: string; sources: SourceLike[] };
}

export interface ConceptLike extends EntryLike {
  data: EntryLike['data'] & { prerequisites: string[]; related: string[]; category?: string; topic?: string };
}

export interface ProblemLike extends EntryLike {
  data: EntryLike['data'] & { concepts: string[] };
}

const PLACEHOLDER_PATTERN = /lorem|ipsum|placeholder|\btodo\b|\btbd\b|contoh sumber|example\.com/i;

function fileBaseName(filePath: string): string {
  const name = filePath.split(/[\\/]/).pop() ?? '';
  return name.replace(/\.mdx?$/, '');
}

// ---------- Pemeriksaan umum (konsep dan masalah) ----------

function checkFileNames(entries: EntryLike[]): string[] {
  return entries
    .filter((e) => e.filePath && fileBaseName(e.filePath) !== e.data.slug)
    .map((e) => `${e.filePath}: nama file harus sama dengan slug "${e.data.slug}"`);
}

function checkSources(entries: EntryLike[]): string[] {
  const errors: string[] = [];
  for (const e of entries) {
    for (const s of e.data.sources) {
      const text = [s.title, s.url, s.doi, s.publisher].filter(Boolean).join(' ');
      if (PLACEHOLDER_PATTERN.test(text)) {
        errors.push(`${e.id}: sumber "${s.title}" terlihat seperti placeholder`);
      }
      if (!s.url && !s.doi && !s.isbn && !s.publisher) {
        errors.push(`${e.id}: sumber "${s.title}" harus dapat ditelusuri (url, doi, isbn, atau publisher)`);
      }
    }
  }
  return errors;
}

function checkHeadingIds(entries: EntryLike[], reserved: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  for (const e of entries) {
    for (const text of extractHeadings(e.body ?? '')) {
      const id = headingSlug(text);
      if (reserved.has(id)) {
        errors.push(`${e.id}: heading "${text}" bentrok dengan bagian otomatis (#${id}); hapus dari body`);
      }
    }
  }
  return errors;
}

/**
 * Tautan di body wajib relatif agar tetap benar di bawah `base` (GitHub Pages di sub-path).
 * `resolve` memetakan tautan relatif yang dikenali ke [jenis, slug]; slug harus ada di `known`.
 * Tautan eksternal (http/https/mailto) dan anchor (#) dibiarkan.
 */
function checkBodyLinks(
  entries: EntryLike[],
  resolve: (target: string) => [kind: string, slug: string] | undefined,
  known: Record<string, Set<string>>,
  hint: string,
): string[] {
  const errors: string[] = [];
  for (const e of entries) {
    for (const [, target = ''] of (e.body ?? '').matchAll(/\]\(([^)\s]+)\)/g)) {
      if (target.startsWith('/')) {
        errors.push(`${e.id}: tautan "${target}" harus relatif, mis. "${hint}", agar berfungsi di bawah base`);
        continue;
      }
      const [kind, slug] = resolve(target) ?? [];
      if (kind && slug && !known[kind]?.has(slug)) {
        errors.push(`${e.id}: tautan "${target}" merujuk ${kind} yang tidak ada`);
      }
    }
  }
  return errors;
}

// Komponen isi yang disediakan halaman konsep (lihat components/mdx/). Nilai `jenis` harus dikenal
// dan setiap tag pembuka harus ditutup, agar kesalahan ketik tidak lolos diam-diam.
const CONTOH_KINDS = new Set(['kehidupan', 'keuangan', 'trading']);

function checkContentComponents(entries: EntryLike[]): string[] {
  const errors: string[] = [];
  for (const e of entries) {
    const body = e.body ?? '';
    for (const [, kind = ''] of body.matchAll(/<Contoh\s+jenis="([^"]*)"\s*>/g)) {
      if (!CONTOH_KINDS.has(kind)) {
        errors.push(`${e.id}: <Contoh jenis="${kind}"> tidak dikenal (pakai: ${[...CONTOH_KINDS].join(', ')})`);
      }
    }
    for (const tag of ['Contoh', 'Definisi']) {
      const open = (body.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;
      const close = (body.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
      if (open !== close) errors.push(`${e.id}: <${tag}> dibuka ${open}× tetapi ditutup ${close}×`);
    }
  }
  return errors;
}

// ---------- Konsep ----------

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

/** `topic` harus salah satu `topics` milik kategori konsep itu (data/categories.ts). */
function checkTopics(concepts: ConceptLike[]): string[] {
  const errors: string[] = [];
  for (const c of concepts) {
    const { category, topic } = c.data;
    if (!topic) continue;
    const topics = categories.find((x) => x.id === category)?.topics ?? [];
    if (!topics.some((t) => t.id === topic)) {
      const known = topics.map((t) => t.id).join(', ') || 'kategori ini tidak punya topik';
      errors.push(`${c.id}: topic "${topic}" tidak dikenal untuk kategori "${category}" (pakai: ${known})`);
    }
  }
  return errors;
}

/**
 * Jalur bertingkat: `requires` merujuk jalur yang muncul lebih awal (jadi tidak mungkin bersiklus), dan
 * prasyarat setiap langkah harus sudah dipelajari, baik di langkah sebelumnya maupun di jalur yang
 * dibutuhkan (secara berantai).
 */
function checkLearningPaths(paths: LearningPath[], concepts: ConceptLike[]): string[] {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const errors: string[] = [];
  /** Konsep yang sudah tercakup setelah menyelesaikan jalur (termasuk jalur yang dibutuhkannya). */
  const covered = new Map<string, Set<string>>();
  for (const [pathIndex, path] of paths.entries()) {
    if (covered.has(path.id)) errors.push(`Jalur "${path.id}": id jalur ganda`);
    const inherited = new Set<string>();
    for (const req of path.requires ?? []) {
      const earlierIndex = paths.findIndex((p) => p.id === req);
      if (earlierIndex === -1) errors.push(`Jalur "${path.id}": requires merujuk jalur yang tidak ada: "${req}"`);
      else if (earlierIndex >= pathIndex) {
        errors.push(`Jalur "${path.id}": jalur yang dibutuhkan "${req}" harus muncul lebih awal di learning-paths.ts`);
      }
      for (const id of covered.get(req) ?? []) inherited.add(id);
    }
    path.steps.forEach((step, index) => {
      const concept = byId.get(step);
      if (!concept) {
        errors.push(`Jalur "${path.id}": langkah "${step}" bukan konsep yang ada`);
        return;
      }
      const earlier = new Set([...inherited, ...path.steps.slice(0, index)]);
      const missing = concept.data.prerequisites.filter((p) => !earlier.has(p));
      if (missing.length > 0) {
        errors.push(`Jalur "${path.id}": "${step}" muncul sebelum prasyaratnya (${missing.join(', ')})`);
      }
    });
    covered.set(path.id, new Set([...inherited, ...path.steps]));
  }
  return errors;
}

/** Dari halaman konsep: `../slug/` menunjuk konsep lain. */
const resolveConceptLink = (target: string): [string, string] | undefined => {
  const slug = /^\.\.\/([a-z0-9-]+)\/?(?:#.*)?$/.exec(target)?.[1];
  return slug ? ['konsep', slug] : undefined;
};

export function validateConcepts(concepts: ConceptLike[], paths: LearningPath[]): string[] {
  const ids = new Set(concepts.map((c) => c.id));
  return [
    ...checkFileNames(concepts),
    ...checkReferences(concepts, ids),
    ...checkCycles(concepts),
    ...checkTopics(concepts),
    ...checkSources(concepts),
    ...checkHeadingIds(concepts, reservedSectionIds),
    ...checkContentComponents(concepts),
    ...checkBodyLinks(concepts, resolveConceptLink, { konsep: ids }, '../slug/'),
    ...checkLearningPaths(paths, concepts),
  ];
}

// ---------- Masalah trader ----------

function checkProblemConcepts(problems: ProblemLike[], conceptIds: Set<string>): string[] {
  return problems.flatMap((p) =>
    p.data.concepts
      .filter((id) => !conceptIds.has(id))
      .map((id) => `${p.id}: concepts merujuk konsep yang tidak ada: "${id}"`),
  );
}

/** Body wajib memuat heading MASALAH → KONSEP → TEORI/BUKTI → PENERAPAN, dalam urutan itu. */
function checkProblemStructure(problems: ProblemLike[]): string[] {
  const errors: string[] = [];
  for (const p of problems) {
    const headings = extractHeadings(p.body ?? '');
    const positions = requiredProblemHeadings.map((h) => headings.indexOf(h));
    const missing = requiredProblemHeadings.filter((_, i) => positions[i] === -1);
    if (missing.length > 0) {
      errors.push(`${p.id}: bagian wajib hilang: ${missing.map((h) => `"## ${h}"`).join(', ')}`);
      continue;
    }
    const ordered = positions.every((pos, i) => i === 0 || pos > (positions[i - 1] ?? -1));
    if (!ordered) errors.push(`${p.id}: urutan bagian harus ${requiredProblemHeadings.join(' → ')}`);
  }
  return errors;
}

/** Dari halaman masalah: `../../konsep/slug/` menunjuk konsep, `../slug/` menunjuk masalah lain. */
const resolveProblemLink = (target: string): [string, string] | undefined => {
  const concept = /^\.\.\/\.\.\/konsep\/([a-z0-9-]+)\/?(?:#.*)?$/.exec(target)?.[1];
  if (concept) return ['konsep', concept];
  const problem = /^\.\.\/([a-z0-9-]+)\/?(?:#.*)?$/.exec(target)?.[1];
  return problem ? ['masalah', problem] : undefined;
};

export function validateProblems(problems: ProblemLike[], conceptIds: Set<string>): string[] {
  const ids = new Set(problems.map((p) => p.id));
  return [
    ...checkFileNames(problems),
    ...checkProblemConcepts(problems, conceptIds),
    ...checkProblemStructure(problems),
    ...checkSources(problems),
    ...checkHeadingIds(problems, reservedProblemSectionIds),
    ...checkBodyLinks(problems, resolveProblemLink, { konsep: conceptIds, masalah: ids }, '../../konsep/slug/'),
  ];
}
