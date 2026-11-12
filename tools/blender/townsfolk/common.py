# BELFORT townsfolk kit - shared settings and helpers.
#
# The generic mesh helpers (cuts, inflation, rims, weight transfer, straps, lathes, noise, blur)
# come from make_rider.py so the two characters are built and painted the same way; this module
# adds what the kit needs on top: several bodies in one file, cuts that are decided on a
# reference body (so every fitted copy of a garment has the same topology), part materials for the
# kit, and the dye mask.

import bpy, bmesh, os, sys, math, json, random
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
REPO = os.path.abspath(os.path.join(TOOLS, '..', '..'))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import make_rider as R          # noqa: E402  (helpers only; its main() does not run on import)

CACHE = os.environ.get('TOWNSFOLK_CACHE', os.path.join(os.path.expanduser('~'), '.cache', 'belfort-townsfolk'))
WORK = os.environ.get('TOWNSFOLK_WORK', os.path.join(os.path.expanduser('~'), '.cache', 'belfort-townsfolk', 'work'))
PREVIEW = os.environ.get('TOWNSFOLK_PREVIEW', os.path.join(WORK, 'preview'))
RIDER_GLB = os.path.join(REPO, 'public', 'models', 'rider.glb')
# make_rider's helpers look for MPFB and the bake temp dir through its own globals
R.CACHE = CACHE

TEX = 2048            # garment atlas
SKIN_TEX = 2048       # body atlas (3 x 3 tiles, one per body)


def log(*a):
    print('[townsfolk]', *a, flush=True)


srgb = R.srgb
get_bm, put_bm, dup, inflate, smooth_boundary, rim = R.get_bm, R.put_bm, R.dup, R.inflate, R.smooth_boundary, R.rim
bvh_of, transfer_weights, rigid_weight, clean_weights = R.bvh_of, R.transfer_weights, R.rigid_weight, R.clean_weights
set_aux, ensure_aux, get_aux = R.set_aux, R.ensure_aux, R.get_aux
lathe_mesh, torus_mesh, rounded_box, place = R.lathe_mesh, R.torus_mesh, R.rounded_box, R.place
convex_ring, ring_frame, strap_mesh = R.convex_ring, R.ring_frame, R.strap_mesh
smoothstep, activate, tri_count, shade_smooth, link = R.smoothstep, R.activate, R.tri_count, R.shade_smooth, R.link
w_arm, ARM_BONES = R.w_arm, R.ARM_BONES

# --------------------------------------------------------------------------
# parts: what the paint stage keys on. id -> (preview colour, takes dye by default)
# --------------------------------------------------------------------------
PARTS = {
    'skin': (1, '#c2906f', 0), 'eye': (2, '#e8e2d8', 0), 'hair': (3, '#8a7a6a', 1),
    'wool': (4, '#c8c0b0', 1), 'wool2': (5, '#c0b8a8', 1), 'linen': (6, '#ece6da', 0), 'linen_d': (7, '#d8d0bc', 1),
    'felt': (8, '#b8b0a4', 1), 'leather': (9, '#6b4a2b', 0), 'buff': (10, '#b48a52', 0), 'shoe': (11, '#3f2a1c', 0),
    'wood': (12, '#8a6440', 0), 'brass': (13, '#b88f3c', 0), 'steel': (14, '#8c9096', 0), 'rope': (15, '#b09a6c', 0),
    'straw': (16, '#b8954f', 0), 'bread': (17, '#b8783c', 0), 'lining': (18, '#a09888', 1), 'sash': (19, '#d8d0c8', 1),
    'gourd': (20, '#9a6a34', 0), 'beads': (21, '#3a2a20', 0), 'glass': (22, '#e8d8a0', 0), 'iron': (23, '#3a3836', 0),
    'cloth_b': (24, '#d0c8b8', 1), 'lace': (25, '#f0ece2', 0), 'beard': (26, '#8a7a6a', 1),
}
for k, (i, c, _) in PARTS.items():         # make_rider's strap/lathe helpers create materials through its table
    R.PARTS[k] = (i, c)


def part_mat(part):
    return R.part_mat(part)


def set_part(obj, part):
    R.set_part(obj, part)


