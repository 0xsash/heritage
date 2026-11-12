# BELFORT townsfolk kit - stage 2: garments, headwear, hair and props, fitted to every body they are meant for.
#
# How fitting works: every garment is built by a function that is run once per body. Shell garments are cut
# from that body's MakeHuman clothing-helper shells (tights / skirt), which have the same topology on every
# body; the cut itself is decided on a fixed reference body (cut_by_ref), so a garment has exactly the same
# vertices, faces and UVs on every body it fits - only the positions differ. Parametric pieces (collars, hats,
# mantles, belts) use a fixed resolution and are placed from the body's own landmarks and surface. Skin weights
# come from the helpers (MakeHuman's tights / skirt weights), the cloak chain, or a single bone for rigid pieces.

import bpy, bmesh, math, json
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from .common import (log, get_bm, put_bm, dup, inflate, smooth_boundary, rim, bvh_of, transfer_weights, rigid_weight,
                     clean_weights, set_aux, ensure_aux, lathe_mesh, torus_mesh, rounded_box, place, convex_ring,
                     ring_frame, strap_mesh, smoothstep, activate, tri_count, shade_smooth, w_arm, new_mesh_obj, set_part,
                     add_part, part_mat, cut_by_ref, dye_from_parts, set_dye, to_coll, armature_to, co_array, set_co,
                     rig_landmarks, PARTS)
from .bodies import BODIES, BODY_ORDER

MEN = ['man', 'man_young', 'man_stout', 'man_old']
WOMEN = ['woman', 'woman_stout', 'woman_old']
ADULTS = MEN + WOMEN
KIDS = ['girl', 'boy']
ALL = ADULTS + KIDS
FRONT = Vector((0, -1, 0))
UP = Vector((0, 0, 1))


class Ctx:
    """Everything a garment builder needs to know about one body."""

    def __init__(self, bid):
        self.bid = bid
        self.rig = bpy.data.objects[f'rig.{bid}']
        self.body = bpy.data.objects[f'body.{bid}']
        self.T = bpy.data.objects[f'h_tights.{bid}']
        self.S = bpy.data.objects[f'h_skirt.{bid}']
        self.spec = BODIES[bid]
        raw = rig_landmarks(self.rig)
        self.lm = {k: (Vector(v) if isinstance(v, list) and len(v) == 3 else v) for k, v in raw.items()}
        L = self.lm
        self.neck, self.headb = L['neck_01'], L['head']
        self.sh, self.el, self.wr = L['upperarm_l'], L['lowerarm_l'], L['hand_l']
        self.hip, self.knee, self.ank, self.ball = L['thigh_l'], L['calf_l'], L['foot_l'], L['ball_l']
        self.waist_z = L['waist_z']
        self.top = L['top']
        self.k = self.top / 1.70                       # size relative to the average man
        self.kid = self.spec['age_group'] == 'child'
        self.bones = {b.name for b in self.rig.data.bones}
        self.fore = (self.wr - self.el).normalized()
        self.fore_len = (self.wr - self.el).length
        self.hmin, self.hmax = L['head_min'], L['head_max']
        self._bvh = {}

    def bvh(self, key, objs):
        if key not in self._bvh:
            self._bvh[key] = bvh_of(objs)
        return self._bvh[key]

    def along_fore(self, co):
        """metres from the wrist towards the elbow (either arm)"""
        p = Vector((abs(co.x), co.y, co.z))
        return -(p - self.wr).dot(self.fore)

    def collar_z(self, co):
        return self.neck.z - 0.012 * self.k + 0.5 * (co.y - self.neck.y)

    def head_c(self):
        return (self.hmin + self.hmax) / 2


G = {}           # garment name -> spec


def garment(name, slot, bodies, ref, desc='', layer=0):
    def deco(fn):
        G[name] = dict(fn=fn, slot=slot, bodies=list(bodies), ref=ref, desc=desc, layer=layer)
        return fn
    return deco


# --------------------------------------------------------------------------
# small geometry helpers
# --------------------------------------------------------------------------
def inflate_n(obj, fn, smooth_iter=0, smooth_fac=0.5):
    """Move every vertex along its normal by fn(co, normal)."""
    bm = get_bm(obj)
    bm.normal_update()
    moves = [(v, fn(v.co.copy(), v.normal.copy())) for v in bm.verts]
    for v, d in moves:
        v.co += v.normal * d
    for _ in range(smooth_iter):
        inner = [v for v in bm.verts if not v.is_boundary]
        bmesh.ops.smooth_vert(bm, verts=inner, factor=smooth_fac, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    put_bm(bm, obj)


def subdivide(obj, cuts=1):
    bm = get_bm(obj)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True, smooth=0.0)
    put_bm(bm, obj)


