# Panduan: Video Promosi "Tulisan Terapung pada Dinding"

Panduan ini untuk buat video baru dengan gaya yang sama macam `karisma_promo.mp4`.

---

## 1. Isi folder ini

| Fail / folder | Kegunaan |
|---|---|
| `karisma_promo.mp4` | Video siap (versi akhir yang awak luluskan) |
| `render.py` | Skrip yang menghasilkan video. Semua teks, masa dan kedudukan ada dalam `SCENES` |
| `assets/` | Gambar yang digunakan (IMG_9070, IMG_9071, IMG_9072 dalam format .jpg) |
| `fonts/` | Font **Anton** (percuma, lesen OFL dalam `OFL.txt`) |
| `grid.py` | Alat bantu: lukis grid bernombor atas gambar untuk cari koordinat dinding |
| `heic_to_jpg.py` | Tukar gambar iPhone (.heic) kepada .jpg |
| `requirements.txt` | Senarai pakej Python yang diperlukan |

Video contoh asal (TikTok orang lain) **tidak** disimpan dalam repo ini. Ia masih ada dalam Google Drive awak, di folder "Video contoh":
https://drive.google.com/drive/folders/17-x70jDZESEOZuwBjOHb_WhM5Zb92lNt

---

## 2. Cara paling mudah: minta Claude buat semula

Buka sesi Claude Code baru pada repo `karisma-movement`, kemudian salin dan tampal prompt di bawah. Tukar bahagian dalam [kurungan].

```
Baca promo-video/PANDUAN.md dan promo-video/render.py.
Buat video promosi baru dengan gaya yang SAMA seperti karisma_promo.mp4.

Gambar baru ada dalam Google Drive: [pautan folder Drive]
Teks yang saya nak (ikut babak):
- Babak 1: [contoh: PROMOSI RAYA / DISKAUN 20%]
- Babak 2: [...]
- Babak 3: [...]
- Penutup: KARISMA CAR RENTAL, 013-792 9025

Kekalkan: tulisan hitam pekat, font Anton, perkataan terapung naik perlahan
dari bawah (kabur -> tajam), bunyi whoosh kecil sahaja setiap perkataan,
tulisan di bahagian atas dinding yang cerah, video 9:16 1080x1920.
Pilih sendiri kedudukan terbaik, tunjuk pratonton dulu sebelum render penuh.
Simpan dalam folder promo-video/ dengan nama fail baru.
```

---

## 3. Cara buat sendiri (komputer)

### a) Pasang sekali sahaja
Perlu **Python 3** dan **ffmpeg**.
```bash
pip install -r requirements.txt
```

### b) Sediakan gambar
```bash
python3 heic_to_jpg.py gambar_baru.heic        # jika gambar dari iPhone
```
Letak fail .jpg dalam folder `assets/`.

### c) Cari kedudukan dinding
```bash
python3 grid.py assets/gambar_baru.jpg grid.jpg
```
Buka `grid.jpg`. Garisan merah ialah setiap 200 piksel dan garisan kuning setiap 50 piksel. Catat 4 bucu kawasan dinding yang cerah dan kosong, ikut susunan: **atas-kiri, atas-kanan, bawah-kanan, bawah-kiri**.

### d) Edit `SCENES` dalam `render.py`
Setiap babak:
```python
dict(
    img="IMG_9070.jpg",                 # nama gambar dalam assets/
    crop=(170, 806, 1190, 2619),         # potongan gambar (x1, y1, x2, y2), nisbah mesti 9:16
    t0=0.0, t1=6.4,                      # masa babak mula & tamat (saat)
    quad=[(230,1404),(1310,1522),(1310,1978),(230,1588)],  # 4 bucu dinding
    plane=(2250, 500),                   # saiz dinding "rata" (lebar, tinggi)
    zoom=(1.0, 1.06),                    # zum perlahan dari 1.0 ke 1.06
    phrases=[
        dict(box=(1230, 20, 2110, 390),  # kawasan teks dalam dinding rata
             align="left",               # "left" atau "center"
             out=2.95,                   # masa ayat hilang
             lines=[
                 [("NAK", 1.0, "d", 0.35), ("SEWA", 1.0, "d", 0.70)],   # baris 1
                 [("KERETA?", 1.0, "d", 1.10)],                         # baris 2
             ]),
    ],
),
```
Setiap perkataan ditulis `("TEKS", saiz_relatif, "d", masa_muncul)`:
- `saiz_relatif`: 1.0 = saiz penuh, 0.78 = lebih kecil (macam "PAYAH" dalam "TAK PAYAH").
- `"d"`: warna hitam pekat.
- `masa_muncul`: saat perkataan mula naik. Jarak 0.35–0.4 saat antara perkataan nampak semula jadi.

