# BELFORT townsfolk kit - stage 'game': game-resolution meshes that keep one topology per piece.
#
#  1. Body regions (_REGION): every body vertex gets an anatomical region code (same vertices on every body);
#     hair vertices get hair_crown / hair_low.
#  2. Hides: for every piece, the regions its reference fit covers completely (ray test, as the phase A
#     delete-mask) become its `hides` list in the manifest.
#  3. Body parts that every outfit covers (chest, belly, hips, thighs) are deleted outright.
#  4. Decimation is done ONCE per piece, on its reference fit. Every kept vertex is then re-expressed as a
#     barycentric point (+ normal offset) on the full-resolution reference triangle it came from, and evaluated
#     on each body's full-resolution copy (all copies share that topology). Skin weights are interpolated from
#     each body's own full copy. Result: every copy of a piece has the same decimated topology and UVs.

import bpy, bmesh, math, json
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from .common import log, get_bm, put_bm, activate, tri_count, rig_landmarks, clean_weights
from .bodies import BODY_ORDER

REGIONS = {'face': 1, 'ears': 2, 'scalp': 3, 'neck': 4, 'chest_upper': 5, 'chest': 6, 'belly': 7, 'hips': 8,
           'upperarm': 9, 'forearm_up': 10, 'forearm_low': 11, 'hand': 12, 'thigh': 13, 'knee': 14, 'shin': 15,
           'foot': 16, 'hair_crown': 20, 'hair_low': 21}
# relative decimation weight of the body by region (lower = kept denser); the modifier is very sensitive
DEC_WEIGHT = None              # uniform: the modifier's vertex-group weighting behaves like a cliff
ALWAYS_HIDDEN = ('chest', 'belly', 'hips', 'thigh', 'foot')   # every outfit in the kit covers these: deleted
NEVER_HIDE = {'face', 'neck'}
# what the ray test cannot see on its own (pieces that cover a region together with another one)
EXTRA_HIDES = {'stockings': ['shin'], 'hair_crop': ['scalp'], 'hair_long': ['scalp'], 'hair_child': ['scalp'],
               'hair_bun': ['scalp'], 'coif': ['scalp']}                            # left to the garment's own edge (no holes at necklines)

# triangle budgets at game resolution
TARGET = {'body': 3800, 'stockings': 260, 'breeches': 650, 'shoes': 420, 'clogs': 380, 'boots': 600, 'doublet': 1050,
          'smock': 1000, 'bodice': 900, 'skirt': 860, 'coif': 330, 'hat_wide': 420, 'hat_pilgrim': 420,
          'cap_flat': 330, 'morion': 460, 'habit': 1100, 'collar_band': 260, 'kerchief': 360, 'apron': 420,
          'belt': 160, 'rope_belt': 380, 'capuche': 520, 'pelerine': 480, 'buff_coat': 760, 'beguine_veil': 800,
          'huik': 980, 'sash': 260, 'hair_crop': 560, 'hair_long': 700, 'hair_thin': 360, 'hair_child': 560,
          'hair_bun': 380, 'beard_pointed': 160, 'moustache': 100, 'beard_full': 260}
PROP_TARGET = {'basket': 500, 'staff': 260, 'stick': 160, 'bread': 220, 'lantern': 240, 'rosary': 420, 'bundle': 240}
# phase-A ray distances per piece (metres) used to decide what a piece covers
HIDE_DIST = {'skirt': 0.40, 'habit': 0.40, 'huik': 0.06, 'smock': 0.16, 'buff_coat': 0.12, 'breeches': 0.10,
             'coif': 0.05, 'beguine_veil': 0.06, 'kerchief': 0.05, 'collar_band': 0.02, 'capuche': 0.05,
             'pelerine': 0.05, 'boots': 0.05, 'shoes': 0.05, 'clogs': 0.06, 'stockings': 0.03, 'apron': 0.0}
NO_HIDE_PIECES = {'hat_wide', 'hat_pilgrim', 'cap_flat', 'morion', 'beard_pointed', 'moustache', 'beard_full',
                  'belt', 'rope_belt', 'sash', 'apron', 'hair_crop', 'hair_long', 'hair_thin', 'hair_child', 'hair_bun'}


def lm_of(bid):
    rig = bpy.data.objects[f'rig.{bid}']
    raw = rig_landmarks(rig)
    return {k: (Vector(v) if isinstance(v, list) and len(v) == 3 else v) for k, v in raw.items()}


