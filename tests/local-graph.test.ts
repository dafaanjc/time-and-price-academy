import { describe, expect, it } from 'vitest';
import { layoutLocalGraph } from '../src/lib/local-graph';

const c = (id: string) => ({ id, title: id, href: `/${id}` });

describe('layoutLocalGraph', () => {
  it('mengurutkan prasyarat → konsep ini → lanjutan → terkait dari atas ke bawah', () => {
    const g = layoutLocalGraph({
      current: c('cur'),
      prerequisites: [c('pre')],
      next: [c('nxt')],
      related: [c('rel')],
    });
    expect(g.nodes.map((n) => n.role)).toEqual(['prerequisite', 'current', 'next', 'related']);
    const ys = g.nodes.map((n) => n.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(g.height).toBeGreaterThan(ys.at(-1)!);
  });

  it('membuang duplikat: prasyarat mengalahkan lanjutan, lanjutan mengalahkan terkait, konsep ini tak muncul dua kali', () => {
    const g = layoutLocalGraph({
      current: c('cur'),
      prerequisites: [c('a'), c('cur')],
      next: [c('a'), c('b')],
      related: [c('b'), c('cur'), c('d')],
    });
    expect(g.nodes.map((n) => `${n.role}:${n.id}`)).toEqual(['prerequisite:a', 'current:cur', 'next:b', 'related:d']);
  });

  it('konsep tanpa hubungan hanya menggambar satu simpul tanpa sumbu maupun keterangan', () => {
    const g = layoutLocalGraph({ current: c('solo'), prerequisites: [], next: [], related: [] });
    expect(g.nodes).toHaveLength(1);
    expect(g.trunks).toEqual([]);
    expect(g.captions).toEqual([]);
  });

  it('sumbu solid dan putus-putus terpisah', () => {
    const g = layoutLocalGraph({ current: c('cur'), prerequisites: [c('p')], next: [], related: [c('r1'), c('r2')] });
    expect(g.trunks.map((t) => t.dashed)).toEqual([false, true]);
  });
});
