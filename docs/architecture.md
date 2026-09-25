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
    categories.ts       5 kategori (urutan = urutan tampil = nomor "01 / 05"; `motif` SVG; `topics` = sub-kategori opsional)
    learning-paths.ts   Jalur belajar bertahap (daftar slug + `requires` antar-jalur, divalidasi; `pathTiers()`)
    source-types.ts     6 jenis sumber + label Indonesia
    concept-chain.ts    Rantai konsep inti beranda (Risiko → … → Nilai Harapan)
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
    nav.ts              Navigasi utama (data) + status aktif per bagian
    graph.ts            Tingkat dan tata letak graf prasyarat (fungsi murni)
    iso.ts              Proyeksi isometrik & geometri figur Waktu × Harga (fungsi murni)
    calc/                  Rumus alat hitung (fungsi murni, diuji Vitest):
      position-size.ts     ukuran posisi & risiko dari lot tertentu
      margin.ts            margin terpakai/level, jarak ke margin call & stop out
      drawdown.ts          kalah beruntun (tetap vs digandakan) & pemulihan
      expected-value.ts    nilai harapan (R), titik impas, simulasi ber-seed
      distribution.ts      distribusi hasil per horizon (σ ∝ √t): normal vs ekor tebal (t, ν = 3), koordinat kurva
      equity.ts            kurva ekuitas berlipat, drawdown maksimum, persentil, histogram drawdown
      describe.ts          kalimat ringkasan hasil (dipakai server & browser)
    chart.ts            Koordinat SVG grafik simulasi
    format.ts           Format angka Indonesia (Rp1.000.000; 0,5)
  layouts/BaseLayout.astro   Kerangka halaman: head/SEO, header, sidebar, footer
  components/           Komponen UI kecil dengan satu tanggung jawab
  pages/                Rute
  styles/global.css     Token desain + gaya dasar (lihat CLAUDE.md → Visual Design System)