def body_regions(body, lm):
    """Region code per vertex of a full-resolution body."""
    me = body.data
    names = {g.index: g.name for g in body.vertex_groups}
    aux = np.zeros(len(me.vertices) * 4, dtype=np.float32)
    me.color_attributes['aux'].data.foreach_get('color', aux)
    scalp = aux.reshape(-1, 4)[:, 1] > 0.5
    k = lm['top'] / 1.70
    neck = lm['neck_01']
    eye = lm['eye']
    el, wr = lm['lowerarm_l'], lm['hand_l']
    fore = (wr - el)
    knee = lm['calf_l']
    out = np.zeros(len(me.vertices), dtype=np.int32)
    for v in me.vertices:
        best, bw = None, -1
        for g in v.groups:
            if g.weight > bw:
                best, bw = names[g.group], g.weight
        b = (best or 'pelvis').rsplit('_', 1)[0] if best and best.endswith(('_l', '_r')) else (best or 'pelvis')
        co = v.co
        if b == 'head':
            if scalp[v.index]:
                r = 'scalp'
            elif abs(co.x) > 0.062 * k and co.y > eye.y + 0.055 * k and abs(co.z - eye.z + 0.01) < 0.045 * k:
                r = 'ears'
            else:
                r = 'face'
        elif b == 'neck_01':
            r = 'neck'
        elif b in ('spine_03', 'clavicle'):
            r = 'chest_upper' if co.z > neck.z - 0.15 * k else 'chest'
        elif b in ('spine_02', 'spine_01'):
            r = 'chest_upper' if co.z > neck.z - 0.15 * k else 'belly'
        elif b in ('pelvis', 'Root'):
            r = 'hips'
        elif b == 'upperarm':
            r = 'upperarm'
        elif b == 'lowerarm':
            p = Vector((abs(co.x), co.y, co.z))
            t = (p - el).dot(fore) / fore.length_squared
            r = 'forearm_up' if t < 0.5 else 'forearm_low'
        elif b in ('hand',) or b.startswith(('thumb', 'index', 'middle', 'ring', 'pinky')):
            r = 'hand'
        elif b == 'thigh':
            r = 'thigh'
        elif b == 'calf':
            r = 'knee' if co.z > knee.z - 0.12 * k else 'shin'
        elif b in ('foot', 'ball'):
            r = 'foot'
        else:
            r = 'belly'
        out[v.index] = REGIONS[r]
    return out


def set_region(obj, codes):
    me = obj.data
    a = me.attributes.get('_REGION') or me.attributes.new('_REGION', 'FLOAT', 'POINT')
    a.data.foreach_set('value', np.asarray(codes, dtype=np.float32))


def get_region(obj):
    a = obj.data.attributes['_REGION']
    v = np.zeros(len(obj.data.vertices), dtype=np.float32)
    a.data.foreach_get('value', v)
    return np.rint(v).astype(np.int32)


def piece_hides(piece_obj, body, codes, lm):
    """Regions this piece covers completely on its reference body."""
    g = piece_obj.get('garment')
    if g in NO_HIDE_PIECES:
        return []
    d = HIDE_DIST.get(g, 0.08)
    if d <= 0:
        return []
    me = piece_obj.data
    tree = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [list(p.vertices) for p in me.polygons])
    waist, neck = lm['waist_z'], lm['neck_01'].z
    tot = np.zeros(32)
    hid = np.zeros(32)
    bm = get_bm(body)
    bm.normal_update()
    for f in bm.faces:
        c = f.calc_center_median()
        n = f.normal
        rr = np.bincount([codes[v.index] for v in f.verts], minlength=32).argmax()
        tot[rr] += 1
        dd = d
        if c.z > waist:
            dd = min(d, 0.06)
        if c.z > neck - 0.10 and c.z < neck + 0.02:
            dd = min(d, 0.018)
        if tree.ray_cast(c + n * 0.001, n, dd)[0] is not None:
            hid[rr] += 1
    bm.free()
    inv = {v: k for k, v in REGIONS.items()}
    out = []
    for code in range(32):
        if tot[code] >= 8 and hid[code] / tot[code] >= 0.9 and code in inv and inv[code] not in NEVER_HIDE:
            out.append(inv[code])
    return out


