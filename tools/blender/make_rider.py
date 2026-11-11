# BELFORT - the Rider. Builds public/models/rider.glb with headless Blender 4.2.
#
#   tools/blender/fetch_rider_assets.sh [cache-dir]         (once; downloads CC0 inputs)
#   RIDER_CACHE=<cache-dir> blender -b --python tools/blender/make_rider.py
#
# RIDER_CACHE defaults to ~/.cache/belfort-rider. Optional environment:
#   RIDER_OUT    output .glb (default <repo>/public/models/rider.glb)
#   RIDER_WORK   directory for stage .blend files and intermediate bakes (dev only)
#   RIDER_FROM   resume from a stage saved in RIDER_WORK: human|garments|mesh|paint|anim
#   RIDER_UNTIL  stop after that stage
#
# Route: MPFB2 (MakeHuman) for the body, face, hands, rig ("game_engine" rig,
# Unreal-style bone names) and skin weights; every garment is modelled here in
# Python over MakeHuman's clothing-helper shells; textures are painted
# procedurally (numpy) from baked position/normal/AO maps; motion comes from the
# Quaternius Universal Animation Library (CC0), retargeted in this script.
# See RIDER_NOTES.md for the skeleton spec, the clip list and asset licences.

import bpy, bmesh, sys, os, math, glob, json, random
import numpy as np
from mathutils import Vector, Matrix, Quaternion, Euler
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
CACHE = os.environ.get('RIDER_CACHE', os.path.join(os.path.expanduser('~'), '.cache', 'belfort-rider'))
OUT_GLB = os.environ.get('RIDER_OUT', os.path.join(REPO, 'public', 'models', 'rider.glb'))
WORK = os.environ.get('RIDER_WORK', '')
FROM = os.environ.get('RIDER_FROM', '')
UNTIL = os.environ.get('RIDER_UNTIL', '')
STAGES = ['human', 'garments', 'mesh', 'paint', 'anim']

HEIGHT = 1.78
TEX = 2048
MPFB_MOD = 'bl_ext.user_default.mpfb'
RNG = random.Random(1302)          # the year of the Golden Spurs; any fixed seed will do


def log(*a):
    print('[rider]', *a, flush=True)


# --------------------------------------------------------------------------
# small utilities
# --------------------------------------------------------------------------
def srgb(hexstr, a=1.0):
    h = hexstr.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    lin = [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c]
    return (lin[0], lin[1], lin[2], a)


# part name -> (id, preview colour). The id is what the paint stage keys on.
PARTS = {
    'skin':    (1, '#c2906f'),
    'eye':     (2, '#e8e2d8'),
    'hair':    (3, '#2b1c15'),
    'tunic':   (4, '#6d6656'),
    'jerkin':  (5, '#2f2622'),
    'hose':    (6, '#2c2b31'),
    'boot':    (7, '#6a4226'),
    'strap':   (8, '#5b3920'),
    'brass':   (9, '#b88f3c'),
    'bracer':  (10, '#4a3020'),
    'cloak':   (11, '#8f2a20'),
    'lining':  (12, '#4e1a17'),
    'mantle':  (13, '#96301f'),
    'pouch':   (14, '#6b4a2b'),
    'sole':    (15, '#241a14'),
    'belt':    (16, '#4f321d'),
}


def part_mat(part):
    name = 'P_' + part
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = srgb(PARTS[part][1])
        b.inputs['Roughness'].default_value = 0.35 if part == 'brass' else 0.75
        b.inputs['Metallic'].default_value = 1.0 if part == 'brass' else 0.0
    return m


def set_part(obj, part):
    obj.data.materials.clear()
    obj.data.materials.append(part_mat(part))
    for p in obj.data.polygons:
        p.material_index = 0


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def new_mesh_obj(name, verts, faces, part=None, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.update()
    ob = link(bpy.data.objects.new(name, me))
    if part:
        set_part(ob, part)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return ob


def activate(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def tri_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def get_bm(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    return bm


def put_bm(bm, obj):
    bm.normal_update()
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def shade_smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def dup(obj, name):
    o = obj.copy()
    o.data = obj.data.copy()
    o.name = name
    o.data.name = name
    link(o)
    for m in list(o.modifiers):
        o.modifiers.remove(m)
    o.parent = None
    return o


def implicit_cut(obj, fn):
    """Keep the part of the mesh where fn(co, w) < 0 and cut cleanly along fn == 0.
    w(name) returns the vertex's weight in the named vertex group (0 if absent)."""
    bm = get_bm(obj)
    dl = bm.verts.layers.deform.verify()
    gidx = {g.name: g.index for g in obj.vertex_groups}

    def val(v):
        d = v[dl]
        return fn(v.co, lambda n: d.get(gidx[n], 0.0) if n in gidx else 0.0)

    vals = {v: val(v) for v in bm.verts}
    crossing = [e for e in bm.edges if (vals[e.verts[0]] < 0) != (vals[e.verts[1]] < 0)]
    new = []
    for e in crossing:
        a, b = e.verts
        fa, fb = vals[a], vals[b]
        t = min(max(fa / (fa - fb), 0.03), 0.97)
        _, nv = bmesh.utils.edge_split(e, a, t)
        vals[nv] = 0.0
        new.append(nv)
    if new:
        bmesh.ops.connect_verts(bm, verts=new)
    kill = [v for v in bm.verts if vals.get(v, 0.0) > 1e-9]
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    put_bm(bm, obj)


def inflate(obj, dist, smooth_iter=0, smooth_fac=0.5, weight_fn=None):
    bm = get_bm(obj)
    bm.normal_update()
    for v in bm.verts:
        d = dist * (weight_fn(v.co) if weight_fn else 1.0)
        v.co += v.normal * d
    for _ in range(smooth_iter):
        inner = [v for v in bm.verts if not v.is_boundary]
        bmesh.ops.smooth_vert(bm, verts=inner, factor=smooth_fac, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    put_bm(bm, obj)


def smooth_boundary(obj, iters=2, fac=0.5):
    """Relax boundary loops along themselves (removes stair-steps left by cuts)."""
    bm = get_bm(obj)
    for _ in range(iters):
        newco = {}
        for v in bm.verts:
            if not v.is_boundary:
                continue
            nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
            if len(nb) == 2:
                newco[v] = v.co.lerp((nb[0].co + nb[1].co) / 2, fac)
        for v, c in newco.items():
            v.co = c
    put_bm(bm, obj)


def rim(obj, depth, inward=0.0):
    """Give open borders visible thickness: extrude every boundary edge back along -normal."""
    bm = get_bm(obj)
    bm.normal_update()
    edges = [e for e in bm.edges if e.is_boundary]
    if not edges:
        bm.free()
        return
    normals = {v: v.normal.copy() for e in edges for v in e.verts}
    # direction pointing from the border into the surface (to tuck the rim under)
    tuck = {}
    for v in normals:
        acc = Vector()
        for f in v.link_faces:
            acc += f.calc_center_median() - v.co
        tuck[v] = acc.normalized() if acc.length > 1e-9 else Vector()
    r = bmesh.ops.extrude_edge_only(bm, edges=edges)
    newv = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
    # map new verts to their source by position
    src = {tuple(round(c, 6) for c in v.co): v for v in normals}
    for nv in newv:
        s = src.get(tuple(round(c, 6) for c in nv.co))
        if s is not None:
            nv.co += -normals[s] * depth + tuck[s] * inward
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    put_bm(bm, obj)


def bvh_of(objs):
    verts, polys = [], []
    for o in objs:
        base = len(verts)
        verts += [o.matrix_world @ v.co for v in o.data.vertices]
        polys += [[base + i for i in p.vertices] for p in o.data.polygons]
    return BVHTree.FromPolygons(verts, polys)


def transfer_weights(dst, src, bone_names):
    """Copy skin weights from the closest surface point of src (interpolated)."""
    for g in list(dst.vertex_groups):
        dst.vertex_groups.remove(g)
    for g in src.vertex_groups:
        if g.name in bone_names:
            dst.vertex_groups.new(name=g.name)
    m = dst.modifiers.new('wt', 'DATA_TRANSFER')
    m.object = src
    m.use_vert_data = True
    m.data_types_verts = {'VGROUP_WEIGHTS'}
    m.vert_mapping = 'POLYINTERP_NEAREST'
    m.layers_vgroup_select_src = 'ALL'
    m.layers_vgroup_select_dst = 'NAME'
    activate(dst)
    bpy.ops.object.modifier_apply(modifier=m.name)


def rigid_weight(obj, bone, w=1.0):
    for g in list(obj.vertex_groups):
        obj.vertex_groups.remove(g)
    g = obj.vertex_groups.new(name=bone)
    g.add(list(range(len(obj.data.vertices))), w, 'REPLACE')


def clean_weights(obj, bone_names, limit=4):
    """Drop non-bone groups, limit to 4 influences, normalise."""
    for g in list(obj.vertex_groups):
        if g.name not in bone_names:
            obj.vertex_groups.remove(g)
    if not obj.vertex_groups:
        return
    idx2name = {g.index: g.name for g in obj.vertex_groups}
    for v in obj.data.vertices:
        ws = sorted(((g.weight, g.group) for g in v.groups), reverse=True)
        keep = [(w, gi) for w, gi in ws[:limit] if w > 1e-4]
        tot = sum(w for w, _ in keep)
        for w, gi in ws:
            if (w, gi) not in keep:
                obj.vertex_groups[idx2name[gi]].remove([v.index])
        if tot <= 0:
            continue
        for w, gi in keep:
            obj.vertex_groups[idx2name[gi]].add([v.index], w / tot, 'REPLACE')


def set_aux(obj, values):
    """Per-vertex float colour 'aux' (r,g,b) that the paint stage reads back from a bake."""
    me = obj.data
    a = me.color_attributes.get('aux') or me.color_attributes.new('aux', 'FLOAT_COLOR', 'POINT')
    flat = np.ones((len(me.vertices), 4), dtype=np.float32)
    flat[:, :3] = np.asarray(values, dtype=np.float32).reshape(-1, 3)
    a.data.foreach_set('color', flat.ravel())


def ensure_aux(obj):
    me = obj.data
    if me.color_attributes.get('aux') is None:
        set_aux(obj, np.zeros((len(me.vertices), 3)))


def bone_pos(rig, name, tail=False):
    b = rig.data.bones[name]
    return (b.tail_local if tail else b.head_local).copy()


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length


def save_stage(name):
    if WORK:
        os.makedirs(WORK, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, f'stage_{name}.blend'), check_existing=False)
        log('saved stage', name)


def load_stage(name):
    bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, f'stage_{name}.blend'))
    log('loaded stage', name)


# --------------------------------------------------------------------------
# stage 1: the human (MPFB2)
# --------------------------------------------------------------------------
def ensure_mpfb():
    import addon_utils
    try:
        addon_utils.enable(MPFB_MOD, default_set=False)
        __import__(MPFB_MOD + '.services.humanservice')
        return
    except Exception:
        pass
    z = os.path.join(CACHE, 'mpfb.zip')
    if not os.path.isfile(z):
        raise SystemExit(f'MPFB2 is not installed and {z} is missing: run tools/blender/fetch_rider_assets.sh first')
    log('installing MPFB2 from', z)
    bpy.ops.extensions.package_install_files(filepath=z, repo='user_default', enable_on_install=True)
    addon_utils.enable(MPFB_MOD, default_set=True)
    bpy.ops.wm.save_userpref()


# MakeHuman macro sliders: an adult, lean but athletic man.
MACROS = dict(gender=1.0, age=0.56, muscle=0.70, weight=0.40, height=0.6, proportions=0.68)
# Detail targets: a lean, strong-jawed face and slightly heroic proportions
# (broader shoulders, larger hands/feet/head) for a readable stylised silhouette.
TARGETS = {
    'head-fat-decr': 0.55, 'head-rectangular': 0.35, 'head-age-incr': 0.15,
    'l-cheek-volume-decr': 0.55, 'r-cheek-volume-decr': 0.55,
    'l-cheek-bones-incr': 0.6, 'r-cheek-bones-incr': 0.6,
    'chin-prominent-incr': 0.35, 'chin-width-incr': 0.35, 'chin-bones-incr': 0.5,
    'nose-hump-incr': 0.3, 'nose-scale-vert-incr': 0.15, 'nose-greek-incr': 0.2,
    'eyebrows-trans-down': 0.35, 'eyebrows-trans-forward': 0.5,
    'l-eye-scale-incr': 0.25, 'r-eye-scale-incr': 0.25,
    'head-scale-horiz-incr': 0.18, 'head-scale-vert-incr': 0.18, 'head-scale-depth-incr': 0.18,
    'measure-shoulder-dist-incr': 0.45, 'torso-vshape-incr': 0.35,
    'l-hand-scale-incr': 0.35, 'r-hand-scale-incr': 0.35,
    'l-foot-scale-incr': 0.3, 'r-foot-scale-incr': 0.3,
    'measure-neck-circ-incr': 0.2,
}


def extract_group(basemesh, group, name):
    o = dup(basemesh, name)
    gi = o.vertex_groups[group].index
    bm = get_bm(o)
    dl = bm.verts.layers.deform.verify()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if gi not in v[dl]], context='VERTS')
    put_bm(bm, o)
    return o


