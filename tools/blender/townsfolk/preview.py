# BELFORT townsfolk kit - preview renders (Cycles, CPU): lineups, face close-ups, a sitting pose.
# Lighting imitates the game's golden hour: a low warm sun, a cool blue sky fill and a warm bounce.

import bpy, math, os
from mathutils import Vector
from .common import log, PREVIEW, srgb


def look_at(o, target):
    d = Vector(target) - o.location
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def setup_scene(samples=48, res=(1600, 900), ground=True, ground_col='#7a6a58'):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.cycles.max_bounces = 4
    sc.cycles.diffuse_bounces = 2
    sc.cycles.glossy_bounces = 1
    sc.cycles.transparent_max_bounces = 4
    sc.render.threads_mode = 'FIXED'
    sc.render.threads = max(1, (os.cpu_count() or 2))
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Punchy' if 'AgX - Punchy' in [i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties['look'].enum_items_static] else 'None'
    sc.view_settings.exposure = 0.0
    w = bpy.data.worlds.get('pv_world') or bpy.data.worlds.new('pv_world')
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    # vertical gradient: warm haze at the horizon, cooler blue above
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = srgb('#e8c49a')
    ramp.color_ramp.elements[1].position = 0.45
    ramp.color_ramp.elements[1].color = srgb('#8fa6c4')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    nt.links.new(sep.outputs['Z'], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], bg.inputs[0])
    bg.inputs[1].default_value = 0.85
    nt.links.new(bg.outputs[0], out.inputs[0])
    for o in [o for o in bpy.data.objects if o.name.startswith('pv_')]:
        bpy.data.objects.remove(o)
    if ground:
        bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, 0))
        fl = bpy.context.object
        fl.name = 'pv_ground'
        m = bpy.data.materials.get('pv_ground') or bpy.data.materials.new('pv_ground')
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = srgb(ground_col)
        b.inputs['Roughness'].default_value = 0.95
        fl.data.materials.append(m)
    # golden-hour sun from the front-left, low
    sd = bpy.data.lights.new('pv_sun', 'SUN')
    sd.energy = 4.2
    sd.color = (1.0, 0.80, 0.58)
    sd.angle = math.radians(2.5)
    sun = bpy.data.objects.new('pv_sun', sd)
    sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(62), 0, math.radians(-38))
    # warm bounce from the ground / cool skylight from behind the camera
    fd = bpy.data.lights.new('pv_fill', 'AREA')
    fd.energy = 900
    fd.size = 12
    fd.color = (0.75, 0.84, 1.0)
    fill = bpy.data.objects.new('pv_fill', fd)
    sc.collection.objects.link(fill)
    fill.location = (6, -14, 6)
    look_at(fill, (0, 0, 1))
    rd = bpy.data.lights.new('pv_rim', 'AREA')
    rd.energy = 1400
    rd.size = 6
    rd.color = (1.0, 0.86, 0.66)
    rim = bpy.data.objects.new('pv_rim', rd)
    sc.collection.objects.link(rim)
    rim.location = (-8, 10, 5)
    look_at(rim, (0, 0, 1))
    cd = bpy.data.cameras.new('pv_cam')
    cam = bpy.data.objects.new('pv_cam', cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    return cam


def sun_dir(az_deg, elev_deg):
    sun = bpy.data.objects['pv_sun']
    sun.rotation_euler = (math.radians(90 - elev_deg), 0, math.radians(az_deg))


def shot(cam, path, loc, target, lens=50, res=None, ortho=None):
    sc = bpy.context.scene
    if res:
        sc.render.resolution_x, sc.render.resolution_y = res
    cam.location = Vector(loc)
    look_at(cam, Vector(target))
    if ortho:
        cam.data.type = 'ORTHO'
        cam.data.ortho_scale = ortho
    else:
        cam.data.type = 'PERSP'
        cam.data.lens = lens
    cam.data.clip_start = 0.05
    cam.data.clip_end = 200
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    log('rendered', path)


def render_all():
    from . import assemble
    assemble.render_previews()
