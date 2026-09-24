# Font

## TTF — gambar OpenGraph

Dipakai oleh `src/lib/og-image.ts` saat build untuk merender `/og/*.png`. Font disertakan di repo
agar hasil gambar identik di mesin lokal dan di GitHub Actions (tidak bergantung pada font sistem).

| File | Font | Lisensi |
|---|---|---|
| `SourceSerif4-SemiBold.ttf`, `SourceSerif4-Italic.ttf` | Source Serif 4 (Adobe) | SIL OFL 1.1, lihat `OFL-SourceSerif4.txt` |
| `SourceSans3-Regular.ttf`, `SourceSans3-SemiBold.ttf` | Source Sans 3 (Adobe) | SIL OFL 1.1, lihat `OFL-SourceSans3.txt` |

Sumber: Google Fonts, melalui paket npm `@expo-google-fonts/source-serif-4` dan
`@expo-google-fonts/source-sans-3` (v0.4.1).

## WOFF2 — situs (`web/`)

Dimuat lewat `@font-face` di `src/styles/global.css` (subset latin). Dua file di-preload di
`SeoHead.astro`: Sans 400 dan Serif 600.

| File | Dipakai untuk |
|---|---|
| `source-sans-3-latin-400-normal.woff2` | Teks isi, antarmuka |
| `source-sans-3-latin-400-italic.woff2` | Teks miring |
| `source-sans-3-latin-600-normal.woff2` | Tebal, label |
| `source-serif-4-latin-600-normal.woff2` | Judul |
| `source-serif-4-latin-400-italic.woff2` | Istilah asli, kutipan |

Sumber: paket npm `@fontsource/source-sans-3` dan `@fontsource/source-serif-4` (v5.3.0), SIL OFL 1.1
(teks lisensi sama dengan file `OFL-*.txt` di folder ini).
