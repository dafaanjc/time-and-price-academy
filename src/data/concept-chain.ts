// Rantai konsep inti yang dipamerkan di beranda (bagian transisi akademi → lab):
// Risiko → Ketidakpastian → Probabilitas → Distribusi → Nilai Harapan.
// `label` adalah nama pendek untuk rantai; judul lengkap tetap dari frontmatter konsep.
// Slug divalidasi saat build (RiskLabTransition gagal bila konsep tidak ditemukan).

export interface ChainStep {
  id: string;
  label: string;
}

export const conceptChain: ChainStep[] = [
  { id: 'risk', label: 'Risiko' },
  { id: 'risk-vs-uncertainty', label: 'Ketidakpastian' },
  { id: 'probability', label: 'Probabilitas' },
  { id: 'probability-distribution', label: 'Distribusi' },
  { id: 'expected-value', label: 'Nilai Harapan' },
];
