# BELFORT townsfolk kit - stage 4: hand-painted textures, the rider's way.
#
# Part id, garment id, position, normal, curvature, occlusion and the builders' aux attributes are baked with
# Cycles; colour, ORM and normal maps are then painted in numpy. Garments are painted in light neutral tones
# (with painted occlusion, folds and edge light) so the game can multiply a dye colour in where COLOR_0.r = 1;
# leather, wood, metal, linen whites, rope and straw keep their painted colour. Skins are painted per body
# (skin tone, blush, brows, lids, lips, stubble, age lines, eyes) into a 3 x 3 skin atlas.

import bpy, os, math, json, glob
import numpy as np
from mathutils import Vector, Matrix
from .common import log, R, PARTS, TEX, SKIN_TEX, WORK, CACHE, srgb
from .bodies import BODIES, BODY_ORDER
from .atlas import garment_refs, SKIN_TILES

vnoise, fbm, box_blur, soft_blur, sstep, rgb, mixc = R.vnoise, R.fbm, R.box_blur, R.soft_blur, R.sstep, R.rgb, R.mixc
KEYS = ('pos', 'nrm', 'aux', 'curv', 'tex', 'ao', 'gid')


# --------------------------------------------------------------------------
# baking
# --------------------------------------------------------------------------
def store_pos0(o):
    me = o.data
    a = me.color_attributes.get('pos0') or me.color_attributes.new('pos0', 'FLOAT_COLOR', 'POINT')
    co = np.zeros(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    flat = np.ones((len(me.vertices), 4), dtype=np.float32)
    flat[:, :3] = co * 0.25 + 0.5
    a.data.foreach_set('color', flat.ravel())


def bake(objs, size, skin_imgs=None, gids=None, ao_samples=64, offsets=None, occluders=()):
    """Bake the KEYS maps for objs into size x size float arrays. skin_imgs: obj -> image for 'tex' (mh_uv).
    offsets: obj -> x offset applied while baking (so neighbours don't occlude each other); occluders are moved
    along with the object they belong to (list of (occluder, owner))."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.use_denoising = False
    sc.render.threads_mode = 'FIXED'
    sc.render.threads = max(1, os.cpu_count() or 2)
    if sc.world is None:
        sc.world = bpy.data.worlds.new('w')
    sc.world.light_settings.distance = 0.18
    saved = {}
    handles = []
    for o in objs:
        store_pos0(o)
        saved[o.name] = [s.material for s in o.material_slots]
        for si, m0 in enumerate(saved[o.name]):
            m = bpy.data.materials.new(f'BK_{o.name}_{si}')
            m.use_nodes = True
            nt = m.node_tree
            nt.nodes.clear()
            out = nt.nodes.new('ShaderNodeOutputMaterial')
            em = nt.nodes.new('ShaderNodeEmission')
            dif = nt.nodes.new('ShaderNodeBsdfDiffuse')
            dif.inputs[0].default_value = (1, 1, 1, 1)
            geo = nt.nodes.new('ShaderNodeNewGeometry')
            ap = nt.nodes.new('ShaderNodeAttribute')
            ap.attribute_name = 'pos0'
            aa = nt.nodes.new('ShaderNodeAttribute')
            aa.attribute_name = 'aux'
            vm = nt.nodes.new('ShaderNodeVectorMath')
            vm.operation = 'MULTIPLY_ADD'
            nt.links.new(geo.outputs['Normal'], vm.inputs[0])
            vm.inputs[1].default_value = (0.5,) * 3
            vm.inputs[2].default_value = (0.5,) * 3
            va = nt.nodes.new('ShaderNodeVectorMath')
            va.operation = 'MULTIPLY_ADD'
            nt.links.new(aa.outputs['Color'], va.inputs[0])
            va.inputs[1].default_value = (0.25,) * 3
            va.inputs[2].default_value = (0.5,) * 3
            srcs = {'pos': ap.outputs['Color'], 'nrm': vm.outputs[0], 'aux': va.outputs[0], 'curv': geo.outputs['Pointiness']}
            if skin_imgs and o in skin_imgs:
                tex = nt.nodes.new('ShaderNodeTexImage')
                tex.image = skin_imgs[o]
                uvn = nt.nodes.new('ShaderNodeUVMap')
                uvn.uv_map = 'mh_uv'
                nt.links.new(uvn.outputs[0], tex.inputs[0])
                srcs['tex'] = tex.outputs['Color']
            target = nt.nodes.new('ShaderNodeTexImage')
            nt.nodes.active = target
            part = m0.name[2:] if m0 and m0.name.startswith('P_') else 'skin'
            pid = PARTS.get(part, (1,))[0] / 32.0
            gid = (gids or {}).get(o, 0) / 128.0
            handles.append((nt, em, dif, out, target, srcs, pid, gid))
            o.material_slots[si].material = m
    moved = []
    if offsets:
        for o, dx in offsets.items():
            o.location.x += dx
            moved.append((o, dx))
        for occ, owner in occluders:
            occ.location.x += offsets[owner]
            moved.append((occ, offsets[owner]))
        bpy.context.view_layer.update()

    def run(kind):
        img = bpy.data.images.new('bake_' + kind, size, size, alpha=False, float_buffer=True)
        img.colorspace_settings.name = 'Non-Color'
        for (nt, em, dif, out, target, srcs, pid, gid) in handles:
            target.image = img
            nt.nodes.active = target
            for l in list(out.inputs[0].links):
                nt.links.remove(l)
            for l in list(em.inputs[0].links):
                nt.links.remove(l)
            nt.links.new((dif if kind == 'ao' else em).outputs[0], out.inputs[0])
            if kind == 'id':
                em.inputs[0].default_value = (pid, pid, pid, 1)
            elif kind == 'gid':
                em.inputs[0].default_value = (gid, gid, gid, 1)
            elif kind in srcs:
                nt.links.new(srcs[kind], em.inputs[0])
            else:
                em.inputs[0].default_value = (0, 0, 0, 1)
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.hide_set(False)
            o.hide_render = False
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        sc.cycles.samples = ao_samples if kind == 'ao' else 2
        bpy.ops.object.bake(type='AO' if kind == 'ao' else 'EMIT', margin=0, use_clear=True, use_selected_to_active=False)
        a = np.zeros(size * size * 4, dtype=np.float32)
        img.pixels.foreach_get(a)
        bpy.data.images.remove(img)
        log('  baked', kind)
        return a.reshape(size, size, 4)[:, :, :3].copy()

    maps = {k: run(k) for k in ('id',) + KEYS}
    for o, dx in moved:
        o.location.x -= dx
    for o in objs:
        for si, m in enumerate(saved[o.name]):
            bm_ = o.material_slots[si].material
            o.material_slots[si].material = m
            bpy.data.materials.remove(bm_)
    return maps


def dilate(maps, iters=10):
    pid = np.rint(maps['id'][:, :, 0] * 32).astype(np.int32)
    valid = pid > 0
    gidm = np.rint(maps['gid'][:, :, 0] * 128).astype(np.int32)
    stack = np.concatenate([maps[k] for k in KEYS if k != 'gid'] + [pid[:, :, None].astype(np.float32), gidm[:, :, None].astype(np.float32)], axis=2)
    for _ in range(iters):
        acc = np.zeros_like(stack)
        cnt = np.zeros(valid.shape, dtype=np.float32)
        best = np.zeros(valid.shape + (2,), dtype=np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            sv = np.roll(valid, (dy, dx), axis=(0, 1))
            ss = np.roll(stack, (dy, dx), axis=(0, 1))
            acc[:, :, :-2] += ss[:, :, :-2] * sv[:, :, None]
            take = sv & (best[:, :, 0] == 0)
            best[take] = ss[take][:, -2:]
            cnt += sv
        fill = (~valid) & (cnt > 0)
        stack[fill, :-2] = acc[fill, :-2] / cnt[fill][:, None]
        stack[fill, -2:] = best[fill]
        valid = valid | fill
    out, i = {}, 0
    for k in KEYS:
        if k == 'gid':
            continue
        out[k] = stack[:, :, i:i + 3]
        i += 3
    out['id'] = np.rint(stack[:, :, -2]).astype(np.int32)
    out['gid'] = np.rint(stack[:, :, -1]).astype(np.int32)
    return out


# --------------------------------------------------------------------------
# painting helpers (closures over one set of maps)
# --------------------------------------------------------------------------
class Painter:
    def __init__(self, m):
        self.m = m
        H, W = m['id'].shape
        self.H, self.W = H, W
        self.P = (m['pos'] - 0.5) * 4.0
        self.N = m['nrm'] * 2.0 - 1.0
        self.A = (m['aux'] - 0.5) * 4.0
        self.ao = np.clip(m['ao'][:, :, 0], 0, 1)
        self.ao_soft = soft_blur(self.ao, 3)
        self.curv = soft_blur(m['curv'][:, :, 0] - 0.5, 2)
        P = self.P
        self.x, self.y, self.z = P[:, :, 0], P[:, :, 1], P[:, :, 2]
        self.n_lo = fbm(P * 7.0, 3)
        self.n_mid = fbm(P * 26.0 + 5.0, 3)
        self.n_str = vnoise(np.stack([self.x * 60.0, self.y * 60.0, self.z * 7.0], axis=2))
        self.n_fold = vnoise(np.stack([self.x * 22.0, self.y * 22.0, self.z * 3.0], axis=2))
        self.up = self.N[:, :, 2]
        self.col = np.zeros((H, W, 3), dtype=np.float32) + 0.5
        self.rough = np.full((H, W), 0.85, dtype=np.float32)
        self.metal = np.zeros((H, W), dtype=np.float32)
        self.height = np.zeros((H, W), dtype=np.float32)

    def base(self, M, mid, light, dark, var=0.5, streak=0.0, folds=0.0):
        k = np.clip(0.5 + 0.36 * self.up + var * 0.5 * self.n_lo + 0.12 * self.n_mid + streak * self.n_str
                    + folds * self.n_fold, 0, 1)
        c = np.where((k < 0.5)[..., None], mixc(dark, mid, k * 2), mixc(mid, light, k * 2 - 1))
        self.col[M] = c[M]

    def shade(self, M, shadow, strength=0.85, edge=0.0, edge_col=None, cavity=0.0, crease=0.0):
        a = np.clip(self.ao_soft * 0.6 + self.ao * 0.4, 0, 1) ** 1.3
        k = (1 - a) * strength
        c = self.col * (1 - k[..., None]) + (self.col * shadow) * k[..., None]
        if edge > 0:
            e = np.clip(self.curv * 9.0, 0, 1) * edge
            c = mixc(c, edge_col if edge_col is not None else np.ones(3, np.float32), e)
        if cavity > 0:
            c = c * (1 - np.clip(-self.curv * 9.0, 0, 1) * cavity)[..., None]
        if crease > 0:
            cr = np.clip(self.curv * 6.0, -1, 1)
            c = c * (1 + crease * 0.35 * cr)[..., None]
        self.col[M] = c[M]


# neutral, lightly warm tones for everything that takes dye (the game multiplies the dye in)
DYE_MID, DYE_LIGHT, DYE_DARK = rgb('#c4bdb2'), rgb('#efe9df'), rgb('#6f6a72')
SHADOW_COOL = np.array([0.55, 0.55, 0.66], np.float32)


def paint_garments(m, gnames):
    p = Painter(m)
    pid, gid = m['id'], m['gid']
    x, y, z, A = p.x, p.y, p.z, p.A

    def G(name):
        i = gnames.index(name) + 1 if name in gnames else -99
        return gid == i

    def part(n):
        return pid == PARTS[n][0]

    # ---- dyeable cloth: wool, second wool (stockings), dyed linen, felt, lining, sash, cloth_b ----
    for n, var, streak, folds in (('wool', 0.40, 0.06, 0.12), ('wool2', 0.35, 0.20, 0.0), ('linen_d', 0.35, 0.05, 0.10),
                                  ('felt', 0.35, 0.0, 0.0), ('lining', 0.3, 0.0, 0.1), ('sash', 0.3, 0.08, 0.15),
                                  ('cloth_b', 0.4, 0.0, 0.2)):
        M = part(n)
        if not M.any():
            continue
        p.base(M, DYE_MID, DYE_LIGHT, DYE_DARK, var=var, streak=streak, folds=folds)
        p.shade(M, SHADOW_COOL, strength=0.9, edge=0.14, edge_col=rgb('#fff6e6'), crease=0.8)
        p.rough[M] = 0.9 if n != 'sash' else 0.7

    # long garments: painted vertical folds that deepen towards the hem
    for g in ('skirt', 'habit', 'huik', 'apron', 'smock', 'buff_coat'):
        M = G(g)
        if not M.any():
            continue
        fold = np.sin(np.arctan2(x, -y) * (13 if g != 'huik' else 9) + 3.0 * p.n_lo) * 0.5 + 0.5 * p.n_fold
        t = np.clip((1.05 * z.max() - z), 0, None)
        k = np.clip(fold, -1, 1) * 0.07
        p.col[M] = (p.col * (1 + k[..., None]))[M]
    # skirt: a darker hem band and a waistband line
    M = G('skirt')
    if M.any():
        t = A[:, :, 0]
        band = sstep(0.86, 0.88, t) * sstep(0.95, 0.93, t)
        p.col[M] = (p.col * (1 - 0.30 * band[..., None]))[M]
        p.height[M] -= (band * 0.0004)[M]
    # bodice: front lacing (a dark ladder of cord over a narrow linen stomacher)
    M = G('bodice') & part('wool')
    if M.any():
        ax = A[:, :, 0]
        front = (y < 0) & (ax < 0.045)
        stom = sstep(0.036, 0.030, ax) * front
        p.col[M] = mixc(p.col, rgb('#ddd5c6'), stom * 0.75)[M]
        zz = z * 70.0
        lace = (np.abs((zz % 1.0) - 0.5) < 0.12) | (np.abs(ax * 70 - np.abs(((zz + 0.5) % 1.0) - 0.5) * 2.2) < 0.18)
        lacing = (lace & (ax < 0.030) & front).astype(np.float32)
        p.col[M] = mixc(p.col, rgb('#3a2c22'), lacing * 0.85)[M]
        edge = sstep(0.040, 0.036, ax) * sstep(0.030, 0.034, ax) * front
        p.col[M] = (p.col * (1 - 0.35 * edge[..., None]))[M]
    # doublet: seams down the front, tabs at the hem, piping at the shoulder wings
    M = G('doublet') & part('wool')
    if M.any():
        ax = np.abs(x)
        seam = sstep(0.004, 0.0015, ax) * (y < 0)
        p.col[M] = (p.col * (1 - 0.45 * seam[..., None]))[M]
        tabs = (z < m['_lm']['waist_z'] - 0.04) & (np.abs(np.sin(np.arctan2(x, -y) * 9.0)) < 0.10)
        p.col[M] = (p.col * (1 - 0.35 * tabs[..., None]))[M]
        waist = np.exp(-((z - (m['_lm']['waist_z'] - 0.035)) / 0.006) ** 2)
        p.col[M] = (p.col * (1 - 0.30 * waist[..., None]))[M]
    # breeches: a garter ribbon below the knee
    M = G('breeches')
    if M.any():
        t = A[:, :, 0]
        gar = sstep(0.0, 0.04, t) * sstep(0.12, 0.08, t)
        p.col[M] = (p.col * (1 - 0.32 * gar[..., None]))[M]

    # painted light falls off towards the ground (the masters' darker hems and legs)
    for n in ('wool', 'wool2', 'linen_d', 'lining', 'sash', 'cloth_b', 'linen', 'leather', 'buff'):
        M = part(n)
        g = 0.80 + 0.20 * sstep(0.05, 1.25, z)
        p.col[M] = (p.col * g[..., None])[M]

    # ---- hair and beards: dyeable, a light grey-brown with painted strands ----
    for n in ('hair', 'beard'):
        M = part(n)
        if not M.any():
            continue
        p.base(M, rgb('#b6aa98'), rgb('#e6dccb'), rgb('#5e5650'), var=0.5, streak=0.55)
        strands = vnoise(np.stack([x * 260.0, y * 260.0, z * 40.0], axis=2))
        p.col[M] = (p.col * (1 + 0.16 * strands[..., None]))[M]
        p.shade(M, np.array([0.45, 0.42, 0.5], np.float32), strength=0.95, edge=0.2, edge_col=rgb('#fff4e0'), cavity=0.3)
        p.rough[M] = 0.6

    # ---- whites: linen collars, coifs, veils, kerchiefs, cuffs; lace; shells ----
    for n in ('linen', 'lace'):
        M = part(n)
        if not M.any():
            continue
        p.base(M, rgb('#e9e4d9'), rgb('#fbf8f0'), rgb('#a9abb4'), var=0.3, folds=0.12)
        p.shade(M, np.array([0.62, 0.66, 0.78], np.float32), strength=0.8, edge=0.25, edge_col=rgb('#ffffff'), crease=0.6)
        p.rough[M] = 0.8

    # ---- leathers ----
    M = part('leather')
    p.base(M, rgb('#5e3e26'), rgb('#86603e'), rgb('#33200f'), var=0.5)
    p.shade(M, np.array([0.45, 0.4, 0.42], np.float32), strength=0.9, edge=0.3, edge_col=rgb('#a37650'), crease=0.6)
    p.rough[M] = 0.55
    M = part('buff')
    p.base(M, rgb('#b88c55'), rgb('#dcb67c'), rgb('#7a5530'), var=0.5, folds=0.2)
    seams = sstep(0.004, 0.0015, np.abs(x)) * (y < 0)
    p.col[M] = (p.col * (1 - 0.4 * seams[..., None]))[M]
    p.shade(M, np.array([0.5, 0.42, 0.42], np.float32), strength=0.9, edge=0.3, edge_col=rgb('#f0d29a'), crease=0.7)
    p.rough[M] = 0.7
    M = part('shoe')
    p.base(M, rgb('#3e2a1c'), rgb('#6a4a32'), rgb('#1e140d'), var=0.4)
    sole = sstep(0.016, 0.010, z)
    p.col[M] = mixc(p.col, rgb('#17100b'), sole)[M]
    p.shade(M, np.array([0.45, 0.4, 0.42], np.float32), strength=0.8, edge=0.35, edge_col=rgb('#9a7050'))
    p.rough[M] = 0.5
    # a ribbon rosette on the instep
    M2 = M & (y < -0.06) & (z > 0.04) & (z < 0.09) & (np.abs(np.abs(x) - 0.12) < 0.035)
    p.col[M2] = mixc(p.col, rgb('#2a1a14'), 0.5)[M2]

    # ---- wood, rope, straw, bread, gourd, beads, glass ----
    M = part('wood')
    grain = vnoise(np.stack([x * 30.0, y * 30.0, z * 300.0], axis=2))
    p.base(M, rgb('#8a6440'), rgb('#b88d5e'), rgb('#4d3320'), var=0.4)
    p.col[M] = (p.col * (1 + 0.12 * grain[..., None]))[M]
    p.shade(M, np.array([0.45, 0.4, 0.42], np.float32), strength=0.8, edge=0.3, edge_col=rgb('#d8b080'))
    p.rough[M] = 0.65
    M = part('rope')
    tw = np.sin((x + y + z) * 900.0)
    p.base(M, rgb('#b09a6c'), rgb('#d9c79a'), rgb('#6a5a3c'), var=0.3)
    p.col[M] = (p.col * (1 + 0.15 * tw[..., None]))[M]
    p.shade(M, np.array([0.5, 0.45, 0.4], np.float32), strength=0.9)
    p.rough[M] = 0.9
    M = part('straw')
    weave = np.sign(np.sin(z * 180.0)) * np.sign(np.sin(np.arctan2(x, y) * 40.0))
    p.base(M, rgb('#b8954f'), rgb('#e3c47e'), rgb('#6e5427'), var=0.3)
    p.col[M] = (p.col * (1 + 0.12 * weave[..., None]))[M]
    p.shade(M, np.array([0.5, 0.42, 0.35], np.float32), strength=0.9, cavity=0.3)
    p.rough[M] = 0.85
    M = part('bread')
    p.base(M, rgb('#a8662e'), rgb('#dba05a'), rgb('#5e3214'), var=0.5)
    p.shade(M, np.array([0.5, 0.4, 0.35], np.float32), strength=0.8, edge=0.2, edge_col=rgb('#f0c888'))
    p.rough[M] = 0.8
    for n, c1, c2, c3 in (('gourd', '#9a6a34', '#c99a58', '#5a3a1a'), ('beads', '#4a3424', '#7a5a40', '#22160e'),
                          ('glass', '#d9c27a', '#fff0b8', '#8a7040'), ('iron', '#3a3836', '#6a6660', '#1a1918')):
        M = part(n)
        p.base(M, rgb(c1), rgb(c2), rgb(c3), var=0.3)
        p.shade(M, np.array([0.5, 0.45, 0.45], np.float32), strength=0.7, edge=0.35, edge_col=rgb(c2))
        p.rough[M] = 0.5 if n != 'iron' else 0.45
        if n == 'iron':
            p.metal[M] = 0.7

    # ---- metals ----
    M = part('brass')
    k = np.clip(0.5 + 0.55 * p.up + 0.25 * p.N[:, :, 0] - 0.2 * p.N[:, :, 1] + 0.1 * p.n_mid, 0, 1)
    c = np.where((k < 0.5)[..., None], mixc(rgb('#6f4d1c'), rgb('#bf9540'), k * 2), mixc(rgb('#bf9540'), rgb('#f3d98a'), k * 2 - 1))
    p.col[M] = c[M]
    p.metal[M] = 1.0
    p.rough[M] = 0.36
    M = part('steel')
    k = np.clip(0.5 + 0.6 * p.up + 0.2 * p.N[:, :, 0] + 0.12 * p.n_mid, 0, 1)
    c = np.where((k < 0.5)[..., None], mixc(rgb('#3c4048'), rgb('#8a9098'), k * 2), mixc(rgb('#8a9098'), rgb('#e8ecf0'), k * 2 - 1))
    p.col[M] = c[M]
    p.shade(M, np.array([0.5, 0.5, 0.55], np.float32), strength=0.7, edge=0.4, edge_col=rgb('#ffffff'))
    p.metal[M] = 0.85
    p.rough[M] = 0.4
    return finish_maps(p, pid)


def finish_maps(p, pid):
    hs = soft_blur(p.height, 1, 1)
    texel = 1.0 / 600.0
    dhdu = (np.roll(hs, -1, axis=1) - np.roll(hs, 1, axis=1)) / (2 * texel)
    dhdv = (np.roll(hs, -1, axis=0) - np.roll(hs, 1, axis=0)) / (2 * texel)
    nx, ny, nz = -dhdu, -dhdv, np.ones_like(hs)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    nrm = np.stack([nx / ln * 0.5 + 0.5, ny / ln * 0.5 + 0.5, nz / ln * 0.5 + 0.5], axis=2)
    ao_out = 1 - (1 - np.clip(p.ao_soft * 0.5 + p.ao * 0.5, 0, 1)) * 0.8
    empty = pid == 0
    p.col[empty] = rgb('#8a8070')
    nrm[empty] = (0.5, 0.5, 1.0)
    orm = np.stack([ao_out, np.clip(p.rough, 0.05, 1), np.clip(p.metal, 0, 1)], axis=2)
    orm[empty] = (1.0, 0.8, 0.0)
    return np.clip(p.col, 0, 1), orm.astype(np.float32), nrm.astype(np.float32)


# --------------------------------------------------------------------------
# skins
# --------------------------------------------------------------------------
SKIN = {   # mid, light, dark, blush strength, stubble, age (0..1)
    'man': ('#c4896a', '#dfa786', '#93583f', 0.30, 0.55, 0.25),
    'man_young': ('#cf9a78', '#e8b694', '#9b6248', 0.30, 0.25, 0.0),
    'man_stout': ('#cc8a6c', '#e8a88a', '#9a5641', 0.50, 0.45, 0.35),
    'man_old': ('#c49276', '#ddb094', '#8f5d47', 0.30, 0.25, 1.0),
    'woman': ('#e0b096', '#f2cdb4', '#ac7a62', 0.40, 0.0, 0.0),
    'woman_stout': ('#d9a286', '#eec0a4', '#a46e55', 0.50, 0.0, 0.35),
    'woman_old': ('#d3a48c', '#e8c2ac', '#9c705c', 0.30, 0.0, 1.0),
    'girl': ('#e6b89c', '#f6d4bd', '#b28068', 0.55, 0.0, 0.0),
    'boy': ('#dfac8c', '#f1c8ac', '#ab785c', 0.50, 0.0, 0.0),
}
BROW = {'man': '#3a281c', 'man_young': '#5a3c22', 'man_stout': '#4a3424', 'man_old': '#9a948a', 'woman': '#5a3e28',
        'woman_stout': '#4a3424', 'woman_old': '#a09890', 'girl': '#8a6a40', 'boy': '#6a4a2a'}
EYES = {'man': '#4a3018', 'man_young': '#5a6a80', 'man_stout': '#4a3018', 'man_old': '#5a6a78', 'woman': '#4a6070',
        'woman_stout': '#5a4024', 'woman_old': '#5a6670', 'girl': '#4a6a8a', 'boy': '#5a4428'}


def paint_skins(m, lms):
    """Each body is painted in its own tile (cropped maps, for speed), then the tiles are put back together."""
    H, W = m['id'].shape
    col = np.zeros((H, W, 3), np.float32)
    orm = np.zeros((H, W, 3), np.float32)
    nrm = np.zeros((H, W, 3), np.float32)
    th, tw = H // SKIN_TILES, W // SKIN_TILES
    for t, bid in enumerate(BODY_ORDER):
        tx, ty = t % SKIN_TILES, t // SKIN_TILES
        sl = (slice(ty * th, (ty + 1) * th), slice(tx * tw, (tx + 1) * tw))     # pixel row 0 is v = 0
        sub = {k: (v[sl] if isinstance(v, np.ndarray) else v) for k, v in m.items()}
        c, o, n = paint_skin_tile(sub, lms[bid], bid)
        col[sl], orm[sl], nrm[sl] = c, o, n
    return col, orm, nrm


def paint_skin_tile(m, lm, bid):
    p = Painter(m)
    pid = m['id']
    H, W = pid.shape
    x, y, z, P, A = p.x, p.y, p.z, p.P, p.A
    tex = np.clip(m['tex'], 0, 1) ** (1 / 2.2)
    T = np.ones((H, W), bool)
    if True:
        mid, light, dark, blush_k, stub, age = SKIN[bid]
        mid, light, dark = rgb(mid), rgb(light), rgb(dark)
        ex, ey, ez = lm['eye']
        er = lm['eye_r']
        nz = lm['neck_01'][2]
        k = lm['top'] / 1.70
        M = T & (pid == 1)
        # photo skin, heavily simplified, only as a tonal guide (darker creases, lips, brows)
        wsum = soft_blur(M.astype(np.float32), 5) + 1e-4
        tex_b = soft_blur(tex * M[..., None], 5) / wsum[..., None]
        lum = tex_b.mean(axis=2)
        face = M & (z > nz + 0.02) & (y < ey + 0.05)
        ref = np.median(lum[face]) if face.any() else 0.7
        rel = np.clip(lum / max(ref, 1e-3), 0.4, 1.25)
        p.base(M, mid, light, dark, var=0.25)
        p.col[M] = (p.col * (0.85 + 0.15 * rel)[..., None])[M]
        # warm blush on cheeks, nose, ears
        bl = np.zeros((H, W), np.float32)
        for sx in (1, -1):
            bl += np.exp(-(((x - sx * (ex + 0.018 * k)) / (0.022 * k)) ** 2 + ((z - (ez - 0.035 * k)) / (0.02 * k)) ** 2)) * (y < ey + 0.03)
            bl += 0.6 * np.exp(-(((x - sx * 0.075 * k) / (0.016 * k)) ** 2 + ((z - ez) / (0.03 * k)) ** 2)) * (y > ey + 0.03)
        bl += 0.8 * np.exp(-((x / (0.012 * k)) ** 2 + ((z - (ez - 0.040 * k)) / (0.014 * k)) ** 2)) * (y < ey - 0.005)
        p.col[M] = mixc(p.col, rgb('#cf6e5a'), np.clip(bl, 0, 1) * blush_k)[M]
        # stubble / shaved beard shadow on the men
        if stub > 0:
            jaw = (z < ez - 0.045 * k) & (z > nz - 0.0) & (y < ey + 0.075 * k)
            jaw = sstep(ez - 0.035 * k, ez - 0.055 * k, z) * sstep(nz - 0.01, nz + 0.03 * k, z) * sstep(ey + 0.09 * k, ey + 0.06 * k, y)
            up_lip = np.exp(-((x / (0.03 * k)) ** 2 + ((z - (ez - 0.055 * k)) / (0.008 * k)) ** 2)) * (y < ey)
            sh = np.clip(jaw + up_lip, 0, 1) * (0.75 + 0.25 * p.n_mid)
            p.col[M] = mixc(p.col, rgb('#5a4a44'), sh * 0.45 * stub)[M]
        # age: forehead lines, crow's feet, nasolabial folds, sagging under the eyes
        if age > 0:
            fore = (z > ez + 0.03 * k) & (z < ez + 0.07 * k) & (np.abs(x) < 0.05 * k) & (y < ey + 0.02)
            lines = np.exp(-((np.sin((z - ez) / k * 2 * np.pi / 0.013) + 1) * 3.0)) * fore
            naso = np.zeros((H, W), np.float32)
            for sx in (1, -1):
                d = np.abs((x - sx * 0.020 * k) - sx * (ez - 0.035 * k - z) * 0.55)
                naso += sstep(0.004 * k, 0.0005, d) * (z < ez - 0.025 * k) * (z > ez - 0.075 * k) * (y < ey + 0.01)
                cf = np.exp(-(((x - sx * (ex + 0.030 * k)) / (0.008 * k)) ** 2 + ((z - ez) / (0.012 * k)) ** 2)) * (np.sin((z - ez) * 600) > 0.3)
                naso += cf * 0.8
                bag = np.exp(-(((x - sx * ex) / (0.016 * k)) ** 2 + ((z - (ez - 0.018 * k)) / (0.005 * k)) ** 2)) * (y < ey + 0.02)
                naso += bag * 0.7
            wr = np.clip(lines * 0.8 + naso, 0, 1) * age
            p.col[M] = mixc(p.col, dark * 0.8, wr * 0.55)[M]
            spots = sstep(0.55, 0.75, fbm(P * 90.0 + 3.0, 2)) * (z > nz - 0.4) * age
            p.col[M] = mixc(p.col, rgb('#a0704c'), spots * 0.25)[M]
        # lips
        lips = sstep(0.25, 0.75, soft_blur(np.clip(A[:, :, 0], 0, 1), 2)) * (z > nz)
        lipc = rgb('#a8564a') if BODIES[bid]['sex'] == 'f' else rgb('#a86050')
        p.col[M] = mixc(p.col, lipc * (0.92 if age > 0.5 else 1.0), lips * (0.65 if age < 0.5 else 0.4))[M]
        mouthline = sstep(0.55, 0.85, soft_blur(np.clip(A[:, :, 0], 0, 1), 1)) * sstep(0.9, 0.6, soft_blur(np.clip(A[:, :, 0], 0, 1), 4))
        # eyebrows: strong simple arcs
        brow = np.zeros((H, W), np.float32)
        thick_k = 1.25 if BODIES[bid]['sex'] == 'm' else 0.85
        for sx in (1, -1):
            tpar = np.clip((x * sx - (ex - 0.020 * k)) / (0.050 * k), 0, 1)
            zc = ez + 0.019 * k + 0.0045 * k * np.sin(np.pi * np.clip(tpar * 1.2, 0, 1)) - 0.004 * k * tpar ** 2
            thick = 0.0075 * k * thick_k * (1.0 - 0.55 * tpar)
            inside = (x * sx > ex - 0.022 * k) & (x * sx < ex + 0.032 * k)
            b = sstep(thick, thick * 0.35, np.abs(z - zc)) * inside * (y < ey + 0.02)
            b *= sstep(0.0, 0.08, tpar) * sstep(1.0, 0.9, tpar)
            brow = np.maximum(brow, b)
        p.col[M] = mixc(p.col, rgb(BROW[bid]), brow * 0.88)[M]
        # lash line and lid shadow around the eyeballs (strong at gameplay distance)
        for sx in (1, -1):
            c = np.array([sx * ex, ey, ez], np.float32)
            d = np.sqrt(((P - c) ** 2).sum(axis=2))
            lid = sstep(er + 0.0045, er + 0.0005, d) * (z > ez - 0.002)
            p.col[M] = mixc(p.col, rgb('#2a1a14'), lid * 0.85)[M]
            lid2 = sstep(er + 0.013, er + 0.002, d)
            p.col[M] = mixc(p.col, rgb('#8a5446'), lid2 * 0.32)[M]
        nails = np.clip(A[:, :, 2], 0, 1) * (z < nz - 0.2)
        p.col[M] = mixc(p.col, rgb('#e0bca8'), nails * 0.6)[M]
        p.shade(M, rgb('#6e3a30') / mid * 0.9, strength=0.7, cavity=0.25)
        p.rough[M] = 0.62
        # eyes
        M = T & (pid == 2)
        p.col[M] = rgb('#ddd6ca')
        for sx in (1, -1):
            cx, cy, cz = sx * ex, ey, ez
            r = np.sqrt((x - cx) ** 2 + (z - cz) ** 2)
            frontal = (y < cy) & (np.abs(x - cx) < 0.03)
            iris_r = er * 0.62
            iris = sstep(iris_r, iris_r * 0.92, r) * frontal
            ib = rgb(EYES[bid])
            ic = mixc(ib * 0.7, ib * 1.5, np.clip((cz - z) / iris_r * 0.6 + 0.45, 0, 1))
            ic = mixc(ic, rgb('#140c08'), sstep(iris_r * 0.78, iris_r, r))
            ic = mixc(ic, rgb('#07050a'), sstep(iris_r * 0.46, iris_r * 0.40, r))
            hl = sstep(iris_r * 0.24, iris_r * 0.12, np.sqrt((x - cx - 0.3 * iris_r) ** 2 + (z - cz - 0.36 * iris_r) ** 2))
            ic = mixc(ic, np.ones(3, np.float32), hl * 0.9)
            e = M & frontal
            p.col[e] = mixc(p.col, ic, iris)[e]
            topshade = sstep(cz + er * 0.1, cz + er * 0.7, z)
            ms = M & (np.sign(x) == sx)
            p.col[ms] = (p.col * (1 - 0.6 * topshade[..., None]))[ms]
        p.rough[M] = 0.25
    return finish_maps(p, pid)


# --------------------------------------------------------------------------
# materials (preview + export): dye multiplied in from COLOR_0.r and the object's 'dye' colour
# --------------------------------------------------------------------------
def make_material(name, base, orm, nrm, dye=True, normal_strength=1.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    tb = nt.nodes.new('ShaderNodeTexImage')
    tb.image = base
    col = tb.outputs['Color']
    if dye:
        att = nt.nodes.new('ShaderNodeAttribute')
        att.attribute_type = 'GEOMETRY'
        att.attribute_name = 'dye'
        sep0 = nt.nodes.new('ShaderNodeSeparateColor')
        nt.links.new(att.outputs['Color'], sep0.inputs[0])
        od = nt.nodes.new('ShaderNodeAttribute')
        od.attribute_type = 'INSTANCER'
        od.attribute_name = 'dye_rgb'
        oo = nt.nodes.new('ShaderNodeAttribute')
        oo.attribute_type = 'OBJECT'
        oo.attribute_name = 'dye_rgb'
        mixd = nt.nodes.new('ShaderNodeMix')
        mixd.data_type = 'RGBA'
        mixd.inputs['Factor'].default_value = 1.0
        mixd.inputs[6].default_value = (1, 1, 1, 1)
        nt.links.new(sep0.outputs[0], mixd.inputs['Factor'])
        nt.links.new(oo.outputs['Color'], mixd.inputs[7])
        mul = nt.nodes.new('ShaderNodeMix')
        mul.data_type = 'RGBA'
        mul.blend_type = 'MULTIPLY'
        mul.inputs['Factor'].default_value = 1.0
        nt.links.new(col, mul.inputs[6])
        nt.links.new(mixd.outputs[2], mul.inputs[7])
        col = mul.outputs[2]
    nt.links.new(col, bsdf.inputs['Base Color'])
    to = nt.nodes.new('ShaderNodeTexImage')
    to.image = orm
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(to.outputs['Color'], sep.inputs[0])
    nt.links.new(sep.outputs[1], bsdf.inputs['Roughness'])
    nt.links.new(sep.outputs[2], bsdf.inputs['Metallic'])
    tn = nt.nodes.new('ShaderNodeTexImage')
    tn.image = nrm
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nm.inputs['Strength'].default_value = normal_strength
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Specular IOR Level'].default_value = 0.3
    mat.use_backface_culling = False
    return mat


def assign(o, mat):
    o.data.materials.clear()
    o.data.materials.append(mat)
    for pp in o.data.polygons:
        pp.material_index = 0


def stage_paint():
    tmp = WORK
    os.makedirs(tmp, exist_ok=True)
    refs, meta = garment_refs()
    gnames = list(refs.keys())
    # ---- garments + props ----
    npz = os.path.join(tmp, 'garment_bake.npz')
    if os.environ.get('TOWNSFOLK_REUSE_BAKE') and os.path.isfile(npz):
        maps = dict(np.load(npz))
        log('reusing garment bake', npz)
    else:
        objs = list(refs.values())
        gids = {o: i + 1 for i, o in enumerate(objs)}
        offsets, occ = {}, []
        for i, (n, o) in enumerate(refs.items()):
            offsets[o] = 3.0 * (i + 1)
            if o.get('body_id'):
                b = bpy.data.objects[f'body.{o["body_id"]}']
                c = b.copy()
                c.data = b.data.copy()
                c.parent = None
                for mm in list(c.modifiers):
                    c.modifiers.remove(mm)
                bpy.context.scene.collection.objects.link(c)
                c.matrix_world = Matrix.Identity(4)
                c.hide_render = False
                occ.append((c, o))
        # garments are parented to their rigs: bake in rest pose; unparent temporarily is not needed (identity)
        for o in objs:
            o.hide_render = False
        maps = dilate(bake(objs, TEX, gids=gids, offsets=offsets, occluders=occ, ao_samples=32))
        for c, _ in occ:
            bpy.data.meshes.remove(c.data)
        np.savez_compressed(npz, **maps)
    maps['_lm'] = json.loads(bpy.data.objects['rig.man']['landmarks'])
    base, orm, nrm = paint_garments(maps, gnames)
    i_base = R.save_image('kit_basecolor', base, os.path.join(tmp, 'kit_basecolor.jpg'), True, 92)
    i_orm = R.save_image('kit_orm', orm, os.path.join(tmp, 'kit_orm.jpg'), False, 90)
    i_nrm = R.save_image('kit_normal', nrm, os.path.join(tmp, 'kit_normal.jpg'), False, 92)
    gmat = make_material('kit_garment', i_base, i_orm, i_nrm, dye=True, normal_strength=0.8)

    # ---- skins ----
    npz = os.path.join(tmp, 'skin_bake.npz')
    lms = {bid: json.loads(bpy.data.objects[f'rig.{bid}']['landmarks']) for bid in BODY_ORDER}
    if os.environ.get('TOWNSFOLK_REUSE_BAKE') and os.path.isfile(npz):
        smaps = dict(np.load(npz))
        log('reusing skin bake', npz)
    else:
        objs, skin_imgs, offsets = [], {}, {}
        for t, bid in enumerate(BODY_ORDER):
            png = glob.glob(os.path.join(CACHE, 'mh', BODIES[bid]['skin'], '*.png'))
            img = bpy.data.images.load(png[0]) if png else None
            for part in ('body', 'eye_l', 'eye_r'):
                o = bpy.data.objects[f'{part}.{bid}']
                objs.append(o)
                offsets[o] = 3.0 * (t + 1)
                if img is not None and part == 'body':
                    skin_imgs[o] = img
        smaps = dilate(bake(objs, SKIN_TEX, skin_imgs=skin_imgs, offsets=offsets, ao_samples=32))
        np.savez_compressed(npz, **smaps)
    sbase, sorm, snrm = paint_skins(smaps, lms)
    s_base = R.save_image('kit_skin_basecolor', sbase, os.path.join(tmp, 'kit_skin_basecolor.jpg'), True, 92)
    s_orm = R.save_image('kit_skin_orm', sorm, os.path.join(tmp, 'kit_skin_orm.jpg'), False, 90)
    s_nrm = R.save_image('kit_skin_normal', snrm, os.path.join(tmp, 'kit_skin_normal.jpg'), False, 92)
    smat = make_material('kit_skin', s_base, s_orm, s_nrm, dye=False, normal_strength=0.5)
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        if o.name.startswith(('body.', 'eye_')):
            assign(o, smat)
        elif o.get('garment') or o.get('prop'):
            assign(o, gmat)
            o['dye_rgb'] = (1.0, 1.0, 1.0)
    for mm in list(bpy.data.materials):
        if mm.name.startswith('P_') and mm.users == 0:
            bpy.data.materials.remove(mm)