def stage_human():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ensure_mpfb()
    import importlib
    HumanService = importlib.import_module(MPFB_MOD + '.services.humanservice').HumanService
    TargetService = importlib.import_module(MPFB_MOD + '.services.targetservice').TargetService

    md = TargetService.get_default_macro_info_dict()
    md.update(MACROS)
    md['race'] = dict(asian=0.0, caucasian=1.0, african=0.0)
    body = HumanService.create_human(scale=0.1, macro_detail_dict=md)
    for k, v in TARGETS.items():
        TargetService.load_target(body, TargetService.target_full_path(k), weight=v, name=k)
    TargetService.bake_targets(body)
    rig = HumanService.add_builtin_rig(body, 'game_engine')
    boots_mhclo = glob.glob(os.path.join(CACHE, 'mh', 'culturalibre_male_boots', '*.mhclo'))
    if not boots_mhclo:
        raise SystemExit('boots asset missing: run tools/blender/fetch_rider_assets.sh')
    boots = HumanService.add_mhclo_asset(boots_mhclo[0], body, asset_type='Clothes', subdiv_levels=0,
                                         material_type='MAKESKIN')

    # scale everything to exactly HEIGHT (data, not object transforms)
    gi = body.vertex_groups['body'].index
    top = max(v.co.z for v in body.data.vertices if any(g.group == gi for g in v.groups))
    s = HEIGHT / top
    log('MakeHuman height', round(top, 4), '-> scale', round(s, 4))
    S = Matrix.Scale(s, 4)
    for o in (body, boots):
        for m in list(o.modifiers):
            o.modifiers.remove(m)
        o.parent = None
        o.matrix_world = Matrix.Identity(4)
        o.data.transform(S)
    rig.matrix_world = Matrix.Identity(4)
    rig.data.transform(S)
    rig.name = 'rider_rig'
    rig.data.name = 'rider_rig'
    body.name = 'body'
    boots.name = 'boots'

    # MakeHuman's clothing helpers: body-hugging shells that already carry skin weights.
    tights = extract_group(body, 'helper-tights', 'h_tights')
    skirt = extract_group(body, 'helper-skirt', 'h_skirt')
    hairh = extract_group(body, 'helper-hair', 'h_hair')
    eye_l = extract_group(body, 'helper-l-eye', 'eye_l')
    eye_r = extract_group(body, 'helper-r-eye', 'eye_r')
    bm = get_bm(body)
    dl = bm.verts.layers.deform.verify()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if gi not in v[dl]], context='VERTS')
    put_bm(bm, body)
    # MakeHuman's lips / scalp / fingernail vertex groups become paint masks (aux r, g, b)
    aux = np.zeros((len(body.data.vertices), 3), dtype=np.float32)
    for ch, gname in enumerate(('lips', 'scalp', 'fingernails')):
        g = body.vertex_groups.get(gname)
        if g is None:
            continue
        for v in body.data.vertices:
            if any(e.group == g.index for e in v.groups):
                aux[v.index, ch] = 1.0
    set_aux(body, aux)
    bones = {b.name for b in rig.data.bones}
    for o in (body, boots, tights, skirt, hairh, eye_l, eye_r):
        clean_weights(o, bones, limit=8)
        shade_smooth(o)
    set_part(body, 'skin')
    set_part(boots, 'boot')
    set_part(eye_l, 'eye')
    set_part(eye_r, 'eye')
    set_part(hairh, 'hair')
    for o in (tights, skirt):
        set_part(o, 'hose')
    log('body tris', tri_count(body), 'boots tris', tri_count(boots))
    ua = rig.data.bones['upperarm_l']
    d = (ua.tail_local - ua.head_local).normalized()
    log('rest pose: upper arm %.1f deg below horizontal' % math.degrees(math.asin(-d.z)))


# --------------------------------------------------------------------------
# stage 2: garments, modelled over the MakeHuman helper shells
# --------------------------------------------------------------------------
ARM_BONES = ('upperarm', 'lowerarm', 'hand', 'thumb_01', 'thumb_02', 'thumb_03', 'index_01', 'index_02', 'index_03',
             'middle_01', 'middle_02', 'middle_03', 'ring_01', 'ring_02', 'ring_03', 'pinky_01', 'pinky_02', 'pinky_03')


def w_arm(w, side=None):
    sides = ('l', 'r') if side is None else (side,)
    return sum(w(f'{b}_{s}') for b in ARM_BONES for s in sides)


def smoothstep(a, b, x):
    if a == b:
        return 0.0 if x < a else 1.0
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def mirror_x(v):
    return Vector((-v.x, v.y, v.z))


def torus_mesh(name, R, r, nu, nv, part, squash=1.0):
    verts, faces = [], []
    for i in range(nu):
        a = 2 * math.pi * i / nu
        for j in range(nv):
            b = 2 * math.pi * j / nv
            rr = R + r * math.cos(b)
            verts.append((rr * math.cos(a), rr * math.sin(a), r * squash * math.sin(b)))
    for i in range(nu):
        for j in range(nv):
            a0, a1 = i * nv, ((i + 1) % nu) * nv
            faces.append((a0 + j, a1 + j, a1 + (j + 1) % nv, a0 + (j + 1) % nv))
    return new_mesh_obj(name, verts, faces, part)


def lathe_mesh(name, profile, nseg, part):
    """profile: list of (radius, z) from top to bottom; revolved about Z."""
    verts, faces = [], []
    for (r, z) in profile:
        for i in range(nseg):
            a = 2 * math.pi * i / nseg
            verts.append((r * math.cos(a), r * math.sin(a), z))
    for k in range(len(profile) - 1):
        for i in range(nseg):
            a0, a1 = k * nseg, (k + 1) * nseg
            faces.append((a0 + i, a0 + (i + 1) % nseg, a1 + (i + 1) % nseg, a1 + i))
    o = new_mesh_obj(name, verts, faces, part)
    bm = get_bm(o)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    put_bm(bm, o)
    return o


