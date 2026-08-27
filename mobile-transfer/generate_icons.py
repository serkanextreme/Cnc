"""
Talaş — Mobil uygulama ikonu ve splash ekranı üretici.
Tasarım dili: design-tokens.json (koyu tema, amber #F4B942, teal #55C6C3)
Motif: CNC freze başlığı + talaş kaldırılan iş parçası (kullanıcının verdiği
referans ikonun Talaş marka paletiyle yeniden yorumlanmış hali).

Bu script /app/mobile-transfer/assets içine şu dosyaları üretir:
- icon.png            (1024x1024, dolu arka plan) -> app.json: expo.icon / expo.ios.icon
- adaptive-icon.png   (1024x1024, şeffaf, güvenli alan içinde) -> expo.android.adaptiveIcon.foregroundImage
- splash.png          (1284x2778, dikey) -> expo.splash.image
- favicon.png         (196x196) -> expo.web.favicon
"""
from PIL import Image, ImageDraw, ImageFont
import math

# --- Talaş design tokens -----------------------------------------------
BG = (17, 23, 25, 255)          # #111719 background
CARD = (24, 33, 35, 255)        # #182123 card
MUTED = (29, 41, 43, 255)       # #1D292B muted
BORDER = (52, 67, 70, 255)      # #344346 border
AMBER = (244, 185, 66, 255)     # #F4B942 primary
TEAL = (85, 198, 195, 255)      # #55C6C3 accent
FOREGROUND = (243, 247, 245, 255)  # #F3F7F5

FONT_HEAD = "/usr/share/fonts/truetype/liberation/LiberationSansNarrow-Bold.ttf"
FONT_BODY = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"


def draw_machine(draw, ox, oy, scale, bg_color):
    """Draws the CNC spindle-head + workpiece motif at origin (ox, oy) with
    the given scale. Local coordinate system is 600 wide x 680 tall."""

    def R(x, y, w, h):
        return (ox + x * scale, oy + y * scale, ox + (x + w) * scale, oy + (y + h) * scale)

    def rr(box, radius, fill):
        draw.rounded_rectangle(box, radius=radius * scale, fill=fill)

    # Top mounting bar
    rr(R(40, 0, 520, 90), 26, AMBER)

    # Spindle body block
    rr(R(90, 88, 420, 182), 24, TEAL)
    # vent / bolt cut-outs
    for cx in (150, 300, 450):
        rr(R(cx - 45, 168, 90, 46), 10, bg_color)

    # Neck ring (collet housing)
    rr(R(210, 268, 180, 64), 14, BORDER)
    rr(R(210, 300, 180, 26), 8, AMBER)

    # Tool holder tip
    rr(R(250, 330, 100, 66), 14, TEAL)

    # Tool bit shaft
    rr(R(280, 394, 40, 148), 10, AMBER)

    # Chip / spark marks flanking the bit
    spark_w = int(15 * scale)
    for (x1, y1, x2, y2) in [
        (232, 470, 175, 512), (368, 470, 425, 512),
        (222, 520, 168, 552), (378, 520, 432, 552),
    ]:
        draw.line(
            (ox + x1 * scale, oy + y1 * scale, ox + x2 * scale, oy + y2 * scale),
            fill=TEAL, width=max(spark_w, 6),
        )

    # Workpiece block
    rr(R(50, 560, 500, 92), 20, MUTED)
    # V-groove cut being machined
    draw.polygon(
        [
            (ox + 258 * scale, oy + 560 * scale),
            (ox + 300 * scale, oy + 612 * scale),
            (ox + 342 * scale, oy + 560 * scale),
        ],
        fill=bg_color,
    )
    # inspection holes
    for hx in (140, 460):
        rr(R(hx - 30, 596, 60, 26), 8, bg_color)

    # Base bar
    rr(R(15, 654, 570, 30), 12, BORDER)


def make_icon(path, size=1024, bg=BG, content_ratio=0.80):
    img = Image.new("RGBA", (size, size), bg)
    draw = ImageDraw.Draw(img)
    box_w, box_h = 600, 680
    target_w = size * content_ratio
    scale = target_w / box_w
    total_h = box_h * scale
    ox = (size - box_w * scale) / 2
    oy = (size - total_h) / 2
    draw_machine(draw, ox, oy, scale, bg)
    img.save(path)
    print("saved", path)


def make_adaptive_icon(path, size=1024, safe_ratio=0.40):
    """Transparent background, content confined to Android's safe zone
    (inner ~66% circle). We use a slightly smaller ratio for margin."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    box_w, box_h = 600, 680
    target_w = size * safe_ratio
    scale = target_w / box_w
    total_h = box_h * scale
    ox = (size - box_w * scale) / 2
    oy = (size - total_h) / 2
    # transparent "cut" areas must render as transparent, not BG color
    draw_machine(draw, ox, oy, scale, (0, 0, 0, 0))
    img.save(path)
    print("saved", path)


def make_splash(path, w=1284, h=2778):
    img = Image.new("RGBA", (w, h), BG)
    draw = ImageDraw.Draw(img)

    box_w, box_h = 600, 680
    target_w = w * 0.46
    scale = target_w / box_w
    total_h = box_h * scale
    ox = (w - box_w * scale) / 2
    oy = h * 0.32 - total_h / 2
    draw_machine(draw, ox, oy, scale, BG)

    # Wordmark "TALAŞ"
    title = "TALAŞ"
    title_size = int(w * 0.16)
    font_title = ImageFont.truetype(FONT_HEAD, title_size)
    # manual letter-spacing for a condensed/tracked look
    spacing = int(title_size * 0.08)
    widths = [draw.textlength(ch, font=font_title) for ch in title]
    total_title_w = sum(widths) + spacing * (len(title) - 1)
    tx = (w - total_title_w) / 2
    ty = oy + total_h + h * 0.045
    for ch, cw in zip(title, widths):
        draw.text((tx, ty), ch, font=font_title, fill=AMBER)
        tx += cw + spacing

    # Subtitle
    subtitle = "CNC KESME PARAMETRELERİ"
    sub_size = int(w * 0.032)
    font_sub = ImageFont.truetype(FONT_BODY, sub_size)
    sub_spacing = int(sub_size * 0.35)
    s_widths = [draw.textlength(ch, font=font_sub) for ch in subtitle]
    total_sub_w = sum(s_widths) + sub_spacing * (len(subtitle) - 1)
    sx = (w - total_sub_w) / 2
    sy = ty + title_size * 1.35
    for ch, cw in zip(subtitle, s_widths):
        draw.text((sx, sy), ch, font=font_sub, fill=(181, 195, 194, 255))
        sx += cw + sub_spacing

    img.convert("RGB").save(path)
    print("saved", path)


def make_favicon(path, size=196):
    make_icon(path, size=size, content_ratio=0.82)


if __name__ == "__main__":
    import os
    out_dir = os.path.join(os.path.dirname(__file__), "assets")
    os.makedirs(out_dir, exist_ok=True)
    make_icon(os.path.join(out_dir, "icon.png"))
    make_adaptive_icon(os.path.join(out_dir, "adaptive-icon.png"))
    make_splash(os.path.join(out_dir, "splash.png"))
    make_favicon(os.path.join(out_dir, "favicon.png"))
