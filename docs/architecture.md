# Arsitektur — Risk Lab (Time & Price Academy)

Risk Lab adalah perpustakaan riset dan sistem belajar interaktif tentang risiko dan pengambilan
keputusan. Merek induk: **Time & Price Academy**. Penulis: **Muhamad Daffa**.
Bahasa utama platform: **Bahasa Indonesia**.

## Framework

| Bagian | Pilihan | Versi terpasang |
|---|---|---|
| Framework | Astro (output statis) | 7.3.x |
| Konten | `@astrojs/mdx` | 8.0.x |
| Bahasa | TypeScript, `astro/tsconfigs/strict` + `noUncheckedIndexedAccess` | 6.0.x |
| Validasi skema | Zod dari `astro/zod` | 4.x |
| Runtime | Node.js | ≥ 22.12 (dikembangkan di 24.x) |

Catatan khusus Astro 7 yang memengaruhi kode ini:

- **Compiler Rust yang ketat.** Tag yang tidak ditutup dan HTML yang tidak valid menjadi error build.
- **Markdown diproses oleh Sätteri** secara default, bukan remark/rehype. Proyek ini sengaja tidak
  memakai plugin remark/rehype. Waktu baca dihitung dari `entry.body` di `src/lib/reading-time.ts`.
- **`compressHTML: 'jsx'`** adalah default. Spasi antar elemen mengikuti aturan JSX.
- **`src/fetch.ts` adalah nama file yang dicadangkan** Astro. Jangan dipakai.

## Struktur folder

```
astro.config.mjs        Konfigurasi Astro (site dari env SITE_URL, integrasi MDX)
src/
  config/site.ts        `siteConfig`: merek, penulis, bahasa, atribusi (satu sumber kebenaran)
  content.config.ts     Definisi koleksi `concepts` + skema Zod
  content/concepts/     Satu file .mdx per konsep; nama file = slug
  data/                 Data terstruktur non-MDX
    categories.ts       5 kategori (urutan = urutan tampil)
    learning-paths.ts   Jalur belajar (daftar slug, divalidasi)
    source-types.ts     6 jenis sumber + label Indonesia
  lib/
    concepts.ts         Akses data: getConcepts(), pengelompokan, jalur, URL helper
    validate.ts         Validasi lintas-entri (fungsi murni)
    reading-time.ts     Estimasi waktu baca
    sections.ts         ID bagian layout + ekstraksi/slug heading
    sources.ts          Tipe Source, tautan (URL/DOI), pengurutan
    url.ts              `routes`, `withBase()`, URL absolut, path gambar OG
    og-image.ts         Template gambar OpenGraph 1200×630 (sharp + font di src/assets/fonts)
    search-index.ts     Indeks pencarian (dibuat saat build)
    search.ts           Pencocokan dan skor pencarian (fungsi murni)
    graph.ts            Tingkat dan tata letak graf prasyarat (fungsi murni)
  layouts/BaseLayout.astro   Kerangka halaman: head/SEO, header, sidebar, footer
  components/           Komponen UI kecil dengan satu tanggung jawab
  pages/                Rute
  styles/global.css     Token desain + gaya dasar
docs/                   Dokumentasi proyek
```

## Merek dan penulis (`siteConfig`)

Semua identitas ada di `src/config/site.ts` dan diekspor sebagai `siteConfig`:

| Field | Nilai | Dipakai oleh |
|---|---|---|
| `masterBrand` | Time & Price Academy | `SiteHeader`, `SiteFooter`, eyebrow hero |
| `product` | Risk Lab | `SiteHeader`, `SiteFooter`, hero, deskripsi halaman |
| `author` | Muhamad Daffa | `<meta name="author">`, `article:author` |
| `name` | Risk Lab — Time & Price Academy | `<title>`, `og:site_name`, `og:title` default |
| `attribution` | By Muhamad Daffa - Time & Price Academy | `Byline` (setiap konsep), `SiteFooter` (setiap halaman) |
| `lang` / `locale` | `id` / `id_ID` | `<html lang>`, `og:locale` |
| `taglineParts` / `tagline` | Pahami Risiko. Pahami Keputusan. | hero, `<title>` beranda |
| `description` | (diturunkan dari `product` dan `masterBrand`) | meta description default |