def rounded_box(name, size, part, roundness=0.5, cuts=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    for v in bm.verts:
        v.co = v.co.lerp(v.co.normalized() * 0.62, roundness)
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    set_part(o, part)
    shade_smooth(o)
    return o


def place(obj, origin, x_axis, y_axis, z_axis):
    """Bake a rigid frame into the mesh data (objects stay at identity)."""
    m = Matrix((x_axis, y_axis, z_axis)).transposed().to_4x4()
    flip = m.to_3x3().determinant() < 0
    m.translation = origin
    obj.data.transform(m)
    if flip:
        obj.data.flip_normals()
    obj.data.update()


def convex_ring(bvh, c, n, nsamp=120, count=44, front=Vector((0, -1, 0))):
    """Taut loop around whatever bvh holds, in the plane (c, n). Returns evenly spaced 3D points,
    starting at the front and running towards the character's left (+X)."""
    n = n.normalized()
    e1 = (front - n * n.dot(front)).normalized()
    e2 = n.cross(e1)
    if e2.x < 0:
        e2 = -e2
    pts = []
    for i in range(nsamp):
        a = 2 * math.pi * i / nsamp
        d = e1 * math.cos(a) + e2 * math.sin(a)
        loc, _, _, _ = bvh.ray_cast(c + d * 1.5, -d, 1.5)
        if loc is not None:
            r = (loc - c).length
            pts.append(Vector((r * math.cos(a), r * math.sin(a))))
    from mathutils import geometry
    hull = [pts[i] for i in geometry.convex_hull_2d(pts)]
    # make it start at the front (largest u) and go towards +v
    area = sum(hull[i].x * hull[(i + 1) % len(hull)].y - hull[(i + 1) % len(hull)].x * hull[i].y for i in range(len(hull)))
    if area < 0:
        hull.reverse()
    k = max(range(len(hull)), key=lambda i: hull[i].x - abs(hull[i].y) * 2)
    hull = hull[k:] + hull[:k]
    # subdivide and relax so the corners of the hull are rounded like a real strap
    dense = []
    for i in range(len(hull)):
        a, b = hull[i], hull[(i + 1) % len(hull)]
        steps = max(1, int((b - a).length / 0.004))
        dense += [a.lerp(b, s / steps) for s in range(steps)]
    for _ in range(6):
        dense = [(dense[i - 1] + dense[i] * 2 + dense[(i + 1) % len(dense)]) / 4 for i in range(len(dense))]
    seg = [(dense[(i + 1) % len(dense)] - dense[i]).length for i in range(len(dense))]
    total = sum(seg)
    out, acc, j = [], 0.0, 0
    for k in range(count):
        target = total * k / count
        while acc + seg[j] < target:
            acc += seg[j]
            j += 1
        p = dense[j].lerp(dense[(j + 1) % len(dense)], (target - acc) / seg[j])
        out.append(c + e1 * p.x + e2 * p.y)
    return out, total


def ring_frame(points, i, n, c):
    m = len(points)
    tan = (points[(i + 1) % m] - points[i - 1]).normalized()
    out = tan.cross(n).normalized()
    if out.dot(points[i] - c) < 0:
        out = -out
    return points[i], out, tan


def strap_mesh(name, points, length, n, c, width, thick, gap, part, closed=True):
    """A flat leather strap following 'points': outer face plus top and bottom edges."""
    n = n.normalized()
    m = len(points)
    verts, aux = [], []
    for i in range(m):
        p, out, tan = ring_frame(points, i, n, c)
        base = p + out * gap
        u = length * i / m
        for (dn, do, g) in ((0.5, 0.0, 1.3), (0.5, 1.0, 1.0), (-0.5, 1.0, -1.0), (-0.5, 0.0, -1.3)):
            verts.append(base + n * (width * dn) + out * (thick * do))
            aux.append((u, g, width))
    faces = []
    for i in range(m if closed else m - 1):
        a, b = i * 4, ((i + 1) % m) * 4
        for k in range(3):
            faces.append((a + k, b + k, b + k + 1, a + k + 1))
    o = new_mesh_obj(name, verts, faces, part)
    # outer corners stay crisp; duplicate the last column so 'u' does not wrap backwards
    bm = get_bm(o)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for e in bm.edges:
        ia, ib = e.verts[0].index % 4, e.verts[1].index % 4
        if ia == ib and ia in (1, 2):
            e.smooth = False
    put_bm(bm, o)
    set_aux(o, aux)
    return o


def cloak_fold(s, t):
    """The cloak's big folds as a function of the pattern coordinates: s across (-1..1), t down (0..1).
    Returns (fold in -1..1, positive = crest facing outwards; amplitude in metres; phase)."""
    phase = 2 * np.pi * (1.42 * s * (1 + 0.10 * s * s)) + 0.55 + 0.5 * t
    tt = np.clip((t - 0.10) / 0.70, 0.0, 1.0)
    amp = 0.086 * tt * tt * (3 - 2 * tt) * (1.0 + 0.30 * np.sin(2.7 * s + 0.9))
    fold = (np.cos(phase) + 0.28 * np.cos(2 * phase + 0.7)) / 1.2
    return fold, amp, phase


def stage_garments():
    rig = bpy.data.objects['rider_rig']
    body = bpy.data.objects['body']
    T = bpy.data.objects['h_tights']
    S = bpy.data.objects['h_skirt']
    bones = {b.name for b in rig.data.bones}
    made = []

    sh, el, wr = bone_pos(rig, 'upperarm_l'), bone_pos(rig, 'lowerarm_l'), bone_pos(rig, 'hand_l')
    hip, knee, ank = bone_pos(rig, 'thigh_l'), bone_pos(rig, 'calf_l'), bone_pos(rig, 'foot_l')
    neckb, headb = bone_pos(rig, 'neck_01'), bone_pos(rig, 'head')
    fore = (wr - el).normalized()
    fore_len = (wr - el).length
    boots = bpy.data.objects['boots']
    boot_top = max(v.co.z for v in boots.data.vertices)
    waist_z = max(v.co.z for v in S.data.vertices)          # top of MakeHuman's skirt helper
    log('landmarks: shoulder', [round(c, 3) for c in sh], 'waist', round(waist_z, 3), 'boot top', round(boot_top, 3))

    def side_of(co):
        return 'l' if co.x >= 0 else 'r'

    def along_fore(co):            # metres from the wrist towards the elbow, on that side
        p = Vector((abs(co.x), co.y, co.z))
        return -(p - wr).dot(fore)

    def collar_z(co):              # stand collar line: higher at the nape than at the throat
        return neckb.z - 0.012 + 0.5 * (co.y - neckb.y)

    # ---- hose --------------------------------------------------------------
    hose = dup(T, 'hose')
    implicit_cut(hose, lambda co, w: max(co.z - (waist_z - 0.035), (boot_top - 0.07) - co.z))
    inflate(hose, 0.002)
    set_part(hose, 'hose')
    made.append(hose)

    # ---- tunic sleeves -----------------------------------------------------
    sleeves = dup(T, 'sleeves')
    implicit_cut(sleeves, lambda co, w: max(0.22 - w_arm(w), 0.125 - along_fore(co)))

    def sleeve_puff(co):           # cloth bunches where it is pushed up by the bracer
        a = along_fore(co)
        return 1.0 + 1.3 * math.exp(-((a - 0.20) / 0.045) ** 2) + 0.5 * math.exp(-((a - fore_len - 0.02) / 0.06) ** 2)
    inflate(sleeves, 0.007, smooth_iter=2, weight_fn=sleeve_puff)
    set_part(sleeves, 'tunic')
    made.append(sleeves)

    # ---- bracers -----------------------------------------------------------
    bracers = dup(T, 'bracers')
    implicit_cut(bracers, lambda co, w: max(0.5 - w_arm(w), along_fore(co) - 0.165, 0.018 - along_fore(co)))
    inflate(bracers, 0.012, smooth_iter=1, weight_fn=lambda co: 1.0 + 0.35 * smoothstep(0.08, 0.165, along_fore(co)))
    rim(bracers, 0.008)
    set_part(bracers, 'bracer')
    set_aux(bracers, [(along_fore(v.co) / 0.165, 0.0, 0.0) for v in bracers.data.vertices])
    made.append(bracers)

    # ---- jerkin (torso) ----------------------------------------------------
    jerkin = dup(T, 'jerkin')

    def jerkin_f(co, w):
        f = max(w_arm(w) - 0.5, co.z - collar_z(co), (waist_z - 0.075) - co.z)
        if co.y < 0:                                           # open throat
            f = max(f, 0.016 + (co.z - (neckb.z - 0.085)) * 0.42 - abs(co.x))
        return f
    implicit_cut(jerkin, jerkin_f)
    smooth_boundary(jerkin, 2)
    inflate(jerkin, 0.013, smooth_iter=3, smooth_fac=0.5)
    rim(jerkin, 0.009)
    set_part(jerkin, 'jerkin')
    made.append(jerkin)

    # ---- jerkin skirt: four leather panels, split front/back for the saddle
    skirt = dup(S, 'jerkin_skirt')
    hem_z = hip.z - 0.215
    split_z = waist_z - 0.115
    implicit_cut(skirt, lambda co, w: hem_z - co.z)
    bm = get_bm(skirt)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(1, 0, 0), dist=1e-5)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, hip.y, 0), plane_no=(0, 1, 0), dist=1e-5)
    bm.normal_update()
    yc = hip.y
    for v in bm.verts:                                         # stand off the hose, flare towards the hem
        v.co += v.normal * 0.012
        k = smoothstep(split_z + 0.03, hem_z, v.co.z)
        v.co.x *= 1.0 + 0.10 * k
        v.co.y = yc + (v.co.y - yc) * (1.0 + 0.10 * k)
    slit = [e for e in bm.edges
            if all(v.co.z < split_z + 1e-4 for v in e.verts)
            and (all(abs(v.co.x) < 1e-4 for v in e.verts) or all(abs(v.co.y - yc) < 1e-4 for v in e.verts))]
    bmesh.ops.split_edges(bm, edges=slit)
    for v in bm.verts:                                         # open the slits a little, wider at the hem
        on_x = abs(v.co.x) < 1e-4
        on_y = abs(v.co.y - yc) < 1e-4
        if v.co.z < split_z and (on_x or on_y) and v.link_faces:
            cen = sum((f.calc_center_median() for f in v.link_faces), Vector()) / len(v.link_faces)
            k = smoothstep(split_z, hem_z, v.co.z)
            if on_x:
                v.co.x += math.copysign(0.004 + 0.012 * k, cen.x)
            if on_y:
                v.co.y += math.copysign(0.004 + 0.010 * k, cen.y - yc)
    put_bm(bm, skirt)
    rim(skirt, 0.007)
    set_part(skirt, 'jerkin')
    made.append(skirt)

    # ---- mantle: the hooded cloak's shoulder cape --------------------------
    mantle = dup(T, 'mantle')
    mc = Vector((0.0, 0.0, neckb.z - 0.035))

    def mantle_e(co):
        ry = 0.255 if co.y < 0 else 0.245
        dz = (co.z - mc.z) / 0.215 if co.z < mc.z else (co.z - mc.z) / 0.5
        return (co.x / 0.305) ** 2 + (co.y / ry) ** 2 + dz * dz - 1.0

    def mantle_f(co, w):
        f = max(mantle_e(co), co.z - (collar_z(co) + 0.012))
        if co.y < 0:                                           # open front below the clasp
            f = max(f, 0.010 + max(0.0, (neckb.z - 0.095) - co.z) * 0.34 - abs(co.x))
        return f
    implicit_cut(mantle, mantle_f)
    smooth_boundary(mantle, 3)
    set_aux(mantle, [(mantle_e(v.co), (abs(v.co.x) - (0.010 + max(0.0, (neckb.z - 0.095) - v.co.z) * 0.34)) if v.co.y < 0 else 0.5, 1.0)
                     for v in mantle.data.vertices])
    inflate(mantle, 0.027, smooth_iter=5, smooth_fac=0.5)
    bm = get_bm(mantle)
    bm.normal_update()
    for v in bm.verts:                                         # big soft scallops along the hem
        e = mantle_e(v.co)
        k = smoothstep(-0.45, 0.0, e)
        ang = math.atan2(v.co.x, -v.co.y)
        v.co += v.normal * (0.010 * k + 0.011 * k * math.cos(ang * 7.0 + 0.6))
    put_bm(bm, mantle)
    rim(mantle, 0.013, inward=0.004)
    set_part(mantle, 'mantle')
    made.append(mantle)

    for o in (hose, sleeves, bracers, jerkin, skirt, mantle):
        clean_weights(o, bones)
    # the skirt panels follow their own thigh only
    for v in skirt.data.vertices:
        if v.co.z > split_z:
            continue
        own, other = ('l', 'r') if v.co.x >= 0 else ('r', 'l')
        moved = 0.0
        for g in v.groups:
            nm = skirt.vertex_groups[g.group].name
            if nm in (f'thigh_{other}', f'calf_{other}'):
                moved += g.weight
                g.weight = 0.0
        if moved > 0:
            skirt.vertex_groups[f'thigh_{own}'].add([v.index], moved, 'ADD')

    # ---- cowl (rolled hood collar) and the hood hanging down the back -------
    back_bvh = bvh_of([mantle, jerkin])

    def back_y(x, z):
        loc, _, _, _ = back_bvh.ray_cast(Vector((x, 1.0, z)), Vector((0, -1, 0)), 2.0)
        return loc.y if loc is not None else 0.1

    def front_y(x, z, bvh=None):
        loc, _, _, _ = (bvh or back_bvh).ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)), 2.0)
        return loc.y if loc is not None else -0.1

    nu, nv = 26, 8
    verts, faces = [], []
    cc = Vector((0.0, neckb.y + 0.014, neckb.z))
    for i in range(nu):
        a = 2 * math.pi * i / nu                               # a = 0 at the front
        back = 0.5 - 0.5 * math.cos(a)                         # 0 front .. 1 back
        droop = (1.0 - back) ** 2
        ctr = cc + Vector((0.104 * math.sin(a), -0.100 * math.cos(a) - 0.014 * droop + 0.016 * back,
                           -0.040 - 0.030 * droop + 0.070 * back))
        outward = Vector((math.sin(a), -math.cos(a), 0.0))
        twist = 0.20 * math.sin(3 * a + 0.8)
        r_out = (0.040 + 0.012 * back) * (1.0 + 0.18 * math.sin(2 * a + 0.5))
        r_up = (0.021 + 0.014 * back) * (1.0 - 0.15 * math.sin(2 * a + 0.5))
        lean = 0.55 - 0.25 * back                              # the roll leans outwards over the shoulders
        for j in range(nv):
            b = 2 * math.pi * j / nv + twist
            ox, oz = r_out * math.cos(b), r_up * math.sin(b)
            verts.append(ctr + outward * (ox * math.cos(lean) + oz * math.sin(lean)) + Vector((0, 0, -ox * math.sin(lean) + oz * math.cos(lean))))
    for i in range(nu):
        for j in range(nv):
            a0, a1 = i * nv, ((i + 1) % nu) * nv
            faces.append((a0 + j, a1 + j, a1 + (j + 1) % nv, a0 + (j + 1) % nv))
    cowl = new_mesh_obj('cowl', verts, faces, 'mantle')
    bm = get_bm(cowl)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    put_bm(bm, cowl)
    made.append(cowl)

    rings, nring = 10, 12
    verts, faces = [], []
    z0, z1 = neckb.z + 0.050, neckb.z - 0.330
    for k in range(rings):
        t = k / (rings - 1)
        z = z0 + (z1 - z0) * t
        # a hood lying flat: broad and full under the cowl, tapering to a soft point
        wid = 0.140 * min(1.0, 0.55 + 3.0 * t) * (1.0 - t ** 1.7) ** 0.7 + 0.012
        dep = 0.060 * min(1.0, 0.45 + 3.5 * t) * (1.0 - t ** 1.5) ** 0.8 + 0.010
        yb = back_y(0.0, min(z, neckb.z - 0.02)) - 0.014
        if z > neckb.z - 0.02:
            yb += (z - (neckb.z - 0.02)) * -0.25
        for j in range(nring):
            b = 2 * math.pi * j / nring
            xx = wid * math.cos(b)
            crease = 1.0 - 0.30 * math.exp(-(xx / 0.022) ** 2) * (1.0 - t)
            yy = dep * (0.9 + math.sin(b)) * crease if math.sin(b) > -0.9 else 0.0
            verts.append((xx, yb + max(0.0, yy), z + 0.014 * math.cos(2 * b) * (1 - t)))
    verts.append((0.0, back_y(0.0, z1 - 0.03) + 0.006, z1 - 0.030))
    for k in range(rings - 1):
        for j in range(nring):
            a0, a1 = k * nring, (k + 1) * nring
            faces.append((a0 + j, a0 + (j + 1) % nring, a1 + (j + 1) % nring, a1 + j))
    tip = rings * nring
    for j in range(nring):
        faces.append(((rings - 1) * nring + j, (rings - 1) * nring + (j + 1) % nring, tip))
    verts.append((0.0, verts[0][1] + 0.03, z0 + 0.012))
    cap_i = len(verts) - 1
    for j in range(nring):
        faces.append(((j + 1) % nring, j, cap_i))
    hood = new_mesh_obj('hood', verts, faces, 'mantle')
    bm = get_bm(hood)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    put_bm(bm, hood)
    made.append(hood)
    for o in (cowl, hood):
        transfer_weights(o, T, bones)

    # ---- the cloak ---------------------------------------------------------
    jerkin_bvh = bvh_of([jerkin])

    def jerkin_back_y(x, z):
        loc, _, _, _ = jerkin_bvh.ray_cast(Vector((x, 1.0, z)), Vector((0, -1, 0)), 2.0)
        return loc.y if loc is not None else 0.08

    cols, rows = 61, 23
    z_top, z_hem = neckb.z - 0.075, 0.185
    verts, aux, wts = [], [], []
    for j in range(rows):
        t = (j / (rows - 1)) ** 0.92
        z = z_top + (z_hem - z_top) * t
        half = 0.195 + 0.35 * t ** 0.85
        for i in range(cols):
            s = -1.0 + 2.0 * i / (cols - 1)
            x = half * s
            # the top rows sit inside the torso (hidden by the mantle) and emerge below its hem
            hug = jerkin_back_y(max(-0.185, min(0.185, x)), max(z, neckb.z - 0.30)) - 0.020
            free = 0.150 + 0.080 * t
            yb = hug + (free - hug) * smoothstep(0.02, 0.26, t)
            bend = 0.040 + 0.150 * t
            y = yb - bend * abs(s) ** 2.0
            nrm = Vector((2.0 * bend * s / max(half, 1e-3), 1.0, 0.0)).normalized()
            fold, amp, phase = (float(v) for v in cloak_fold(s, t))
            p = Vector((x, y, z)) + nrm * (amp * fold)
            p.x += 0.35 * amp * math.sin(phase) * (1 if True else 0) * smoothstep(0.3, 1.0, t)
            p.z += 0.022 * t * math.cos(phase + 0.9) - 0.03 * t * abs(s) ** 3
            verts.append(p)
            aux.append((s, t, half * (1.0 - abs(s))))
            wts.append(t)
    faces = []
    for j in range(rows - 1):
        for i in range(cols - 1):
            a = j * cols + i
            faces.append((a, a + 1, a + cols + 1, a + cols))
    cloak = new_mesh_obj('cloak', verts, faces, 'cloak')
    cloak.data.materials.append(part_mat('lining'))
    set_aux(cloak, aux)
    bm = get_bm(cloak)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    if sum(f.normal.y for f in bm.faces) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    put_bm(bm, cloak)
    # cloak bones and weights
    cloak_len = z_top - z_hem
    joints = [Vector((0.0, 0.135 + 0.085 * k / 4.0, z_top - cloak_len * k / 4.0)) for k in range(5)]
    names = ['spine_03', 'cloak1', 'cloak2', 'cloak3', 'cloak4']
    for nm in names:
        cloak.vertex_groups.new(name=nm)
    for vi, t in enumerate(wts):
        ws = {}
        ws['spine_03'] = 1.0 - smoothstep(0.05, 0.20, t)
        for k in range(1, 5):
            c = (k - 0.5) / 4.0
            if k == 1:
                wk = smoothstep(0.05, 0.20, t) if t <= c else max(0.0, 1.0 - (t - c) * 4.0)
            elif k == 4:
                wk = 1.0 if t >= c else max(0.0, 1.0 - (c - t) * 4.0)
            else:
                wk = max(0.0, 1.0 - abs(t - c) * 4.0)
            ws[f'cloak{k}'] = wk
        tot = sum(ws.values())
        for nm, wv in ws.items():
            if wv > 1e-4:
                cloak.vertex_groups[nm].add([vi], wv / tot, 'REPLACE')
    sol = cloak.modifiers.new('thick', 'SOLIDIFY')
    sol.thickness = 0.013
    sol.offset = -1.0
    sol.use_rim = True
    sol.material_offset = 1
    sol.material_offset_rim = 0
    activate(cloak)
    bpy.ops.object.modifier_apply(modifier=sol.name)
    shade_smooth(cloak)
    made.append(cloak)

    activate(rig)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = rig.data.edit_bones
    prev = eb['spine_03']
    for k in range(1, 5):
        b = eb.new(f'cloak{k}')
        b.head, b.tail = joints[k - 1], joints[k]
        b.parent = prev
        b.use_connect = (k > 1)
        b.align_roll(Vector((0, 1, 0)))
        prev = b
    bpy.ops.object.mode_set(mode='OBJECT')

    # ---- belts and straps ----------------------------------------------------
    torso_bvh = bvh_of([jerkin, skirt])
    chest_bvh = bvh_of([jerkin])
    belt_c = Vector((0, -0.03, waist_z - 0.035))
    belt_n = Vector((0, -0.06, 1.0))
    pts, ln = convex_ring(torso_bvh, belt_c, belt_n, count=44)
    belt = strap_mesh('belt', pts, ln, belt_n, belt_c, 0.058, 0.008, 0.002, 'belt')
    made.append(belt)

    hip_c = Vector((0, -0.03, waist_z - 0.085))
    hip_n = Vector((0.26, -0.10, 1.0))
    hip_bvh = bvh_of([jerkin, skirt, belt])
    hpts, hln = convex_ring(hip_bvh, hip_c, hip_n, count=44)
    hipbelt = strap_mesh('hipbelt', hpts, hln, hip_n, hip_c, 0.032, 0.007, 0.002, 'strap')
    made.append(hipbelt)

    straps = []
    for sgn in (1, -1):                                        # baldrics crossing on the chest
        top = Vector((-0.100 * sgn, 0, neckb.z - 0.035))
        low = Vector((0.150 * sgn, 0, waist_z + 0.01))
        d = (low - top).normalized()
        n = Vector((-d.z, 0.0, d.x))
        c = (top + low) / 2 + Vector((0, -0.03, 0))
        spts, sln = convex_ring(chest_bvh, c, n, count=40)
        st = strap_mesh(f'baldric_{"l" if sgn > 0 else "r"}', spts, sln, n, c, 0.030, 0.006, 0.0015 + (0.0065 if sgn < 0 else 0.0), 'strap')
        straps.append((st, spts, n, c))
        implicit_cut(st, lambda co, w: -0.16 - mantle_e(co))
        made.append(st)

    def buckle(name, p, out, tan, n, w, h, rr=0.0035):
        o = torus_mesh(name, 0.5, rr, 4, 6, 'brass')
        bm = get_bm(o)
        rot = Matrix.Rotation(math.radians(45), 4, 'Z')
        for v in bm.verts:
            c = rot @ v.co
            # square the ring, then stretch it to w x h keeping the bar thickness
            ring = Vector((c.x, c.y, 0))
            mag = max(abs(ring.x), abs(ring.y), 1e-6)
            core = ring / mag * 0.5 if ring.length > 0.2 else ring
            off = c - Vector((c.x, c.y, 0)).normalized() * 0.5 if ring.length > 1e-6 else c
            v.co = Vector((core.x * 2 * (w / 2) + off.x, core.y * 2 * (h / 2) + off.y, c.z))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        put_bm(bm, o)
        place(o, p + out * 0.004, tan, n.normalized(), out)
        return o

    n_belt = belt_n.normalized()
    p, out, tan = ring_frame(pts, 0, n_belt, belt_c)
    made.append(buckle('belt_buckle', p + out * 0.009, out, tan, n_belt, 0.052, 0.070, 0.0065))
    for st, spts, n, c in straps:
        nn = n.normalized()
        i = min(range(len(spts)), key=lambda k: abs(spts[k].z - (neckb.z - 0.24)) + (10 if spts[k].y > 0 else 0))
        p, out, tan = ring_frame(spts, i, nn, c)
        made.append(buckle(st.name + '_buckle', p + out * 0.008, out, tan, nn, 0.034, 0.042, 0.0045))

    # ---- pouches and the hand-bell on the hip belt ---------------------------
    n_hip = hip_n.normalized()

    def hip_index(angle_deg):          # 0 = front, +90 = the character's left hip
        best, bi = 1e9, 0
        for k, q in enumerate(hpts):
            a = math.degrees(math.atan2(q.x - hip_c.x, -(q.y - hip_c.y)))
            d = abs((a - angle_deg + 180) % 360 - 180)
            if d < best:
                best, bi = d, k
        return bi

    def pouch(name, angle, size):
        p, out, tan = ring_frame(hpts, hip_index(angle), n_hip, hip_c)
        o = rounded_box(name, size, 'pouch', roundness=0.42)
        up = Vector((0, 0, 1))
        tan_h = (tan - up * tan.dot(up)).normalized()
        out_h = tan_h.cross(up)
        if out_h.dot(out) < 0:
            out_h = -out_h
        sx, sy, sz = size
        set_aux(o, [((v.co.x / sx) * 2, v.co.z / sz + 0.5, v.co.y / sy + 0.5) for v in o.data.vertices])
        # slightly fuller at the bottom
        for v in o.data.vertices:
            k = 0.5 - v.co.z / sz
            v.co.x *= 0.9 + 0.16 * k
            v.co.y *= 0.85 + 0.25 * k
        place(o, p + out_h * (sy * 0.5 + 0.004) - up * (sz * 0.36), tan_h, out_h, up)
        rigid_weight(o, 'pelvis')
        return o

    made.append(pouch('pouch_big', -72, (0.105, 0.055, 0.125)))
    made.append(pouch('pouch_small', 128, (0.075, 0.042, 0.085)))

    bi = hip_index(46)
    p, out, tan = ring_frame(hpts, bi, n_hip, hip_c)
    up = Vector((0, 0, 1))
    out_h = (out - up * out.dot(up)).normalized()
    hang = p + out * 0.006 - up * 0.012
    strap_len, bell_h = 0.055, 0.082
    prof = [(0.0, 0.0), (0.006, 0.0), (0.011, -0.004), (0.015, -0.012), (0.018, -0.030), (0.021, -0.048),
            (0.027, -0.064), (0.035, -0.075), (0.039, -0.082), (0.034, -0.080), (0.024, -0.066), (0.0, -0.060)]
    bell = lathe_mesh('bell', prof, 12, 'brass')
    loop = torus_mesh('bell_loop', 0.011, 0.0032, 8, 5, 'brass')
    loop.data.transform(Matrix.Translation((0, 0, 0.009)) @ Matrix.Rotation(math.radians(90), 4, 'X'))
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.009)
    clap = link(bpy.data.objects.new('bell_clapper', bpy.data.meshes.new('bell_clapper')))
    bm.to_mesh(clap.data)
    bm.free()
    set_part(clap, 'brass')
    shade_smooth(clap)
    clap.data.transform(Matrix.Translation((0, 0, -0.079)))
    bell_origin = hang + out_h * 0.024 - up * strap_len
    tan_h = out_h.cross(up)
    for o in (bell, loop, clap):
        place(o, bell_origin, tan_h, out_h, up)
        rigid_weight(o, 'bell')
        made.append(o)
    hs = rounded_box('bell_strap', (0.016, 0.006, strap_len + 0.03), 'strap', roundness=0.15, cuts=1)
    place(hs, hang + out_h * 0.012 - up * (strap_len * 0.5 - 0.012), tan_h, (out_h + up * 0.35).normalized(), up)
    rigid_weight(hs, 'pelvis')
    made.append(hs)

    activate(rig)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = rig.data.edit_bones
    b = eb.new('bell')
    b.head = bell_origin + up * 0.02
    b.tail = bell_origin - up * bell_h
    b.parent = eb['pelvis']
    b.align_roll(Vector((0, 1, 0)))
    bpy.ops.object.mode_set(mode='OBJECT')

    # ---- mantle clasp ----------------------------------------------------------
    mantle_bvh = bvh_of([mantle])
    for sgn in (1, -1):
        x, z = 0.036 * sgn, neckb.z - 0.103
        y = front_y(x, z, mantle_bvh)
        d = lathe_mesh(f'clasp_{"l" if sgn > 0 else "r"}', [(0.0, 0.007), (0.010, 0.006), (0.019, 0.002), (0.021, -0.003), (0.0, -0.003)], 10, 'brass')
        place(d, Vector((x, y - 0.002, z)), Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, -1, 0)))
        made.append(d)
    y = front_y(0.0, neckb.z - 0.103, bvh_of([jerkin])) - 0.03
    bar = rounded_box('clasp_bar', (0.060, 0.007, 0.010), 'brass', roundness=0.3, cuts=1)
    place(bar, Vector((0, front_y(0.036, neckb.z - 0.103, mantle_bvh) - 0.004, neckb.z - 0.103)), Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
    made.append(bar)

    # ---- bracer straps ---------------------------------------------------------
    br_bvh = bvh_of([bracers])
    for sgn, sd in ((1, 'l'), (-1, 'r')):
        f = Vector((fore.x * sgn, fore.y, fore.z))
        w0 = Vector((wr.x * sgn, wr.y, wr.z))
        for k, a in enumerate((0.055, 0.125)):
            c = w0 - f * a
            rp, rl = convex_ring(br_bvh, c, f, nsamp=48, count=14, front=Vector((0, -0.7, 0.7)))
            made.append(strap_mesh(f'bracer_strap_{sd}{k}', rp, rl, f, c, 0.016, 0.004, 0.001, 'strap'))

    # ---- hair: a scalp cap plus chunky sculpted locks ----------------------------
    made += build_hair(body, rig)

    # ---- skin weights for everything that rides on the body ----------------------
    for o in made:
        if not o.vertex_groups:
            transfer_weights(o, T, bones | {'bell'})
        clean_weights(o, bones | {'cloak1', 'cloak2', 'cloak3', 'cloak4', 'bell'})
        ensure_aux(o)
        shade_smooth(o)
    # hard items must not bend: give each buckle / clasp one bone set (that of its centre)
    for o in made:
        if o.name.endswith('_buckle') or o.name.startswith('clasp'):
            acc = {}
            for v in o.data.vertices:
                for g in v.groups:
                    nm = o.vertex_groups[g.group].name
                    acc[nm] = acc.get(nm, 0.0) + g.weight
            best = sorted(acc.items(), key=lambda kv: -kv[1])[:2]
            tot = sum(w for _, w in best)
            for g in list(o.vertex_groups):
                o.vertex_groups.remove(g)
            for nm, wv in best:
                o.vertex_groups.new(name=nm).add(list(range(len(o.data.vertices))), wv / tot, 'REPLACE')

    # ---- body: keep only what shows (head, throat, hands) -------------------------
    def body_f(co, w):
        cut_z = collar_z(co) - 0.040
        if co.y < 0:
            cut_z = min(cut_z, neckb.z - 0.115 + abs(co.x) * 1.2)
        head = cut_z - co.z                                              # < 0 above the neckline
        hand = max(-0.055 - along_fore(co), 0.40 - abs(co.x))            # < 0 from just above the wrist
        return min(head, hand)
    implicit_cut(body, body_f)

    for o in bpy.data.objects:
        if o.type == 'MESH' and not o.name.startswith('h_'):
            if not any(m.type == 'ARMATURE' for m in o.modifiers):
                m = o.modifiers.new('rig', 'ARMATURE')
                m.object = rig
            o.parent = rig
    log('garment tris:', {o.name: tri_count(o) for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith('h_')})
    log('total tris', sum(tri_count(o) for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith('h_')))


def build_hair(body, rig):
    headb = bone_pos(rig, 'head')
    aux = body.data.color_attributes['aux']
    scalp = np.zeros(len(body.data.vertices) * 4, dtype=np.float32)
    aux.data.foreach_get('color', scalp)
    scalp = scalp.reshape(-1, 4)[:, 1] > 0.5
    cap = dup(body, 'hair_cap')
    bm = get_bm(cap)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not scalp[v.index]], context='VERTS')
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * (0.005 if v.is_boundary else 0.019)
    put_bm(bm, cap)
    set_part(cap, 'hair')
    set_aux(cap, [(0.0, 0.5, 0.0)] * len(cap.data.vertices))
    rigid_weight(cap, 'head')

    co = np.array([v.co[:] for v in cap.data.vertices])
    nr = np.array([v.normal[:] for v in cap.data.vertices])
    crown = Vector((0.0, co[:, 1].mean() + 0.03, co[:, 2].max()))
    # farthest-point sampling gives evenly spread roots
    n_tufts = 58
    chosen = [int(np.argmax(co[:, 2]))]
    dist = np.linalg.norm(co - co[chosen[0]], axis=1)
    for _ in range(n_tufts - 1):
        i = int(np.argmax(dist))
        chosen.append(i)
        dist = np.minimum(dist, np.linalg.norm(co - co[i], axis=1))
    verts, faces, auxv = [], [], []
    ring = ((-1.0, 0.0), (-0.45, 0.55), (0.45, 0.55), (1.0, 0.0), (0.0, -0.35))
    nr_ = len(ring)
    for i in chosen:
        p0 = Vector(co[i])
        nrm = Vector(nr[i]).normalized()
        away = p0 - crown
        flow = away - nrm * away.dot(nrm)
        if flow.length < 0.02:
            flow = Vector((0.3, -1.0, 0.0)) - nrm * nrm.dot(Vector((0.3, -1.0, 0.0)))
        flow.normalize()
        # tousled: swirl the flow, more on top; the fringe sweeps up and to the character's left
        top = smoothstep(headb.z + 0.08, headb.z + 0.15, p0.z)
        front = smoothstep(-0.02, -0.09, p0.y) * top
        flow = Quaternion(nrm, math.radians(22 + 22 * top) + RNG.uniform(-0.35, 0.35)) @ flow
        if front > 0:
            sweep = Vector((0.85, -0.35, 0.40))
            sweep = (sweep - nrm * sweep.dot(nrm)).normalized()
            flow = flow.lerp(sweep, 0.75 * front).normalized()
        side = nrm.cross(flow).normalized()
        length = RNG.uniform(0.082, 0.112) * (1.0 + 0.18 * top)
        width = RNG.uniform(0.050, 0.066)
        lift = RNG.uniform(0.010, 0.020) * (0.55 + 0.9 * top)
        flick = RNG.uniform(0.002, 0.016) + 0.012 * front
        a = p0 - nrm * 0.010 - flow * 0.020
        b = a + flow * (length * 0.55) + nrm * (lift + 0.016)
        c = a + flow * length + nrm * (flick + 0.004) - Vector((0, 0, 0.014 * (1 - top)))
        rnd = RNG.random()
        base = len(verts)
        nseg = 5
        for k in range(nseg + 1):
            u = k / nseg
            p = a * (1 - u) ** 2 + b * (2 * u * (1 - u)) + c * (u * u)
            tan = ((b - a) * (1 - u) + (c - b) * u).normalized()
            upv = side.cross(tan).normalized()
            wv = width * min(1.0, 0.55 + 1.6 * u) * (1.0 - u ** 2.2) ** 0.75
            if k == nseg:
                verts.append(p)
                auxv.append((1.0, rnd, 0.0))
            else:
                for (cx, cz) in ring:
                    verts.append(p + side * (cx * wv * 0.5) + upv * (cz * wv * 0.42))
                    auxv.append((u, rnd, 0.0))
        for k in range(nseg - 1):
            for j in range(nr_):
                a0, a1 = base + k * nr_, base + (k + 1) * nr_
                faces.append((a0 + j, a0 + (j + 1) % nr_, a1 + (j + 1) % nr_, a1 + j))
        tipi = base + nseg * nr_
        for j in range(nr_):
            a0 = base + (nseg - 1) * nr_
            faces.append((a0 + j, a0 + (j + 1) % nr_, tipi))
    tufts = new_mesh_obj('hair_tufts', verts, faces, 'hair')
    bm = get_bm(tufts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    put_bm(bm, tufts)
    set_aux(tufts, auxv)
    rigid_weight(tufts, 'head')
    return [cap, tufts]


# --------------------------------------------------------------------------
# stage 3: game mesh - remove hidden geometry, decimate, unwrap, pack, join
# --------------------------------------------------------------------------
CLOAK_SET = ('cloak', 'mantle', 'cowl', 'hood', 'clasp_l', 'clasp_r', 'clasp_bar')
# relative texel density per part (the face and the small brass pieces get more)
DENSITY = {'skin': 2.3, 'eye': 2.6, 'hair': 0.6, 'tunic': 0.75, 'jerkin': 0.9, 'hose': 0.55, 'boot': 0.6,
           'strap': 0.85, 'belt': 0.9, 'brass': 1.1, 'bracer': 0.9, 'cloak': 0.80, 'lining': 0.36, 'mantle': 0.85,
           'pouch': 0.9, 'sole': 0.5}
HAIR_SWATCH = (0.03, 0.955, 0.50, 0.99)     # u0, v0, u1, v1 in the atlas: all hair locks share this gradient strip
ATLAS_SCALE = 0.945


def decimate(obj, target_tris):
    n = tri_count(obj)
    if n <= target_tris:
        return
    m = obj.modifiers.new('dec', 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = target_tris / n
    m.use_collapse_triangulate = False
    activate(obj)
    # the armature modifier (if any) must stay last
    while obj.modifiers[0].name != m.name:
        bpy.ops.object.modifier_move_up(modifier=m.name)
    bpy.ops.object.modifier_apply(modifier=m.name)
    log('decimated', obj.name, n, '->', tri_count(obj))


def sharpen_by_angle(obj, deg=70.0):
    bm = get_bm(obj)
    lim = math.radians(deg)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > lim:
            e.smooth = False
    put_bm(bm, obj)


def uv_layer(obj):
    me = obj.data
    for lay in [l for l in me.uv_layers if l.name == 'mh_uv'] + list(me.uv_layers)[1:]:
        if lay.name in me.uv_layers:
            me.uv_layers.remove(me.uv_layers[lay.name])
    if not me.uv_layers:
        me.uv_layers.new(name='UVMap')
    me.uv_layers[0].name = 'UVMap'
    return me.uv_layers[0]


def get_uv(obj):
    uv = np.zeros(len(obj.data.loops) * 2, dtype=np.float32)
    obj.data.uv_layers[0].data.foreach_get('uv', uv)
    return uv.reshape(-1, 2)


def put_uv(obj, uv):
    obj.data.uv_layers[0].data.foreach_set('uv', uv.astype(np.float32).ravel())
    obj.data.update()


def get_aux(obj):
    a = np.zeros(len(obj.data.vertices) * 4, dtype=np.float32)
    obj.data.color_attributes['aux'].data.foreach_get('color', a)
    return a.reshape(-1, 4)[:, :3]


def loop_verts(obj):
    lv = np.zeros(len(obj.data.loops), dtype=np.int32)
    obj.data.loops.foreach_get('vertex_index', lv)
    return lv


def smart_uv(obj, angle=66.0):
    uv_layer(obj)
    activate(obj)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def strap_uv(obj):
    """Straps unwrap to one straight strip: u = length along, v = across."""
    uv_layer(obj)
    aux = get_aux(obj)
    lv = loop_verts(obj)
    u = aux[lv, 0]
    width = aux[lv, 2]
    v = np.clip(aux[lv, 1], -1, 1) * width * 0.5 + np.sign(aux[lv, 1]) * (np.abs(aux[lv, 1]) > 1.01) * 0.008
    uv = np.stack([u, v], axis=1)
    # closed rings: the last quads wrap from u=L back to 0 -> unwrap them
    me = obj.data
    for p in me.polygons:
        ls = list(p.loop_indices)
        us = uv[ls, 0]
        if us.max() - us.min() > 0.5 * max(u.max(), 1e-6):
            for li in ls:
                if uv[li, 0] < us.max() * 0.5:
                    uv[li, 0] += u.max() + (u.max() / max(len(set(np.round(u, 5))) - 1, 1))
    put_uv(obj, uv)


def cloak_uv(obj):
    """Flat pattern UVs from (s, t); the lining is its own island, the rim a thin border strip."""
    uv_layer(obj)
    me = obj.data
    aux = get_aux(obj)
    lv = loop_verts(obj)
    length, halfw = 1.26, 0.40
    uv = np.stack([aux[lv, 0] * halfw, (1.0 - aux[lv, 1]) * length], axis=1)
    nrm = np.array([v.normal[:] for v in me.vertices])
    lining_slot = [i for i, m in enumerate(me.materials) if m.name == 'P_lining'][0]
    # inner-layer vertices = those used by lining faces
    inner = np.zeros(len(me.vertices), dtype=bool)
    for p in me.polygons:
        if p.material_index == lining_slot:
            inner[list(p.vertices)] = True
    for p in me.polygons:
        vs = list(p.vertices)
        if p.material_index == lining_slot:
            for li in p.loop_indices:
                uv[li, 0] += 2.5 * halfw            # move the lining island aside
        elif inner[vs].any():                         # rim quad: outer verts + their inner copies
            for li in p.loop_indices:
                vi = lv[li]
                if inner[vi]:
                    s, t = aux[vi, 0], aux[vi, 1]
                    d = np.array([0.0, 0.0])
                    if abs(s) > 0.999:
                        d[0] = math.copysign(0.012, s)
                    if t > 0.999:
                        d[1] = -0.012
                    if t < 0.001:
                        d[1] = 0.012
                    uv[li] += d
    put_uv(obj, uv)


def stage_mesh():
    rig = bpy.data.objects['rider_rig']
    for o in list(bpy.data.objects):
        if o.name.startswith('h_'):
            bpy.data.objects.remove(o)
    objs = {o.name: o for o in bpy.data.objects if o.type == 'MESH'}
    body, boots = objs['body'], objs['boots']

    # scalp under the hair cap is never seen: drop it (keep the ring along the hairline)
    aux = get_aux(body)
    bm = get_bm(body)
    bm.verts.ensure_lookup_table()
    inner = [v for v in bm.verts if aux[v.index, 1] > 0.5 and all(aux[e.other_vert(v).index, 1] > 0.5 for e in v.link_edges)]
    inner2 = set(inner)
    deep = [v for v in inner if all(e.other_vert(v) in inner2 for e in v.link_edges)]
    bmesh.ops.delete(bm, geom=deep, context='VERTS')
    put_bm(bm, body)
    decimate(body, 7600)
    decimate(boots, 2700)
    decimate(objs['hose'], 1250)

    for o in objs.values():
        shade_smooth(o)
        ensure_aux(o)
    for n in ('cloak', 'jerkin', 'jerkin_skirt', 'bracers', 'mantle', 'bell', 'pouch_big', 'pouch_small', 'clasp_l', 'clasp_r'):
        sharpen_by_angle(objs[n], 62.0)

    # ---- unwrap -------------------------------------------------------------
    tufts = objs['hair_tufts']
    for name, o in objs.items():
        if name == 'body':
            uv_layer(o)
            mh = o.data.uv_layers.new(name='mh_uv')
            mh.data.foreach_set('uv', get_uv(o).ravel())
            o.data.uv_layers.active = o.data.uv_layers['UVMap']
        elif name == 'cloak':
            cloak_uv(o)
        elif name in ('belt', 'hipbelt') or name.startswith('baldric') and not name.endswith('buckle') or name.startswith('bracer_strap'):
            strap_uv(o)
        elif name == 'hair_tufts':
            uv_layer(o)
        else:
            smart_uv(o)
    pack = [o for o in objs.values() if o is not tufts]
    bpy.ops.object.select_all(action='DESELECT')
    for o in pack:
        o.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.average_islands_scale()
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in pack:
        uv = get_uv(o)
        me = o.data
        dens = np.ones(len(me.loops), dtype=np.float32)
        for p in me.polygons:
            part = me.materials[p.material_index].name[2:]
            dens[list(p.loop_indices)] = DENSITY.get(part, 1.0)
        if len(set(dens.tolist())) > 1 and o.name == 'cloak':
            # two islands with different density: scale each about its own centre
            for val in set(dens.tolist()):
                m = dens == val
                c = uv[m].mean(axis=0)
                uv[m] = c + (uv[m] - c) * val
        else:
            uv *= dens[:, None]
        put_uv(o, uv)
    bpy.ops.object.select_all(action='DESELECT')
    for o in pack:
        o.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(rotate=True, scale=True, margin_method='FRACTION', margin=0.0035, shape_method='CONCAVE')
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in pack:
        put_uv(o, get_uv(o) * ATLAS_SCALE)
    # all hair locks share one painted gradient strip (u = lock id, v = root..tip)
    aux = get_aux(tufts)
    lv = loop_verts(tufts)
    u0, v0, u1, v1 = HAIR_SWATCH
    put_uv(tufts, np.stack([u0 + (u1 - u0) * (0.04 + 0.92 * aux[lv, 1]), v0 + (v1 - v0) * (0.06 + 0.88 * aux[lv, 0])], axis=1))

    # ---- join into the two game meshes ----------------------------------------
    def join(name, members):
        bpy.ops.object.select_all(action='DESELECT')
        for o in members:
            o.select_set(True)
        bpy.context.view_layer.objects.active = members[0]
        bpy.ops.object.join()
        o = bpy.context.view_layer.objects.active
        o.name = name
        o.data.name = name
        for m in list(o.modifiers):
            o.modifiers.remove(m)
        m = o.modifiers.new('rig', 'ARMATURE')
        m.object = rig
        o.parent = rig
        clean_weights(o, {b.name for b in rig.data.bones}, limit=4)
        return o

    cloak_members = [objs[n] for n in CLOAK_SET]
    body_members = [body] + [o for n, o in sorted(objs.items()) if n not in CLOAK_SET and n != 'body']
    rb = join('rider_body', body_members)
    rc = join('rider_cloak', cloak_members)
    for o in (rb, rc):
        unweighted = sum(1 for v in o.data.vertices if not v.groups)
        uv = get_uv(o)
        log(o.name, 'tris', tri_count(o), 'verts', len(o.data.vertices), 'unweighted verts', unweighted,
            'uv range', uv.min(axis=0).round(3), uv.max(axis=0).round(3))
    log('TOTAL tris', tri_count(rb) + tri_count(rc))


# --------------------------------------------------------------------------
# stage 4: hand-painted look. Position / normal / AO / curvature / part-id maps
# are baked once with Cycles; the colour, ORM and normal textures are then
# painted procedurally in numpy (broad colour blocks, soft gradients, painted
# occlusion and edge lights, no photographic detail).
# --------------------------------------------------------------------------
def _hash3(ix, iy, iz):
    n = (ix.astype(np.int64) * 374761393 + iy.astype(np.int64) * 668265263 + iz.astype(np.int64) * 1274126177) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    n = n ^ (n >> 16)
    return (n & 0xFFFF).astype(np.float32) / 65535.0


def vnoise(p):
    """Smooth 3D value noise in [-1, 1]; p is (..., 3)."""
    f = np.floor(p)
    t = p - f
    t = t * t * (3 - 2 * t)
    ix, iy, iz = f[..., 0], f[..., 1], f[..., 2]
    out = 0
    for dx in (0, 1):
        wx = t[..., 0] if dx else 1 - t[..., 0]
        for dy in (0, 1):
            wy = t[..., 1] if dy else 1 - t[..., 1]
            for dz in (0, 1):
                wz = t[..., 2] if dz else 1 - t[..., 2]
                out = out + _hash3(ix + dx, iy + dy, iz + dz) * wx * wy * wz
    return out * 2 - 1


def fbm(p, octaves=3):
    out, amp, tot = 0, 1.0, 0.0
    for o in range(octaves):
        out = out + vnoise(p * (2 ** o) + 17.3 * o) * amp
        tot += amp
        amp *= 0.5
    return out / tot


def box_blur(a, r):
    """Fast separable box blur (radius r pixels) of a 2D or 3D array."""
    if r < 1:
        return a
    for axis in (0, 1):
        pad = [(0, 0)] * a.ndim
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
        n = a.shape[axis]
        hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
        lo = np.take(c, np.arange(0, n), axis=axis)
        a = ((hi - lo) / (2 * r + 1)).astype(np.float32)
    return a


def soft_blur(a, r, passes=2):
    for _ in range(passes):
        a = box_blur(a, r)
    return a


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def rgb(hexstr):
    h = hexstr.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], dtype=np.float32)


