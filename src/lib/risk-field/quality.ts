// Kualitas visual progresif untuk Risk Field (hero beranda). Fungsi murni: diuji di Vitest.
//   high   → WebGL penuh: relief rapat, kamera melayang pelan + paralaks penunjuk & gulir.
//   medium → ponsel/perangkat ringan: geometri lebih jarang, 30 fps, hanya paralaks gulir.
//   low    → tanpa WebGL: figur SVG teknis (FIG. 01) tetap tampil, three.js tidak pernah dimuat.
import type { FieldDetail } from './geometry';

export type Quality = 'high' | 'medium' | 'low';

export interface QualityEnv {
  /** Browser punya API WebGL (kegagalan membuat konteks tetap ditangani saat mount). */
  webgl: boolean;
  reducedMotion: boolean;
  /** navigator.connection.saveData */
  saveData: boolean;
  /** Penunjuk utama kasar (layar sentuh). */
  coarsePointer: boolean;
  /** Lebar viewport dalam px CSS. */
  viewportWidth: number;
  /** navigator.deviceMemory (GB), bila tersedia. */
  deviceMemory?: number;
  /** navigator.hardwareConcurrency, bila tersedia. */
  cores?: number;
}

export function pickQuality(env: QualityEnv): Quality {
  if (!env.webgl || env.reducedMotion || env.saveData) return 'low';
  if ((env.deviceMemory ?? 8) < 2 || (env.cores ?? 8) < 2) return 'low';
  if (env.coarsePointer || env.viewportWidth < 768) return 'medium';
  if ((env.deviceMemory ?? 8) <= 4 || (env.cores ?? 8) <= 4) return 'medium';
  return 'high';
}

export interface QualitySettings {
  detail: FieldDetail;
  /** Batas devicePixelRatio untuk kanvas. */
  maxPixelRatio: number;
  /** Batas frame per detik. */
  fps: number;
  /** Kamera ikut gerak penunjuk (mouse). */
  pointerParallax: boolean;
  /** Pengali amplitudo drift kamera. */
  drift: number;
  antialias: boolean;
}

export const qualitySettings: Record<Exclude<Quality, 'low'>, QualitySettings> = {
  high: {
    detail: { timeSlices: 26, priceLines: 19, samples: 72, branchDepth: 3 },
    maxPixelRatio: 2,
    fps: 60,
    pointerParallax: true,
    drift: 1,
    antialias: true,
  },
  medium: {
    detail: { timeSlices: 14, priceLines: 11, samples: 40, branchDepth: 2 },
    maxPixelRatio: 1.5,
    fps: 30,
    pointerParallax: false,
    drift: 0.5,
    antialias: true,
  },
};
