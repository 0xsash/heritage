# BELFORT townsfolk kit - stage 1: the bodies (MPFB2 / MakeHuman, "game engine" rig).
#
# Every body is the MakeHuman base mesh with different macro sliders and face targets, so all of them
# share one topology; the rig is MPFB's "game engine" rig (the rider's skeleton, same bone names) plus
# the rider's four optional cloak bones, placed down each body's back.

import bpy, bmesh, math, json, importlib, glob, os
import numpy as np
from mathutils import Vector, Matrix
from .common import (log, get_bm, put_bm, dup, set_aux, clean_weights, shade_smooth, set_part, to_coll, tri_count,
                     CACHE, R)

MPFB_MOD = R.MPFB_MOD

# Stylisation shared with the rider (slightly larger head, hands and feet; a firmer jaw) - kept milder.
STYLE = {'head-scale-horiz-incr': 0.10, 'head-scale-vert-incr': 0.10, 'head-scale-depth-incr': 0.10,
         'l-hand-scale-incr': 0.25, 'r-hand-scale-incr': 0.25, 'l-foot-scale-incr': 0.2, 'r-foot-scale-incr': 0.2,
         'l-eye-scale-incr': 0.2, 'r-eye-scale-incr': 0.2}


def sym(d):
    """Expand 'X-...' keys to both l- and r- targets."""
    out = {}
    for k, v in d.items():
        if k.startswith('X-'):
            out['l-' + k[2:]] = v
            out['r-' + k[2:]] = v
        else:
            out[k] = v
    return out


# id -> spec. height in metres to the top of the skull. MakeHuman age: 0.1875 = 11 y, 0.5 = 25 y, 1.0 = 90 y.
# race: (caucasian, asian, african) - a small blend only varies the face; Brabant in 1650 is a Flemish town.
BODIES = {
    'man': dict(height=1.70, sex='m', age_group='adult', skin='middleage_caucasian_male',
                macros=dict(gender=1.0, age=0.55, muscle=0.55, weight=0.52, proportions=0.6, height=0.5),
                race=(0.92, 0.04, 0.04),
                targets=sym({'head-square': 0.35, 'nose-hump-incr': 0.35, 'nose-scale-vert-incr': 0.2,
                             'chin-width-incr': 0.3, 'X-cheek-bones-incr': 0.3, 'eyebrows-trans-down': 0.2,
                             'mouth-scale-horiz-incr': 0.15})),
    'man_young': dict(height=1.72, sex='m', age_group='adult', skin='young_caucasian_male',
                      macros=dict(gender=1.0, age=0.42, muscle=0.6, weight=0.42, proportions=0.65, height=0.55),
                      race=(0.95, 0.03, 0.02),
                      targets=sym({'head-oval': 0.4, 'nose-point-up': 0.3, 'nose-scale-horiz-decr': 0.2,
                                   'chin-prominent-incr': 0.25, 'X-cheek-volume-decr': 0.35, 'X-eye-trans-up': 0.1,
                                   'mouth-lowerlip-volume-incr': 0.2})),
    'man_stout': dict(height=1.68, sex='m', age_group='adult', skin='middleage_caucasian_male',
                      macros=dict(gender=1.0, age=0.64, muscle=0.4, weight=0.92, proportions=0.45, height=0.45),
                      race=(0.9, 0.05, 0.05),
                      targets=sym({'head-round': 0.5, 'head-fat-incr': 0.5, 'nose-volume-incr': 0.4,
                                   'nose-scale-horiz-incr': 0.3, 'neck-double-incr': 0.5, 'X-cheek-volume-incr': 0.4,
                                   'stomach-pregnant-incr': 0.3, 'chin-jaw-drop-incr': 0.2})),
    'man_old': dict(height=1.65, sex='m', age_group='old', skin='old_caucasian_male',
                    macros=dict(gender=1.0, age=0.88, muscle=0.3, weight=0.45, proportions=0.5, height=0.4),
                    race=(0.93, 0.04, 0.03),
                    targets=sym({'head-age-incr': 0.6, 'head-triangular': 0.3, 'nose-scale-vert-incr': 0.35,
                                 'nose-hump-incr': 0.5, 'nose-point-down': 0.3, 'X-cheek-volume-decr': 0.6,
                                 'X-eye-bag-incr': 0.5, 'chin-prominent-incr': 0.3, 'X-ear-scale-incr': 0.4})),
    'woman': dict(height=1.60, sex='f', age_group='adult', skin='young_caucasian_female',
                  macros=dict(gender=0.0, age=0.47, muscle=0.45, weight=0.5, proportions=0.6, height=0.5,
                              cupsize=0.5, firmness=0.6),
                  race=(0.93, 0.04, 0.03),
                  targets=sym({'head-oval': 0.5, 'nose-scale-horiz-decr': 0.2, 'nose-point-up': 0.15,
                               'mouth-scale-horiz-decr': 0.1, 'X-cheek-bones-incr': 0.25, 'chin-width-decr': 0.2})),
    'woman_stout': dict(height=1.57, sex='f', age_group='adult', skin='middleage_caucasian_female',
                        macros=dict(gender=0.0, age=0.6, muscle=0.45, weight=0.88, proportions=0.45, height=0.42,
                                    cupsize=0.65, firmness=0.4),
                        race=(0.9, 0.05, 0.05),
                        targets=sym({'head-round': 0.5, 'head-fat-incr': 0.4, 'nose-volume-incr': 0.25,
                                     'X-cheek-volume-incr': 0.45, 'neck-double-incr': 0.3, 'mouth-scale-horiz-incr': 0.1})),
    'woman_old': dict(height=1.53, sex='f', age_group='old', skin='old_caucasian_female',
                      macros=dict(gender=0.0, age=0.9, muscle=0.3, weight=0.5, proportions=0.45, height=0.35,
                                  cupsize=0.4, firmness=0.2),
                      race=(0.94, 0.03, 0.03),
                      targets=sym({'head-age-incr': 0.7, 'head-diamond': 0.3, 'nose-hump-incr': 0.3,
                                   'nose-point-down': 0.35, 'X-cheek-volume-decr': 0.5, 'X-eye-bag-incr': 0.5,
                                   'chin-prominent-incr': 0.35, 'mouth-angles-down': 0.4})),
    'girl': dict(height=1.25, sex='f', age_group='child', skin='young_caucasian_female',
                 macros=dict(gender=0.0, age=0.155, muscle=0.5, weight=0.5, proportions=0.5, height=0.5,
                             cupsize=0.0, firmness=0.5),
                 race=(0.95, 0.03, 0.02),
                 targets=sym({'head-round': 0.3, 'nose-point-up': 0.3, 'X-cheek-volume-incr': 0.2})),
    'boy': dict(height=1.35, sex='m', age_group='child', skin='young_caucasian_male',
                macros=dict(gender=1.0, age=0.18, muscle=0.5, weight=0.45, proportions=0.5, height=0.55),
                race=(0.94, 0.03, 0.03),
                targets=sym({'head-oval': 0.25, 'nose-scale-horiz-decr': 0.1, 'X-ear-scale-incr': 0.25,
                             'chin-prominent-incr': 0.1})),
}
BODY_ORDER = list(BODIES)