Namanya sengaja `siteConfig`, bukan `site`, agar tidak tertukar dengan `Astro.site` (URL dari `SITE_URL`).

`scripts/check-branding.mjs` (bagian dari `npm run validate`) memastikan aturan ini tetap berlaku:
1. **Sumber:** tidak ada nama merek, produk, penulis, atau tagline yang ditulis langsung di
   `src/components`, `layouts`, `pages`, `lib`, `data`, dan `styles`. Konten MDX dikecualikan karena prosa
   boleh menyebut nama produk.
2. **Hasil build:** setiap halaman memiliki `lang`, `meta author`, `og:site_name`, dan atribusi footer
   yang sesuai `siteConfig`. Halaman konsep juga wajib memiliki atribusi di byline dan `article:author`.
3. **package.json:** `author` sama dengan `siteConfig.author`.

Nilai diambil langsung dari `src/config/site.ts` (Node menjalankan TypeScript secara native), sehingga
tidak ada salinan kedua yang bisa berbeda.

## Sistem konten

1. `src/content.config.ts` mendefinisikan koleksi `concepts` dengan loader `glob()` dan skema Zod.
   Field `slug` di frontmatter menjadi `entry.id`.
2. Skema memvalidasi setiap file secara terpisah: tipe field, enum kategori, tingkat kesulitan,
   status, jenis sumber, dan format slug.
3. `src/lib/validate.ts` memvalidasi hal yang melibatkan beberapa file sekaligus:
   - nama file sama dengan slug (menjamin slug unik),
   - `prerequisites` dan `related` merujuk konsep yang ada dan tidak merujuk dirinya sendiri,
   - tidak ada siklus prasyarat,
   - sumber tidak berupa placeholder dan dapat ditelusuri (url / doi / isbn / publisher),
   - heading di body tidak bentrok dengan ID bagian otomatis (Konsep Terkait / Prasyarat / Sumber),
   - setiap langkah jalur belajar adalah konsep yang ada dan muncul setelah semua prasyaratnya.
4. Semua halaman mengambil konsep melalui `getConcepts()` di `src/lib/concepts.ts`, yang menjalankan
   validasi sekali (di-cache). **Jika validasi gagal, build gagal** dengan daftar pesan error.

Prasyarat disimpan sebagai slug string, bukan `reference()`. Tujuannya agar data tetap sederhana
untuk komponen dan graf, sementara keberadaan rujukan tetap dicek oleh `validate.ts`.

Detail skema dan cara menambah konsep ada di [`content-model.md`](./content-model.md).

## Arsitektur komponen

| Komponen | Tanggung jawab |
|---|---|
| `BaseLayout` | Struktur halaman, `lang="id"`, skip link, grid sidebar + konten |
| `SeoHead` | `<title>`, description, canonical, OpenGraph, Twitter card |
| `SiteHeader` | Merek (Risk Lab + Time & Price Academy) dan tombol menu mobile |
| `SiteNav` | Isi navigasi, dipakai bersama oleh sidebar dan menu mobile |
| `Sidebar` | Navigasi desktop (≥ 64rem), sticky |
| `MobileNav` | Navigasi mobile dengan `<dialog>` native (fokus terkunci, Esc/backdrop menutup) |
| `SiteFooter` | Atribusi "By Muhamad Daffa - Time & Price Academy" dan disclaimer |
| `CategoryGrid` | Kartu kategori beserta jumlah konsep |
| `ConceptCard` | Ringkasan konsep: kategori, judul, istilah asli, deskripsi, lencana |
| `LearningPath` | Langkah bernomor, masing-masing menaut ke halaman konsep |
| `ConceptLayout` | Urutan halaman konsep: header → notis draf → daftar isi → isi MDX → terkait → prasyarat → sumber → navigasi jalur |
| `ConceptHeader` | Kategori, judul, istilah asli, deskripsi, meta, dan byline |
| `ConceptMeta` | Kategori, tingkat, waktu baca, dan status (`<dl>`) |
| `Byline` | Atribusi "By Muhamad Daffa - Time & Price Academy" + `CopyLinkButton` |
| `CopyLinkButton` | Menyalin URL canonical (atau `location.href`) dan mengumumkan hasilnya lewat `role="status"` |
| `PlaceholderNotice` | Notis untuk konsep berstatus `draft` |
| `TableOfContents` | "Di halaman ini", dari heading `##` MDX atau override `sections` |
| `ConceptLinkList` | Daftar tautan konsep (dipakai untuk Konsep Terkait dan Prasyarat) |
| `SourceList` | Bagian "Sumber": urutan per jenis dan keadaan kosong |
| `SourceCard` | Satu sumber: label jenis, judul (tautan URL/DOI, tab baru), penulis · tahun, publisher/DOI/ISBN, catatan |
| `KnowledgeGraph` | Graf prasyarat sebagai SVG; setiap simpul tautan ke konsep |
| `PathNav` | "Sebelumnya / Berikutnya" dan posisi langkah, berdasarkan jalur belajar pertama yang memuat konsep |

