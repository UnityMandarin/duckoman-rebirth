"""Bakes public/assets/gate3/rustwing-walk.png (3 frames: stand, front step, rear step) from rustwing.png.

Flat side view: each whole leg is cut where it meets the body and shifted; the body layer is composited on top
to hide the seam. Planted feet only slide horizontally, so they stay flat on the ground line.
"""
from PIL import Image, ImageDraw

SRC = 'public/assets/gate3/rustwing.png'
OUT = 'public/assets/gate3/rustwing-walk.png'

# (region polygon, cut line y) in rustwing.png pixels. The sprite faces left.
FRONT = ([(40, 440), (390, 440), (390, 768), (40, 768)], 476)
REAR = ([(400, 440), (740, 440), (740, 768), (400, 768)], 478)
OVERLAP = 34
# Per frame: (front dx, front lift, rear dx, rear lift). Negative dx moves a foot forward.
POSES = [(0, 0, 0, 0), (-16, 28, 12, 0), (12, 0, -16, 28)]


def region_mask(size, poly, top):
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).polygon([(x, max(y, top)) for x, y in poly], fill=255)
    return mask


def main():
    src = Image.open(SRC).convert('RGBA')
    w, h = src.size
    alpha = src.getchannel('A')
    empty = Image.new('L', src.size, 0)
    body = src.copy()
    legs = []
    for poly, cut in (FRONT, REAR):
        body.putalpha(Image.composite(empty, body.getchannel('A'), region_mask(src.size, poly, cut)))
        leg = src.copy()
        leg.putalpha(Image.composite(alpha, empty, region_mask(src.size, poly, cut - OVERLAP)))
        legs.append(leg)
    sheet = Image.new('RGBA', (w * len(POSES), h), (0, 0, 0, 0))
    for i, (fdx, flift, rdx, rlift) in enumerate(POSES):
        frame = Image.new('RGBA', src.size, (0, 0, 0, 0))
        for leg, dx, lift in ((legs[1], rdx, rlift), (legs[0], fdx, flift)):
            frame.alpha_composite(leg.transform(src.size, Image.AFFINE, (1, 0, -dx, 0, 1, lift), Image.BICUBIC))
        frame.alpha_composite(body)
        sheet.paste(frame, (i * w, 0))
    sheet.save(OUT, optimize=True)


if __name__ == '__main__':
    main()
