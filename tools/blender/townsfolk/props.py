# BELFORT townsfolk kit - hand props. Each prop is one rigid mesh in its own frame (origin = grip point,
# +Z = up along the held object when the hand hangs at rest, +Y = forward), meant to be parented to the
# hand_l / hand_r joint with a per-body grip offset (see grip_frame()).

import bpy, bmesh, math
import numpy as np
from mathutils import Vector, Matrix
from .common import log, get_bm, put_bm, lathe_mesh, torus_mesh, rounded_box, set_part, new_mesh_obj, to_coll, set_aux, \
    dye_from_parts, set_dye, shade_smooth, ensure_aux
from .garments import tube, join, solidify, deg

PROPS = {}


def prop(name, hand, desc, grip='hang'):
    def deco(fn):
        PROPS[name] = dict(fn=fn, hand=hand, desc=desc, grip=grip)
        return fn
    return deco


def sphere(name, r, part, seg=10, rings=6, scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    for v in bm.verts:
        v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    set_part(o, part)
    shade_smooth(o)
    return o


@prop('basket', 'hand_l', 'wicker market basket with a bow handle, hanging from the hand', 'hang')
def p_basket(_):
    # grip at the top of the handle; the basket hangs below it
    body = lathe_mesh('basket', [(0.0, -0.34), (0.13, -0.34), (0.165, -0.31), (0.19, -0.24), (0.20, -0.20), (0.205, -0.19),
                                 (0.19, -0.19), (0.18, -0.24), (0.155, -0.30), (0.0, -0.31)], 20, 'straw')
    body.data.transform(Matrix.Diagonal((1.0, 0.72, 1.0, 1.0)))
    rim = torus_mesh('basket_rim', 0.2, 0.012, 24, 6, 'straw')
    rim.data.transform(Matrix.Diagonal((1.0, 0.72, 1.0, 1.0)) @ Matrix.Translation((0, 0, -0.19)))
    pts = [Vector((0.19 * math.cos(a), 0, -0.19 + 0.19 * math.sin(a))) for a in np.linspace(0, math.pi, 16)]
    handle = tube('basket_handle', pts, 0.011, 6, 'straw')
    cloth = sphere('basket_cloth', 0.15, 'linen_d', scale=(1.1, 0.75, 0.35))
    cloth.data.transform(Matrix.Translation((0, 0, -0.195)))
    o = join([body, rim, handle, cloth], 'basket')
    o.data.transform(Matrix.Translation((0, 0, -0.0)))
    return o


@prop('staff', 'hand_r', 'pilgrim\'s staff with a knob and a drinking gourd tied below it', 'fist')
def p_staff(_):
    pts = [Vector((0, 0, z)) for z in np.linspace(-0.95, 0.70, 12)]
    st = tube('staff', pts, 0.016, 8, 'wood', [0.014 + 0.004 * (i / 11) for i in range(12)])
    knob = sphere('staff_knob', 0.03, 'wood')
    knob.data.transform(Matrix.Translation((0, 0, 0.72)))
    gourd = lathe_mesh('gourd', [(0.0, 0.0), (0.012, -0.004), (0.016, -0.03), (0.04, -0.06), (0.052, -0.10), (0.05, -0.14),
                                 (0.035, -0.17), (0.0, -0.18)], 12, 'gourd')
    gourd.data.transform(Matrix.Translation((0.05, 0, 0.58)))
    cord = tube('gourd_cord', [Vector((0.016, 0, 0.62)), Vector((0.04, 0, 0.60)), Vector((0.05, 0, 0.58))], 0.003, 5, 'rope')
    return join([st, knob, gourd, cord], 'staff')


@prop('stick', 'hand_r', 'old man\'s walking stick with a crook', 'fist')
def p_stick(_):
    pts = [Vector((0, 0, z)) for z in np.linspace(-0.86, 0.04, 9)]
    pts += [Vector((0.045 * (1 - math.cos(a)), 0, 0.04 + 0.045 * math.sin(a))) for a in np.linspace(0.3, math.pi, 7)]
    return tube('stick', pts, 0.013, 7, 'wood')


@prop('bread', 'hand_l', 'a round loaf and a long loaf tied together with a cord', 'hang')
def p_bread(_):
    a = sphere('loaf_round', 0.095, 'bread', seg=16, rings=8, scale=(1.0, 1.0, 0.5))
    bm = get_bm(a)
    for v in bm.verts:                       # a scored cross on top
        if v.co.z > 0.02:
            v.co.z -= 0.010 * (math.exp(-(v.co.x / 0.008) ** 2) + math.exp(-(v.co.y / 0.008) ** 2))
    put_bm(bm, a)
    a.data.transform(Matrix.Rotation(deg(90), 4, 'X'))
    a.data.transform(Matrix.Translation((0, 0.03, -0.11)))
    b = sphere('loaf_long', 0.06, 'bread', seg=14, rings=7, scale=(1.0, 0.75, 2.6))
    b.data.transform(Matrix.Translation((0.0, -0.035, -0.13)))
    cord = torus_mesh('bread_cord', 0.07, 0.004, 16, 4, 'rope')
    cord.data.transform(Matrix.Rotation(deg(90), 4, 'Y'))
    cord.data.transform(Matrix.Translation((0, 0, -0.10)))
    return join([a, b, cord], 'bread')


@prop('lantern', 'hand_r', 'small iron lantern with horn panes, hanging from a ring', 'hang')
def p_lantern(_):
    box = rounded_box('lantern_box', (0.10, 0.10, 0.15), 'glass', roundness=0.15, cuts=1)
    box.data.transform(Matrix.Translation((0, 0, -0.14)))
    roof = lathe_mesh('lantern_roof', [(0.0, 0.06), (0.02, 0.05), (0.075, 0.0), (0.075, -0.01), (0.0, -0.01)], 4, 'iron')
    roof.data.transform(Matrix.Rotation(deg(45), 4, 'Z') @ Matrix.Translation((0, 0, -0.055)))
    base = rounded_box('lantern_base', (0.12, 0.12, 0.02), 'iron', roundness=0.2, cuts=1)
    base.data.transform(Matrix.Translation((0, 0, -0.225)))
    ring = torus_mesh('lantern_ring', 0.025, 0.004, 12, 4, 'iron')
    ring.data.transform(Matrix.Rotation(deg(90), 4, 'X') @ Matrix.Translation((0, 0, 0)))
    ring.data.transform(Matrix.Translation((0, 0, -0.01)))
    bars = []
    for sx, sy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        bars.append(tube('lantern_bar', [Vector((0.052 * sx, 0.052 * sy, -0.215)), Vector((0.052 * sx, 0.052 * sy, -0.06))], 0.005, 4, 'iron'))
    return join([box, roof, base, ring] + bars, 'lantern')


@prop('rosary', 'hand_l', 'wooden rosary beads with a small cross, hanging from the fingers', 'hang')
def p_rosary(_):
    beads = []
    n = 30
    for i in range(n):
        a = 2 * math.pi * i / n
        x = 0.035 * math.sin(a)
        z = -0.13 * (1 - math.cos(a)) / 2 - 0.01
        beads.append(sphere('bead', 0.0065, 'beads', seg=6, rings=4))
        beads[-1].data.transform(Matrix.Translation((x, 0, z)))
    tail = []
    for j in range(5):
        tail.append(sphere('bead', 0.0075, 'beads', seg=6, rings=4))
        tail[-1].data.transform(Matrix.Translation((0, 0, -0.14 - 0.017 * j)))
    cr1 = rounded_box('cross_v', (0.008, 0.006, 0.045), 'wood', roundness=0.2, cuts=1)
    cr1.data.transform(Matrix.Translation((0, 0, -0.24)))
    cr2 = rounded_box('cross_h', (0.03, 0.006, 0.008), 'wood', roundness=0.2, cuts=1)
    cr2.data.transform(Matrix.Translation((0, 0, -0.232)))
    return join(beads + tail + [cr1, cr2], 'rosary')


@prop('bundle', 'hand_l', 'cloth bundle tied at the top, carried by the knot', 'hang')
def p_bundle(_):
    b = sphere('bundle', 0.15, 'cloth_b', seg=14, rings=8, scale=(1.0, 0.8, 0.8))
    bm = get_bm(b)
    for v in bm.verts:                       # soft lumps and a gathered top
        v.co.z -= 0.12
        lump = 0.012 * math.sin(v.co.x * 40) * math.cos(v.co.y * 35)
        v.co += v.co.normalized() * lump
        if v.co.z > -0.03:
            t = (v.co.z + 0.03) / 0.05
            v.co.x *= 1 - 0.6 * t
            v.co.y *= 1 - 0.6 * t
    put_bm(bm, b)
    knot = sphere('bundle_knot', 0.035, 'cloth_b', scale=(1.4, 0.8, 0.8))
    knot.data.transform(Matrix.Translation((0, 0, 0.0)))
    return join([b, knot], 'bundle')


def build_props():
    out = {}
    for name, spec in PROPS.items():
        o = spec['fn'](None)
        o.name = o.data.name = f'prop.{name}'
        ensure_aux(o)
        dye_from_parts(o)
        o['prop'] = name
        o['hand'] = spec['hand']
        to_coll(o, 'P.props')
        o.hide_render = True
        out[name] = o
        log('prop %-8s %-7s tris %d' % (name, spec['hand'], sum(len(p.vertices) - 2 for p in o.data.polygons)))
    return out


def grip_frame(rig, hand, grip='hang', pose=False):
    """Grip point and frame of a hand in armature space (rest pose, or the current pose with pose=True).
    'fist': a stick runs through the curled fingers from the little finger to the index (prop +Z);
    'hang': the prop hangs from the fingers (prop +Z points back up the fingers, towards the wrist)."""
    sd = hand[-1]
    if pose:
        P = rig.pose.bones
        h, m1, i1, p1 = (P[n].head for n in (hand, f'middle_01_{sd}', f'index_01_{sd}', f'pinky_01_{sd}'))
    else:
        b = rig.data.bones
        h, m1, i1, p1 = (b[n].head_local for n in (hand, f'middle_01_{sd}', f'index_01_{sd}', f'pinky_01_{sd}'))
    across = (i1 - p1).normalized()
    along = (m1 - h).normalized()
    normal = along.cross(across).normalized()
    if (normal.x > 0) == (sd == 'l'):             # make it point out of the palm (towards the midline at rest)
        normal = -normal
    if grip == 'fist':
        origin = m1 + along * 0.02 + normal * 0.03
        z = across
    else:
        origin = m1 + along * 0.06 + normal * 0.012
        z = -along
    y = normal.cross(z).normalized()
    x = y.cross(z).normalized()
    M = Matrix((x, y, z)).transposed().to_4x4()
    M.translation = origin
    return M