def add_part(obj, part):
    """Append a part material slot and return its index."""
    m = part_mat(part)
    for i, s in enumerate(obj.data.materials):
        if s == m:
            return i
    obj.data.materials.append(m)
    return len(obj.data.materials) - 1


def new_mesh_obj(name, verts, faces, part=None, smooth=True):
    return R.new_mesh_obj(name, verts, faces, part, smooth)


def to_coll(obj, cname):
    c = bpy.data.collections.get(cname)
    if c is None:
        c = bpy.data.collections.new(cname)
        bpy.context.scene.collection.children.link(c)
    for uc in list(obj.users_collection):
        uc.objects.unlink(obj)
    c.objects.link(obj)
    return obj


def co_array(obj):
    a = np.zeros(len(obj.data.vertices) * 3, dtype=np.float64)
    obj.data.vertices.foreach_get('co', a)
    return a.reshape(-1, 3)


def set_co(obj, arr):
    obj.data.vertices.foreach_set('co', np.asarray(arr, dtype=np.float32).ravel())
    obj.data.update()


def cut_by_ref(obj, ref_obj, fn):
    """Like make_rider.implicit_cut, but the inside/outside values come from ref_obj, a copy of the
    same mesh (same vertex order) on the reference body. Every body therefore gets exactly the same
    topology: the cut crosses the same edges at the same fractions, at the same anatomical places."""
    rbm = get_bm(ref_obj)
    dl = rbm.verts.layers.deform.verify()
    gidx = {g.name: g.index for g in ref_obj.vertex_groups}
    vals_ref = []
    for v in rbm.verts:
        d = v[dl]
        vals_ref.append(fn(v.co.copy(), lambda n, d=d: d.get(gidx[n], 0.0) if n in gidx else 0.0))
    rbm.free()
    bm = get_bm(obj)
    bm.verts.ensure_lookup_table()
    assert len(bm.verts) == len(vals_ref), 'cut_by_ref: topology mismatch'
    vals = {v: vals_ref[v.index] for v in bm.verts}
    crossing = [e for e in bm.edges if (vals[e.verts[0]] < 0) != (vals[e.verts[1]] < 0)]
    crossing.sort(key=lambda e: (min(e.verts[0].index, e.verts[1].index), max(e.verts[0].index, e.verts[1].index)))
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


def set_dye(obj, mask):
    """COLOR_0 for the game: R = 1 where the vertex takes the dye colour, 0 where the painted colour is kept.
    G, B are reserved (0); A = 1."""
    me = obj.data
    a = me.color_attributes.get('dye') or me.color_attributes.new('dye', 'FLOAT_COLOR', 'POINT')
    m = np.asarray(mask, dtype=np.float32).reshape(-1)
    flat = np.zeros((len(me.vertices), 4), dtype=np.float32)
    flat[:, 0] = m
    flat[:, 3] = 1.0
    a.data.foreach_set('color', flat.ravel())


def dye_from_parts(obj):
    """Default dye mask from the part materials: a vertex takes dye if any of its faces belongs to a dye part."""
    me = obj.data
    m = np.zeros(len(me.vertices), dtype=np.float32)
    for p in me.polygons:
        part = me.materials[p.material_index].name[2:]
        if PARTS.get(part, (0, '', 0))[2]:
            m[list(p.vertices)] = 1.0
    set_dye(obj, m)


def rig_landmarks(rig):
    return json.loads(rig.get('landmarks', '{}'))


def bone_head(rig, name):
    return rig.data.bones[name].head_local.copy()


def bone_tail(rig, name):
    return rig.data.bones[name].tail_local.copy()


def armature_to(obj, rig):
    for m in list(obj.modifiers):
        if m.type == 'ARMATURE':
            obj.modifiers.remove(m)
    m = obj.modifiers.new('rig', 'ARMATURE')
    m.object = rig
    obj.parent = rig
    obj.matrix_parent_inverse = Matrix.Identity(4)


def save_blend(name):
    os.makedirs(WORK, exist_ok=True)
    p = os.path.join(WORK, f'stage_{name}.blend')
    bpy.ops.wm.save_as_mainfile(filepath=p, check_existing=False, compress=False)
    log('saved stage', name, p)


def load_blend(name):
    bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, f'stage_{name}.blend'))
    log('loaded stage', name)
