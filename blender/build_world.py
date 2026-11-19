"""
Night rooftop + studio world for Ahmed Ali Ghori's 3D portfolio.

Run inside Blender (via the Blender MCP `execute_blender_code` tool):

    import runpy; runpy.run_path(r"E:\\portfolio-3d\\blender\\build_world.py", run_name="__main__")

Outputs
  E:\\portfolio-3d\\blender\\world.blend      editable scene
  E:\\portfolio-3d\\public\\models\\world.glb web-ready glTF (textures embedded)
  E:\\portfolio-3d\\public\\textures\\*.png  generated facade / sky textures

Everything is procedural: no external assets. Coordinates are Blender Z-up metres;
the exporter converts to glTF Y-up.
"""

import math
import os
import random

import bpy
import numpy as np
from mathutils import Vector

ROOT = r"E:\portfolio-3d"
TEX_DIR = os.path.join(ROOT, "public", "textures")
MODEL_DIR = os.path.join(ROOT, "public", "models")
BLEND_PATH = os.path.join(ROOT, "blender", "world.blend")
GLB_PATH = os.path.join(MODEL_DIR, "world.glb")

os.makedirs(TEX_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

rng = random.Random(20261119)


# --------------------------------------------------------------------------- #
# scene reset
# --------------------------------------------------------------------------- #
def reset_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images,
                 bpy.data.cameras, bpy.data.lights, bpy.data.curves):
        for item in list(coll):
            try:
                if item.users == 0:
                    coll.remove(item)
            except Exception:
                pass


# --------------------------------------------------------------------------- #
# generated textures
# --------------------------------------------------------------------------- #
def _save_png(pixels, w, h, path, name):
    img = bpy.data.images.new(name, width=w, height=h, alpha=False)
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[..., :3] = pixels
    img.pixels.foreach_set(rgba.reshape(-1))
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    return img


def make_window_texture(prefix, wall, glow_a, glow_b, lit_ratio, seed):
    """Facade grid: base-colour map plus a matching emissive map."""
    r = random.Random(seed)
    w = h = 512
    cols, rows = 6, 12
    cw, ch = w // cols, h // rows

    base = np.zeros((h, w, 3), dtype=np.float32)
    base[:] = wall
    emis = np.zeros((h, w, 3), dtype=np.float32)

    for cx in range(cols):
        for cy in range(rows):
            x0, x1 = cx * cw + 9, (cx + 1) * cw - 9
            y0, y1 = cy * ch + 10, (cy + 1) * ch - 18
            lit = r.random() < lit_ratio
            if lit:
                color = glow_a if r.random() < 0.78 else glow_b
                k = r.uniform(0.7, 1.6)
                base[y0:y1, x0:x1] = [min(1.0, c * 0.55) for c in color]
                emis[y0:y1, x0:x1] = [min(1.0, c * k) for c in color]
            else:
                base[y0:y1, x0:x1] = [c * 0.35 for c in wall]

    # horizontal floor bands
    for cy in range(rows + 1):
        y = min(h - 1, cy * ch)
        base[y:y + 4, :] *= 0.42

    # vertical mullions
    for cx in range(cols + 1):
        x = min(w - 1, cx * cw)
        base[:, x:x + 4] *= 0.45

    # flip vertically: image rows run bottom-up
    base = base[::-1]
    emis = emis[::-1]
    _save_png(base, w, h, os.path.join(TEX_DIR, f"{prefix}_base.png"), f"{prefix}_base")
    _save_png(emis, w, h, os.path.join(TEX_DIR, f"{prefix}_emissive.png"), f"{prefix}_emissive")


