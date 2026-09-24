# Font untuk gambar OpenGraph

Dipakai oleh `src/lib/og-image.ts` saat build untuk merender `/og/*.png`. Font disertakan di repo
agar hasil gambar identik di mesin lokal dan di GitHub Actions (tidak bergantung pada font sistem).

| File | Font | Lisensi |
|---|---|---|
| `SourceSerif4-SemiBold.ttf`, `SourceSerif4-Italic.ttf` | Source Serif 4 (Adobe) | SIL OFL 1.1, lihat `OFL-SourceSerif4.txt` |
| `SourceSans3-Regular.ttf`, `SourceSans3-SemiBold.ttf` | Source Sans 3 (Adobe) | SIL OFL 1.1, lihat `OFL-SourceSans3.txt` |

Sumber: Google Fonts, melalui paket npm `@expo-google-fonts/source-serif-4` dan
`@expo-google-fonts/source-sans-3` (v0.4.1).
