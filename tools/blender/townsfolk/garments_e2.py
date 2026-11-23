# BELFORT townsfolk kit - phase E, part 2: hair that reads as hair, more beards and hats, the short and the hooded
# mantle, the eyepatch. Registers into garments.G like everything else.

import bpy, bmesh, math
import numpy as np
from mathutils import Vector, Matrix
from . import garments as GM
from .garments import (garment, MEN, UP, relax, solidify, fix_normals_out, finish, join, head_centre, head_radius,
                       head_shell, drape_rows, hat_place, deg, hair_cap, hanging_tail, tail_weights, outer_layers,
                       hair_finish, lock_mesh, face_points, moustache, tube, set_keep, bvh_sub, grid_faces, back_surface, onto_face)
from .garments_e import push_out, HERO_F, HERO_M, ADULTS_E
from .common import (get_bm, put_bm, bvh_of, transfer_weights, rigid_weight, set_aux, lathe_mesh, torus_mesh, rounded_box,
                     place, convex_ring, strap_mesh, smoothstep, new_mesh_obj)

MEN_E = MEN


# --------------------------------------------------------------------------
# HAIR: a shell with a lower, softer hairline, carrying sculpted locks that lie on it and run past the hairline,
# a few loose strands, and a proper back; long styles hang a curtain of locks over whatever is worn.
# --------------------------------------------------------------------------
def hairline_soft(front=34.0, temple=26.0, ear=8.0, nape=-38.0):
    """A lower hairline than the swept-back styles: over the forehead, down at the temples, round behind the ear,
    down to the nape."""
    def f(a):
        return float(np.interp(abs(a), [0, 25, 50, 75, 95, 120, 150, 180],
                               [front, front - 3, temple, ear + 8, ear, (ear + nape) / 2 + 2, nape + 4, nape]))
    return f


def soft_bulge(vol=1.0, part_w=0.0, crown=1.0, side=1.0, ridges=1.0, nape=0.0):
    """Volume over the crown and the sides; a parting groove (part_w > 0); soft ridges flowing back."""
    def f(az, e):
        a = math.atan2(math.sin(az), math.cos(az))
        sd = math.exp(-((abs(a) - 1.5) / 0.7) ** 2) * smoothstep(-0.45, 0.25, e)
        cr = smoothstep(0.2, 1.1, e)
        back = math.exp(-((abs(a) - math.pi) / 0.9) ** 2) * smoothstep(0.6, -0.4, e)
        pt = math.exp(-(a / max(part_w, 1e-3)) ** 2) * smoothstep(0.35, 0.9, e) if part_w > 0 else 0.0
        rg = math.sin(a * 18.0 + 2.0 * e) * smoothstep(1.4, 0.3, e)
        return vol * (0.006 * cr * crown + 0.007 * sd * side + 0.006 * back * nape) - 0.004 * pt + 0.0014 * rg * ridges
    return f


def lock_rows_on(rows, hc, us, step, flow, a_keep, jitter=0):
    """Roots on the hair shell rows (rows[j][i], crown first): us = fractions down the shell (1 = hairline)."""
    nr, nu = len(rows), len(rows[0])
    roots = []
    for ri, u in enumerate(us):
        j = min(nr - 1, max(0, int(round(u * (nr - 1)))))
        off = (ri * jitter) % step
        for i in range(off, nu, step):
            a = math.degrees(2 * math.pi * i / nu)
            a = a - 360 if a > 180 else a
            if not a_keep(a):
                continue
            p = rows[j][i]
            roots.append((p, (p - hc).normalized(), flow(a, u, p)))
    return roots


def flow_back(part=True):
    """From the brow back over the crown, then down the sides and the back (from a centre parting or not)."""
    def f(a, u, p):
        s = 1.0 if a >= 0 else -1.0
        aa = abs(a)
        if aa < 40:
            return Vector((0.55 * s if part else 0.15 * s, 0.9, -0.15))
        return Vector((0.45 * s * max(0.0, math.cos(math.radians(aa))), 0.25 + 0.5 * (aa / 180.0), -1.0))
    return f


def flow_down(fringe=True, swirl=0.0):
    """Hair combed down from the crown: forward over the brow (a fringe), down at the sides and back."""
    def f(a, u, p):
        aa = math.radians(a)
        out = Vector((math.sin(aa), -math.cos(aa), 0.0))
        if abs(a) < 45 and fringe:
            return out * 0.8 + Vector((swirl, 0, -0.6))
        return out * 0.35 + Vector((0, 0, -1.0))
    return f


def curl_tube(name, top, length, r_helix, turns, thick, part='hair', side=Vector((1, 0, 0))):
    """A corkscrew ringlet hanging from top."""
    down = Vector((0, 0, -1))
    side = (side - down * side.dot(down)).normalized()
    fw = down.cross(side).normalized()
    n = max(10, int(turns * 8))
    pts, radii = [], []
    for j in range(n):
        t = j / (n - 1)
        ang = 2 * math.pi * turns * t
        rr = r_helix * (0.6 + 0.4 * t)
        pts.append(top + down * (length * t) + side * (math.cos(ang) * rr) + fw * (math.sin(ang) * rr))
        radii.append(thick * (1.0 - 0.55 * t))
    return tube(name, pts, thick, 6, part, radii)


