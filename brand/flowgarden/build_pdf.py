"""
FlowGarden Brand Guidelines PDF.

Multi-page document covering:
  1. Cover
  2. Brand essence
  3. Logo system (mark, lockup, clearspace, minimum size)
  4. Color palette
  5. Typography
  6. Application examples / dos & don'ts
  7. Contact / colophon

Built with ReportLab's low-level canvas for full design control.
Output: /home/claude/flowgarden-brand-pack/FlowGarden-Brand-Guidelines.pdf
"""
import os
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image

PACK = '/home/claude/flowgarden-brand-pack'
OUT_PDF = os.path.join(PACK, 'FlowGarden-Brand-Guidelines.pdf')

# A4 landscape — feels closer to a real brand book
PAGE = landscape(A4)
PW, PH = PAGE  # 842 x 595 pt

# Brand colors
GOLD       = HexColor('#C9A961')
DARK_GREEN = HexColor('#0F2E1F')
SAGE       = HexColor('#8FA98F')
CREAM      = HexColor('#EFE8D8')
BLACK      = HexColor('#000000')
WHITE      = HexColor('#FFFFFF')

# Logo assets — use 2048px versions for crisp printing
MARK_GOLD       = os.path.join(PACK, 'mark/png/2048/flowgarden-mark-gold-2048.png')
MARK_CREAM      = os.path.join(PACK, 'mark/png/2048/flowgarden-mark-cream-2048.png')
MARK_DARK       = os.path.join(PACK, 'mark/png/2048/flowgarden-mark-dark-green-2048.png')
MARK_BLACK      = os.path.join(PACK, 'mark/png/2048/flowgarden-mark-black-2048.png')
LOCKUP_GOLD     = os.path.join(PACK, 'lockup/png/2048/flowgarden-lockup-gold-2048.png')
LOCKUP_CREAM    = os.path.join(PACK, 'lockup/png/2048/flowgarden-lockup-cream-2048.png')
LOCKUP_DARK     = os.path.join(PACK, 'lockup/png/2048/flowgarden-lockup-dark-green-2048.png')


def draw_bg(c, color):
    c.setFillColor(color)
    c.rect(0, 0, PW, PH, fill=1, stroke=0)


def draw_label(c, text, x, y, color, size=8, font='Helvetica'):
    """Tracked uppercase label in brand style."""
    c.setFillColor(color)
    c.setFont(font, size)
    # Add letter-spacing by drawing chars individually
    cur_x = x
    for ch in text:
        c.drawString(cur_x, y, ch)
        cur_x += c.stringWidth(ch, font, size) + size * 0.25


def draw_text(c, text, x, y, color, size=10, font='Helvetica'):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, text)


# ============================================================================
# PAGES
# ============================================================================

def page_cover(c):
    """Page 1 — Cover."""
    draw_bg(c, DARK_GREEN)

    # Centered mark
    mark_size = 200
    c.drawImage(MARK_GOLD, (PW - mark_size)/2, PH/2 - 20,
                mark_size, mark_size, mask='auto')

    # Title below
    c.setFillColor(GOLD)
    c.setFont('Helvetica', 28)
    text = 'FLOWGARDEN'
    # Letter-spaced
    total_w = sum(c.stringWidth(ch, 'Helvetica', 28) + 28*0.25 for ch in text)
    cur_x = (PW - total_w) / 2
    for ch in text:
        c.drawString(cur_x, PH/2 - 50, ch)
        cur_x += c.stringWidth(ch, 'Helvetica', 28) + 28*0.25

    # Tagline
    c.setFont('Helvetica', 10)
    tag = 'GROW  ·  FLOW  ·  THRIVE'
    tag_w = c.stringWidth(tag, 'Helvetica', 10) + 10*0.3*len(tag)
    cur_x = (PW - tag_w) / 2
    for ch in tag:
        c.drawString(cur_x, PH/2 - 80, ch)
        cur_x += c.stringWidth(ch, 'Helvetica', 10) + 10*0.3

    # Document title bottom
    c.setFillColor(CREAM)
    c.setFont('Helvetica', 11)
    c.drawString(40, 40, 'Brand Guidelines')

    c.setFont('Helvetica', 9)
    c.drawRightString(PW - 40, 40, 'Version 1.0')

    c.showPage()


