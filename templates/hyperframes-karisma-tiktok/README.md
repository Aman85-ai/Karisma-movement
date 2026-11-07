# Templat HyperFrames: Karisma TikTok (9:16)

Titik mula untuk video promosi Karisma Car Rental, dibina dengan [HyperFrames](https://github.com/heygen-com/hyperframes).
Ia mengikut gaya yang sudah diluluskan.

- Video menegak 1080×1920, 30fps, 6 saat.
- Gambar sebenar dengan zum perlahan (Ken Burns).
- Tulisan **Anton hitam pekat**, lurus mendatar, terapung naik dari bawah (kabur → tajam).
- Kad penutup: KARISMA / CAR RENTAL / 013-792 9025.
- Muzik latar dan **whoosh** setiap kali perkataan keluar.

## Guna semula
```bash
cp -r templates/hyperframes-karisma-tiktok video-baru && cd video-baru
# tukar gambar dalam assets/, tulisan dan masa dalam index.html
npx hyperframes check        # semak (kontras, susun atur, audio)
npx hyperframes render -o video-baru.mp4
```
Atau minta Claude: *"Guna templat HyperFrames Karisma, buat video baru dengan teks ..."*

## Struktur `index.html`
| Bahagian | Cara ubah |
|---|---|
| Masa video | `data-duration` pada `#root` |
| Gambar | `assets/kaunter.jpg` → tukar `src` pada `#photo` |
| Tulisan babak | `#headline` (`.w` = satu perkataan). Kedudukan diatur dengan `top` / `left` dalam `.headline` |
| Animasi | `rise("#id", masa)` dalam `<script>`: perkataan naik dari bawah pada saat itu |
| Kad penutup | `#end-card`, dengan masa pada `data-start` |
| Bunyi | `<audio id="whN" ... data-start="...">` (letak sama dengan masa `rise`), `#bgm` = muzik latar |

## Peraturan penting (kontrak HyperFrames)
- Setiap elemen bermasa ada `class="clip"`, `data-start` dan `data-duration`.
- Tiada `Math.random()`, `Date.now()` atau pemasa: semua animasi dalam satu garis masa GSAP yang dijeda.
- Laluan aset bermula dengan `assets/...`.
- Tulisan hitam mesti atas latar cerah. `check` akan beri ralat kontras jika tidak.

## Aset
- `assets/fonts/Anton-Regular.ttf`: lesen SIL OFL (`OFL.txt`).
- `assets/whoosh.wav`, `assets/bgm.wav`: dijana sendiri dengan FFmpeg (bebas hak cipta).
