# Model Konten — Konsep

Setiap konsep adalah satu file MDX di `src/content/concepts/<slug>.mdx`.
Bahasa konten: **Bahasa Indonesia**. Istilah asli bahasa Inggris dicantumkan di `termEn`.

## Frontmatter

| Field | Wajib | Tipe | Keterangan |
|---|---|---|---|
| `title` | ya | string | Judul dalam Bahasa Indonesia, mis. `Nilai Harapan` |
| `termEn` | tidak | string | Istilah asli, mis. `Expected Value` |
| `slug` | ya | kebab-case | Harus sama dengan nama file. Dipakai di URL `/konsep/<slug>/` |
| `category` | ya | enum | `foundations`, `risk-management`, `psychology`, `behavioral-finance`, `decision-theory` |
| `order` | ya | integer ≥ 0 | Urutan dalam kategori |
| `difficulty` | ya | enum | `beginner` (Dasar), `intermediate` (Menengah), `advanced` (Lanjutan) |
| `description` | ya | string ≤ 220 | Deskripsi singkat untuk kartu, meta description, dan OpenGraph |
| `status` | tidak | enum | `draft` (default), `review`, `published` |
| `featured` | tidak | boolean | Saat ini tidak dipakai (bagian "Konsep Pilihan" dihapus dari beranda pada redesign) |
| `prerequisites` | tidak | slug[] | Konsep yang perlu dipahami lebih dulu |
| `related` | tidak | slug[] | Konsep terkait, bukan prasyarat |
| `sources` | tidak | Source[] | Lihat di bawah |
| `sections` | tidak | `{id, title}[]` | Override daftar isi. Default: diambil dari heading MDX |

### Source

| Field | Wajib | Keterangan |
|---|---|---|
| `type` | ya | `primary-research`, `academic-review`, `book`, `standard`, `institutional`, `educational` |
| `title` | ya | Judul sumber persis seperti aslinya |
| `authors` | tidak | Daftar nama penulis |
| `year` | tidak | Tahun terbit |
| `publisher`, `url`, `doi`, `isbn` | minimal salah satu | Agar sumber dapat ditelusuri |
| `note` | tidak | Catatan singkat tentang relevansi sumber |

**Aturan sumber:** hanya cantumkan sumber nyata yang sudah Anda verifikasi. Build akan gagal bila
sumber terlihat seperti placeholder (`lorem`, `TODO`, `TBD`, `example.com`, dll.) atau tidak punya
cara penelusuran. Lebih baik `sources: []` daripada sumber karangan.

## Struktur isi (body MDX)

Gunakan heading `##` dengan urutan berikut:

1. Mengapa Ini Penting
2. Gagasan Utama
3. Penjelasan Sederhana
4. Contoh Kehidupan Nyata
5. Contoh Keuangan
6. Contoh Trading
7. Cara Kerja Konsep

Konsep terkait, prasyarat, sumber, kategori, tingkat kesulitan, waktu baca, dan atribusi penulis
dirender otomatis dari frontmatter. Jangan menulisnya ulang di body. Build akan gagal bila body
berisi heading "Konsep Terkait", "Prasyarat", atau "Sumber", karena ID-nya bentrok dengan bagian
otomatis (lihat `src/lib/sections.ts`).

### Tampilan sumber

Sumber dirender oleh `SourceList` → `SourceCard`:
- diurutkan per jenis (Riset Primer → Tinjauan Akademik → Buku → Standar → Institusional → Edukasi),
  lalu tahun terbaru;
- judul menjadi tautan ke `url`. Bila `url` kosong tetapi ada `doi`, tautan dibuat ke
  `https://doi.org/<doi>`. Bila keduanya tidak ada, judul ditampilkan tanpa tautan;
- penulis dan tahun, publisher, DOI, ISBN, dan `note` hanya tampil bila diisi.

### Alat hitung di konten

Empat alat bisa disisipkan di MDX konsep maupun masalah trader, tanpa import:

| Tag | Isi |
|---|---|
| `<UkuranPosisi />` | Risiko per transaksi → ukuran posisi |
| `<SimulasiMargin />` | Jarak ke margin call / stop out |
| `<TabelKalahBeruntun />` | Kalah beruntun: risiko tetap vs digandakan |
| `<PenjelajahNilaiHarapan />` | Nilai harapan + simulasi |

Taruh di bagian "Cara Kerja Konsep" (konsep) atau "Penerapan Praktis" (masalah). Satu alat yang sama
cukup sekali per halaman.

### Komponen isi

Halaman konsep menyediakan dua komponen yang bisa dipakai di MDX **tanpa import**:

```mdx
## Gagasan Utama

<Definisi>

**Nilai harapan adalah rata-rata tertimbang dari semua hasil yang mungkin…**

</Definisi>

## Contoh Trading

<Contoh jenis="trading">

*Ilustrasi, bukan rekomendasi.* …teks, tabel, dan rumus seperti biasa…

</Contoh>
```

- `jenis` wajib salah satu dari `kehidupan`, `keuangan`, `trading`, sesuai tiga bagian contoh.
- Beri baris kosong setelah tag pembuka dan sebelum tag penutup agar Markdown di dalamnya diproses.
- Heading `##` tetap di **luar** komponen (dipakai daftar isi dan validasi).
- Build gagal bila `jenis` tidak dikenal atau tag tidak ditutup.

Bagian yang belum ditulis diberi tanda `_Draf: bagian ini belum ditulis._`. Jangan mengisinya dengan
teks yang terdengar akademis tetapi tidak berdasar.

