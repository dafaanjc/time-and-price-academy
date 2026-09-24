// Tata letak graf prasyarat. Fungsi murni: tanpa Astro, tanpa DOM.
// Arah vertikal: satu baris per tingkat prasyarat, garis dari prasyarat (atas) ke konsep (bawah).

export interface GraphInput {
  id: string;
  title: string;
  href: string;
  prerequisites: string[];
}

export interface GraphNode {
  id: string;
  title: string;
  href: string;
  /** Tingkat 0 = tanpa prasyarat. */
  layer: number;
  x: number;
  y: number;
  lines: string[];
}

export interface GraphEdge {
  from: string;
  to: string;
  /** Atribut `d` untuk <path>. */
  d: string;
}

export interface GraphLayout {
  width: number;
  height: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  layerCount: number;
}

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 56;
const H_GAP = 24;
const V_GAP = 48;
const PADDING = 16;
const MAX_LINE_CHARS = 22;
// Garis yang melompati tingkat dibelokkan ke kanan sejauh ini (+ per tingkat tambahan).
const SKIP_OFFSET = 36;
const SKIP_STEP = 14;

function truncate(line: string, max: number): string {
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/**
 * Pecah judul menjadi maksimal dua baris berdasarkan kata. Sisa yang tidak muat dipotong
 * dengan elipsis; judul lengkap tetap ada di aria-label simpul dan di tabel halaman peta.
 */
export function wrapTitle(title: string, max = MAX_LINE_CHARS): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of title.split(' ')) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  const [first = '', ...rest] = lines;
  return rest.length === 0 ? [truncate(first, max)] : [truncate(first, max), truncate(rest.join(' '), max)];
}

/** Tingkat = 1 + tingkat prasyarat terdalam. Input diasumsikan bebas siklus (dijamin validate.ts). */
export function computeLayers(inputs: GraphInput[]): Map<string, number> {
  const byId = new Map(inputs.map((n) => [n.id, n]));
  const layers = new Map<string, number>();
  const visiting = new Set<string>();

  const layerOf = (id: string): number => {
    const known = layers.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) throw new Error(`Siklus prasyarat pada "${id}"`);
    visiting.add(id);
    const prereqs = (byId.get(id)?.prerequisites ?? []).filter((p) => byId.has(p));
    const layer = prereqs.length === 0 ? 0 : 1 + Math.max(...prereqs.map(layerOf));
    visiting.delete(id);
    layers.set(id, layer);
    return layer;
  };

  for (const n of inputs) layerOf(n.id);
  return layers;
}

function edgePath(from: GraphNode, to: GraphNode): string {
  const span = to.layer - from.layer;
  if (span <= 1) {
    // Kurva S dari tepi bawah prasyarat ke tepi atas konsep.
    const x1 = from.x + NODE_WIDTH / 2;
    const y1 = from.y + NODE_HEIGHT;
    const x2 = to.x + NODE_WIDTH / 2;
    const y2 = to.y;
    const mid = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
  }
  // Melompati tingkat: keluar dari sisi kanan, melengkung ke kanan, masuk ke sisi kanan target.
  const bend = SKIP_OFFSET + SKIP_STEP * (span - 2);
  const x1 = from.x + NODE_WIDTH;
  const y1 = from.y + NODE_HEIGHT / 2;
  const x2 = to.x + NODE_WIDTH;
  const y2 = to.y + NODE_HEIGHT / 2;
  const cx = Math.max(x1, x2) + bend;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

/** Hitung posisi simpul dan jalur garis. Urutan input menentukan urutan dalam satu tingkat. */
export function layoutGraph(inputs: GraphInput[]): GraphLayout {
  const layers = computeLayers(inputs);
  const layerCount = inputs.length === 0 ? 0 : Math.max(...layers.values()) + 1;

  const rows: GraphInput[][] = Array.from({ length: layerCount }, () => []);
  for (const n of inputs) rows[layers.get(n.id) ?? 0]?.push(n);

  const widest = Math.max(0, ...rows.map((r) => r.length));
  const contentWidth = widest * NODE_WIDTH + Math.max(0, widest - 1) * H_GAP;
  const maxSpan = Math.max(
    1,
    ...inputs.flatMap((n) => n.prerequisites.map((p) => (layers.get(n.id) ?? 0) - (layers.get(p) ?? 0))),
  );
  const skipRoom = maxSpan > 1 ? SKIP_OFFSET + SKIP_STEP * (maxSpan - 2) + 8 : 0;

  const nodes: GraphNode[] = rows.flatMap((row, layer) => {
    const rowWidth = row.length * NODE_WIDTH + (row.length - 1) * H_GAP;
    const offset = PADDING + (contentWidth - rowWidth) / 2;
    return row.map((n, i) => ({
      id: n.id,
      title: n.title,
      href: n.href,
      layer,
      x: offset + i * (NODE_WIDTH + H_GAP),
      y: PADDING + layer * (NODE_HEIGHT + V_GAP),
      lines: wrapTitle(n.title),
    }));
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges: GraphEdge[] = inputs.flatMap((n) =>
    n.prerequisites.flatMap((p) => {
      const from = byId.get(p);
      const to = byId.get(n.id);
      return from && to ? [{ from: p, to: n.id, d: edgePath(from, to) }] : [];
    }),
  );

  return {
    width: PADDING * 2 + contentWidth + skipRoom,
    height: PADDING * 2 + layerCount * NODE_HEIGHT + Math.max(0, layerCount - 1) * V_GAP,
    nodes,
    edges,
    layerCount,
  };
}
