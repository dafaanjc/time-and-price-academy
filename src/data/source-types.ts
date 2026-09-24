export const sourceTypeIds = [
  'primary-research',
  'academic-review',
  'book',
  'standard',
  'institutional',
  'educational',
] as const;

export type SourceTypeId = (typeof sourceTypeIds)[number];

export const sourceTypeLabels: Record<SourceTypeId, string> = {
  'primary-research': 'Riset Primer',
  'academic-review': 'Tinjauan Akademik',
  book: 'Buku',
  standard: 'Standar',
  institutional: 'Institusional',
  educational: 'Edukasi',
};
