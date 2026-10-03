"""Cut a generated relic painting off its white backdrop into a square transparent sprite.

usage: python3 tools/cut-relic-sprite.py <source image> <output png> [size]
Only near-white pixels connected to the image border are removed, so highlights inside the outline survive.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 256

rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
whiteness = rgb.min(axis=2)
backdrop_like = whiteness > 200
labels, _ = ndimage.label(backdrop_like)
border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
backdrop = np.isin(labels, border[border > 0])

# Feather a couple of pixels into the outline so the edge isn't jagged, fading by how white each pixel is.
near = ndimage.binary_dilation(backdrop, iterations=2) & ~backdrop
alpha = np.where(backdrop, 0.0, 255.0)
alpha[near] = np.clip((255 - whiteness[near]) / (255 - 200) * 255, 0, 255)

rgba = np.dstack([rgb, alpha]).astype(np.uint8)
image = Image.fromarray(rgba)
image = image.crop(image.getbbox())
side = int(max(image.size) * 1.04)
canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
canvas.paste(image, ((side - image.width) // 2, (side - image.height) // 2))
canvas.resize((size, size), Image.LANCZOS).save(out)
print(f'{out}: {size}x{size}')
