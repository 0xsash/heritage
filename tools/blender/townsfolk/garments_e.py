# BELFORT townsfolk kit - phase E: women's own clothes, more for the men, new hair, beards, hats, mantles, eyepatch.
#
# Imported at the end of garments.py: the builders register into the same table (G) with the same rules (cut on a
# reference body so every fitted copy shares one topology; parametric pieces on fixed grids). The women's pieces are
# designed from Brabant dress of the 1640s and 50s (Teniers, Brouwer, the market scenes): a jak (fitted jacket with a
# flared basque) or the laced bodice, a rok (overskirt) hitched up at the sides over an onderrok (petticoat) for
# riding and walking, a schort (apron), a wide linen kraag; none of them is a man's piece refitted.

import bpy, bmesh, math
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from . import garments as GM
from .garments import (garment, G, MEN, WOMEN, ADULTS, UP, FRONT, inflate_n, subdivide, relax, solidify, fix_normals_out,
                       finish, join, blend_weights, mix_weights, skirt_weights, outward_from_legs, torso_cut, cuff_ring,
                       buttons, drape_band, skirt_shape, head_centre, head_radius, head_shell, drape_rows, hat_place,
                       lathe_ellipse, deg, cloak_chain_weights, hair_cap, hanging_tail, tail_weights, outer_layers,
                       hair_finish, lock_mesh, face_points, moustache, tube, set_keep, keep_boundary, bvh_sub, grid_faces,
                       torso_surface, R_cloak_fold, ring_out, flatten_sole, snap_out, swept_bulge, back_surface)
from .common import (log, get_bm, put_bm, dup, inflate, smooth_boundary, rim, bvh_of, transfer_weights, rigid_weight,
                     clean_weights, set_aux, ensure_aux, lathe_mesh, torus_mesh, rounded_box, place, convex_ring,
                     ring_frame, strap_mesh, smoothstep, new_mesh_obj, set_part, cut_by_ref, w_arm, co_array, set_co)

WOMEN_E = WOMEN + ['woman_lean']          # the heroine's three builds and the old woman
MEN_E = MEN
HERO_F = ['woman', 'woman_stout', 'woman_lean']
HERO_M = ['man', 'man_young', 'man_stout']
ADULTS_E = ADULTS + ['woman_lean']

# the existing pieces that any adult woman can wear fit the new body too
for _g in ('shoes', 'clogs', 'bodice', 'kerchief', 'skirt', 'apron', 'coif', 'mantle', 'hair_bun', 'hair_braid'):
    if _g in G and 'woman_lean' not in G[_g]['bodies']:
        G[_g]['bodies'].append('woman_lean')

# what the hero's mantle and the plaits are laid over (the union of every outer layer the body can wear)
GM.TOPS = GM.TOPS + ('jak', 'kraag_f', 'rok', 'onderrok', 'schort', 'waist_sash', 'casaque', 'jerkin', 'kraag_m')


def push_out(o, objs, gap):
    """Move every vertex of o that lies inside (or closer than gap to) the outermost surface of objs out along
    that surface's normal (for loose locks, curls and the basque over the skirts)."""
    bv = bvh_of(objs)
    co = co_array(o)
    for i, p in enumerate(co):
        q = Vector(p)
        loc, n, _, d = bv.find_nearest(q)
        if loc is None:
            continue
        side = (q - loc).dot(n)
        if side < gap:
            co[i] = (loc + n * gap)[:]
    set_co(o, co)


def push_out_radial(o, objs, gap, centre_y=None):
    """Like push_out, for skirts and coat skirts: each vertex is compared with the OUTERMOST surface of objs along
    the horizontal ray from the body's axis through it (robust where several layers lie close together)."""
    bv = bvh_of(objs)
    co = co_array(o)
    for i, p in enumerate(co):
        q = Vector(p)
        c = Vector((0.0, centre_y if centre_y is not None else 0.0, q.z))
        d = Vector((q.x - c.x, q.y - c.y, 0.0))
        if d.length < 1e-5:
            continue
        d.normalize()
        hit, _, _, _ = bv.ray_cast(c + d * 0.8, -d, 0.8)
        if hit is None:
            continue
        need = (hit - c).length + gap
        have = (q - c).length
        if have < need:
            co[i] = (q + d * (need - have))[:]
    set_co(o, co)


