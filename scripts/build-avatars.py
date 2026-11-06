"""Cuts the AI-generated portrait sheets in public/avatars/raw into the game's avatar library (public/avatars/*.webp).
Sheets: men.png and women.png (6 faces each, 3x2 grid, teal top, blue-grey background) and outfits.png (one man, 6 outfits).
Each face becomes a 300x400 WebP, plus a few recoloured-top variants made by rotating the teal of the plain top.
Run: python3 scripts/build-avatars.py"""
import colorsys, json, os
import numpy as np
from PIL import Image

RAW, OUT = "public/avatars/raw", "public/avatars"
W, H = 300, 400
GRID = {  # x ranges, y ranges of the cells (measured from the sheets)
    "men": ([(16, 408), (431, 827), (849, 1240)], [(0, 601), (604, 1191)]),
    "women": ([(16, 408), (431, 827), (849, 1240)], [(0, 601), (604, 1191)]),
    "outfits": ([(15, 413), (426, 827), (842, 1240)], [(0, 617), (620, 1239)]),
}
def cut(name, i):
    xs, ys = GRID[name]; im = Image.open(f"{RAW}/{name}.png").convert("RGB")
    (x0, x1), (y0, y1) = xs[i % 3], ys[i // 3]
    w = x1 - x0; h = int(w * H / W); top = y0 + (8 if name == "outfits" else 48)
    box = (x0, top, x1, min(y1, top + h)); c = im.crop(box)
    if c.size[1] < h:  # pad the bottom with the last row if a cell is short
        pad = Image.new("RGB", (c.size[0], h)); pad.paste(c, (0, 0)); arr = np.asarray(c); pad.paste(Image.fromarray(np.repeat(arr[-1:], h - c.size[1], axis=0)), (0, c.size[1])); c = pad
    return c.resize((W, H), Image.LANCZOS)

def recolour(img, hue, sat_scale=1.0, val_scale=1.0, white=False):
    a = np.asarray(img).astype(float) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(axis=2), a.min(axis=2); d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6.0
    s = np.where(mx > 0, d / (mx + 1e-9), 0); v = mx
    teal = (h > 0.40) & (h < 0.56) & (s > 0.22) & (v > 0.25) & (v < 0.85)  # the plain teal top
    teal[:int(img.size[1] * 0.60)] = False  # only the lower part of the picture (never hair, face or background)
    # soft edge
    from PIL import ImageFilter
    m = Image.fromarray((teal * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(0.8)); m = np.asarray(m).astype(float)[..., None] / 255.0
    nh = np.full_like(h, hue); ns = np.clip(s * sat_scale, 0, 1); nv = np.clip(v * val_scale, 0, 1)
    if white: ns = ns * 0.12; nv = np.clip(0.55 + v * 0.55, 0, 1)
    k = (np.clip(nh, 0, 1)); i6 = np.floor(k * 6).astype(int) % 6; f = k * 6 - np.floor(k * 6)
    p = nv * (1 - ns); q = nv * (1 - f * ns); t = nv * (1 - (1 - f) * ns)
    rr = np.choose(i6, [nv, q, p, p, t, nv]); gg = np.choose(i6, [t, nv, nv, q, p, p]); bb = np.choose(i6, [p, p, t, nv, nv, q])
    out = np.stack([rr, gg, bb], axis=2)
    return Image.fromarray((np.clip(a * (1 - m) + out * m, 0, 1) * 255).astype("uint8"))

TOPS = {"t": None, "n": (0.62, 0.9, 0.55), "m": (0.97, 0.85, 0.7), "o": (0.19, 0.7, 0.62), "c": (0.60, 0.12, 0.42), "w": "white"}
os.makedirs(OUT, exist_ok=True); manifest = {"faces": [], "outfits": [], "tops": list(TOPS)}
for sheet, prefix, female in (("men", "m", False), ("women", "w", True)):
    for i in range(6):
        base = cut(sheet, i); fid = f"{prefix}{i + 1}"
        for key, spec in TOPS.items():
            img = base if spec is None else recolour(base, spec[0], spec[1], spec[2]) if spec != "white" else recolour(base, 0.1, 1, 1, white=True)
            img.save(f"{OUT}/{fid}-{key}.webp", "WEBP", quality=82, method=6)
        manifest["faces"].append({"id": fid, "female": female, "sheet": sheet, "n": i + 1})
names = ["agbada", "suit", "kaftan", "casual", "senator", "ankara"]
for i, n in enumerate(names):
    cut("outfits", i).save(f"{OUT}/m2-o-{n}.webp", "WEBP", quality=84, method=6); manifest["outfits"].append({"face": "m2", "id": n})
json.dump(manifest, open(f"{OUT}/index.json", "w"))
tot = sum(os.path.getsize(f"{OUT}/{f}") for f in os.listdir(OUT) if f.endswith(".webp")); print(f"{len(os.listdir(OUT)) - 2} files, {tot / 1024:.0f} KB")
