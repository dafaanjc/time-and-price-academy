import { describe, expect, it } from 'vitest';
import { computeLayers, layoutGraph, markerPath, NODE_HEIGHT, NODE_WIDTH, wrapText, wrapTitle, type GraphLayout } from '../src/lib/graph';

const n = (id: string, prerequisites: string[] = []) => ({ id, title: id, href: `/${id}`, prerequisites });

// Bentuk graf meniru konten nyata: tingkat berisi beberapa simpul dan garis yang melompati tingkat.
const realistic = [
  n('risk'),
  n('rvu', ['risk']),
  n('sizing', ['risk']),
  n('aversion', ['risk']),
  n('prob', ['risk', 'rvu']),
  n('leverage', ['sizing']),
  n('dist', ['prob']),
  n('ev', ['dist']),
  n('var', ['ev']),
  n('ruin', ['ev', 'sizing']),
];

/** Titik-titik sudut path garis jalur (perintah M/V/H/Q). */
function corners(d: string): [number, number][] {
  const t = d.split(' ');
  const pts: [number, number][] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === 'M') {
      x = Number(t[++i]);
      y = Number(t[++i]);
    } else if (c === 'V') y = Number(t[++i]);
    else if (c === 'H') x = Number(t[++i]);
    else if (c === 'Q') {
      i += 2;
      x = Number(t[++i]);
      y = Number(t[++i]);
    } else continue;
    pts.push([x, y]);
  }
  return pts;
}

function laneCrossings(g: GraphLayout): string[] {
  const hits: string[] = [];
  for (const e of g.edges.filter((edge) => edge.d.includes(' H '))) {
    const pts = corners(e.d);
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1]!;
      const [bx, by] = pts[i]!;
      for (const node of g.nodes) {
        if (node.id === e.from || node.id === e.to) continue;
        const overlapX = Math.min(ax, bx) < node.x + NODE_WIDTH - 1 && Math.max(ax, bx) > node.x + 1;
        const overlapY = Math.min(ay, by) < node.y + NODE_HEIGHT - 1 && Math.max(ay, by) > node.y + 1;
        if (overlapX && overlapY) hits.push(`${e.from}→${e.to} melewati ${node.id}`);
      }
    }
  }
  return hits;
}

describe('graf prasyarat', () => {
  it('tingkat = 1 + prasyarat terdalam', () => {
    const layers = computeLayers(realistic);
    expect(layers.get('risk')).toBe(0);
    expect(layers.get('prob')).toBe(2);
    expect(layers.get('ruin')).toBe(5);
  });

  it('mendeteksi siklus', () => {
    expect(() => computeLayers([n('x', ['y']), n('y', ['x'])])).toThrow(/Siklus/);
  });

  it('simpul tidak bertumpuk dan tetap di dalam batas', () => {
    const g = layoutGraph(realistic);
    for (const a of g.nodes) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + NODE_WIDTH).toBeLessThanOrEqual(g.width);
      expect(a.y + NODE_HEIGHT).toBeLessThanOrEqual(g.height);
      for (const b of g.nodes) {
        if (a !== b) expect(Math.abs(a.x - b.x) < NODE_WIDTH && Math.abs(a.y - b.y) < NODE_HEIGHT).toBe(false);
      }
    }
  });

  it('garis yang melompati tingkat tidak menembus simpul lain', () => {
    const g = layoutGraph(realistic);
    expect(g.edges.some((e) => e.d.includes(' H '))).toBe(true);
    expect(laneCrossings(g)).toEqual([]);
  });

  it('semua garis tetap di dalam lebar graf; jalur lompatan memakai sisi terdekat', () => {
    // Lompatan dari simpul paling kiri dan paling kanan: satu jalur kiri, satu jalur kanan.
    const g = layoutGraph([
      n('a'),
      n('b'),
      n('c'),
      n('l', ['a']),
      n('m', ['l']),
      n('z', ['a']),
      n('y', ['z', 'c']),
      n('x', ['y']),
      n('p', ['a']),
      n('q', ['c']),
      n('deep-l', ['a', 'm']),
      n('deep-r', ['c', 'x']),
    ]);
    let left = false;
    let right = false;
    const minX = Math.min(...g.nodes.map((node) => node.x));
    const maxX = Math.max(...g.nodes.map((node) => node.x + NODE_WIDTH));
    for (const e of g.edges) {
      for (const [x] of corners(e.d)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(g.width);
        if (x < minX) left = true;
        if (x > maxX) right = true;
      }
    }
    expect(left && right).toBe(true);
    expect(laneCrossings(g)).toEqual([]);
  });

  it('judul dibungkus maksimal dua baris × 18 karakter', () => {
    expect(wrapTitle('Risiko vs Ketidakpastian')).toEqual(['Risiko vs', 'Ketidakpastian']);
    for (const line of wrapTitle('Sangat Panjang Sekali Judul Konsep Yang Tidak Biasa Ini')) {
      expect(line.length).toBeLessThanOrEqual(18);
    }
  });

  it('wrapText memecah per kata dan memotong sisa dengan elipsis', () => {
    expect(wrapText('satu dua tiga empat', 9, 3)).toEqual(['satu dua', 'tiga', 'empat']);
    const cut = wrapText('satu dua tiga empat lima enam', 9, 2);
    expect(cut).toHaveLength(2);
    expect(cut[1]!.length).toBeLessThanOrEqual(9);
    expect(cut[1]!.endsWith('…')).toBe(true);
    expect(wrapText('', 9, 2)).toEqual([]);
  });
});

describe('markerPath', () => {
  it('setiap bentuk menghasilkan path tertutup di dalam kotak ±r (+15%)', () => {
    for (const shape of ['circle', 'square', 'diamond', 'triangle', 'cross'] as const) {
      const d = markerPath(shape, 10, 20, 6);
      expect(d.endsWith('Z')).toBe(true);
      for (const [, x, y] of d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)) {
        expect(Math.abs(Number(x) - 10)).toBeLessThanOrEqual(6 * 1.15 + 0.1);
        expect(Math.abs(Number(y) - 20)).toBeLessThanOrEqual(6 * 1.15 + 0.1);
      }
    }
  });
});

describe('penanda kategori', () => {
  it('setiap kategori punya bentuk berbeda', async () => {
    const { categories } = await import('../src/data/categories');
    const markers = categories.map((c) => c.marker);
    expect(new Set(markers).size).toBe(markers.length);
  });
});
