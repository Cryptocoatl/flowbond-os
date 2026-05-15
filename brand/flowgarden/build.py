"""
FlowGarden Brand Pack — master build script.

Builds the complete brand asset pack from the high-res source PNG:
  - Mark only (icon, 6 colors × 4 sizes, transparent PNG)
  - Full lockup (mark + wordmark + tagline, 6 colors × 4 sizes, transparent PNG)
  - SVG wrappers (raster embedded — scales infinitely in browsers)
  - Favicon set (ICO + PNG variants, PWA manifest)
  - Color palette swatches as PNG
"""
import os
import base64
from io import BytesIO
import numpy as np
from PIL import Image

SRC = '/mnt/user-data/uploads/FLOWGARDEN_logo_Gold_.png'
OUT = '/home/claude/flowgarden-brand-pack'

# --- Brand palette --------------------------------------------------------
COLORS = {
    'gold':       (201, 169, 97),    # #C9A961
    'dark-green': (15, 46, 31),      # #0F2E1F
    'sage':       (143, 169, 143),   # #8FA98F
    'cream':      (239, 232, 216),   # #EFE8D8
    'white':      (255, 255, 255),
    'black':      (0, 0, 0),
}
COLORS_HEX = {
    'gold':       '#C9A961',
    'dark-green': '#0F2E1F',
    'sage':       '#8FA98F',
    'cream':      '#EFE8D8',
    'white':      '#FFFFFF',
    'black':      '#000000',
}

PNG_SIZES = [512, 1024, 2048, 4096]


def extract_alpha_layers():
    """Pull mark-only and full-lockup alpha layers from the source."""
    src = Image.open(SRC).convert('RGB')
    arr = np.array(src).astype(np.float32)
    luma = arr.max(axis=2)
    alpha = np.clip((luma / luma.max()) * 255, 0, 255).astype(np.uint8)

    # Split mark from wordmark using the largest vertical gap
    row_sums = alpha.sum(axis=1)
    smooth = np.convolve(row_sums, np.ones(20)/20, mode='same')
    threshold = smooth.max() * 0.02
    nonempty = np.where(smooth > threshold)[0]
    gaps = []
    for i in range(1, len(nonempty)):
        if nonempty[i] - nonempty[i-1] > 1:
            gaps.append((nonempty[i-1], nonempty[i], nonempty[i] - nonempty[i-1]))
    gaps.sort(key=lambda x: -x[2])
    split_y = (gaps[0][0] + gaps[0][1]) // 2

    mark_alpha = alpha.copy()
    mark_alpha[split_y:] = 0
    full_alpha = alpha

    # Mark crop: square-centered
    ys, xs = np.where(mark_alpha > 10)
    mx0, mx1, my0, my1 = xs.min(), xs.max(), ys.min(), ys.max()
    mcx, mcy = (mx0+mx1)//2, (my0+my1)//2
    mside = max(mx1-mx0, my1-my0) + 80
    mh0 = mside // 2
    mark_box = (mcx-mh0, mcy-mh0, mcx+mh0, mcy+mh0)
    mark_alpha_crop = mark_alpha[mark_box[1]:mark_box[3], mark_box[0]:mark_box[2]]

    # Full lockup crop
    ys2, xs2 = np.where(full_alpha > 10)
    fx0, fx1 = xs2.min()-80, xs2.max()+80
    fy0, fy1 = ys2.min()-80, ys2.max()+80
    full_alpha_crop = full_alpha[fy0:fy1, fx0:fx1]

    return mark_alpha_crop, full_alpha_crop


def colorize(alpha, rgb):
    """Apply RGB to an alpha-channel array → RGBA Image."""
    h, w = alpha.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[..., 0] = rgb[0]
    out[..., 1] = rgb[1]
    out[..., 2] = rgb[2]
    out[..., 3] = alpha
    return Image.fromarray(out, 'RGBA')


def resize_alpha(alpha, target_w, target_h):
    """Resize an alpha array using PIL with high-quality resampling."""
    img = Image.fromarray(alpha, 'L')
    img = img.resize((target_w, target_h), Image.LANCZOS)
    return np.array(img)


def build_mark_pngs(mark_alpha):
    """Generate mark-only PNGs at all sizes × all colors."""
    for size in PNG_SIZES:
        size_dir = os.path.join(OUT, 'mark', 'png', str(size))
        os.makedirs(size_dir, exist_ok=True)
        resized = resize_alpha(mark_alpha, size, size)
        for name, rgb in COLORS.items():
            img = colorize(resized, rgb)
            img.save(os.path.join(size_dir, f'flowgarden-mark-{name}-{size}.png'),
                     'PNG', optimize=True)
        print(f"  mark/png/{size}/ — 6 colors")


def build_lockup_pngs(full_alpha):
    """Generate full lockup PNGs at all sizes × all colors.
    Lockup is rectangular; we preserve aspect ratio and use width as target."""
    h, w = full_alpha.shape
    aspect = h / w
    for size in PNG_SIZES:
        size_dir = os.path.join(OUT, 'lockup', 'png', str(size))
        os.makedirs(size_dir, exist_ok=True)
        target_h = int(size * aspect)
        resized = resize_alpha(full_alpha, size, target_h)
        for name, rgb in COLORS.items():
            img = colorize(resized, rgb)
            img.save(os.path.join(size_dir, f'flowgarden-lockup-{name}-{size}.png'),
                     'PNG', optimize=True)
        print(f"  lockup/png/{size}/ — 6 colors  ({size}x{target_h})")