def hair_regions(obj, bid):
    rig = bpy.data.objects[f'rig.{bid}']
    from .garments import Ctx, head_centre
    hc = head_centre(Ctx(bid))
    k = rig_landmarks(rig)['top'] / 1.70
    co = np.zeros(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    crown = co[:, 2] > hc.z + 0.012 * k
    return np.where(crown, REGIONS['hair_crown'], REGIONS['hair_low'])


# --------------------------------------------------------------------------
def delete_verts(obj, mask):
    bm = get_bm(obj)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in np.nonzero(mask)[0]], context='VERTS')
    put_bm(bm, obj)


def decimated_copy(obj, target):
    c = obj.copy()
    c.data = obj.data.copy()
    bpy.context.scene.collection.objects.link(c)
    c.parent = None
    for m in list(c.modifiers):
        c.modifiers.remove(m)
    n = tri_count(c)
    if n > target:
        m = c.modifiers.new('dec', 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = target / n
        m.use_collapse_triangulate = False
        if 'dec_weight' in c.vertex_groups:
            m.vertex_group = 'dec_weight'
            m.vertex_group_factor = 1.0
        activate(c)
        bpy.ops.object.modifier_apply(modifier=m.name)
    return c


def tri_table(obj):
    me = obj.data
    me.calc_loop_triangles()
    tris = np.array([t.vertices[:] for t in me.loop_triangles], dtype=np.int64)
    co = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    return tris, co.reshape(-1, 3)


def bind(dec, ref):
    """For each vertex of the decimated mesh: (triangle of ref, barycentric w, normal offset)."""
    tris, rco = tri_table(ref)
    tree = BVHTree.FromPolygons([Vector(p) for p in rco], tris.tolist())
    out = []
    for v in dec.data.vertices:
        loc, nrm, ti, _ = tree.find_nearest(v.co)
        a, b, c = (Vector(rco[i]) for i in tris[ti])
        w = barycentric(loc, a, b, c)
        s = (v.co - loc).dot(nrm)
        out.append((ti, w, s))
    return out, tris


def barycentric(p, a, b, c):
    v0, v1, v2 = b - a, c - a, p - a
    d00, d01, d11 = v0.dot(v0), v0.dot(v1), v1.dot(v1)
    d20, d21 = v2.dot(v0), v2.dot(v1)
    den = d00 * d11 - d01 * d01
    if abs(den) < 1e-14:
        return (1.0, 0.0, 0.0)
    vv = (d11 * d20 - d01 * d21) / den
    ww = (d00 * d21 - d01 * d20) / den
    return (1.0 - vv - ww, vv, ww)


def reexpress(dec, binding, tris, full, bones):
    """New mesh data for `full`'s body: dec's topology, positions/weights evaluated on `full`."""
    me = dec.data.copy()
    co = np.zeros(len(full.data.vertices) * 3)
    full.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    names = {g.index: g.name for g in full.vertex_groups}
    wts = [{names[g.group]: g.weight for g in v.groups if names[g.group] in bones} for v in full.data.vertices]
    new_co = np.zeros((len(me.vertices), 3))
    new_w = []
    for i, (ti, w, s) in enumerate(binding):
        ia, ib, ic = tris[ti]
        a, b, c = co[ia], co[ib], co[ic]
        n = np.cross(b - a, c - a)
        ln = np.linalg.norm(n)
        n = n / ln if ln > 1e-12 else np.array([0.0, 0.0, 1.0])
        new_co[i] = a * w[0] + b * w[1] + c * w[2] + n * s
        acc = {}
        for idx, ww in zip((ia, ib, ic), w):
            for nm, x in wts[idx].items():
                acc[nm] = acc.get(nm, 0.0) + x * ww
        new_w.append(acc)
    me.vertices.foreach_set('co', new_co.astype(np.float32).ravel())
    me.update()
    return me, new_w


def apply_weights(obj, weights, bones):
    for g in list(obj.vertex_groups):
        obj.vertex_groups.remove(g)
    groups = {}
    for i, ws in enumerate(weights):
        top = sorted(ws.items(), key=lambda kv: -kv[1])[:4]
        tot = sum(x for _, x in top if x > 1e-4) or 1.0
        for nm, x in top:
            if x <= 1e-4:
                continue
            g = groups.get(nm) or obj.vertex_groups.new(name=nm)
            groups[nm] = g
            g.add([i], x / tot, 'REPLACE')


def stage_game():
    meta = json.loads(bpy.context.scene['garments'])
    lms = {b: lm_of(b) for b in BODY_ORDER}
    # ---- regions on the full bodies (same codes for every body: computed on the reference)
    ref_body = bpy.data.objects['body.man']
    codes = body_regions(ref_body, lms['man'])
    # ---- hides per piece (on its reference fit, full resolution)
    hides = {}
    for g, m in meta.items():
        if not m['bodies']:
            continue
        b = m['ref'] if m['ref'] in m['bodies'] else m['bodies'][0]
        o = bpy.data.objects[f'{g}.{b}']
        bcodes = codes                                # identical vertex order on every body
        hides[g] = piece_hides(o, bpy.data.objects[f'body.{b}'], bcodes, lms[b])
        hides[g] += [r for r in EXTRA_HIDES.get(g, []) if r not in hides[g]]
        log('hides %-13s %s' % (g, hides[g]))
    bpy.context.scene['hides'] = json.dumps(hides)
    # ---- bodies: delete what is always covered, decimate once (face and hands kept denser), re-express
    kill = np.isin(codes, [REGIONS[r] for r in ALWAYS_HIDDEN])
    for bid in BODY_ORDER:
        o = bpy.data.objects[f'body.{bid}']
        set_region(o, codes)
        delete_verts(o, kill)
    ref_body = bpy.data.objects['body.man']
    rc = get_region(ref_body)
    if DEC_WEIGHT:
        g = ref_body.vertex_groups.new(name='dec_weight')
        for i, c in enumerate(rc):
            g.add([i], DEC_WEIGHT.get(c, 1.0), 'REPLACE')
    full_tris = tri_count(ref_body)
    dec = decimated_copy(ref_body, TARGET['body'])
    if 'dec_weight' in ref_body.vertex_groups:
        ref_body.vertex_groups.remove(ref_body.vertex_groups['dec_weight'])
    if 'dec_weight' in dec.vertex_groups:
        dec.vertex_groups.remove(dec.vertex_groups['dec_weight'])
    binding, tris = bind(dec, ref_body)
    dreg = np.array([rc[tris[ti][int(np.argmax(w))]] for ti, w, _ in binding])
    for bid in BODY_ORDER:
        o = bpy.data.objects[f'body.{bid}']
        bones = {b.name for b in o.parent.data.bones}
        me, wts = reexpress(dec, binding, tris, o, bones)
        old = o.data
        o.data = me
        me.name = o.name
        bpy.data.meshes.remove(old)
        apply_weights(o, wts, bones)
        set_region(o, dreg)
    log('bodies: %d -> %d triangles (after removing the always-covered torso and thighs)' % (full_tris, tri_count(dec)))
    bpy.data.objects.remove(dec)
    # ---- pieces
    for gname, m in meta.items():
        if not m['bodies']:
            continue
        b0 = m['ref'] if m['ref'] in m['bodies'] else m['bodies'][0]
        ref = bpy.data.objects[f'{gname}.{b0}']
        n0 = tri_count(ref)
        dec = decimated_copy(ref, TARGET.get(gname, 600))
        binding, tris = bind(dec, ref)
        for bid in m['bodies']:
            o = bpy.data.objects[f'{gname}.{bid}']
            bones = {b.name for b in o.parent.data.bones}
            me, wts = reexpress(dec, binding, tris, o, bones)
            old = o.data
            o.data = me
            me.name = o.name
            bpy.data.meshes.remove(old)
            apply_weights(o, wts, bones)
            if m['slot'] == 'hair':
                set_region(o, hair_regions(o, bid))
        log('piece %-13s %5d -> %4d triangles on %d bodies' % (gname, n0, tri_count(dec), len(m['bodies'])))
        bpy.data.objects.remove(dec)
    # ---- props (one mesh each)
    for o in [o for o in bpy.data.objects if o.get('prop')]:
        n0 = tri_count(o)
        d = decimated_copy(o, PROP_TARGET.get(o['prop'], 300))
        old = o.data
        o.data = d.data
        o.data.name = o.name
        bpy.data.objects.remove(d)
        bpy.data.meshes.remove(old)
        log('prop %-8s %4d -> %4d triangles' % (o['prop'], n0, tri_count(o)))
