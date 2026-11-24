"""Upgrade blender/world.blend with architectural sci-fi rooftop details,
export public/models/world.glb, and render a fresh public/og.jpg in Cycles.

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

scene = bpy.context.scene

# Remove any previous upgrade objects if re-run
for obj in list(bpy.data.objects):
    if obj.name.startswith("Upgrade_"):
        bpy.data.objects.remove(obj, do_unlink=True)

def make_mat(name, base_color, metallic=0.85, roughness=0.25, emissive=None, strength=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emissive and strength > 0:
        bsdf.inputs["Emission Color"].default_value = (*emissive, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat

mat_dark_steel = make_mat("UpgradeSteel", (0.04, 0.05, 0.07), metallic=0.9, roughness=0.28)
mat_neon_cyan = make_mat("UpgradeNeonCyan", (0.1, 0.78, 1.0), metallic=0.2, roughness=0.15, emissive=(0.18, 0.85, 1.0), strength=4.2)
mat_beacon_amber = make_mat("UpgradeBeaconAmber", (1.0, 0.42, 0.22), metallic=0.1, roughness=0.2, emissive=(1.0, 0.35, 0.18), strength=7.5)

# 1. Flush Glowing Architectural Ring on the central rooftop deck (Z ~ 0.06)
bpy.ops.mesh.primitive_torus_add(
    major_radius=3.4,
    minor_radius=0.045,
    major_segments=48,
    minor_segments=10,
    location=(-0.8, 0.6, 0.06),
)
ring_outer = bpy.context.active_object
ring_outer.name = "Upgrade_DeckRingOuter"
ring_outer.scale = (1.0, 1.0, 0.35)
ring_outer.data.materials.append(mat_neon_cyan)

bpy.ops.mesh.primitive_torus_add(
    major_radius=2.65,
    minor_radius=0.025,
    major_segments=48,
    minor_segments=8,
    location=(-0.8, 0.6, 0.06),
)
ring_inner = bpy.context.active_object
ring_inner.name = "Upgrade_DeckRingInner"
ring_inner.scale = (1.0, 1.0, 0.35)
ring_inner.data.materials.append(mat_neon_cyan)

# 4 subtle glowing cardinal tick bars around the deck ring
for i in range(4):
    ang = i * (math.pi / 2.0)
    x = -0.8 + math.cos(ang) * 3.85
    y = 0.6 + math.sin(ang) * 3.85
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, y, 0.06))
    tick = bpy.context.active_object
    tick.name = f"Upgrade_DeckTick_{i}"
    tick.scale = (0.55, 0.06, 0.03)
    tick.rotation_euler = (0, 0, ang)
    tick.data.materials.append(mat_neon_cyan)

# 2. Architectural Rooftop Comms Spire + Glowing Telemetry Ring + Aviation Beacon
spire_x, spire_y = -11.2, 8.8
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.14, depth=9.5, location=(spire_x, spire_y, 4.75))
mast = bpy.context.active_object
mast.name = "Upgrade_CommsSpire"
mast.data.materials.append(mat_dark_steel)

bpy.ops.mesh.primitive_torus_add(major_radius=0.52, minor_radius=0.04, major_segments=24, minor_segments=8, location=(spire_x, spire_y, 7.2))
halo = bpy.context.active_object
halo.name = "Upgrade_SpireHalo"
halo.data.materials.append(mat_neon_cyan)

bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.18, location=(spire_x, spire_y, 9.6))
beacon = bpy.context.active_object
beacon.name = "Upgrade_SpireBeacon"
beacon.data.materials.append(mat_beacon_amber)

# 3. Four Slim Neon Edge Bollards framing the rooftop walkway
bollard_coords = [(-6.2, -6.5), (4.8, -6.5), (-6.2, 6.2), (1.8, 6.2)]
for idx, (bx, by) in enumerate(bollard_coords):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, by, 0.45))
    post = bpy.context.active_object
    post.name = f"Upgrade_Bollard_{idx}"
    post.scale = (0.14, 0.14, 0.9)
    post.data.materials.append(mat_dark_steel)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, by, 0.86))
    cap = bpy.context.active_object
    cap.name = f"Upgrade_BollardCap_{idx}"
    cap.scale = (0.16, 0.16, 0.08)
    cap.data.materials.append(mat_neon_cyan)

# Save updated world.blend
bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
print("Saved upgraded world.blend")

# Export web-ready GLB (preserving all cameras/empties/animations/textures)
bpy.ops.export_scene.gltf(
    filepath=GLB_OUT,
    export_format="GLB",
    export_extras=True,
    export_yup=True,
    export_apply=True,
)
print("Exported GLB:", GLB_OUT, os.path.getsize(GLB_OUT) // 1024, "KB")

# Render fresh 1200x630 social preview card (public/og.jpg)
cam_data = bpy.data.cameras.new("OGCam_Upgrade")
cam_data.lens = 34
cam = bpy.data.objects.new("OGCam_Upgrade", cam_data)
scene.collection.objects.link(cam)
cam.location = (30, -48, 16)
cam.rotation_euler = (Vector((0, 0, 6.5)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 36
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 630
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 90
scene.render.filepath = OG_OUT
try:
    scene.view_settings.view_transform = "AgX"
except Exception:
    pass

bpy.ops.render.render(write_still=True)
print("Rendered OG:", OG_OUT, os.path.getsize(OG_OUT) // 1024, "KB")
