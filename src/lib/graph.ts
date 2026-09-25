// Tata letak graf prasyarat. Fungsi murni: tanpa Astro, tanpa DOM.
// Arah vertikal: satu baris per tingkat prasyarat, garis dari prasyarat (atas) ke konsep (bawah).

export interface GraphInput {
  id: string;
  title: string;
  /** Ringkasan singkat untuk tooltip simpul. */
  description?: string;
  href: string;
  prerequisites: string[];
  /** Kelompok simpul (id kategori), dipakai sebagai kait `data-category`. */
  group?: string;
  /** Baris metadata singkat untuk tooltip, mis. "Psikologi · Heuristik Penilaian". */
  meta?: string;
}

export interface GraphNode {
  id: string;
  title: string;
  description: string;
  href: string;
  group?: string;
  meta: string;
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

// Ukuran dipadatkan (R9) agar peta 5 simpul per tingkat + jalur muat di bingkai desktop (≥ 80rem) tanpa digeser.
export const NODE_WIDTH = 172;
export const NODE_HEIGHT = 56;
/** Simpul digambar sebagai lingkaran kecil di tepi kiri sel; garis masuk/keluar di atas/bawahnya, label di kanannya. */
export const NODE_RADIUS = 6;
export const NODE_ANCHOR_X = 12;
const H_GAP = 16;
const V_GAP = 48;
const PADDING = 12;
const MAX_LINE_CHARS = 18;
// Garis yang melompati tingkat berjalan siku di jalur (lane) khusus di luar semua simpul — di kiri atau
// di kanan, mana yang lebih dekat — sehingga tidak pernah menembus simpul di tingkat antara atau tetangga,
// dan garis dari simpul kiri tidak perlu menyeberangi seluruh peta.
const LANE_OFFSET = 16;
const LANE_STEP = 10;
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

/** Pecah teks menjadi baris berdasarkan kata (maksimal `maxLines`; sisanya dipotong dengan elipsis). */
export function wrapText(text: string, max: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = truncate(`${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, max);
  return kept;
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

export type MarkerShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'cross';

/**
 * Path SVG penanda simpul berpusat di (cx, cy) dengan "jari-jari" r. Semua bentuk mengisi kotak ±r dan
 * luasnya kira-kira setara secara visual, sehingga tidak ada kategori yang tampak lebih penting.
 */
export function markerPath(shape: MarkerShape, cx: number, cy: number, r: number): string {
  const f = (n: number) => Math.round(n * 10) / 10;
  switch (shape) {
    case 'square': {
      const h = r * 0.88;
      return `M${f(cx - h)} ${f(cy - h)} H${f(cx + h)} V${f(cy + h)} H${f(cx - h)} Z`;
    }
    case 'diamond':
      return `M${f(cx)} ${f(cy - r * 1.15)} L${f(cx + r * 1.15)} ${f(cy)} L${f(cx)} ${f(cy + r * 1.15)} L${f(cx - r * 1.15)} ${f(cy)} Z`;
    case 'triangle':
      return `M${f(cx)} ${f(cy - r * 1.1)} L${f(cx + r * 1.05)} ${f(cy + r * 0.8)} L${f(cx - r * 1.05)} ${f(cy + r * 0.8)} Z`;
    case 'cross': {
      const a = r * 0.36;
      return (
        `M${f(cx - a)} ${f(cy - r)} H${f(cx + a)} V${f(cy - a)} H${f(cx + r)} V${f(cy + a)} H${f(cx + a)} ` +
        `V${f(cy + r)} H${f(cx - a)} V${f(cy + a)} H${f(cx - r)} V${f(cy - a)} H${f(cx - a)} Z`
      );
    }
    default:
      return `M${f(cx - r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;
  }
}

/** Titik masuk (atas lingkaran) dan keluar (bawah lingkaran) sebuah simpul. */
const outPoint = (n: GraphNode): [number, number] => [n.x + NODE_ANCHOR_X, n.y + NODE_HEIGHT / 2 + NODE_RADIUS];
const inPoint = (n: GraphNode): [number, number] => [n.x + NODE_ANCHOR_X, n.y + NODE_HEIGHT / 2 - NODE_RADIUS];

/** Siku teknis dari prasyarat ke konsep pada tingkat berurutan: turun, belok di tengah celah, turun lagi. */
function adjacentPath(from: GraphNode, to: GraphNode): string {
  const [x1, y1] = outPoint(from);
  const [x2, y2] = inPoint(to);
  if (Math.abs(x2 - x1) < 1) return `M ${x1} ${y1} V ${y2}`;
  const r = CORNER;
  const s = Math.sign(x2 - x1);
  const mid = (from.y + NODE_HEIGHT + to.y) / 2;
  return [
    `M ${x1} ${y1}`,
    `V ${mid - r} Q ${x1} ${mid} ${x1 + s * r} ${mid}`,
    `H ${x2 - s * r} Q ${x2} ${mid} ${x2} ${mid + r}`,
    `V ${y2}`,
  ].join(' ');
}

/**
 * Garis yang melompati tingkat: turun dari bawah prasyarat, belok ke jalur di kiri/kanan (di dalam celah
 * antar-tingkat yang tidak berisi simpul), turun di jalur itu, lalu belok masuk ke atas konsep.
 * Ketinggian belokan digeser per jalur agar garis tidak saling menumpuk.
 */
function lanePath(from: GraphNode, to: GraphNode, laneX: number, lane: number): string {
  const r = CORNER;
  const [x1, y1Start] = outPoint(from);
  const [x2, y2] = inPoint(to);
  const out = Math.sign(laneX - x1) || 1; // arah menuju jalur
  const back = Math.sign(x2 - laneX) || -out; // arah dari jalur ke konsep
  const y1 = from.y + NODE_HEIGHT;
  // Belokan keluar dekat simpul asal, belokan masuk dekat simpul tujuan: bila dua garis jalur
  // berbagi satu celah, segmen keluar dan masuknya tetap terpisah (bukan tampak satu garis).
  const shift = (lane % 3) * 6;
  const yA = y1 + 10 + shift;
  const yB = to.y - 16 - shift;
  return [
    `M ${x1} ${y1Start}`,
    `V ${yA - r} Q ${x1} ${yA} ${x1 + out * r} ${yA}`,
    `H ${laneX - out * r} Q ${laneX} ${yA} ${laneX} ${yA + r}`,
    `V ${yB - r} Q ${laneX} ${yB} ${laneX + back * r} ${yB}`,
    `H ${x2 - back * r} Q ${x2} ${yB} ${x2} ${yB + r}`,
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

  // Tata letak awal (tanpa ruang jalur) untuk menentukan sisi jalur tiap garis lompatan.
  const place = (x0: number): GraphNode[] =>
    rows.flatMap((row, layer) => {
      const rowWidth = row.length * NODE_WIDTH + (row.length - 1) * H_GAP;
      const offset = x0 + (contentWidth - rowWidth) / 2;
      return row.map((n, i) => ({
        id: n.id,
        title: n.title,
        description: n.description ?? '',
        href: n.href,
        group: n.group,
        meta: n.meta ?? '',
        layer,
        x: offset + i * (NODE_WIDTH + H_GAP),
        y: PADDING + layer * (NODE_HEIGHT + V_GAP),
        lines: wrapTitle(n.title),
      }));
    });

  const pairsFor = (nodes: GraphNode[]) => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return inputs.flatMap((n) =>
      n.prerequisites.flatMap((p) => {
        const from = byId.get(p);
        const to = byId.get(n.id);
        return from && to ? [{ from, to, span: to.layer - from.layer }] : [];
      }),
    );
  };

  // Sisi jalur: kiri bila titik tengah kedua simpul di separuh kiri isi, selain itu kanan.
  // Garis terpendek paling dekat ke simpul agar garis panjang tidak memotongnya.
  const centre = contentWidth / 2;
  const draft = pairsFor(place(0)).filter((e) => e.span > 1);
  const bySpan = (a: (typeof draft)[number], b: (typeof draft)[number]) => a.span - b.span || a.from.layer - b.from.layer;
  const sideOf = (e: (typeof draft)[number]) => ((e.from.x + e.to.x) / 2 + NODE_ANCHOR_X < centre ? 'left' : 'right');
  const key = (e: { from: { id: string }; to: { id: string } }) => `${e.from.id}>${e.to.id}`;
  const lanes = new Map<string, { side: 'left' | 'right'; index: number }>();
  for (const side of ['left', 'right'] as const) {
    draft.filter((e) => sideOf(e) === side).sort(bySpan).forEach((e, index) => lanes.set(key(e), { side, index }));
  }
  const count = (side: 'left' | 'right') => [...lanes.values()].filter((l) => l.side === side).length;
  const room = (n: number) => (n > 0 ? LANE_OFFSET + (n - 1) * LANE_STEP + 8 : 0);
  const leftRoom = room(count('left'));
  const rightRoom = room(count('right'));
  const x0 = PADDING + leftRoom;

  const nodes = place(x0);
  const pairs = pairsFor(nodes);
  const laneX = ({ side, index }: { side: 'left' | 'right'; index: number }) =>
    side === 'left' ? x0 - LANE_OFFSET - index * LANE_STEP : x0 + contentWidth + LANE_OFFSET + index * LANE_STEP;

  const edges: GraphEdge[] = pairs.map((e) => {
    const lane = lanes.get(key(e));
    const d = lane === undefined ? adjacentPath(e.from, e.to) : lanePath(e.from, e.to, laneX(lane), lane.index);
    return { from: e.from.id, to: e.to.id, d };
  });

  return {
    width: PADDING * 2 + leftRoom + contentWidth + rightRoom,
    height: PADDING * 2 + layerCount * NODE_HEIGHT + Math.max(0, layerCount - 1) * V_GAP,
    nodes,
    edges,
    layerCount,
  };
}
