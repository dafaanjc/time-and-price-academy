# Font

## TTF — gambar OpenGraph (sementara)

Dipakai oleh `src/lib/og-image.ts` saat build untuk merender `/og/*.png`. Font disertakan di repo
agar hasil gambar identik di mesin lokal dan di GitHub Actions (tidak bergantung pada font sistem).

| File | Font | Lisensi |
|---|---|---|
| `SourceSerif4-SemiBold.ttf`, `SourceSerif4-Italic.ttf` | Source Serif 4 (Adobe) | SIL OFL 1.1, lihat `OFL-SourceSerif4.txt` |
| `SourceSans3-Regular.ttf`, `SourceSans3-SemiBold.ttf` | Source Sans 3 (Adobe) | SIL OFL 1.1, lihat `OFL-SourceSans3.txt` |

Sumber: Google Fonts, melalui paket npm `@expo-google-fonts/source-serif-4` dan
`@expo-google-fonts/source-sans-3` (v0.4.1).

## Situs — paket @fontsource

Font situs tidak lagi disimpan di folder ini. Dipasang lewat npm (subset latin, SIL OFL 1.1) dan diimpor
di awal `src/styles/global.css`; Vite menyalin file WOFF2 ke build (self-hosted, tanpa CDN).
Dua file di-preload di `SeoHead.astro`: Newsreader 400 dan Bodoni Moda 500.

| Paket | Bobot | Dipakai untuk |
|---|---|---|
| `@fontsource/bodoni-moda` | 500, 400 italic | Judul & display (`--font-display`) |
| `@fontsource/newsreader` | 400, 400 italic, 600 | Teks baca, antarmuka, label katalog (`--font-text`) |
| `@fontsource/ibm-plex-mono` | 400 | Angka hasil hitungan & input (`--font-num`) |

Arah visual: `docs/redesign-brief.md`. TTF Source Serif/Sans di atas tetap dipakai untuk gambar OG
sampai Tahap 2 brief memperbarui OG image.
