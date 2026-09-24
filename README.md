# Risk Lab — Time & Price Academy

Perpustakaan riset dan sistem belajar interaktif tentang risiko, probabilitas, dan pengambilan keputusan.

By Muhamad Daffa - Time & Price Academy

## Menjalankan

```sh
npm install
npm run dev        # server pengembangan
npm run validate   # astro check + build (validasi skema & konten) + pemeriksaan merek
npm run build      # build statis ke dist/
```

Untuk build produksi, set `SITE_URL` agar URL canonical dan OpenGraph ditulis sebagai URL absolut:

```sh
SITE_URL=https://domain-anda npm run build
```

## Dokumentasi

- [Arsitektur](docs/architecture.md)
- [Model konten & cara menambah konsep](docs/content-model.md)
