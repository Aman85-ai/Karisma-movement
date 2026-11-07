# Karisma Car Rental: nota projek untuk Claude

## Cara kerja dengan pemilik repo
- Balas dalam **Bahasa Melayu**. Betulkan ejaan arahan pengguna dahulu (sebut pembetulan secara ringkas).
- Beri cadangan dan tanya sebelum keputusan besar. Tunjuk rancangan atau jalan cerita sebelum buat.
- Kerja **satu babak demi satu babak**: hantar video atau pratonton, kemudian tunggu kelulusan.
- Selepas siap setiap langkah, **terus commit dan push**, dan simpan alatan atau panduan yang berguna untuk kegunaan semula.
- Pengguna guna telefon. Hantar hasil sebagai fail MP4 atau gambar, bukan pautan pratonton.
- Ajar sedikit tentang teknik atau AI baharu bila sesuai.

## Maklumat syarikat
- Nama: **Karisma Car Rental**. Telefon untuk video: **013-792 9025**.
- Papan tanda bulat dalam IMG_9072 masih tunjuk nombor lama (019 958 5234).
- Jangan reka harga atau promosi yang tidak diberi pengguna.

## Video promosi (`promo-video/`)
- Panduan penuh: `promo-video/PANDUAN.md`. Kapsyen TikTok: `promo-video/KAPSYEN-TIKTOK.md`.
- `render.py` menghasilkan video 1080×1920 30fps. Semua teks, masa dan kedudukan ada dalam `SCENES`.
- Gaya yang diluluskan:
  - Font **Anton**, tulisan **hitam pekat**, **lurus mendatar** (kawasan `quad` segi empat tepat, kamera tiada putaran).
  - Perkataan terapung naik dari bawah (kabur → tajam). Babak 2 guna `dir="down"`, iaitu turun dari atas.
  - Bunyi **whoosh kecil sahaja**.
  - Tulisan hanya atas permukaan cerah, di bahagian atas atau tengah skrin.
- Versi kartun: `promo-video/kartun/` (Three.js, latar telus) digabung dengan `render.py --kartun`.
  Render semua: `bash promo-video/render-semua.sh`.
- `kartun/src/lib/toon.js` dan `characters.js` datang dari repo peribadi `Aman85-ai/karisma-kartun` dan **tidak di-commit** ke repo ini.
