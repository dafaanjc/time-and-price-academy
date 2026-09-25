// Distribusi hasil setelah beberapa periode: model normal vs model "ekor tebal" (Student-t, 3 derajat
// kebebasan, diskalakan ke simpangan baku yang sama). Fungsi murni, dipakai alat PenjelajahDistribusi.
// Lihat konsep "Distribusi Probabilitas" dan "Varians & Volatilitas".

export type DistributionModel = 'normal' | 'fat';

export interface HorizonInput {
  /** Rata-rata return per periode (persen). */
  meanPerPeriod: number;
  /** Volatilitas (simpangan baku) return per periode (persen). */
  sdPerPeriod: number;
  /** Jumlah periode. */
  periods: number;
}

/**
 * Return kumulatif setelah `periods` periode (penjumlahan sederhana, periode saling independen):
 * rata-rata tumbuh ∝ t, simpangan baku ∝ √t.
 */
export function horizon({ meanPerPeriod, sdPerPeriod, periods }: HorizonInput): { mean: number; sd: number } {
  return { mean: meanPerPeriod * periods, sd: sdPerPeriod * Math.sqrt(periods) };
}

/** Fungsi galat, pendekatan Abramowitz & Stegun 7.1.26 (galat mutlak < 1,5e-7). */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1 - poly * Math.exp(-a * a));
}

const T_DF = 3;
/** Skala Student-t (ν = 3) agar simpangan bakunya = 1: s = √((ν − 2) / ν). */
const T_SCALE = Math.sqrt((T_DF - 2) / T_DF);

/** Kepadatan peluang di `x` untuk rata-rata `mean` dan simpangan baku `sd`. */
export function density(x: number, mean: number, sd: number, model: DistributionModel = 'normal'): number {
  if (sd <= 0) return 0;
  const z = (x - mean) / sd;
  if (model === 'normal') return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
  const t = z / T_SCALE;
  // Kepadatan t dengan ν = 3: 2 / (π√3 · (1 + t²/3)²)
  return 2 / (Math.PI * Math.sqrt(3) * (1 + (t * t) / 3) ** 2) / (sd * T_SCALE);
}

/** Peluang hasil ≤ `x`. */
export function cumulative(x: number, mean: number, sd: number, model: DistributionModel = 'normal'): number {
  if (sd <= 0) return x >= mean ? 1 : 0;
  const z = (x - mean) / sd;
  if (model === 'normal') return 0.5 * (1 + erf(z / Math.SQRT2));
  // CDF t dengan ν = 3 (bentuk tertutup).
  const t = z / T_SCALE;
  return 0.5 + (t / (Math.sqrt(3) * (1 + (t * t) / 3)) + Math.atan(t / Math.sqrt(3))) / Math.PI;
}

const DOMAIN_STEPS = [5, 10, 20, 40, 80, 160];

/** Setengah lebar sumbu x (simetris di 0), dipilih dari langkah tetap agar skala tidak "bergoyang". */
export function distributionDomain(mean: number, sd: number, threshold: number): number {
  const need = Math.max(Math.abs(mean) + 3.5 * sd, Math.abs(threshold) * 1.1);
  return DOMAIN_STEPS.find((s) => s >= need) ?? DOMAIN_STEPS[DOMAIN_STEPS.length - 1]!;
}

export interface DistributionChart {
  width: number;
  height: number;
  /** Setengah lebar domain x (persen); sumbu dari −domain sampai +domain. */
  domain: number;
  /** Atribut `d` kurva normal dan kurva ekor tebal. */
  normal: string;
  fat: string;
  /** Area di bawah kurva normal, dari tepi kiri sampai ambang. */
  tail: string;
  /** Posisi x (0–100, persen lebar) untuk label HTML. */
  at: { mean: number; threshold: number; minus1: number; plus1: number; minus2: number; plus2: number };
  /** Posisi x (satuan viewBox) untuk garis. */
  x: { mean: number; threshold: number; minus1: number; plus1: number; minus2: number; plus2: number };
}

/**
 * Koordinat SVG kurva kepadatan. Tinggi diskalakan agar puncak tertinggi (normal atau ekor tebal) mengisi
 * ~85% tinggi; lebar mengikuti domain tetap, sehingga perubahan σ terlihat sebagai perubahan lebar.
 */
export function distributionChart(
  mean: number,
  sd: number,
  threshold: number,
  width = 640,
  height = 240,
  samples = 160,
): DistributionChart {
  const domain = distributionDomain(mean, sd, threshold);
  const peak = Math.max(density(mean, mean, sd, 'normal'), density(mean, mean, sd, 'fat')) || 1;
  const fmt = (n: number) => Math.round(n * 10) / 10;
  const x = (v: number) => ((v + domain) / (2 * domain)) * width;
  const y = (d: number) => height - (d / peak) * height * 0.85;
  const clampX = (v: number) => Math.max(0, Math.min(width, x(v)));

  const path = (model: DistributionModel) => {
    const pts: string[] = [];
    for (let i = 0; i <= samples; i++) {
      const v = -domain + (2 * domain * i) / samples;
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(x(v))},${fmt(y(density(v, mean, sd, model)))}`);
    }
    return pts.join(' ');
  };

  const tailPts: string[] = [`M0,${height}`];
  const tEnd = Math.max(-domain, Math.min(domain, threshold));
  const steps = Math.max(2, Math.round(((tEnd + domain) / (2 * domain)) * samples));
  for (let i = 0; i <= steps; i++) {
    const v = -domain + ((tEnd + domain) * i) / steps;
    tailPts.push(`L${fmt(x(v))},${fmt(y(density(v, mean, sd, 'normal')))}`);
  }
  tailPts.push(`L${fmt(x(tEnd))},${height} Z`);

  const xs = {
    mean: clampX(mean),
    threshold: clampX(threshold),
    minus1: clampX(mean - sd),
    plus1: clampX(mean + sd),
    minus2: clampX(mean - 2 * sd),
    plus2: clampX(mean + 2 * sd),
  };
  const pct = (v: number) => Math.round((v / width) * 1000) / 10;
  return {
    width,
    height,
    domain,
    normal: path('normal'),
    fat: path('fat'),
    tail: tailPts.join(' '),
    x: Object.fromEntries(Object.entries(xs).map(([k, v]) => [k, fmt(v)])) as DistributionChart['x'],
    at: Object.fromEntries(Object.entries(xs).map(([k, v]) => [k, pct(v)])) as DistributionChart['at'],
  };
}

/** Penjangkaran label HTML di dekat tepi plot agar tidak keluar bidang (posisi 0–100). */
export function labelEdge(at: number): 'start' | 'end' | 'middle' {
  return at < 6 ? 'start' : at > 94 ? 'end' : 'middle';
}

/** Tata letak label: label σ disembunyikan bila terlalu rapat; label ambang turun satu baris bila dekat E. */
export function distributionLabels(at: DistributionChart['at']): { showSigma: boolean; thresholdRow: 1 | 2 } {
  return {
    showSigma: at.plus1 - at.mean >= 7,
    thresholdRow: Math.abs(at.threshold - at.mean) < 12 ? 2 : 1,
  };
}

/** Label tick sumbu x: −D, −D/2, 0, +D/2, +D (persen). */
export function distributionTicks(domain: number): string[] {
  return [-1, -0.5, 0, 0.5, 1].map((k) => {
    const v = k * domain;
    return v === 0 ? '0%' : `${v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString('id-ID')}%`;
  });
}