def page_essence(c):
    """Page 2 — Brand essence."""
    draw_bg(c, CREAM)

    # Header
    draw_label(c, 'BRAND ESSENCE', 40, PH - 50, GOLD, size=9)

    # Essence statement
    c.setFillColor(DARK_GREEN)
    c.setFont('Helvetica', 28)
    statement = [
        'A living ecosystem',
        'where growth is effortless,',
        'connected and abundant.',
    ]
    for i, line in enumerate(statement):
        c.drawString(40, PH - 130 - i*36, line)

    # Pillars on the right
    pillars = [
        ('NATURE',     'Rooted in regenerative ecosystems and biological principles.'),
        ('FLOW',       'Energy, information, and value move without friction.'),
        ('TECHNOLOGY', 'Infrastructure that disappears so what matters can grow.'),
        ('HARMONY',    'Designed integration between systems, communities, and place.'),
        ('GROWTH',     'Compounding outcomes through patient, intentional building.'),
    ]
    y = PH - 130
    for label, desc in pillars:
        draw_label(c, label, PW - 280, y, GOLD, size=8)
        c.setFillColor(DARK_GREEN)
        c.setFont('Helvetica', 9)
        c.drawString(PW - 280, y - 14, desc)
        y -= 38

    # Mark watermark bottom-right
    c.drawImage(MARK_GOLD, PW - 90, 30, 60, 60, mask='auto')

    # Footer
    draw_label(c, 'FLOWGARDEN  /  02', 40, 30, DARK_GREEN, size=7)

    c.showPage()


def page_logo_system(c):
    """Page 3 — Logo system. Clean top-down layout."""
    draw_bg(c, CREAM)
    draw_label(c, 'LOGO SYSTEM', 40, PH - 50, GOLD, size=9)

    # === TOP ROW (three columns, each block ~250pt tall) ===
    # Y positions for top row (PDF y is inverted, so we work from top)
    row1_label_y = PH - 90       # column label baseline
    row1_img_top = PH - 110      # image top
    row1_img_h   = 130
    row1_desc_y  = row1_img_top - row1_img_h - 20  # description text below image

    # Column 1: Primary mark
    draw_label(c, 'PRIMARY MARK', 40, row1_label_y, DARK_GREEN, size=8)
    c.drawImage(MARK_GOLD, 40, row1_img_top - row1_img_h, row1_img_h, row1_img_h, mask='auto')
    c.setFillColor(DARK_GREEN)
    c.setFont('Helvetica', 9)
    c.drawString(40, row1_desc_y,      'The signature element of the brand.')
    c.drawString(40, row1_desc_y - 14, 'Use as an icon, monogram, or anchor.')

    # Column 2: Full lockup
    draw_label(c, 'FULL LOCKUP', 290, row1_label_y, DARK_GREEN, size=8)
    # Lockup aspect ~ 1.37 wide, fit height to row1_img_h
    lockup_w = int(row1_img_h * 1.37)
    c.drawImage(LOCKUP_GOLD, 290, row1_img_top - row1_img_h,
                lockup_w, row1_img_h, mask='auto')
    c.setFillColor(DARK_GREEN)
    c.setFont('Helvetica', 9)
    c.drawString(290, row1_desc_y,      'Use the full lockup for first-impression')
    c.drawString(290, row1_desc_y - 14, 'contexts: headers, packaging, decks.')

    # Column 3: Clearspace
    draw_label(c, 'CLEARSPACE', 600, row1_label_y, DARK_GREEN, size=8)
    cs_x = 620
    cs_y_top = row1_img_top
    cs_size = row1_img_h
    # Clearspace dashed box
    c.setStrokeColor(SAGE)
    c.setDash(3, 3)
    c.setLineWidth(0.5)
    c.rect(cs_x - 16, cs_y_top - cs_size - 16,
           cs_size + 32, cs_size + 32, fill=0, stroke=1)
    c.setDash()
    c.drawImage(MARK_GOLD, cs_x, cs_y_top - cs_size, cs_size, cs_size, mask='auto')
    c.setFillColor(DARK_GREEN)
    c.setFont('Helvetica', 9)
    c.drawString(600, row1_desc_y,      'Minimum clearspace = 1/4 of the')
    c.drawString(600, row1_desc_y - 14, "mark's diameter on all sides.")

    # === BOTTOM ROW (two columns) ===
    row2_label_y = PH - 340
    row2_img_top = PH - 360
    row2_img_h   = 90

    # Column 1: Minimum mark sizes — three demos at 24, 40, 60px
    draw_label(c, 'MINIMUM SIZE — MARK', 40, row2_label_y, DARK_GREEN, size=8)
    sizes_demo = [(24, '24px'), (40, '40px'), (60, '60px')]
    img_baseline = row2_img_top - row2_img_h
    slot_w = 80
    for i, (sz, lbl) in enumerate(sizes_demo):
        slot_x = 40 + i * slot_w
        # Align all three on a common bottom line
        c.drawImage(MARK_GOLD,
                    slot_x + (60 - sz) / 2,
                    img_baseline + (60 - sz) / 2,
                    sz, sz, mask='auto')
        c.setFillColor(DARK_GREEN)
        c.setFont('Helvetica', 7)
        c.drawString(slot_x + 8, img_baseline - 12, lbl)
    c.setFillColor(DARK_GREEN)
    c.setFont('Helvetica', 8)
    c.drawString(40, img_baseline - 38,
                 'Favicon: 24px min  ·  Web: 40px min  ·  Print: 60px / ~21mm min')

    # Column 2: Minimum lockup size
    draw_label(c, 'MINIMUM SIZE — LOCKUP', 360, row2_label_y, DARK_GREEN, size=8)
    # Lockup at 160px wide, with description to the right
    lockup_small_w = 160
    lockup_small_h = int(lockup_small_w / 1.37)
    c.drawImage(LOCKUP_GOLD, 360,
                row2_img_top - lockup_small_h,
                lockup_small_w, lockup_small_h, mask='auto')
    c.setFillColor(DARK_GREEN)
    c.setFont('Helvetica', 8)
    c.drawString(540, row2_img_top - 20, 'Lockup minimum width:')
    c.drawString(540, row2_img_top - 34, '80px digital  /  30mm print')
    c.drawString(540, row2_img_top - 56, 'Below 80px, drop the tagline.')
    c.drawString(540, row2_img_top - 70, 'Below 50px, use the mark only.')

    draw_label(c, 'FLOWGARDEN  /  03', 40, 30, DARK_GREEN, size=7)
    c.showPage()


