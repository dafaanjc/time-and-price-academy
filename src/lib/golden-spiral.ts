// Spiral emas (motif waktu × harga di balik figur emblem), digambar ulang sebagai vektor murni:
// persegi panjang emas (rasio φ) yang berulang kali dipotong menjadi persegi, dengan seperempat lingkaran
// di tiap persegi. Urutan potongan kiri → atas → kanan → bawah, sehingga spiral bergerak searah jarum jam
// ke dalam. Satuan bebas: persegi panjang awal `width` × `width / φ`, sudut kiri atas di (0, 0).

export const PHI = (1 + Math.sqrt(5)) / 2;

export interface SpiralSquare {
  x: number;
  y: number;
  size: number;
}

export interface SpiralArc {
  from: [number, number];
  to: [number, number];
  radius: number;
}

export interface GoldenSpiral {
  width: number;
  height: number;
  squares: SpiralSquare[];
  arcs: SpiralArc[];
}

export function goldenSpiral(width: number, iterations: number): GoldenSpiral {
  const height = width / PHI;
  let rect = { x: 0, y: 0, w: width, h: height };
  const squares: SpiralSquare[] = [];
  const arcs: SpiralArc[] = [];

  for (let i = 0; i < iterations; i++) {
    const s = Math.min(rect.w, rect.h);
    const { x, y, w, h } = rect;
    switch (i % 4) {
      case 0: // kiri: kiri bawah → kanan atas
        squares.push({ x, y, size: s });
        arcs.push({ from: [x, y + s], to: [x + s, y], radius: s });
        rect = { x: x + s, y, w: w - s, h };
        break;
      case 1: // atas: kiri atas → kanan bawah
        squares.push({ x, y, size: s });
        arcs.push({ from: [x, y], to: [x + s, y + s], radius: s });
        rect = { x, y: y + s, w, h: h - s };
        break;
      case 2: // kanan: kanan atas → kiri bawah
        squares.push({ x: x + w - s, y, size: s });
        arcs.push({ from: [x + w, y], to: [x + w - s, y + s], radius: s });
        rect = { x, y, w: w - s, h };
        break;
      default: // bawah: kanan bawah → kiri atas
        squares.push({ x, y: y + h - s, size: s });
        arcs.push({ from: [x + s, y + h], to: [x, y + h - s], radius: s });
        rect = { x, y, w, h: h - s };
    }
  }
  return { width, height, squares, arcs };
}

const r = (n: number) => Math.round(n * 1000) / 1000;

/** Satu path kontinu untuk seluruh spiral (seperempat lingkaran searah jarum jam). */
export function spiralPath(spiral: GoldenSpiral): string {
  const [first] = spiral.arcs;
  if (!first) return '';
  return [
    `M ${r(first.from[0])} ${r(first.from[1])}`,
    ...spiral.arcs.map((a) => `A ${r(a.radius)} ${r(a.radius)} 0 0 1 ${r(a.to[0])} ${r(a.to[1])}`),
  ].join(' ');
}

/** Garis pembagi persegi (tanpa bingkai luar), sebagai satu path. */
export function squaresPath(spiral: GoldenSpiral): string {
  return spiral.squares
    .map((s) => `M ${r(s.x)} ${r(s.y)} h ${r(s.size)} v ${r(s.size)} h ${r(-s.size)} Z`)
    .join(' ');
}