docs/                   Dokumentasi proyek
```

## Merek dan penulis (`siteConfig`)

Semua identitas ada di `src/config/site.ts` dan diekspor sebagai `siteConfig`:

| Field | Nilai | Dipakai oleh |
|---|---|---|
| `masterBrand` | Time & Price Academy | `SiteHeader` (wordmark), `SiteFooter`, label hero, keterangan emblem, `HomePhilosophy`, alt emblem |
| `product` | Risk Lab | `SiteHeader`, `SiteFooter`, hero, deskripsi halaman |
| `author` | Muhamad Daffa | `<meta name="author">`, `article:author` |
| `name` | Risk Lab — Time & Price Academy | `<title>`, `og:site_name`, `og:title` default |
| `attribution` | By Muhamad Daffa - Time & Price Academy | `Byline` (setiap konsep), `SiteFooter` (setiap halaman) |
| `lang` / `locale` | `id` / `id_ID` | `<html lang>`, `og:locale` |
| `taglineParts` / `tagline` | Pahami Risiko. Pahami Keputusan. | `<title>` beranda, gambar OG |
| `heroLine` | Trading bukan cuma soal entry. | judul hero beranda (`HomeHero`) |
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

### Aset merek (emblem)

Aset resmi ada di `src/assets/Logo/` dan **tidak diubah**:

| File | Isi | Latar |
|---|---|---|
| `black logo.png` | 1024×1024, figur klasik + jam pasir, gaya etsa | Hitam murni (0–1) |
| `logos.jpeg` | 433×453, versi terang (resolusi rendah) | Abu-abu ±221–231 |

Aturan pakai:

- **Header:** tidak memakai emblem, karena detailnya hilang di 24–32px. Header memakai wordmark
  tipografis dari `siteConfig`. Ini penulisan nama, bukan logo baru.
- **Emblem maksimal satu kali per halaman:** di beranda sebagai Objek 00 di panggung hero
  (`figures/HeroStage`, varian `plate`, skala monumental ±86% lebar panggung; potongan bingkai hanya pada
  jubah bawah & bahu kiri, kepala dan jam pasir selalu utuh), atau di
  footer halaman lain (96px, `alt=""` karena atribusi sudah tertulis di sebelahnya).
- **Latar dilebur tanpa kotak** (`BrandEmblem.astro`):
  - varian `plate` (kedua tema): selalu `black logo.png` (satu-satunya sumber yang tajam di ukuran besar)
    di atas `--plate` + `mix-blend-mode: screen`. Pelat selalu gelap, jadi aset tidak diwarnai ulang;
  - varian `footer`, `<picture>` per tema:
    - tema gelap: `black logo.png` + `mix-blend-mode: screen`. Hitam murni menjadi transparan tanpa filter;
    - tema terang: `logos.jpeg` + `filter: brightness(1.16)` + `mix-blend-mode: multiply`. Kecerahan
    menaikkan latar terendah (221) menjadi putih, lalu `multiply` membuat putih transparan di atas kertas.
    Garis etsa hampir tidak berubah; hanya sorotan paling terang yang terpotong ke putih.
- **Gambar OG:** versi terang dengan teknik yang sama (sharp `linear(1.16)` + composite `multiply`) di
  sisi kanan. Faktor 1,16 didefinisikan sekali di `src/lib/brand-assets.ts`.
- **Favicon (sementara):** `favicon-32.png` dan `apple-touch-icon.png` (180px) dibuat saat build dari
  `black logo.png`, hanya diperkecil. Di 32px emblem tidak terbaca; ganti bila ada ikon kecil resmi.
- **Dilarang:** memotong jam pasir menjadi ikon, mewarnai ulang, masker bentuk, watermark, latar
  bagian, atau memakai emblem sebagai dekorasi berulang.
- `scripts/check-branding.mjs` memeriksa: wordmark ada di header, header tanpa gambar, emblem ≤ 1 per
  halaman, beranda punya emblem di pelat hero (`emblem--plate`), dan `favicon.svg` (ikon buatan lama) tidak kembali.

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
   - `topic` konsep (bila ada) adalah salah satu `topics` milik kategorinya,
   - setiap langkah jalur belajar adalah konsep yang ada dan muncul setelah semua prasyaratnya; prasyarat
     boleh dipenuhi oleh jalur yang dibutuhkan (`requires`, berantai). `requires` harus merujuk jalur yang
     ada dan muncul lebih awal di array (sehingga tidak bisa bersiklus); id jalur unik.
4. Semua halaman mengambil konsep melalui `getConcepts()` di `src/lib/concepts.ts`, yang menjalankan
   validasi sekali (di-cache). **Jika validasi gagal, build gagal** dengan daftar pesan error.

Prasyarat disimpan sebagai slug string, bukan `reference()`. Tujuannya agar data tetap sederhana
untuk komponen dan graf, sementara keberadaan rujukan tetap dicek oleh `validate.ts`.

Detail skema dan cara menambah konsep ada di [`content-model.md`](./content-model.md).

## Arsitektur komponen

| Komponen | Tanggung jawab |
|---|---|
| `BaseLayout` | Struktur halaman, `lang="id"`, skip link. Prop `sidebar`: indeks konsep di kiri (hanya halaman konsep/kategori); tanpa itu kontainer di tengah (`--container`) |
| `SeoHead` | `<title>`, description, canonical, OpenGraph, Twitter card |
| `SiteHeader` | Wordmark tipografis "TIME & PRICE ACADEMY │ Risk Lab" (dua baris di layar < 30rem) dan tombol menu mobile |
| `BrandEmblem` | Artwork emblem resmi (varian `plate` / `footer`), dilebur ke latar dengan blend mode |
| `PrimaryNav` | Navigasi utama dari `src/lib/nav.ts` (Konsep / Jalur Belajar / Peta): baris di header desktop, kolom di menu mobile |
| `ConceptNav` | Indeks konsep bergaya daftar isi bernomor; kategori kosong digabung jadi satu baris "Segera hadir" |
| `ConceptIndex` | Indeks semua kategori untuk `/konsep/`; tiap kategori memakai `ConceptRows` |
| `ConceptRows` | Baris konsep bernomor (judul, istilah asli, tingkat, deskripsi); juga dipakai halaman kategori |
| `ProblemList` | Daftar masalah trader sebagai baris editorial: kutipan, keputusan, konsep (di `/masalah/` dan tautan balik halaman konsep) |
| `ProblemLayout` | Halaman masalah: kutipan → keputusan → atribusi → daftar isi → isi (4 bagian wajib) → konsep yang terlibat → baca dulu → sumber. Desktop: grid editorial, isi di kolom 1–7, daftar isi + `LossBudget` (sticky) di kolom 9–12 |
| `LossBudget` | Catatan tepi "Anggaran salah": sisa modal setelah 10 kali salah beruntun pada risiko 1/2/5/10% (hitungan pasti dari `src/lib/hourglass.ts`), tautan ke instrumen jam pasir di beranda (`#jam-pasir`) |
| `figures/HourglassGlyph` | Glyph jam pasir kecil (motif "anggaran": waktu baca, anggaran salah). Tanda teknis, bukan emblem; `aria-hidden` |
| `Sidebar` | `ConceptNav` di kiri (≥ 64rem), sticky; hanya bila `BaseLayout sidebar` |
| `MobileNav` | Navigasi mobile dengan `<dialog>` native (fokus terkunci, Esc/backdrop menutup) |
| `SiteFooter` | Atribusi "By Muhamad Daffa - Time & Price Academy" dan disclaimer |
| `LearningPath` | Langkah bernomor dengan deskripsi (`/jalur-belajar/`) |
| `SectionHeading` | Judul bagian bernomor bergaya dokumen cetak ("01 MASALAH TRADER ─ Semua →") |
| `HomeHero` | Hero beranda (R9.1): baris merek (induk + produk), judul `siteConfig.heroLine`, pertanyaan inti, dua tautan + `figures/HeroStage` |
| `figures/HeroStage` | Panggung gelap hero: kisi → medan hasil prosedural (`src/lib/outcome-field.ts`) → emblem monumental; dua komposisi (lebar/ringkas); satu interaksi gulir (horizon 1T → 2T, sebaran ∝ √t, paralaks emblem ≤ `--parallax-shift`) |
| `figures/CapitalHourglass` | (Bagian `00 Anggaran salah` di bawah hero, token netral tema.) Instrumen jam pasir modal: pasir = modal, tiap keputusan salah menjatuhkan risiko % dari modal berjalan; skala dikalibrasi dari luas tabung, pembanding 1%, kontrol risiko 1/2/5/10% + "Salah sekali lagi". Geometri & hitungan murni di `src/lib/hourglass.ts` (diuji); tanpa JS keadaan awal tetap tergambar + teks setara |
| `figures/RiskField` | (Tidak dipasang sejak R9; disimpan untuk kemungkinan dipakai di Distribusi.) FIG. 01 Medan Risiko: relief kepadatan 3D (three.js, dimuat malas lewat `import()`); kualitas high/medium/low dari `src/lib/risk-field/quality.ts`, geometri murni di `geometry.ts`, adegan di `scene.ts`; fallback & isi HTML awal = `TimePriceFigure bare` |
| `HomePhilosophy` | Pernyataan Waktu × Harga + garis ukur "satu jalur → sebaran", tiga prinsip sebagai catatan tepi |
| `HomeProblems` | Masalah trader di beranda: pengantar menempel (kiri) + entri bernomor di sumbu tegak (kanan) |
| `LearningSystem` | Rantai konsep Risiko → … → Varians (`src/data/concept-chain.ts`) sebagai diagram bertick dengan `figures/ChainGlyph` |
| `figures/ChainGlyph` | Glyph teknis bertumpuk per langkah rantai (path, band, slice, curve, mean, spread) |
| `CategoryIndex` | Indeks kategori sebagai daftar editorial: nomor "01 / 05", motif, judul, deskripsi, konsep |
| `figures/TimePriceFigure` | FIG. 01, gambar teknik isometrik Waktu × Harga (SVG inline; geometri dari `src/lib/iso.ts`); `bare` = tanpa figure/caption, dipakai sebagai fallback RiskField |
| `figures/CategoryMotif` | Motif SVG teknis per kategori (`motif` di `categories.ts`: axes, band, oscillation, kink, tree) |
| `tools/ToolFrame` | Kerangka alat hitung: label, judul, input, hasil, ringkasan `aria-live`, catatan "bukan rekomendasi". Sejak R9 selalu bergaya instrumen; `variant` hanya mengatur penempatan (`default` = di artikel, lebar baca; `instrument` = beranda) |
| `tools/UkuranPosisi` | Risiko per transaksi → ukuran posisi; rugi di stop loss setelah lot dibulatkan; risiko sebenarnya dan stop maksimum untuk "lot yang biasa dipakai"; meter risiko (`riskGauge`) di semua varian; `variant="instrument"` untuk beranda |
| `tools/SimulasiMargin` | Margin level dan jarak (poin) ke margin call / stop out |
| `tools/TabelKalahBeruntun` | Sisa modal saat kalah beruntun: risiko tetap vs digandakan |
| `tools/PenjelajahNilaiHarapan` | Nilai harapan (R), titik impas, 20 rangkaian simulasi 100 transaksi (SVG) |
| `tools/PenjelajahDistribusi` | Distribusi hasil setelah horizon: E (kuningan), ±1σ/±2σ, ekor di bawah ambang kerugian; sakelar model ekor tebal |
| `tools/SimulasiEkuitas` | Nilai harapan → 200 kurva ekuitas (median, pita 5–95%, nilai harapan) → histogram drawdown maksimum dengan ambang |
| `ConceptLayout` | Urutan halaman konsep: header → pita draf → [isi MDX + daftar isi] → masalah terkait → konsep terkait → prasyarat → sumber → navigasi jalur. Di ≥ 80rem daftar isi menjadi kolom kanan sticky |
| `ConceptHeader` | Pembuka padat: meta satu baris, judul + istilah asli, deskripsi, byline |
| `ConceptMeta` | Satu baris: kategori · tingkat · waktu baca (dengan `HourglassGlyph`) · lencana Draf (garis, tanpa isian) |
| `Byline` | Atribusi "By Muhamad Daffa - Time & Price Academy" + `CopyLinkButton` |
| `CopyLinkButton` | Menyalin URL canonical (atau `location.href`) dan mengumumkan hasilnya lewat `role="status"` |
| `PlaceholderNotice` | Satu baris "DRAF" di antara dua garis rambut untuk konsep/masalah berstatus `draft` (bukan panel berwarna) |
| `TableOfContents` | "Di halaman ini", dari heading `##` MDX atau override `sections`. Kolom kanan sticky (≥ 80rem), dua kolom (tablet), sebaris membungkus (mobile) |
| `mdx/Contoh` | Kotak contoh di isi konsep: `<Contoh jenis="kehidupan|keuangan|trading">` (trading bergaris peringatan) |
| `mdx/Definisi` | Kotak definisi utama di "Gagasan Utama" |
| `ConceptLinkList` | Daftar tautan konsep (dipakai untuk Konsep Terkait dan Prasyarat) |
| `SourceList` | Bagian "Sumber": urutan per jenis dan keadaan kosong |
| `SourceCard` | Satu sumber: label jenis, judul (tautan URL/DOI, tab baru), penulis · tahun, publisher/DOI/ISBN, catatan |
| `KnowledgeGraph` | Graf prasyarat sebagai SVG; setiap simpul tautan ke konsep, penanda bentuk per kategori + legenda |
| `PathNav` | "Sebelumnya / Berikutnya" dan posisi langkah, berdasarkan jalur belajar pertama yang memuat konsep; di langkah terakhir menunjuk "Jalur berikutnya" (jalur yang `requires` jalur ini) |

