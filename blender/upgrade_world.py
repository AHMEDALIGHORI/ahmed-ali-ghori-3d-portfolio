"""Full 20-Feature Blender 5.1.2 Architectural & Studio Upgrade for ahmed-ali-ghori-3d-portfolio.

Builds all rooftop landmarks, living-city props, glass studio interior items,
wet deck puddles, glass perimeter railings, project pedestals, and renders
both public/og.jpg and a 4-angle Cycles gallery pack.

Run headless:
    blender -b blender/world.blend --python blender/upgrade_world.py
"""

import math
import os

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLB_OUT = os.path.join(ROOT, "public", "models", "world.glb")
OG_OUT = os.path.join(ROOT, "public", "og.jpg")
BLEND_OUT = os.path.join(ROOT, "blender", "world.blend")
RENDERS_DIR = os.path.join(ROOT, "public", "renders")
os.makedirs(RENDERS_DIR, exist_ok=True)

scene = bpy.context.scene

# Clean previous Upgrade_ objects for idempotency
for obj in list(bpy.data.objects):
    if obj.name.startswith("Upgrade_"):
        bpy.data.objects.remove(obj, do_unlink=True)

def make_mat(name, base_color, metallic=0.85, roughness=0.25, emissive=None, strength=0.0, alpha=1.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emissive and strength > 0:
        bsdf.inputs["Emission Color"].default_value = (*emissive, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    if alpha < 1.0 and "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = alpha
    return mat

mat_steel = make_mat("UpgradeSteel", (0.04, 0.05, 0.07), metallic=0.92, roughness=0.26)
mat_chrome = make_mat("UpgradeChrome", (0.82, 0.90, 0.98), metallic=0.96, roughness=0.14)
mat_cyan = make_mat("UpgradeNeonCyan", (0.10, 0.78, 1.0), metallic=0.15, roughness=0.15, emissive=(0.18, 0.85, 1.0), strength=4.2)
mat_magenta = make_mat("UpgradeNeonMagenta", (0.88, 0.25, 0.96), metallic=0.15, roughness=0.15, emissive=(0.90, 0.28, 0.98), strength=4.5)
mat_warm = make_mat("UpgradeWarmLED", (1.0, 0.72, 0.42), metallic=0.1, roughness=0.2, emissive=(1.0, 0.68, 0.34), strength=3.8)
mat_beacon = make_mat("UpgradeBeaconRed", (1.0, 0.24, 0.16), metallic=0.1, roughness=0.2, emissive=(1.0, 0.22, 0.14), strength=8.0)
mat_gold = make_mat("UpgradeGold", (0.95, 0.72, 0.24), metallic=0.95, roughness=0.18)
mat_puddle = make_mat("UpgradeWetPuddle", (0.015, 0.02, 0.03), metallic=0.15, roughness=0.03)
mat_glass = make_mat("UpgradeGlassRail", (0.55, 0.85, 1.0), metallic=0.05, roughness=0.08, alpha=0.28)
mat_screen = make_mat("UpgradeCodeScreen", (0.06, 0.22, 0.35), metallic=0.1, roughness=0.12, emissive=(0.14, 0.68, 0.95), strength=2.6)

# Helper to create an Empty parent for grouped animations in Three.js
def add_empty(name, loc):
    emp = bpy.data.objects.new(name, None)
    emp.location = loc
    scene.collection.objects.link(emp)
    return emp

# ============================================================================
# 0. CENTRAL DECK PORTAL RING + COMMS SPIRE + WALKWAY BOLLARDS
# ============================================================================
bpy.ops.mesh.primitive_torus_add(major_radius=3.4, minor_radius=0.045, major_segments=48, minor_segments=10, location=(-0.8, 0.6, 0.06))
o = bpy.context.active_object; o.name = "Upgrade_DeckRingOuter"; o.scale = (1, 1, 0.35); o.data.materials.append(mat_cyan)

bpy.ops.mesh.primitive_torus_add(major_radius=2.65, minor_radius=0.025, major_segments=48, minor_segments=8, location=(-0.8, 0.6, 0.06))
o = bpy.context.active_object; o.name = "Upgrade_DeckRingInner"; o.scale = (1, 1, 0.35); o.data.materials.append(mat_cyan)

for i in range(4):
    ang = i * (math.pi / 2.0)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.8 + math.cos(ang) * 3.85, 0.6 + math.sin(ang) * 3.85, 0.06))
    o = bpy.context.active_object; o.name = f"Upgrade_DeckTick_{i}"; o.scale = (0.55, 0.06, 0.03); o.rotation_euler = (0, 0, ang); o.data.materials.append(mat_cyan)

