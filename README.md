# Risk Lab — Time & Price Academy

Perpustakaan riset dan sistem belajar interaktif tentang risiko, probabilitas, dan pengambilan keputusan.

By Muhamad Daffa - Time & Price Academy

## Menjalankan

```sh
npm install
npm run dev        # server pengembangan
npm test           # uji Vitest (rumus kalkulator, validasi, pencarian, graf)
npm run validate   # pemeriksaan sumber + uji + astro check + build + pemeriksaan merek & situs
npm run build      # build statis ke dist/
```

Situs: **https://dafaanjc.github.io/time-and-price-academy/** (GitHub Pages, deploy otomatis dari `main`
lewat `.github/workflows/deploy.yml`). Server lokal juga memakai sub-path yang sama:
`http://localhost:4321/time-and-price-academy/`.

Untuk domain lain: `SITE_URL=https://domain-anda BASE_PATH=/ npm run build`.

## Dokumentasi

- [Arsitektur](docs/architecture.md)
- [Model konten & cara menambah konsep](docs/content-model.md)
