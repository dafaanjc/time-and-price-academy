// Jam pasir modal (hero beranda): geometri instrumen dan hitungan kalah beruntun. Fungsi murni, diuji Vitest.
//
// Pasir = modal. Setiap keputusan yang salah menjatuhkan `risiko %` dari modal BERJALAN (risiko tetap,
// sama dengan mode `fixed` di calc/drawdown.ts). Hitungan pasti, tanpa angka acak atau data pasar.
//
// Ruang gambar (satuan viewBox SVG): x ke kanan, y ke bawah. Dua tabung simetris terhadap leher.
// `u` = jarak dari leher, dinormalkan: 0 di leher, 1 di tutup (atas untuk tabung atas, bawah untuk tabung bawah).
// Karena simetris, pasir tersisa (atas, dari leher ke atas) dan pasir yang jatuh (bawah, dari tutup ke atas)
// selalu berhenti pada `u` yang sama: luas [0, u] di atas = r, luas [u, 1] di bawah = 1 − r.

export interface HourglassGeometry {
  width: number;
  height: number;
  cx: number;
  /** y leher. */
  neck: number;
  /** Tinggi satu tabung (leher → tutup). */
  bulb: number;
  /** Setengah lebar maksimum tabung. */
  half: number;
  /** y tutup atas dan bawah (bagian dalam tabung). */
  top: number;
  bottom: number;
  /** Garis luar kaca (satu path tertutup, dua tabung). */
  glass: string;
  /** Poligon bagian dalam tabung atas / bawah, untuk clipPath pasir. */
  topBulb: string;
  bottomBulb: string;
}

type Point = [x: number, y: number];

const round = (n: number) => Math.round(n * 10) / 10;

/** Setengah lebar kaca pada jarak `u` dari leher: kerucut di leher, bahu membulat di tutup. */
export function halfWidth(u: number, half: number, neckHalf: number): number {
  const s = Math.sin((Math.min(1, Math.max(0, u)) * Math.PI) / 2);
  return neckHalf + (half - neckHalf) * s ** 0.85;
}

const SAMPLES = 64;
const AREA_STEPS = 600;

export interface HourglassOptions {
  width?: number;
  height?: number;
  half?: number;
  neckHalf?: number;
  /** Jarak tutup → tepi viewBox (ruang untuk pelat kayu/logam). */
  cap?: number;
}