spire_x, spire_y = -11.2, 8.8
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.14, depth=9.5, location=(spire_x, spire_y, 4.75))
o = bpy.context.active_object; o.name = "Upgrade_CommsSpire"; o.data.materials.append(mat_steel)

bpy.ops.mesh.primitive_torus_add(major_radius=0.52, minor_radius=0.04, major_segments=24, minor_segments=8, location=(spire_x, spire_y, 7.2))
o = bpy.context.active_object; o.name = "Upgrade_SpireHalo"; o.data.materials.append(mat_cyan)

bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.18, location=(spire_x, spire_y, 9.6))
o = bpy.context.active_object; o.name = "Upgrade_SpireBeacon"; o.data.materials.append(mat_beacon)

for idx, (bx, by) in enumerate([(-6.2, -6.5), (4.8, -6.5), (-6.2, 6.2), (1.8, 6.2)]):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, by, 0.45))
    o = bpy.context.active_object; o.name = f"Upgrade_Bollard_{idx}"; o.scale = (0.14, 0.14, 0.9); o.data.materials.append(mat_steel)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, by, 0.86))
    o = bpy.context.active_object; o.name = f"Upgrade_BollardCap_{idx}"; o.scale = (0.16, 0.16, 0.08); o.data.materials.append(mat_cyan)

# ============================================================================
# #1 HOLOGRAPHIC TECH-STACK TOTEM (orbiting 3D emblems above central deck ring)
# ============================================================================
totem = add_empty("Upgrade_TotemGroup", (-0.8, 0.6, 2.55))
# Central holographic core octahedron
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.38, location=(0, 0, 0))
core = bpy.context.active_object; core.name = "Upgrade_TotemCore"; core.parent = totem; core.data.materials.append(mat_cyan)

# 5 orbiting geometric stack emblems (React ring, Three.js prism, Next.js cube, Blender torus, Python twin-node)
emblem_specs = [
    ("React", "TORUS", mat_cyan),
    ("Three", "CONE", mat_chrome),
    ("Next", "CUBE", mat_cyan),
    ("Blender", "ICO", mat_warm),
    ("AI", "OCTA", mat_magenta),
]
for idx, (ename, shape, emat) in enumerate(emblem_specs):
    ang = idx * (2 * math.pi / len(emblem_specs))
    ex, ey = math.cos(ang) * 1.55, math.sin(ang) * 1.55
    if shape == "TORUS":
        bpy.ops.mesh.primitive_torus_add(major_radius=0.22, minor_radius=0.04, major_segments=20, minor_segments=8, location=(ex, ey, 0))
    elif shape == "CONE":
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.22, depth=0.38, location=(ex, ey, 0))
    elif shape == "CUBE":
        bpy.ops.mesh.primitive_cube_add(size=0.30, location=(ex, ey, 0))
    elif shape == "ICO":
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.20, location=(ex, ey, 0))
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.19, location=(ex, ey, 0))
    eo = bpy.context.active_object
    eo.name = f"Upgrade_TotemEmblem_{ename}"
    eo.parent = totem
    eo.data.materials.append(emat)

# ============================================================================
# #2 ROOFTOP GLASS LOUNGE & NEON PERGOLA (West Deck)
# ============================================================================
px, py = -9.6, -2.5
for idx, (dx, dy) in enumerate([(-2.2, -1.6), (2.2, -1.6), (-2.2, 1.6), (2.2, 1.6)]):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px + dx, py + dy, 1.55))
    o = bpy.context.active_object; o.name = f"Upgrade_PergolaPost_{idx}"; o.scale = (0.14, 0.14, 3.1); o.data.materials.append(mat_steel)