# --------------------------------------------------------------------------
# WOMEN: skirts
# --------------------------------------------------------------------------
def az_front(ctx, co):
    return math.atan2(co.x, -(co.y - ctx.hip.y * 0.5))


@garment('onderrok', 'legs', WOMEN_E, 'woman', 'petticoat (onderrok): full and pleated, to the lower calf, worn under the hitched rok', layer=0)
def g_onderrok(ctx, ref):
    o = dup(ctx.S, 'onderrok')
    rw, ra = ref.waist_z, ref.ank.z
    cut_by_ref(o, ref.S, lambda co, w: max(co.z - (rw - 0.02), (ra + 0.10) - co.z))
    subdivide(o, 1)
    skirt_shape(ctx, o, extra=0.0, drop=0.02, flare=0.16, pleats=0.009)
    relax(o, 1, 0.3)
    rim(o, 0.006 * ctx.k, inward=0.004 * ctx.k)
    set_part(o, 'wool')
    o = finish(o, ctx, 'S')
    wz = ctx.waist_z
    zmin = min(v.co.z for v in o.data.vertices)
    set_aux(o, [((wz - v.co.z) / max(wz - zmin, 1e-3), math.atan2(v.co.x, -v.co.y), 0) for v in o.data.vertices])
    blend_weights(o, skirt_weights(ctx, ctx.waist_z, zmin, follow=0.92, calf=0.35))
    return o


def rok_hem(ref, az):
    """Hem height of the hitched overskirt on the reference body: long behind, gathered up at the front corners."""
    a = abs(math.degrees(az))
    kz = ref.knee.z
    return float(np.interp(a, [0, 30, 60, 95, 130, 180], [kz + 0.03, kz + 0.04, kz - 0.01, kz - 0.10, kz - 0.20, kz - 0.26]))


@garment('rok', 'legs', WOMEN_E, 'woman', 'the rok: woollen overskirt gathered at the waist and hitched up at the front corners '
         '(opgeschort) over the onderrok, falling long behind', layer=0)
def g_rok(ctx, ref):
    o = dup(ctx.S, 'rok')
    rw = ref.waist_z
    cut_by_ref(o, ref.S, lambda co, w: max(co.z - (rw - 0.015), rok_hem(ref, az_front(ref, co)) - co.z))
    subdivide(o, 1)
    skirt_shape(ctx, o, extra=0.018, drop=0.03, flare=0.20, pleats=0.011)
    # the hitched-up cloth bunches at the hips where it is tucked into the waistband
    k = ctx.k
    wz, hz = ctx.waist_z, ctx.hip.z
    bm = get_bm(o)
    bm.normal_update()
    for v in bm.verts:
        a = abs(math.degrees(az_front(ctx, v.co)))
        swag = math.exp(-((a - 70) / 32) ** 2) * smoothstep(wz - 0.02 * k, wz - 0.10 * k, v.co.z) * smoothstep(hz - 0.32 * k, hz - 0.05 * k, v.co.z)
        d = outward_from_legs(ctx, v.co)
        v.co += d * (0.028 * k * swag) + v.normal * (0.006 * k * swag * math.sin(a * 0.35))
    put_bm(bm, o)
    relax(o, 1, 0.25)
    rim(o, 0.011 * k, inward=0.006 * k)
    set_part(o, 'wool')
    o = finish(o, ctx, 'S')
    zmin = min(v.co.z for v in o.data.vertices)
    set_aux(o, [((wz - v.co.z) / max(wz - zmin, 1e-3), math.atan2(v.co.x, -v.co.y), 1.0) for v in o.data.vertices])
    blend_weights(o, skirt_weights(ctx, ctx.waist_z, zmin, follow=0.92, calf=0.25))
    return o


