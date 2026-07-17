from pathlib import Path

from PIL import Image, ImageDraw


PUBLIC_DIR = Path(__file__).resolve().parents[1] / 'public'


def scale(value: int, size: int) -> int:
    return round(value * size / 512)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill: str) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def make_icon(size: int) -> Image.Image:
    image = Image.new('RGBA', (size, size), '#081421')
    draw = ImageDraw.Draw(image)
    s = lambda value: scale(value, size)

    rounded(draw, (0, 0, size, size), s(112), '#081421')
    rounded(draw, (s(148), s(142), s(204), s(246)), s(18), '#43B5FF')
    rounded(draw, (s(228), s(98), s(284), s(246)), s(18), '#43B5FF')
    rounded(draw, (s(308), s(54), s(364), s(246)), s(18), '#5FE0D4')
    rounded(draw, (s(72), s(226), s(440), s(420)), s(46), '#1761C8')
    draw.rounded_rectangle((s(72), s(226), s(440), s(334)), radius=s(56), fill='#2879E5')
    rounded(draw, (s(300), s(282), s(440), s(390)), s(54), '#0E3C78')
    draw.ellipse((s(366), s(316), s(406), s(356)), fill='#F4F8FD')
    return image


for icon_size in (192, 512):
    make_icon(icon_size).save(PUBLIC_DIR / f'icon-{icon_size}.png', optimize=True)
