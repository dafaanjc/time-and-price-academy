// Navigasi utama (header desktop + menu mobile). Data, bukan markup: menambah bagian
// cukup satu baris di sini.
import { routes, withBase } from './url';

export interface NavItem {
  label: string;
  href: string;
  /** Awalan path (dengan base) yang dianggap bagian dari item ini. */
  sections: string[];
}

export const primaryNav: NavItem[] = [
  { label: 'Masalah', href: withBase(routes.problems), sections: [withBase(routes.problems)] },
  { label: 'Konsep', href: withBase(routes.concepts), sections: [withBase('/konsep/'), withBase('/kategori/')] },
  { label: 'Jalur Belajar', href: withBase(routes.learningPaths), sections: [withBase(routes.learningPaths)] },
  { label: 'Peta', href: withBase(routes.map), sections: [withBase(routes.map)] },
];

/**
 * Nilai aria-current untuk item navigasi: "page" bila tepat di halaman item,
 * "true" bila berada di dalam bagiannya (mis. halaman konsep di bawah "Konsep").
 */
export function navCurrent(item: NavItem, pathname: string): 'page' | 'true' | undefined {
  if (pathname === item.href) return 'page';
  return item.sections.some((section) => pathname.startsWith(section)) ? 'true' : undefined;
}
