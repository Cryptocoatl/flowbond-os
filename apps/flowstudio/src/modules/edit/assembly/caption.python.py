#!/usr/bin/env python3
"""Caption renderer — lyric line → transparent full-frame PNG (Pillow).

Used because this machine's ffmpeg lacks the drawtext filter. We render each cue
to a 1080x1920 RGBA PNG (centered, wrapped, white bold text with a stroke over a
semi-transparent rounded box) and let ffmpeg overlay them timed to the vocals.

Usage:  python3 caption.python.py <config.json>
Config: { width, height, font, fontSizeFrac, outDir, cues:[{text,start,end}] }
Out:    JSON [{png, start, end}] on stdout
Deps:   Pillow
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont


def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= max_w or not cur:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def render(cfg):
    W, H = cfg["width"], cfg["height"]
    size = int(H * cfg.get("fontSizeFrac", 0.05))
    font = ImageFont.truetype(cfg["font"], size)
    outdir = cfg["outDir"]
    os.makedirs(outdir, exist_ok=True)

    line_h = int(size * 1.28)
    pad = int(size * 0.45)
    out = []
    for i, cue in enumerate(cfg["cues"]):
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        lines = wrap(d, cue["text"], font, int(W * 0.86))
        block_h = line_h * len(lines)
        y0 = int(H * 0.70)
        box_w = max(d.textlength(l, font=font) for l in lines) + pad * 2
        x0 = (W - box_w) // 2
        d.rounded_rectangle(
            [x0, y0 - pad, x0 + box_w, y0 + block_h + pad // 2],
            radius=pad, fill=(0, 0, 0, 120),
        )
        y = y0
        for l in lines:
            x = (W - d.textlength(l, font=font)) // 2
            d.text((x, y), l, font=font, fill=(255, 255, 255, 255),
                   stroke_width=max(2, size // 16), stroke_fill=(0, 0, 0, 220))
            y += line_h
        png = os.path.join(outdir, f"cap-{i:02d}.png")
        img.save(png)
        out.append({"png": png, "start": cue["start"], "end": cue["end"]})
    return out


def main():
    with open(sys.argv[1]) as f:
        cfg = json.load(f)
    print(json.dumps(render(cfg)))


if __name__ == "__main__":
    main()
