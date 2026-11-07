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

## HyperFrames: video HTML → MP4 (alat utama untuk video baru)
- **Setiap permintaan video, animasi, motion graphics, video promosi, kapsyen atau tajuk animasi: guna skill `/hyperframes` dahulu**
  (skill rasmi HeyGen, v0.9.20, dalam `.claude/skills/`: `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`).
  Projek lama `promo-video/` (render.py + kartun) kekal untuk video Karisma yang sedia ada.
- Persediaan sesi: `bash tools/setup-hyperframes.sh` (pasang CLI `hyperframes@0.9.20` + semak sistem).
  Untuk render pantas dalam sesi awan:
  `export HYPERFRAMES_BROWSER_PATH=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
  (semak laluan sebenar dengan `ls /opt/pw-browsers`).
- Mula video baru daripada templat `templates/hyperframes-karisma-tiktok/` (9:16, gaya Karisma), atau `npx hyperframes init <nama> --resolution portrait --non-interactive --skill hyperframes`.
- Kitaran kerja: ubah `index.html`, kemudian `npx hyperframes check --json` (betulkan semua ralat, terutama kontras), kemudian `npx hyperframes render -o <fail>.mp4`. Hantar MP4 kepada pengguna untuk kelulusan.
- Pengkompil membuang ruang antara `<span>`: beri jarak perkataan dengan CSS (`margin-right`), bukan ruang kosong.
- Suara latar: Bahasa Melayu guna sambungan ElevenLabs. `hyperframes tts` (Kokoro) hanya untuk bahasa Inggeris dan beberapa bahasa lain (`bash tools/setup-hyperframes.sh --tts`).
  Muzik latar: fail audio pengguna, atau jana dengan FFmpeg. Jangan guna lagu berhak cipta.
- CLI menghantar telemetri penggunaan. Pengguna boleh matikan dengan `npx hyperframes telemetry disable` atau `HYPERFRAMES_NO_TELEMETRY=1`.
- Kemas kini kemudian: `npx hyperframes update` (CLI + skill). Salin semula skill dari `~/.claude/skills/` ke `.claude/skills/` dan commit.