def relax(obj, iters=2, fac=0.5, boundary=False):
    bm = get_bm(obj)
    vs = [v for v in bm.verts if boundary or not v.is_boundary]
    for _ in range(iters):
        bmesh.ops.smooth_vert(bm, verts=vs, factor=fac, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    put_bm(bm, obj)


def solidify(obj, thick, offset=-1.0, rim_mat=None):
    m = obj.modifiers.new('sol', 'SOLIDIFY')
    m.thickness = thick
    m.offset = offset
    m.use_rim = True
    m.use_even_offset = False
    if rim_mat is not None:
        m.material_offset_rim = rim_mat
    activate(obj)
    while obj.modifiers[0].name != m.name:
        bpy.ops.object.modifier_move_up(modifier=m.name)
    bpy.ops.object.modifier_apply(modifier=m.name)


def fix_normals_out(obj, centre_fn=None):
    """Recalculate normals to point away from the body (for open surfaces where 'outside' is ambiguous)."""
    bm = get_bm(obj)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    if centre_fn is not None:
        score = sum(f.normal.dot(f.calc_center_median() - centre_fn(f.calc_center_median())) for f in bm.faces)
        if score < 0:
            bmesh.ops.reverse_faces(bm, faces=bm.faces)
    put_bm(bm, obj)


def axis_centre(ctx):
    """Point on the body's vertical axis at a given height (for outward tests)."""
    def f(p):
        return Vector((0.0, ctx.hip.y, p.z))
    return f



def ring_out(bvh, c, n, count, front=FRONT, start=0.0, fallback=0.05):
    """Points where rays cast outwards from c (in the plane through c with normal n) leave the surface,
    at evenly spaced angles starting at the front and turning towards the character's left. Works from
    inside a limb, so neighbouring limbs never get in the way."""
    n = n.normalized()
    e1 = (front - n * n.dot(front)).normalized()
    e2 = n.cross(e1)
    if e2.x < 0:
        e2 = -e2
    pts = []
    for i in range(count):
        a = start + 2 * math.pi * i / count
        d = e1 * math.cos(a) + e2 * math.sin(a)
        loc, _, _, _ = bvh.ray_cast(c, d, 1.0)
        pts.append(loc if loc is not None else c + d * fallback)
    return pts


def bvh_sub(objs, pred):
    """BVH of the faces whose centre satisfies pred(co) (world space)."""
    verts, polys = [], []
    for o in objs:
        mw = o.matrix_world
        base = len(verts)
        verts += [mw @ v.co for v in o.data.vertices]
        for p in o.data.polygons:
            if pred(mw @ p.center):
                polys.append([base + i for i in p.vertices])
    return BVHTree.FromPolygons(verts, polys)


def grid_faces(rows, cols, closed=False):
    faces = []
    cc = cols if closed else cols - 1
    for j in range(rows - 1):
        for i in range(cc):
            a, b = j * cols + i, j * cols + (i + 1) % cols
            faces.append((a, b, b + cols, a + cols))
    return faces


def snap_out(points, bvh, gap):
    """Push points that are inside / too close to the surface out along the surface normal."""
    out = []
    for p in points:
        loc, n, _, d = bvh.find_nearest(p)
        if loc is None:
            out.append(p)
            continue
        side = (p - loc).dot(n)
        if side < gap:
            p = loc + n * gap
        out.append(p)
    return out


def finish(obj, ctx, weights='T', extra=()):
    """Weights, cleanup, armature."""
    bones = ctx.bones
    if weights == 'T':
        transfer_weights(obj, ctx.T, bones)
    elif weights == 'S':
        transfer_weights(obj, ctx.S, bones)
    elif weights == 'body':
        transfer_weights(obj, ctx.body, bones)
    elif isinstance(weights, str) and weights in bones:
        rigid_weight(obj, weights)
    clean_weights(obj, bones)
    ensure_aux(obj)
    shade_smooth(obj)
    return obj


def join(objs, name):
    objs = [o for o in objs if o is not None]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    o.data.name = name
    return o


def blend_weights(obj, fn):
    """Replace weights with fn(co) -> {bone: w}."""
    for g in list(obj.vertex_groups):
        obj.vertex_groups.remove(g)
    groups = {}
    for v in obj.data.vertices:
        ws = fn(v.co)
        tot = sum(ws.values())
        for nm, w in ws.items():
            if w <= 1e-4:
                continue
            g = groups.get(nm) or obj.vertex_groups.new(name=nm)
            groups[nm] = g
            g.add([v.index], w / tot, 'REPLACE')


def mix_weights(obj, fn_alpha, fn_ws):
    """Blend the existing weights towards fn_ws(co) by fn_alpha(co) in 0..1."""
    names = {g.index: g.name for g in obj.vertex_groups}
    new = []
    for v in obj.data.vertices:
        a = fn_alpha(v.co)
        cur = {names[g.group]: g.weight for g in v.groups}
        if a <= 0:
            new.append(cur)
            continue
        tgt = fn_ws(v.co)
        keys = set(cur) | set(tgt)
        new.append({k: cur.get(k, 0.0) * (1 - a) + tgt.get(k, 0.0) * a for k in keys})
    for g in list(obj.vertex_groups):
        obj.vertex_groups.remove(g)
    groups = {}
    for v, ws in zip(obj.data.vertices, new):
        tot = sum(ws.values()) or 1.0
        for nm, w in ws.items():
            if w <= 1e-4:
                continue
            g = groups.get(nm) or obj.vertex_groups.new(name=nm)
            groups[nm] = g
            g.add([v.index], w / tot, 'REPLACE')


def skirt_weights(ctx, z_top, z_hem, follow=0.9, calf=0.0):
    """Long skirts: pelvis at the waist handing over to the thighs towards the hem, left/right blended
    across the front and back centre so the cloth stretches between the legs instead of tearing."""
    hw = 0.07 * ctx.k

    def fn(co):
        t = smoothstep(z_top, ctx.knee.z, co.z)
        lat = smoothstep(-hw, hw, co.x)
        th = follow * t
        ws = {'pelvis': 1.0 - th, 'thigh_l': th * lat * (1 - calf), 'thigh_r': th * (1 - lat) * (1 - calf)}
        if calf > 0:
            kc = calf * smoothstep(ctx.knee.z, z_hem, co.z) * follow
            ws['thigh_l'] = th * lat * (1 - kc)
            ws['thigh_r'] = th * (1 - lat) * (1 - kc)
            ws['calf_l'] = th * lat * kc
            ws['calf_r'] = th * (1 - lat) * kc
        return ws
    return fn


def outward_from_legs(ctx, co):
    """Horizontal outward direction from the centre between the legs (for flaring skirts)."""
    d = Vector((co.x, co.y - ctx.hip.y * 0.5, 0.0))
    return d.normalized() if d.length > 1e-6 else Vector((0, -1, 0))


# --------------------------------------------------------------------------
# LEGS AND FEET
# --------------------------------------------------------------------------
def leg_side_inner(co, n):
    """1 on the inner faces of the thighs (normal pointing to the midline), 0 outside."""
    return max(0.0, -math.copysign(1.0, co.x) * n.x)


@garment('stockings', 'legs_under', MEN + KIDS, 'man', 'knitted wool stockings, knee to ankle')
def g_stockings(ctx, ref):
    o = dup(ctx.T, 'stockings')
    rk, ra = ref.knee, ref.ank
    cut_by_ref(o, ref.T, lambda co, w: max(co.z - (rk.z + 0.07), (ra.z + 0.035) - co.z, w_arm(w) - 0.3))
    inflate(o, 0.0025 * ctx.k)
    set_part(o, 'wool2')
    return finish(o, ctx)


@garment('breeches', 'legs', MEN + ['boy'], 'man', 'loose knee breeches gathered below the knee')
def g_breeches(ctx, ref):
    o = dup(ctx.T, 'breeches')
    rw, rk = ref.waist_z, ref.knee
    cut_by_ref(o, ref.T, lambda co, w: max(co.z - (rw - 0.025), (rk.z - 0.055) - co.z, w_arm(w) - 0.3))
    subdivide(o, 1)
    k = ctx.k
    hz, kz = ctx.hip.z, ctx.knee.z

    def puff(co, n):
        t = (co.z - kz) / max(hz - kz, 1e-3)                 # 0 knee .. 1 hip
        full = math.sin(math.pi * min(max(t * 0.95 + 0.08, 0), 1)) ** 0.8
        gather = smoothstep(kz - 0.05, kz + 0.02, co.z)       # cuff hugs the leg
        waist = 1.0 - 0.6 * smoothstep(hz + 0.02, ctx.waist_z, co.z)
        inner = 1.0 - 0.75 * leg_side_inner(co, n) * smoothstep(kz, hz - 0.05, co.z)
        return k * (0.006 + 0.032 * full * gather * waist * inner)
    inflate_n(o, puff, smooth_iter=3, smooth_fac=0.5)
    # a few soft vertical folds
    bm = get_bm(o)
    bm.normal_update()
    for v in bm.verts:
        a = math.atan2(v.co.x - math.copysign(ctx.hip.x, v.co.x), -(v.co.y - ctx.hip.y))
        t = smoothstep(kz, hz, v.co.z) * smoothstep(kz - 0.04, kz + 0.06, v.co.z)
        v.co += v.normal * (0.004 * k * math.sin(a * 5 + v.co.z * 9) * t)
    put_bm(bm, o)
    rim(o, 0.006 * k)
    set_part(o, 'wool')
    o = finish(o, ctx)
    set_aux(o, [((v.co.z - kz) / (hz - kz), 0, 0) for v in o.data.vertices])
    return o


def foot_shell(ctx, ref, name, top_above_ankle, puff):
    o = dup(ctx.T, name)
    ra = ref.ank
    cut_by_ref(o, ref.T, lambda co, w: max(co.z - (ra.z + top_above_ankle), -(w('foot_l') + w('foot_r') + w('ball_l') + w('ball_r') + w('calf_l') + w('calf_r')) + 0.5))
    subdivide(o, 1)
    inflate(o, puff * ctx.k, smooth_iter=2)
    return o


def flatten_sole(o, ctx, sole_z=0.0, band=0.02):
    bm = get_bm(o)
    for v in bm.verts:
        if v.co.z < sole_z + band * ctx.k:
            t = smoothstep(sole_z + band * ctx.k, sole_z - 0.004, v.co.z)
            v.co.z = v.co.z * (1 - t) + sole_z * t
    put_bm(bm, o)


@garment('shoes', 'feet', ALL, 'man', 'low leather shoes with a tongue and a ribbon tie')
def g_shoes(ctx, ref):
    o = foot_shell(ctx, ref, 'shoes', 0.035, 0.007)
    flatten_sole(o, ctx, -0.002)
    rim(o, 0.006 * ctx.k)
    set_part(o, 'shoe')
    o = finish(o, ctx)
    set_aux(o, [((v.co.z) / (ctx.ank.z + 0.04), 0, 0) for v in o.data.vertices])
    return o


@garment('clogs', 'feet', ALL, 'man', 'wooden clogs (klompen)')
def g_clogs(ctx, ref):
    o = foot_shell(ctx, ref, 'clogs', 0.0, 0.010)
    bm = get_bm(o)
    k = ctx.k
    for v in bm.verts:
        sx = math.copysign(1, v.co.x)
        ball = Vector((ctx.ball.x * sx, ctx.ball.y, ctx.ball.z))
        fwd = -(v.co.y - ball.y)                             # metres in front of the ball joint
        if fwd > -0.02 * k:
            t = smoothstep(-0.02 * k, 0.07 * k, fwd)
            v.co.y -= 0.035 * k * t                          # longer toe
            v.co.z += 0.022 * k * t * t                      # turned up
            v.co.x = ball.x + (v.co.x - ball.x) * (1 - 0.35 * t)     # pointed
        # blockier body: push the sides out a little
        v.co.x = (v.co.x - ctx.ank.x * sx) * 1.08 + ctx.ank.x * sx
    put_bm(bm, o)
    flatten_sole(o, ctx, -0.002, 0.03)
    rim(o, 0.010 * k)
    set_part(o, 'wood')
    return finish(o, ctx)


@garment('boots', 'feet', MEN, 'man', 'tall soldier\'s boots with a turned-down cuff')
def g_boots(ctx, ref):
    o = dup(ctx.T, 'boots')
    rk = ref.knee
    cut_by_ref(o, ref.T, lambda co, w: max(co.z - (rk.z - 0.03), w_arm(w) - 0.3))
    subdivide(o, 1)
    kz = ctx.knee.z
    inflate_n(o, lambda co, n: ctx.k * (0.010 + 0.012 * smoothstep(kz - 0.22, kz - 0.05, co.z)), smooth_iter=2)
    flatten_sole(o, ctx, -0.002)
    rim(o, 0.006 * ctx.k)
    set_part(o, 'leather')
    boots = finish(o, ctx)
    # the cuff: a wide funnel turned down over the boot top
    cuffs = []
    for sd, sx in (('l', 1), ('r', -1)):
        c = Vector((ctx.knee.x * sx, ctx.knee.y, kz - 0.07 * ctx.k))
        bvh = ctx.bvh('boots', [boots])
        pts = ring_out(bvh, c, UP, 24)
        rows = 4
        verts = []
        for j in range(rows):
            t = j / (rows - 1)
            for p in pts:
                d = Vector((p.x - c.x, p.y - c.y, 0))
                verts.append(c + d * (1.06 + 0.32 * t) + Vector((0, 0, (0.01 - 0.09 * t) * ctx.k)))
        cf = new_mesh_obj(f'cuff_{sd}', verts, grid_faces(rows, 24, True), 'leather')
        fix_normals_out(cf, lambda p, c=c: Vector((c.x, c.y, p.z)))
        solidify(cf, 0.005 * ctx.k)
        cuffs.append(finish(cf, ctx))
    return join([boots] + cuffs, 'boots')


# --------------------------------------------------------------------------
# TORSO
# --------------------------------------------------------------------------
def torso_cut(ref, neck_drop=0.0, bottom=None, sleeve_to=0.0, open_front=0.0, square_neck=None):
    """Cut function for a fitted top from the tights helper: neckline, hem height, sleeve length
    (sleeve_to = metres above the wrist where the sleeve ends; None = sleeveless)."""
    bz = ref.waist_z - 0.08 if bottom is None else bottom

    def f(co, w):
        arm = w_arm(w)
        if sleeve_to is None:
            v = arm - 0.5
        else:
            v = -1.0
            if arm > 0.5:
                v = sleeve_to - ref.along_fore(co)
        top = co.z - (ref.collar_z(co) - neck_drop)
        if square_neck is not None and co.y < ref.neck.y:
            hw, depth = square_neck
            if abs(co.x) < hw:
                top = max(top, co.z - (ref.neck.z - depth))
        if open_front > 0 and co.y < 0:
            top = max(top, open_front - abs(co.x))
        return max(v, top, bz - co.z)
    return f


def cuff_ring(ctx, name, along, width, gap, part, bvh_objs, count=16, flare=0.0):
    """A band around both forearms at 'along' metres above the wrist."""
    out = []
    bvh = bvh_of(bvh_objs)
    for sd, sx in (('l', 1), ('r', -1)):
        f = Vector((ctx.fore.x * sx, ctx.fore.y, ctx.fore.z))
        w0 = Vector((ctx.wr.x * sx, ctx.wr.y, ctx.wr.z))
        verts = []
        rows = 3
        for j in range(rows):
            t = j / (rows - 1)
            c = w0 - f * (along + width * (0.5 - t))
            pts = ring_out(bvh, c, f, count, front=Vector((0, -0.7, 0.7)))
            for p in pts:
                d = p - c
                verts.append(c + d * (1.0 + (gap + flare * (1 - t)) / max(d.length, 1e-4)))
        o = new_mesh_obj(f'{name}_{sd}', verts, grid_faces(rows, count, True), part)
        fix_normals_out(o, lambda p, c=w0, f=f: c + f * f.dot(p - c))
        solidify(o, 0.003 * ctx.k, offset=-1)
        out.append(o)
    return out


def buttons(ctx, name, surf_objs, z0, z1, n, r, part='brass', x=0.0):
    bvh = bvh_of(surf_objs)
    out = []
    for i in range(n):
        z = z0 + (z1 - z0) * i / max(n - 1, 1)
        loc, nrm, _, _ = bvh.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)), 2.0)
        if loc is None:
            continue
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=r)
        for v in bm.verts:
            v.co.y *= 0.55
        me = bpy.data.meshes.new(f'{name}{i}')
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(f'{name}{i}', me)
        bpy.context.scene.collection.objects.link(o)
        set_part(o, part)
        o.data.transform(Matrix.Translation(loc + Vector((0, -r * 0.35, 0))))
        out.append(o)
    return out


@garment('doublet', 'torso', MEN + ['boy'], 'man', 'fitted doublet with tabbed skirt, sleeves, shirt cuffs and buttons')
def g_doublet(ctx, ref):
    o = dup(ctx.T, 'doublet')
    cut_by_ref(o, ref.T, torso_cut(ref, neck_drop=0.005, bottom=ref.hip.z - 0.07, sleeve_to=0.035))
    smooth_boundary(o, 2)
    subdivide(o, 1)
    hz, wz = ctx.hip.z, ctx.waist_z
    inflate_n(o, lambda co, n: ctx.k * (0.009 + 0.007 * smoothstep(0.22, 0.04, ctx.along_fore(co)) * (abs(co.x) > 0.24 * ctx.k)),
              smooth_iter=3)
    # the short tabbed skirt flares out over the hips
    bm = get_bm(o)
    zt = wz - 0.04 * ctx.k
    for v in bm.verts:
        if v.co.z < zt and abs(v.co.x) < 0.26 * ctx.k:
            t = smoothstep(zt, hz - 0.07 * ctx.k, v.co.z)
            d = Vector((v.co.x, v.co.y - ctx.hip.y, 0))
            if d.length > 1e-6:
                v.co += d.normalized() * 0.022 * ctx.k * t
    put_bm(bm, o)
    rim(o, 0.006 * ctx.k, inward=0.005 * ctx.k)
    set_part(o, 'wool')
    o = finish(o, ctx)
    cuffs = cuff_ring(ctx, 'cuff', 0.030 * ctx.k, 0.035 * ctx.k, 0.012 * ctx.k, 'linen', [o], flare=0.008 * ctx.k)
    for c in cuffs:
        finish(c, ctx)
    bts = buttons(ctx, 'btn', [o], ctx.neck.z - 0.07 * ctx.k, ctx.waist_z - 0.03 * ctx.k, 7, 0.0065 * ctx.k)
    for b in bts:
        finish(b, ctx)
    return join([o] + cuffs + bts, 'doublet')


