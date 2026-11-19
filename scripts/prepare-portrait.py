"""Prepare the portrait: full image for the studio wall, face crop for the avatar."""

import sys
from pathlib import Path

from PIL import Image

SRC = Path(
    sys.argv[1]
    if len(sys.argv) > 1
    else r"C:\Users\user\.dsh\attachments\v1\objects\43\431367f362f71c6470b4f6b2477b6c51a37dd185f07173638840d05309adf2e8"
)
PUBLIC = Path(r"E:\portfolio-3d\public")

img = Image.open(SRC).convert("RGB")
print("source:", img.size)

# full portrait, gently bounded so the glb stays small
full = img.copy()
full.thumbnail((720, 1600), Image.LANCZOS)
full.save(PUBLIC / "portrait.jpg", quality=88, optimize=True)

# square face crop for the 62px avatar
w, h = img.size
side = int(min(w, h) * 0.56)
cx, cy = int(w * 0.55), int(h * 0.24)
box = (cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)
face = img.crop(box).resize((256, 256), Image.LANCZOS)
face.save(PUBLIC / "avatar.jpg", quality=90, optimize=True)

print("portrait.jpg:", (PUBLIC / "portrait.jpg").stat().st_size // 1024, "KB")
print("avatar.jpg  :", (PUBLIC / "avatar.jpg").stat().st_size // 1024, "KB")
