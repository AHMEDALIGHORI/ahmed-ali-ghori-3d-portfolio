"""Soften the studio interior so the portrait reads against it."""

from pathlib import Path

path = Path(r"E:\portfolio-3d\blender\build_world.py")
text = path.read_text(encoding="utf-8")

subs = [
    ('emission_mat("WarmLight", (1.0, 0.72, 0.42), 3.0)',
     'emission_mat("WarmLight", (1.0, 0.72, 0.42), 2.0)'),
    ('emission_mat("ScreenGlow", (0.42, 0.75, 1.0), 1.6)',
     'emission_mat("ScreenGlow", (0.42, 0.75, 1.0), 1.0)'),
    ('emission_mat("WarmSoft", (1.0, 0.66, 0.38), 1.5)',
     'emission_mat("WarmSoft", (1.0, 0.66, 0.38), 1.0)'),
]

for old, new in subs:
    if old not in text:
        raise SystemExit(f"missing: {old}")
    text = text.replace(old, new)

path.write_text(text, encoding="utf-8")
print("emissions softened")
