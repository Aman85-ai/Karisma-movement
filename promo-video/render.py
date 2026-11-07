"""Karisma Car Rental - video promosi gaya 'teks pada dinding'.

Render: python3 render.py <folder_aset> <output.mp4> [--preview]
Folder aset mesti ada: IMG_9070.jpg, IMG_9071.jpg, IMG_9072.jpg, Anton-Regular.ttf
"""
import math
import subprocess
import sys
import wave
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
DARK = (43, 33, 26)        # coklat gelap / charcoal (sama macam video contoh)
ORANGE = (192, 99, 74)     # oren terakota untuk perkataan penting
COLORS = {"d": DARK, "o": ORANGE}

WORD_IN = 0.28     # masa perkataan muncul (kabur -> tajam)
PHRASE_OUT = 0.30  # masa ayat hilang
XFADE = 0.35       # peralihan antara babak

# ---------------------------------------------------------------------------
# Babak & teks.  quad = 4 bucu dinding dalam koordinat gambar asal
# (atas-kiri, atas-kanan, bawah-kanan, bawah-kiri). plane = saiz "dinding rata".
# box = kawasan dalam plane tempat blok teks diletak.
# Setiap perkataan: (teks, saiz relatif, warna 'd'/'o', masa muncul)
# ---------------------------------------------------------------------------
SCENES = [
    dict(
        img="IMG_9070.jpg", crop=(0, 200, 1320, 2547), t0=0.0, t1=6.4,
        quad=[(230, 1404), (1310, 1522), (1310, 1978), (230, 1588)], plane=(2250, 500),
        zoom=(1.0, 1.06), pan=(0.0, 0.0),
        phrases=[
            dict(box=(820, 75, 2200, 425), align="left", out=2.95, lines=[
                [("NAK", 1.0, "d", 0.35), ("SEWA", 1.0, "d", 0.70)],
                [("KERETA?", 1.0, "o", 1.10)],
            ]),
            dict(box=(820, 75, 2200, 425), align="left", out=5.95, lines=[
                [("TAK", 1.0, "d", 3.10), ("PAYAH", 0.78, "d", 3.45)],
                [("PENING", 1.0, "d", 3.85)],
            ]),
        ],
    ),
    dict(
        img="IMG_9072.jpg", crop=(0, 0, 908, 1614), t0=6.05, t1=12.6,
        quad=[(130, 30), (900, 20), (900, 240), (130, 272)], plane=(1600, 480),
        zoom=(1.0, 1.05), pan=(0.0, 0.0), anchor_y=0.08,
        phrases=[
            dict(box=(60, 25, 1540, 455), align="center", out=9.05, lines=[
                [("KERETA", 1.0, "d", 6.45), ("BERSIH", 1.0, "d", 6.85)],
            ]),
            dict(box=(60, 25, 1540, 455), align="center", out=12.15, lines=[
                [("HARGA", 0.80, "d", 9.15)],
                [("BERPATUTAN", 1.0, "o", 9.55)],
            ]),
        ],
    ),
    dict(
        img="IMG_9071.jpg", crop=(0, 250, 760, 1601), t0=12.25, t1=18.8,
        quad=[(15, 785), (440, 804), (440, 978), (15, 960)], plane=(1300, 520),
        zoom=(1.0, 1.06), pan=(0.0, 0.0),
        phrases=[
            dict(box=(40, 30, 1260, 500), align="left", out=15.25, lines=[
                [("AMBIL", 1.0, "d", 12.65)],
                [("KUNCI", 1.0, "d", 13.00)],
            ]),
            dict(box=(40, 30, 1260, 500), align="left", out=18.35, lines=[
                [("TERUS", 1.0, "d", 15.40)],
                [("JALAN", 1.0, "o", 15.75)],
            ]),
        ],
    ),
    dict(
        img=None, crop=(0, 0, W, H), t0=18.45, t1=22.5,
        quad=[(80, 640), (1000, 640), (1000, 1240), (80, 1240)], plane=(920, 600),
        zoom=(1.0, 1.03), pan=(0.0, 0.0),
        phrases=[
            dict(box=(10, 10, 910, 590), align="center", out=99, lines=[
                [("KARISMA", 1.0, "o", 18.85)],
                [("CAR", 0.62, "d", 19.20), ("RENTAL", 0.62, "d", 19.45)],
                [("013-792 9025", 0.46, "d", 19.95)],
            ]),
        ],
    ),
]
DURATION = 22.5


def ease_out(p):
    p = min(max(p, 0.0), 1.0)
    return 1 - (1 - p) ** 3


def ease_in_out(p):
    p = min(max(p, 0.0), 1.0)
    return p * p * (3 - 2 * p)


