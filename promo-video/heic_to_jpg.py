"""Tukar gambar iPhone (.heic) kepada .jpg supaya boleh guna dalam render.py.

Guna:  python3 heic_to_jpg.py gambar1.heic gambar2.heic ...   -> keluar gambar1.jpg, ...
Perlu: pip install pillow-heif
"""
import sys
from pathlib import Path

import pillow_heif
from PIL import Image

pillow_heif.register_heif_opener()
for f in sys.argv[1:]:
    out = Path(f).with_suffix(".jpg")
    Image.open(f).convert("RGB").save(out, quality=92)
    print("Siap:", out)