def drape_band(ctx, name, surf_objs, centre, normal, depth_fn, count=48, rows=6, gap=0.004, slope=1.15,
               open_front=0.0, lift=0.0, part='linen'):
    """A band that starts at the neck and lies down over the shoulders, chest and back on the outermost
    surface below it (falling collars, kerchiefs, shoulder capes): each column walks down the surface from the
    neck, re-projecting every step onto the outermost layer. depth_fn(angle) -> metres; angle 0 = front,
    +pi/2 = the character's left. open_front leaves a gap (radians) at the centre front."""
    bvh = bvh_of(surf_objs)
    na = count
    angs = [open_front / 2 + (2 * math.pi - open_front) * i / (na - (1 if open_front > 0 else 0)) for i in range(na)]
    verts, aux = [], []
    for a in angs:
        d = Vector((math.sin(a), -math.cos(a), 0.0))
        loc, n, _, _ = bvh.ray_cast(centre + d * 0.5, -d, 0.5)
        if loc is None:
            loc, n = centre + d * 0.06, d.copy()
        if n.dot(d) < 0:
            n = -n
        p = loc + n * gap + UP * lift * ctx.k
        n0 = n.copy()
        dep = depth_fn(a) * ctx.k
        step = dep / (rows - 1)
        col = [p.copy()]
        for j in range(1, rows - 1):
            want = d * math.cos(slope) - UP * math.sin(slope)
            tng = want - n * want.dot(n)
            if tng.length < 1e-6:
                tng = -UP
            q = p + tng.normalized() * step
            hit, nn, _, _ = bvh.ray_cast(q + n * 0.12, -n, 0.3)
            if hit is not None:
                if nn.dot(n) < 0:
                    nn = -nn
                n = (n + nn).normalized()
                p = hit + nn * gap
            else:
                p = q
            col.append(p.copy())
        # inner edge tucked in against the neck and a little up, so no gap shows between collar and skin
        col.insert(0, col[0] - n0 * (gap + 0.003 * ctx.k) + UP * 0.007 * ctx.k)
        for j, pp in enumerate(col):
            verts.append(pp)
            aux.append((j / (rows - 1), a / (2 * math.pi), dep))
    faces = []
    for i in range(na if open_front == 0 else na - 1):
        i2 = (i + 1) % na
        for j in range(rows - 1):
            faces.append((i * rows + j, i2 * rows + j, i2 * rows + j + 1, i * rows + j + 1))
    o = new_mesh_obj(name, verts, faces, part)
    relax(o, 1, 0.3)
    fix_normals_out(o, lambda p: Vector((centre.x, centre.y, p.z + 0.25)))
    set_aux(o, aux)
    return o


@garment('collar_band', 'collar', MEN + ['boy'], 'man', 'plain white linen falling band collar', layer=1)
def g_collar_band(ctx, ref):
    d = bpy.data.objects[f'doublet.{ctx.bid}']
    c = Vector((0, ctx.neck.y + 0.004, ctx.neck.z - 0.004 * ctx.k))

    def depth(a):
        front = math.exp(-((math.atan2(math.sin(a), math.cos(a))) / 0.75) ** 2)
        return 0.085 + 0.045 * front
    o = drape_band(ctx, 'collar_band', [d, ctx.body], c, Vector((0, -0.28, 1)), depth, count=40, rows=5,
                   gap=0.004 * ctx.k, slope=1.25, open_front=0.10, lift=0.004)
    solidify(o, 0.0025 * ctx.k)
    set_part(o, 'linen')
    return finish(o, ctx)


@garment('smock', 'torso', MEN + ['boy'], 'man', 'loose peasant smock to mid-thigh, long sleeves')
def g_smock(ctx, ref):
    up = dup(ctx.T, 'smock_up')
    cut_by_ref(up, ref.T, torso_cut(ref, neck_drop=0.0, bottom=ref.waist_z - 0.06, sleeve_to=0.02))
    smooth_boundary(up, 2)
    subdivide(up, 1)
    inflate_n(up, lambda co, n: ctx.k * (0.014 + 0.012 * smoothstep(0.25, 0.04, ctx.along_fore(co)) * (abs(co.x) > 0.24 * ctx.k)),
              smooth_iter=3)
    rim(up, 0.005 * ctx.k, inward=0.005 * ctx.k)
    set_part(up, 'linen_d')
    up = finish(up, ctx)
    lo = dup(ctx.S, 'smock_lo')
    rw, rh = ref.waist_z, ref.hip.z
    cut_by_ref(lo, ref.S, lambda co, w: max(co.z - (rw - 0.015), (rh - 0.24) - co.z))
    subdivide(lo, 1)
    wz, hz = ctx.waist_z, ctx.hip.z
    bm = get_bm(lo)
    bm.normal_update()
    for v in bm.verts:
        t = smoothstep(wz, hz - 0.24 * ctx.k, v.co.z)
        d = outward_from_legs(ctx, v.co)
        a = math.atan2(v.co.x, -v.co.y)
        v.co += v.normal * (0.017 * ctx.k) + d * (0.035 * t * ctx.k) + d * (0.006 * ctx.k * t * math.sin(a * 9))
    put_bm(bm, lo)
    rim(lo, 0.005 * ctx.k)
    set_part(lo, 'linen_d')
    lo = finish(lo, ctx, 'S')
    # a short skirt: mostly the hips, only part of the thighs, so sitting does not fling it up
    blend_weights(lo, skirt_weights(ctx, ctx.waist_z, hz - 0.24 * ctx.k, follow=0.5))
    o = join([up, lo], 'smock')
    return o


def bodice_cut(ref):
    base = torso_cut(ref, neck_drop=0.0, bottom=-9, sleeve_to=0.085, square_neck=(0.062, 0.135))

    def f(co, w):
        v = base(co, w)
        bz = ref.waist_z - 0.035
        if co.y < 0:
            bz -= 0.055 * max(0.0, 1.0 - abs(co.x) / 0.09)          # pointed front
        if w_arm(w) < 0.5:
            v = max(v, bz - co.z)
        return v
    return f


@garment('bodice', 'torso', WOMEN + ['girl'], 'woman', 'laced bodice with three-quarter sleeves and chemise cuffs')
def g_bodice(ctx, ref):
    o = dup(ctx.T, 'bodice')
    cut_by_ref(o, ref.T, bodice_cut(ref))
    smooth_boundary(o, 2)
    subdivide(o, 1)
    inflate_n(o, lambda co, n: ctx.k * (0.006 + 0.008 * (abs(co.x) > 0.22 * ctx.k)), smooth_iter=2)
    rim(o, 0.005 * ctx.k, inward=0.005 * ctx.k)
    set_part(o, 'wool')
    o = finish(o, ctx)
    set_aux(o, [(abs(v.co.x) / ctx.k if v.co.y < ctx.neck.y else 1.0, 0, 0) for v in o.data.vertices])
    cuffs = cuff_ring(ctx, 'chem_cuff', 0.085 * ctx.k, 0.045 * ctx.k, 0.010 * ctx.k, 'linen', [o, ctx.body], flare=0.012 * ctx.k)
    for c in cuffs:
        finish(c, ctx)
    return join([o] + cuffs, 'bodice')


@garment('kerchief', 'collar', WOMEN + ['girl'], 'woman', 'white linen neckerchief / partlet over the shoulders', layer=1)
def g_kerchief(ctx, ref):
    b = bpy.data.objects[f'bodice.{ctx.bid}']
    c = Vector((0, ctx.neck.y + 0.006, ctx.neck.z - 0.010 * ctx.k))

    def depth(a):
        aa = math.atan2(math.sin(a), math.cos(a))
        front = math.exp(-(aa / 0.6) ** 2)
        back = math.exp(-((abs(aa) - math.pi) / 0.7) ** 2)
        return 0.14 + 0.08 * front + 0.08 * back
    o = drape_band(ctx, 'kerchief', [b, ctx.body], c, Vector((0, -0.3, 1)), depth, count=44, rows=7,
                   gap=0.009 * ctx.k, slope=1.3, lift=0.006)
    solidify(o, 0.0025 * ctx.k)
    set_part(o, 'linen')
    return finish(o, ctx)


def skirt_shape(ctx, o, extra=0.0, drop=0.035, flare=0.13, pleats=0.009):
    """Flare the skirt helper into a full, pleated A-line skirt (also used for the apron and the habit)."""
    wz = ctx.waist_z
    zmin = min(v.co.z for v in ctx.S.data.vertices)
    bm = get_bm(o)
    bm.normal_update()
    for v in bm.verts:
        t = min(max((wz - v.co.z) / max(wz - zmin, 1e-3), 0.0), 1.0)
        d = outward_from_legs(ctx, v.co)
        a = math.atan2(v.co.x, -(v.co.y - ctx.hip.y * 0.5))
        pleat = math.sin(a * 11 + 0.6) + 0.35 * math.sin(a * 23 + 1.3)
        v.co += v.normal * (0.010 + extra) * ctx.k + d * ctx.k * (flare * t ** 1.25 + pleats * pleat * (0.3 + t) + extra * 0.5 * t)
        v.co.z -= drop * ctx.k * t ** 2
    put_bm(bm, o)


@garment('skirt', 'legs', WOMEN + ['girl'], 'woman', 'long full wool skirt, gathered at the waist')
def g_skirt(ctx, ref):
    o = dup(ctx.S, 'skirt')
    rw = ref.waist_z
    cut_by_ref(o, ref.S, lambda co, w: co.z - (rw - 0.02))
    subdivide(o, 1)
    skirt_shape(ctx, o)
    relax(o, 1, 0.3)
    wz = ctx.waist_z
    zmin = min(v.co.z for v in o.data.vertices)
    rim(o, 0.006 * ctx.k)
    set_part(o, 'wool')
    o = finish(o, ctx, 'S')
    set_aux(o, [((wz - v.co.z) / max(wz - zmin, 1e-3), math.atan2(v.co.x, -v.co.y), 0) for v in o.data.vertices])
    return o


@garment('apron', 'apron', WOMEN + ['girl'], 'woman', 'linen apron with a waistband', layer=1)
def g_apron(ctx, ref):
    o = dup(ctx.S, 'apron')
    rw = ref.waist_z
    rmin = min(v.co.z for v in ref.S.data.vertices)
    cut_by_ref(o, ref.S, lambda co, w: max(abs(math.atan2(co.x, -(co.y - ref.hip.y * 0.5))) - 0.95,
                                           co.z - (rw - 0.03), (rmin + 0.10) - co.z))
    subdivide(o, 1)
    skirt_shape(ctx, o, extra=0.013)
    relax(o, 1, 0.3)
    solidify(o, 0.003 * ctx.k)
    set_part(o, 'linen_d')
    o = finish(o, ctx, 'S')
    sk = bpy.data.objects[f'skirt.{ctx.bid}']
    c = Vector((0, ctx.hip.y * 0.5, ctx.waist_z - 0.035 * ctx.k))
    pts, ln = convex_ring(bvh_sub([sk, o], lambda p: abs(p.z - c.z) < 0.12), c, UP, count=40)
    band = strap_mesh('apron_band', pts, ln, UP, c, 0.022 * ctx.k, 0.003, 0.002, 'linen_d')
    finish(band, ctx)
    return join([o, band], 'apron')


@garment('belt', 'belt', MEN + ['boy'], 'man', 'leather belt with a brass buckle (sits over the smock)', layer=1)
def g_belt(ctx, ref):
    sm = bpy.data.objects[f'smock.{ctx.bid}']
    c = Vector((0, ctx.hip.y * 0.6, ctx.waist_z - 0.03 * ctx.k))
    pts, ln = convex_ring(bvh_sub([sm], lambda p: abs(p.x) < 0.28 * ctx.k and abs(p.z - c.z) < 0.15), c, UP, count=44)
    belt = strap_mesh('belt', pts, ln, UP, c, 0.038 * ctx.k, 0.005, 0.002, 'leather')
    p, out, tan = ring_frame(pts, 0, UP, c)
    bk = torus_mesh('buckle', 0.5, 0.004, 4, 6, 'brass')
    bk.data.transform(Matrix.Scale(0.045 * ctx.k, 4))
    place(bk, p + out * 0.008, tan, UP, out)
    finish(belt, ctx)
    finish(bk, ctx)
    return join([belt, bk], 'belt')