# Face morph targets shipped with every body (same names and order everywhere). Each is the half-difference of a
# MakeHuman 'incr' / 'decr' target pair (so +1 is about the incr target and -1 about the decr one), times a gain.
# name: (targets at +1, targets at -1, gain)
FACE_MORPHS = {
    'nose_length': (['nose-scale-vert-incr', 'nose-point-down'], ['nose-scale-vert-decr', 'nose-point-up'], 1.0),
    'nose_width': (['nose-scale-horiz-incr', 'nose-flaring-incr'], ['nose-scale-horiz-decr', 'nose-flaring-decr'], 1.4),
    'nose_bridge': (['nose-hump-incr', 'nose-scale-depth-incr'], ['nose-hump-decr', 'nose-scale-depth-decr'], 1.0),
    'jaw_width': (['chin-bones-incr', 'chin-width-incr'], ['chin-bones-decr', 'chin-width-decr'], 1.0),
    'chin_length': (['chin-height-incr', 'chin-prominent-incr'], ['chin-height-decr', 'chin-prominent-decr'], 1.0),
    'cheeks': (['l-cheek-volume-incr', 'r-cheek-volume-incr'], ['l-cheek-volume-decr', 'r-cheek-volume-decr'], 1.3),
    'brow': (['eyebrows-trans-forward', 'eyebrows-trans-down'], ['eyebrows-trans-backward', 'eyebrows-trans-up'], 1.0),
    'eyes': (['l-eye-scale-incr', 'r-eye-scale-incr'], ['l-eye-scale-decr', 'r-eye-scale-decr'], 1.6),
    'mouth_width': (['mouth-scale-horiz-incr'], ['mouth-scale-horiz-decr'], 1.5),
    'lips': (['mouth-upperlip-volume-incr', 'mouth-lowerlip-volume-incr'], ['mouth-upperlip-volume-decr', 'mouth-lowerlip-volume-decr'], 1.6),
    'face_fat': (['head-fat-incr'], ['head-fat-decr'], 1.5),
}
MORPH_ATTR = 'fm_'