def make_sky_texture():
    w, h = 1024, 512
    y = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
    top = np.array([0.012, 0.016, 0.045], dtype=np.float32)
    mid = np.array([0.055, 0.045, 0.115], dtype=np.float32)
    horizon = np.array([0.42, 0.20, 0.16], dtype=np.float32)
    glow = np.array([0.95, 0.52, 0.26], dtype=np.float32)

    sky = np.zeros((h, w, 3), dtype=np.float32)
    for i in range(h):
        t = 1.0 - y[i, 0]          # 0 at bottom, 1 at top
        if t < 0.18:
            c = horizon * (t / 0.18) + glow * (1 - t / 0.18) * 0.85
        elif t < 0.45:
            f = (t - 0.18) / 0.27
            c = horizon * (1 - f) * 0.85 + mid * f
        else:
            f = min(1.0, (t - 0.45) / 0.55)
            c = mid * (1 - f) + top * f
        sky[i, :, :] = c

    # stars in the upper half
    r = random.Random(7)
    for _ in range(900):
        sx, sy = r.randrange(w), r.randrange(h // 2, h)
        b = r.uniform(0.25, 1.0)
        sky[sy, sx] = np.clip(sky[sy, sx] + b, 0, 1)

    sky = sky[::-1]
    _save_png(sky, w, h, os.path.join(TEX_DIR, "sky.png"), "sky")


def make_street_texture():
    w = h = 512
    img = np.zeros((h, w, 3), dtype=np.float32)
    img[:] = [0.02, 0.02, 0.03]
    r = random.Random(11)
    step = 16
    for gy in range(0, h, step):
        for gx in range(0, w, step):
            if r.random() < 0.30:
                c = [r.uniform(0.5, 1.0) * 0.9, r.uniform(0.45, 0.75), r.uniform(0.2, 0.4)]
                img[gy:gy + 3, gx:gx + 3] = c
    _save_png(img, w, h, os.path.join(TEX_DIR, "street.png"), "street")


# --------------------------------------------------------------------------- #
# materials
# --------------------------------------------------------------------------- #
def principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def simple_mat(name, color, rough=0.6, metal=0.0, emission=None, strength=1.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    b = principled(mat)
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emission:
        b.inputs["Emission Color"].default_value = (*emission, 1.0)
        b.inputs["Emission Strength"].default_value = strength
    return mat


def texture_mat(name, base_img, emis_img, strength=1.2, rough=0.75, metal=0.1):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    base = nt.nodes.new("ShaderNodeTexImage")
    base.image = base_img
    emis = nt.nodes.new("ShaderNodeTexImage")
    emis.image = emis_img
    emis.image.colorspace_settings.name = "sRGB"
    nt.links.new(base.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(emis.outputs["Color"], bsdf.inputs["Emission Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Emission Strength"].default_value = strength
    for n, x in ((base, -600), (emis, -600)):
        n.location = (x, 0 if n is base else -300)
    bsdf.location = (-200, 0)
    out.location = (100, 0)
    return mat


def emission_mat(name, color, strength):
    """Glowing surface as a Principled shader: exports cleanly to glTF emissive."""
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    b = principled(mat)
    b.inputs["Base Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    b.inputs["Roughness"].default_value = 1.0
    b.inputs["Metallic"].default_value = 0.0
    b.inputs["Emission Color"].default_value = (*color, 1.0)
    b.inputs["Emission Strength"].default_value = strength
    return mat


# --------------------------------------------------------------------------- #
# mesh helpers
# --------------------------------------------------------------------------- #
def new_object(name, mesh, mat=None, parent=None):
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    if mat:
        ob.data.materials.append(mat)
    if parent:
        ob.parent = parent
    return ob


def box(name, size, loc, mat, rot=(0, 0, 0), bevel=0.0, uv_scale=3.0):
    """Axis-aligned box with metre-scaled UVs so tiling textures stay put."""
    sx, sy, sz = (s * 0.5 for s in size)
    verts = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
             (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
             (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name="UVMap")
    # project UVs along the dominant axis of each face, scaled to metres so
    # tiled facade textures keep a constant window size on every building
    for poly in mesh.polygons:
        n = poly.normal
        for li in poly.loop_indices:
            v = mesh.vertices[mesh.loops[li].vertex_index].co
            if abs(n.z) > 0.5:
                a, b = v.x, v.y
            elif abs(n.x) > 0.5:
                a, b = v.y, v.z
            else:
                a, b = v.x, v.z
            uv.data[li].uv = (a / uv_scale, b / uv_scale)
        poly.use_smooth = False
    ob = new_object(name, mesh, mat)
    ob.location = loc
    ob.rotation_euler = rot
    if bevel > 0:
        mod = ob.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
    return ob


def cylinder(name, radius, depth, loc, mat, verts=24, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth,
                                        location=loc, rotation=rot)
    ob = bpy.context.object
    ob.name = name
    ob.data.materials.append(mat)
    return ob


def emitting_plane(name, size, loc, rot, mat, parent=None):
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=loc, rotation=rot)
    ob = bpy.context.object
    ob.name = name
    ob.scale = (size[0], size[1], 1)
    ob.data.materials.append(mat)
    if parent:
        ob.parent = parent
    return ob


def empty(name, loc, rot=(0, 0, 0)):
    em = bpy.data.objects.new(name, None)
    em.empty_display_type = "PLAIN_AXES"
    em.empty_display_size = 0.4
    em.location = loc
    em.rotation_euler = rot
    bpy.context.scene.collection.objects.link(em)
    return em


# --------------------------------------------------------------------------- #
# the rooftop
# --------------------------------------------------------------------------- #
def add_portrait_frame():
    """A lit, freestanding portrait of Ahmed on the deck, facing the walk-up."""
    path = os.path.join(ROOT, "public", "portrait.jpg")
    if not os.path.exists(path):
        print("portrait.jpg missing — skipping portrait")
        return

    img = bpy.data.images.load(path)
    img.colorspace_settings.name = "sRGB"

    mat = bpy.data.materials.new("PortraitPhoto")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    bsdf.inputs["Roughness"].default_value = 0.58
    bsdf.inputs["Emission Strength"].default_value = 0.35
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    cx, cy, cz = 2.6, -9.2, 2.15
    bpy.ops.mesh.primitive_plane_add(
        size=1.0, location=(cx, cy - 0.06, cz), rotation=(math.radians(90), 0, 0)
    )
    photo = bpy.context.object
    photo.name = "PortraitPhoto"
    photo.scale = (1.7, 3.74, 1.0)  # 455:1000 aspect
    photo.data.materials.append(mat)

    metal = simple_mat("PortraitFrameMetal", (0.045, 0.048, 0.055), 0.4, 0.8)
    box("PortraitFrame", (1.84, 0.06, 3.88), (cx, cy, cz), metal, bevel=0.015)
    for dx in (-0.6, 0.6):
        box(f"PortraitLeg_{dx}", (0.07, 0.07, 0.9), (cx + dx, cy + 0.02, 0.45), metal)
    box("PortraitBase", (1.5, 0.3, 0.06), (cx, cy + 0.02, 0.04), metal)

    # uplight washing the photo
    box("PortraitLightStrip", (1.6, 0.08, 0.04), (cx, cy - 0.14, 0.12),
        emission_mat("PortraitWash", (1.0, 0.78, 0.52), 3.0))
    print("portrait added at", (cx, cy, cz))


def build_rooftop():
    concrete = simple_mat("Concrete", (0.10, 0.105, 0.115), 0.74)
    dark_metal = simple_mat("DarkMetal", (0.028, 0.030, 0.036), 0.42, 0.85)
    trim = simple_mat("Trim", (0.10, 0.11, 0.13), 0.38, 0.7)
    glass = simple_mat("StudioGlass", (0.02, 0.03, 0.05), 0.06, 0.0)
    warm = emission_mat("WarmLight", (1.0, 0.72, 0.42), 2.0)
    cyan = emission_mat("CyanLight", (0.30, 0.82, 1.0), 5.0)
    screen = emission_mat("ScreenGlow", (0.42, 0.75, 1.0), 1.0)
    plant_mat = simple_mat("Plant", (0.035, 0.12, 0.06), 0.7)

    # deck + parapet
    box("Deck", (30, 30, 1.2), (0, 0, -0.6), concrete, uv_scale=6.0)
    box("Parapet_S", (30, 0.4, 1.1), (0, -14.8, 0.55), concrete, bevel=0.03)
    box("Parapet_N", (30, 0.4, 1.1), (0, 14.8, 0.55), concrete, bevel=0.03)
    box("Parapet_W", (0.4, 30, 1.1), (-14.8, 0, 0.55), concrete, bevel=0.03)
    box("Parapet_E", (0.4, 30, 1.1), (14.8, 0, 0.55), concrete, bevel=0.03)
    box("ParapetCap_S", (30, 0.55, 0.08), (0, -14.8, 1.14), trim)
    box("ParapetCap_N", (30, 0.55, 0.08), (0, 14.8, 1.14), trim)
    box("ParapetCap_W", (0.55, 30, 0.08), (-14.8, 0, 1.14), trim)
    box("ParapetCap_E", (0.55, 30, 0.08), (14.8, 0, 1.14), trim)

    # deck seams
    for i in range(-5, 6):
        box(f"SeamX_{i}", (0.05, 29.2, 0.02), (i * 2.6, 0, 0.011), dark_metal)
    for i in range(-5, 6):
        box(f"SeamY_{i}", (29.2, 0.05, 0.02), (0, i * 2.6, 0.011), dark_metal)

    # studio pavilion, right side — open front so the interior reads from the walk path
    sx, sy = 9.0, 7.0
    warm_soft = emission_mat("WarmSoft", (1.0, 0.66, 0.38), 1.0)
    box("StudioFloor", (sx, sy, 0.3), (9, 7, 0.15), trim, bevel=0.02)
    box("StudioBack", (sx, 0.25, 3.3), (9, 7 + sy / 2, 1.75), concrete)
    box("StudioLeft", (0.25, sy, 3.3), (9 - sx / 2, 7, 1.75), concrete)
    box("StudioRight", (0.25, sy, 3.3), (9 + sx / 2, 7, 1.75), glass)
    box("StudioPostL", (0.2, 0.2, 3.3), (9 - sx / 2 + 0.1, 7 - sy / 2, 1.75), trim)
    box("StudioPostR", (0.2, 0.2, 3.3), (9 + sx / 2 - 0.1, 7 - sy / 2, 1.75), trim)
    box("StudioRoof", (sx + 0.6, sy + 0.6, 0.22), (9, 7, 3.5), trim, bevel=0.02)
    box("StudioRoofLip", (sx + 1.0, 0.16, 0.05), (9, 7 - sy / 2 - 0.2, 3.64), warm_soft)
    box("BackWallGlow", (sx - 2.0, 0.04, 0.10), (9, 10.4, 2.55), warm_soft)
    # interior: warm ceiling strip, rug, screens
    box("CeilStrip", (sx - 1.4, 0.35, 0.06), (9, 7, 3.28), warm)
    box("Rug", (4.6, 3.0, 0.03), (9, 7.6, 0.32), simple_mat("Rug", (0.09, 0.06, 0.05), 0.9))
    box("Desk", (4.2, 1.1, 0.08), (9, 8.4, 0.95), trim, bevel=0.02)
    for i, x in enumerate((7.7, 9.0, 10.3)):
        box(f"Monitor_{i}", (1.05, 0.06, 0.62), (x, 8.35, 1.42), dark_metal, bevel=0.01)
        emitting_plane(f"MonitorGlow_{i}", (0.92, 0.5), (x, 8.31, 1.42),
                       (math.radians(90), 0, 0), screen if i != 1 else cyan)
        box(f"MonitorStand_{i}", (0.08, 0.08, 0.42), (x, 8.42, 1.12), trim)
    box("DeskChair_Base", (0.7, 0.7, 0.05), (9, 9.4, 0.28), dark_metal, bevel=0.02)
    box("DeskChair_Back", (0.66, 0.08, 0.7), (9, 9.72, 0.85), dark_metal, bevel=0.02)
    cylinder("DeskChair_Post", 0.05, 0.5, (9, 9.4, 0.5), dark_metal, 12)
    # shelf + plant
    box("Shelf", (2.0, 0.4, 1.4), (5.4, 9.6, 1.5), trim, bevel=0.02)
    cylinder("PlantPot", 0.28, 0.5, (5.2, 9.4, 0.4), trim, 16)
    for i in range(9):
        a = i * 0.7
        box(f"Leaf_{i}", (0.06, 0.5, 0.06), (5.2 + math.sin(a) * 0.3, 9.4 + math.cos(a) * 0.3, 0.95 + i * 0.07),
            plant_mat, rot=(0.2, math.sin(a) * 0.5, a))
    # studio sign
    box("SignBoard", (3.4, 0.08, 0.7), (9, 3.44, 2.9), dark_metal, bevel=0.01)
    emitting_plane("SignGlow", (3.1, 0.42), (9, 3.39, 2.9), (math.radians(90), 0, 0), warm)

    # AC condensers, vents, water tank, antenna
    for i, (x, y, r) in enumerate(((-4.5, -9.5, 0.1), (-1.5, -9.5, -0.05), (2.0, -9.8, 0.06))):
        box(f"AC_{i}", (2.2, 1.6, 1.35), (x, y, 0.68), dark_metal, rot=(0, 0, r), bevel=0.04)
        cylinder(f"ACFan_{i}", 0.5, 0.12, (x, y - 0.82, 0.85), trim, 20,
                 rot=(math.radians(90), 0, 0))
    box("Vent", (1.6, 1.6, 0.5), (4.5, -4.0, 0.25), trim, bevel=0.03)
    for i in range(5):
        box(f"VentSlat_{i}", (1.4, 0.06, 0.06), (4.5, -4.6 + i * 0.3, 0.56), dark_metal)
    # water tank on legs
    for lx, ly in ((-6.6, 11.4), (-3.4, 11.4), (-6.6, 13.6), (-3.4, 13.6)):
        cylinder("TankLeg", 0.12, 1.6, (lx, ly, 0.8), trim, 10)
    cylinder("WaterTank", 1.5, 2.2, (-5.0, 12.5, 2.7), trim, 28)
    cylinder("TankLid", 1.55, 0.12, (-5.0, 12.5, 3.86), dark_metal, 28)
    # antenna mast + dish
    cylinder("Mast", 0.09, 9.0, (12.5, -11.0, 4.5), dark_metal, 12)
    for i in range(3):
        box(f"MastArm_{i}", (2.4, 0.06, 0.06), (12.5, -11.0, 6.0 + i * 1.2), trim,
            rot=(0, 0, i * 0.8))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.5,
                                         location=(12.5, -11.0, 9.1))
    beacon = bpy.context.object
    beacon.name = "AntennaBeacon"
    beacon.data.materials.append(emission_mat("BeaconRed", (1.0, 0.18, 0.12), 4.0))

    # cable trays
    for i, y in enumerate((-12.5, -12.1)):
        box(f"CableTray_{i}", (16, 0.28, 0.12), (0, y, 0.06), dark_metal)

    # rooftop neon sign standing on the south parapet
    carve_sign("AHMED ALI GHORI", loc=(0, -14.15, 2.55), size=1.35,
               mat=emission_mat("NeonSign", (0.66, 0.88, 1.0), 3.4))

    # LED strip at the base of the parapet
    strip = emission_mat("DeckStrip", (0.35, 0.80, 1.0), 1.6)
    box("DeckStripS", (28.6, 0.05, 0.04), (0, -14.3, 0.09), strip)
    box("DeckStripN", (28.6, 0.05, 0.04), (0, 14.3, 0.09), strip)
    box("DeckStripW", (0.05, 28.6, 0.04), (-14.3, 0, 0.09), strip)
    box("DeckStripE", (0.05, 28.6, 0.04), (14.3, 0, 0.09), strip)

    # festoon string lights over the deck
    bulb_mat = emission_mat("BulbWarm", (1.0, 0.66, 0.32), 2.2)
    for post_x in (-2.5, 6.5):
        cylinder(f"StringPost_{post_x}", 0.06, 2.8, (post_x, -11.5, 1.4), trim, 10)
    n = 11
    for i in range(n):
        t = i / (n - 1)
        x = -2.5 + t * 9.0
        z = 2.75 - 0.55 * math.sin(math.pi * t)
        bulb = bpy.data.objects.new(f"Bulb_{i}", bpy.data.meshes.new(f"bulb{i}"))
        bulb.data.from_pydata([(0, 0, 0), (0.075, 0, 0), (0, 0.075, 0), (0, 0, 0.075)], [],
                              [(0, 1, 2), (0, 2, 3), (0, 3, 1), (1, 3, 2)])
        bulb.location = (x, -11.5, z)
        bulb.data.materials.append(bulb_mat)
        bpy.context.scene.collection.objects.link(bulb)

    # floating project panels (left side of the walk path), facing east towards the camera
    panel_specs = [
        ((-9.4, 1.5, 4.8), -0.06),
        ((-10.8, 6.5, 5.2), -0.10),
        ((-12.0, 11.5, 5.6), -0.14),
        ((-12.8, 16.5, 6.0), -0.18),
    ]
    for i, (loc, yaw) in enumerate(panel_specs, start=1):
        build_panel(i, loc, math.radians(90) + yaw)

    # portrait of Ahmed on the studio wall
    add_portrait_frame()

    # camera path + look targets: one keyframe per story point, in walk order
    path = [
        (58, -92, 44), (30, -52, 22), (14, -28, 12), (5, -14, 8),
        (3, -6, 4.4), (-1, 1, 3.8), (-2.4, 7, 3.9), (-3.6, 13, 4.2),
        (-2.4, 19, 5.0), (10, 30, 14),
    ]
    look = [
        (0, 0, 10), (0, -4, 6), (6, -7, 4.2), (9, -7, 3.0),
        (-7, 1.5, 4.8), (-9, 6.5, 5.2), (-10.6, 11.5, 5.6), (-11.6, 16.5, 6.0),
        (0, -20, 8), (0, -40, 4),
    ]
    for i, p in enumerate(path, start=1):
        empty(f"Path_{i:02d}", p)
    for i, p in enumerate(look, start=1):
        empty(f"Look_{i:02d}", p)

    # per-panel anchors for HTML cards
    for i, (loc, _yaw) in enumerate(panel_specs, start=1):
        empty(f"Anchor_{i:02d}", (loc[0], loc[1], loc[2] - 0.15))

    empty("Anchor_Hero", (0, -8, 7.5))
    empty("Anchor_Contact", (-2, 25, 8.5))
    print("rooftop built")


def carve_sign(text, loc, size, mat):
    """Extruded glowing text, converted to mesh so glTF can carry it."""
    curve = bpy.data.curves.new("SignText", type="FONT")
    curve.body = text
    curve.size = size
    curve.extrude = 0.055
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.space_character = 1.25
    ob = bpy.data.objects.new("SignText", curve)
    ob.location = loc
    ob.rotation_euler = (math.radians(90), 0, 0)  # stand upright, face -Y
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.object
    ob.name = "SignTextMesh"
    ob.data.materials.append(mat)
    ob.select_set(False)
    return ob


def build_panel(index, loc, yaw):
    """A glowing frame that floats in the air; the web app projects an HTML card onto it."""
    frame_mat = simple_mat("PanelFrame", (0.06, 0.07, 0.09), 0.35, 0.9)
    edge = emission_mat("PanelEdge", (0.50, 0.80, 1.0), 1.7)
    pane = simple_mat("PanelPane", (0.012, 0.016, 0.028), 0.12, 0.55)

    w, h = 4.6, 2.6
    t = 0.1
    empty(f"Panel_{index:02d}", loc, (0, 0, yaw))

    def place(name, size, local, mat, bevel=0.0):
        c, s = math.cos(yaw), math.sin(yaw)
        off = (local[0] * c - local[1] * s, local[0] * s + local[1] * c, local[2])
        return box(name, size, (loc[0] + off[0], loc[1] + off[1], loc[2] + off[2]),
                   mat, rot=(0, 0, yaw), bevel=bevel)

    for name, size, off in (
        ("Top", (w, t, t), (0, 0, h / 2)),
        ("Bottom", (w, t, t), (0, 0, -h / 2)),
        ("Left", (t, t, h), (-w / 2, 0, 0)),
        ("Right", (t, t, h), (w / 2, 0, 0)),
    ):
        place(f"Panel{index}_{name}", size, off, frame_mat, bevel=0.01)

    for name, size, off in (
        ("GlowTop", (w * 0.98, 0.04, 0.04), (0, -0.075, h / 2)),
        ("GlowBottom", (w * 0.98, 0.04, 0.04), (0, -0.075, -h / 2)),
        ("GlowLeft", (0.04, 0.04, h * 0.98), (-w / 2, -0.075, 0)),
        ("GlowRight", (0.04, 0.04, h * 0.98), (w / 2, -0.075, 0)),
    ):
        place(f"Panel{index}_{name}", size, off, edge)

    place(f"Panel{index}_Pane", (w - 0.2, 0.04, h - 0.2), (0, 0.02, 0), pane)


# --------------------------------------------------------------------------- #
# the city
# --------------------------------------------------------------------------- #
def build_city(facade_mats):
    city_root = empty("CityRoot", (0, 0, -60))
    ground_mat = simple_mat("CityGround", (0.008, 0.008, 0.012), 0.9)
    deck_ground = box("CityGround", (2400, 2400, 2), (0, 0, -61), ground_mat, uv_scale=40)

    street = bpy.data.images.get("street") or bpy.data.images.load(os.path.join(TEX_DIR, "street.png"))
    glow_mat = texture_mat("StreetGlow", street, street, strength=0.7, rough=1.0, metal=0.0)

    created = []
    count = 0
    for ring, (r0, r1, n, hmin, hmax) in enumerate((
        (74, 150, 34, 18, 62),
        (150, 300, 46, 38, 118),
        (300, 520, 40, 60, 190),
        (520, 900, 34, 90, 250),
    )):
        for i in range(n):
            ang = (i / n) * math.tau + rng.uniform(-0.05, 0.05) + ring * 0.41
            rad = rng.uniform(r0, r1)
            x, y = math.cos(ang) * rad, math.sin(ang) * rad
            w = rng.uniform(12, 30)
            d = rng.uniform(12, 30)
            h = rng.uniform(hmin, hmax)
            mat = facade_mats[rng.randrange(len(facade_mats))]
            b = box(f"Bldg_{ring}_{i}", (w, d, h), (x, y, -60 + h / 2), mat,
                    rot=(0, 0, rng.uniform(0, math.tau)), uv_scale=13.0)
            b.parent = city_root
            created.append(b)
            count += 1
            if h > 90 and rng.random() < 0.55:
                beacon = bpy.data.objects.new(f"RoofBeacon_{ring}_{i}", bpy.data.meshes.new("beacon"))
                beacon.data.from_pydata([(0, 0, 0), (0.9, 0, 0), (0, 0.9, 0)], [], [(0, 1, 2)])
                beacon.location = (x, y, -60 + h + 0.6)
                beacon.data.materials.append(emission_mat("BeaconRed2", (1.0, 0.15, 0.1), 3.5))
                bpy.context.scene.collection.objects.link(beacon)
                beacon.parent = city_root

    # join buildings per material for cheap draw calls
    by_mat = {}
    for ob in created:
        key = ob.data.materials[0].name if ob.data.materials else "none"
        by_mat.setdefault(key, []).append(ob)
    for key, obs in by_mat.items():
        for ob in bpy.context.selected_objects:
            ob.select_set(False)
        for ob in obs:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = obs[0]
        bpy.ops.object.join()
        merged = bpy.context.object
        merged.name = f"City_{key}"
        merged.parent = city_root
        print("merged", merged.name, "tris", len(merged.data.polygons) * 2)

    # street light haze below
    haze = box("StreetHaze", (1800, 1800, 0.5), (0, 0, -59.5), glow_mat, uv_scale=90)
    haze.parent = city_root
    print("city buildings:", count)
    return city_root


def build_sky():
    make_sky_texture()
    sky_img = bpy.data.images.get("sky")
    mat = bpy.data.materials.new("SkyDome")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = sky_img
    tex.extension = "EXTEND"
    bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
    bsdf.inputs["Roughness"].default_value = 1.0
    bsdf.inputs["Emission Strength"].default_value = 1.4
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.location = (-250, 0)
    out.location = (50, 0)
    tex.location = (-550, 0)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1400)
    dome = bpy.context.object
    dome.name = "SkyDome"
    dome.data.materials.append(mat)
    # normals inward
    dome.scale = (-1, 1, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for p in dome.data.polygons:
        p.use_smooth = True
    return dome


def build_lighting():
    """A couple of real lights so Blender previews look right; the web app adds its own."""
    def add_light(name, kind, energy, loc, color=(1, 1, 1), size=6.0, rot=(0, 0, 0)):
        data = bpy.data.lights.new(name, kind)
        data.energy = energy
        data.color = color
        if kind == "AREA":
            data.size = size
        ob = bpy.data.objects.new(name, data)
        ob.location = loc
        ob.rotation_euler = rot
        bpy.context.scene.collection.objects.link(ob)
        return ob

    add_light("MoonLight", "SUN", 0.9, (30, -40, 60), (0.62, 0.74, 1.0),
              rot=(math.radians(52), 0, math.radians(35)))
    add_light("StudioSpill", "AREA", 900, (9, 3.2, 3.0), (1.0, 0.72, 0.45), 8.0,
              rot=(math.radians(70), 0, 0))
    add_light("PanelSpill", "AREA", 260, (-8, 6, 6.5), (0.6, 0.85, 1.0), 6.0,
              rot=(math.radians(80), 0, math.radians(-20)))

    def add_point(name, energy, loc, color=(1, 1, 1), radius=0.4):
        data = bpy.data.lights.new(name, "POINT")
        data.energy = energy
        data.color = color
        data.shadow_soft_size = radius
        ob = bpy.data.objects.new(name, data)
        ob.location = loc
        bpy.context.scene.collection.objects.link(ob)

    add_point("StudioInterior", 180, (9, 7.6, 2.5), (1.0, 0.70, 0.42), 1.2)
    add_point("DeskGlow", 90, (9, 8.0, 1.4), (0.55, 0.78, 1.0), 0.5)


# --------------------------------------------------------------------------- #
# export
# --------------------------------------------------------------------------- #
def export_glb():
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    kwargs = dict(
        filepath=GLB_PATH,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        # PNG beat JPEG here (0.85 MB vs 0.91 MB): the textures are tiny and the
        # payload is mostly buffers, so re-encoding as JPEG only added noise.
        export_image_format="AUTO",
    )
    try:
        bpy.ops.export_scene.gltf(**kwargs)
    except TypeError as exc:
        print("export retry without extras:", exc)
        kwargs.pop("export_extras", None)
        bpy.ops.export_scene.gltf(**kwargs)
    size = os.path.getsize(GLB_PATH) / 1024 / 1024
    print(f"exported {GLB_PATH} ({size:.2f} MB)")


def main():
    reset_scene()

    make_window_texture("facade_cool", (0.020, 0.026, 0.038),
                        (1.0, 0.80, 0.52), (0.45, 0.78, 1.0), 0.34, 1)
    make_window_texture("facade_steel", (0.026, 0.030, 0.036),
                        (0.95, 0.88, 0.72), (0.55, 0.85, 1.0), 0.40, 2)
    make_window_texture("facade_warm", (0.030, 0.022, 0.020),
                        (1.0, 0.62, 0.34), (1.0, 0.85, 0.62), 0.30, 3)
    make_street_texture()

    mats = [
        texture_mat("FacadeCool", bpy.data.images["facade_cool_base"],
                    bpy.data.images["facade_cool_emissive"], 1.15),
        texture_mat("FacadeSteel", bpy.data.images["facade_steel_base"],
                    bpy.data.images["facade_steel_emissive"], 0.95),
        texture_mat("FacadeWarm", bpy.data.images["facade_warm_base"],
                    bpy.data.images["facade_warm_emissive"], 1.25),
    ]

    build_rooftop()
    build_city(mats)
    build_sky()
    build_lighting()

    # preview camera looking at the rooftop from the city side
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = 32
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = (23, -36, 11)
    cam.rotation_euler = (Vector((0, 3, 5.2)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam

    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 48
    sc.cycles.use_denoising = True
    sc.render.resolution_x = 1280
    sc.render.resolution_y = 800
    sc.world = bpy.data.worlds[0] if bpy.data.worlds else bpy.data.worlds.new("World")
    sc.world.use_nodes = True
    bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.03, 0.035, 0.06, 1.0)
    bg.inputs["Strength"].default_value = 0.35

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    export_glb()

    tris = sum(len(o.data.polygons) for o in sc.objects if o.type == "MESH")
    print("objects:", len(sc.objects), "| faces:", tris)
    print("saved:", BLEND_PATH)


if __name__ == "__main__":
    main()