# --------------------------------------------------------------------------
# HEAD: a parametric shell around the skull (fixed topology on every body), used by coifs, hoods, veils
# and the huik; and lathed hats sized to the head
# --------------------------------------------------------------------------
def head_centre(ctx):
    e = ctx.lm['eye']
    return Vector((0.0, (ctx.hmin.y + ctx.hmax.y) / 2 + 0.010 * ctx.k, e[2] + 0.012 * ctx.k))


def head_radius(ctx, nu, elevs, smooth=3, ears=True):
    """Distance from the head centre to the outermost head surface (ears included) per (elevation, azimuth),
    smoothed so the shell flows over the ears and the nose."""
    bvh = ctx.bvh('body', [ctx.body])
    hc = head_centre(ctx)
    Rr = np.zeros((len(elevs), nu))
    for j, el in enumerate(elevs):
        for i in range(nu):
            az = 2 * math.pi * i / nu
            d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
            hit = None
            if ears and el > math.radians(-28):
                hit, _, _, _ = bvh.ray_cast(hc + d * 0.17 * ctx.k, -d, 0.17 * ctx.k)
            if hit is None:
                hit, _, _, _ = bvh.ray_cast(hc, d, 0.4)
            Rr[j, i] = (hit - hc).length if hit is not None else 0.09 * ctx.k
    raw = Rr.copy()
    for _ in range(smooth):
        Rr = 0.4 * Rr + 0.15 * (np.roll(Rr, 1, 1) + np.roll(Rr, -1, 1)) + 0.15 * (np.vstack([Rr[:1], Rr[:-1]]) + np.vstack([Rr[1:], Rr[-1:]]))
        Rr = np.maximum(Rr, raw * 0.985)
    return Rr


def head_shell(ctx, name, offset, elevs, nu=40, keep=lambda az, el: True, part='linen', smooth=3, cap=True,
               bulge=None, ears=True):
    """Grid over the skull: rows = elevations (top first), columns = azimuth (0 = front, +90 deg = left).
    keep(az, el) chooses which quads exist. Returns the object and its row positions (list of rows of Vectors)."""
    hc = head_centre(ctx)
    Rr = head_radius(ctx, nu, elevs, smooth, ears)
    rows = []
    for j, el in enumerate(elevs):
        row = []
        for i in range(nu):
            az = 2 * math.pi * i / nu
            d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
            r = Rr[j, i] + offset * ctx.k + (bulge(az, el) * ctx.k if bulge else 0.0)
            row.append(hc + d * r)
        rows.append(row)
    verts = [p for row in rows for p in row]
    faces = []
    for j in range(len(elevs) - 1):
        for i in range(nu):
            i2 = (i + 1) % nu
            azc = 2 * math.pi * (i + 0.5) / nu
            azc = azc - 2 * math.pi if azc > math.pi else azc
            elc = (elevs[j] + elevs[j + 1]) / 2
            if keep(azc, elc):
                faces.append((j * nu + i, j * nu + i2, (j + 1) * nu + i2, (j + 1) * nu + i))
    if cap:
        top = hc + UP * (Rr[0].mean() + offset * ctx.k + 0.003)
        verts.append(top)
        ti = len(verts) - 1
        for i in range(nu):
            faces.append((ti, (i + 1) % nu, i))
    return verts, faces, rows


def drape_rows(ctx, start, surf, n_rows, depth_fn, mode='hug', gap=0.006, slope=1.35, flare=0.0):
    """Continue a ring of points (start) down the body: each column walks along the outermost surface
    ('hug'), or falls freely and is only pushed out of the body ('hang')."""
    bvh = surf
    cols = []
    for i, p0 in enumerate(start):
        az = 2 * math.pi * i / len(start)
        d = Vector((math.sin(az), -math.cos(az), 0.0))
        loc, n, _, _ = bvh.find_nearest(p0)
        n = (p0 - loc).normalized() if loc is not None and (p0 - loc).length > 1e-5 else d
        if n.dot(d) < -0.2:
            n = d
        p = p0.copy()
        dep = depth_fn(az) * ctx.k
        step = dep / max(n_rows, 1)
        col = []
        for j in range(n_rows):
            if mode == 'hug' or j < 2:
                want = d * math.cos(slope) - UP * math.sin(slope)
                tng = want - n * want.dot(n)
                q = p + (tng.normalized() if tng.length > 1e-6 else -UP) * step
                hit, nn, _, _ = bvh.ray_cast(q + n * 0.12, -n, 0.3)
                if hit is not None:
                    if nn.dot(n) < 0:
                        nn = -nn
                    n = (n + nn).normalized()
                    p = hit + nn * gap * ctx.k
                else:
                    p = q
            else:
                q = p - UP * step + d * (flare * step)
                loc, nn, _, _ = bvh.find_nearest(q)
                if loc is not None:
                    side = (q - loc).dot(nn) if nn.dot(d) >= 0 else (q - loc).dot(-nn)
                    if side < gap * ctx.k:
                        q = loc + (nn if nn.dot(d) >= 0 else -nn) * gap * ctx.k
                p = q
            col.append(p.copy())
        cols.append(col)
    return [[cols[i][j] for i in range(len(start))] for j in range(n_rows)]


def rows_mesh(name, rows, part, keep=None, closed=True, extra_verts=(), extra_faces=()):
    nu = len(rows[0])
    verts = [p for r in rows for p in r] + list(extra_verts)
    faces = list(extra_faces)
    for j in range(len(rows) - 1):
        for i in range(nu if closed else nu - 1):
            i2 = (i + 1) % nu
            if keep is None or keep(i, j):
                faces.append((j * nu + i, j * nu + i2, (j + 1) * nu + i2, (j + 1) * nu + i))
    return new_mesh_obj(name, verts, faces, part)


def head_weights(ctx, o, z_full, z_free, lower='T'):
    """Rigid on the head above z_full, the helper's weights (neck / shoulders) below z_free."""
    if lower == 'T':
        transfer_weights(o, ctx.T, ctx.bones)
    mix_weights(o, lambda co: smoothstep(z_free, z_full, co.z), lambda co: {'head': 1.0})


def deg(a):
    return math.radians(a)


ELEV_HEAD = [deg(a) for a in (82, 72, 60, 48, 36, 24, 12, 0, -12, -24, -36, -48)]


def face_opening(az, el, half=58, brow=22, chin=-42, round_=0.5):
    """True inside the face oval (az, el in radians)."""
    a, e = math.degrees(az), math.degrees(el)
    ec = (brow + chin) / 2
    eh = (brow - chin) / 2
    return (a / half) ** 2 + ((e - ec) / eh) ** 2 < 1.0 + round_ * 0


def snap_opening(ctx, o, half, brow, chin, front_only=True):
    """Move the border vertices of a face opening onto the ideal oval (removes the grid's stair-steps)."""
    hc = head_centre(ctx)
    ec, eh = (brow + chin) / 2, (brow - chin) / 2
    bm = get_bm(o)
    for v in bm.verts:
        if not v.is_boundary:
            continue
        d = v.co - hc
        r = d.length
        if r < 1e-6 or r > 0.2 * ctx.k:
            continue
        a = math.degrees(math.atan2(d.x, -d.y))
        e = math.degrees(math.asin(max(-1, min(1, d.z / r))))
        if front_only and abs(a) > half * 1.6:
            continue
        f = (a / half) ** 2 + ((e - ec) / eh) ** 2
        if f < 0.4 or f > 3.0:
            continue
        k = 1.0 / math.sqrt(f)
        a2, e2 = math.radians(a * k), math.radians(ec + (e - ec) * k)
        v.co = hc + Vector((math.sin(a2) * math.cos(e2), -math.cos(a2) * math.cos(e2), math.sin(e2))) * r
    put_bm(bm, o)


@garment('coif', 'head', WOMEN + ['girl'], 'woman', 'white linen cap covering the hair, framing the face')
def g_coif(ctx, ref):
    el = [deg(a) for a in (82, 70, 56, 42, 28, 14, 2, -10, -22)]

    def keep(az, e):
        a = abs(math.degrees(az))
        ed = math.degrees(e)
        front_edge = 64 - 0.35 * max(0.0, 40 - ed)          # the cap frames the face: further back low down
        if a < front_edge and ed < 52:
            return False
        if ed < -14 and a < 120:                            # bottom edge rises in front of the ears
            return False
        return True
    verts, faces, rows = head_shell(ctx, 'coif', 0.018, el, nu=40, keep=keep,
                                    bulge=lambda az, e: 0.022 * math.exp(-((abs(az) - math.pi) / 0.7) ** 2 - ((e - deg(5)) / 0.45) ** 2))
    o = new_mesh_obj('coif', verts, faces, 'linen')
    bm = get_bm(o)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    put_bm(bm, o)
    smooth_boundary(o, 4, 0.6)
    relax(o, 1, 0.3)
    fix_normals_out(o, lambda p: head_centre(ctx))
    rim(o, 0.004 * ctx.k, inward=0.006 * ctx.k)
    rigid_weight(o, 'head')
    return finish(o, ctx, weights=None)


def hat_place(ctx, o, sink=0.0, tilt=-6.0, scale_xy=None):
    """Place a hat modelled around the origin (Z up, brim at z=0) on this head."""
    hc = head_centre(ctx)
    hw = (ctx.hmax.x - ctx.hmin.x)
    hd = (ctx.hmax.y - ctx.hmin.y)
    sx, sy = (1.12 * hw / 0.175, 1.10 * hd / 0.215) if scale_xy is None else scale_xy
    o.data.transform(Matrix.Diagonal((sx, sy, ctx.k ** 0.5 * 1.0, 1.0)))
    o.data.transform(Matrix.Rotation(deg(tilt), 4, 'X'))
    o.data.transform(Matrix.Translation(Vector((0, hc.y + 0.004, ctx.top - (0.060 + sink) * ctx.k ** 0.7))))


def lathe_ellipse(name, profile, nseg, part, squash_y=1.0):
    o = lathe_mesh(name, profile, nseg, part)
    o.data.transform(Matrix.Diagonal((1, squash_y, 1, 1)))
    return o


@garment('hat_wide', 'head', MEN, 'man', 'wide-brimmed felt hat with a low crown and a band')
def g_hat_wide(ctx, ref):
    r0 = 0.096
    prof = [(0.0, 0.112), (0.050, 0.111), (0.078, 0.106), (0.088, 0.092), (0.092, 0.056), (r0, 0.012), (r0 + 0.004, 0.002),
            (0.150, 0.002), (0.200, -0.006), (0.212, -0.012), (0.205, -0.016), (0.150, -0.007), (r0 + 0.002, -0.006), (r0 - 0.004, 0.0)]
    o = lathe_mesh('hat_wide', prof, 40, 'felt')
    bm = get_bm(o)
    for v in bm.verts:                                       # a softly rolling brim: up at the sides, down in front
        r = math.hypot(v.co.x, v.co.y)
        if r > r0 + 0.01:
            a = math.atan2(v.co.x, -v.co.y)
            t = (r - r0) / 0.11
            v.co.z += (0.025 * math.sin(a) ** 2 - 0.012 * max(0.0, math.cos(a))) * t * t
    put_bm(bm, o)
    band = lathe_mesh('hatband', [(0.0915, 0.044), (0.0955, 0.040), (0.0985, 0.012), (0.0985, 0.006), (0.094, 0.004)], 40, 'cloth_b')
    hat = join([o, band], 'hat_wide')
    hat_place(ctx, hat, sink=0.022, tilt=-7)
    rigid_weight(hat, 'head')
    return finish(hat, ctx, weights=None)