def mixc(a, b, t):
    t = np.asarray(t, dtype=np.float32)[..., None]
    return a * (1 - t) + b * t


def bake_maps(objs, skin_png):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.use_denoising = False
    sc.render.threads_mode = 'FIXED'
    sc.render.threads = max(1, min(4, (os.cpu_count() or 2)) - 1)
    if sc.world is None:
        sc.world = bpy.data.worlds.new('w')
    sc.world.light_settings.distance = 0.22
    skin_img = bpy.data.images.load(skin_png)
    mats = [m for m in bpy.data.materials if m.name.startswith('P_')]
    handles = {}
    for m in mats:
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        em = nt.nodes.new('ShaderNodeEmission')
        nt.links.new(em.outputs[0], out.inputs[0])
        dif = nt.nodes.new('ShaderNodeBsdfDiffuse')
        dif.inputs[0].default_value = (1, 1, 1, 1)
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        att = nt.nodes.new('ShaderNodeAttribute')
        att.attribute_name = 'aux'
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = skin_img
        uvn = nt.nodes.new('ShaderNodeUVMap')
        uvn.uv_map = 'mh_uv'
        nt.links.new(uvn.outputs[0], tex.inputs[0])
        target = nt.nodes.new('ShaderNodeTexImage')
        nt.nodes.active = target

        def remap(src, scale, offset):
            n = nt.nodes.new('ShaderNodeVectorMath')
            n.operation = 'MULTIPLY_ADD'
            nt.links.new(src, n.inputs[0])
            n.inputs[1].default_value = (scale,) * 3
            n.inputs[2].default_value = (offset,) * 3
            return n.outputs[0]
        srcs = {
            'pos': remap(geo.outputs['Position'], 0.25, 0.5),
            'nrm': remap(geo.outputs['Normal'], 0.5, 0.5),
            'aux': remap(att.outputs['Color'], 0.25, 0.5),
            'curv': geo.outputs['Pointiness'],
            'tex': tex.outputs['Color'],
        }
        handles[m.name] = (nt, em, target, srcs, out, dif)

    def run(kind):
        img = bpy.data.images.new('bake_' + kind, TEX, TEX, alpha=False, float_buffer=True)
        img.colorspace_settings.name = 'Non-Color'
        for name, (nt, em, target, srcs, out, dif) in handles.items():
            target.image = img
            nt.nodes.active = target
            nt.links.new((dif if kind == 'ao' else em).outputs[0], out.inputs[0])
            for l in list(em.inputs[0].links):
                nt.links.remove(l)
            if kind == 'id':
                v = PARTS[name[2:]][0] / 32.0
                em.inputs[0].default_value = (v, v, v, 1)
            elif kind in srcs:
                nt.links.new(srcs[kind], em.inputs[0])
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        sc.cycles.samples = 96 if kind == 'ao' else 4
        bpy.ops.object.bake(type='AO' if kind == 'ao' else 'EMIT', margin=0, use_clear=True, use_selected_to_active=False)
        a = np.zeros(TEX * TEX * 4, dtype=np.float32)
        img.pixels.foreach_get(a)
        bpy.data.images.remove(img)
        log('baked', kind)
        return a.reshape(TEX, TEX, 4)[:, :, :3].copy()

    return {k: run(k) for k in ('id', 'pos', 'nrm', 'aux', 'curv', 'tex', 'ao')}