def braid_path(name, pts, r, part='hair', lobes_per_m=55.0):
    """Three twisted strands along a path: reads as a plait from any side."""
    out = []
    n = len(pts)
    for s in range(3):
        sp = []
        acc = 0.0
        for i, p in enumerate(pts):
            if i:
                acc += (pts[i] - pts[i - 1]).length
            t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
            a = t.cross(Vector((0.3, 0.2, 1.0))).normalized()
            b = t.cross(a)
            ph = 2 * math.pi * (acc * lobes_per_m / 3.0) + s * 2 * math.pi / 3
            sp.append(p + (a * math.cos(ph) + b * math.sin(ph)) * r * 0.55)
        out.append(tube(f'{name}{s}', sp, r * 0.62, 6, part))
    return out


def resample(pts, n):
    d = [0.0]
    for i in range(1, len(pts)):
        d.append(d[-1] + (pts[i] - pts[i - 1]).length)
    out = []
    for j in range(n):
        x = d[-1] * j / (n - 1)
        i = max(1, min(len(pts) - 1, int(np.searchsorted(d, x))))
        t = (x - d[i - 1]) / max(d[i] - d[i - 1], 1e-9)
        out.append(pts[i - 1].lerp(pts[i], t))
    return out


def hair_curtain(ctx, name, rows, depth_fn, keep_az, surf_objs, gap=0.012, n_rows=5, flare=0.08):
    """Long hair hanging from the shell's hairline row at the back and sides."""
    nu = len(rows[0])
    start = [rows[-2][i].lerp(rows[-1][i], 0.6) for i in range(nu)]
    surf = bvh_of(surf_objs)
    low = drape_rows(ctx, start, surf, n_rows, depth_fn, mode='hang', gap=gap, flare=flare)
    allr = [start] + low
    verts = [p for r in allr for p in r]
    faces = []
    for j in range(len(allr) - 1):
        for i in range(nu):
            a = math.degrees(2 * math.pi * (i + 0.5) / nu)
            a = a - 360 if a > 180 else a
            if keep_az(a):
                i2 = (i + 1) % nu
                faces.append((j * nu + i, j * nu + i2, (j + 1) * nu + i2, (j + 1) * nu + i))
    o = new_mesh_obj(name, verts, faces, 'hair')
    bm = get_bm(o)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    put_bm(bm, o)
    relax(o, 1, 0.3)
    hc = head_centre(ctx)
    fix_normals_out(o, lambda p: Vector((hc.x, hc.y, min(p.z, hc.z))))
    solidify(o, 0.008 * ctx.k)
    return o, low


def conform(lk, shell, hc, k, lift=0.005, keep=0.25):
    """Lay locks down on the shell: anything standing further out than lift above it is pulled in (radially from the
    head centre), keeping a little of its relief, so the locks read as hair lying on the head, not spikes."""
    bv = bvh_of([shell])
    co = np.array([v.co[:] for v in lk.data.vertices])
    for i, p in enumerate(co):
        q = Vector(p)
        d = q - hc
        if d.length < 1e-6:
            continue
        dn = d.normalized()
        hit, _, _, _ = bv.ray_cast(hc, dn, 0.4)
        if hit is None:
            continue
        rs = (hit - hc).length
        r = d.length
        lim = rs + lift * k
        if r > lim:
            co[i] = (hc + dn * (lim + (r - lim) * keep))[:]
    lk.data.vertices.foreach_set('co', co.astype(np.float32).ravel())
    lk.data.update()


def hug(lk, objs, k, near=0.012, keep=0.3):
    """Locks below the shell (over the ears, the nape, the brow) lie against the head instead of flicking out."""
    bv = bvh_of(objs)
    co = np.array([v.co[:] for v in lk.data.vertices])
    for i, p in enumerate(co):
        q = Vector(p)
        loc, n, _, d = bv.find_nearest(q)
        if loc is None:
            continue
        side = (q - loc).dot(n)
        if side > near * k:
            co[i] = (loc + n * (near * k + (side - near * k) * keep))[:]
    lk.data.vertices.foreach_set('co', co.astype(np.float32).ravel())
    lk.data.update()


HANG_OVER = ('mantle', 'mantle_short', 'mantle_hood', 'huik', 'pelerine')