ID bagian yang dirender layout (`konsep-terkait`, `prasyarat`, `sumber`) didefinisikan sekali di
`src/lib/sections.ts` dan dipakai oleh layout maupun validasi.

### Rute

| Rute | Sumber |
|---|---|
| `/` | `pages/index.astro` |
| `/konsep/<slug>/` | `pages/konsep/[slug].astro`, satu halaman per konsep |
| `/kategori/<id>/` | `pages/kategori/[category].astro`, satu halaman per kategori (termasuk yang masih kosong) |
| `/jalur-belajar/` | `pages/jalur-belajar/index.astro`, semua jalur dari `src/data/learning-paths.ts` |
| `/peta/` | `pages/peta/index.astro`, graf prasyarat + tabel alternatif |
| `/cari/` | `pages/cari/index.astro`, pencarian sisi klien, mendukung `?q=` |
| `/search-index.json` | `pages/search-index.json.ts`, endpoint statis yang dibuat saat build |
| `/404` | `pages/404.astro` |

Prinsip:
- Komponen menerima data yang sudah jadi. Pengambilan data ada di `lib/`.
- Hindari kondisional bersarang. Pakai helper kecil atau pecah menjadi komponen.
- JavaScript klien hanya ada tiga skrip kecil: menu mobile, salin tautan, dan pencarian.
- Lebar baca teks panjang dibatasi `--measure: 68ch` (kelas `.prose`).
- Tema terang/gelap mengikuti `prefers-color-scheme` melalui token CSS di `:root`.

## Pencarian

- Saat build, `src/lib/search-index.ts` membuat indeks dari koleksi `concepts`: judul, istilah asli,
  kategori, tingkat, deskripsi, dan isi sebagai teks polos. Indeks disajikan di `/search-index.json`.
- Halaman `/cari/` memuat indeks sekali, lalu mencari dengan `src/lib/search.ts` (fungsi murni):
  - normalisasi huruf kecil dan penghapusan diakritik;
  - setiap kata kueri harus cocok (logika AND);
  - bobot per field: judul 10, istilah asli 8, deskripsi 4, kategori 2, isi 1;
  - bonus +50 bila judul sama persis dengan kueri, +20 bila judul diawali kueri.
- Hasil dirender dari `<template>` dengan `textContent`, tanpa `innerHTML`. Kueri disimpan di URL
  (`?q=`) agar hasil bisa dibagikan.
- Tanpa dependensi. Bila koleksi tumbuh hingga ratusan konsep, pertimbangkan Pagefind.

## Arsitektur graf

Peta pengetahuan (`/peta/` dan pratinjau di beranda) adalah graf prasyarat yang dirender sebagai
SVG statis saat build, tanpa library dan tanpa JavaScript klien.

1. **Data.** `getKnowledgeGraph()` di `src/lib/concepts.ts` mengambil semua konsep (urutan kategori,
   lalu `order`) dan meneruskan `{ id, title, href, prerequisites }` ke `layoutGraph()`.
2. **Tingkat.** `computeLayers()` di `src/lib/graph.ts` menghitung tingkat tiap konsep:
   tanpa prasyarat = 0, selain itu 1 + tingkat prasyarat terdalam. `validate.ts` sudah menjamin graf
   bebas siklus, tetapi `computeLayers()` tetap melempar error bila menemukan siklus.
3. **Tata letak.** Vertikal: satu baris per tingkat, simpul dalam satu baris dipusatkan. Arah ini
   dipilih agar graf terbaca di mobile tanpa diperkecil.
