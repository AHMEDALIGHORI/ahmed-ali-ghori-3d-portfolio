"""Render the social preview card (1200x630) from the saved world.

    blender -b blender/world.blend --python blender/render_og.py -- public/og.jpg
"""

import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = r"E:\portfolio-3d"
target = os.path.join(ROOT, "public", "og.jpg")
if "--" in sys.argv:
    extra = sys.argv[sys.argv.index("--") + 1:]
    if extra:
        target = extra[0]

scene = bpy.context.scene

# hero camera: the same framing the site opens on
cam_data = bpy.data.cameras.new("OGCam")
cam_data.lens = 34
cam = bpy.data.objects.new("OGCam", cam_data)
scene.collection.objects.link(cam)
cam.location = (30, -48, 16)
cam.rotation_euler = (Vector((0, 0, 6.5)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

scene.render.engine = "CYCLES"
scene.cycles.samples = 80
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 630
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 88
scene.render.filepath = target

bpy.ops.render.render(write_still=True)
print("og written:", target, os.path.getsize(target) // 1024, "KB")
