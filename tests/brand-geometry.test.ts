import { describe, expect, it } from 'vitest';
import { siteConfig } from '../src/config/site';
import {
  ART_CONTENT_RADIUS,
  EMBLEM_VIEWBOX,
  artBox,
  artFadeRadii,
  emblemGeometry,
  emblemInscription,
  glyphAngles,
  inscriptionArc,
  type EmblemVariant,
} from '../src/lib/emblem';
import { PHI, goldenSpiral, spiralPath } from '../src/lib/golden-spiral';
import { MONOGRAM_VIEWBOX, monogramSvg } from '../src/lib/monogram';

const variants: EmblemVariant[] = ['hero', 'footer', 'og'];
const half = EMBLEM_VIEWBOX / 2;

describe('emblem', () => {
  it('prasasti diambil dari siteConfig', () => {
    expect(emblemInscription.top).toBe(siteConfig.masterBrand.toUpperCase());
    expect(emblemInscription.bottom).toBe(siteConfig.product.toUpperCase());
  });

  it.each(variants)('%s: lapisan bersarang tanpa tumpang tindih (bingkai → cincin → artwork)', (variant) => {
    const g = emblemGeometry(variant);
    expect(g.frame.outer).toBeLessThan(g.frame.inner);
    // Cincin berada di dalam bingkai dalam.
    expect(g.ring.outer).toBeLessThan(half - g.frame.inner);
    expect(g.ring.inner).toBeLessThan(g.ring.outer);
    // Garis dasar teks di dalam pita cincin.
    for (const r of [g.baseline.top, g.baseline.bottom, g.separatorRadius]) {
      expect(r).toBeGreaterThan(g.ring.inner);
      expect(r).toBeLessThan(g.ring.outer);
    }
    // Huruf busur atas tumbuh keluar dari garis dasar, busur bawah ke dalam: keduanya tetap di pita.
    expect(g.baseline.top + g.fontSize * 0.75).toBeLessThanOrEqual(g.ring.outer);
    expect(g.baseline.bottom - g.fontSize * 0.75).toBeGreaterThanOrEqual(g.ring.inner);
  });

  it.each(variants)('%s: artwork utuh di dalam cincin dalam, lalu pudar sebelum pita teks', (variant) => {
    const g = emblemGeometry(variant);
    const box = artBox(g);
    expect(box.x + box.size / 2).toBe(half);
    const fade = artFadeRadii(g);
    // Kepala dan jam pasir tidak ikut memudar; pudar selesai paling jauh 10 satuan melewati cincin dalam.
    expect((box.size / 2) * ART_CONTENT_RADIUS).toBeLessThanOrEqual(fade.start);
    expect(fade.end).toBeLessThanOrEqual(g.ring.inner + 10);
  });

  it('busur prasasti selalu dari kiri ke kanan; atas searah jarum jam, bawah sebaliknya', () => {
    expect(inscriptionArc(400, 'top')).toBe('M 100 500 A 400 400 0 0 1 900 500');
    expect(inscriptionArc(400, 'bottom')).toBe('M 100 500 A 400 400 0 0 0 900 500');
  });

  it('sudut huruf simetris di sekitar jam 12 (atas) dan jam 6 (bawah), terbaca kiri → kanan', () => {
    const [t0, t1, t2] = glyphAngles([30, 30, 30], 400, 10, 'top') as [number, number, number];
    expect(t1).toBeCloseTo(270);
    expect(t0).toBeLessThan(t2);
    expect(t0 + t2).toBeCloseTo(540);
    const [b0, b1, b2] = glyphAngles([30, 30, 30], 400, 10, 'bottom') as [number, number, number];
    expect(b1).toBeCloseTo(90);
    expect(b0).toBeGreaterThan(b2);
  });
});

describe('golden spiral', () => {
  const spiral = goldenSpiral(1000, 8);

  it('persegi panjang awal berasio φ dan setiap persegi mengecil dengan faktor φ', () => {
    expect(spiral.width / spiral.height).toBeCloseTo(PHI);
    for (let i = 1; i < spiral.squares.length; i++) {
      expect(spiral.squares[i - 1]!.size / spiral.squares[i]!.size).toBeCloseTo(PHI, 6);
    }
  });

  it('busur bersambung: akhir satu busur = awal busur berikutnya', () => {
    for (let i = 1; i < spiral.arcs.length; i++) {
      expect(spiral.arcs[i]!.from[0]).toBeCloseTo(spiral.arcs[i - 1]!.to[0], 6);
      expect(spiral.arcs[i]!.from[1]).toBeCloseTo(spiral.arcs[i - 1]!.to[1], 6);
    }
  });

  it('semua persegi di dalam persegi panjang emas', () => {
    for (const s of spiral.squares) {
      expect(s.x).toBeGreaterThanOrEqual(-1e-9);
      expect(s.y).toBeGreaterThanOrEqual(-1e-9);
      expect(s.x + s.size).toBeLessThanOrEqual(spiral.width + 1e-9);
      expect(s.y + s.size).toBeLessThanOrEqual(spiral.height + 1e-9);
    }
  });

  it('path: satu M lalu satu busur per persegi', () => {
    const d = spiralPath(spiral);
    expect(d.match(/M/g)).toHaveLength(1);
    expect(d.match(/A/g)).toHaveLength(8);
  });
});

describe('monogram', () => {
  it('SVG mandiri memakai warna yang diberikan, latar opsional', () => {
    const svg = monogramSvg({ background: '#000', ink: '#fff', sand: '#c90' }, 32);
    expect(svg).toContain(`viewBox="0 0 ${MONOGRAM_VIEWBOX} ${MONOGRAM_VIEWBOX}"`);
    expect(svg).toContain('fill="#000"');
    expect(svg).toContain('fill="#c90"');
    expect(monogramSvg({ ink: '#fff', sand: '#c90' })).not.toContain('<rect');
  });
});
