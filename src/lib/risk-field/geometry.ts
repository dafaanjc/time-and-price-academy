// Geometri "Risk Field" (hero beranda) — fungsi murni, tanpa three.js, agar bisa diuji di Vitest.
// Titik ditulis sebagai [t, p, d] (waktu, harga, kepadatan f(P)), sama dengan FIG. 01 (src/lib/iso.ts).
// Di adegan 3D, bidang waktu × harga menjadi LANTAI dan kepadatan menjadi TINGGI (scene.ts: x = t,
// y = d, z = −p), sehingga relief terbaca sebagai medan: masa lalu satu jalur di lantai (d = 0); masa depan
// adalah punggung kepadatan yang melebar dan melandai (σ tumbuh ∝ √t) dengan jalur nilai harapan di puncaknya.
// Semua angka dalam satuan dunia; scene.ts hanya mengubahnya menjadi buffer three.js.

export type Vec3 = [number, number, number];

export const field = {
  /** Awal jalur masa lalu (t < 0). */
  tPast: -1.4,
  /** Horizon T: ujung kanan relief. */
  tHorizon: 2.6,
  /** Rentang harga yang digambar: [-pRange, pRange]. */
  pRange: 1.4,
  /** σ di dekat "sekarang" dan di T. */
  sigmaNow: 0.08,
  sigmaHorizon: 0.5,
  /** Drift kecil: E[P] di T sedikit di atas harga sekarang. */
  driftHorizon: 0.14,
  /** Tinggi relief (kepadatan) di T, dan batas atas di dekat "sekarang". */
  heightHorizon: 0.5,
  heightMax: 0.85,
} as const;

/** σ(t): ketidakpastian melebar ∝ √t. */
export function sigmaAt(t: number): number {
  const u = Math.max(0, t) / field.tHorizon;
  return field.sigmaNow + (field.sigmaHorizon - field.sigmaNow) * Math.sqrt(u);
}

/** μ(t): lintasan nilai harapan. */
export function meanAt(t: number): number {
  return field.driftHorizon * (Math.max(0, t) / field.tHorizon);
}

/**
 * Tinggi relief di (t, p). Bentuk Gauss dengan puncak yang menurun saat σ melebar (luas kira-kira tetap),
 * dibatasi heightMax agar dekat "sekarang" tidak menjadi paku tajam. Nol untuk t ≤ 0.
 */
export function densityAt(t: number, p: number): number {
  if (t <= 0) return 0;
  const s = sigmaAt(t);
  const z = (p - meanAt(t)) / s;
  const peak = Math.min(field.heightMax, field.heightHorizon * Math.pow(field.sigmaHorizon / s, 0.6));
  // Punggung naik halus dari lantai di awal masa depan (smoothstep), bukan paku tegak di "sekarang".
  const u = Math.min(1, t / (field.tHorizon * 0.3));
  const ease = u * u * (3 - 2 * u);
  return peak * ease * Math.exp(-0.5 * z * z);
}

/** Pembangkit acak deterministik (mulberry32): gambar yang sama di setiap build dan kunjungan. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** n+1 titik merata di [a, b]. */
export function linspace(a: number, b: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

export interface FieldDetail {
  /** Jumlah irisan waktu (garis melintang harga). */
  timeSlices: number;
  /** Jumlah garis membujur (harga tetap). */
  priceLines: number;
  /** Titik sampel per garis. */
  samples: number;
  /** Kedalaman pohon percabangan (2^depth jalur). */
  branchDepth: number;
}

/** Segmen garis (pasangan titik) + bobot 0..1 per titik (tinggi relatif) untuk warna/opasitas. */
export interface Segments {
  positions: number[];
  weights: number[];
}

function pushPolyline(out: Segments, points: Vec3[], weight: (p: Vec3) => number): void {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    out.positions.push(...a, ...b);
    out.weights.push(weight(a), weight(b));
  }
}

const surfacePoint = (t: number, p: number): Vec3 => [t, p, densityAt(t, p)];
const heightWeight = (pt: Vec3) => Math.min(1, pt[2] / field.heightHorizon);

/** Relief kawat: irisan waktu (kurva kepadatan) + garis membujur harga tetap. */
export function buildTerrain(detail: FieldDetail): Segments {
  const out: Segments = { positions: [], weights: [] };
  const { tHorizon, pRange } = field;
  const ps = linspace(-pRange, pRange, detail.samples);
  for (const t of linspace(0, tHorizon, detail.timeSlices).slice(1)) {
    pushPolyline(out, ps.map((p) => surfacePoint(t, p)), heightWeight);
  }
  const ts = linspace(0, tHorizon, detail.samples);
  for (const p of linspace(-pRange, pRange, detail.priceLines - 1)) {
    pushPolyline(out, ts.map((t) => surfacePoint(t, p)), heightWeight);
  }
  return out;
}