def target_deltas(TargetService, name, n):
    """A MakeHuman target as an (n, 3) array of Blender-space offsets in decimetres (x, -z, y)."""
    import gzip
    path = TargetService.target_full_path(name)
    out = np.zeros((n, 3), dtype=np.float64)
    if not path:
        log('  (no target', name, ')')
        return out
    op = gzip.open if str(path).endswith('.gz') else open
    with op(path, 'rt') as f:
        for line in f:
            parts = line.split()
            if len(parts) < 4 or parts[0].startswith('#'):
                continue
            i = int(parts[0])
            if i < n:
                out[i] = (float(parts[1]), -float(parts[3]), float(parts[2]))
    return out


def add_face_morphs(TargetService, body, scale):
    """Store every face morph as a per-vertex vector attribute fm_<name> (metres) on the full base mesh."""
    n = len(body.data.vertices)
    for name, (plus, minus, gain) in FACE_MORPHS.items():
        d = np.zeros((n, 3))
        for t in plus:
            d += target_deltas(TargetService, t, n)
        for t in minus:
            d -= target_deltas(TargetService, t, n)
        d *= 0.5 * gain * 0.1 * scale
        a = body.data.attributes.new(MORPH_ATTR + name, 'FLOAT_VECTOR', 'POINT')
        a.data.foreach_set('vector', d.astype(np.float32).ravel())


def ensure_mpfb():
    R.ensure_mpfb()


def extract_group(basemesh, group, name):
    o = dup(basemesh, name)
    gi = o.vertex_groups[group].index
    bm = get_bm(o)
    dl = bm.verts.layers.deform.verify()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if gi not in v[dl]], context='VERTS')
    put_bm(bm, o)
    return o


def make_body(bid):
    spec = BODIES[bid]
    HumanService = importlib.import_module(MPFB_MOD + '.services.humanservice').HumanService
    TargetService = importlib.import_module(MPFB_MOD + '.services.targetservice').TargetService
    md = TargetService.get_default_macro_info_dict()
    md.update(spec['macros'])
    c, a, f = spec['race']
    md['race'] = dict(caucasian=c, asian=a, african=f)
    before = set(bpy.data.objects)
    body = HumanService.create_human(scale=0.1, macro_detail_dict=md)
    targets = dict(STYLE)
    for k, v in spec['targets'].items():
        targets[k] = targets.get(k, 0.0) + v
    for k, v in targets.items():
        p = TargetService.target_full_path(k)
        if not p:
            log('  (no target', k, ')')
            continue
        TargetService.load_target(body, p, weight=v, name=k)
    TargetService.bake_targets(body)
    rig = HumanService.add_builtin_rig(body, 'game_engine')

    gi = body.vertex_groups['body'].index
    top = max(v.co.z for v in body.data.vertices if any(g.group == gi for g in v.groups))
    s = spec['height'] / top
    S = Matrix.Scale(s, 4)
    for m in list(body.modifiers):
        body.modifiers.remove(m)
    body.parent = None
    body.matrix_world = Matrix.Identity(4)
    body.data.transform(S)
    rig.matrix_world = Matrix.Identity(4)
    rig.data.transform(S)
    rig.name = rig.data.name = f'rig.{bid}'
    body.name = body.data.name = f'body.{bid}'
    add_face_morphs(TargetService, body, s)

    tights = extract_group(body, 'helper-tights', f'h_tights.{bid}')
    skirt = extract_group(body, 'helper-skirt', f'h_skirt.{bid}')
    hairh = extract_group(body, 'helper-hair', f'h_hair.{bid}')
    eyes = [extract_group(body, 'helper-l-eye', f'eye_l.{bid}'), extract_group(body, 'helper-r-eye', f'eye_r.{bid}')]
    bm = get_bm(body)
    dl = bm.verts.layers.deform.verify()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if gi not in v[dl]], context='VERTS')
    put_bm(bm, body)
    aux = np.zeros((len(body.data.vertices), 3), dtype=np.float32)
    for ch, gname in enumerate(('lips', 'scalp', 'fingernails')):
        g = body.vertex_groups.get(gname)
        if g is None:
            continue
        for v in body.data.vertices:
            if any(e.group == g.index for e in v.groups):
                aux[v.index, ch] = 1.0
    set_aux(body, aux)
    add_cloak_bones(rig, tights)
    bones = {b.name for b in rig.data.bones}
    for o in [body, tights, skirt, hairh] + eyes:
        clean_weights(o, bones, limit=8)
        shade_smooth(o)
    set_part(body, 'skin')
    for e in eyes:
        set_part(e, 'eye')
    for o in (tights, skirt, hairh):
        set_part(o, 'wool')
    # delete anything else MPFB made (proxies, empties)
    for o in set(bpy.data.objects) - before:
        if o not in (body, rig, tights, skirt, hairh, *eyes):
            bpy.data.objects.remove(o)
    for o in (body, tights, skirt, hairh, *eyes):
        o.parent = rig
        m = o.modifiers.new('rig', 'ARMATURE')
        m.object = rig
        to_coll(o, f'B.{bid}')
    to_coll(rig, f'B.{bid}')
    for o in (tights, skirt, hairh):
        o.hide_render = True
        o.hide_set(True)
    rig['landmarks'] = json.dumps(landmarks(rig, body, eyes, skirt))
    rig['body_id'] = bid
    log('body %-11s %.2f m (MakeHuman %.3f, x%.3f)  verts %d  tris %d' % (bid, spec['height'], top, s, len(body.data.vertices), tri_count(body)))
    return rig


