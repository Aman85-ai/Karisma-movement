# Watak chibi 3D atas gambar sebenar

Render watak chibi (latar telus) yang digabung oleh `../render.py --kartun <folder>`.

**Persediaan:** salin `toon.js` dan `characters.js` dari repo peribadi `karisma-kartun`
(`.claude/skills/kartun-3d-chibi/toolkit/src/lib/`) ke `src/lib/`, kemudian `npm install`.

```bash
node render-overlay.js --png 40,75,100 --out ../out/semak --debug   # semak perspektif
node render-overlay.js --from 0 --to 192 --out ../out/kartun-babak1  # frame babak 1
cd .. && python3 render.py assets percubaan.mp4 --kartun out/kartun-babak1 --start 0 --end 6.4
```