/** Kisi lantai (waktu × harga, d = 0): garis bantu yang sangat samar. */
export function buildWallGrid(step = 0.2): Segments {
  const out: Segments = { positions: [], weights: [] };
  const { tPast, tHorizon, pRange } = field;
  for (let t = tPast; t <= tHorizon + 1e-9; t += step) {
    out.positions.push(t, -pRange, 0, t, pRange, 0);
    out.weights.push(0, 0);
  }
  for (let p = -pRange; p <= pRange + 1e-9; p += step) {
    out.positions.push(tPast, p, 0, tHorizon, p, 0);
    out.weights.push(0, 0);
  }
  return out;
}

/** Kurva probabilitas (irisan tebal) di waktu t. */
export function densityCurve(t: number, samples: number): Vec3[] {
  const s = sigmaAt(t);
  const m = meanAt(t);
  return linspace(m - 3.2 * s, m + 3.2 * s, samples).map((p) => surfacePoint(t, p));
}

/** Jalur yang sudah terjadi: satu jalur di lantai, berakhir di (0, 0, 0) = "sekarang". */
export function historyPath(samples: number): Vec3[] {
  const { tPast } = field;
  return linspace(tPast, 0, samples).map((t) => {
    const u = t / tPast; // 1 → 0
    const p = u * (-0.32 + 0.1 * Math.sin(9 * u) + 0.07 * Math.sin(23 * u + 1.3) + 0.035 * Math.sin(51 * u));
    return [t, p, 0];
  });
}

/** Lintasan nilai harapan: di punggung relief, dari "sekarang" sampai T. */
export function meanPath(samples: number): Vec3[] {
  return linspace(0, field.tHorizon, samples).map((t) => [t, meanAt(t), densityAt(t, meanAt(t))]);
}

/**
 * Jalur bercabang: pohon biner dari "sekarang"; tiap cabang bercabang dua pada irisan waktu yang sama.
 * Harga tiap cabang tetap dalam ±2σ(t) dan titiknya menempel di permukaan relief.
 */
export function branchPaths(depth: number, samplesPerSegment: number, seed = 7): Vec3[][] {
  const rand = seeded(seed);
  const { tHorizon } = field;
  const levels = depth + 1;
  const splitTimes = linspace(0, tHorizon, levels);
  // Posisi harga ternormalisasi (dalam satuan σ) di setiap simpul, per jalur daun.
  interface Node {
    z: number[];
  }
  let nodes: Node[] = [{ z: [0] }];
  for (let level = 1; level <= levels; level++) {
    const next: Node[] = [];
    for (const node of nodes) {
      const last = node.z[node.z.length - 1]!;
      const spread = 0.55 + 0.5 * rand();
      const children = level === levels ? [0] : [-1, 1];
      for (const dir of children) {
        const jitter = (rand() - 0.5) * 0.6;
        const z = Math.max(-2, Math.min(2, last * 0.85 + dir * spread + jitter));
        next.push({ z: [...node.z, z] });
      }
    }
    nodes = next;
  }
  return nodes.map((node) => {
    const points: Vec3[] = [];
    for (let k = 0; k < node.z.length - 1; k++) {
      const t0 = splitTimes[k]!;
      const t1 = splitTimes[k + 1]!;
      const z0 = node.z[k]!;
      const z1 = node.z[k + 1]!;
      for (let i = k === 0 ? 0 : 1; i <= samplesPerSegment; i++) {
        const u = i / samplesPerSegment;
        const e = u * u * (3 - 2 * u); // smoothstep: cabang melengkung, bukan patah
        const t = t0 + (t1 - t0) * u;
        const p = meanAt(t) + (z0 + (z1 - z0) * e) * sigmaAt(t);
        points.push([t, p, densityAt(t, p) + 0.004]);
      }
    }
    return points;
  });
}

/** Titik jangkar untuk label HTML yang diproyeksikan dari 3D. */
export function labelAnchors(): Record<'price' | 'time' | 'now' | 'horizon' | 'ev' | 'density', Vec3> {
  const { tPast, tHorizon, pRange } = field;
  const evHeight = densityAt(tHorizon, meanAt(tHorizon));
  return {
    price: [tPast - 0.08, pRange + 0.1, 0],
    time: [tHorizon + 0.28, -pRange, 0],
    now: [0, -pRange - 0.16, 0],
    horizon: [tHorizon, -pRange - 0.16, 0],
    ev: [tHorizon + 0.06, meanAt(tHorizon) + 0.1, evHeight],
    density: [tPast, -pRange, 0.95],
  };
}

/** Pusat & jari-jari kotak pembatas adegan (untuk mengepaskan kamera). */
export function fieldBounds(): { center: Vec3; radius: number } {
  const { tPast, tHorizon, pRange, heightMax } = field;
  const min: Vec3 = [tPast, -pRange - 0.2, 0];
  const max: Vec3 = [tHorizon + 0.3, pRange + 0.2, heightMax * 0.8];
  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const radius = Math.hypot(max[0] - center[0], max[1] - center[1], max[2] - center[2]);
  return { center, radius };
}
