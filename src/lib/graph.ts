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
// Garis yang melompati tingkat berjalan siku di jalur (lane) khusus di kanan semua simpul,
// sehingga tidak pernah menembus simpul di tingkat antara atau simpul tetangga.
const LANE_OFFSET = 24;
const LANE_STEP = 14;
const CORNER = 8;

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

/** Kurva S dari tepi bawah prasyarat ke tepi atas konsep (tingkat berurutan). */
function adjacentPath(from: GraphNode, to: GraphNode): string {
  const x1 = from.x + NODE_WIDTH / 2;
  const y1 = from.y + NODE_HEIGHT;
  const x2 = to.x + NODE_WIDTH / 2;
  const y2 = to.y;
  const mid = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
}

/**
 * Garis yang melompati tingkat: turun dari bawah prasyarat, belok ke jalur di kanan (di dalam celah
 * antar-tingkat yang tidak berisi simpul), turun di jalur itu, lalu belok masuk ke atas konsep.
 * Ketinggian belokan digeser per jalur agar garis tidak saling menumpuk.
 */
function lanePath(from: GraphNode, to: GraphNode, laneX: number, lane: number): string {
  const r = CORNER;
  const x1 = from.x + NODE_WIDTH / 2;
  const y1 = from.y + NODE_HEIGHT;
  const x2 = to.x + NODE_WIDTH / 2;
  const y2 = to.y;
  // Belokan keluar dekat simpul asal, belokan masuk dekat simpul tujuan: bila dua garis jalur
  // berbagi satu celah, segmen keluar dan masuknya tetap terpisah (bukan tampak satu garis).
  const shift = (lane % 3) * 6;
  const yA = y1 + 10 + shift;
  const yB = y2 - 16 - shift;
  return [
    `M ${x1} ${y1}`,
    `V ${yA - r} Q ${x1} ${yA} ${x1 + r} ${yA}`,
    `H ${laneX - r} Q ${laneX} ${yA} ${laneX} ${yA + r}`,
    `V ${yB - r} Q ${laneX} ${yB} ${laneX - r} ${yB}`,
    `H ${x2 + r} Q ${x2} ${yB} ${x2} ${yB + r}`,
    `V ${y2}`,
  ].join(' ');
}

/** Hitung posisi simpul dan jalur garis. Urutan input menentukan urutan dalam satu tingkat. */
export function layoutGraph(inputs: GraphInput[]): GraphLayout {
  const layers = computeLayers(inputs);
  const layerCount = inputs.length === 0 ? 0 : Math.max(...layers.values()) + 1;

  const rows: GraphInput[][] = Array.from({ length: layerCount }, () => []);
  for (const n of inputs) rows[layers.get(n.id) ?? 0]?.push(n);

  const widest = Math.max(0, ...rows.map((r) => r.length));
  const contentWidth = widest * NODE_WIDTH + Math.max(0, widest - 1) * H_GAP;

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
  const pairs = inputs.flatMap((n) =>
    n.prerequisites.flatMap((p) => {
      const from = byId.get(p);
      const to = byId.get(n.id);
      return from && to ? [{ from, to, span: to.layer - from.layer }] : [];
    }),
  );

  // Jalur kanan: garis terpendek paling dekat ke simpul agar garis panjang tidak memotongnya.
  const skips = pairs.filter((e) => e.span > 1).sort((a, b) => a.span - b.span || a.from.layer - b.from.layer);
  const laneOf = new Map(skips.map((e, i) => [e, i]));
  const laneBase = PADDING + contentWidth + LANE_OFFSET;
  const laneRoom = skips.length > 0 ? LANE_OFFSET + (skips.length - 1) * LANE_STEP + 8 : 0;

  const edges: GraphEdge[] = pairs.map((e) => {
    const lane = laneOf.get(e);
    const d = lane === undefined ? adjacentPath(e.from, e.to) : lanePath(e.from, e.to, laneBase + lane * LANE_STEP, lane);
    return { from: e.from.id, to: e.to.id, d };
  });

  return {
    width: PADDING * 2 + contentWidth + laneRoom,
    height: PADDING * 2 + layerCount * NODE_HEIGHT + Math.max(0, layerCount - 1) * V_GAP,
    nodes,
    edges,
    layerCount,
  };
}