for idx in range(5):
    bx = px - 2.2 + idx * 1.1
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, py, 3.12))
    o = bpy.context.active_object; o.name = f"Upgrade_PergolaBeam_{idx}"; o.scale = (0.10, 3.5, 0.10); o.data.materials.append(mat_steel)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, py, 3.04))
    o = bpy.context.active_object; o.name = f"Upgrade_PergolaLED_{idx}"; o.scale = (0.04, 3.3, 0.03); o.data.materials.append(mat_warm)
# Minimalist lounge bench
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px, py, 0.42))
o = bpy.context.active_object; o.name = "Upgrade_LoungeBench"; o.scale = (2.8, 0.85, 0.22); o.data.materials.append(mat_steel)

# ============================================================================
# #3 DISTANT SKYLINE NEON BILLBOARD (AAG // 2026)
# ============================================================================
bb_loc = Vector((-38.0, 52.0, 34.0))
bpy.ops.mesh.primitive_cube_add(size=1.0, location=bb_loc)
o = bpy.context.active_object; o.name = "Upgrade_BillboardFrame"; o.scale = (16.5, 0.35, 4.4); o.rotation_euler = (0, 0, -0.45); o.data.materials.append(mat_steel)

curve = bpy.data.curves.new(name="Upgrade_BillboardTextCurve", type="FONT")
curve.body = "AAG // 2026"
curve.align_x = "CENTER"
curve.align_y = "CENTER"
curve.size = 2.15
curve.extrude = 0.12
bb_txt = bpy.data.objects.new("Upgrade_SkylineBillboard", curve)
scene.collection.objects.link(bb_txt)
bb_txt.location = bb_loc + Vector((0.35, -0.45, 0.0))
bb_txt.rotation_euler = (math.pi / 2.0, 0, -0.45)
bb_txt.data.materials.append(mat_cyan)

# ============================================================================
# #4 ROTATING TELEMETRY SATELLITE DISH (beside comms spire)
# ============================================================================
sat_pivot = add_empty("Upgrade_SatDish", (-9.4, 8.6, 1.35))
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.10, depth=1.35, location=(-9.4, 8.6, 0.675))
o = bpy.context.active_object; o.name = "Upgrade_SatBase"; o.data.materials.append(mat_steel)

bpy.ops.mesh.primitive_cone_add(vertices=18, radius1=0.95, radius2=0.14, depth=0.38, location=(0, 0, 0.15))
dish = bpy.context.active_object; dish.name = "Upgrade_SatDishBowl"; dish.parent = sat_pivot; dish.rotation_euler = (math.radians(55), 0, 0); dish.data.materials.append(mat_chrome)

bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.09, location=(0, -0.42, 0.45))
feed = bpy.context.active_object; feed.name = "Upgrade_SatFeed"; feed.parent = sat_pivot; feed.data.materials.append(mat_cyan)

# ============================================================================
# #5 DRONE LANDING PAD & HOVERING QUADCOPTER
# ============================================================================
pad_x, pad_y = 7.4, 6.2
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=2.1, depth=0.08, location=(pad_x, pad_y, 0.04))
o = bpy.context.active_object; o.name = "Upgrade_HelipadBase"; o.data.materials.append(mat_steel)
bpy.ops.mesh.primitive_torus_add(major_radius=1.95, minor_radius=0.04, major_segments=32, minor_segments=8, location=(pad_x, pad_y, 0.09))
o = bpy.context.active_object; o.name = "Upgrade_HelipadRing"; o.scale = (1, 1, 0.35); o.data.materials.append(mat_warm)
# Glowing "H" bars
for idx, (dx, dy, sx, sy) in enumerate([(-0.55, 0, 0.16, 1.4), (0.55, 0, 0.16, 1.4), (0, 0, 1.25, 0.16)]):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(pad_x + dx, pad_y + dy, 0.095))
    o = bpy.context.active_object; o.name = f"Upgrade_HelipadH_{idx}"; o.scale = (sx, sy, 0.02); o.data.materials.append(mat_warm)