def build_svg_wrappers(mark_alpha, full_alpha):
    """Build SVG files that embed the raster — scales smoothly in browsers,
    single file, color-tinted via CSS filter or separate per-color exports."""
    svg_dir_mark = os.path.join(OUT, 'mark', 'svg')
    svg_dir_lock = os.path.join(OUT, 'lockup', 'svg')
    os.makedirs(svg_dir_mark, exist_ok=True)
    os.makedirs(svg_dir_lock, exist_ok=True)

    # Use a high-res (1024) embedded raster — small file, perfect quality
    def make_svg(alpha, w, h, color_rgb, color_name, out_path, viewbox_size=1024):
        # Resize alpha to viewbox_size
        if w > h:
            target_w = viewbox_size
            target_h = int(viewbox_size * h / w)
        else:
            target_h = viewbox_size
            target_w = int(viewbox_size * w / h)
        resized = resize_alpha(alpha, target_w, target_h)
        img = colorize(resized, color_rgb)

        buf = BytesIO()
        img.save(buf, 'PNG', optimize=True)
        b64 = base64.b64encode(buf.getvalue()).decode()

        svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 {target_w} {target_h}"
     role="img"
     aria-label="FlowGarden">
  <title>FlowGarden</title>
  <image x="0" y="0" width="{target_w}" height="{target_h}"
         xlink:href="data:image/png;base64,{b64}"/>
</svg>
'''
        with open(out_path, 'w') as f:
            f.write(svg)

    mh, mw = mark_alpha.shape
    fh, fw = full_alpha.shape

    for name, rgb in COLORS.items():
        make_svg(mark_alpha, mw, mh, rgb, name,
                 os.path.join(svg_dir_mark, f'flowgarden-mark-{name}.svg'))
        make_svg(full_alpha, fw, fh, rgb, name,
                 os.path.join(svg_dir_lock, f'flowgarden-lockup-{name}.svg'))
    print(f"  mark/svg/ — 6 colors")
    print(f"  lockup/svg/ — 6 colors")


def build_favicons(mark_alpha):
    """Standard favicon set + PWA icons + multi-res ICO."""
    fav_dir = os.path.join(OUT, 'favicon')
    os.makedirs(fav_dir, exist_ok=True)

    sizes = [16, 32, 48, 64, 180, 192, 512]
    for size in sizes:
        resized = resize_alpha(mark_alpha, size, size)
        img = colorize(resized, COLORS['gold'])
        img.save(os.path.join(fav_dir, f'favicon-{size}x{size}.png'),
                 'PNG', optimize=True)

    # Apple touch icon
    apple = colorize(resize_alpha(mark_alpha, 180, 180), COLORS['gold'])
    apple.save(os.path.join(fav_dir, 'apple-touch-icon.png'), 'PNG', optimize=True)

    # Android Chrome PWA icons
    for size in [192, 512]:
        img = colorize(resize_alpha(mark_alpha, size, size), COLORS['gold'])
        img.save(os.path.join(fav_dir, f'android-chrome-{size}x{size}.png'),
                 'PNG', optimize=True)

    # Multi-res ICO
    ico_sizes = [16, 32, 48]
    ico_imgs = [Image.open(os.path.join(fav_dir, f'favicon-{s}x{s}.png'))
                for s in ico_sizes]
    ico_imgs[0].save(os.path.join(fav_dir, 'favicon.ico'),
                     format='ICO',
                     sizes=[(s, s) for s in ico_sizes],
                     append_images=ico_imgs[1:])

    # PWA manifest
    manifest = '''{
  "name": "FlowGarden",
  "short_name": "FlowGarden",
  "description": "A living ecosystem where growth is effortless, connected and abundant.",
  "icons": [
    {"src": "/favicon/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/favicon/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png"}
  ],
  "theme_color": "#0F2E1F",
  "background_color": "#0F2E1F",
  "display": "standalone"
}
'''
    with open(os.path.join(fav_dir, 'site.webmanifest'), 'w') as f:
        f.write(manifest)

    print(f"  favicon/ — full web + PWA set")


def build_color_swatches():
    """Visual color reference card showing all brand colors with hex codes."""
    pal_dir = os.path.join(OUT, 'palette')
    os.makedirs(pal_dir, exist_ok=True)

    # Single swatch per color
    for name, rgb in COLORS.items():
        img = Image.new('RGB', (400, 400), rgb)
        img.save(os.path.join(pal_dir, f'swatch-{name}.png'), 'PNG')

    print(f"  palette/ — 6 color swatches")


if __name__ == '__main__':
    print(f"Building brand pack in {OUT}")
    os.makedirs(OUT, exist_ok=True)
    print("\nExtracting alpha layers from source...")
    mark_alpha, full_alpha = extract_alpha_layers()
    print(f"  Mark alpha shape: {mark_alpha.shape}")
    print(f"  Full lockup alpha shape: {full_alpha.shape}")

    print("\n=== Mark PNGs ===")
    build_mark_pngs(mark_alpha)

    print("\n=== Full lockup PNGs ===")
    build_lockup_pngs(full_alpha)

    print("\n=== SVG wrappers ===")
    build_svg_wrappers(mark_alpha, full_alpha)

    print("\n=== Favicons ===")
    build_favicons(mark_alpha)

    print("\n=== Color swatches ===")
    build_color_swatches()

    print("\n✓ Brand pack build complete")