**Peraturan penting:** babak seterusnya mesti mula 0.35 saat sebelum babak sebelumnya tamat. Contohnya babak 1 `t1=6.4`, jadi babak 2 `t0=6.05`. Ubah juga `DURATION` di bawah `SCENES` jika jumlah masa video berubah.

### e) Pratonton, kemudian render
```bash
python3 render.py assets pratonton --preview     # gambar pegun dalam folder pratonton/
python3 render.py assets video_baru.mp4          # video penuh (lebih kurang 1–2 minit)
```

---

## 4. Tetapan gaya (bahagian atas `render.py`)

| Tetapan | Nilai sekarang | Maksud |
|---|---|---|
| `BLACK` | `(8, 8, 8)` | Warna tulisan (hitam pekat) |
| `WORD_IN` | `0.70` | Berapa saat perkataan terapung naik. Besar = lebih perlahan |
| `RISE` | `0.85` | Jarak naik (× tinggi huruf) |
| `DRIFT` | `0.07` | Ayat terus terapung naik perlahan selepas muncul |
| `PHRASE_OUT` | `0.40` | Berapa saat ayat hilang |
| `XFADE` | `0.35` | Peralihan kabur antara babak |

Nak tambah warna (contoh oren terakota macam video contoh)? Tambah dalam `COLORS`, contohnya `"o": (192, 99, 74)`, kemudian guna `"o"` pada perkataan itu.

---

## 5. Tips pilih tempat tulisan

- Tulisan hitam hanya jelas atas **permukaan cerah**: dinding putih, kelabu cerah atau biru sederhana. Elakkan siling gelap, kaca tingkap dan kayu gelap.
- Letak tulisan di **bahagian atas atau tengah** skrin, tidak di bahagian bawah dinding.
- Elakkan **10% paling atas** skrin (menu TikTok) dan **20% paling bawah** (kapsyen dan nama akaun TikTok).
- Jangan biar tulisan merentas tiang atau sudut dinding. Ia nampak janggal.
- Jangan potong logo atau papan tanda syarikat dalam `crop`.

---

## 6. Maklumat syarikat yang digunakan

- Nama: **Karisma Car Rental**
- Telefon dalam video: **013-792 9025**
- Papan tanda bulat dalam gambar pintu masuk (IMG_9072) tertulis nombor lain (019 958 5234). Ambil gambar baru jika papan tanda itu sudah ditukar.

---

## 7. Versi kartun 3D (`karisma_promo_kartun.mp4`)

Video ini menggabungkan gambar sebenar, watak chibi 3D (staf Karisma dan pelanggan) dan tulisan terapung. Panjangnya 25 saat.

| Babak | Masa | Apa berlaku |
|---|---|---|
| 1 Kaunter luar | 0–9s | Staf jalan perlahan, berhenti di depan "NAK SEWA KERETA?", lambai, kemudian keluar |
| 2 Pintu masuk | 8.7–15.2s | Staf bawa pelanggan masuk ke ofis menuju meja kaunter. Tulisan turun dari atas |
| 3 Ruang dalam | 14.9–21.4s | Pelanggan angkat kunci, berjalan ke arah kamera dan keluar. Staf melambai |
| Penutup | 21–25.1s | Staf dan pelanggan melambai di bawah KARISMA CAR RENTAL 013-792 9025 |

Cara render semula (lihat juga `kartun/README.md`):
```bash
cd kartun
node render-overlay.js --babak 1 --from 0   --to 270 --out ../out/kartun/babak1
node render-overlay.js --babak 2 --from 259 --to 456 --out ../out/kartun/babak2
node render-overlay.js --babak 3 --from 446 --to 642 --out ../out/kartun/babak3
node render-overlay.js --babak 4 --from 631 --to 753 --out ../out/kartun/penutup
cd .. && python3 render.py assets karisma_promo_kartun.mp4 --kartun out/kartun
```
Gerakan watak setiap babak ada dalam `kartun/src/main.js` (fungsi `babak1()` hingga `penutup()`).