# Hovering quadcopter drone
drone = add_empty("Upgrade_PadDrone", (pad_x, pad_y, 1.85))
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
body = bpy.context.active_object; body.name = "Upgrade_PadDroneBody"; body.parent = drone; body.scale = (0.45, 0.30, 0.12); body.data.materials.append(mat_steel)
for idx, (dx, dy) in enumerate([(-0.42, -0.42), (0.42, -0.42), (-0.42, 0.42), (0.42, 0.42)]):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.18, minor_radius=0.02, major_segments=14, minor_segments=6, location=(dx, dy, 0.04))
    r = bpy.context.active_object; r.name = f"Upgrade_PadDroneRotor_{idx}"; r.parent = drone; r.data.materials.append(mat_cyan)

# ============================================================================
# #7 SPINNING ROOFTOP HVAC UNITS & EXHAUST FANS
# ============================================================================
for idx, (hx, hy) in enumerate([(-11.5, -8.5), (-9.2, -8.5)]):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(hx, hy, 0.55))
    o = bpy.context.active_object; o.name = f"Upgrade_HVACBox_{idx}"; o.scale = (1.6, 1.4, 1.1); o.data.materials.append(mat_steel)
    fan_hub = add_empty(f"Upgrade_HVACFan_{idx}", (hx, hy, 1.12))
    for b in range(3):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
        bl = bpy.context.active_object; bl.name = f"Upgrade_HVACBlade_{idx}_{b}"; bl.parent = fan_hub
        bl.scale = (1.05, 0.16, 0.03); bl.rotation_euler = (0, 0, b * (math.pi / 3.0)); bl.data.materials.append(mat_chrome)

# ============================================================================
# #8 COMPANION GUIDE DRONE (animated along camera in Three.js)
# ============================================================================
guide = add_empty("Upgrade_GuideDrone", (4.0, -5.0, 3.2))
bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, radius=0.22, location=(0, 0, 0))
o = bpy.context.active_object; o.name = "Upgrade_GuideShell"; o.parent = guide; o.data.materials.append(mat_steel)
bpy.ops.mesh.primitive_torus_add(major_radius=0.30, minor_radius=0.025, major_segments=20, minor_segments=8, location=(0, 0, 0))
o = bpy.context.active_object; o.name = "Upgrade_GuideHalo"; o.parent = guide; o.data.materials.append(mat_cyan)

# ============================================================================
# #10 CITY-WIDE AVIATION BEACONS ON TALLEST 15 TOWERS
# ============================================================================
tall_towers = []
for obj in bpy.data.objects:
    if obj.type == "MESH" and not obj.name.startswith("Upgrade_") and obj.dimensions.z > 24.0:
        bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        max_z = max(v.z for v in bbox)
        cx = sum(v.x for v in bbox) / 8.0
        cy = sum(v.y for v in bbox) / 8.0
        if math.hypot(cx, cy) > 22.0:
            tall_towers.append((max_z, cx, cy))
tall_towers.sort(reverse=True)
for idx, (mz, cx, cy) in enumerate(tall_towers[:15]):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.36, location=(cx, cy, mz + 0.55))
    o = bpy.context.active_object; o.name = f"Upgrade_CityBeacon_{idx}"; o.data.materials.append(mat_beacon)

# ============================================================================
# #11–#15 INTERACTIVE GLASS STUDIO INTERIOR PROPS (Studio centered ~ (9, 7, 0) in Blender Y-up vs Z-up!)
# Note: Three.js (9, 1.7, -7) corresponds to Blender (9, 7, 1.7) because glTF export converts Z-up -> Y-up!
# ============================================================================
sx, sy = 9.0, 7.2

