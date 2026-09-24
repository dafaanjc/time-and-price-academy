// Proyeksi isometrik untuk ilustrasi teknis "Waktu × Harga" (fungsi murni, diuji Vitest).
//
// Ruang tiga sumbu:
//   t — waktu, ke kanan-bawah (30°)
//   p — harga/nilai, tegak ke atas
//   d — kepadatan probabilitas f(P), ke kiri-bawah (30°), keluar dari bidang waktu×harga
// Layar SVG: x ke kanan, y ke bawah. Satu satuan = `unit` px.

export interface IsoPoint {
  t: number;
  p: number;
  d: number;
}

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

const round = (n: number) => Math.round(n * 10) / 10;

/** Titik 3D → koordinat layar [x, y], dibulatkan 0,1 px agar markup ringkas. */
export function project({ t, p, d }: IsoPoint, unit: number): [number, number] {
  return [round((t - d) * COS30 * unit), round((t + d) * SIN30 * unit - p * unit)];
}

/** Polyline terbuka "M x y L x y …" melalui titik-titik 3D. */
export function isoPath(points: IsoPoint[], unit: number, close = false): string {
  const d = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${project(pt, unit).join(' ')}`).join(' ');
  return close ? `${d} Z` : d;
}

/** Kepadatan distribusi normal. */
export function normalPdf(x: number, mean: number, sd: number): number {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/** `n + 1` nilai berjarak sama dari `from` sampai `to` (inklusif). */
export function steps(from: number, to: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);
}

// ---------------------------------------------------------------------------------------------
// Data figur beranda. Ini ilustrasi konsep, bukan data pasar: jalur harga ditulis tangan,
// distribusi di waktu T normal dengan rata-rata `mean` dan simpangan `sd`.

export interface TimePriceScene {
  unit: number;
  /** Batas sumbu. */
  tMax: number;
  pMax: number;
  dMax: number;
  /** Waktu sekarang dan waktu horizon T. */
  now: number;
  horizon: number;
  /** Jalur harga yang sudah terjadi, satu nilai per 0,5 satuan waktu mulai t = 0. */
  history: number[];
  mean: number;
  sd: number;
  /** Pengali kepadatan → satuan d, agar puncak kurva keluar ±2,8 satuan dari dinding. */
  densityScale: number;
}

export const timePriceScene: TimePriceScene = {
  unit: 26,
  tMax: 11,
  pMax: 9.5,
  dMax: 3.4,
  now: 6,
  horizon: 10,
  history: [3.2, 3.5, 3.1, 3.8, 4.2, 3.9, 4.6, 4.4, 5.1, 4.8, 4.5, 5.2, 5.0],
  mean: 5.6,
  sd: 1,
  densityScale: 7,
};

export interface TimePriceGeometry {
  /** Garis kisi dinding (bidang waktu×harga, d = 0) dan lantai (bidang waktu×kepadatan, p = 0). */
  wallGrid: string;
  floorGrid: string;
  axes: { time: string; price: string; density: string };
  /** Ujung sumbu untuk label. */
  ends: { time: [number, number]; price: [number, number]; density: [number, number] };
  history: string;
  /** Titik "sekarang" di ujung jalur dan garis bantunya ke sumbu waktu. */
  nowPoint: [number, number];
  nowGuide: string;
  nowTick: [number, number];
  /** Selubung ±2σ yang melebar dengan √waktu, dan jalur median ke nilai harapan. */
  envelopeUpper: string;
  envelopeLower: string;
  median: string;
  /** Kurva kepadatan di waktu T (tegak lurus waktu) dan bidang isinya. */
  density: string;
  densityArea: string;
  /** Garis waktu T di dinding (t = T, d = 0), dari sumbu waktu sampai atas distribusi. */
  horizonBase: string;
  horizonTick: [number, number];
  /** Nilai harapan: titik di dinding, garis ke puncak kurva, dan garis bantu ke sumbu harga. */
  evPoint: [number, number];
  evLeader: string;
  evGuide: string;
  evTick: [number, number];
  /** Tick sumbu waktu & harga (garis pendek). */
  ticks: string;
}

export function buildTimePriceGeometry(s: TimePriceScene = timePriceScene): TimePriceGeometry {
  const { unit: u, tMax, pMax, dMax, now, horizon: T, mean, sd, densityScale } = s;
  const P = (t: number, p: number, d = 0) => project({ t, p, d }, u);
  const path = (pts: [number, number, number?][], close = false) =>
    isoPath(pts.map(([t, p, d = 0]) => ({ t, p, d })), u, close);

  const wallGrid = [
    ...steps(1, 10, 9).map((t) => path([[t, 0], [t, 9]])),
    ...steps(1, 9, 8).map((p) => path([[0, p], [10, p]])),
  ].join(' ');
  const floorGrid = [
    ...steps(1, 10, 9).map((t) => path([[t, 0, 0], [t, 0, 3]])),
    ...steps(1, 3, 2).map((d) => path([[0, 0, d], [10, 0, d]])),
  ].join(' ');

  const lastPrice = s.history.at(-1) ?? mean;
  const cone = steps(0, 1, 16);
  const coneAt = (k: number, sign: number): [number, number] => [
    now + (T - now) * k,
    lastPrice + (mean - lastPrice) * k + sign * 2 * sd * Math.sqrt(k),
  ];

  const lo = mean - 3 * sd;
  const hi = mean + 3 * sd;
  const curve = steps(lo, hi, 48).map((p): [number, number, number] => [T, p, normalPdf(p, mean, sd) * densityScale]);
  const peak = normalPdf(mean, mean, sd) * densityScale;

  const tick = (a: [number, number, number?], b: [number, number, number?]) => path([a, b]);
  const ticks = [
    ...steps(1, 10, 9).map((t) => tick([t, 0, 0], [t, 0, -0.18])),
    ...steps(1, 9, 8).map((p) => tick([0, p, 0], [-0.18, p, 0])),
  ].join(' ');

  return {
    wallGrid,
    floorGrid,
    axes: {
      time: path([[0, 0], [tMax, 0]]),
      price: path([[0, 0], [0, pMax]]),
      density: path([[T, 0, 0], [T, 0, dMax]]),
    },
    ends: { time: P(tMax, 0), price: P(0, pMax), density: P(T, 0, dMax) },
    history: path(s.history.map((p, i): [number, number] => [i * 0.5, p])),
    nowPoint: P(now, lastPrice),
    nowGuide: path([[now, lastPrice], [now, 0]]),
    nowTick: P(now, 0),
    envelopeUpper: path(cone.map((k) => coneAt(k, 1))),
    envelopeLower: path(cone.map((k) => coneAt(k, -1))),
    median: path([[now, lastPrice], [T, mean]]),
    density: path(curve),
    densityArea: path([[T, lo, 0], ...curve, [T, hi, 0]], true),
    horizonBase: path([[T, 0], [T, hi]]),
    horizonTick: P(T, 0),
    evPoint: P(T, mean),
    evLeader: path([[T, mean, 0], [T, mean, peak]]),
    evGuide: path([[T, mean], [0, mean]]),
    evTick: P(0, mean),
    ticks,
  };
}
