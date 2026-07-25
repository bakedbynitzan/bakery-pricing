#!/usr/bin/env python3
"""Isolate blue pen ink from a photo of a signature on lined paper.

Keeps ink pixels (blue-dominant / dark), makes paper + printed lines
transparent, recolors ink to a consistent dark navy, autocrops, and
downscales to a sensible width for the receipt.
"""
from PIL import Image
import sys

SRC = sys.argv[1]
DST = sys.argv[2]

INK_COLOR = (26, 35, 126)  # #1a237e navy

img = Image.open(SRC).convert("RGBA")
px = img.load()
w, h = img.size

min_x, min_y, max_x, max_y = w, h, 0, 0

for y in range(h):
    for x in range(w):
        r, g, b, _ = px[x, y]
        brightness = (r + g + b) / 3
        blueness = b - r          # positive for blue ink
        # Ink = blue-dominant AND not too bright (paper/lines are light).
        is_ink = blueness > 18 and brightness < 155
        if is_ink:
            # Alpha by how dark/saturated it is → smooth edges.
            strength = min(255, int((155 - brightness) * 2.2 + blueness * 3))
            alpha = max(90, min(255, strength))
            px[x, y] = (INK_COLOR[0], INK_COLOR[1], INK_COLOR[2], alpha)
            if x < min_x: min_x = x
            if y < min_y: min_y = y
            if x > max_x: max_x = x
            if y > max_y: max_y = y
        else:
            px[x, y] = (0, 0, 0, 0)

if max_x <= min_x or max_y <= min_y:
    print("No ink detected — check thresholds", file=sys.stderr)
    sys.exit(1)

pad = 12
box = (max(0, min_x - pad), max(0, min_y - pad),
       min(w, max_x + pad), min(h, max_y + pad))
cropped = img.crop(box)

# Downscale to a receipt-friendly width.
target_w = 320
if cropped.width > target_w:
    ratio = target_w / cropped.width
    cropped = cropped.resize((target_w, int(cropped.height * ratio)), Image.LANCZOS)

cropped.save(DST)
print(f"Saved {DST} ({cropped.width}x{cropped.height})")