# ---------------------------------------------------------------------------
# Latar
# ---------------------------------------------------------------------------
def make_endcard_bg():
    """Dinding warna krim hangat dengan cahaya lembut (macam dinding video contoh)."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    base = np.array([205, 192, 172], np.float32)
    light = np.exp(-(((xx - 300) / 900) ** 2 + ((yy - 500) / 1100) ** 2))
    vign = 1 - 0.28 * (((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2) * 2.2
    img = base[None, None, :] * (0.82 + 0.28 * light[..., None]) * vign[..., None]
    rng = np.random.default_rng(3)
    noise = cv2.GaussianBlur(rng.normal(0, 6, (H, W)).astype(np.float32), (0, 0), 1.2)
    img += noise[..., None]
    return np.clip(img, 0, 255).astype(np.uint8)


def load_scene_bg(scene, assets):
    if scene["img"] is None:
        return make_endcard_bg()
    im = cv2.imread(str(assets / scene["img"]), cv2.IMREAD_COLOR)
    im = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
    x0, y0, x1, y1 = scene["crop"]
    return np.ascontiguousarray(im[y0:y1, x0:x1])


# ---------------------------------------------------------------------------
# Teks
# ---------------------------------------------------------------------------
class Word:
    def __init__(self, text, rgba, x, y, color, t_in, t_out):
        self.text, self.rgba, self.x, self.y = text, rgba, x, y
        self.color, self.t_in, self.t_out = color, t_in, t_out


def layout_phrase(phrase, font_path):
    """Susun perkataan: baris rapat, perkataan pertama besar (gaya video contoh)."""
    probe = ImageFont.truetype(font_path, 200)
    cap = probe.getbbox("H", anchor="ls")
    cap_h200 = -cap[1]  # tinggi huruf besar pada saiz 200

    def measure(base):
        lines = []
        for line in phrase["lines"]:
            items, x = [], 0.0
            lh = 0.0
            for (txt, rel, col, t) in line:
                size = base * rel
                f = ImageFont.truetype(font_path, max(int(round(size)), 4))
                bb = f.getbbox(txt, anchor="ls")
                w = bb[2] - bb[0]
                ch = cap_h200 * size / 200
                items.append((txt, size, col, t, x - bb[0], w, ch))
                x += w + size * 0.10
                lh = max(lh, ch)
            lines.append((items, x - items[-1][1] * 0.10, lh))
        gap = base * 0.07
        total_h = sum(l[2] for l in lines) + gap * (len(lines) - 1)
        total_w = max(l[1] for l in lines)
        return lines, total_w, total_h, gap

    bx0, by0, bx1, by1 = phrase["box"]
    _, w100, h100, _ = measure(100.0)
    base = 100.0 * min((bx1 - bx0) / w100, (by1 - by0) / h100)
    lines, tw, th, gap = measure(base)
    oy = by0 + ((by1 - by0) - th) / 2
    words = []
    y = oy
    for items, lw, lh in lines:
        if phrase["align"] == "center":
            ox = bx0 + ((bx1 - bx0) - lw) / 2
        else:
            ox = bx0 + ((bx1 - bx0) - tw) / 2
        baseline = y + lh
        for (txt, size, col, t, dx, w, ch) in items:
            f = ImageFont.truetype(font_path, int(round(size)))
            pad = int(size * 0.35)
            bb = f.getbbox(txt, anchor="ls")
            img = Image.new("L", (int(bb[2] - bb[0]) + 2 * pad, int(bb[3] - bb[1]) + 2 * pad), 0)
            ImageDraw.Draw(img).text((pad - bb[0], pad - bb[1]), txt, font=f, fill=255, anchor="ls")
            # kedudukan sudut kiri-atas gambar perkataan dalam plane
            px = ox + dx + bb[0] - pad
            py = baseline + bb[1] - pad
            a = np.asarray(img, np.float32) / 255.0
            words.append(Word(txt, a, px, py, COLORS[col], t, phrase["out"]))
        y = baseline + gap
    return words


def word_state(wd, t):
    """Pulangkan (alpha, sigma blur, skala) untuk perkataan pada masa t."""
    if t < wd.t_in:
        return 0.0, 0.0, 1.0
    e = ease_out((t - wd.t_in) / WORD_IN)
    alpha = e
    sigma = 11.0 * (1 - e)
    scale = 1.07 - 0.07 * e
    if t >= wd.t_out:
        q = ease_in_out((t - wd.t_out) / PHRASE_OUT)
        alpha *= 1 - q
        sigma += 14.0 * q
    return alpha, sigma, scale


def render_plane(scene, words, t):
    pw, ph = scene["plane"]
    prem = np.zeros((ph, pw, 3), np.float32)
    acc = np.zeros((ph, pw), np.float32)
    for wd in words:
        alpha, sigma, scale = word_state(wd, t)
        if alpha <= 0.003:
            continue
        a = wd.rgba
        hh, ww = a.shape
        if abs(scale - 1) > 1e-3:
            a = cv2.resize(a, (max(1, int(ww * scale)), max(1, int(hh * scale))), interpolation=cv2.INTER_LINEAR)
        if sigma > 0.3:
            a = cv2.GaussianBlur(a, (0, 0), sigma)
        a = a * alpha
        nh, nw = a.shape
        cx, cy = wd.x + ww / 2, wd.y + hh / 2
        x0, y0 = int(round(cx - nw / 2)), int(round(cy - nh / 2))
        sx0, sy0 = max(0, -x0), max(0, -y0)
        dx0, dy0 = max(0, x0), max(0, y0)
        dx1, dy1 = min(pw, x0 + nw), min(ph, y0 + nh)
        if dx1 <= dx0 or dy1 <= dy0:
            continue
        sub = a[sy0:sy0 + (dy1 - dy0), sx0:sx0 + (dx1 - dx0)]
        col = np.array(wd.color, np.float32)
        inv = 1 - sub
        prem[dy0:dy1, dx0:dx1] = prem[dy0:dy1, dx0:dx1] * inv[..., None] + sub[..., None] * col
        acc[dy0:dy1, dx0:dx1] = acc[dy0:dy1, dx0:dx1] * inv + sub
    return prem, acc


# ---------------------------------------------------------------------------
# Kamera (zum perlahan + goyang tangan halus)
# ---------------------------------------------------------------------------
def camera_matrix(scene, t):
    cw = scene["crop"][2] - scene["crop"][0]
    ch = scene["crop"][3] - scene["crop"][1]
    u = (t - scene["t0"]) / (scene["t1"] - scene["t0"])
    z0, z1 = scene["zoom"]
    z = z0 + (z1 - z0) * ease_in_out(u)
    s = W / cw * z
    ay = scene.get("anchor_y", 0.5)
    # titik sauh: bahagian gambar yang kekal di tempat yang sama semasa zum
    axc, ayc = cw / 2, ch * ay
    oxc, oyc = W / 2, H * ay
    ph = scene["t0"] * 1.7
    dx = 3.2 * math.sin(2 * math.pi * 0.43 * t + ph) + 1.6 * math.sin(2 * math.pi * 1.1 * t + 2 * ph)
    dy = 2.6 * math.sin(2 * math.pi * 0.37 * t + 1.3 + ph) + 1.4 * math.sin(2 * math.pi * 0.9 * t + ph)
    rot = math.radians(0.18 * math.sin(2 * math.pi * 0.29 * t + ph))
    # pastikan tiada tepi kosong: zum tambahan kecil untuk goyangan
    s *= 1.012
    c, si = math.cos(rot) * s, math.sin(rot) * s
    M = np.array([[c, -si, 0], [si, c, 0], [0, 0, 1]], np.float64)
    M[0, 2] = oxc + dx - (c * axc - si * ayc)
    M[1, 2] = oyc + dy - (si * axc + c * ayc)
    return M


def render_scene_frame(scene, bg, words, Hq, wall_luma, t):
    M = camera_matrix(scene, t)
    frame = cv2.warpAffine(bg, M[:2], (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    frame = frame.astype(np.float32)
    prem, acc = render_plane(scene, words, t)
    if acc.max() > 0.002:
        P = M @ Hq
        a = cv2.warpPerspective(acc, P, (W, H), flags=cv2.INTER_LINEAR)
        pr = cv2.warpPerspective(prem, P, (W, H), flags=cv2.INTER_LINEAR)
        # teks "dicat" pada dinding: ikut cahaya & bayang dinding
        luma = frame @ np.array([0.299, 0.587, 0.114], np.float32)
        luma = cv2.GaussianBlur(luma, (0, 0), 6)
        shade = np.clip(luma / wall_luma, 0.72, 1.22) ** 0.85
        a = np.clip(a, 0, 1) * 0.96
        pr = pr * 0.96
        frame = frame * (1 - a[..., None]) + pr * shade[..., None]
    return frame


# ---------------------------------------------------------------------------
# Bunyi whoosh
# ---------------------------------------------------------------------------
SR = 44100


def whoosh(rng, dur=0.30, f0=500.0, f1=2600.0, gain=0.30):
    n = int(dur * SR)
    noise = rng.normal(0, 1, n)
    t = np.arange(n) / SR
    # penapis band-pass yang menyapu frekuensi (bunyi "fwoosh")
    fc = f0 * (f1 / f0) ** (np.sin(np.clip(t / dur, 0, 1) * np.pi / 2))
    out = np.zeros(n)
    y1 = y2 = x1 = x2 = 0.0
    q = 2.2
    for i in range(n):
        w0 = 2 * math.pi * fc[i] / SR
        alpha = math.sin(w0) / (2 * q)
        a0 = 1 + alpha
        a1 = -2 * math.cos(w0)
        a2 = 1 - alpha
        x = noise[i]
        y = (alpha * x - alpha * x2 - a1 * y1 - a2 * y2) / a0
        out[i] = y
        x2, x1 = x1, x
        y2, y1 = y1, y
    att = 0.10
    env = np.where(t < att, (t / att) ** 1.6, np.exp(-(t - att) / 0.07))
    out *= env
    out /= np.max(np.abs(out)) + 1e-9
    return out * gain


def build_audio(path, scenes):
    rng = np.random.default_rng(7)
    total = np.zeros(int(DURATION * SR) + SR)
    times = []
    for sc in scenes:
        for ph in sc["phrases"]:
            for line in ph["lines"]:
                for (txt, rel, col, t) in line:
                    times.append(t)
    for t in sorted(times):
        w = whoosh(rng, f0=rng.uniform(420, 600), f1=rng.uniform(2300, 3000), gain=rng.uniform(0.26, 0.32))
        st = int(max(0, t - 0.06) * SR)
        total[st:st + len(w)] += w
    total = total[: int(DURATION * SR)]
    # stereo dengan sedikit lebar
    left = total
    right = np.concatenate([np.zeros(12), total[:-12]])
    st = np.stack([left, right], 1)
    st = np.clip(st, -1, 1)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((st * 32767).astype(np.int16).tobytes())


# ---------------------------------------------------------------------------
def prepare(assets):
    font = str(assets / "Anton-Regular.ttf")
    prepared = []
    for sc in SCENES:
        bg = load_scene_bg(sc, assets)
        x0, y0 = sc["crop"][:2]
        pw, ph = sc["plane"]
        src = np.float32([[0, 0], [pw, 0], [pw, ph], [0, ph]])
        dst = np.float32([[x - x0, y - y0] for x, y in sc["quad"]])
        Hq = cv2.getPerspectiveTransform(src, dst).astype(np.float64)
        mask = np.zeros(bg.shape[:2], np.uint8)
        cv2.fillConvexPoly(mask, dst.astype(np.int32), 1)
        luma = bg.astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
        wall_luma = float(np.median(luma[mask > 0]))
        words = []
        for p in sc["phrases"]:
            words += layout_phrase(p, font)
        prepared.append((sc, bg, words, Hq, wall_luma))
    return prepared


def frame_at(prepared, t):
    out = None
    last = len(prepared) - 1
    for idx, p in enumerate(prepared):
        sc = p[0]
        if not (sc["t0"] - 1e-6 <= t <= sc["t1"] + 1e-6):
            continue
        f = render_scene_frame(sc, p[1], p[2], p[3], p[4], t)
        # peralihan: babak lama kabur keluar, babak baru kabur -> tajam masuk
        blur = 0.0
        k_in = 1.0
        if idx > 0 and t < sc["t0"] + XFADE:
            k_in = ease_in_out((t - sc["t0"]) / XFADE)
            blur = max(blur, 14 * (1 - k_in))
        if idx < last and t > sc["t1"] - XFADE:
            k_out = ease_in_out((sc["t1"] - t) / XFADE)
            blur = max(blur, 14 * (1 - k_out))
        if blur > 0.4:
            f = cv2.GaussianBlur(f, (0, 0), blur)
        out = f if out is None else out * (1 - k_in) + f * k_in
    if out is None:
        out = np.zeros((H, W, 3), np.float32)
    # pudar ke gelap di hujung video
    if t > DURATION - 0.5:
        out = out * ease_in_out((DURATION - t) / 0.5)
    return np.clip(out, 0, 255).astype(np.uint8)


def main():
    assets = Path(sys.argv[1])
    out = Path(sys.argv[2])
    preview = "--preview" in sys.argv
    prepared = prepare(assets)
    if preview:
        out.mkdir(parents=True, exist_ok=True)
        for t in [1.6, 4.6, 7.7, 10.8, 14.0, 17.0, 21.0, 6.25, 12.45, 0.45]:
            Image.fromarray(frame_at(prepared, t)).save(out / f"p_{t:05.2f}.jpg", quality=90)
        return
    wav = out.with_suffix(".wav")
    build_audio(wav, SCENES)
    n = int(round(DURATION * FPS))
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-i", str(wav), "-c:v", "libx264", "-preset", "slow", "-crf", "17",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(n):
        proc.stdin.write(frame_at(prepared, i / FPS).tobytes())
        if i % 60 == 0:
            print(f"frame {i}/{n}", flush=True)
    proc.stdin.close()
    proc.wait()
    wav.unlink()


if __name__ == "__main__":
    main()