@garment('schort', 'apron', WOMEN_E, 'woman', 'the schort: a short working apron of linen over the rok, tied at the waist', layer=1)
def g_schort(ctx, ref):
    o = dup(ctx.S, 'schort')
    rw, kz = ref.waist_z, ref.knee.z
    cut_by_ref(o, ref.S, lambda co, w: max(abs(az_front(ref, co)) - 0.85, co.z - (rw - 0.03), (kz - 0.12) - co.z))
    subdivide(o, 1)
    skirt_shape(ctx, o, extra=0.034, drop=0.03, flare=0.20, pleats=0.004)
    relax(o, 1, 0.3)
    rok = bpy.data.objects.get(f'rok.{ctx.bid}')
    if rok is not None:
        push_out_radial(o, [rok], 0.007 * ctx.k, ctx.hip.y * 0.5)
    relax(o, 1, 0.2)
    solidify(o, 0.003 * ctx.k)
    set_part(o, 'linen_d')
    o = finish(o, ctx, 'S')
    blend_weights(o, skirt_weights(ctx, ctx.waist_z, kz - 0.12, follow=0.85))
    c = Vector((0, ctx.hip.y * 0.5, ctx.waist_z - 0.03 * ctx.k))
    under = [x for x in (rok, o) if x is not None]
    pts, ln = convex_ring(bvh_sub(under, lambda p: abs(p.z - c.z) < 0.10), c, UP, count=40)
    band = strap_mesh('schort_band', pts, ln, UP, c, 0.024 * ctx.k, 0.003, 0.003, 'linen_d')
    finish(band, ctx)
    return join([o, band], 'schort')


# --------------------------------------------------------------------------
# WOMEN: the jak (riding jacket with a flared basque), the wide kraag, a waist sash
# --------------------------------------------------------------------------
@garment('jak', 'torso', WOMEN_E, 'woman', 'the jak: a woman\'s fitted jacket, buttoned, with full sleeves, wide turned-back cuffs '
         '(accent) and a flared basque over the hips', layer=1)
def g_jak(ctx, ref):
    k = ctx.k
    up = dup(ctx.T, 'jak_up')
    cut_by_ref(up, ref.T, torso_cut(ref, neck_drop=0.010, bottom=ref.waist_z - 0.035, sleeve_to=0.040))
    smooth_boundary(up, 2)
    subdivide(up, 1)
    sh = ctx.sh

    def puff(co, n):
        af = ctx.along_fore(co)
        arm = abs(co.x) > 0.20 * k
        # sleeves full from the shoulder to below the elbow, gathered at the cuff
        p = smoothstep(0.06, 0.20, af) * (1.0 - 0.5 * smoothstep(0.32, 0.50, af)) if arm else 0.0
        top = math.exp(-((Vector((abs(co.x), co.y, co.z)) - sh).length / (0.09 * k)) ** 2) if arm else 0.0
        return k * (0.008 + 0.024 * p + 0.014 * top)
    inflate_n(up, puff, smooth_iter=3)
    rim(up, 0.006 * k, inward=0.005 * k)
    set_part(up, 'wool')
    up = finish(up, ctx)
    # the basque: from the waist over the skirts, flaring, open at the centre front
    lo = dup(ctx.S, 'jak_lo')
    rw = ref.waist_z
    cut_by_ref(lo, ref.S, lambda co, w: max(co.z - (rw - 0.025), (rw - 0.16) - co.z,
                                            (0.010 - abs(co.x)) if co.y < ref.hip.y else -1.0))
    subdivide(lo, 1)
    wz = ctx.waist_z
    bm = get_bm(lo)
    bm.normal_update()
    for v in bm.verts:
        t = smoothstep(wz - 0.02 * k, wz - 0.16 * k, v.co.z)
        d = outward_from_legs(ctx, v.co)
        v.co += v.normal * (0.010 * k) + d * (0.030 * k * t ** 1.2)
    put_bm(bm, lo)
    under = outer_layers(ctx, ('rok', 'onderrok', 'skirt', 'schort', 'apron'))
    if under:
        push_out_radial(lo, under, 0.010 * k, ctx.hip.y * 0.5)
    relax(lo, 1, 0.3)
    rim(lo, 0.006 * k, inward=0.004 * k)
    set_part(lo, 'wool')
    lo = finish(lo, ctx, 'S')
    blend_weights(lo, skirt_weights(ctx, ctx.waist_z, wz - 0.16 * k, follow=0.35))
    cuffs = cuff_ring(ctx, 'jak_cuff', 0.045 * k, 0.060 * k, 0.010 * k, 'acc', [up], flare=0.016 * k, count=12)
    for c in cuffs:
        finish(c, ctx)
    bts = buttons(ctx, 'jbtn', [up], ctx.neck.z - 0.075 * k, ctx.waist_z - 0.02 * k, 7, 0.0068 * k)
    for b in bts:
        finish(b, ctx)
    o = join([up, lo] + cuffs + bts, 'jak')
    set_aux(o, [(0.0, 0.0, 0.0)] * len(o.data.vertices))
    return o