### Pedoman gaya penulisan

- **Angka contoh selalu ilustrasi.** Awali paragraf contoh dengan `*Ilustrasi.*`, atau
  `*Ilustrasi, bukan rekomendasi.*` untuk contoh trading. Jangan menyajikan angka karangan sebagai
  data pasar nyata atau hasil riset.
- **Tanpa klaim riset tanpa sumber.** Frasa seperti "penelitian menunjukkan…" hanya boleh dipakai bila
  sumbernya tercantum di `sources`.
- **Tanpa sinyal trading.** Contoh menjelaskan cara berpikir (ukuran risiko, nilai harapan, ukuran
  posisi), bukan arah harga atau instruksi beli/jual.
- **Rumus** ditulis dalam blok kode `text`. Blok ini sengaja tidak diwarnai Shiki
  (`astro.config.mjs` → `markdown.syntaxHighlight.excludeLangs`) dan dibungkus otomatis di layar sempit.
  Rumus pendek di dalam kalimat memakai kode inline, misalnya `` `P(A) = 1/6` ``.
- **Istilah asing** dimiringkan pada penyebutan pertama, misalnya *expected value* dan *fat tails*.
- **Desimal memakai koma** (0,45; 3,5%), dan ribuan memakai titik (Rp1.000.000).
- **Tautan antar-konsep** ditulis **relatif**: `[Probabilitas](../probability/)`. Jangan memakai
  `/konsep/...`, karena situs di-host di sub-path (`/time-and-price-academy/`). Build gagal bila tautan
  diawali `/` atau merujuk slug yang tidak ada.
- Jangan menulis tanda `<`, `{`, atau `}` di teks biasa, karena MDX akan memprosesnya sebagai JSX.
  Tulis "kurang dari", atau taruh di dalam kode.

## Menambah konsep baru

1. Buat `src/content/concepts/<slug>.mdx`. Nama file = slug.
2. Isi frontmatter. Contoh:

   ```yaml
   ---
   title: "Nilai Harapan"
   termEn: "Expected Value"
   slug: expected-value
   category: foundations
   order: 5
   difficulty: intermediate
   description: "Rata-rata tertimbang dari semua kemungkinan hasil, dengan probabilitas setiap hasil sebagai bobotnya."
   status: draft
   prerequisites: [probability-distribution]
   related: [variance-and-volatility]
   sources: []
   ---
   ```

3. Tulis body dengan tujuh heading di atas.
4. (Opsional) Tambahkan slug ke jalur belajar di `src/data/learning-paths.ts`. Slug harus muncul
   setelah semua prasyaratnya.
5. Jalankan `npm run validate`. Build gagal dengan pesan yang jelas bila ada rujukan yang salah,
   siklus prasyarat, sumber placeholder, atau urutan jalur yang tidak sesuai.
6. Ubah `status` ke `review`, lalu `published`, setelah isi dan sumber diverifikasi.

Konsep baru otomatis muncul di sidebar, menu mobile, halaman kategori, dan jumlah konsep di beranda.

## Masalah trader

Pintu masuk berbasis masalah: **MASALAH → KEPUTUSAN → KONSEP → TEORI/BUKTI → PENERAPAN**. Setiap masalah
adalah satu file di `src/content/problems/<slug>.mdx` (URL `/masalah/<slug>/`). Masalah **tidak menyalin
teori**; ia merujuk konsep.

| Field | Wajib | Keterangan |
|---|---|---|
| `title` | ya | Masalah dalam suara trader, **tanpa** tanda kutip (ditambahkan otomatis) |
| `slug` | ya | Sama dengan nama file |
| `order` | ya | Urutan tampil |
| `decision` | ya | Keputusan yang dipertaruhkan, dalam bahasa netral (≤ 200 karakter) |
| `description` | ya | Ringkasan untuk daftar, meta, dan OpenGraph (≤ 220 karakter) |
| `concepts` | ya | ≥ 1 slug konsep, urut dari yang paling langsung. Wajib ada di koleksi konsep |
| `keywords` | tidak | Istilah yang biasa diketik trader (mis. `MC`, `revenge trading`), hanya untuk pencarian |
| `status`, `sources` | tidak | Sama dengan konsep |

Body wajib memuat empat heading ini, **dalam urutan ini**: `## Situasi`, `## Konsep di Baliknya`,
`## Teori dan Bukti`, `## Penerapan Praktis`. Bagian "Konsep yang Terlibat", "Baca Dulu" (semua
prasyarat dari konsep yang dirujuk, diurutkan dari yang paling dasar), dan "Sumber" dibuat otomatis; jangan
menulis heading dengan nama itu.

- Tautan ke konsep dari body masalah: `[Ukuran Posisi](../../konsep/position-sizing/)`.
- "Teori dan Bukti" berisi hitungan yang bisa diperiksa sendiri. Klaim riset hanya boleh bila sumbernya
  tercantum di `sources`.
- Halaman konsep otomatis menampilkan "Masalah Trader Terkait" untuk setiap masalah yang merujuknya.
- Build gagal bila: konsep yang dirujuk tidak ada, heading wajib hilang atau urutannya salah, tautan tidak
  relatif atau rusak, sumber berupa placeholder, atau heading bentrok dengan bagian otomatis.

## Menambah kategori

Tambahkan id ke `categoryIds` dan entri ke `categories` di `src/data/categories.ts`. Skema otomatis
menerima id baru.
