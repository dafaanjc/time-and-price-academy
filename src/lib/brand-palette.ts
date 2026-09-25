// Salinan token warna dari src/styles/global.css (:root) untuk gambar yang dirender saat build
// (gambar OG, favicon), di mana variabel CSS tidak tersedia. tests/brand-palette.test.ts memastikan
// nilainya tetap sama dengan stylesheet.
export const palette = {
  paper: '#f3eee4',
  paperDeep: '#e7dfd0',
  ink: '#1c1a16',
  inkSoft: '#5b554a',
  ink3: '#645d51',
  rule: '#d6ccba',
  brass: '#9a7640',
  brassInk: '#7a5a2b',
  plate: '#15130f',
  plateInk: '#ece6da',
  plateInk2: '#bdb6a8',
  plateRule: '#3a352d',
  plateRuleStrong: '#716a5e',
  plateMark: '#cfae6b',
} as const;

/** Nama token CSS untuk tiap kunci palet (dipakai tes kesesuaian). */
export const paletteTokens: Record<keyof typeof palette, string> = {
  paper: '--paper',
  paperDeep: '--paper-deep',
  ink: '--ink',
  inkSoft: '--ink-soft',
  ink3: '--ink-3',
  rule: '--rule',
  brass: '--brass',
  brassInk: '--brass-ink',
  plate: '--plate',
  plateInk: '--plate-ink',
  plateInk2: '--plate-ink-2',
  plateRule: '--plate-rule',
  plateRuleStrong: '--plate-rule-strong',
  plateMark: '--plate-mark',
};