def add_cloak_bones(rig, tights):
    """The rider's optional cloak chain (cloak1..4 under spine_03), placed behind this body's back from
    just under the nape to about knee height."""
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = rig.data.edit_bones
    neck = eb['neck_01'].head.copy()
    knee = eb['calf_l'].head.copy()
    back = max(v.co.y for v in tights.data.vertices if abs(v.co.x) < 0.05 and abs(v.co.z - (neck.z - 0.15)) < 0.03)
    z0 = neck.z - 0.075
    z1 = knee.z - 0.02
    pts = [Vector((0.0, back + 0.03 + 0.06 * k / 4.0, z0 + (z1 - z0) * k / 4.0)) for k in range(5)]
    prev = eb['spine_03']
    for k in range(1, 5):
        b = eb.new(f'cloak{k}')
        b.head, b.tail = pts[k - 1], pts[k]
        b.parent = prev
        b.use_connect = (k > 1)
        b.align_roll(Vector((0, 1, 0)))
        prev = b
    bpy.ops.object.mode_set(mode='OBJECT')


def landmarks(rig, body, eyes, skirt):
    def bh(n):
        return list(rig.data.bones[n].head_local)
    ec = np.array([v.co[:] for v in eyes[0].data.vertices])
    lo, hi = ec.min(axis=0), ec.max(axis=0)
    co = np.array([v.co[:] for v in body.data.vertices])
    head_z = bh('head')[2]
    hv = co[co[:, 2] > head_z]
    lm = dict(
        eye=[float((lo[0] + hi[0]) / 2), float((lo[1] + hi[1]) / 2), float((lo[2] + hi[2]) / 2)],
        eye_r=float((hi[2] - lo[2]) / 2),
        top=float(co[:, 2].max()),
        head_min=[float(x) for x in hv.min(axis=0)], head_max=[float(x) for x in hv.max(axis=0)],
        waist_z=float(max(v.co.z for v in skirt.data.vertices)),
        skirt_min_z=float(min(v.co.z for v in skirt.data.vertices)),
    )
    for n in ('pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head', 'upperarm_l', 'lowerarm_l', 'hand_l',
              'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'clavicle_l', 'middle_01_l'):
        lm[n] = bh(n)
    return lm


def stage_bodies(only=None):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ensure_mpfb()
    rigs = []
    for bid in BODY_ORDER:
        if only and bid not in only:
            continue
        rigs.append(make_body(bid))
    counts = {r['body_id']: len(bpy.data.objects[f'body.{r["body_id"]}'].data.vertices) for r in rigs}
    assert len(set(counts.values())) == 1, f'bodies do not share topology: {counts}'
    # spread them out so the blend file is readable (object transforms only; data stays at the origin)
    return rigs