4. **Garis.** Hanya relasi prasyarat (konsep terkait tampil di halaman konsep):
   - antar tingkat berurutan: kurva S dari bawah prasyarat ke atas konsep;
   - melompati tingkat: kurva yang dibelokkan ke kanan, agar tidak menembus simpul di antaranya.
5. **Judul.** Maksimal dua baris × 22 karakter. Sisanya dipotong dengan elipsis.
6. **Aksesibilitas.** SVG punya `<title>` dan `<desc>`. Setiap simpul adalah `<a>` dengan
   `aria-label` judul lengkap, bisa difokuskan dengan Tab dan punya cincin fokus. Halaman `/peta/`
   menyertakan tabel prasyarat sebagai alternatif teks.

Komponen: `KnowledgeGraph.astro` (prop `idPrefix` agar ID `<title>` dan marker unik bila dipakai lebih
dari sekali). Bila satu tingkat berisi banyak simpul, SVG diperkecil lewat `max-width: 100%`.

## Catatan Astro 7: spasi di template

Dengan `compressHTML: 'jsx'`, baris baru di antara teks dan elemen inline dibuang, sehingga
`dari⏎<strong>x</strong>` dirender sebagai `dari<strong>x</strong>` tanpa spasi. Tulis teks dan elemen
inline pada baris yang sama, atau pecah baris di antara dua kata biasa.

## Deployment

**Host: GitHub Pages** → https://dafaanjc.github.io/time-and-price-academy/

- `astro.config.mjs`: `site = https://dafaanjc.github.io`, `base = /time-and-price-academy`.
  Keduanya bisa ditimpa lewat env `SITE_URL` dan `BASE_PATH`.
- `.github/workflows/deploy.yml` (panduan resmi Astro: `withastro/action@v6` + `actions/deploy-pages@v5`)
  berjalan pada setiap push ke `main`. Build memakai `build-cmd: npm run validate`, jadi situs hanya
  ter-deploy bila seluruh validasi lolos.
- **Syarat sekali saja di GitHub:** Settings → Pages → Build and deployment → Source: **GitHub Actions**.
- **Domain khusus (nanti):** tambahkan `public/CNAME`, lalu build dengan `SITE_URL=https://domain` dan
  `BASE_PATH=/` (atau ubah default di `astro.config.mjs`).

### Sub-path (`base`)

Karena situs berada di sub-path, **semua tautan internal wajib lewat `src/lib/url.ts`**:

- `withBase(path)` menambahkan base, dan `routes` berisi path halaman tetap (`/cari/`, `/peta/`, dst.).
- `conceptHref()` dan `categoryHref()` sudah memakai `withBase`.
- Skrip klien memakai `import.meta.env.BASE_URL` melalui `withBase` yang sama.
- Tautan di isi MDX ditulis **relatif** (`../slug/`), dan `validate.ts` menolak tautan yang diawali `/`.

### Pratinjau tautan (OpenGraph)

- `/og/default.png` (beranda dan halaman umum) dan `/og/konsep/<slug>.png` (satu per konsep) dirender
  saat build oleh `src/lib/og-image.ts`: 1200×630 PNG, font Source Serif 4 / Source Sans 3 dari
  `src/assets/fonts` (OFL), warna dari token tema terang.
- Isi: logo + "RISK LAB · TIME & PRICE ACADEMY", kategori, judul, istilah asli, deskripsi,
  atribusi `siteConfig.attribution`, dan alamat situs. Judul diperkecil dan deskripsi dipangkas otomatis
  agar tidak meluber.
- `SeoHead` menulis `og:image` (+ type/width/height/alt) dan `twitter:card=summary_large_image`.
- Halaman 404 memakai `noindex`: tanpa canonical dan tanpa `og:url`.

### Pemeriksaan (`npm run validate`)

1. `astro check`: tipe dan template.
2. `astro build`: termasuk skema konten dan `validate.ts`.
3. `scripts/check-branding.mjs`: merek dan penulis dari `siteConfig`.
4. `scripts/check-site.mjs`: semua tautan internal memakai base dan menunjuk ke file yang ada; anchor
   valid; canonical/`og:url` absolut dan benar; `og:image` menunjuk ke PNG 1200×630 yang ada.