def hair2(ctx, name, hl, offset=0.011, bulge=None, locks=(), strands=0, strand_len=0.10, seed=1, curtain=None,
          extras=None, over=False):
    """locks: list of (us, step, length, width, droop, flow, a_keep). strands: loose strands at the temples / brow.
    curtain: (depth_fn, keep_az, lock_spec) for long hair. extras(ctx, rows, hc, hang_objs) -> objects (buns, plaits,
    curls). over: hang everything over the outer layers the body can wear (lies on them; floats a little without)."""
    k = ctx.k
    o, rows = hair_cap(ctx, name + '_shell', offset, hl, bulge=bulge)
    hc = head_centre(ctx)
    crown = hc + UP * 0.12 * k + Vector((0, 0.02, 0))
    parts = [o]
    hang = [ctx.body, ctx.T] + (outer_layers(ctx, GM.TOPS + HANG_OVER) if over else [])
    for li, (us, step, length, width, droop, flow, a_keep) in enumerate(locks):
        roots = lock_rows_on(rows, hc, us, step, flow, a_keep, jitter=step // 2 or 1)
        if roots:
            lk = lock_mesh(f'{name}_l{li}', roots, len(roots), seed + li * 7, 1.15 * length * k, 0.78 * width * k, droop, crown)
            conform(lk, o, hc, k)
            hug(lk, [ctx.body], k, near=0.016 + offset)
            push_out(lk, [ctx.body], 0.003 * k)
            parts.append(lk)
    if strands:
        rng = np.random.RandomState(seed + 99)
        roots = []
        nu = len(rows[0])
        for sidx in range(strands):
            sgn = 1 if sidx % 2 == 0 else -1
            a = sgn * (48 + 22 * rng.rand())
            i = int(round((a % 360) / 360.0 * nu)) % nu
            p = rows[-3][i]
            roots.append((p, (p - hc).normalized(), Vector((math.sin(math.radians(a)) * 0.6, -0.25, -1.0))))
        st = lock_mesh(f'{name}_st', roots, len(roots), seed + 51, strand_len * k, 0.018 * k, 0.9, crown, curl=0.2)
        hug(st, [ctx.body], k, near=0.010)
        push_out(st, [ctx.body], 0.004 * k)
        parts.append(st)
    if curtain:
        depth_fn, keep_az, cl = curtain
        cu, low = hair_curtain(ctx, name + '_cur', rows, depth_fn, keep_az, hang)
        parts.append(cu)
        if cl:
            nu = len(rows[0])
            roots = []
            for ri, u in enumerate(cl[0]):
                row = low[min(len(low) - 1, int(u * (len(low) - 1)))]
                for i in range(ri % cl[1], nu, cl[1]):
                    a = math.degrees(2 * math.pi * i / nu)
                    a = a - 360 if a > 180 else a
                    if not keep_az(a):
                        continue
                    p = row[i]
                    nrm = Vector((p.x - hc.x, p.y - hc.y, 0)).normalized()
                    roots.append((p + nrm * 0.004 * k, nrm, Vector((0, 0, -1)) + nrm * 0.1))
            if roots:
                lk = lock_mesh(name + '_cl', roots, len(roots), seed + 77, cl[2] * k, cl[3] * k, 0.2, crown)
                push_out(lk, hang, 0.006 * k)
                parts.append(lk)
    if extras:
        parts += extras(ctx, rows, hc, hang)
    return join(parts, name)


def hair2_finish(ctx, o, hanging=False):
    if hanging:
        tail_weights(ctx, o, ctx.neck.z - 0.12 * ctx.k)
        return finish(o, ctx, weights=None)
    return hair_finish(ctx, o)


def A_ALL(a):
    return True


# ---- women -----------------------------------------------------------------
@garment('hair_f_curls', 'hair', HERO_F, 'woman', '1640s fashion: centre parting, smooth over the crown, bunches of ringlets at both '
         'sides of the face and a small knot behind', layer=0)
def g_hair_f_curls(ctx, ref):
    k = ctx.k

    def extras(ctx, rows, hc, hang):
        out = []
        for sx in (1, -1):
            for ci, (dy, dz, ln) in enumerate(((0.000, 0.000, 0.10), (0.018, -0.006, 0.12), (-0.016, -0.004, 0.085),
                                               (0.034, -0.012, 0.105), (0.008, -0.020, 0.09))):
                top = hc + Vector((sx * 0.074 * k, (-0.010 + dy) * k, (-0.018 + dz) * k))
                out.append(curl_tube(f'curl{sx}{ci}', top, ln * k, 0.009 * k, 2.6, 0.0085 * k, side=Vector((sx, 0, 0))))
        knot = rounded_box('knot', (0.060 * k, 0.045 * k, 0.050 * k), 'hair', roundness=0.85, cuts=3)
        knot.data.transform(Matrix.Translation(hc + Vector((0, (ctx.hmax.y - hc.y) + 0.004 * k, -0.010 * k))))
        out.append(knot)
        for o in out:
            push_out(o, [ctx.body], 0.004 * k)
        return out
    o = hair2(ctx, 'hair_f_curls', hairline_soft(36, 28, 10, -36), 0.010, soft_bulge(1.0, 0.09, side=0.6),
              locks=[((0.45, 0.75), 3, 0.075, 0.060, 0.15, flow_back(), A_ALL)], strands=4, strand_len=0.07, seed=21,
              extras=extras)
    return hair2_finish(ctx, o)


@garment('hair_f_loose', 'hair', HERO_F, 'woman', 'long loose hair from a centre parting, down over the back to the shoulder blades, '
         'a few strands at the temples', layer=3)
def g_hair_f_loose(ctx, ref):
    def depth(az):
        a = abs(math.degrees(math.atan2(math.sin(az), math.cos(az))))
        return 0.08 + 0.22 * smoothstep(55, 120, a)
    o = hair2(ctx, 'hair_f_loose', hairline_soft(34, 26, 4, -34), 0.012, soft_bulge(1.2, 0.08),
              locks=[((0.4, 0.7, 0.95), 3, 0.085, 0.065, 0.45, flow_back(), A_ALL)], strands=6, strand_len=0.12, seed=22,
              curtain=(depth, lambda a: abs(a) > 62, ((0.15, 0.55, 0.9), 3, 0.12, 0.06)), over=True)
    return hair2_finish(ctx, o, hanging=True)


@garment('hair_f_twin', 'hair', HERO_F, 'woman', 'parted in the middle, two plaits from behind the ears down the back', layer=3)
def g_hair_f_twin(ctx, ref):
    k = ctx.k

    def extras(ctx, rows, hc, hang):
        out = []
        by = back_surface(hang)
        for sx in (1, -1):
            p = hc + Vector((sx * 0.058 * k, (ctx.hmax.y - hc.y) - 0.030 * k, -0.045 * k))
            pts = [p.copy()]
            for j in range(1, 16):
                z = p.z - 0.026 * k
                x = p.x + sx * 0.002 * k
                y = max(by(x, z, p.y - 0.02) + 0.020 * k, p.y - 0.02 * k)
                p = Vector((x, y, z))
                pts.append(p)
            out += braid_path(f'plait{sx}', resample(pts, 26), 0.016 * k)
            tie = torus_mesh(f'tie{sx}', 0.012 * k, 0.003 * k, 10, 4, 'acc')
            place(tie, pts[-2], Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
            out.append(tie)
        return out
    o = hair2(ctx, 'hair_f_twin', hairline_soft(36, 28, 8, -34), 0.010, soft_bulge(0.9, 0.09),
              locks=[((0.45, 0.8), 3, 0.075, 0.060, 0.25, flow_back(), A_ALL)], strands=4, strand_len=0.08, seed=23,
              extras=extras, over=True)
    return hair2_finish(ctx, o, hanging=True)


@garment('hair_f_crown', 'hair', HERO_F, 'woman', 'plaits wound round the head like a crown, soft over the brow', layer=0)
def g_hair_f_crown(ctx, ref):
    k = ctx.k

    def extras(ctx, rows, hc, hang):
        nu = 36
        el = deg(36)
        Rr = head_radius(ctx, nu, [el], smooth=3, ears=False)
        pts = []
        for i in range(nu + 1):
            az = 2 * math.pi * (i % nu) / nu
            e = el + deg(8) * math.cos(az)
            d = Vector((math.sin(az) * math.cos(e), -math.cos(az) * math.cos(e), math.sin(e)))
            pts.append(hc + d * (Rr[0, i % nu] + 0.022 * k))
        return braid_path('crownbraid', resample(pts, 60), 0.019 * k, lobes_per_m=40.0)
    o = hair2(ctx, 'hair_f_crown', hairline_soft(36, 28, 10, -34), 0.009, soft_bulge(0.8, 0.09),
              locks=[((0.55, 0.85), 3, 0.06, 0.055, 0.2, flow_back(), A_ALL)], strands=4, strand_len=0.08, seed=24,
              extras=extras)
    return hair2_finish(ctx, o)


@garment('hair_f_low', 'hair', HERO_F, 'woman', 'soft waves drawn back into a low knot at the nape, loose strands at the temples', layer=0)
def g_hair_f_low(ctx, ref):
    k = ctx.k

    def extras(ctx, rows, hc, hang):
        c = hc + Vector((0, (ctx.hmax.y - hc.y) - 0.004 * k, -0.065 * k))
        coil = torus_mesh('lowknot', 0.026 * k, 0.017 * k, 14, 8, 'hair')
        place(coil, c, Vector((1, 0, 0)), Vector((0, 0.3, -1)).normalized(), Vector((0, 1, 0.3)).normalized())
        mid = rounded_box('lowknot_c', (0.034 * k, 0.03 * k, 0.03 * k), 'hair', roundness=0.9, cuts=2)
        mid.data.transform(Matrix.Translation(c + Vector((0, 0.008 * k, 0))))
        return [coil, mid]
    o = hair2(ctx, 'hair_f_low', hairline_soft(33, 25, 6, -40), 0.012, soft_bulge(1.3, 0.0, side=1.3, nape=1.0),
              locks=[((0.3, 0.6, 0.9), 3, 0.085, 0.070, 0.35, flow_back(part=False), A_ALL)], strands=8, strand_len=0.11,
              seed=25, extras=extras)
    return hair2_finish(ctx, o)


@garment('hair_f_fringe', 'hair', HERO_F, 'woman', 'a short curled fringe over the brow (1640s), the rest drawn back into a bun', layer=0)
def g_hair_f_fringe(ctx, ref):
    k = ctx.k

    def extras(ctx, rows, hc, hang):
        out = []
        bun = rounded_box('bun', (0.072 * k, 0.055 * k, 0.06 * k), 'hair', roundness=0.85, cuts=3)
        bun.data.transform(Matrix.Translation(hc + Vector((0, (ctx.hmax.y - hc.y) + 0.010 * k, -0.005 * k))))
        out.append(bun)
        for o in out:
            push_out(o, [ctx.body], 0.004 * k)
        return out
    o = hair2(ctx, 'hair_f_fringe', hairline_soft(38, 28, 10, -34), 0.010, soft_bulge(0.9, 0.0),
              locks=[((0.4, 0.75), 3, 0.07, 0.06, 0.2, flow_back(part=False), lambda a: abs(a) > 40),
                     ((0.25, 0.55, 0.85), 2, 0.055, 0.05, 0.6, flow_down(True), lambda a: abs(a) <= 40)], strands=2,
              strand_len=0.08, seed=26, extras=extras)
    return hair2_finish(ctx, o)


@garment('hair_f_tail', 'hair', HERO_F, 'woman', 'drawn back and tied high with a ribbon (accent), a long tail down the back', layer=3)
def g_hair_f_tail(ctx, ref):
    k = ctx.k

    def extras(ctx, rows, hc, hang):
        start = Vector((0.0, ctx.hmax.y - 0.010 * k, hc.z + 0.010 * k))
        tl, pts = hanging_tail(ctx, 'ftail', start, 0.40 * k, 26,
                               lambda u: k * (0.024 + 0.010 * smoothstep(0.05, 0.3, u) - 0.022 * smoothstep(0.5, 1.0, u)),
                               hang, 0.006, braid=0.0, tie_at=0.06, tuft=0.02 * k)
        bow = rounded_box('bow', (0.06 * k, 0.012 * k, 0.03 * k), 'acc', roundness=0.6)
        bow.data.transform(Matrix.Translation(pts[2] + Vector((0, 0.014 * k, 0))))
        return [tl, bow]
    o = hair2(ctx, 'hair_f_tail', hairline_soft(36, 28, 10, -34), 0.009, soft_bulge(0.8, 0.0),
              locks=[((0.3, 0.6, 0.9), 3, 0.08, 0.06, 0.2, flow_back(part=False), A_ALL)], strands=4, strand_len=0.09,
              seed=27, extras=extras, over=True)
    return hair2_finish(ctx, o, hanging=True)


# ---- men -------------------------------------------------------------------
@garment('hair_m_curly', 'hair', HERO_M, 'man', 'thick curls to the shoulders, no parting (the cavalier\'s mane)', layer=0)
def g_hair_m_curly(ctx, ref):
    k = ctx.k

    def extras(ctx, rows, hc, hang):
        out = []
        rng = np.random.RandomState(31)
        for i in range(16):
            a = (55 + 125 * (i // 2) / 7.0) * (1 if i % 2 == 0 else -1)
            ar = math.radians(a)
            e = math.radians(-6 - 14 * rng.rand())
            d = Vector((math.sin(ar) * math.cos(e), -math.cos(ar) * math.cos(e), math.sin(e)))
            out.append(curl_tube(f'mc{i}', hc + d * (0.10 * k), (0.08 + 0.05 * rng.rand()) * k, 0.011 * k, 2.2, 0.011 * k,
                                 side=Vector((math.sin(ar), -math.cos(ar), 0))))
        for o in out:
            push_out(o, [ctx.body, ctx.T], 0.006 * k)
        return out
    o = hair2(ctx, 'hair_m_curly', hairline_soft(38, 28, 4, -30), 0.014, soft_bulge(1.6, 0.0, ridges=0.4),
              locks=[((0.2, 0.45, 0.7, 0.95), 3, 0.06, 0.07, 0.3, flow_down(False), A_ALL)], seed=31, extras=extras)
    return hair2_finish(ctx, o)


@garment('hair_m_lovelock', 'hair', HERO_M, 'man', 'long hair with a lovelock: one longer plaited lock on the left tied with a ribbon (accent)', layer=0)
def g_hair_m_lovelock(ctx, ref):
    k = ctx.k

    def depth(az):
        a = abs(math.degrees(math.atan2(math.sin(az), math.cos(az))))
        return 0.06 + 0.10 * smoothstep(55, 110, a)

    def extras(ctx, rows, hc, hang):
        top = hc + Vector((0.080 * k, -0.010 * k, -0.040 * k))
        pts = [top + Vector((0.004 * k * j, -0.002 * k * j, -0.022 * k * j)) for j in range(9)]
        out = braid_path('lovelock', resample(pts, 16), 0.010 * k)
        bow = rounded_box('llbow', (0.012 * k, 0.03 * k, 0.02 * k), 'acc', roundness=0.6)
        bow.data.transform(Matrix.Translation(pts[-2] + Vector((0.004 * k, 0, 0))))
        out.append(bow)
        for o in out:
            push_out(o, [ctx.body, ctx.T], 0.005 * k)
        return out
    o = hair2(ctx, 'hair_m_lovelock', hairline_soft(38, 28, 2, -30), 0.012, soft_bulge(1.1, 0.0),
              locks=[((0.3, 0.6, 0.9), 3, 0.085, 0.075, 0.5, flow_back(part=False), A_ALL)], strands=3, strand_len=0.09,
              seed=32, curtain=(depth, lambda a: abs(a) > 55, ((0.3, 0.8), 3, 0.08, 0.06)), extras=extras)
    return hair2_finish(ctx, o)


@garment('hair_m_shag', 'hair', HERO_M, 'man', 'unkempt hair to the jaw, a ragged fringe over the brow', layer=0)
def g_hair_m_shag(ctx, ref):
    o = hair2(ctx, 'hair_m_shag', hairline_soft(40, 28, 2, -32), 0.013, soft_bulge(1.3, 0.0, ridges=0.3),
              locks=[((0.1, 0.35, 0.6), 3, 0.085, 0.075, 0.45, flow_down(True, 0.25), A_ALL),
                     ((0.85,), 2, 0.07, 0.06, 0.7, flow_down(True, -0.2), A_ALL)], strands=5, strand_len=0.09, seed=33)
    return hair2_finish(ctx, o)


@garment('hair_m_swept', 'hair', HERO_M, 'man', 'swept straight back from the brow, falling to the collar behind', layer=0)
def g_hair_m_swept(ctx, ref):
    def depth(az):
        a = abs(math.degrees(math.atan2(math.sin(az), math.cos(az))))
        return 0.02 + 0.05 * smoothstep(90, 150, a)
    o = hair2(ctx, 'hair_m_swept', hairline_soft(40, 30, 6, -30), 0.012, soft_bulge(1.2, 0.0),
              locks=[((0.15, 0.4, 0.65, 0.9), 3, 0.09, 0.07, 0.25, flow_back(part=False), A_ALL)], strands=2,
              strand_len=0.10, seed=34, curtain=(depth, lambda a: abs(a) > 95, ((0.5,), 3, 0.06, 0.06)))
    return hair2_finish(ctx, o)


@garment('hair_m_fringe', 'hair', HERO_M, 'man', 'short hair combed forward into a straight fringe', layer=0)
def g_hair_m_fringe(ctx, ref):
    o = hair2(ctx, 'hair_m_fringe', hairline_soft(38, 28, 8, -34), 0.010, soft_bulge(0.9, 0.0),
              locks=[((0.1, 0.4, 0.7), 3, 0.065, 0.07, 0.3, flow_down(True), A_ALL)], seed=35)
    return hair2_finish(ctx, o)


# --------------------------------------------------------------------------
# BEARDS
# --------------------------------------------------------------------------
@garment('moustache_wide', 'beard', MEN_E, 'man', 'a wide moustache with upturned ends', layer=0)
def g_moustache_wide(ctx, ref):
    mouth, chin, nose = face_points(ctx)
    o = join(moustache(ctx, 'mw', mouth, nose, up=1.8, size=1.45), 'moustache_wide')
    set_aux(o, [(0.5, 0.5, 0)] * len(o.data.vertices))
    rigid_weight(o, 'head')
    return finish(o, ctx, weights=None)


@garment('beard_goatee', 'beard', MEN_E, 'man', 'a small tuft under the lower lip (mouche) and a thin moustache', layer=0)
def g_beard_goatee(ctx, ref):
    mouth, chin, nose = face_points(ctx)
    k = ctx.k
    top = mouth + Vector((0, 0.000, -0.012 * k))
    tip = top + Vector((0, -0.006 * k, -0.030 * k))
    pts = [top.lerp(tip, t) for t in np.linspace(0, 1, 6)]
    radii = [k * (0.008 * (1 - t) ** 0.6 + 0.0015) for t in np.linspace(0, 1, 6)]
    pts = onto_face(ctx, pts, radii)
    tuft = tube('tuft', pts, 0.008, 6, 'beard', radii)
    o = join([tuft] + moustache(ctx, 'mg', mouth, nose, up=1.2, size=0.95), 'beard_goatee')
    push_out(o, [ctx.body], 0.002 * k)
    set_aux(o, [(0.5, 0.5, 0)] * len(o.data.vertices))
    rigid_weight(o, 'head')
    return finish(o, ctx, weights=None)


@garment('beard_short', 'beard', MEN_E, 'man', 'a short, close full beard along the jaw, with a moustache', layer=0)
def g_beard_short(ctx, ref):
    mouth, chin, nose = face_points(ctx)
    k = ctx.k
    hc = head_centre(ctx)
    dm = mouth - hc
    em = math.degrees(math.asin(max(-1, min(1, dm.z / dm.length))))
    el = [deg(a) for a in (0, -6, -12, -18, -24, -30, -36, -42, -48, -54, -60, -66, -72)]

    def keep(az, e):
        a, ed = abs(math.degrees(az)), math.degrees(e)
        if a > 105:
            return False
        if ed > -6 - 24 * smoothstep(75, 25, a):           # up to the sideburns, lower across the cheeks
            return False
        if a < 26 and abs(ed - em) < 6:                    # the lips stay bare
            return False
        return True
    verts, faces, rows = head_shell(ctx, 'beard_short', 0.006, el, nu=40, keep=keep, cap=False, ears=False, smooth=2)
    o = new_mesh_obj('beard_short', verts, faces, 'beard')
    bm = get_bm(o)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    put_bm(bm, o)
    relax(o, 2, 0.4)
    push_out(o, [ctx.body], 0.004 * k)
    fix_normals_out(o, lambda p: hc)
    solidify(o, 0.004 * k)
    set_keep(o)
    o = join([o] + moustache(ctx, 'ms', mouth, nose, up=0.2, size=1.05), 'beard_short')
    set_aux(o, [(0.5, 0.5, 0)] * len(o.data.vertices))
    rigid_weight(o, 'head')
    return finish(o, ctx, weights=None)


# --------------------------------------------------------------------------
# HEADWEAR
# --------------------------------------------------------------------------
def women_sink(ctx):
    return -0.012 if ctx.spec['sex'] == 'f' else 0.022


def lathe_hat(ctx, name, parts, sink, tilt):
    hat = join(parts, name)
    hat_place(ctx, hat, sink=sink, tilt=tilt)
    rigid_weight(hat, 'head')
    return finish(hat, ctx, weights=None)


WOMEN_HATS = HERO_F + ['woman_old']


@garment('hat_f', 'head', WOMEN_HATS, 'woman', 'a woman\'s riding hat: tall felt crown, modest brim, a ribbon band (accent)')
def g_hat_f(ctx, ref):
    r0 = 0.090
    prof = [(0.0, 0.168), (0.058, 0.166), (0.074, 0.156), (0.081, 0.120), (0.087, 0.052), (r0, 0.010), (r0 + 0.004, 0.002),
            (0.145, 0.000), (0.180, -0.007), (0.186, -0.012), (0.176, -0.015), (0.135, -0.006), (r0 + 0.002, -0.006), (r0 - 0.004, 0.0)]
    o = lathe_mesh('hat_f', prof, 36, 'felt')
    bm = get_bm(o)
    for v in bm.verts:
        r = math.hypot(v.co.x, v.co.y)
        if r > r0 + 0.01:
            a = math.atan2(v.co.x, -v.co.y)
            t = (r - r0) / 0.075
            v.co.z += 0.018 * math.sin(a) ** 2 * (1 if math.sin(a) > 0 else 0.3) * t * t
    put_bm(bm, o)
    band = lathe_mesh('hatf_band', [(0.0835, 0.046), (0.0875, 0.042), (0.0925, 0.012), (0.0925, 0.006), (0.088, 0.004)], 36, 'acc')
    return lathe_hat(ctx, 'hat_f', [o, band], women_sink(ctx), -9)


@garment('hat_tall', 'head', MEN_E, 'man', 'a tall-crowned felt hat (the capotain) with a band and a buckle')
def g_hat_tall(ctx, ref):
    r0 = 0.094
    prof = [(0.0, 0.200), (0.062, 0.197), (0.078, 0.184), (0.085, 0.135), (0.091, 0.062), (r0, 0.012), (r0 + 0.004, 0.002),
            (0.160, 0.000), (0.200, -0.005), (0.207, -0.010), (0.198, -0.013), (0.150, -0.006), (r0 + 0.002, -0.006), (r0 - 0.004, 0.0)]
    o = lathe_mesh('hat_tall', prof, 36, 'felt')
    band = lathe_mesh('hatt_band', [(0.0875, 0.050), (0.0915, 0.046), (0.0965, 0.012), (0.0965, 0.006), (0.092, 0.004)], 36, 'cloth_b')
    buckle = torus_mesh('hatt_buckle', 0.5, 0.08, 4, 4, 'brass')
    buckle.data.transform(Matrix.Scale(0.03, 4))
    place(buckle, Vector((0, -0.0975, 0.028)), Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, -1, 0)))
    return lathe_hat(ctx, 'hat_tall', [o, band, buckle], 0.020, -6)


@garment('hat_straw', 'head', WOMEN_HATS, 'woman', 'a wide flat straw hat with a low crown and a ribbon (accent), for the market and the road')
def g_hat_straw(ctx, ref):
    r0 = 0.092
    prof = [(0.0, 0.058), (0.070, 0.057), (0.088, 0.050), (r0, 0.010), (r0 + 0.004, 0.002), (0.170, -0.004), (0.225, -0.012),
            (0.232, -0.017), (0.222, -0.019), (0.170, -0.009), (r0 + 0.002, -0.006), (r0 - 0.004, 0.0)]
    o = lathe_mesh('hat_straw', prof, 40, 'straw')
    band = lathe_mesh('hats_band', [(0.0905, 0.036), (0.0935, 0.032), (0.0955, 0.010), (0.093, 0.005)], 40, 'acc')
    return lathe_hat(ctx, 'hat_straw', [o, band], women_sink(ctx) - 0.010, -5)


@garment('bontmuts', 'head', WOMEN_HATS, 'woman', 'a woman\'s winter cap: a soft dyed crown with a thick roll of fur round it')
def g_bontmuts(ctx, ref):
    prof = [(0.0, 0.105), (0.045, 0.100), (0.080, 0.080), (0.098, 0.045), (0.100, 0.012), (0.094, 0.004), (0.0, 0.004)]
    crown = lathe_mesh('bm_crown', prof, 32, 'felt')
    fur = torus_mesh('bm_fur', 0.104, 0.024, 32, 8, 'fur')
    fur.data.transform(Matrix.Diagonal((1, 1, 0.85, 1)))
    fur.data.transform(Matrix.Translation((0, 0, 0.018)))
    return lathe_hat(ctx, 'bontmuts', [crown, fur], women_sink(ctx) + 0.010, -8)


@garment('muts_f', 'head', WOMEN_HATS, 'woman', 'a soft dark woollen bonnet worn flat on the crown over a white cap edge')
def g_muts_f(ctx, ref):
    prof = [(0.0, 0.070), (0.060, 0.068), (0.110, 0.058), (0.128, 0.042), (0.120, 0.028), (0.096, 0.020), (0.090, 0.010),
            (0.0, 0.010)]
    cap = lathe_mesh('muts_crown', prof, 32, 'felt')
    edge = lathe_mesh('muts_edge', [(0.093, 0.016), (0.097, 0.010), (0.098, -0.010), (0.094, -0.014), (0.090, -0.004)], 32, 'linen')
    return lathe_hat(ctx, 'muts_f', [cap, edge], women_sink(ctx) + 0.006, -14)


@garment('cap_knit', 'head', MEN_E, 'man', 'a knitted woollen cap with a rolled brim (soldiers, sailors, carters)')
def g_cap_knit(ctx, ref):
    prof = [(0.0, 0.118), (0.040, 0.114), (0.075, 0.098), (0.095, 0.070), (0.102, 0.035), (0.104, 0.012), (0.0, 0.012)]
    crown = lathe_mesh('ck_crown', prof, 32, 'wool2')
    roll = torus_mesh('ck_roll', 0.106, 0.014, 32, 6, 'wool2')
    roll.data.transform(Matrix.Translation((0, 0, 0.014)))
    return lathe_hat(ctx, 'cap_knit', [crown, roll], 0.032, -6)


# --------------------------------------------------------------------------
# MANTLES (the hero): short, and long with a hood lying on the back
# --------------------------------------------------------------------------
@garment('mantle_short', 'mantle', HERO_M + HERO_F, 'man', 'the hero\'s short riding mantle: shoulder cape, standing collar and a fall to the hips', layer=2)
def g_mantle_short(ctx, ref):
    return GM.mantle_core(ctx, 'mantle_short', hem='hip')


def lying_hood(ctx, yoke, fall):
    """A hood lying down on the back of the mantle, from the collar to the shoulder blades."""
    k = ctx.k
    back = bvh_of([yoke, fall])
    nz = ctx.neck.z

    def back_y(x, z):
        loc, _, _, _ = back.ray_cast(Vector((x, 2.0, z)), Vector((0, -1, 0)), 4.0)
        return loc.y if loc is not None else ctx.neck.y + 0.12
    rings, nring = 10, 14
    verts = []
    z0, z1 = nz + 0.030 * k, nz - 0.30 * k
    for kk in range(rings):
        t = kk / (rings - 1)
        z = z0 + (z1 - z0) * t
        wid = k * (0.14 * min(1.0, 0.7 + 2.5 * t) * (1.0 - t ** 2.2) ** 0.7 + 0.01)
        dep = k * (0.045 * min(1.0, 0.5 + 3.0 * t) * (1.0 - t ** 2.0) ** 0.7 + 0.006)
        yb = back_y(0.0, min(z, nz - 0.04 * k)) + 0.003
        for j in range(nring):
            b = 2 * math.pi * j / nring
            yy = dep * (0.9 + math.sin(b)) if math.sin(b) > -0.9 else 0.0
            verts.append((wid * math.cos(b), yb + max(0.0, yy), z + 0.010 * math.cos(2 * b) * (1 - t)))
    faces = []
    for kk in range(rings - 1):
        for j in range(nring):
            a0, a1 = kk * nring, (kk + 1) * nring
            faces.append((a0 + j, a0 + (j + 1) % nring, a1 + (j + 1) % nring, a1 + j))
    hood = new_mesh_obj('mantle_hood_h', verts, faces, 'wool')
    bm = get_bm(hood)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    put_bm(bm, hood)
    set_aux(hood, [(0.0, 0.0, 4.0)] * len(hood.data.vertices))
    set_keep(hood)
    transfer_weights(hood, ctx.T, ctx.bones)
    return hood


@garment('mantle_hood', 'mantle', HERO_M + HERO_F, 'man', 'the hero\'s long mantle with a hood lying down on the back', layer=2)
def g_mantle_hood(ctx, ref):
    return GM.mantle_core(ctx, 'mantle_hood', hood=lying_hood)


# --------------------------------------------------------------------------
# A MARK: the eyepatch (over the right eye; the cord runs up over the left brow and round the head)
# --------------------------------------------------------------------------
@garment('eyepatch', 'mark', HERO_M + HERO_F, 'man', 'a black leather eyepatch over the right eye on a thin cord')
def g_eyepatch(ctx, ref):
    k = ctx.k
    e = ctx.lm['eye']
    er = Vector((-abs(e[0]), e[1], e[2]))
    bvb = ctx.bvh('body', [ctx.body])
    n = 6
    verts = []
    for j in range(n):
        for i in range(n):
            u, v = (i / (n - 1) - 0.5), (j / (n - 1) - 0.5)
            q = er + Vector((u * 0.050 * k, 0, v * 0.040 * k * (1 - 0.25 * (2 * u) ** 2)))
            hit, nn, _, _ = bvb.ray_cast(q + Vector((0, -0.2, 0)), Vector((0, 1, 0)), 0.4)
            verts.append((hit if hit is not None else q) + Vector((0, -0.007 * k, 0)))
    patch = new_mesh_obj('patch', verts, grid_faces(n, n), 'patch')
    fix_normals_out(patch, lambda p: head_centre(ctx))
    solidify(patch, 0.002 * k)
    p1 = er + Vector((-0.015 * k, 0.0, 0.0))
    p2 = Vector((abs(e[0]) + 0.01 * k, e[1] + 0.02 * k, e[2] + 0.045 * k))
    p3 = Vector((0.0, ctx.hmax.y, e[2] + 0.015 * k))
    nrm = (p2 - p1).cross(p3 - p1).normalized()
    c = (p1 + p2 + p3) / 3
    pts, ln = convex_ring(bvh_sub([ctx.body], lambda p: p.z > ctx.neck.z + 0.03 * k), c, nrm, count=40)
    cord = strap_mesh('cord', pts, ln, nrm, c, 0.006 * k, 0.002, 0.003, 'patch')
    o = join([patch, cord], 'eyepatch')
    set_keep(o)
    rigid_weight(o, 'head')
    return finish(o, ctx, weights=None)