@garment('hat_pilgrim', 'head', MEN, 'man', 'pilgrim\'s hat: low round crown, wide brim pinned up at the front, a scallop shell')
def g_hat_pilgrim(ctx, ref):
    r0 = 0.094
    prof = [(0.0, 0.100), (0.055, 0.097), (0.083, 0.082), (0.093, 0.050), (r0, 0.010), (r0 + 0.004, 0.002),
            (0.150, 0.0), (0.195, -0.004), (0.205, -0.010), (0.198, -0.014), (0.150, -0.006), (r0 + 0.002, -0.006), (r0 - 0.004, 0.0)]
    o = lathe_mesh('hat_pilgrim', prof, 40, 'felt')
    bm = get_bm(o)
    for v in bm.verts:
        r = math.hypot(v.co.x, v.co.y)
        if r > r0 + 0.005:
            a = math.atan2(v.co.x, -v.co.y)
            front = math.exp(-(a / 0.75) ** 2)
            t = (r - r0) / 0.11
            # pin the front up against the crown
            ang = deg(80) * front * min(1.0, t * 1.4)
            out = Vector((math.sin(a), -math.cos(a), 0))
            rr = r - r0
            base = Vector((math.sin(a) * r0, -math.cos(a) * r0, v.co.z))
            v.co = base + out * (rr * math.cos(ang)) + UP * (rr * math.sin(ang))
    put_bm(bm, o)
    shell = scallop('shell', 0.026)
    shell.data.transform(Matrix.Rotation(deg(-75), 4, 'X'))
    shell.data.transform(Matrix.Translation((0, -r0 - 0.035, 0.07)))
    hat = join([o, shell], 'hat_pilgrim')
    hat_place(ctx, hat, sink=0.004, tilt=-12)
    rigid_weight(hat, 'head')
    return finish(hat, ctx, weights=None)


def scallop(name, size):
    """A pilgrim's scallop shell: a ribbed fan (XY plane, hinge at the origin, opening towards +Y)."""
    nr, na = 4, 15
    verts, faces = [(0, 0, 0)], []
    for j in range(1, nr + 1):
        t = j / nr
        for i in range(na):
            a = deg(-65 + 130 * i / (na - 1))
            rib = 0.10 * size * (i % 2) * t
            verts.append((math.sin(a) * size * t, math.cos(a) * size * t * 1.05, 0.25 * size * math.sin(math.pi * t * 0.8) + rib * 0.3))
    for i in range(na - 1):
        faces.append((0, 1 + i, 2 + i))
    for j in range(nr - 1):
        for i in range(na - 1):
            a, b = 1 + j * na + i, 1 + (j + 1) * na + i
            faces.append((a, b, b + 1, a + 1))
    o = new_mesh_obj(name, verts, faces, 'lace')
    solidify(o, size * 0.08)
    return o


@garment('cap_flat', 'head', MEN + ['boy'], 'man', 'soft floppy woollen bonnet that sits on the head and droops to one side')
def g_cap_flat(ctx, ref):
    # a band resting on the hair (from the head's own radius field) carrying a soft, wide crown that
    # overhangs it and droops towards the character's left
    nu = 36
    k = ctx.k
    hc = head_centre(ctx)
    band_el = [deg(30), deg(20)]
    Rr = head_radius(ctx, nu, band_el, smooth=3, ears=False)
    rows = []
    for j, e in enumerate(band_el[::-1]):
        jj = len(band_el) - 1 - j
        row = []
        for i in range(nu):
            az = 2 * math.pi * i / nu
            d = Vector((math.sin(az) * math.cos(e), -math.cos(az) * math.cos(e), math.sin(e)))
            row.append(hc + d * (Rr[jj, i] + 0.017 * k))
        rows.append(row)                                     # lower band ring first, then the upper one
    top_z = max(p.z for p in rows[-1])
    c = Vector((0.012 * k, hc.y + 0.006 * k, top_z + 0.004 * k))
    rx, ry, rz = 0.128 * k, 0.122 * k, 0.040 * k
    tilt = Matrix.Rotation(deg(14), 3, 'Y') @ Matrix.Rotation(deg(-6), 3, 'X')   # droops to the left and back
    for lat in (-0.55, -0.15, 0.0, 0.35, 0.65, 0.88):
        row = []
        for i in range(nu):
            az = 2 * math.pi * i / nu
            ca = math.cos(math.asin(lat)) if abs(lat) < 1 else 0.0
            soft = 1.0 + 0.05 * math.sin(3 * az + 0.7)
            q = Vector((math.sin(az) * rx * ca * soft, -math.cos(az) * ry * ca * soft, lat * rz))
            row.append(c + tilt @ q)
        rows.append(row)
    top = c + tilt @ Vector((0, 0, rz))
    verts = [p for r in rows for p in r] + [top]
    faces = []
    for j in range(len(rows) - 1):
        for i in range(nu):
            i2 = (i + 1) % nu
            faces.append((j * nu + i, j * nu + i2, (j + 1) * nu + i2, (j + 1) * nu + i))
    ti = len(verts) - 1
    base = (len(rows) - 1) * nu
    for i in range(nu):
        faces.append((base + i, base + (i + 1) % nu, ti))
    o = new_mesh_obj('cap_flat', verts, faces, 'felt')
    fix_normals_out(o, lambda p: hc)
    relax(o, 1, 0.3)
    solidify(o, 0.004 * k)
    rigid_weight(o, 'head')
    return finish(o, ctx, weights=None)


@garment('morion', 'head', MEN, 'man', 'Spanish cabasset helmet: tall pear-shaped bowl, narrow brim, little stalk')
def g_morion(ctx, ref):
    prof = [(0.0, 0.215), (0.006, 0.214), (0.008, 0.196), (0.020, 0.188), (0.045, 0.170), (0.072, 0.140), (0.092, 0.100),
            (0.100, 0.060), (0.102, 0.020), (0.104, 0.004), (0.125, 0.000), (0.140, -0.004), (0.142, -0.010),
            (0.124, -0.006), (0.100, -0.004), (0.097, 0.010)]
    o = lathe_mesh('morion', prof, 36, 'steel')
    bm = get_bm(o)
    for v in bm.verts:                                       # brim points down a little at front and back
        r = math.hypot(v.co.x, v.co.y)
        if r > 0.104:
            a = math.atan2(v.co.x, -v.co.y)
            v.co.z -= 0.010 * math.cos(a) ** 2 * (r - 0.104) / 0.04
    put_bm(bm, o)
    rivets = []
    for i in range(10):
        a = 2 * math.pi * i / 10
        bmr = bmesh.new()
        bmesh.ops.create_uvsphere(bmr, u_segments=6, v_segments=4, radius=0.005)
        me = bpy.data.meshes.new('rivet')
        bmr.to_mesh(me)
        bmr.free()
        rv = bpy.data.objects.new('rivet', me)
        bpy.context.scene.collection.objects.link(rv)
        set_part(rv, 'brass')
        rv.data.transform(Matrix.Translation((math.sin(a) * 0.1035, -math.cos(a) * 0.1035, 0.016)))
        rivets.append(rv)
    hat = join([o] + rivets, 'morion')
    hat_place(ctx, hat, sink=0.020, tilt=-4)
    rigid_weight(hat, 'head')
    return finish(hat, ctx, weights=None)


@garment('beguine_veil', 'head', WOMEN, 'woman', 'beguine headdress: white wimple closed round the face and under the chin, white veil to the shoulder blades', layer=2)
def g_beguine_veil(ctx, ref):
    # one closed panel: the skull shell carries on below the jaw round the throat (wimple), so the only opening
    # is the face oval; below the neck it lies on the shoulders (short in front, the veil long behind)
    el = [deg(a) for a in (82, 72, 60, 48, 36, 24, 12, 0, -12, -24, -36, -48, -58, -66, -74)]
    nu = 40

    def keep(az, e):
        return not face_opening(az, e, half=50, brow=26, chin=-40)
    verts, faces, rows = head_shell(ctx, 'beguine_veil', 0.020, el, nu=nu, keep=keep, smooth=6,
                                    bulge=lambda az, e: 0.012 * max(0.0, math.sin(e)) + 0.010 * math.exp(-((abs(az) - math.pi) / 0.9) ** 2)
                                    + 0.012 * max(0.0, -math.sin(e) - 0.6))
    surf = bvh_of([ctx.body, ctx.T] + [o for o in (bpy.data.objects.get(f'habit.{ctx.bid}'),) if o])

    def depth(az):
        a = abs(math.atan2(math.sin(az), math.cos(az)))
        return 0.06 + 0.08 * smoothstep(0.5, 1.5, a) + 0.20 * smoothstep(1.8, 3.1, a)
    low = drape_rows(ctx, rows[-1], surf, 5, depth, mode='hang', gap=0.012, flare=0.35)
    nr = len(rows)
    allrows = rows + low
    vv = [p for r in allrows for p in r] + [verts[-1]]
    ff = [f if len(f) == 4 else (len(vv) - 1, f[1], f[2]) for f in faces]
    for j in range(nr - 1, len(allrows) - 1):
        for i in range(nu):
            i2 = (i + 1) % nu
            ff.append((j * nu + i, j * nu + i2, (j + 1) * nu + i2, (j + 1) * nu + i))
    o = new_mesh_obj('beguine_veil', vv, ff, 'linen')
    bm = get_bm(o)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    put_bm(bm, o)
    snap_opening(ctx, o, 50, 26, -40)
    relax(o, 4, 0.45)
    smooth_boundary(o, 3, 0.5)
    fix_normals_out(o, lambda p: Vector((0, ctx.neck.y, min(p.z, head_centre(ctx).z))))
    solidify(o, 0.003 * ctx.k)
    head_weights(ctx, o, ctx.headb.z - 0.02 * ctx.k, ctx.neck.z - 0.03 * ctx.k)
    return finish(o, ctx, weights=None)


@garment('huik', 'mantle', WOMEN, 'woman', 'the huik: long black hooded mantle from the head to below the knees, with the tuit on top', layer=2)
def g_huik(ctx, ref):
    el = ELEV_HEAD
    nu = 40

    def keep(az, e):
        return not face_opening(az, e, half=62, brow=30, chin=-46)
    verts, faces, rows = head_shell(ctx, 'huik', 0.030, el, nu=nu, keep=keep, smooth=4,
                                    bulge=lambda az, e: 0.016 * max(0.0, math.sin(e)) + 0.012 * math.exp(-((abs(az) - math.pi) / 1.0) ** 2))
    others = [o for o in (bpy.data.objects.get(f'bodice.{ctx.bid}'), bpy.data.objects.get(f'kerchief.{ctx.bid}'),
                          bpy.data.objects.get(f'skirt.{ctx.bid}')) if o]
    surf = bvh_of([ctx.body, ctx.T] + others)
    hem = ctx.knee.z - 0.12 * ctx.k

    def depth(az):
        return (rows[-1][0].z - hem) / ctx.k
    low = drape_rows(ctx, rows[-1], surf, 14, depth, mode='hang', gap=0.016, flare=0.22)
    nr = len(rows)
    allrows = rows + low
    vv = [p for r in allrows for p in r] + [verts[-1]]
    ff = [f if len(f) == 4 else (len(vv) - 1, f[1], f[2]) for f in faces]
    for j in range(nr - 1, len(allrows) - 1):
        for i in range(nu):
            azc = 2 * math.pi * (i + 0.5) / nu
            azc = azc - 2 * math.pi if azc > math.pi else azc
            # open in front below the chin; behind the arms on the sides
            limit = 62 + 55 * smoothstep(nr - 1, nr + 2, j)
            if abs(math.degrees(azc)) < limit:
                continue
            i2 = (i + 1) % nu
            ff.append((j * nu + i, j * nu + i2, (j + 1) * nu + i2, (j + 1) * nu + i))
    # the tuit: a small stiff knob rising from the crown over the forehead
    hc = head_centre(ctx)
    o = new_mesh_obj('huik', vv, ff, 'wool')
    bm = get_bm(o)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    put_bm(bm, o)
    snap_opening(ctx, o, 62, 30, -46)
    relax(o, 2, 0.35)
    fix_normals_out(o, lambda p: Vector((0, ctx.hip.y, min(p.z, hc.z))))
    solidify(o, 0.005 * ctx.k)
    tuit = lathe_mesh('tuit', [(0.0, 0.075), (0.010, 0.068), (0.018, 0.045), (0.026, 0.015), (0.032, 0.0), (0.0, -0.004)], 12, 'wool')
    tuit.data.transform(Matrix.Diagonal((1.0, 0.6, 1.0, 1.0)))
    tuit.data.transform(Matrix.Rotation(deg(-28), 4, 'X'))
    tuit.data.transform(Matrix.Translation(hc + Vector((0, -0.035 * ctx.k, max(p.z for p in rows[0]) - hc.z - 0.008 * ctx.k))))
    o = join([o, tuit], 'huik')
    # weights: head for the hood, shoulders from the helper, the long fall on the cloak chain
    transfer_weights(o, ctx.T, ctx.bones)
    cloak_chain_weights(ctx, o, ctx.neck.z - 0.10 * ctx.k, hem)
    mix_weights(o, lambda co: smoothstep(ctx.neck.z, ctx.headb.z + 0.02 * ctx.k, co.z), lambda co: {'head': 1.0})
    return finish(o, ctx, weights=None)