export function hourglassGeometry({
  width = 200,
  height = 320,
  half = 60,
  neckHalf = 2.5,
  cap = 20,
}: HourglassOptions = {}): HourglassGeometry {
  const cx = width / 2;
  const neck = height / 2;
  const top = cap;
  const bottom = height - cap;
  const bulb = neck - top;
  const hw = (u: number) => halfWidth(u, half, neckHalf);
  const us = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);

  // Sisi kiri dari tutup atas → leher → tutup bawah, lalu sisi kanan kembali ke atas.
  const mirror = ([x, y]: Point): Point => [2 * cx - x, y];
  const left: Point[] = [
    ...[...us].reverse().map((u): Point => [cx - hw(u), neck - u * bulb]),
    ...us.slice(1).map((u): Point => [cx - hw(u), neck + u * bulb]),
  ];
  const right = left.map(mirror).reverse();
  const toPath = (pts: Point[], close: boolean) =>
    pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`).join(' ') + (close ? ' Z' : '');

  const bulbPolygon = (sign: 1 | -1) => {
    const side = [...us].reverse().map((u): Point => [cx - hw(u), neck - sign * u * bulb]);
    return toPath([...side, ...side.map(mirror).reverse()], true);
  };

  return {
    width,
    height,
    cx,
    neck,
    bulb,
    half,
    top,
    bottom,
    glass: toPath([...left, ...right], true),
    topBulb: bulbPolygon(1),
    bottomBulb: bulbPolygon(-1),
  };
}

/** Tabel luas kumulatif dari leher (u = 0) ke u, dinormalkan ke 1 di tutup. */
function areaTable(half: number, neckHalf: number): number[] {
  const table = [0];
  let sum = 0;
  for (let i = 1; i <= AREA_STEPS; i++) {
    const a = halfWidth((i - 1) / AREA_STEPS, half, neckHalf);
    const b = halfWidth(i / AREA_STEPS, half, neckHalf);
    sum += (a + b) / 2;
    table.push(sum);
  }
  return table.map((v) => v / sum);
}

const tables = new Map<string, number[]>();

/**
 * Jarak `u` dari leher tempat permukaan pasir berhenti bila tabung atas masih berisi `fraction` (0–1)
 * dari volume penuh. Dihitung dari luas (penampang 2D), jadi skala pada instrumen tidak linear:
 * bahu tabung yang lebar menampung lebih banyak pasir daripada leher.
 */
export function levelForFraction(fraction: number, half = 60, neckHalf = 2.5): number {
  const f = Math.min(1, Math.max(0, fraction));
  const key = `${half}:${neckHalf}`;
  const table = tables.get(key) ?? areaTable(half, neckHalf);
  tables.set(key, table);
  let i = 1;
  while (i < table.length - 1 && table[i]! < f) i++;
  const lo = table[i - 1]!;
  const hi = table[i]!;
  const t = hi === lo ? 0 : (f - lo) / (hi - lo);
  return (i - 1 + t) / AREA_STEPS;
}

/** Sisa modal (persen modal awal) setelah `losses` kali salah beruntun dengan risiko tetap `riskPercent`%. */
export function remainingAfterLosses(riskPercent: number, losses: number): number {
  return 100 * (1 - riskPercent / 100) ** Math.max(0, losses);
}

export interface HourglassState {
  riskPercent: number;
  losses: number;
  /** Sisa modal, persen modal awal. */
  remaining: number;
  /** Kenaikan (persen) yang dibutuhkan untuk kembali ke modal awal. */
  recovery: number;
  /** y permukaan pasir atas dan bawah. */
  topLevel: number;
  bottomLevel: number;
  /** y permukaan pasir untuk pembanding (risiko 1%, jumlah salah sama). */
  referenceLevel: number;
  /** Tebal aliran pasir di leher: bukaan = risiko per transaksi. */
  stream: number;
}

export const REFERENCE_RISK = 1;

export function hourglassState(geo: HourglassGeometry, riskPercent: number, losses: number): HourglassState {
  const remaining = remainingAfterLosses(riskPercent, losses);
  const u = levelForFraction(remaining / 100, geo.half);
  const ref = levelForFraction(remainingAfterLosses(REFERENCE_RISK, losses) / 100, geo.half);
  return {
    riskPercent,
    losses,
    remaining,
    recovery: (100 / remaining - 1) * 100,
    topLevel: round(geo.neck - u * geo.bulb),
    bottomLevel: round(geo.neck + u * geo.bulb),
    referenceLevel: round(geo.neck - ref * geo.bulb),
    stream: round(0.6 + riskPercent * 0.3),
  };
}

/** Tick skala di tabung atas: posisi y untuk sisa modal 100, 90, …, 10%. Mayor tiap 25%. */
export function hourglassScale(geo: HourglassGeometry): { percent: number; y: number; major: boolean }[] {
  return [100, 90, 80, 75, 70, 60, 50, 40, 30, 25, 20, 10].map((percent) => ({
    percent,
    y: round(geo.neck - levelForFraction(percent / 100, geo.half) * geo.bulb),
    major: percent % 25 === 0,
  }));
}

const pct = (v: number) => `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(Math.round(v * 10) / 10)}%`;

/** Teks setara untuk instrumen (keterangan dan wilayah aria-live). */
export function describeHourglass({ riskPercent, losses, remaining, recovery }: HourglassState): string {
  if (losses === 0) {
    return `Belum ada keputusan yang salah: modal masih 100%. Risiko per transaksi ${pct(riskPercent)}.`;
  }
  const times = losses === 1 ? 'Setelah 1 kali salah' : `Setelah ${losses} kali salah beruntun`;
  const base = `${times} dengan risiko ${pct(riskPercent)} per transaksi, sisa modal ${pct(remaining)} dari modal awal. Untuk kembali ke modal awal dibutuhkan kenaikan ${pct(recovery)}.`;
  if (riskPercent === REFERENCE_RISK) return base;
  return `${base} Dengan risiko ${pct(REFERENCE_RISK)}, sisa modal ${pct(remainingAfterLosses(REFERENCE_RISK, losses))}.`;
}

export { pct as formatPercent };

/** Kenaikan yang dibutuhkan untuk pulih: "+67%", atau "0%" bila belum ada kerugian. */
export const formatRecovery = (recovery: number): string => (recovery > 0 ? `+${pct(recovery)}` : pct(0));