def dilate_maps(maps, iters=12):
    """Bleed every map outwards from the islands so bilinear sampling never sees empty texels."""
    pid = np.rint(maps['id'][:, :, 0] * 32).astype(np.int32)
    valid = pid > 0
    stack = np.concatenate([maps[k] for k in ('pos', 'nrm', 'aux', 'curv', 'tex', 'ao')] + [pid[:, :, None].astype(np.float32)], axis=2)
    for _ in range(iters):
        acc = np.zeros_like(stack)
        cnt = np.zeros(valid.shape, dtype=np.float32)
        best = np.zeros(valid.shape, dtype=np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            sv = np.roll(valid, (dy, dx), axis=(0, 1))
            ss = np.roll(stack, (dy, dx), axis=(0, 1))
            acc[:, :, :-1] += ss[:, :, :-1] * sv[:, :, None]
            best = np.where(sv & (best == 0), ss[:, :, -1], best)
            cnt += sv
        fill = (~valid) & (cnt > 0)
        stack[fill, :-1] = acc[fill, :-1] / cnt[fill][:, None]
        stack[fill, -1] = best[fill]
        valid = valid | fill
    out, i = {}, 0
    for k in ('pos', 'nrm', 'aux', 'curv', 'tex', 'ao'):
        out[k] = stack[:, :, i:i + 3]
        i += 3
    out['id'] = np.rint(stack[:, :, -1]).astype(np.int32)
    return out


def paint_textures(m, lm):
    """m: dilated maps; lm: landmarks. Returns base colour (sRGB), ORM, tangent normal (all HxWx3, 0..1)."""
    H = W = TEX
    pid = m['id']
    P = (m['pos'] - 0.5) * 4.0
    N = m['nrm'] * 2.0 - 1.0
    A = (m['aux'] - 0.5) * 4.0
    ao = np.clip(m['ao'][:, :, 0], 0, 1)
    ao_soft = soft_blur(ao, 3)
    curv = soft_blur(m['curv'][:, :, 0] - 0.5, 2)
    x, y, z = P[:, :, 0], P[:, :, 1], P[:, :, 2]
    n_lo = fbm(P * 7.0, 3)          # broad brush variation (~15 cm)
    n_mid = fbm(P * 26.0 + 5.0, 3)  # ~4 cm
    n_str = vnoise(np.stack([x * 60.0, y * 60.0, z * 9.0], axis=2))   # vertical streaks
    up = N[:, :, 2]

    col = np.zeros((H, W, 3), dtype=np.float32) + 0.3
    rough = np.full((H, W), 0.8, dtype=np.float32)
    metal = np.zeros((H, W), dtype=np.float32)
    height = np.zeros((H, W), dtype=np.float32)       # metres, for the (mild) normal map
    ao_mix = np.full((H, W), 0.75, dtype=np.float32)

    def base_paint(mask, c_mid, c_light, c_dark, var=0.5, streak=0.0):
        """Three-tone block-in: mid tone, pushed to a light tone on upward faces / high noise
        and to a dark tone on downward faces."""
        k = np.clip(0.5 + 0.38 * up + var * 0.5 * n_lo + 0.12 * n_mid + streak * n_str, 0, 1)
        c = np.where((k < 0.5)[..., None], mixc(c_dark, c_mid, k * 2), mixc(c_mid, c_light, k * 2 - 1))
        col[mask] = c[mask]

    def shade(mask, shadow, strength=0.85, edge=0.0, edge_col=None, cavity=0.0):
        """Painted occlusion (tinted, soft) plus optional edge lights from curvature."""
        a = np.clip(ao_soft * 0.6 + ao * 0.4, 0, 1) ** 1.25
        k = (1 - a) * strength
        c = col * (1 - k[..., None]) + (col * shadow) * k[..., None]
        if edge > 0:
            e = np.clip(curv * 9.0, 0, 1) * edge
            c = mixc(c, edge_col if edge_col is not None else np.ones(3, np.float32), e)
        if cavity > 0:
            c = c * (1 - np.clip(-curv * 9.0, 0, 1) * cavity)[..., None]
        col[mask] = c[mask]

    def dots(u, v, pitch_u, pitch_v, radius, stagger=True):
        """Distance (metres) to the nearest point of a staggered grid, and local offsets."""
        row = np.floor(v / pitch_v + 0.5)
        uu = u + (0.5 * pitch_u * (row % 2) if stagger else 0.0)
        du = uu - (np.floor(uu / pitch_u + 0.5)) * pitch_u
        dv = v - row * pitch_v
        return np.sqrt(du * du + dv * dv), du, dv

    def stud(mask, d, du, dv, radius):
        """A painted brass rivet: body, dark rim, small top-left highlight."""
        s = mask & (d < radius * 1.45)
        body = sstep(radius, radius * 0.8, d)
        ring = sstep(radius * 1.45, radius * 1.0, d) * (1 - body)
        c = col * (1 - 0.55 * ring[..., None])
        brass = mixc(rgb('#7d5a22'), rgb('#d9b55c'), np.clip(0.55 - (du + dv * -1.0) / radius * 0.45, 0, 1))
        hl = sstep(radius * 0.38, radius * 0.1, np.sqrt((du + radius * 0.28) ** 2 + (dv - radius * 0.28) ** 2))
        brass = mixc(brass, rgb('#fff1c0'), hl * 0.8)
        c = mixc(c, brass, body)
        col[s] = c[s]
        metal[s] = np.maximum(metal, body)[s]
        rough[s] = (rough * (1 - body) + 0.38 * body)[s]
        height[s] += (np.sqrt(np.clip(1 - (d / radius) ** 2, 0, 1)) * radius * 0.5 * body)[s]

    # ---------------- skin ----------------
    M = pid == 1
    tex = np.clip(m['tex'], 0, 1) ** (1 / 2.2)
    tex_b = soft_blur(tex, 5)                                   # simplify the photo texture to soft paint
    wsum = soft_blur(M.astype(np.float32), 5) + 1e-4
    tex_b = soft_blur(tex * M[..., None], 5) / wsum[..., None]
    lum = tex_b.mean(axis=2)
    face = M & (z > lm['neck_z'] - 0.02)
    ref = np.median(lum[face & (z > lm['eye_z'] + 0.03)]) if face.any() else 0.7
    rel = np.clip(lum / max(ref, 1e-3), 0.3, 1.25)             # < 1 where the photo is darker (beard, brows, nostrils)
    skin_mid, skin_light, skin_dark = rgb('#c98f6c'), rgb('#e0ab85'), rgb('#9c6248')
    base_paint(M, skin_mid, skin_light, skin_dark, var=0.25)
    # warm blush on cheeks, nose, ears, knuckles
    blush = np.zeros((H, W), np.float32)
    for sx in (1, -1):
        blush += np.exp(-(((x - sx * 0.047) / 0.022) ** 2 + ((z - (lm['eye_z'] - 0.038)) / 0.018) ** 2)) * (y < -0.05)
        blush += 0.7 * np.exp(-(((x - sx * 0.078) / 0.016) ** 2 + ((z - lm['eye_z'] + 0.005) / 0.03) ** 2)) * (y > -0.06)
    blush += 0.8 * np.exp(-((x / 0.014) ** 2 + ((z - (lm['eye_z'] - 0.042)) / 0.014) ** 2)) * (y < -0.12)
    col[M] = mixc(col, rgb('#c9705a'), np.clip(blush, 0, 1) * 0.34)[M]
    # short beard and stubble: taken from the darkening of the (blurred) MakeHuman beard skin
    beard = np.clip((1.0 - rel) * 4.2, 0, 1) * (z < lm['eye_z'] - 0.030) * (z > lm['neck_z'] + 0.01)
    beard = np.clip(beard + 0.10 * n_mid * (beard > 0.15), 0, 1)
    col[M] = mixc(col, rgb('#3a2a22'), beard * 0.88)[M]
    # lips
    lips = sstep(0.25, 0.75, soft_blur(np.clip(A[:, :, 0], 0, 1), 2)) * (z > lm['neck_z'])
    col[M] = mixc(col, rgb('#a85e50'), lips * 0.62)[M]
    # eyebrows: two tapered arcs above the eyes
    brow = np.zeros((H, W), np.float32)
    for sx in (1, -1):
        ex = sx * lm['eye_x']
        tpar = np.clip((x * sx - (lm['eye_x'] - 0.022)) / 0.054, 0, 1)   # 0 inner end .. 1 outer end
        zc = lm['eye_z'] + 0.0185 + 0.0045 * np.sin(np.pi * np.clip(tpar * 1.2, 0, 1)) - 0.005 * tpar ** 2
        thick = 0.0078 * (1.0 - 0.55 * tpar)
        inside = (x * sx > lm['eye_x'] - 0.024) & (x * sx < lm['eye_x'] + 0.034)
        b = sstep(thick, thick * 0.35, np.abs(z - zc)) * inside * (y < -0.085)
        b *= sstep(0.0, 0.08, tpar) * sstep(1.0, 0.9, tpar) + 0.0
        brow = np.maximum(brow, b)
    col[M] = mixc(col, rgb('#2e1d15'), brow * 0.9)[M]
    # lash line / lid shadow hugging the eyeballs
    for sx in (1, -1):
        c = np.array([sx * lm['eye_x'], lm['eye_y'], lm['eye_z']], np.float32)
        d = np.sqrt(((P - c) ** 2).sum(axis=2))
        lid = sstep(lm['eye_r'] + 0.0045, lm['eye_r'] + 0.0005, d) * (z > lm['eye_z'] - 0.001)
        col[M] = mixc(col, rgb('#2e1c16'), lid * 0.75)[M]
        lid2 = sstep(lm['eye_r'] + 0.012, lm['eye_r'] + 0.002, d)
        col[M] = mixc(col, rgb('#8a5544'), lid2 * 0.35)[M]
    nails = np.clip(A[:, :, 2], 0, 1) * (z < lm['neck_z'] - 0.2)
    col[M] = mixc(col, rgb('#dcb4a0'), nails * 0.6)[M]
    shade(M, rgb('#6e3a30') / skin_mid * 0.9, strength=0.75, cavity=0.25)
    rough[M] = 0.62
    ao_mix[M] = 0.5

    # ---------------- eyes ----------------
    M = pid == 2
    col[M] = rgb('#ddd5c8')
    for sx in (1, -1):
        cx, cy, cz = sx * lm['eye_x'], lm['eye_y'], lm['eye_z']
        r = np.sqrt((x - cx) ** 2 + (z - cz) ** 2)
        frontal = (y < cy) & (np.abs(x - cx) < 0.03)
        iris_r = lm['eye_r'] * 0.60
        iris = sstep(iris_r, iris_r * 0.93, r) * frontal
        ic = mixc(rgb('#3b2413'), rgb('#8a6030'), np.clip((cz - z) / iris_r * 0.6 + 0.45, 0, 1))   # lighter lower crescent
        ic = mixc(ic, rgb('#1d1109'), sstep(iris_r * 0.78, iris_r, r))                              # limbal ring
        ic = mixc(ic, rgb('#07050a'), sstep(iris_r * 0.46, iris_r * 0.40, r))                       # pupil
        hl = sstep(iris_r * 0.22, iris_r * 0.12, np.sqrt((x - cx - 0.30 * iris_r * 1.0) ** 2 + (z - cz - 0.36 * iris_r) ** 2))
        ic = mixc(ic, np.ones(3, np.float32), hl * 0.95)
        e = M & frontal
        col[e] = mixc(col, ic, iris)[e]
        topshade = sstep(cz + lm['eye_r'] * 0.15, cz + lm['eye_r'] * 0.75, z)
        col[M & (np.sign(x) == sx)] = (col * (1 - 0.55 * topshade[..., None]))[M & (np.sign(x) == sx)]
    rough[M] = 0.22
    ao_mix[M] = 0.35

    # ---------------- hair (scalp cap; the locks use the swatch strip below) ----------------
    M = pid == 3
    hair_d, hair_m, hair_l = rgb('#1c120e'), rgb('#33211a'), rgb('#5a3d2b')
    base_paint(M, hair_m, hair_l, hair_d, var=0.5, streak=0.25)
    shade(M, np.array([0.45, 0.4, 0.45], np.float32), strength=0.8)
    rough[M] = 0.55
    height[M] += (n_str * 0.0006)[M]

    # ---------------- tunic sleeves ----------------
    M = pid == 4
    base_paint(M, rgb('#7d725a'), rgb('#a3987a'), rgb('#524a3b'), var=0.5)
    # soft painted folds around the elbow and where the sleeve is pushed up by the bracer
    ax = np.abs(x)
    el, wr = lm['elbow'], lm['wrist']
    fdir = (wr - el) / np.linalg.norm(wr - el)
    a_along = (ax - el[0]) * fdir[0] + (y - el[1]) * fdir[1] + (z - el[2]) * fdir[2]      # metres past the elbow
    udir = lm['shoulder'] - el
    udir = udir / np.linalg.norm(udir)
    b_along = (ax - el[0]) * udir[0] + (y - el[1]) * udir[1] + (z - el[2]) * udir[2]      # metres above the elbow
    s_coord = np.where(a_along > 0, a_along, -b_along)
    foldw = np.exp(-(s_coord / 0.075) ** 2)
    folds = np.sin(s_coord * 2 * np.pi / 0.034 + 2.5 * n_lo) * foldw
    col[M] = (col * (1 + 0.11 * folds[..., None]))[M]
    height[M] += (folds * 0.0012)[M]
    shade(M, np.array([0.52, 0.5, 0.6], np.float32), strength=0.85, edge=0.12, edge_col=rgb('#b5ae96'))
    rough[M] = 0.9

    # ---------------- jerkin: dark studded leather ----------------
    M = pid == 5
    base_paint(M, rgb('#3b2a21'), rgb('#5a4130'), rgb('#231813'), var=0.6, streak=0.10)
    theta = np.arctan2(x, -(y - 0.0))
    u_j = theta * 0.165
    # panel seams: vertical at centre front / sides / back, horizontal bands
    seam = np.minimum.reduce([np.abs(theta - t0) for t0 in (-2.2, -1.25, 0.0, 1.25, 2.2)]) * 0.165
    seam = np.minimum(seam, np.abs(np.abs(theta) - np.pi) * 0.165)
    line = sstep(0.0035, 0.0012, seam)
    col[M] = (col * (1 - 0.5 * line[..., None]))[M]
    height[M] -= (line * 0.0006)[M]
    lightline = sstep(0.007, 0.004, seam) * (1 - line)
    col[M] = mixc(col, rgb('#6b4d38'), lightline * 0.35)[M]
    d, du, dv = dots(u_j, z - lm['waist_z'], 0.046, 0.043, 0.0052)
    stud(M & (seam > 0.011), d, du, dv, 0.0052)
    shade(M, np.array([0.42, 0.38, 0.45], np.float32), strength=0.9, edge=0.38, edge_col=rgb('#8a6648'), cavity=0.2)
    rough[M] = np.where(metal[M] > 0.5, rough[M], 0.6 + 0.08 * n_mid[M])

    # ---------------- hose ----------------
    M = pid == 6
    base_paint(M, rgb('#2f2f3b'), rgb('#474858'), rgb('#1b1b24'), var=0.5, streak=0.15)
    knee = np.exp(-(((z - lm['knee_z']) / 0.06) ** 2)) * (N[:, :, 1] < -0.3)
    col[M] = mixc(col, rgb('#55566a'), knee * 0.35)[M]
    shade(M, np.array([0.5, 0.5, 0.6], np.float32), strength=0.85)
    rough[M] = 0.88

    # ---------------- boots ----------------
    M = pid == 7
    base_paint(M, rgb('#74482a'), rgb('#9a6a40'), rgb('#3f2616'), var=0.4)
    grad = sstep(0.02, 0.30, z)
    col[M] = (col * (0.72 + 0.28 * grad)[..., None])[M]
    toe = np.exp(-(((y + 0.19) / 0.05) ** 2 + ((z - 0.05) / 0.035) ** 2))
    col[M] = mixc(col, rgb('#a87a4e'), toe * 0.35)[M]
    sole = sstep(0.020, 0.012, z)
    col[M] = mixc(col, rgb('#1e1611'), sole)[M]
    shade(M, np.array([0.45, 0.38, 0.4], np.float32), strength=0.85, edge=0.25, edge_col=rgb('#b98a5a'), cavity=0.15)
    rough[M] = 0.58

    # ---------------- leather straps and the belt ----------------
    for part_id, c_mid, c_light, c_dark in ((8, '#5f3c22', '#86593a', '#3a2314'), (16, '#4a2c1a', '#6e4a30', '#2a180e')):
        M = pid == part_id
        base_paint(M, rgb(c_mid), rgb(c_light), rgb(c_dark), var=0.5)
        u_s, v_s, wdt = A[:, :, 0], A[:, :, 1], np.maximum(A[:, :, 2], 1e-3)
        on_strap = M & (wdt > 0.005)
        vv = np.abs(v_s)
        edge_line = sstep(0.80, 0.97, vv) * (vv <= 1.02)
        col[on_strap] = (col * (1 - 0.42 * edge_line[..., None]))[on_strap]
        stitch_v = sstep(0.07, 0.03, np.abs(vv - 0.68) * wdt * 0.5 / 0.0035 * 0.07)
        stitch_u = (np.mod(u_s, 0.0095) < 0.0058)
        st = stitch_v * stitch_u * (vv < 0.9)
        col[on_strap] = mixc(col, rgb('#c9a777'), st * 0.75)[on_strap]
        height[on_strap] += (-(edge_line) * 0.0004 + st * 0.0003)[on_strap]
        centre_l = np.exp(-(v_s / 0.5) ** 2)
        col[on_strap] = (col * (1 + 0.10 * centre_l[..., None]))[on_strap]
        shade(M, np.array([0.45, 0.4, 0.42], np.float32), strength=0.85, edge=0.3, edge_col=rgb('#a37650'))
        rough[M] = 0.55

    # ---------------- brass: buckles, clasp, bell ----------------
    M = pid == 9
    k = np.clip(0.5 + 0.55 * up + 0.25 * N[:, :, 0] - 0.2 * N[:, :, 1] + 0.1 * n_mid, 0, 1)
    c = np.where((k < 0.5)[..., None], mixc(rgb('#6f4d1c'), rgb('#bf9540'), k * 2), mixc(rgb('#bf9540'), rgb('#f3d98a'), k * 2 - 1))
    col[M] = c[M]
    bellm = M & (np.abs(z - lm['bell_z']) < 0.06) & (np.sqrt((x - lm['bell_x']) ** 2 + (y - lm['bell_y']) ** 2) < 0.06)
    bands = np.minimum(np.abs(z - (lm['bell_z'] + 0.012)), np.abs(z - (lm['bell_z'] - 0.022)))
    bl = sstep(0.0028, 0.0010, bands)
    col[bellm] = (col * (1 - 0.45 * bl[..., None]))[bellm]
    height[bellm] -= (bl * 0.0005)[bellm]
    shade(M, np.array([0.42, 0.33, 0.25], np.float32), strength=0.8, edge=0.35, edge_col=rgb('#ffe9a8'))
    metal[M] = 1.0
    rough[M] = 0.36

    # ---------------- bracers ----------------
    M = pid == 10
    base_paint(M, rgb('#4f3120'), rgb('#77513a'), rgb('#2c1a10'), var=0.5)
    a_n = A[:, :, 0]
    border = np.minimum(np.abs(a_n - 0.17), np.abs(a_n - 0.93))
    bline = sstep(0.030, 0.012, border)
    col[M] = (col * (1 - 0.40 * bline[..., None]))[M]
    height[M] -= (bline * 0.0005)[M]
    rim_l = (a_n < 0.14) | (a_n > 0.96)
    col[M & rim_l] = mixc(col, rgb('#7b563c'), 0.45)[M & rim_l]
    shade(M, np.array([0.45, 0.4, 0.42], np.float32), strength=0.9, edge=0.35, edge_col=rgb('#9a7050'))
    rough[M] = 0.58

    # ---------------- embroidered trim: a vine scroll in muted gold and green on dark red ----------------
    def trim(U, V):
        """U along the band and V across it, both in band-widths (V in 0..1). Returns colour, coverage, relief."""
        ground = rgb('#4d1410')
        gold, gold_l, green = rgb('#b3903f'), rgb('#d9bd6a'), rgb('#4c6a3a')
        c = np.zeros(U.shape + (3,), np.float32) + ground
        relief = np.zeros(U.shape, np.float32)
        per = 1.9
        ph = 2 * np.pi * U / per
        stem_c = 0.5 + 0.20 * np.sin(ph)
        slope = 0.20 * np.cos(ph) * 2 * np.pi / per
        d_stem = np.abs(V - stem_c) / np.sqrt(1 + slope ** 2)
        for k_off, sgn in ((0.25, 1.0), (0.75, -1.0)):           # one leaf in each hollow of the stem
            Uk = (np.floor(U / per - k_off + 0.5) + k_off) * per
            lu, lv = U - Uk, V - (0.5 - sgn * 0.13)
            ang = sgn * 0.6
            ru = lu * np.cos(ang) + lv * np.sin(ang)
            rv = -lu * np.sin(ang) + lv * np.cos(ang)
            dleaf = np.sqrt((ru / 0.36) ** 2 + (rv / 0.135) ** 2)
            leaf = sstep(1.0, 0.82, dleaf)
            outline = sstep(1.18, 1.0, dleaf) * (1 - leaf)
            vein = sstep(0.03, 0.012, np.abs(rv)) * (np.abs(ru) < 0.28) * leaf
            c = mixc(c, green, leaf)
            c = mixc(c, gold, np.clip(outline + vein, 0, 1))
            relief = np.maximum(relief, leaf * 0.6 + outline)
            # berry at the outer side of each crest
            bu, bv = U - (Uk + 0.0), V - (0.5 + sgn * 0.33)
            berry = sstep(0.085, 0.06, np.sqrt(bu * bu + bv * bv))
            c = mixc(c, gold_l, berry)
            relief = np.maximum(relief, berry)
        stem = sstep(0.050, 0.030, d_stem)
        c = mixc(c, gold, stem)
        relief = np.maximum(relief, stem)
        for b0 in (0.075, 0.925):
            ln = sstep(0.040, 0.022, np.abs(V - b0))
            c = mixc(c, gold, ln)
            relief = np.maximum(relief, ln)
        inside = (V > 0.0) & (V < 1.0)
        return c, inside.astype(np.float32), relief

    # ---------------- cloak: madder red wool ----------------
    red_m, red_l, red_d = rgb('#98281c'), rgb('#bf4530'), rgb('#5c130f')
    M = pid == 11
    s_c, t_c, edge_d = A[:, :, 0], A[:, :, 1], A[:, :, 2]
    base_paint(M, red_m, red_l, red_d, var=0.30)
    # painted fold forms: crests catch the light, valleys go deep
    fold, amp, _ = cloak_fold(s_c, np.clip(t_c, 0, 1))
    crest = fold * np.clip(amp / 0.086, 0, 1.3)
    col[M] = mixc(col, rgb('#c94b34'), np.clip(crest, 0, 1) * 0.55)[M]
    col[M] = mixc(col, rgb('#4f1010'), np.clip(-crest, 0, 1) * 0.62)[M]
    hem = sstep(0.70, 1.0, t_c)
    col[M] = mixc(col, rgb('#5a2a1c'), hem * (0.30 + 0.20 * n_mid))[M]            # weathered, road-stained hem
    band_w = 0.062
    tc, cov, relief = trim((1.0 - t_c) * 1.26 / band_w, (edge_d - 0.010) / band_w)
    cov = cov * (edge_d > 0.0)
    col[M] = mixc(col, tc * (0.86 + 0.14 * (1 + n_mid))[..., None] * 0.92, cov)[M]
    height[M] += (relief * cov * 0.0005)[M]
    shade(M, np.array([0.40, 0.25, 0.38], np.float32), strength=0.9)
    rough[M] = 0.9 - 0.12 * cov[M]
    metal[M] = 0.0

    # ---------------- cloak lining ----------------
    M = pid == 12
    base_paint(M, rgb('#541b17'), rgb('#6e281f'), rgb('#33100e'), var=0.3)
    fold, amp, _ = cloak_fold(A[:, :, 0], np.clip(A[:, :, 1], 0, 1))
    crest = -fold * np.clip(amp / 0.086, 0, 1.3)
    col[M] = mixc(col, rgb('#7a2d22'), np.clip(crest, 0, 1) * 0.45)[M]
    col[M] = mixc(col, rgb('#260a0b'), np.clip(-crest, 0, 1) * 0.5)[M]
    shade(M, np.array([0.5, 0.4, 0.5], np.float32), strength=0.6)
    rough[M] = 0.92

    # ---------------- mantle, cowl and hood ----------------
    M = pid == 13
    base_paint(M, rgb('#9d2c1e'), rgb('#c44a33'), rgb('#61150f'), var=0.3)
    crest = np.clip(curv * 7.0, -1, 1)
    col[M] = mixc(col, rgb('#c44a33'), np.clip(crest, 0, 1) * 0.45)[M]
    col[M] = mixc(col, rgb('#4a0f10'), np.clip(-crest, 0, 1) * 0.5)[M]
    is_mantle = A[:, :, 2] > 0.5
    # trim down both front edges of the mantle (aux.g = distance from the opening, metres)
    tc, cov, relief = trim((lm['neck_z'] - z) / 0.050 + 0.4, (A[:, :, 1] - 0.008) / 0.050)
    cov = cov * is_mantle * (A[:, :, 1] > 0)
    col[M] = mixc(col, tc * 0.95, cov)[M]
    height[M] += (relief * cov * 0.0005)[M]
    # a narrow gold line round the mantle hem (aux.r = hem function, 0 at the hem)
    hemline = sstep(0.022, 0.010, np.abs(A[:, :, 0] + 0.075)) * is_mantle * (1 - cov)
    col[M] = mixc(col, rgb('#b3903f'), hemline * 0.85)[M]
    shade(M, np.array([0.40, 0.25, 0.38], np.float32), strength=0.9)
    rough[M] = 0.9

    # ---------------- pouches ----------------
    M = pid == 14
    base_paint(M, rgb('#6e4a2a'), rgb('#946a42'), rgb('#402814'), var=0.5)
    pr, pg, pb = A[:, :, 0], A[:, :, 1], A[:, :, 2]
    flap_edge = 0.40 + 0.16 * pr * pr
    frontf = pb > 0.55
    flap = (pg > flap_edge) & frontf
    col[M & flap] = mixc(col, rgb('#7d5632'), 0.5)[M & flap]
    fl = sstep(0.045, 0.015, np.abs(pg - flap_edge)) * frontf
    col[M] = (col * (1 - 0.55 * fl[..., None]))[M]
    height[M] -= (fl * 0.0008)[M]
    d = np.sqrt((pr * 0.05) ** 2 + ((pg - 0.50) * 0.11) ** 2)
    stud(M & frontf, d, pr * 0.05, (pg - 0.50) * 0.11, 0.0075)
    shade(M, np.array([0.45, 0.4, 0.42], np.float32), strength=0.9, edge=0.3, edge_col=rgb('#a8825a'))
    rough[M] = np.where(metal[M] > 0.5, rough[M], 0.6)

    # ---------------- hair locks: one shared gradient strip ----------------
    u0, v0, u1, v1 = HAIR_SWATCH
    X0, X1, Y0, Y1 = int(u0 * W) - 6, int(u1 * W) + 6, int(v0 * H) - 6, int(v1 * H) + 6
    uu = np.linspace(0, 1, X1 - X0)[None, :].repeat(Y1 - Y0, axis=0)
    vv = np.clip((np.arange(Y0, Y1)[:, None] / H - v0) / (v1 - v0), 0, 1).repeat(X1 - X0, axis=1)
    tone = 0.35 + 0.5 * vv + 0.10 * np.sin(uu * 97.0) + 0.06 * np.sin(uu * 331.0 + 1.3)
    tone = np.clip(tone, 0, 1)
    sw = np.where((tone < 0.5)[..., None], mixc(hair_d, hair_m, tone * 2), mixc(hair_m, hair_l, tone * 2 - 1))
    sw = sw * (0.80 + 0.20 * sstep(0.0, 0.35, vv))[..., None]      # darker roots stand in for occlusion
    col[Y0:Y1, X0:X1] = sw
    rough[Y0:Y1, X0:X1] = 0.55
    metal[Y0:Y1, X0:X1] = 0.0
    height[Y0:Y1, X0:X1] = 0.0
    ao_out = 1 - (1 - np.clip(ao_soft * 0.5 + ao * 0.5, 0, 1)) * 0.8
    ao_out[Y0:Y1, X0:X1] = 1.0

    # ---------------- normal map from the relief (kept mild: studs, stitches, trim, big folds) ----------------
    hs = soft_blur(height, 1, 1)
    texel = 1.0 / 900.0                                           # ~metres per texel at average density
    dhdu = (np.roll(hs, -1, axis=1) - np.roll(hs, 1, axis=1)) / (2 * texel)
    dhdv = (np.roll(hs, -1, axis=0) - np.roll(hs, 1, axis=0)) / (2 * texel)
    nx, ny, nz = -dhdu, -dhdv, np.ones_like(hs)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    nrm = np.stack([nx / ln * 0.5 + 0.5, ny / ln * 0.5 + 0.5, nz / ln * 0.5 + 0.5], axis=2)
    empty = pid == 0
    empty[Y0:Y1, X0:X1] = False
    col[empty] = rgb('#3a2620')
    nrm[empty] = (0.5, 0.5, 1.0)
    orm = np.stack([ao_out, np.clip(rough, 0.05, 1), np.clip(metal, 0, 1)], axis=2)
    orm[empty] = (1.0, 0.8, 0.0)
    return np.clip(col, 0, 1), orm.astype(np.float32), nrm.astype(np.float32)


def save_image(name, arr, path, srgb_space, quality=92):
    h, w, _ = arr.shape
    img = bpy.data.images.new(name, w, h, alpha=False)
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[:, :, :3] = arr
    # 8-bit images hold display values as-is: no conversion on the way in or out
    img.colorspace_settings.name = 'sRGB' if srgb_space else 'Non-Color'
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = path
    img.file_format = 'JPEG'
    img.save(quality=quality)
    bpy.data.images.remove(img)
    out = bpy.data.images.load(path)
    out.name = name
    out.colorspace_settings.name = 'sRGB' if srgb_space else 'Non-Color'
    out.pack()
    return out


def stage_paint():
    rig = bpy.data.objects['rider_rig']
    rb, rc = bpy.data.objects['rider_body'], bpy.data.objects['rider_cloak']
    tmp = WORK or bpy.app.tempdir
    os.makedirs(tmp, exist_ok=True)
    npz = os.path.join(tmp, 'rider_bake.npz')
    skin = glob.glob(os.path.join(CACHE, 'mh', 'jartur69_middleage_slavic_male_with_genitals_and_beard', '*.png'))
    if not skin:
        raise SystemExit('skin asset missing: run tools/blender/fetch_rider_assets.sh')
    if WORK and os.environ.get('RIDER_REUSE_BAKE') and os.path.isfile(npz):
        maps = dict(np.load(npz))
        log('reusing bake', npz)
    else:
        maps = dilate_maps(bake_maps([rb, rc], skin[0]))
        if WORK:
            np.savez_compressed(npz, **maps)

    def bz(n, tail=False):
        return bone_pos(rig, n, tail)
    eye_v = [v.co for v in rb.data.vertices if 0.005 < v.co.x < 0.06 and v.co.z > bz('head').z and v.co.y < -0.08]
    # eye landmarks come from the eyeball geometry: faces painted as 'eye'
    eye_slot = [i for i, mt in enumerate(rb.data.materials) if mt.name == 'P_eye'][0]
    ev = set()
    for p in rb.data.polygons:
        if p.material_index == eye_slot:
            ev.update(p.vertices)
    ec = np.array([rb.data.vertices[i].co[:] for i in ev if rb.data.vertices[i].co.x > 0])
    lo, hi = ec.min(axis=0), ec.max(axis=0)
    bell = bz('bell')
    lm = dict(eye_x=float((lo[0] + hi[0]) / 2), eye_y=float((lo[1] + hi[1]) / 2), eye_z=float((lo[2] + hi[2]) / 2),
              eye_r=float((hi[2] - lo[2]) / 2), neck_z=bz('neck_01').z, waist_z=bz('spine_01').z + 0.05,
              knee_z=bz('calf_l').z, elbow=np.array(bz('lowerarm_l')), wrist=np.array(bz('hand_l')),
              shoulder=np.array(bz('upperarm_l')), bell_x=bell.x, bell_y=bell.y, bell_z=bz('bell', True).z + 0.045)
    log('landmarks', {k: (round(v, 4) if isinstance(v, float) else v) for k, v in lm.items() if k.startswith('eye')})
    base, orm, nrm = paint_textures(maps, lm)
    i_base = save_image('rider_basecolor', base, os.path.join(tmp, 'rider_basecolor.jpg'), True, 93)
    i_orm = save_image('rider_orm', orm, os.path.join(tmp, 'rider_orm.jpg'), False, 90)
    i_nrm = save_image('rider_normal', nrm, os.path.join(tmp, 'rider_normal.jpg'), False, 93)

    # ---- the single game material ----
    mat = bpy.data.materials.new('rider')
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tb = nt.nodes.new('ShaderNodeTexImage')
    tb.image = i_base
    nt.links.new(tb.outputs['Color'], bsdf.inputs['Base Color'])
    to = nt.nodes.new('ShaderNodeTexImage')
    to.image = i_orm
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(to.outputs['Color'], sep.inputs[0])
    nt.links.new(sep.outputs[1], bsdf.inputs['Roughness'])
    nt.links.new(sep.outputs[2], bsdf.inputs['Metallic'])
    tn = nt.nodes.new('ShaderNodeTexImage')
    tn.image = i_nrm
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nm.inputs['Strength'].default_value = 1.0
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    # occlusion for glTF: the exporter looks for this node group
    grp = bpy.data.node_groups.get('glTF Material Output') or bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    if not grp.interface.items_tree:
        grp.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    g = nt.nodes.new('ShaderNodeGroup')
    g.node_tree = grp
    nt.links.new(sep.outputs[0], g.inputs[0])
    mat.use_backface_culling = False
    for o in (rb, rc):
        o.data.materials.clear()
        o.data.materials.append(mat)
        for p in o.data.polygons:
            p.material_index = 0
        for lay in list(o.data.uv_layers):
            if lay.name != 'UVMap':
                o.data.uv_layers.remove(lay)
        a = o.data.color_attributes.get('aux')
        if a is not None:
            o.data.color_attributes.remove(a)
    for m in list(bpy.data.materials):
        if m.name.startswith('P_'):
            bpy.data.materials.remove(m)


# --------------------------------------------------------------------------
# posing helpers (world space; Blender: Z up, the character faces -Y, its left is +X)
# --------------------------------------------------------------------------
def reset_pose(rig):
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


def rot_world(rig, bone, axis, deg):
    """Rotate a pose bone about a world-space axis through its head."""
    pb = rig.pose.bones[bone]
    m = pb.matrix.copy()
    head = m.translation.copy()
    r = Matrix.Rotation(math.radians(deg), 4, Vector(axis).normalized())
    m2 = r @ m
    m2.translation = head
    pb.matrix = m2
    bpy.context.view_layer.update()


def aim_world(rig, bone, direction, amount=1.0):
    """Swing a pose bone so that it points along a world-space direction."""
    pb = rig.pose.bones[bone]
    m = pb.matrix.copy()
    head = m.translation.copy()
    cur = (m.to_3x3() @ Vector((0, 1, 0))).normalized()
    q = cur.rotation_difference(Vector(direction).normalized())
    q = Quaternion().slerp(q, amount)
    m2 = q.to_matrix().to_4x4() @ m
    m2.translation = head
    pb.matrix = m2
    bpy.context.view_layer.update()


def bone_dir(rig, bone):
    return (rig.pose.bones[bone].matrix.to_3x3() @ Vector((0, 1, 0))).normalized()


def curl_fingers(rig, amount=0.5):
    for sd in ('l', 'r'):
        for f in ('index', 'middle', 'ring', 'pinky'):
            for k in (1, 2, 3):
                pb = rig.pose.bones[f'{f}_0{k}_{sd}']
                hand = rig.pose.bones[f'hand_{sd}']
                # curl about the axis across the palm
                across = (rig.pose.bones[f'pinky_01_{sd}'].matrix.translation - rig.pose.bones[f'index_01_{sd}'].matrix.translation).normalized()
                rot_world(rig, pb.name, across, (-1 if sd == 'l' else 1) * amount * (38 if k == 1 else 46) * (-1))


def pose_ride(rig, lean=15.0, sway=0.0, breathe=0.0):
    """Astride a dragon: thighs raised ~70 deg and spread ~37 deg, knees bent ~80 deg,
    torso leaning 15 deg forward, hands forward on the reins."""
    reset_pose(rig)
    X, Z = (1, 0, 0), (0, 0, 1)
    rot_world(rig, 'pelvis', X, 6.0 + sway * 0.6)
    rot_world(rig, 'spine_01', X, (lean - 6.0) * 0.45 + breathe * 0.6)
    rot_world(rig, 'spine_02', X, (lean - 6.0) * 0.35 + breathe * 0.6)
    rot_world(rig, 'spine_03', X, (lean - 6.0) * 0.20 + breathe * 0.8)
    rot_world(rig, 'spine_01', (0, 1, 0), sway * 1.2)
    rot_world(rig, 'neck_01', X, -lean * 0.45)
    rot_world(rig, 'head', X, -lean * 0.45 - breathe * 0.5)
    for sd, sg in (('l', 1), ('r', -1)):
        th, ca, ft = f'thigh_{sd}', f'calf_{sd}', f'foot_{sd}'
        # thigh: 70 deg forward of straight down, then 37 deg outwards
        d = Vector((0, -math.sin(math.radians(70)), -math.cos(math.radians(70))))
        d = Matrix.Rotation(math.radians(37 * sg), 3, 'Z') @ d
        aim_world(rig, th, d)
        hinge = d.cross(Vector((0, 0, -1))).normalized() * sg      # across the knee
        td = bone_dir(rig, th)
        cd = Matrix.Rotation(math.radians(80), 3, hinge) @ td
        if cd.z > (Matrix.Rotation(math.radians(-80), 3, hinge) @ td).z:
            cd = Matrix.Rotation(math.radians(-80), 3, hinge) @ td
        aim_world(rig, ca, cd)
        fd = Vector((0.25 * sg, -0.90, -0.30)).normalized()
        aim_world(rig, ft, fd)
        aim_world(rig, f'clavicle_{sd}', bone_dir(rig, f'clavicle_{sd}') + Vector((0, -0.18, 0.04)))
        aim_world(rig, f'upperarm_{sd}', Vector((0.16 * sg, -0.62, -0.77)))
        aim_world(rig, f'lowerarm_{sd}', Vector((-0.22 * sg, -0.93, -0.18 + breathe * 0.01)))
        aim_world(rig, f'hand_{sd}', Vector((-0.25 * sg, -0.95, -0.15)))
    curl_fingers(rig, 0.75)
    # the cloak falls back over the saddle
    rot_world(rig, 'cloak1', X, 14.0 + sway * 2.0)
    rot_world(rig, 'cloak2', X, 16.0 + sway * 3.0)
    rot_world(rig, 'cloak3', X, 12.0 + sway * 4.0)
    rot_world(rig, 'cloak4', X, 8.0 + sway * 5.0)


def pose_stand(rig, arm_down=62.0):
    """Relaxed standing pose used for checks: arms lowered to the sides."""
    reset_pose(rig)
    for sd, sg in (('l', 1), ('r', -1)):
        aim_world(rig, f'upperarm_{sd}', Vector((0.16 * sg, 0.05, -1.0)))
        aim_world(rig, f'lowerarm_{sd}', Vector((0.10 * sg, -0.22, -1.0)))
        aim_world(rig, f'hand_{sd}', Vector((0.05 * sg, -0.2, -1.0)))
        aim_world(rig, f'thigh_{sd}', bone_dir(rig, f'thigh_{sd}') + Vector((-0.045 * sg, 0, 0)))
        aim_world(rig, f'foot_{sd}', bone_dir(rig, f'foot_{sd}') + Vector((0.045 * sg, 0, 0)))
    curl_fingers(rig, 0.35)


def main():
    start = STAGES.index(FROM) + 1 if FROM else 0
    if FROM:
        load_stage(FROM)
    fns = {'human': stage_human, 'garments': stage_garments, 'mesh': stage_mesh, 'paint': stage_paint}
    for name in STAGES[start:]:
        if name not in fns:
            break
        log('=== stage', name)
        fns[name]()
        save_stage(name)
        if UNTIL == name:
            return


if __name__ == '__main__':
    main()