def page_colors(c):
    """Page 4 — Color palette."""
    draw_bg(c, CREAM)
    draw_label(c, 'COLOR PALETTE', 40, PH - 50, GOLD, size=9)

    # Primary row
    c.setFillColor(DARK_GREEN)
    c.setFont('Helvetica', 14)
    c.drawString(40, PH - 90, 'Primary')

    primaries = [
        ('DARK FOREST', '#0F2E1F', DARK_GREEN, CREAM, '5535 C'),
        ('GOLD',        '#C9A961', GOLD,       DARK_GREEN, '871 C (metallic)'),
    ]
    SWATCH_W, SWATCH_H = 240, 150
    SWATCH_Y_TOP = PH - 110
    x = 40
    for label, hex_code, fill, text_color, pms in primaries:
        # Draw swatch
        c.setFillColor(fill)
        c.rect(x, SWATCH_Y_TOP - SWATCH_H, SWATCH_W, SWATCH_H, fill=1, stroke=0)
        # Hex code on swatch (large)
        c.setFillColor(text_color)
        c.setFont('Helvetica', 22)
        c.drawString(x + 16, SWATCH_Y_TOP - 40, hex_code)
        # Label below swatch (in dark green on cream)
        c.setFillColor(DARK_GREEN)
        c.setFont('Helvetica-Bold', 10)
        draw_label(c, label, x, SWATCH_Y_TOP - SWATCH_H - 18, DARK_GREEN, size=9)
        # Specs
        rgb = tuple(int(hex_code[i:i+2], 16) for i in (1, 3, 5))
        c.setFillColor(DARK_GREEN)
        c.setFont('Helvetica', 8)
        c.drawString(x, SWATCH_Y_TOP - SWATCH_H - 36, f'RGB  {rgb[0]} {rgb[1]} {rgb[2]}')
        c.drawString(x, SWATCH_Y_TOP - SWATCH_H - 48, f'HEX  {hex_code}')
        c.drawString(x, SWATCH_Y_TOP - SWATCH_H - 60, f'PMS  {pms}')
        x += 260
    c.setFillColor(DARK_GREEN)
    c.setFont('Helvetica', 14)
    SEC_LABEL_Y = PH - 360
    c.drawString(40, SEC_LABEL_Y, 'Secondary')

    secondaries = [
        ('SAGE',  '#8FA98F', SAGE,  DARK_GREEN),
        ('CREAM', '#EFE8D8', CREAM, DARK_GREEN),
        ('BLACK', '#000000', BLACK, CREAM),
        ('WHITE', '#FFFFFF', WHITE, DARK_GREEN),
    ]
    SEC_W, SEC_H = 165, 100
    SEC_Y_TOP = PH - 380
    x = 40
    for label, hex_code, fill, text_color in secondaries:
        c.setFillColor(fill)
        if hex_code == '#FFFFFF':
            c.setStrokeColor(SAGE)
            c.setLineWidth(0.5)
            c.rect(x, SEC_Y_TOP - SEC_H, SEC_W, SEC_H, fill=1, stroke=1)
        else:
            c.rect(x, SEC_Y_TOP - SEC_H, SEC_W, SEC_H, fill=1, stroke=0)
        # Hex on swatch
        c.setFillColor(text_color)
        c.setFont('Helvetica', 13)
        c.drawString(x + 12, SEC_Y_TOP - 28, hex_code)
        # Label below
        draw_label(c, label, x, SEC_Y_TOP - SEC_H - 18, DARK_GREEN, size=8)
        # RGB below label
        rgb = tuple(int(hex_code[i:i+2], 16) for i in (1, 3, 5))
        c.setFillColor(DARK_GREEN)
        c.setFont('Helvetica', 7)
        c.drawString(x, SEC_Y_TOP - SEC_H - 32, f'RGB  {rgb[0]} {rgb[1]} {rgb[2]}')
        x += 180

    draw_label(c, 'FLOWGARDEN  /  04', 40, 30, DARK_GREEN, size=7)
    c.showPage()


