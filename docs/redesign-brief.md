# Brief Redesign Visual — Risk Lab (Time & Price Academy)

Dokumen ini adalah sumber kebenaran untuk redesign visual. Setiap tahap dikerjakan satu per satu.
Baca seluruh dokumen ini sebelum mengerjakan tahap apa pun.

## Aturan yang tidak boleh dilanggar

- **Substansi tidak berubah.** Jangan mengubah isi MDX, teks, alur argumen, data, rumus, atau urutan konten.
  Yang boleh diubah: tata letak, tipografi, warna, ilustrasi, motion, komponen visual, logo.
- Aturan di `docs/architecture.md` tetap berlaku, termasuk:
  - nama merek/produk/penulis/tagline hanya dari `siteConfig` (jangan ditulis langsung di komponen);
  - catatan Astro 7 (compiler ketat, `compressHTML: 'jsx'`, spasi inline).
- `npm run validate` wajib lolos di akhir setiap tahap.
- Mobile first. Uji di lebar 360px, 768px, dan 1280px.
- Aksesibilitas: fokus keyboard terlihat, kontras teks minimal AA, `prefers-reduced-motion` dihormati
  (semua motion mati, tampilan tetap utuh).
- Performa: tidak ada library 3D. Tidak ada font dari CDN (self-host via `@fontsource`).
  JavaScript baru hanya bila benar-benar perlu, kecil, dan dimuat setelah halaman tampil.

## Konsep: "Kabinet Risiko"

Risk Lab adalah laboratorium dan perpustakaan riset bergaya abad ke-18: kertas, tinta, pelat ukiran,
instrumen kuningan, dan jilid buku. Logo (figur klasik memegang jam pasir, dengan spiral emas di belakangnya)
adalah jantung visual. Jam pasir = modal dan waktu. Spiral emas = hubungan waktu dan harga.

Kesan yang dicari: tenang, presisi, berwibawa, seperti membuka buku riset tua yang dicetak rapi.
Bukan dashboard trading, bukan landing page SaaS.

Referensi rasa (bukan untuk ditiru): press.stripe.com (buku sebagai objek, editorial), situs patung klasik
yang "dibongkar" menjadi garis saat di-scroll.

## Token desain

Tema: **terang sebagai satu-satunya tema** untuk saat ini (`color-scheme: light`). Hapus varian gelap
dari `prefers-color-scheme` agar pekerjaan fokus.

| Token          | Nilai     | Peran                                                  |
| -------------- | --------- | ------------------------------------------------------ |
| `--paper`      | `#F3EEE4` | latar utama                                            |
| `--paper-deep` | `#E7DFD0` | panel, rak, area sekunder                              |
| `--ink`        | `#1C1A16` | teks utama, garis ukiran                               |
| `--ink-soft`   | `#5B554A` | teks sekunder, keterangan                              |
| `--rule`       | `#D6CCBA` | garis pemisah tipis                                    |
| `--brass`      | `#9A7640` | aksen utama: tautan aktif, garis nilai harapan, sorotan |
| `--brass-ink`  | `#7A5A2B` | versi kuningan untuk teks (kontras AA di atas kertas)  |
| `--plate`      | `#15130F` | pelat ukiran gelap (hero, emblem)                      |
| `--loss`       | `#8C2F24` | hanya untuk makna rugi/bahaya, sangat jarang           |

Tekstur kertas: noise SVG inline sangat halus (opacity ≤ 0.05) di `body`. Tanpa file gambar.

### Tipografi

- **Display:** Bodoni Moda (judul besar, kontras tinggi, rapat, tracking sedikit negatif).
- **Teks baca dan UI:** Newsreader (serif yang nyaman di layar; line-height 1.6 untuk prosa).
- **Angka instrumen/kalkulator:** IBM Plex Mono, hanya untuk angka hasil hitungan dan input.
- Label gaya katalog tua: **italic serif dengan small caps** (mis. *Fig. 00*, *Objek 00*, *Instrumen 01*),
  bukan monospace huruf kapital. Hindari label di atas setiap judul; pakai hanya di tempat yang sudah ada.
- Skala tipe modular (rasio 1.333), ukuran fluid dengan `clamp()`.
- Nomor urut hanya untuk konten yang benar-benar berurutan (jalur belajar, langkah).

### Bentuk dan garis

- Garis 1px `--rule`. Sudut tajam atau radius sangat kecil (2px). Tanpa bayangan abu generik.
- Kedalaman dibuat dari arsiran, lapisan, dan parallax, bukan dari drop shadow.
- Ornamen boleh: bingkai ganda tipis ala pelat buku, garis spiral emas, tanda registrasi cetak.
  Satu ornamen per area, jangan menumpuk.

## Aset logo

- Sumber: `src/assets/brand/logo-plate.png` (versi putih di atas hitam, 1024px). Ini aset terbaik yang ada.
- Versi terang resolusi rendah (433px) **jangan dipakai** di ukuran besar karena buram.
- Versi terang hasil invert membuat wajah terlihat seperti negatif film. Karena itu, di ukuran besar
  logo selalu tampil sebagai **pelat ukiran gelap** (`--plate`) yang dibingkai di atas kertas terang.
  Ini disengaja dan menjadi ciri visual.