ID bagian yang dirender layout (`konsep-terkait`, `prasyarat`, `sumber`) didefinisikan sekali di
`src/lib/sections.ts` dan dipakai oleh layout maupun validasi.

### Rute

| Rute | Sumber |
|---|---|
| `/` | `pages/index.astro`: Masalah Trader → Hitung Dulu → Konsep Inti → Jalur Belajar → Prinsip |
| `/masalah/` | `pages/masalah/index.astro`, semua masalah trader |
| `/masalah/<slug>/` | `pages/masalah/[slug].astro`, satu halaman per masalah |
| `/konsep/` | `pages/konsep/index.astro`, indeks semua konsep per kategori |
| `/konsep/<slug>/` | `pages/konsep/[slug].astro`, satu halaman per konsep |
| `/kategori/<id>/` | `pages/kategori/[category].astro`, satu halaman per kategori (termasuk yang masih kosong); dikelompokkan per `topics` bila kategori punya topik |
| `/jalur-belajar/` | `pages/jalur-belajar/index.astro`, semua jalur dari `src/data/learning-paths.ts`, dengan tahap dan "Lanjutan dari" |
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
- **Token desain** (`src/styles/global.css`, arah "Trading Desk Manual"): warna monokrom (`--paper`, `--surface`,
  `--ink`, `--ink-2`, `--ink-3`, `--rule`, `--tint`; `--accent` = tinta), warna semantik data saja
  (`--loss`, `--gain`, `--caution`), skala teks `--text-xs`…`--text-4xl` (rasio 1,25, dasar 17px), jarak
  `--space-1`…`--space-24` (dasar 4px), bentuk `--radius-0`/`--radius-1` (0/2px, tanpa bayangan), dan gerak
  `--motion-fast`/`--motion-base` (0 bila `prefers-reduced-motion`). Komponen tidak menulis ukuran font
  atau radius secara manual.
