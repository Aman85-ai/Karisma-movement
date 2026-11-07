"""Alat bantu: lukis grid bernombor atas gambar untuk cari koordinat dinding.

Guna:  python3 grid.py assets/IMG_9070.jpg grid_9070.jpg
Buka grid_9070.jpg, baca nombor merah (setiap 200px) untuk dapatkan 4 bucu
dinding (atas-kiri, atas-kanan, bawah-kanan, bawah-kiri). Masukkan dalam
'quad' dalam SCENES di render.py.
"""
import sys

from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
d = ImageDraw.Draw(im)
w, h = im.size
for x in range(0, w, 50):
    big = x % 200 == 0
    d.line([(x, 0), (x, h)], fill=(255, 0, 0) if big else (255, 255, 0), width=3 if big else 1)
    if big:
        for y in range(0, h, 400):
            d.text((x + 4, y + 4), str(x), fill=(255, 0, 0))
for y in range(0, h, 50):
    big = y % 200 == 0
    d.line([(0, y), (w, y)], fill=(255, 0, 0) if big else (255, 255, 0), width=3 if big else 1)
    if big:
        for x in range(0, w, 400):
            d.text((x + 4, y + 4), str(y), fill=(255, 0, 0))
im.save(out, quality=90)
print(f"Siap: {out} ({w}x{h})")