- Kalau nanti tersedia versi terang resolusi tinggi, simpan sebagai `src/assets/brand/logo-paper.png`.

## Motion

Satu momen utama saja: hero. Sisanya hanya motion yang menjawab aksi pengguna
(hover, buka, hitung). Tidak ada fade-in di setiap section.
Pakai CSS scroll-driven animation (`animation-timeline: view()` / `scroll()`), dengan fallback statis
untuk browser yang belum mendukung.

---

## Tahap-tahap

### Tahap 1 — Fondasi
- Pasang font via `@fontsource` (Bodoni Moda, Newsreader, IBM Plex Mono), subset latin.
- Tulis ulang token di `src/styles/global.css` sesuai tabel di atas; hapus varian gelap.
- Tipografi dasar, skala tipe, tekstur kertas, gaya tautan, fokus, `.prose`.
- Perbarui `SiteHeader`, `Sidebar`, `SiteFooter`, dan `MobileNav` agar memakai token baru.
- Tambahkan ringkasan aturan desain (5–10 baris) ke `CLAUDE.md` yang merujuk ke dokumen ini.

### Tahap 2 — Sistem logo
- Buat komponen `Emblem.astro`: pelat gelap berbingkai ganda, gambar logo di tengah, teks melingkar
  dari `siteConfig` (master brand dan produk). Varian ukuran: hero, footer, OG.
- Gambar ulang **spiral emas** sebagai SVG vektor (garis kuningan) untuk dipakai sebagai motif.
- Buat **monogram jam pasir** SVG sederhana untuk favicon dan ukuran kecil (≤ 32px).
- Header: monogram + wordmark tipografis (Bodoni Moda), bukan gambar logo penuh.
- Perbarui OG image default memakai emblem baru.

### Tahap 3 — Hero "Pelat Ukiran" (2.5D, tanpa library)
- Hero di beranda: pelat gelap besar berisi logo, dengan kedalaman berlapis:
  1. lapisan belakang: spiral emas SVG dan grid garis waktu × harga;
  2. lapisan tengah: logo;
  3. lapisan depan: garis-garis cabang kemungkinan dari jam pasir (visual yang sudah ada di hero sekarang).
- Saat di-scroll: lapisan bergerak dengan kecepatan berbeda (parallax), garis spiral dan cabang
  "tergambar" (stroke-dashoffset), lalu kilau cahaya tipis menyapu pelat seperti logam terkena lampu.
- Desktop: kemiringan halus mengikuti kursor (maks 4°), JS kecil, dimuat setelah idle.
  Mobile: tanpa tilt, parallax dikurangi.
- Transisi turun ke section "Jam pasir modal" terasa menyambung (jam pasir sebagai benang merah).
- Teks hero tetap sama persis.

### Tahap 4 — Beranda: section lainnya
- **Masalah Trader:** tampil seperti kartu indeks arsip; kutipan dalam Newsreader italic besar.
- **Sistem Belajar (6 konsep):** **rak buku CSS 3D**. Setiap konsep satu jilid dengan punggung buku
  (judul, nomor jilid). Hover/fokus: buku sedikit tertarik keluar dan berputar menampilkan sampul.
  Mobile: rak bisa digeser horizontal (scroll-snap).
- **Instrumen (kalkulator):** seperti instrumen kuningan presisi: bingkai tipis, angka Plex Mono,
  meter risiko dengan garis ukur. Logika kalkulator tidak diubah.
- **Indeks Kategori:** setiap kategori punya objek ukiran SVG sederhana:
  Fondasi = dadu dan jam pasir, Manajemen Risiko = timbangan, Psikologi = kepala patung,
  Keuangan Perilaku = koin, Teori Keputusan = jangka.

### Tahap 5 — Halaman konsep, kategori, jalur, peta
- Halaman konsep seperti bab buku riset: kepala bab (kategori, nomor jilid, judul Bodoni besar),
  prosa Newsreader dalam `.prose` 68ch, **sidenote** di margin untuk prasyarat dan sumber
  (desktop); di mobile turun ke bawah paragraf.
- `ConceptCard` dan `LearningPath` mengikuti gaya jilid/katalog.
- `KnowledgeGraph`: simpul seperti label katalog, garis tinta, jalur yang di-hover berwarna kuningan.
- Halaman kategori memakai objek ukiran dari Tahap 4.

### Tahap 6 — Poles dan audit
- Audit mobile di semua rute, perbaiki overflow dan ukuran sentuh (min 44px).
- Audit `prefers-reduced-motion`, kontras, fokus keyboard.
- Performa: gambar dioptimasi (webp/avif, `astro:assets`), font subset, JS minimal.
  Target Lighthouse mobile ≥ 90 untuk Performance dan Accessibility.
- `npm run validate` lolos, lalu commit.

### Tahap opsional (nanti) — Patung 3D asli
Hanya jika Tahap 3 dirasa kurang. Membutuhkan model GLB patung (≤ 1,5 MB setelah kompresi),
Three.js sebagai island di beranda saja, gambar statis sebagai fallback.