- **Font:** Source Sans 3 (teks) dan Source Serif 4 (judul) disajikan sendiri dari `src/assets/fonts/web/`
  (lihat README di sana); dua di antaranya di-preload di `SeoHead`.

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
   - melompati tingkat: garis siku di **jalur (lane) khusus di luar semua simpul, di sisi kiri atau kanan
     (mana yang lebih dekat ke kedua simpul, R9)**. Garis turun dari
     bawah simpul asal, belok di celah antar-tingkat (yang tidak berisi simpul), turun di jalurnya, lalu
     masuk ke atas simpul tujuan. Setiap garis mendapat jalur sendiri (garis terpendek paling dekat), dan
     belokan keluar/masuk dipisah agar dua garis di satu celah tidak tampak menyatu. Tidak ada garis yang
     menembus simpul lain; ini diuji secara geometris.
5. **Judul.** Maksimal dua baris × 18 karakter. Sisanya dipotong dengan elipsis. Ukuran simpul (172px)
   dan jarak dipadatkan di R9 agar peta nyata (5 simpul per tingkat + jalur, ±1030px) muat di bingkai
   desktop ≥ 80rem tanpa digeser; di layar lebih sempit area peta digeser mendatar.
6. **Kategori.** Penanda simpul berbentuk per kategori (`marker` di `src/data/categories.ts`: lingkaran,
   persegi, belah ketupat, segitiga, silang; `markerPath()` di `graph.ts`), monokrom di kedua tema.
   Legenda di bawah peta hanya memuat kategori yang punya simpul.
