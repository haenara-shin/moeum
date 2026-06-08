"""모음 앱 아이콘 생성 — PIL로 1024x1024 PNG 3종 출력.

- icon.png         : iOS 마스터 아이콘 (보라 배경 + 한글 "모" + 하단 라인)
- splash-icon.png  : 스플래시 (흰 배경 + 보라 "모", 더 컴팩트)
- adaptive-icon.png: Android 어댑티브 (foreground only, 안전영역 안에 "모")
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ASSETS = Path(__file__).parent
FONT = str(ASSETS / "fonts" / "Pretendard-Bold.otf")
SIZE = 1024

ACCENT_TOP = (107, 95, 240)   # #6B5FF0
ACCENT_BOT = (74, 63, 214)    # #4A3FD6
ACCENT = (91, 79, 229)        # #5B4FE5
INK_50 = (250, 250, 247)      # #FAFAF7


def vertical_gradient(size, top, bottom):
    img = Image.new("RGB", (size, size), top)
    pixels = img.load()
    for y in range(size):
        t = y / (size - 1)
        r = round(top[0] + (bottom[0] - top[0]) * t)
        g = round(top[1] + (bottom[1] - top[1]) * t)
        b = round(top[2] + (bottom[2] - top[2]) * t)
        for x in range(size):
            pixels[x, y] = (r, g, b)
    return img


def draw_centered_glyph(img, text, font_size, fill, y_ratio=0.5):
    """anchor='mm' 기반 정중앙 정렬. 한글 글리프 metric 정확."""
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, font_size)
    cx = SIZE // 2
    cy = int(SIZE * y_ratio)
    draw.text((cx, cy), text, font=font, fill=fill, anchor="mm")


def make_icon():
    img = vertical_gradient(SIZE, ACCENT_TOP, ACCENT_BOT)
    # 메인 글자 — 정중앙, 적당한 크기 (1024 캔버스에 600px가 시각적 균형)
    draw_centered_glyph(img, "모", font_size=600, fill=INK_50, y_ratio=0.48)
    img.save(ASSETS / "icon.png", optimize=True)
    print("✓ icon.png")


def make_splash():
    img = Image.new("RGB", (SIZE, SIZE), INK_50)
    draw_centered_glyph(img, "모", font_size=520, fill=ACCENT, y_ratio=0.5)
    img.save(ASSETS / "splash-icon.png", optimize=True)
    print("✓ splash-icon.png")


def make_adaptive():
    # Android adaptive icon foreground — 안전영역(중앙 66%)에 작은 글자
    bg = Image.new("RGB", (SIZE, SIZE), ACCENT)
    draw_centered_glyph(bg, "모", font_size=440, fill=INK_50, y_ratio=0.5)
    bg.save(ASSETS / "adaptive-icon.png", optimize=True)
    print("✓ adaptive-icon.png")


if __name__ == "__main__":
    make_icon()
    make_splash()
    make_adaptive()