# #11 Multi-monitor dev desk screens
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx, sy + 1.15, 1.32))
o = bpy.context.active_object; o.name = "Upgrade_MonitorMain"; o.scale = (1.65, 0.05, 0.62); o.data.materials.append(mat_screen)
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx + 1.12, sy + 1.05, 1.35))
o = bpy.context.active_object; o.name = "Upgrade_MonitorVert"; o.scale = (0.42, 0.05, 0.78); o.rotation_euler = (0, 0, -0.25); o.data.materials.append(mat_screen)

# #12 3D Project Relic Shelf (left studio wall)
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx - 2.35, sy + 0.2, 1.45))
o = bpy.context.active_object; o.name = "Upgrade_RelicShelf"; o.scale = (0.32, 2.4, 0.06); o.data.materials.append(mat_steel)
# 4 mini project relics: LOGOFF sneaker block, GHORI tower, NEON orb, Mithaas gold box
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx - 2.32, sy - 0.65, 1.62))
o = bpy.context.active_object; o.name = "Upgrade_Relic_Shoe"; o.scale = (0.16, 0.34, 0.18); o.data.materials.append(mat_chrome)
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx - 2.32, sy - 0.15, 1.74))
o = bpy.context.active_object; o.name = "Upgrade_Relic_Tower"; o.scale = (0.16, 0.16, 0.48); o.data.materials.append(mat_cyan)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.14, location=(sx - 2.32, sy + 0.35, 1.66))
o = bpy.context.active_object; o.name = "Upgrade_Relic_Orb"; o.data.materials.append(mat_magenta)
bpy.ops.mesh.primitive_cube_add(size=0.22, location=(sx - 2.32, sy + 0.85, 1.60))
o = bpy.context.active_object; o.name = "Upgrade_Relic_GoldBox"; o.data.materials.append(mat_gold)

# #13 Clickable Articulated Studio Desk Lamp
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.12, depth=0.05, location=(sx - 1.05, sy + 0.95, 0.95))
o = bpy.context.active_object; o.name = "Upgrade_DeskLampBase"; o.data.materials.append(mat_steel)
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.025, depth=0.58, location=(sx - 1.05, sy + 0.95, 1.24))
o = bpy.context.active_object; o.name = "Upgrade_DeskLampArm"; o.data.materials.append(mat_steel)
bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.18, radius2=0.06, depth=0.18, location=(sx - 0.98, sy + 0.95, 1.54))
o = bpy.context.active_object; o.name = "Upgrade_DeskLamp"; o.rotation_euler = (0, 0.35, 0); o.data.materials.append(mat_warm)

# #14 Glowing AI Compute Server Rack (right corner of studio)
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx + 2.25, sy + 1.05, 1.10))
o = bpy.context.active_object; o.name = "Upgrade_AIRack"; o.scale = (0.68, 0.62, 2.15); o.data.materials.append(mat_steel)
for i in range(6):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx + 2.25, sy + 0.73, 0.45 + i * 0.28))
    o = bpy.context.active_object; o.name = f"Upgrade_AIRackLED_{i}"; o.scale = (0.48, 0.03, 0.04); o.data.materials.append(mat_cyan)

# #15 Backlit Certification Wall Plaques (back studio wall)
for idx in range(4):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx - 1.35 + idx * 0.90, sy + 1.65, 2.15))
    o = bpy.context.active_object; o.name = f"Upgrade_CertPlaque_{idx}"; o.scale = (0.62, 0.04, 0.42); o.data.materials.append(mat_gold if idx == 0 else mat_cyan)

# ============================================================================
# #16 RAIN-SLICKED REFLECTIVE ROOFTOP PUDDLES
# ============================================================================
puddles = [(-3.6, -2.2, 2.1, 1.4), (3.4, -3.5, 1.9, 1.2), (-2.2, 4.8, 2.4, 1.5), (4.5, 2.4, 1.6, 1.1)]
for idx, (ux, uy, rx, ry) in enumerate(puddles):
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=1.0, depth=0.012, location=(ux, uy, 0.015))
    o = bpy.context.active_object; o.name = f"Upgrade_Puddle_{idx}"; o.scale = (rx, ry, 1.0); o.data.materials.append(mat_puddle)