7. **Aksesibilitas.** SVG punya `<title>` dan `<desc>`. Setiap simpul adalah `<a>` dengan
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

### Alat hitung

- Rumus ada di `src/lib/calc/*` (fungsi murni). Komponen `src/components/tools/*` merender **hasil awal di
  server** dari nilai default (tetap berguna tanpa JavaScript), lalu skrip kecil menghitung ulang saat input
  berubah dengan fungsi yang sama. Kalimat ringkasan juga dari satu sumber (`calc/describe.ts`).
- Tidak ada data yang disimpan atau dikirim; semua dihitung di browser.
- Plot alat: SVG `preserveAspectRatio="none"` dengan garis `non-scaling-stroke`, label sumbu/tanda sebagai HTML
  berposisi persen (tetap terbaca di ponsel). Kelas bersama `.plot*`, `.tool__button`, `.toggle` di `ToolFrame`.
  Target sentuh input/slider/tombol ≥ 44px. Slider menghitung ulang paling banyak sekali per frame.
- Simulasi nilai harapan memakai PRNG ber-seed (`mulberry32`): hasil sama untuk seed yang sama, dan diberi
  label "Simulasi".
- Dipasang di MDX tanpa import lewat `src/components/tools/index.ts` (prop `components` di halaman konsep
  dan masalah), serta langsung di beranda ("Hitung Dulu").

### Pemeriksaan (`npm run validate`)

1. `vitest run`: uji fungsi murni di `tests/` (rumus kalkulator beserta angka yang muncul di konten,
   validasi konten, pencarian, graf, kalimat ringkasan).
1. `scripts/check-source.mjs`: menolak teks dan elemen inline yang dipisah baris baru di template
   `.astro` (Astro 7 membuang spasinya saat render, mis. "dipeta").
1. `astro check`: tipe dan template.
2. `astro build`: termasuk skema konten dan `validate.ts`.
3. `scripts/check-branding.mjs`: merek dan penulis dari `siteConfig`.
4. `scripts/check-site.mjs`: semua tautan internal memakai base dan menunjuk ke file yang ada; anchor
   valid; canonical/`og:url` absolut dan benar; `og:image` menunjuk ke PNG 1200×630 yang ada.
