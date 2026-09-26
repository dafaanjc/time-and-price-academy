// Tata letak mini graf hubungan satu konsep. Fungsi murni: tanpa Astro, tanpa DOM.
// Satu sumbu vertikal (urutan belajar): prasyarat → konsep ini → konsep lanjutan.
// Konsep terkait yang bukan prasyarat/lanjutan ditaruh di sumbu putus-putus di bawahnya.
import { wrapTitle } from './graph';

export type LocalRole = 'prerequisite' | 'current' | 'next' | 'related';

export interface LocalGraphInput {
  current: { id: string; title: string; href: string };
  prerequisites: { id: string; title: string; href: string }[];
  /** Konsep yang menjadikan konsep ini prasyaratnya. */
  next: { id: string; title: string; href: string }[];
  related: { id: string; title: string; href: string }[];
}

export interface LocalNode {
  id: string;
  title: string;
  href: string;
  role: LocalRole;
  y: number;
  lines: string[];
}

export interface LocalCaption {
  role: LocalRole;
  y: number;
}

export interface LocalTrunk {
  d: string;
  dashed: boolean;
}

export interface LocalGraphLayout {
  width: number;
  height: number;
  nodes: LocalNode[];
  captions: LocalCaption[];
  trunks: LocalTrunk[];
}

export const LOCAL_WIDTH = 288;
export const LOCAL_DOT_X = 10;
export const LOCAL_LABEL_X = 28;
export const LOCAL_LINE_HEIGHT = 17;
/** Padding baris; satu baris teks + ini = 44px (target sentuh). */
export const ROW_PAD = 27;
const CAPTION_HEIGHT = 26;
const PADDING = 4;
const MAX_LINE_CHARS = 32;

export function layoutLocalGraph(input: LocalGraphInput): LocalGraphLayout {
  const taken = new Set([input.current.id]);
  const unique = <T extends { id: string }>(items: T[]) =>
    items.filter((item) => (taken.has(item.id) ? false : (taken.add(item.id), true)));
  // Prasyarat dan lanjutan diutamakan; "terkait" hanya sisanya.
  const prerequisites = unique(input.prerequisites);
  const next = unique(input.next);
  const related = unique(input.related);

  const groups: { role: LocalRole; items: { id: string; title: string; href: string }[]; caption: boolean }[] = [
    { role: 'prerequisite', items: prerequisites, caption: true },
    { role: 'current', items: [input.current], caption: prerequisites.length + next.length > 0 },
    { role: 'next', items: next, caption: true },
    { role: 'related', items: related, caption: true },
  ];

  const nodes: LocalNode[] = [];
  const captions: LocalCaption[] = [];
  let y = PADDING;
  for (const group of groups) {
    if (group.items.length === 0) continue;
    if (group.caption) {
      captions.push({ role: group.role, y: y + CAPTION_HEIGHT / 2 });
      y += CAPTION_HEIGHT;
    }
    for (const item of group.items) {
      const lines = wrapTitle(item.title, MAX_LINE_CHARS);
      const height = lines.length * LOCAL_LINE_HEIGHT + ROW_PAD;
      nodes.push({ ...item, role: group.role, y: y + height / 2, lines });
      y += height;
    }
  }

  // Sumbu utama menghubungkan simpul solid (prasyarat, konsep ini, lanjutan); sumbu terkait putus-putus.
  const trunk = (roles: LocalRole[], dashed: boolean): LocalTrunk[] => {
    const ys = nodes.filter((n) => roles.includes(n.role)).map((n) => n.y);
    const [first, ...rest] = ys;
    const last = rest.at(-1);
    return first === undefined || last === undefined
      ? []
      : [{ d: `M ${LOCAL_DOT_X} ${first} V ${last}`, dashed }];
  };

  return {
    width: LOCAL_WIDTH,
    height: y + PADDING,
    nodes,
    captions,
    trunks: [...trunk(['prerequisite', 'current', 'next'], false), ...trunk(['related'], true)],
  };
}
