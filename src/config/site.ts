// Identitas merek dan penulis. SATU-SATUNYA tempat nama merek, produk, dan penulis ditulis.
// Komponen dan halaman wajib mengambil nilai dari sini; `npm run validate` menolak nama yang
// ditulis langsung di src/ (lihat scripts/check-branding.mjs).
//
// Nama `siteConfig` sengaja dibedakan dari `Astro.site`, yaitu URL situs dari env SITE_URL.

const masterBrand = 'Time & Price Academy';
const product = 'Risk Lab';
const author = 'Muhamad Daffa';
const taglineParts = ['Pahami Risiko.', 'Pahami Keputusan.'] as const;

export const siteConfig = {
  /** Merek induk. */
  masterBrand,
  /** Produk / section di bawah merek induk. */
  product,
  /** Penulis / kreator seluruh konten. */
  author,
  /** "Risk Lab — Time & Price Academy": untuk <title> dan og:site_name. */
  name: `${product} — ${masterBrand}`,
  /** Atribusi wajib di setiap halaman konsep dan footer. */
  attribution: `By ${author} - ${masterBrand}`,
  lang: 'id',
  locale: 'id_ID',
  /** Dua bagian tagline; hero menampilkannya dalam dua baris. */
  taglineParts,
  tagline: taglineParts.join(' '),
  description: `${product} dari ${masterBrand}: perpustakaan riset dan sistem belajar interaktif tentang risiko, probabilitas, dan pengambilan keputusan.`,
} as const;
