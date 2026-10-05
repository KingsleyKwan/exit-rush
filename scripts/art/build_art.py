#!/usr/bin/env python3
"""
Build the v0.3 web / store image assets from the Grok Image concept art.

    python3 scripts/art/build_art.py [--src /workspace/art-src]

Inputs (1280x720 JPEGs, generated with Grok Image):
  concept_characters.jpg  key_art_platform.jpg  app_icon_raw.jpg
Outputs:
  public/icons/{icon-512,icon-192,apple-touch-icon,favicon-32}.png
  public/art/key-art.webp          title / menu background (cover-fit)
  public/art/portraits.webp        8x160px passenger portrait strip (alpha)
  store/app-icon-1024.png, store/capsule-1920x1080.jpg, store/capsule-460x215.jpg
Requires Pillow + numpy (and Noto Sans CJK for the capsule wordmark, optional).
"""
import argparse
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PORTRAIT_ORDER = ['hero', 'normal', 'stench', 'family', 'brat', 'couple', 'angry', 'luggage']
# (centre x, top y, size, keep-from x, keep-to x) in 1024-wide preview coordinates.
PORTRAIT_CROPS = {
    'hero': (85, 122, 152, 0, 150),
    'normal': (205, 128, 152, 156, 262),
    'stench': (318, 100, 165, 258, 385),
    'family': (466, 148, 192, 382, 545),
    'brat': (594, 168, 150, 549, 636),
    'couple': (698, 132, 172, 634, 766),
    'angry': (822, 132, 155, 758, 882),
    'luggage': (942, 160, 205, 882, 1024),
}
CJK_FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'


def out(*parts):
    p = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def build_icon(src_dir):
    src = Image.open(os.path.join(src_dir, 'app_icon_raw.jpg')).convert('RGB')
    im = src.crop((216, 0, 1068, 714))  # red rounded door frame (slightly inset at the sides)
    w, h = im.size
    a = np.array(im).astype(np.int32)
    white = ((a[..., 0] > 190) & (a[..., 1] > 175) & (a[..., 2] > 175)).astype(np.uint8) * 255
    wm = Image.fromarray(white).copy()
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if wm.getpixel(seed) == 255:
            ImageDraw.floodfill(wm, seed, 128)
    outside = np.array(Image.fromarray(((np.array(wm) == 128) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 0
    fill = np.median(a[300:420, 4:20].reshape(-1, 3), axis=0)
    a[outside] = fill
    # Pad to a square by stretching the outer frame rows, then smooth the streaks.
    pt = (w - h) // 2
    pb = w - h - pt
    arr = np.pad(a, ((pt, pb), (0, 0), (0, 0)), mode='edge').astype(np.uint8)
    sq = Image.fromarray(arr)
    for (y0, y1) in [(0, pt + 6), (w - pb - 6, w)]:
        band = sq.crop((0, y0, w, y1)).filter(ImageFilter.BoxBlur(18))
        sq.paste(band, (0, y0))
    sq = sq.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    big = sq.resize((1024, 1024), Image.LANCZOS).convert('RGB')  # full bleed, no alpha (iOS rounds it)
    big.save(out('store', 'app-icon-1024.png'), optimize=True)
    # Web copies: palette-quantised PNGs keep the build small (the 1024 lives in store/ only).
    for size, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png'), (32, 'favicon-32.png')]:
        ic = big.resize((size, size), Image.LANCZOS)
        if size >= 180:
            ic = ic.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
        ic.save(out('public', 'icons', name), optimize=True)


def wordmark(img, scale):
    """Overlay the bilingual logo lockup (store capsules only)."""
    if not os.path.exists(CJK_FONT):
        return img
    d = ImageDraw.Draw(img, 'RGBA')
    W, H = img.size
    zh = ImageFont.truetype(CJK_FONT, int(118 * scale), index=4)  # Noto Sans CJK HK
    en = ImageFont.truetype(CJK_FONT, int(44 * scale), index=4)
    x, y = int(56 * scale), int(H - 250 * scale)
    pad = int(22 * scale)
    tw = max(d.textlength('逼落車', font=zh), d.textlength('EXIT RUSH', font=en))
    d.rounded_rectangle((x - pad, y - pad, x + tw + pad, y + int(190 * scale)), radius=int(26 * scale), fill=(176, 28, 46, 235))
    d.text((x, y - int(18 * scale)), '逼落車', font=zh, fill=(255, 255, 255, 255))
    d.text((x + int(4 * scale), y + int(122 * scale)), 'EXIT RUSH', font=en, fill=(255, 255, 255, 255))
    return img


def build_key_art(src_dir):
    src = Image.open(os.path.join(src_dir, 'key_art_platform.jpg')).convert('RGB')
    src.save(out('public', 'art', 'key-art.webp'), 'WEBP', quality=70, method=6)
    cap = src.resize((1920, 1080), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=50, threshold=3))
    wordmark(cap, 1.0).save(out('store', 'capsule-1920x1080.jpg'), quality=88, optimize=True, progressive=True)
    # Small capsule (460x215 ≈ 2.14:1): keep fireworks + train door, logo on the left.
    w, h = src.size
    ch = int(w / (460 / 215))
    small = src.crop((0, 40, w, 40 + ch)).resize((920, 430), Image.LANCZOS)
    small = wordmark(small, 0.62).resize((460, 215), Image.LANCZOS)
    small.save(out('store', 'capsule-460x215.jpg'), quality=90, optimize=True)


def build_portraits(src_dir):
    src = Image.open(os.path.join(src_dir, 'concept_characters.jpg')).convert('RGB')
    a = np.array(src).astype(np.int32)
    H, W = a.shape[:2]
    # Background = smooth grey gradient: flood-fill "near row background" from the borders.
    rowbg = (a[:, :8].mean(axis=1) + a[:, -8:].mean(axis=1)) / 2
    near = ((np.abs(a - rowbg[:, None, :]).sum(axis=2) < 34) * 255).astype(np.uint8)
    nm = Image.fromarray(near).copy()
    seeds = [(x, y) for x in range(0, W, 40) for y in (0, H - 1)] + [(x, y) for y in range(0, H, 40) for x in (0, W - 1)]
    for s in seeds:
        if nm.getpixel(s) == 255:
            ImageDraw.floodfill(nm, s, 128)
    alpha = Image.fromarray(((np.array(nm) != 128) * 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    S = W / 1024
    P = 160
    sheet = Image.new('RGBA', (P * len(PORTRAIT_ORDER), P), (0, 0, 0, 0))
    for i, name in enumerate(PORTRAIT_ORDER):
        cx, y, s, xa, xb = PORTRAIT_CROPS[name]
        al = np.array(alpha).copy()
        al[:, : int(xa * S)] = 0
        al[:, int(xb * S):] = 0
        iso = src.copy()
        iso.putalpha(Image.fromarray(al))
        x = cx - s / 2
        box = tuple(int(v * S) for v in (x, y, x + s, y + s))
        sheet.alpha_composite(iso.crop(box).resize((P, P), Image.LANCZOS), (i * P, 0))
    sheet.save(out('public', 'art', 'portraits.webp'), 'WEBP', quality=82, method=6)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=os.path.join(ROOT, '..', 'art-src'))
    args = ap.parse_args()
    build_icon(args.src)
    build_key_art(args.src)
    build_portraits(args.src)
    for d in ['public/icons', 'public/art', 'store']:
        for f in sorted(os.listdir(os.path.join(ROOT, d))):
            print(f'{d}/{f}', os.path.getsize(os.path.join(ROOT, d, f)))
