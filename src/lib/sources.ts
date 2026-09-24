import { sourceTypeIds } from '../data/source-types';
import type { Concept } from './concepts';

export type Source = Concept['data']['sources'][number];

/** Tautan utama sumber: URL eksplisit, bila tidak ada pakai resolver DOI. */
export function sourceHref(source: Source): string | undefined {
  if (source.url) return source.url;
  if (source.doi) return `https://doi.org/${source.doi}`;
  return undefined;
}

const typeOrder = new Map(sourceTypeIds.map((id, i) => [id, i]));

/** Urutkan sumber per jenis (riset primer dulu), lalu tahun terbaru. */
export function sortSources(sources: Source[]): Source[] {
  return [...sources].sort(
    (a, b) => (typeOrder.get(a.type) ?? 0) - (typeOrder.get(b.type) ?? 0) || (b.year ?? 0) - (a.year ?? 0),
  );
}