# ============================================================================
# #17 FRAMELESS GLASS PERIMETER RAILINGS + CYAN TRIM
# ============================================================================
rails = [
    (0.0, -11.6, 23.2, 0.05),
    (0.0,  11.6, 23.2, 0.05),
    (-11.8, 0.0, 0.05, 23.2),
    (11.8,  0.0, 0.05, 23.2),
]
for idx, (rx, ry, sx_r, sy_r) in enumerate(rails):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rx, ry, 0.62))
    o = bpy.context.active_object; o.name = f"Upgrade_GlassRail_{idx}"; o.scale = (sx_r, sy_r, 1.05); o.data.materials.append(mat_glass)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rx, ry, 1.16))
    o = bpy.context.active_object; o.name = f"Upgrade_GlassRailTop_{idx}"; o.scale = (sx_r + 0.02, sy_r + 0.02, 0.035); o.data.materials.append(mat_cyan)

# ============================================================================
# #18 3D PEDESTALS UNDER FLOATING PROJECT PANELS
# ============================================================================
panel_anchors = [obj for obj in bpy.data.objects if obj.name.startswith("Panel") and obj.name.endswith("_Anchor")]
if not panel_anchors:
    panel_anchors = [obj for obj in bpy.data.objects if obj.name.startswith("Panel") and "_Frame" in obj.name]
for idx, pa in enumerate(panel_anchors[:4]):
    loc = pa.matrix_world.translation
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.65, depth=0.18, location=(loc.x, loc.y, 0.09))
    o = bpy.context.active_object; o.name = f"Upgrade_PanelPedestal_{idx}"; o.data.materials.append(mat_steel)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.68, minor_radius=0.03, major_segments=24, minor_segments=8, location=(loc.x, loc.y, 0.19))
    o = bpy.context.active_object; o.name = f"Upgrade_PanelPedestalGlow_{idx}"; o.data.materials.append(mat_cyan)

# ============================================================================
# SAVE WORLD.BLEND & EXPORT WEB-READY WORLD.GLB
# ============================================================================
bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
print("Saved upgraded world.blend")

bpy.ops.export_scene.gltf(
    filepath=GLB_OUT,
    export_format="GLB",
    export_extras=True,
    export_yup=True,
    export_apply=True,
)
print("Exported GLB:", GLB_OUT, os.path.getsize(GLB_OUT) // 1024, "KB")

# ============================================================================
# #20 MULTI-ANGLE CYCLES PORTFOLIO GALLERY RENDERS + FRESH OG.JPG
# ============================================================================
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 28
scene.cycles.use_denoising = True
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 88
try:
    scene.view_settings.view_transform = "AgX"
except Exception:
    pass

def render_shot(name, out_path, cam_pos, look_at, lens=32, res=(1200, 630)):
    cdata = bpy.data.cameras.new(name)
    cdata.lens = lens
    cobj = bpy.data.objects.new(name, cdata)
    scene.collection.objects.link(cobj)
    cobj.location = Vector(cam_pos)
    cobj.rotation_euler = (Vector(look_at) - Vector(cam_pos)).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cobj
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {name}: {out_path} ({os.path.getsize(out_path) // 1024} KB)")

render_shot("OGCam_Main", OG_OUT, (30, -48, 16), (0, 0, 6.5), lens=34, res=(1200, 630))
render_shot("Gallery_Aerial", os.path.join(RENDERS_DIR, "aerial-skyline.jpg"), (-34, -46, 26), (0, 4, 4), lens=28, res=(1280, 720))
render_shot("Gallery_Portal", os.path.join(RENDERS_DIR, "deck-portal.jpg"), (10, -12, 4.2), (-0.8, 0.6, 2.2), lens=30, res=(1280, 720))
render_shot("Gallery_Studio", os.path.join(RENDERS_DIR, "studio-interior.jpg"), (6.5, 2.2, 2.1), (9.2, 7.6, 1.4), lens=26, res=(1280, 720))