@garment('kraag_f', 'collar', WOMEN_E, 'woman', 'wide flat linen collar (platte kraag) over the shoulders, worn on the jak or the bodice', layer=1)
def g_kraag_f(ctx, ref):
    under = outer_layers(ctx, ('jak', 'bodice'))
    c = Vector((0, ctx.neck.y + 0.006, ctx.neck.z - 0.006 * ctx.k))

    def depth(a):
        aa = abs(math.atan2(math.sin(a), math.cos(a)))
        return 0.14 + 0.065 * smoothstep(0.2, 1.3, aa) - 0.01 * smoothstep(2.2, 3.1, aa)
    o = drape_band(ctx, 'kraag_f', under + [ctx.body], c, Vector((0, -0.3, 1)), depth, count=44, rows=6,
                   gap=0.009 * ctx.k, slope=1.22, open_front=0.06, lift=0.006)
    set_part(o, 'linen')
    return finish(o, ctx)


@garment('waist_sash', 'sash', HERO_F, 'woman', 'a silk sash round the waist, knotted at the left hip with two hanging ends', layer=2)
def g_waist_sash(ctx, ref):
    k = ctx.k
    under = outer_layers(ctx, ('jak', 'bodice', 'rok', 'onderrok', 'skirt'))
    c = Vector((0, ctx.hip.y * 0.6, ctx.waist_z - 0.012 * k))
    pts, ln = convex_ring(bvh_sub(under, lambda p: abs(p.z - c.z) < 0.08 and abs(p.x) < 0.24 * k), c, UP, count=44)
    band = strap_mesh('wsash_band', pts, ln, UP, c, 0.050 * k, 0.004, 0.004, 'sash')
    i0 = min(range(len(pts)), key=lambda i: abs(math.atan2(pts[i].x, -(pts[i].y - c.y)) - 1.25))
    kp = pts[i0] + (pts[i0] - c).normalized() * 0.012
    knot = rounded_box('wsash_knot', (0.055 * k, 0.035 * k, 0.05 * k), 'sash', roundness=0.7)
    knot.data.transform(Matrix.Translation(kp))
    bvc = bvh_of(under)
    tails = []
    for e, (dx, length, w) in enumerate(((-0.018, 0.34, 0.052), (0.020, 0.28, 0.048))):
        verts = []
        rows = 8
        for j in range(rows):
            t = j / (rows - 1)
            q = kp + Vector((dx * k + 0.012 * t * k, 0, -length * k * t))
            loc, nn, _, _ = bvc.find_nearest(q)
            if loc is not None and (q - loc).dot(nn) < 0.012:
                q = loc + nn * 0.012
            side = (pts[i0] - c).normalized().cross(UP) * (w * k * (1.0 + 0.3 * t) / 2)
            verts += [q - side, q + side]
        faces = [(2 * j, 2 * j + 1, 2 * j + 3, 2 * j + 2) for j in range(rows - 1)]
        tl = new_mesh_obj(f'wsash_tail{e}', verts, faces, 'sash')
        fix_normals_out(tl, lambda p: Vector((0, ctx.hip.y, p.z)))
        solidify(tl, 0.003)
        tails.append(tl)
    o = join([band, knot] + tails, 'waist_sash')
    transfer_weights(o, ctx.S, ctx.bones)
    mix_weights(o, lambda co: smoothstep(ctx.waist_z - 0.04 * k, ctx.waist_z - 0.25 * k, co.z),
                lambda co: {'pelvis': 0.6, 'thigh_l': 0.4})
    return finish(o, ctx, weights=None)


@garment('boots_f', 'feet', HERO_F, 'woman', 'a woman\'s soft riding boots to the calf, laced at the front, no turned-down cuff', layer=0)
def g_boots_f(ctx, ref):
    o = dup(ctx.T, 'boots_f')
    rk = ref.knee
    cut_by_ref(o, ref.T, lambda co, w: max(co.z - (rk.z - 0.12), w_arm(w) - 0.3))
    subdivide(o, 1)
    kz = ctx.knee.z
    inflate_n(o, lambda co, n: ctx.k * (0.006 + 0.004 * smoothstep(kz - 0.25, kz - 0.12, co.z)), smooth_iter=2)
    flatten_sole(o, ctx, -0.002)
    rim(o, 0.005 * ctx.k)
    set_part(o, 'leather')
    o = finish(o, ctx)
    set_aux(o, [(v.co.z / max(kz - 0.12 * ctx.k, 0.1), 0, 0) for v in o.data.vertices])
    return o