def page_typography(c):
    """Page 5 — Typography."""
    draw_bg(c, CREAM)
    draw_label(c, 'TYPOGRAPHY', 40, PH - 50, GOLD, size=9)

    # Headline pair name
    c.setFillColor(DARK_GREEN)
    c.setFont('Helvetica', 14)
    c.drawString(40, PH - 90, 'A serif anchor, a sans for clarity.')

    # Playfair Display (serif) - we don't have the font, use Times approximation
    draw_label(c, 'SERIF — PLAYFAIR DISPLAY', 40, PH - 140, GOLD, size=8)
    c.setFillColor(DARK_GREEN)
    c.setFont('Times-Roman', 96)
    c.drawString(40, PH - 240, 'Aa')
    c.setFont('Times-Italic', 24)
    c.drawString(180, PH - 200, 'Titles & elegant emphasis')
    c.setFont('Helvetica', 9)
    c.drawString(180, PH - 220, 'Used for hero headlines, brand statements, editorial')
    c.drawString(180, PH - 232, 'moments. Sets a literary, considered tone.')

    # Satoshi (sans) - use Helvetica as approximation
    draw_label(c, 'SANS — SATOSHI', 40, PH - 290, GOLD, size=8)
    c.setFillColor(DARK_GREEN)
    c.setFont('Helvetica-Bold', 96)
    c.drawString(40, PH - 390, 'Aa')
    c.setFont('Helvetica', 24)
    c.drawString(180, PH - 350, 'Simplicity & clarity')
    c.setFont('Helvetica', 9)
    c.drawString(180, PH - 370, 'Used for UI, body copy, captions, data, navigation.')
    c.drawString(180, PH - 382, 'Workhorse type — reads cleanly at any size.')

    # Hierarchy examples
    draw_label(c, 'HIERARCHY', 40, PH - 440, GOLD, size=8)
    c.setFillColor(DARK_GREEN)
    c.setFont('Times-Roman', 24)
    c.drawString(40, PH - 470, 'H1 — Section heading')
    c.setFont('Helvetica-Bold', 14)
    c.drawString(40, PH - 490, 'H2 — Sub-heading in sans')
    c.setFont('Helvetica', 11)
    c.drawString(40, PH - 508, 'Body — clear, generous line-height, optimized for reading at 11–14pt')
    c.setFont('Helvetica', 8)
    c.drawString(40, PH - 522, 'Caption — supporting metadata and labels in tracked uppercase or smaller weight')

    draw_label(c, 'FLOWGARDEN  /  05', 40, 30, DARK_GREEN, size=7)
    c.showPage()