def cloak_chain_weights(ctx, o, z_top, z_hem, back_only=False):
    """Hand the back/sides of a long mantle over to cloak1..4 below z_top (like the rider's cloak)."""
    rig = ctx.rig
    cz = [rig.data.bones[f'cloak{k}'].head_local.z for k in range(1, 5)] + [rig.data.bones['cloak4'].tail_local.z]

    def ws(co):
        z = co.z
        out = {}
        for k in range(1, 5):
            zc = (cz[k - 1] + cz[k]) / 2
            span = (cz[k - 1] - cz[k])
            w = max(0.0, 1.0 - abs(z - zc) / span)
            if k == 4 and z < zc:
                w = 1.0
            if k == 1 and z > zc:
                w = 1.0
            out[f'cloak{k}'] = w
        return out
    mix_weights(o, lambda co: smoothstep(z_top, z_top - 0.18 * ctx.k, co.z) * (1.0 if not back_only else smoothstep(-0.02, 0.08, co.y - ctx.hip.y)), ws)


# --------------------------------------------------------------------------
# ROBES, CAPES, COATS, BELTS
# --------------------------------------------------------------------------
@garment('habit', 'torso', ADULTS, 'man', 'long religious habit to the ankles with wide sleeves (Capuchin brown / beguine black)')
def g_habit(ctx, ref):
    up = dup(ctx.T, 'habit_up')
    cut_by_ref(up, ref.T, torso_cut(ref, neck_drop=-0.012, bottom=ref.waist_z - 0.06, sleeve_to=0.0))
    smooth_boundary(up, 2)
    inflate_n(up, lambda co, n: ctx.k * (0.017 + 0.040 * smoothstep(0.30, 0.0, ctx.along_fore(co)) * (abs(co.x) > 0.24 * ctx.k)),
              smooth_iter=4)
    rim(up, 0.006 * ctx.k, inward=0.005 * ctx.k)
    set_part(up, 'wool')
    up = finish(up, ctx)
    lo = dup(ctx.S, 'habit_lo')
    rw = ref.waist_z
    cut_by_ref(lo, ref.S, lambda co, w: co.z - (rw - 0.015))
    subdivide(lo, 1)
    skirt_shape(ctx, lo, extra=0.010, drop=0.085, flare=0.085, pleats=0.006)
    relax(lo, 1, 0.3)
    rim(lo, 0.006 * ctx.k)
    set_part(lo, 'wool')
    lo = finish(lo, ctx, 'S')
    return join([up, lo], 'habit')


def tube(name, pts, r, nseg, part, radii=None):
    verts, faces = [], []
    n = len(pts)
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        a = t.cross(Vector((0.3, 0.2, 1.0))).normalized()
        b = t.cross(a)
        rr = radii[i] if radii else r
        for k in range(nseg):
            ang = 2 * math.pi * k / nseg
            verts.append(p + (a * math.cos(ang) + b * math.sin(ang)) * rr)
    for i in range(n - 1):
        for k in range(nseg):
            faces.append((i * nseg + k, i * nseg + (k + 1) % nseg, (i + 1) * nseg + (k + 1) % nseg, (i + 1) * nseg + k))
    verts.append(pts[0])
    verts.append(pts[-1])
    for k in range(nseg):
        faces.append((len(verts) - 2, (k + 1) % nseg, k))
        faces.append((len(verts) - 1, (n - 1) * nseg + k, (n - 1) * nseg + (k + 1) % nseg))
    o = new_mesh_obj(name, verts, faces, part)
    bm = get_bm(o)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    put_bm(bm, o)
    return o


@garment('rope_belt', 'belt', ADULTS, 'man', 'knotted cord belt with hanging ends (sits over the habit)', layer=1)
def g_rope_belt(ctx, ref):
    hb = bpy.data.objects[f'habit.{ctx.bid}']
    c = Vector((0, ctx.hip.y * 0.6, ctx.waist_z - 0.035 * ctx.k))
    pts, ln = convex_ring(bvh_sub([hb], lambda p: abs(p.x) < 0.30 * ctx.k and abs(p.z - c.z) < 0.12), c, UP, count=40)
    r = 0.008 * ctx.k
    ring = [p + (p - c).normalized() * r * 0.8 for p in pts] + [pts[0] + (pts[0] - c).normalized() * r * 0.8]
    belt = tube('rope', ring, r, 6, 'rope')
    # two ends hanging from a knot at the right front, with three knots each
    i0 = min(range(len(pts)), key=lambda i: abs(math.atan2(pts[i].x, -(pts[i].y - c.y)) + 0.55))
    k0 = pts[i0] + (pts[i0] - c).normalized() * r * 2.0
    sk = bvh_of([hb])
    ends = []
    for e, (dx, length) in enumerate(((-0.012, 0.52), (0.014, 0.44))):
        path = []
        for j in range(14):
            t = j / 13
            q = k0 + Vector((dx * ctx.k, 0, -length * ctx.k * t))
            loc, nn, _, _ = sk.find_nearest(q)
            if loc is not None and (q - loc).dot(nn) < r * 1.6:
                q = loc + nn * r * 1.6
            path.append(q)
        radii = [r * (1.0 + 0.9 * max(math.exp(-((j - kk) / 0.55) ** 2) for kk in (4, 8, 12))) for j in range(14)]
        ends.append(tube(f'rope_end{e}', path, r, 6, 'rope', radii))
    knot = rounded_box('rope_knot', (0.03 * ctx.k, 0.022 * ctx.k, 0.028 * ctx.k), 'rope', roundness=0.8)
    knot.data.transform(Matrix.Translation(k0))
    o = join([belt, knot] + ends, 'rope_belt')
    transfer_weights(o, ctx.S, ctx.bones)
    mix_weights(o, lambda co: smoothstep(ctx.waist_z - 0.06 * ctx.k, ctx.waist_z - 0.2 * ctx.k, co.z),
                lambda co: {'pelvis': 0.5, 'thigh_r': 0.5})
    return finish(o, ctx, weights=None)


@garment('capuche', 'mantle', MEN, 'man', 'Capuchin hood (down, long point) on a short shoulder cape', layer=1)
def g_capuche(ctx, ref):
    hb = bpy.data.objects[f'habit.{ctx.bid}']
    c = Vector((0, ctx.neck.y + 0.004, ctx.neck.z - 0.006 * ctx.k))

    def depth(a):
        aa = abs(math.atan2(math.sin(a), math.cos(a)))
        return 0.15 + 0.03 * smoothstep(0.3, 1.6, aa) + 0.03 * smoothstep(2.0, 3.1, aa)
    cape = drape_band(ctx, 'capuche_cape', [hb, ctx.body], c, Vector((0, -0.28, 1)), depth, count=44, rows=6,
                      gap=0.007 * ctx.k, slope=1.15, open_front=0.0, lift=0.004, part='wool')
    solidify(cape, 0.006 * ctx.k)
    # the hood lying on the back, ending in the Capuchin's long point
    back = bvh_of([cape, hb])
    nz = ctx.neck.z

    def back_y(x, z):
        loc, _, _, _ = back.ray_cast(Vector((x, 1.0, z)), Vector((0, -1, 0)), 2.0)
        return loc.y if loc is not None else ctx.neck.y + 0.12

    rings, nring = 12, 12
    verts = []
    z0, z1 = nz + 0.040 * ctx.k, nz - 0.46 * ctx.k
    for kk in range(rings):
        t = kk / (rings - 1)
        z = z0 + (z1 - z0) * t
        wid = ctx.k * (0.125 * min(1.0, 0.6 + 3.0 * t) * (1.0 - t ** 1.25) ** 0.8 + 0.008)
        dep = ctx.k * (0.050 * min(1.0, 0.5 + 3.5 * t) * (1.0 - t ** 1.4) ** 0.8 + 0.008)
        yb = back_y(0.0, min(z, nz - 0.03 * ctx.k)) - 0.004
        if z > nz - 0.03 * ctx.k:
            yb += (z - (nz - 0.03 * ctx.k)) * -0.3
        for j in range(nring):
            b = 2 * math.pi * j / nring
            xx = wid * math.cos(b)
            yy = dep * (0.9 + math.sin(b)) if math.sin(b) > -0.9 else 0.0
            verts.append((xx, yb + max(0.0, yy), z + 0.012 * math.cos(2 * b) * (1 - t)))
    verts.append((0.0, back_y(0.0, z1 - 0.04) + 0.006, z1 - 0.05 * ctx.k))
    faces = []
    for kk in range(rings - 1):
        for j in range(nring):
            a0, a1 = kk * nring, (kk + 1) * nring
            faces.append((a0 + j, a0 + (j + 1) % nring, a1 + (j + 1) % nring, a1 + j))
    tip = rings * nring
    for j in range(nring):
        faces.append(((rings - 1) * nring + j, (rings - 1) * nring + (j + 1) % nring, tip))
    verts.append((0.0, verts[0][1] + 0.03, z0 + 0.012))
    for j in range(nring):
        faces.append(((j + 1) % nring, j, len(verts) - 1))
    hood = new_mesh_obj('capuche_hood', verts, faces, 'wool')
    bm = get_bm(hood)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    put_bm(bm, hood)
    o = join([cape, hood], 'capuche')
    transfer_weights(o, ctx.T, ctx.bones)
    return finish(o, ctx, weights=None)


@garment('pelerine', 'mantle', ADULTS, 'man', 'pilgrim\'s short shoulder cape, open at the front, with two scallop shells', layer=1)
def g_pelerine(ctx, ref):
    under = [o for o in (bpy.data.objects.get(f'doublet.{ctx.bid}'), bpy.data.objects.get(f'smock.{ctx.bid}'),
                         bpy.data.objects.get(f'bodice.{ctx.bid}'), bpy.data.objects.get(f'kerchief.{ctx.bid}'),
                         bpy.data.objects.get(f'collar_band.{ctx.bid}')) if o]
    c = Vector((0, ctx.neck.y + 0.004, ctx.neck.z - 0.004 * ctx.k))

    def depth(a):
        aa = abs(math.atan2(math.sin(a), math.cos(a)))
        return 0.22 + 0.06 * smoothstep(0.4, 1.5, aa) + 0.02 * smoothstep(2.0, 3.1, aa)
    o = drape_band(ctx, 'pelerine', under + [ctx.body], c, Vector((0, -0.28, 1)), depth, count=48, rows=8,
                   gap=0.012 * ctx.k, slope=1.12, open_front=0.30, lift=0.008, part='wool')
    solidify(o, 0.006 * ctx.k)
    shells = []
    bv = bvh_of([o])
    for sx in (1, -1):
        p0 = Vector((0.075 * sx * ctx.k, -1.0, ctx.neck.z - 0.10 * ctx.k))
        loc, nn, _, _ = bv.ray_cast(p0, Vector((0, 1, 0)), 2.0)
        if loc is None:
            continue
        sh = scallop('shell', 0.024 * ctx.k)
        sh.data.transform(Matrix.Rotation(deg(180), 4, 'Y'))
        place(sh, loc + Vector((0, -0.004, 0)), Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, -1, 0)))
        shells.append(sh)
    o = join([o] + shells, 'pelerine')
    transfer_weights(o, ctx.T, ctx.bones)
    return finish(o, ctx, weights=None)


