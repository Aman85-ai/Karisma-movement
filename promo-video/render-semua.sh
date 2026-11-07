#!/usr/bin/env bash
# Render semula video kartun penuh (karisma_promo_kartun.mp4) dengan satu arahan.
#
# Guna:  bash render-semua.sh            -> video penuh
#        bash render-semua.sh --tanpa-kartun   -> video tulisan sahaja (karisma_promo.mp4)
#
# Perlu: Python 3 + pakej dalam requirements.txt, ffmpeg, Node.js + Playwright (Chromium),
#        dan kartun/src/lib/{toon.js,characters.js} disalin dari repo karisma-kartun
#        (lihat kartun/README.md).
set -euo pipefail
cd "$(dirname "$0")"

if [[ "${1:-}" == "--tanpa-kartun" ]]; then
  python3 render.py assets karisma_promo.mp4
  echo "Siap: karisma_promo.mp4"
  exit 0
fi

for f in toon.js characters.js; do
  if [[ ! -f "kartun/src/lib/$f" ]]; then
    echo "Tiada kartun/src/lib/$f - salin dari repo karisma-kartun dahulu (lihat kartun/README.md)." >&2
    exit 1
  fi
done
[[ -d kartun/node_modules/three ]] || (cd kartun && npm install)

OUT=out/kartun
# Julat frame setiap babak (30fps) - mesti sepadan dengan masa SCENES dalam render.py
(
  cd kartun
  node render-overlay.js --babak 1 --from 0   --to 270 --out "../$OUT/babak1"
  node render-overlay.js --babak 2 --from 259 --to 456 --out "../$OUT/babak2"
  node render-overlay.js --babak 3 --from 446 --to 696 --out "../$OUT/babak3"
  node render-overlay.js --babak 4 --from 685 --to 807 --out "../$OUT/penutup"
)
python3 render.py assets karisma_promo_kartun.mp4 --kartun "$OUT"
echo "Siap: karisma_promo_kartun.mp4"
