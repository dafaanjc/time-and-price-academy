// Medan hasil (R9.1): gambar prosedural di panggung hero. Fungsi murni, diuji Vitest.
//
// Dari satu titik "sekarang" (jam pasir di tangan figur emblem), masa depan bercabang ke kanan (waktu → kanan):
// jalur-jalur acak yang BERCABANG (4 → 12 → 24), selubung ±2σ yang melebar ∝ √t, garis E[P] (tanpa drift:
// situs ini tidak menyiratkan arah harga), dan kurva kepadatan tegak di horizon T. Acak dengan seed tetap
// (mulberry32), jadi hasil build selalu sama. Ilustrasi konsep, bukan data pasar.
import { mulberry32 } from './calc/expected-value';

export interface FieldOptions {
  /** Titik "sekarang" (satuan viewBox). */
  x0: number;
  y0: number;
  /** x horizon T. */
  xT: number;
  /** σ di horizon T (satuan viewBox, arah vertikal). */
  sigmaT: number;
  /** Lebar maksimum kurva kepadatan di T. */
  densityWidth?: number;
  seed?: number;
  /** Jumlah langkah dari sekarang sampai T. */
  steps?: number;
  /** Faktor percabangan per tahap, mis. [4, 3, 2] = 4 → 12 → 24 jalur. */
  branching?: number[];
}

export interface OutcomeField {
  /** Jalur daun (setiap jalur dari "sekarang" sampai T; awalan jalur saudara sama → batang tampak tebal). */
  paths: string[];
  /** Selubung ±2σ√(t/T) atas dan bawah. */
  upper: string;
  lower: string;
  /** Garis nilai harapan (datar). */
  expected: string;
  /** Kurva kepadatan tegak di T (menonjol ke kanan) dan garis dasarnya. */
  density: string;
  densityBase: string;
  /** x titik cabang (untuk penanda kecil). */
  branchXs: number[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Normal baku lewat Box–Muller dari generator seragam. */
function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function outcomeField({
  x0,
  y0,
  xT,
  sigmaT,
  densityWidth = 56,
  seed = 7,
  steps = 36,
  branching = [4, 3, 2],
}: FieldOptions): OutcomeField {
  const rand = mulberry32(seed);
  const dx = (xT - x0) / steps;
  // Varians per langkah agar simpangan baku di T = sigmaT (jalan acak: σ(t) = σT·√(t/T)).
  const stepSd = sigmaT / Math.sqrt(steps);
  const stages = branching.length;
  const stageEnd = (k: number) => Math.round((steps * (k + 1)) / stages);

  // Pohon: setiap simpul menyimpan titik-titik segmennya; daun = jalur penuh.
  type Node = { points: [number, number][]; depth: number };
  let frontier: Node[] = [{ points: [[x0, y0]], depth: -1 }];
  const branchXs: number[] = [];
  for (let k = 0; k < stages; k++) {
    const next: Node[] = [];
    const from = k === 0 ? 0 : stageEnd(k - 1);
    const to = stageEnd(k);
    if (k > 0) branchXs.push(r1(x0 + from * dx));
    for (const node of frontier) {
      for (let b = 0; b < branching[k]!; b++) {
        const points = [...node.points];
        let [, y] = points[points.length - 1]!;
        for (let i = from + 1; i <= to; i++) {
          y += gaussian(rand) * stepSd;
          points.push([x0 + i * dx, y]);
        }
        next.push({ points, depth: k });
      }
    }
    frontier = next;
  }

  const toPath = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join(' ');
  const envelope = (sign: 1 | -1) =>
    toPath(Array.from({ length: steps + 1 }, (_, i) => [x0 + i * dx, y0 - sign * 2 * sigmaT * Math.sqrt(i / steps)]));

  // Kepadatan normal di T, lebar maksimum = densityWidth, dari −3σ sampai +3σ.
  const samples = 48;
  const density = toPath(
    Array.from({ length: samples + 1 }, (_, i) => {
      const z = -3 + (6 * i) / samples;
      return [xT + densityWidth * Math.exp(-0.5 * z * z), y0 + z * sigmaT];
    }),
  );

  return {
    paths: frontier.map((n) => toPath(n.points)),
    upper: envelope(1),
    lower: envelope(-1),
    expected: `M${r1(x0)} ${r1(y0)} H${r1(xT)}`,
    density,
    densityBase: `M${r1(xT)} ${r1(y0 - 3 * sigmaT)} V${r1(y0 + 3 * sigmaT)}`,
    branchXs,
  };
}

/**
 * Evolusi saat menggulir: horizon bertambah dari 1T sampai `maxHorizon`·T, sebaran tumbuh ∝ √horizon.
 * `progress` 0–1. Mengembalikan faktor skala sebaran dan teks pembacaan.
 */
export function horizonAt(progress: number, maxHorizon = 2): { horizon: number; spread: number } {
  const p = Math.min(1, Math.max(0, progress));
  const horizon = 1 + p * (maxHorizon - 1);
  return { horizon, spread: Math.sqrt(horizon) };
}