@garment('buff_coat', 'coat', MEN, 'man', 'soldier\'s sleeveless buff-leather coat to mid-thigh, worn over the doublet', layer=1)
def g_buff_coat(ctx, ref):
    up = dup(ctx.T, 'buff_up')
    cut_by_ref(up, ref.T, torso_cut(ref, neck_drop=0.012, bottom=ref.waist_z - 0.06, sleeve_to=None))
    smooth_boundary(up, 2)
    inflate(up, 0.024 * ctx.k, smooth_iter=3)
    rim(up, 0.008 * ctx.k)
    set_part(up, 'buff')
    up = finish(up, ctx)
    lo = dup(ctx.S, 'buff_lo')
    rw, rh = ref.waist_z, ref.hip.z
    cut_by_ref(lo, ref.S, lambda co, w: max(co.z - (rw - 0.02), (rh - 0.27) - co.z,
                                            (0.010 - abs(co.x)) if co.y < ref.hip.y else -1.0))
    subdivide(lo, 1)
    wz, hz = ctx.waist_z, ctx.hip.z
    bm = get_bm(lo)
    bm.normal_update()
    for v in bm.verts:
        t = smoothstep(wz, hz - 0.27 * ctx.k, v.co.z)
        d = outward_from_legs(ctx, v.co)
        v.co += v.normal * (0.030 * ctx.k) + d * (0.055 * t * ctx.k)
    put_bm(bm, lo)
    rim(lo, 0.008 * ctx.k)
    set_part(lo, 'buff')
    lo = finish(lo, ctx, 'S')
    return join([up, lo], 'buff_coat')


@garment('sash', 'sash', MEN, 'man', 'the Spanish army\'s red field sash, right shoulder to left hip, knotted', layer=2)
def g_sash(ctx, ref):
    bc = bpy.data.objects[f'buff_coat.{ctx.bid}']
    k = ctx.k
    top = Vector((-0.105 * k, 0, ctx.neck.z - 0.03 * k))
    low = Vector((0.15 * k, 0, ctx.waist_z - 0.07 * k))
    d = (low - top).normalized()
    n = Vector((-d.z, 0.0, d.x))
    c = (top + low) / 2 + Vector((0, ctx.hip.y * 0.5, 0))
    bv = bvh_sub([bc], lambda p: p.z > ctx.waist_z - 0.25 * k)
    pts, ln = convex_ring(bv, c, n, count=48)
    band = strap_mesh('sash_band', pts, ln, n, c, 0.075 * k, 0.006, 0.003, 'sash')
    # knot and two tails at the left hip
    i0 = min(range(len(pts)), key=lambda i: (pts[i] - (low + Vector((0.02 * k, -0.1, 0)))).length + (5 if pts[i].y > ctx.hip.y else 0))
    kp = pts[i0] + (pts[i0] - c).normalized() * 0.015
    knot = rounded_box('sash_knot', (0.07 * k, 0.04 * k, 0.06 * k), 'sash', roundness=0.7)
    knot.data.transform(Matrix.Translation(kp))
    bvc = bvh_of([bc])
    tails = []
    for e, (dx, length, w) in enumerate(((-0.02, 0.30, 0.06), (0.025, 0.24, 0.055))):
        verts = []
        rows = 8
        for j in range(rows):
            t = j / (rows - 1)
            q = kp + Vector((dx * k + 0.01 * t * k, 0, -length * k * t))
            loc, nn, _, _ = bvc.find_nearest(q)
            if loc is not None and (q - loc).dot(nn) < 0.012:
                q = loc + nn * 0.012
            side = Vector((1, 0, 0)) * (w * k * (1.0 + 0.3 * t) / 2)
            verts += [q - side, q + side]
        faces = [(2 * j, 2 * j + 1, 2 * j + 3, 2 * j + 2) for j in range(rows - 1)]
        tl = new_mesh_obj(f'sash_tail{e}', verts, faces, 'sash')
        fix_normals_out(tl, lambda p: Vector((0, ctx.hip.y, p.z)))
        solidify(tl, 0.004)
        tails.append(tl)
    o = join([band, knot] + tails, 'sash')
    transfer_weights(o, ctx.T, ctx.bones)
    mix_weights(o, lambda co: smoothstep(ctx.waist_z - 0.08 * k, ctx.waist_z - 0.25 * k, co.z),
                lambda co: {'pelvis': 0.6, 'thigh_l': 0.4})
    return finish(o, ctx, weights=None)


# --------------------------------------------------------------------------
# HAIR AND BEARDS: a sculpted shell over the scalp plus chunky painted locks (the rider's hair, simplified)
# --------------------------------------------------------------------------
ELEV_HAIR = [deg(a) for a in (84, 74, 64, 54, 44, 34, 24, 14, 4, -6, -16, -26, -36, -46)]


def hairline(a_deg, front=38.0, temple=28.0, ear=6.0, back=-40.0):
    """Lowest elevation (deg) of the hair at azimuth a (deg, 0 = front)."""
    a = abs(a_deg)
    xs = [0, 45, 70, 95, 130, 180]
    ys = [front, temple, ear + 12, ear, (ear + back) / 2 + 4, back]
    return float(np.interp(a, xs, ys))


def lock_mesh(name, roots, n_locks, seed, length, width, droop, crown, part='hair', curl=0.0):
    """Chunky sculpted locks (5-sided tapered tubes on a bent spine) rooted on the given (point, normal) list.
    The same seed gives the same locks on every body."""
    rng = np.random.RandomState(seed)
    verts, faces, auxv = [], [], []
    ring = ((-1.0, 0.0), (-0.5, 0.30), (0.5, 0.30), (1.0, 0.0), (0.0, -0.18))      # broad, flat clumps
    nr_ = len(ring)
    for (p0, nrm, flow_hint) in roots:
        away = p0 - crown
        flow = flow_hint if flow_hint is not None else away - nrm * away.dot(nrm)
        if flow.length < 1e-4:
            flow = Vector((0.0, 0.3, -1.0))
        flow = (flow - nrm * flow.dot(nrm)).normalized()
        flow = Quaternion(nrm, rng.uniform(-0.35, 0.35) + curl) @ flow
        side = nrm.cross(flow).normalized()
        L = length * rng.uniform(0.8, 1.2)
        W = width * rng.uniform(0.85, 1.15)
        lift = rng.uniform(0.002, 0.005)
        a = p0 - nrm * 0.004 - flow * 0.01
        b = a + flow * (L * 0.55) + nrm * (lift + 0.006)
        c = a + flow * L + nrm * 0.002 - UP * droop * L
        rnd = rng.rand()
        base = len(verts)
        nseg = 4
        for k in range(nseg + 1):
            u = k / nseg
            p = a * (1 - u) ** 2 + b * (2 * u * (1 - u)) + c * (u * u)
            tan = ((b - a) * (1 - u) + (c - b) * u).normalized()
            upv = side.cross(tan).normalized()
            wv = W * min(1.0, 0.6 + 1.6 * u) * (1.0 - u ** 2.2) ** 0.75
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
    o = new_mesh_obj(name, verts, faces, part)
    bm = get_bm(o)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    put_bm(bm, o)
    set_aux(o, auxv)
    return o


def hair_style(ctx, name, offset, hl, lock_rows, lock_len, lock_w, droop, seed, drape=None, bulge=None, n_locks=None,
               flow=None, part='hair'):
    """Shell over the scalp down to the hairline hl(az_deg); locks rooted on chosen shell rows;
    optional drape (hanging rows: (n_rows, depth_fn(az), keep_az(az_deg)))."""
    el = ELEV_HAIR
    nu = 40
    verts, faces, rows = head_shell(ctx, name, offset, el, nu=nu,
                                    keep=lambda az, e: math.degrees(e) > hl(math.degrees(az)), smooth=3, bulge=bulge,
                                    ears=False)
    o = new_mesh_obj(name, verts, faces, part)
    allrows = rows
    if drape:
        n_rows, depth_fn, keep_az = drape
        surf = ctx.bvh('body+T', [ctx.body, ctx.T])
        # start the hanging part from the lowest kept row at each azimuth
        start = []
        for i in range(nu):
            a = math.degrees(2 * math.pi * i / nu)
            a = a - 360 if a > 180 else a
            jj = max([j for j, e in enumerate(el) if math.degrees(e) > hl(a)] or [0])
            start.append(rows[min(jj + 1, len(rows) - 1)][i])
        low = drape_rows(ctx, start, surf, n_rows, depth_fn, mode='hang', gap=0.012, flare=0.05)
        base = len(verts)
        vv = verts + [p for r in low for p in r]
        ff = list(faces)
        for i in range(nu):
            a = math.degrees(2 * math.pi * (i + 0.5) / nu)
            a = a - 360 if a > 180 else a
            if not keep_az(a):
                continue
            i2 = (i + 1) % nu
            a_i = math.degrees(2 * math.pi * i / nu)
            jj = max([j for j, e in enumerate(el) if math.degrees(e) > hl(a_i - 360 if a_i > 180 else a_i)] or [0])
            jj = min(jj + 1, len(rows) - 1)
            ff.append((jj * nu + i, jj * nu + i2, base + i2, base + i))
            for r in range(n_rows - 1):
                ff.append((base + r * nu + i, base + r * nu + i2, base + (r + 1) * nu + i2, base + (r + 1) * nu + i))
        bpy.data.objects.remove(o)
        o = new_mesh_obj(name, vv, ff, part)
    bm = get_bm(o)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    put_bm(bm, o)
    relax(o, 1, 0.3)
    hc = head_centre(ctx)
    # the hair thins out towards the hairline: pull the border (and the ring inside it) in to the skin
    bm = get_bm(o)
    border = {v for v in bm.verts if v.is_boundary and (v.co.z > ctx.neck.z + 0.05 * ctx.k or not drape)}
    ring2 = {e.other_vert(v) for v in border for e in v.link_edges} - border
    for vs, f in ((border, 1.0), (ring2, 0.45)):
        for v in vs:
            d = (v.co - hc)
            v.co -= d.normalized() * offset * ctx.k * f * 0.9
    put_bm(bm, o)
    fix_normals_out(o, lambda p: Vector((hc.x, hc.y, min(p.z, hc.z))))
    set_aux(o, [(0.0, 0.5, 0.0)] * len(o.data.vertices))
    parts = [o]
    if lock_rows:
        roots = []
        nu_ = nu
        for (e_deg, step, off) in lock_rows:
            j = min(range(len(el)), key=lambda jj: abs(math.degrees(el[jj]) - e_deg))
            for i in range(off, nu_, step):
                a = math.degrees(2 * math.pi * i / nu_)
                a = a - 360 if a > 180 else a
                if math.degrees(el[j]) <= hl(a) - 0.1:
                    continue
                p = rows[j][i]
                nrm = (p - hc).normalized()
                roots.append((p, nrm, flow(a, e_deg) if flow else None))
        crown = hc + UP * 0.12 * ctx.k + Vector((0, 0.02, 0))
        locks = lock_mesh(name + '_locks', roots, len(roots), seed, lock_len * ctx.k, lock_w * ctx.k, droop, crown, part)
        parts.append(locks)
    o = join(parts, name)
    return o