# --------------------------------------------------------------------------
# MEN: a casaque (loose riding coat) and a leather jerkin, both over the doublet
# --------------------------------------------------------------------------
@garment('casaque', 'coat', MEN_E, 'man', 'the casaque: a loose riding coat to mid-thigh over the doublet, open in front, '
         'with wide sleeves and turned-back cuffs (accent)', layer=1)
def g_casaque(ctx, ref):
    k = ctx.k
    up = dup(ctx.T, 'casaque_up')
    cut_by_ref(up, ref.T, torso_cut(ref, neck_drop=0.030, bottom=ref.waist_z - 0.05, sleeve_to=0.060, open_front=0.035))
    smooth_boundary(up, 2)
    subdivide(up, 1)
    inflate_n(up, lambda co, n: k * (0.026 + 0.012 * smoothstep(0.30, 0.06, ctx.along_fore(co)) * (abs(co.x) > 0.24 * k)),
              smooth_iter=3)
    rim(up, 0.007 * k, inward=0.005 * k)
    set_part(up, 'wool')
    up = finish(up, ctx)
    lo = dup(ctx.S, 'casaque_lo')
    rw, rh = ref.waist_z, ref.hip.z
    cut_by_ref(lo, ref.S, lambda co, w: max(co.z - (rw - 0.04), (rh - 0.30) - co.z,
                                            (0.035 - abs(co.x)) if co.y < ref.hip.y else -1.0))
    subdivide(lo, 1)
    wz, hz = ctx.waist_z, ctx.hip.z
    bm = get_bm(lo)
    bm.normal_update()
    for v in bm.verts:
        t = smoothstep(wz, hz - 0.30 * k, v.co.z)
        d = outward_from_legs(ctx, v.co)
        a = math.atan2(v.co.x, -v.co.y)
        v.co += v.normal * (0.034 * k) + d * (0.060 * t * k) + d * (0.005 * k * t * math.sin(a * 7))
    put_bm(bm, lo)
    under = outer_layers(ctx, ('doublet', 'breeches'))
    push_out_radial(lo, under, 0.020 * k, ctx.hip.y * 0.5)
    relax(lo, 1, 0.3)
    rim(lo, 0.007 * k)
    set_part(lo, 'wool')
    lo = finish(lo, ctx, 'S')
    blend_weights(lo, skirt_weights(ctx, ctx.waist_z, hz - 0.30 * k, follow=0.55))
    cuffs = cuff_ring(ctx, 'cas_cuff', 0.065 * k, 0.075 * k, 0.020 * k, 'acc', [up], flare=0.016 * k, count=12)
    for c in cuffs:
        finish(c, ctx)
    o = join([up, lo] + cuffs, 'casaque')
    return o


@garment('jerkin', 'coat', MEN_E, 'man', 'a sleeveless leather jerkin to the hip with a tabbed skirt, over the doublet', layer=1)
def g_jerkin(ctx, ref):
    k = ctx.k
    up = dup(ctx.T, 'jerkin_up')
    cut_by_ref(up, ref.T, torso_cut(ref, neck_drop=0.020, bottom=ref.hip.z - 0.06, sleeve_to=None))
    smooth_boundary(up, 2)
    subdivide(up, 1)
    inflate(up, 0.020 * k, smooth_iter=3)
    bm = get_bm(up)
    zt = ctx.waist_z - 0.03 * k
    for v in bm.verts:
        if v.co.z < zt and abs(v.co.x) < 0.27 * k:
            t = smoothstep(zt, ctx.hip.z - 0.06 * k, v.co.z)
            d = Vector((v.co.x, v.co.y - ctx.hip.y, 0))
            if d.length > 1e-6:
                v.co += d.normalized() * 0.028 * k * t
    put_bm(bm, up)
    rim(up, 0.007 * k)
    set_part(up, 'leather')
    o = finish(up, ctx)
    bts = buttons(ctx, 'jkbtn', [o], ctx.neck.z - 0.09 * k, ctx.waist_z - 0.02 * k, 5, 0.007 * k)
    for b in bts:
        finish(b, ctx)
    o = join([o] + bts, 'jerkin')
    set_aux(o, [(0.0, 0.0, 0.0)] * len(o.data.vertices))
    return o


# hair, beards, hats, the two new mantles and the eyepatch
from . import garments_e2  # noqa: E402,F401
