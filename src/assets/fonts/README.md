# Font

## Situs — paket @fontsource

Font situs tidak disimpan di folder ini. Dipasang lewat npm (subset latin, SIL OFL 1.1) dan diimpor
di awal `src/styles/global.css`; Vite menyalin file WOFF2 ke build (self-hosted, tanpa CDN).
Dua file di-preload di `SeoHead.astro`: Newsreader 400 dan Bodoni Moda 500.

| Paket | Bobot | Dipakai untuk |
|---|---|---|
| `@fontsource/bodoni-moda` | 500, 400 italic | Judul & display (`--font-display`) |
| `@fontsource/newsreader` | 400, 400 italic, 600 | Teks baca, antarmuka, label katalog (`--font-text`) |
| `@fontsource/ibm-plex-mono` | 400 | Angka hasil hitungan & input (`--font-num`) |

Arah visual: `docs/redesign-brief.md`.

## TTF — gambar OpenGraph

Dipakai oleh `src/lib/og-image.ts` saat build untuk merender `/og/*.png` (sharp/Pango hanya membaca
TTF/OTF, bukan WOFF). Font disertakan di repo agar hasil gambar identik di mesin lokal dan di GitHub Actions.

| File | Nama keluarga (Pango) | Lisensi |
|---|---|---|
| `BodoniModa-Medium.ttf` | `Bodoni Moda Medium` | SIL OFL 1.1, lihat `OFL-BodoniModa.txt` |
| `Newsreader-Regular.ttf`, `Newsreader-Italic.ttf` | `Newsreader` (gaya Regular / Italic) | SIL OFL 1.1, lihat `OFL-Newsreader.txt` |
| `Newsreader-SemiBold.ttf` | `Newsreader SemiBold` | SIL OFL 1.1, lihat `OFL-Newsreader.txt` |

Dibuat dari file WOFF subset latin di paket `@fontsource/bodoni-moda` dan `@fontsource/newsreader` (v5.3.0),
tanpa mengubah glyph:

```sh
node scripts/woff-to-ttf.mjs node_modules/@fontsource/bodoni-moda/files/bodoni-moda-latin-500-normal.woff src/assets/fonts/BodoniModa-Medium.ttf
node scripts/woff-to-ttf.mjs node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff src/assets/fonts/Newsreader-Regular.ttf
node scripts/woff-to-ttf.mjs node_modules/@fontsource/newsreader/files/newsreader-latin-400-italic.woff src/assets/fonts/Newsreader-Italic.ttf
node scripts/woff-to-ttf.mjs node_modules/@fontsource/newsreader/files/newsreader-latin-600-normal.woff src/assets/fonts/Newsreader-SemiBold.ttf
```

Nama keluarga di tabel `name` menentukan spesifikasi Pango (`"Keluarga, Gaya ukuran"`, koma memisahkan
keluarga dari gaya).
