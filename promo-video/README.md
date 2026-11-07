# Video Promosi Karisma Car Rental: gaya "teks pada dinding"

Fail siap: `karisma_promo.mp4` (1080×1920, 9:16, 30fps, 22.5 saat). Sedia untuk TikTok, Reels dan Shorts.

## Gaya
- Font **Anton**: huruf besar, tebal dan sempit.
- Semua tulisan warna **hitam pekat**.
- Setiap perkataan **terapung naik perlahan-lahan dari bawah** (kabur → tajam), dengan bunyi "whoosh" kecil. Tiada bunyi lain.
- Ayat terus terapung naik sedikit demi sedikit, kemudian hilang sambil naik.
- Tulisan berada di bahagian atas dinding dan ikut sudut dinding.
- Kamera zum masuk perlahan dan bergoyang sedikit supaya gambar nampak macam video.

## Babak
| Masa | Gambar | Teks |
|---|---|---|
| 0–6s | Kaunter luar (IMG_9070) | NAK SEWA KERETA? → TAK PAYAH PENING |
| 6–12.5s | Pintu masuk (IMG_9072) | KERETA BERSIH → HARGA BERPATUTAN |
| 12.5–18.5s | Ruang dalam, dinding biru atas lukisan (IMG_9071) | AMBIL KUNCI → TERUS JALAN |
| 18.5–22.5s | Kad penutup | KARISMA CAR RENTAL, 013-792 9025 |

## Panduan penuh
Lihat **[PANDUAN.md](PANDUAN.md)** untuk cara buat video baru, prompt yang boleh disalin untuk Claude, dan semua tetapan.

## Cara render semula
Perlu Python 3, `numpy`, `opencv-python-headless`, `Pillow` dan `ffmpeg`.
Font Anton sudah ada dalam folder `fonts/`. Jalankan:

```bash
python3 render.py assets karisma_promo.mp4            # video penuh
python3 render.py assets preview --preview            # gambar pratonton sahaja
```

Untuk tukar teks, masa atau kedudukan, edit senarai `SCENES` di bahagian atas `render.py`.