def hair_finish(ctx, o):
    transfer_weights(o, ctx.T, ctx.bones)
    mix_weights(o, lambda co: smoothstep(ctx.neck.z + 0.02 * ctx.k, ctx.headb.z + 0.01 * ctx.k, co.z), lambda co: {'head': 1.0})
    return finish(o, ctx, weights=None)


@garment('hair_crop', 'hair', MEN + ['boy'], 'man', 'short cropped hair', layer=0)
def g_hair_crop(ctx, ref):
    o = hair_style(ctx, 'hair_crop', 0.009, lambda a: hairline(a, 40, 30, 8, -36),
                   [(60, 5, 0), (38, 4, 2), (18, 4, 0)], 0.065, 0.080, 0.30, 11)
    return hair_finish(ctx, o)


@garment('hair_long', 'hair', MEN, 'man', 'shoulder-length hair with a centre parting (1650 fashion)', layer=0)
def g_hair_long(ctx, ref):
    def depth(az):
        a = abs(math.degrees(math.atan2(math.sin(az), math.cos(az))))
        return 0.05 + 0.10 * smoothstep(55, 110, a)

    def flow(a, e):
        side = 1 if a >= 0 else -1
        return Vector((0.6 * side, 0.25, -1.0))
    o = hair_style(ctx, 'hair_long', 0.010, lambda a: hairline(a, 40, 26, 0, -30),
                   [(60, 5, 0), (38, 4, 2), (16, 4, 0), (-4, 4, 2)], 0.090, 0.085, 0.6, 12,
                   drape=(4, depth, lambda a: abs(a) > 55), flow=flow)
    return hair_finish(ctx, o)


@garment('hair_thin', 'hair', MEN, 'man', 'thin grey hair: bald crown, fringe round the sides and back', layer=0)
def g_hair_thin(ctx, ref):
    el = ELEV_HAIR

    def hl(a):
        a = abs(a)
        return float(np.interp(a, [0, 70, 90, 130, 180], [90, 90, 12, -14, -32]))
    o = hair_style(ctx, 'hair_thin', 0.006, hl, [(22, 4, 0), (2, 4, 2)], 0.055, 0.065, 0.5, 13)
    # remove the crown: only a band above the hairline stays
    hc = head_centre(ctx)
    bm = get_bm(o)
    kill = []
    for f in bm.faces:
        c = f.calc_center_median() - hc
        e = math.degrees(math.asin(max(-1, min(1, c.z / max(c.length, 1e-6)))))
        a = math.degrees(math.atan2(c.x, -c.y))
        if e > 36 + 10 * (abs(a) / 180) and f.calc_area() > 0 and len(f.verts) == 4 and c.length < 0.16 * ctx.k:
            kill.append(f)
    # decide on the reference topology: same faces on every body (grid order is fixed)
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    put_bm(bm, o)
    return hair_finish(ctx, o)


@garment('hair_child', 'hair', ['boy'], 'boy', 'boy\'s bowl-cut hair with a straight fringe', layer=0)
def g_hair_child(ctx, ref):
    def flow(a, e):
        if abs(a) < 60:
            return Vector((0.0, -1.0, -0.6))
        return None
    o = hair_style(ctx, 'hair_child', 0.010, lambda a: hairline(a, 28, 18, 4, -30),
                   [(60, 5, 0), (38, 4, 2), (20, 4, 0)], 0.075, 0.085, 0.35, 14, flow=flow)
    return hair_finish(ctx, o)


@garment('hair_bun', 'hair', WOMEN + ['girl'], 'woman', 'hair parted in the middle and pulled back into a bun', layer=0)
def g_hair_bun(ctx, ref):
    o = hair_style(ctx, 'hair_bun', 0.007, lambda a: hairline(a, 40, 28, 6, -34), [], 0, 0, 0, 15,
                   bulge=lambda az, e: 0.004 * math.cos(e))
    hc = head_centre(ctx)
    bun = rounded_box('bun', (0.075 * ctx.k, 0.055 * ctx.k, 0.06 * ctx.k), 'hair', roundness=0.85, cuts=3)
    bun.data.transform(Matrix.Translation(hc + Vector((0, (ctx.hmax.y - hc.y) + 0.008 * ctx.k, -0.025 * ctx.k))))
    set_aux(bun, [(0.3, 0.5, 0.0)] * len(bun.data.vertices))
    o = join([o, bun], 'hair_bun')
    return hair_finish(ctx, o)


def face_points(ctx):
    """Mouth centre, chin tip and the base of the nose, from the body mesh (same vertices on every body)."""
    me = ctx.body.data
    aux = np.zeros(len(me.vertices) * 4, dtype=np.float32)
    me.color_attributes['aux'].data.foreach_get('color', aux)
    lips = aux.reshape(-1, 4)[:, 0] > 0.5
    co = co_array(ctx.body)
    lc = co[lips]
    mouth = Vector(lc.mean(axis=0))
    mouth.y = lc[:, 1].min()
    sel = (np.abs(co[:, 0]) < 0.012) & (co[:, 2] < mouth.z) & (co[:, 2] > ctx.neck.z) & (co[:, 1] < mouth.y + 0.04)
    chin = Vector(co[sel][np.argmin(co[sel][:, 2] - 0.4 * co[sel][:, 1])]) if sel.any() else mouth - UP * 0.05
    e = ctx.lm['eye']
    sel = (np.abs(co[:, 0]) < 0.006) & (co[:, 2] > mouth.z + 0.01) & (co[:, 2] < e[2])
    nose = Vector(co[sel][np.argmin(co[sel][:, 1])]) if sel.any() else mouth + UP * 0.03
    return mouth, chin, nose


def moustache(ctx, name, mouth, nose, up=1.0, size=1.0):
    k = ctx.k
    parts = []
    base = mouth.lerp(nose, 0.42) + Vector((0, -0.006 * k, 0))
    for sx in (1, -1):
        pts, radii = [], []
        for j in range(9):
            t = j / 8
            x = sx * (0.004 + 0.034 * size * t) * k
            z = -0.010 * k * math.sin(math.pi * t * 0.9) + up * 0.016 * k * t ** 2.5
            y = 0.012 * k * t ** 1.5
            pts.append(base + Vector((x, y, z)))
            radii.append(k * 0.0055 * size * (1 - t) ** 0.8 + 0.0008)
        parts.append(tube(f'{name}_{sx}', pts, 0.004, 6, 'beard', radii))
    return parts


@garment('beard_pointed', 'beard', MEN, 'man', 'pointed chin beard and upturned moustache (1650 fashion)', layer=0)
def g_beard_pointed(ctx, ref):
    mouth, chin, nose = face_points(ctx)
    k = ctx.k
    # the beard: a tapered wedge from under the lower lip to a point below the chin
    top = mouth + Vector((0, 0.002 * k, -0.012 * k))
    tip = chin + Vector((0, -0.020 * k, -0.045 * k))
    pts = [top.lerp(tip, t) + Vector((0, -0.010 * k * math.sin(math.pi * t), 0)) for t in np.linspace(0, 1, 8)]
    radii = [k * (0.016 * (1 - t) ** 0.7 + 0.002) for t in np.linspace(0, 1, 8)]
    beard = tube('beard', pts, 0.01, 8, 'beard', radii)
    beard.data.transform(Matrix.Translation(-pts[3]) )
    beard.data.transform(Matrix.Diagonal((1.25, 0.8, 1.0, 1.0)))
    beard.data.transform(Matrix.Translation(pts[3]))
    o = join([beard] + moustache(ctx, 'moust', mouth, nose, up=1.0), 'beard_pointed')
    set_aux(o, [(0.5, 0.5, 0)] * len(o.data.vertices))
    rigid_weight(o, 'head')
    return finish(o, ctx, weights=None)


@garment('moustache', 'beard', MEN, 'man', 'moustache only', layer=0)
def g_moustache(ctx, ref):
    mouth, chin, nose = face_points(ctx)
    o = join(moustache(ctx, 'moust', mouth, nose, up=0.4, size=1.1), 'moustache')
    set_aux(o, [(0.5, 0.5, 0)] * len(o.data.vertices))
    rigid_weight(o, 'head')
    return finish(o, ctx, weights=None)


@garment('beard_full', 'beard', MEN, 'man', 'full rounded spade beard with moustache (older men)', layer=0)
def g_beard_full(ctx, ref):
    mouth, chin, nose = face_points(ctx)
    k = ctx.k
    parts = []
    # a broad rounded spade: three overlapping tapered wedges (centre and the two jaw lines)
    for sx, w0, dz in ((0.0, 0.030, 0.0), (1.0, 0.018, 0.012), (-1.0, 0.018, 0.012)):
        top = mouth + Vector((0.030 * sx * k, 0.010 * k + 0.012 * abs(sx) * k, -0.008 * k + dz * k))
        tip = chin + Vector((0.012 * sx * k, -0.012 * k, -0.050 * k + dz * k))
        n = 8
        pts = [top.lerp(tip, t) + Vector((0, -0.012 * k * math.sin(math.pi * t), 0)) for t in np.linspace(0, 1, n)]
        radii = [k * (w0 * (1 - t ** 1.6) ** 0.6 + 0.003) for t in np.linspace(0, 1, n)]
        bd = tube('beard%d' % len(parts), pts, 0.01, 8, 'beard', radii)
        c = pts[n // 2]
        bd.data.transform(Matrix.Translation(-c))
        bd.data.transform(Matrix.Diagonal((1.2, 0.75, 1.0, 1.0)))
        bd.data.transform(Matrix.Translation(c))
        parts.append(bd)
    o = join(parts + moustache(ctx, 'moust', mouth, nose, up=-0.2, size=1.15), 'beard_full')
    set_aux(o, [(0.5, 0.5, 0)] * len(o.data.vertices))
    rigid_weight(o, 'head')
    return finish(o, ctx, weights=None)


# --------------------------------------------------------------------------
# the stage
# --------------------------------------------------------------------------
def build_all(only=None, bodies=None):
    ctxs = {bid: Ctx(bid) for bid in BODY_ORDER if bpy.data.objects.get(f'rig.{bid}')}
    report = {}
    for gname, spec in sorted(G.items(), key=lambda kv: kv[1]['layer']):
        if only and gname not in only:
            continue
        ref = ctxs[spec['ref']]
        order = [spec['ref']] + [b for b in spec['bodies'] if b != spec['ref']]
        if spec['ref'] not in spec['bodies']:
            order = order[1:]
        sizes = {}
        for bid in order:
            if bid not in ctxs or (bodies and bid not in bodies):
                continue
            ctx = ctxs[bid]
            before = set(bpy.data.objects)
            res = spec['fn'](ctx, ref)
            o = res if not isinstance(res, (list, tuple)) else join(list(res), gname)
            name = f'{gname}.{bid}'
            o.name = o.data.name = name
            for extra in set(bpy.data.objects) - before - {o}:
                if extra.type == 'MESH' and extra.users_collection and not extra.name.startswith(('h_', 'body', 'eye')):
                    log('  stray object', extra.name)
            clean_weights(o, ctx.bones)
            armature_to(o, ctx.rig)
            ensure_aux(o)
            dye_from_parts(o)
            o['garment'] = gname
            o['body_id'] = bid
            o['slot'] = spec['slot']
            to_coll(o, f'G.{gname}')
            sizes[bid] = (len(o.data.vertices), len(o.data.polygons))
        if len(set(sizes.values())) > 1:
            log('  WARNING topology differs for', gname, sizes)
        report[gname] = sizes
        first = next(iter(sizes.values())) if sizes else (0, 0)
        log('garment %-13s %-9s bodies %d  verts %5d faces %5d' % (gname, spec['slot'], len(sizes), first[0], first[1]))
    return report


def stage_garments(only=None):
    rep = build_all(only)
    from .props import build_props
    build_props()
    bpy.context.scene['garments'] = json.dumps({g: dict(slot=G[g]['slot'], bodies=list(rep.get(g, {})), ref=G[g]['ref'],
                                                       desc=G[g]['desc']) for g in G})
