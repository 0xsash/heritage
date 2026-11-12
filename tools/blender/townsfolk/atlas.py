# BELFORT townsfolk kit - stage 3: UV atlases.
#
# Garments + props share one atlas: each garment is unwrapped once, on its reference body, and the UVs are
# copied to its fitted copies on the other bodies (they have the same loops). Bodies share a skin atlas cut into
# a 3 x 3 grid: the MakeHuman UV layout is repacked once with the head enlarged, then offset into each body's tile.

import bpy, bmesh, math, json
import numpy as np
from .common import log, get_bm, put_bm, activate
from .bodies import BODY_ORDER

ATLAS_MARGIN = 0.003
# relative texel density by garment (small, close-up details get more)
DENS = {'collar_band': 1.5, 'kerchief': 1.2, 'beard_pointed': 1.6, 'moustache': 1.8, 'beard_full': 1.4, 'skirt': 0.8,
        'habit': 0.75, 'huik': 0.75, 'shoes': 1.1, 'clogs': 1.0, 'morion': 1.2, 'hat_wide': 1.0, 'coif': 1.3,
        'beguine_veil': 1.1, 'hair_crop': 0.9, 'hair_long': 0.9, 'hair_thin': 1.0, 'hair_child': 0.9, 'hair_bun': 1.0,
        'buttons': 2.0, 'rosary': 1.2}
SKIN_TILES = 3


def uv_fresh(obj):
    me = obj.data
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    me.uv_layers.new(name='UVMap')


def get_uv(obj, name=None):
    lay = obj.data.uv_layers[name] if name else obj.data.uv_layers[0]
    uv = np.zeros(len(obj.data.loops) * 2, dtype=np.float32)
    lay.data.foreach_get('uv', uv)
    return uv.reshape(-1, 2)


def put_uv(obj, uv, name=None):
    lay = obj.data.uv_layers[name] if name else obj.data.uv_layers[0]
    lay.data.foreach_set('uv', np.asarray(uv, dtype=np.float32).ravel())
    obj.data.update()


def smart(obj, angle=62.0):
    uv_fresh(obj)
    activate(obj)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=0.0, area_weight=0.0, correct_aspect=True,
                             scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def multi_edit(objs, fn):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    fn()
    bpy.ops.object.mode_set(mode='OBJECT')


def garment_refs():
    meta = json.loads(bpy.context.scene['garments'])
    refs = {}
    for g, m in meta.items():
        if not m['bodies']:
            continue
        b = m['ref'] if m['ref'] in m['bodies'] else m['bodies'][0]
        refs[g] = bpy.data.objects[f'{g}.{b}']
    for o in bpy.data.objects:
        if o.get('prop'):
            refs['prop.' + o['prop']] = o
    return refs, meta


def stage_mesh():
    refs, meta = garment_refs()
    # 1. unwrap each reference copy
    for name, o in refs.items():
        smart(o, 60.0)
    # 2. equalise texel density, apply per-garment density, pack everything into one atlas
    objs = list(refs.values())
    multi_edit(objs, lambda: bpy.ops.uv.average_islands_scale())
    for name, o in refs.items():
        d = DENS.get(name.split('.')[-1], 1.0)
        put_uv(o, get_uv(o) * d)
    multi_edit(objs, lambda: bpy.ops.uv.pack_islands(rotate=True, scale=True, margin_method='FRACTION', margin=ATLAS_MARGIN,
                                                      shape_method='CONCAVE'))
    # 3. copy to the fitted copies
    for g, m in meta.items():
        if g not in refs:
            continue
        src = get_uv(refs[g])
        for b in m['bodies']:
            o = bpy.data.objects[f'{g}.{b}']
            if o is refs[g]:
                continue
            uv_fresh(o)
            assert len(o.data.loops) == len(src), f'{o.name}: loop count differs from the reference'
            put_uv(o, src)
    log('garment atlas: %d pieces packed' % len(objs))

    # 4. skin atlas: repack the MakeHuman layout once (head x2.6), then tile it per body
    MH = {}
    for bid in BODY_ORDER:
        for part in ('body', 'eye_l', 'eye_r'):
            o = bpy.data.objects[f'{part}.{bid}']
            MH[o.name] = get_uv(o)
    ref = bpy.data.objects['body.man']
    eyes = [bpy.data.objects['eye_l.man'], bpy.data.objects['eye_r.man']]
    for o in [ref] + eyes:
        uv_fresh(o)
        put_uv(o, MH[o.name])
    multi_edit([ref] + eyes, lambda: bpy.ops.uv.average_islands_scale())
    neck_z = ref.parent.data.bones['neck_01'].head_local.z
    for o, d in [(ref, None)] + [(e, 3.0) for e in eyes]:
        uv = get_uv(o)
        if d is None:
            # scale islands in the head / hands up about their own centres via a per-loop factor
            me = o.data
            lv = np.zeros(len(me.loops), dtype=np.int32)
            me.loops.foreach_get('vertex_index', lv)
            co = np.zeros(len(me.vertices) * 3)
            me.vertices.foreach_get('co', co)
            co = co.reshape(-1, 3)
            head = co[lv, 2] > neck_z - 0.02
            hand = np.abs(co[lv, 0]) > 0.42
            f = np.where(head, 2.6, np.where(hand, 1.4, 1.0))
            # islands: scale each island about its centre by its majority factor
            bm = get_bm(o)
            uvl = bm.loops.layers.uv.active
            seen = set()
            loops_of = []
            for face in bm.faces:
                if face.index in seen:
                    continue
                stack, isl = [face], []
                seen.add(face.index)
                while stack:
                    fc = stack.pop()
                    isl.append(fc)
                    for lp in fc.loops:
                        for e_l in lp.edge.link_loops:
                            nf = e_l.face
                            if nf.index in seen:
                                continue
                            # same island if the shared edge has matching uvs on both sides
                            a1, b1 = lp[uvl].uv, lp.link_loop_next[uvl].uv
                            a2, b2 = e_l.link_loop_next[uvl].uv, e_l[uvl].uv
                            if (a1 - a2).length < 1e-5 and (b1 - b2).length < 1e-5:
                                seen.add(nf.index)
                                stack.append(nf)
                loops_of.append([lp.index for fc in isl for lp in fc.loops])
            bm.free()
            for ls in loops_of:
                ls = np.array(ls)
                k = np.median(f[ls])
                c = uv[ls].mean(axis=0)
                uv[ls] = c + (uv[ls] - c) * k
        else:
            uv = uv * d
        put_uv(o, uv)
    multi_edit([ref] + eyes, lambda: bpy.ops.uv.pack_islands(rotate=True, scale=True, margin_method='FRACTION', margin=0.004,
                                                              shape_method='CONCAVE'))
    lay = {o.name.split('.')[0]: get_uv(o) for o in [ref] + eyes}
    for t, bid in enumerate(BODY_ORDER):
        tx, ty = t % SKIN_TILES, t // SKIN_TILES
        for part in ('body', 'eye_l', 'eye_r'):
            o = bpy.data.objects[f'{part}.{bid}']
            uv_fresh(o)
            uv = lay[part] * (0.985 / SKIN_TILES) + np.array([(tx + 0.0075) / SKIN_TILES, (ty + 0.0075) / SKIN_TILES])
            put_uv(o, uv)
            o.data.uv_layers.new(name='mh_uv')
            put_uv(o, MH[o.name], 'mh_uv')
            o.data.uv_layers.active = o.data.uv_layers['UVMap']
            o['skin_tile'] = t
    log('skin atlas: %d bodies in %d x %d tiles' % (len(BODY_ORDER), SKIN_TILES, SKIN_TILES))