def page_applications(c):
    """Page 6 — Applications: dos & don'ts."""
    draw_bg(c, CREAM)
    draw_label(c, 'APPLICATION', 40, PH - 50, GOLD, size=9)

    c.setFillColor(DARK_GREEN)
    c.setFont('Helvetica', 14)
    c.drawString(40, PH - 90, 'Where the mark lives.')

    # Surface examples — show mark on different backgrounds
    surfaces = [
        ('Dark Forest',    DARK_GREEN, MARK_GOLD),
        ('Cream',          CREAM,      MARK_DARK),
        ('Sage',           SAGE,       MARK_CREAM),
        ('Black',          BLACK,      MARK_GOLD),
    ]
    x = 40
    for label, bg, mark_path in surfaces:
        c.setFillColor(bg)
        if bg == CREAM:
            c.setStrokeColor(SAGE)
            c.setLineWidth(0.5)
            c.rect(x, PH - 280, 180, 140, fill=1, stroke=1)
        else:
            c.rect(x, PH - 280, 180, 140, fill=1, stroke=0)
        c.drawImage(mark_path, x + 50, PH - 270, 80, 80, mask='auto')
        c.setFillColor(DARK_GREEN)
        c.setFont('Helvetica', 8)
        c.drawString(x, PH - 295, label)
        x += 195

    # Do's and Don'ts
    draw_label(c, 'DO', 40, PH - 340, GOLD, size=8)
    c.setFillColor(DARK_GREEN)
    c.setFont('Helvetica', 9)
    dos = [
        'Use the mark in approved brand colors only',
        'Maintain minimum clearspace at all times',
        'Place on backgrounds with sufficient contrast',
        'Scale proportionally — never stretch or squash',
        'Use the lockup when first-time introducing the brand',
    ]
    for i, item in enumerate(dos):
        c.drawString(50, PH - 360 - i*14, f'·  {item}')

    draw_label(c, "DON'T", 440, PH - 340, GOLD, size=8)
    c.setFillColor(DARK_GREEN)
    donts = [
        'Recolor the mark outside the approved palette',
        'Add effects (drop shadows, glows, outlines)',
        'Rotate or skew the mark or lockup',
        'Crop or overlap the mark with other elements',
        'Use the mark on busy or low-contrast photography',
    ]
    for i, item in enumerate(donts):
        c.drawString(450, PH - 360 - i*14, f'·  {item}')

    draw_label(c, 'FLOWGARDEN  /  06', 40, 30, DARK_GREEN, size=7)
    c.showPage()


def page_colophon(c):
    """Page 7 — Closing / colophon."""
    draw_bg(c, DARK_GREEN)

    # Centered mark, smaller
    mark_size = 80
    c.drawImage(MARK_GOLD, (PW - mark_size)/2, PH - 180,
                mark_size, mark_size, mask='auto')

    # Statement
    c.setFillColor(CREAM)
    c.setFont('Helvetica', 18)
    statement = [
        'Everything flows.',
        'Everything grows.',
        'Everything connects.',
    ]
    y = PH/2 - 30
    for line in statement:
        w = c.stringWidth(line, 'Helvetica', 18)
        c.drawString((PW - w)/2, y, line)
        y -= 28

    # Colophon
    c.setFillColor(GOLD)
    c.setFont('Helvetica', 8)
    c.drawCentredString(PW/2, 80, 'FLOWGARDEN  ·  BRAND GUIDELINES  ·  v1.0')
    c.setFillColor(CREAM)
    c.setFont('Helvetica', 7)
    c.drawCentredString(PW/2, 65, 'For asset requests or brand questions, contact the brand team.')

    c.showPage()


# ============================================================================
# BUILD
# ============================================================================

def build():
    c = rl_canvas.Canvas(OUT_PDF, pagesize=PAGE)
    c.setTitle('FlowGarden Brand Guidelines')
    c.setAuthor('FlowGarden')
    c.setSubject('Brand Guidelines v1.0')

    page_cover(c)
    page_essence(c)
    page_logo_system(c)
    page_colors(c)
    page_typography(c)
    page_applications(c)
    page_colophon(c)

    c.save()
    print(f"Built {OUT_PDF}")


if __name__ == '__main__':
    build()
