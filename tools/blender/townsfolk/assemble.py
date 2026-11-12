# BELFORT townsfolk kit - stage 5: the 14 archetypes, assembled from the kit for the approval lineup.
#
# Each archetype is: one body + one piece per slot + props, with a dye colour per piece. For the previews every
# archetype gets its own copy of its body's rig (posed independently), instanced garment objects (shared mesh
# data, own dye colour) and a copy of the body with the faces hidden under its garments removed (the kit's
# delete-mask). Poses come from the rider's own clips in public/models/rider.glb, retargeted in world space.

import bpy, bmesh, math, json, os
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from .common import log, RIDER_GLB, PREVIEW, get_bm, put_bm, srgb, to_coll
from .bodies import BODIES, BODY_ORDER
from .props import PROPS, grip_frame

# 1650 palette (linear-light multipliers are derived from these sRGB swatches)
PAL = {
    'madder': '#9a3226', 'madder_dk': '#6e2219', 'woad': '#41618a', 'woad_dk': '#2c4260', 'linen': '#e2d6bc',
    'russet': '#6e4630', 'black': '#262326', 'beguine': '#1f1c1e', 'capuchin': '#6a4f34', 'grey': '#7a756c',
    'moss': '#56663e', 'ochre': '#b89040', 'brown': '#5e4430', 'white': '#ffffff', 'slate': '#4a5058',
    'h_dark': '#3a2a20', 'h_brown': '#5e4028', 'h_chestnut': '#7a4a2a', 'h_blond': '#b8955a', 'h_grey': '#b8b2a8',
    'h_white': '#ddd8d0', 'h_black': '#241c18', 'h_red': '#8a4a26',
}

# archetype -> body, pieces {garment: dye}, props [(prop)], note
ARCHETYPES = [
    ('beguine', 'woman_stout', {'habit': 'beguine', 'beguine_veil': 'white', 'apron': 'linen', 'shoes': None},
     ['rosary@hand_r'], 'beguine of the Diest begijnhof: black habit, white wimple and veil'),
    ('peasant_woman', 'woman_stout', {'hair_bun': 'h_brown', 'coif': 'white', 'bodice': 'madder', 'kerchief': 'white',
                                      'skirt': 'woad', 'apron': 'linen', 'clogs': None}, ['basket@hand_r'], 'market woman with basket'),
    ('burgher_wife', 'woman', {'hair_bun': 'h_chestnut', 'bodice': 'black', 'kerchief': 'white', 'skirt': 'black',
                               'huik': 'black', 'shoes': None}, [], 'burgher\'s wife in a huik'),
    ('maid', 'woman', {'hair_bun': 'h_blond', 'coif': 'white', 'bodice': 'woad', 'kerchief': 'white', 'skirt': 'russet',
                       'apron': 'linen', 'shoes': None}, ['bread@hand_r'], 'maid with coif, apron and loaves'),
    ('old_woman', 'woman_old', {'hair_bun': 'h_grey', 'coif': 'white', 'bodice': 'brown', 'kerchief': 'white',
                                'skirt': 'moss', 'apron': 'grey', 'shoes': None}, ['bundle@hand_r'], 'old woman with a bundle'),
    ('girl', 'girl', {'hair_bun': 'h_blond', 'coif': 'white', 'bodice': 'madder', 'kerchief': 'white', 'skirt': 'ochre',
                      'apron': 'linen', 'clogs': None}, [], 'girl of about eight'),
    ('peasant_man', 'man', {'hair_crop': 'h_brown', 'moustache': 'h_brown', 'cap_flat': 'russet', 'smock': 'linen',
                            'belt': None, 'breeches': 'brown', 'stockings': 'grey', 'clogs': None}, [],
                            'peasant in a flat cap and smock'),
    ('merchant', 'man_stout', {'hair_long': 'h_dark', 'beard_pointed': 'h_dark', 'hat_wide': 'black', 'doublet': 'black',
                               'collar_band': 'white', 'breeches': 'black', 'stockings': 'black', 'shoes': None}, [],
                               'merchant / burgher in black with a falling band'),
    ('soldier', 'man_young', {'hair_crop': 'h_black', 'moustache': 'h_black', 'morion': None, 'doublet': 'madder_dk',
                              'buff_coat': None, 'sash': 'madder', 'breeches': 'slate', 'stockings': 'grey', 'boots': None},
     [], 'Spanish soldier: cabasset, buff coat, red sash'),
    ('friar', 'man_stout', {'hair_crop': 'h_brown', 'beard_full': 'h_brown', 'habit': 'capuchin', 'capuche': 'capuchin',
                            'rope_belt': None, 'shoes': None}, [], 'Capuchin friar'),
    ('pilgrim', 'man', {'hair_long': 'h_chestnut', 'beard_pointed': 'h_chestnut', 'hat_pilgrim': 'brown',
                        'pelerine': 'russet', 'smock': 'grey', 'belt': None, 'breeches': 'brown', 'stockings': 'linen',
                        'shoes': None}, ['staff'], 'pilgrim with hat, pelerine and staff'),
    ('old_man', 'man_old', {'hair_thin': 'h_white', 'beard_full': 'h_white', 'doublet': 'brown', 'collar_band': 'white',
                            'breeches': 'brown', 'stockings': 'grey', 'shoes': None}, ['stick'], 'old man with a stick'),
    ('boy', 'boy', {'hair_child': 'h_chestnut', 'cap_flat': 'woad', 'smock': 'linen', 'belt': None, 'breeches': 'russet',
                    'stockings': 'grey', 'shoes': None}, [], 'boy of about ten'),
    ('journeyman', 'man_young', {'hair_long': 'h_brown', 'cap_flat': 'madder', 'doublet': 'woad', 'collar_band': 'white',
                                 'breeches': 'russet', 'stockings': 'linen', 'boots': None}, ['bundle@hand_r'], 'young journeyman on the road'),
]
HATS = {'hat_wide', 'hat_pilgrim', 'cap_flat', 'morion'}
NO_HIDE = {'hat_wide', 'hat_pilgrim', 'cap_flat', 'morion', 'beard_pointed', 'moustache', 'beard_full'}
HIDE_DIST = {'skirt': 0.40, 'habit': 0.40, 'huik': 0.06, 'apron': 0.0, 'smock': 0.16, 'buff_coat': 0.12, 'breeches': 0.10,
             'hair_crop': 0.035, 'hair_long': 0.035, 'hair_thin': 0.03, 'hair_child': 0.035, 'hair_bun': 0.03,
             'coif': 0.05, 'beguine_veil': 0.06, 'kerchief': 0.05, 'collar_band': 0.02, 'capuche': 0.05, 'pelerine': 0.05}


def dye_lin(name):
    if name is None:
        return (1.0, 1.0, 1.0)
    c = srgb(PAL[name])
    # the painted neutral mid-tone is ~0.55 linear: divide it out so the dyed mid-tone lands on the swatch
    return tuple(min(1.6, v / 0.55) for v in c[:3])


# --------------------------------------------------------------------------
def hide_covered(body_copy, garments, lm=None):
    """Delete body faces whose outward ray meets one of the outfit's garments within that garment's distance.
    Above the waist the distance is capped (loose tops stand off the body) and at the neck it is tiny, so no
    skin goes missing where a collar or neckline stands open."""
    trees = []
    for g in garments:
        gname = g.get('garment')
        if gname in NO_HIDE:
            continue
        d = HIDE_DIST.get(gname, 0.08)
        if d <= 0:
            continue
        me = g.data
        verts = [v.co.copy() for v in me.vertices]
        polys = [list(p.vertices) for p in me.polygons]
        trees.append((BVHTree.FromPolygons(verts, polys), d))
    bm = get_bm(body_copy)
    bm.normal_update()
    kill = []
    waist = lm['waist_z'] if lm else -9
    neck = lm['neck_01'][2] if lm else 9
    for f in bm.faces:
        c = f.calc_center_median()
        n = f.normal
        cap = 9.0
        if c.z > waist:
            cap = 0.06
        if c.z > neck - 0.10:
            cap = 0.018
        for t, d in trees:
            hit = t.ray_cast(c + n * 0.001, n, min(d, cap) if c.z < neck + 0.02 else d)[0]
            if hit is not None:
                # also check a second ray straight out horizontally (stops slivers at openings)
                kill.append(f)
                break
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    put_bm(bm, body_copy)
    return len(kill)


def hair_under_hat(hair, hat):
    """A hat flattens the hair: drop the hair faces above the brim (and inside the brim's reach)."""
    co = np.array([v.co[:] for v in hat.data.vertices])
    cx, cy = co[:, 0].mean(), co[:, 1].mean()
    rad = np.hypot(co[:, 0] - cx, co[:, 1] - cy)
    brim_r = rad.max()
    crown = co[rad < brim_r * 0.6]
    brim_z = np.percentile(co[rad > brim_r * 0.8][:, 2], 50) if (rad > brim_r * 0.8).any() else co[:, 2].min()
    bm = get_bm(hair)
    kill = [f for f in bm.faces if f.calc_center_median().z > brim_z - 0.004
            and math.hypot(f.calc_center_median().x - cx, f.calc_center_median().y - cy) < brim_r]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    put_bm(bm, hair)


def instance(o, rig, cname, name=None, copy_data=False):
    c = o.copy()
    if copy_data:
        c.data = o.data.copy()
    c.name = name or o.name + '@'
    bpy.context.scene.collection.objects.link(c)
    c.parent = rig
    c.matrix_parent_inverse = Matrix.Identity(4)
    for m in c.modifiers:
        if m.type == 'ARMATURE':
            m.object = rig
    c.hide_render = False
    c.hide_set(False)
    to_coll(c, cname)
    return c


def build_archetypes():
    made = {}
    for aid, bid, pieces, props, note in ARCHETYPES:
        base_rig = bpy.data.objects[f'rig.{bid}']
        rig = base_rig.copy()
        rig.name = f'A.{aid}'
        bpy.context.scene.collection.objects.link(rig)
        to_coll(rig, f'A.{aid}')
        rig.hide_render = False
        rig['archetype'] = aid
        cname = f'A.{aid}'
        gs = []
        for g, dye in pieces.items():
            src = bpy.data.objects.get(f'{g}.{bid}')
            if src is None:
                log('  WARNING', aid, 'has no', g, 'for', bid)
                continue
            o = instance(src, rig, cname, f'{aid}.{g}')
            o['dye_rgb'] = dye_lin(dye)
            gs.append(o)
        hats = [o for o in gs if o.get('garment') in HATS]
        for h in [o for o in gs if o.get('slot') == 'hair'] if hats else []:
            h.data = h.data.copy()
            hair_under_hat(h, hats[0])
        body = instance(bpy.data.objects[f'body.{bid}'], rig, cname, f'{aid}.body', copy_data=True)
        n = hide_covered(body, gs, json.loads(base_rig['landmarks']))
        for e in ('eye_l', 'eye_r'):
            instance(bpy.data.objects[f'{e}.{bid}'], rig, cname, f'{aid}.{e}')
        pr = []
        for pspec in props:
            pn, _, hand = pspec.partition('@')
            src = bpy.data.objects[f'prop.{pn}']
            o = instance(src, rig, cname, f'{aid}.prop.{pn}')
            o['dye_rgb'] = dye_lin('linen' if pn != 'bundle' else 'grey')
            o['grip'] = PROPS[pn]['grip']
            o['hand'] = hand or PROPS[pn]['hand']
            pr.append(o)
        made[aid] = dict(rig=rig, body=body, garments=gs, props=pr, bid=bid)
        log('archetype %-14s on %-11s %2d pieces, %d props, %5d body faces hidden' % (aid, bid, len(gs), len(pr), n))
    return made


def stage_assemble():
    for o in bpy.data.objects:
        if o.type == 'MESH':
            o.hide_render = True
    made = build_archetypes()
    bpy.context.scene['archetypes'] = json.dumps({a[0]: dict(body=a[1], pieces=a[2], props=a[3], note=a[4]) for a in ARCHETYPES})


# --------------------------------------------------------------------------
# posing: world-space retarget of one frame of a rider clip
# --------------------------------------------------------------------------
def import_rider():
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=RIDER_GLB)
    new = [o for o in bpy.data.objects if o not in before]
    arm = [o for o in new if o.type == 'ARMATURE'][0]
    for o in new:
        # the sword stays hidden (as in town); the importer's bone-shape icosphere too
        if o.name.startswith('sword') or (o.parent and o.parent.name.startswith('sword')) or o.parent is None and o.type == 'MESH':
            o.hide_render = True
        to_coll(o, 'rider')
    arm['is_rider'] = True
    arm.rotation_mode = 'XYZ'
    arm.rotation_euler = (0, 0, 0)
    return arm, new


def rider_action(arm, clip):
    for a in bpy.data.actions:
        nm = a.name.split('_rider')[0].split('.')[0]
        if nm == clip or a.name == clip:
            return a
    raise KeyError(clip)


def set_clip(arm, clip, frame):
    arm.animation_data_create()
    arm.animation_data.action = rider_action(arm, clip)
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()


def retarget(src, rig, ground=True, stand_scale=None):
    """Copy src's current pose onto rig: each bone's world rotation away from its rest is applied to the
    matching bone; the hips move by the leg-length ratio; the lowest foot joint is put back on the ground."""
    bpy.context.view_layer.update()
    SW, TW = src.matrix_world, rig.matrix_world
    sb, tb = src.data.bones, rig.data.bones
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    bpy.context.view_layer.update()
    order = [b.name for b in tb]
    k_len = tb['pelvis'].head_local.z / sb['pelvis'].head_local.z if 'pelvis' in sb else 1.0
    # rest heights are measured in the armatures' own spaces (both on the ground at their origins)
    s_rest_pel = sb['pelvis'].head_local
    s_pel = src.pose.bones['pelvis'].head
    off = (s_pel - s_rest_pel) * k_len
    for n in order:
        if n not in src.pose.bones or n == 'Root':
            continue
        spb = src.pose.bones[n]
        Rs0 = (SW.to_3x3() @ sb[n].matrix_local.to_3x3()).normalized()
        Rs = (SW.to_3x3() @ spb.matrix.to_3x3()).normalized()
        Rt0 = (TW.to_3x3() @ tb[n].matrix_local.to_3x3()).normalized()
        Rt = Rs @ Rs0.inverted() @ Rt0
        pb = rig.pose.bones[n]
        M = (TW.inverted().to_3x3() @ Rt).to_4x4()
        head = pb.head.copy()
        if n == 'pelvis':
            head = tb['pelvis'].head_local + TW.inverted().to_3x3() @ (SW.to_3x3() @ off)
        M.translation = head
        pb.matrix = M
        bpy.context.view_layer.update()
    if ground:
        low = min(rig.pose.bones[f'{j}_{s}'].head.z - tb[f'{j}_{s}'].head_local.z for j in ('ball', 'foot') for s in ('l', 'r'))
        pel = rig.pose.bones['pelvis']
        M = pel.matrix.copy()
        M.translation.z -= low
        pel.matrix = M
        bpy.context.view_layer.update()


def hold_pose(rig, grip):
    """Bend the right elbow forward for a held staff or stick (the hand at about hip height, in front)."""
    if grip != 'fist':
        return
    from .common import R
    R.aim_world(rig, 'upperarm_r', Vector((-0.10, -0.25, -1.0)))
    R.aim_world(rig, 'lowerarm_r', Vector((-0.08, -0.85, -0.45)))
    R.aim_world(rig, 'hand_r', Vector((-0.05, -0.90, -0.40)))
    R.curl_fingers(rig, 0.8)


def attach_props(info):
    rig = info['rig']
    for o in info['props']:
        if o['grip'] == 'fist':
            hold_pose(rig, 'fist')
    bpy.context.view_layer.update()
    for o in info['props']:
        hand = o['hand']
        M = grip_frame(rig, hand, o['grip'], pose=True)
        if o['grip'] in ('hang', 'fist'):
            # hanging things hang and staffs stand upright: keep the grip point, straighten the prop to gravity
            z = Vector((0, 0, 1))
            x = (M.to_3x3() @ Vector((1, 0, 0)))
            x = (x - z * x.dot(z)).normalized()
            y = z.cross(x)
            M2 = Matrix((x, y, z)).transposed().to_4x4()
            M2.translation = M.translation
            if o['grip'] == 'hang':
                # held a little away from the body so it clears a wide skirt
                side = 1.0 if hand.endswith('_l') else -1.0
                M2.translation += Vector((0.06 * side, 0, 0))
            M = M2
        o.parent = rig
        o.parent_type = 'BONE'
        o.parent_bone = hand
        o.matrix_world = rig.matrix_world @ M


# --------------------------------------------------------------------------
# preview renders
# --------------------------------------------------------------------------
def layout(entries, spacing, yaw_deg):
    n = len(entries)
    for i, (rig, w) in enumerate(entries):
        rig.location = Vector(((i - (n - 1) / 2) * spacing, 0, 0))
        rig.rotation_euler = (0, 0, math.radians(yaw_deg))
    bpy.context.view_layer.update()


def contact_sheet(paths, out):
    """Put same-sized renders side by side (numpy; no PIL inside Blender)."""
    arrs = []
    for p in paths:
        im = bpy.data.images.load(p)
        w, h = im.size
        a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
        arrs.append(a)
        bpy.data.images.remove(im)
    sheet = np.concatenate(arrs, axis=1)
    h, w, _ = sheet.shape
    img = bpy.data.images.new('sheet', w, h, alpha=True)
    img.pixels.foreach_set(sheet.ravel())
    img.filepath_raw = out
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    log('rendered', out)


def contact_sheet_v(paths, out):
    arrs = []
    for p in paths:
        im = bpy.data.images.load(p)
        w, h = im.size
        arrs.append(np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4))
        bpy.data.images.remove(im)
    sheet = np.concatenate(arrs[::-1], axis=0)        # pixel rows run bottom-up
    h, w, _ = sheet.shape
    img = bpy.data.images.new('sheet', w, h, alpha=True)
    img.pixels.foreach_set(sheet.ravel())
    img.filepath_raw = out
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    log('rendered', out)


def render_previews():
    from . import preview as P
    shots = os.environ.get('TOWNSFOLK_SHOTS', 'all')
    shots = ['front', 'back', 'faces', 'sit', 'check'] if shots in ('all', '') else shots.split(',')
    samples = int(os.environ.get('TOWNSFOLK_SAMPLES', '48'))
    arch = {o['archetype']: o for o in bpy.data.objects if o.get('archetype')}
    if not arch:
        stage_assemble()
        arch = {o['archetype']: o for o in bpy.data.objects if o.get('archetype')}
    order = [a[0] for a in ARCHETYPES]
    rider, rider_objs = import_rider()
    info = {}
    for aid in order:
        rig = arch[aid]
        info[aid] = dict(rig=rig, props=[o for o in bpy.data.objects if o.parent == rig and o.get('grip')])
    frame = int(os.environ.get('TOWNSFOLK_WALK_FRAME', '1'))

    def pose_all(clip, fr):
        set_clip(rider, clip, fr)
        for aid in order:
            retarget(rider, info[aid]['rig'])
            attach_props(info[aid])

    cam = P.setup_scene(samples=samples, res=(3200, 1200))
    os.makedirs(PREVIEW, exist_ok=True)
    if 'front' in shots or 'back' in shots or 'faces' in shots:
        pose_all('walk', frame)
        entries = [(rider, None)] + [(info[a]['rig'], None) for a in order]
        spacing = 0.92
        n = len(entries)
        span = (n - 1) * spacing
        for view, yaw in (('front', 32), ('back', 180 + 32)):
            if view not in shots:
                continue
            layout(entries, spacing, yaw)
            P.sun_dir(-32 if view == 'front' else 148, 24)
            # a long lens from far away: little perspective, everyone the same size
            d = 60.0
            lens = 50 * d / (span + 2.2) * (36 / 50) * 1.0
            P.shot(cam, os.path.join(PREVIEW, f'lineup_{view}.png'), (0, -d, 1.05 + d * 0.035), (0, 0, 0.82),
                   lens=lens, res=(3200, 1000))
        if 'faces' in shots:
            layout(entries, spacing, 22)
            P.sun_dir(-40, 28)
            names = []
            fill = bpy.data.objects['pv_fill']
            e0 = fill.data.energy
            fill.data.energy = e0 * 1.6
            for aid in ('old_woman', 'merchant', 'beguine', 'boy'):
                rig = info[aid]['rig']
                k = rig.data.bones['head'].head_local.z / 1.55
                hb = rig.pose.bones['head']
                hc = rig.matrix_world @ (hb.head + Vector((0, 0, 0.055 * k)))
                fwd = (rig.matrix_world.to_3x3() @ Vector((0, -1, 0))).normalized()
                side = Matrix.Rotation(math.radians(-22), 3, 'Z') @ fwd
                camp = hc + side * 1.25 + Vector((0, 0, 0.02))
                key = bpy.data.objects.get('pv_face')
                if key is None:
                    kd = bpy.data.lights.new('pv_face', 'AREA')
                    kd.energy, kd.size, kd.color = 110.0, 0.9, (1.0, 0.86, 0.70)
                    key = bpy.data.objects.new('pv_face', kd)
                    bpy.context.scene.collection.objects.link(key)
                key.location = hc + (Matrix.Rotation(math.radians(-50), 3, 'Z') @ fwd) * 1.3 + Vector((0, 0, 0.06))
                P.look_at(key, hc)
                pth = os.path.join(PREVIEW, f'face_{aid}.png')
                P.shot(cam, pth, camp, hc - Vector((0, 0, 0.035 * k)), lens=85, res=(900, 1000))
                names.append(pth)
            fill.data.energy = e0
            bpy.data.objects['pv_face'].hide_render = True
            contact_sheet(names, os.path.join(PREVIEW, 'faces.png'))
    if 'check' in shots:
        # clipping check: everyone side-on in four poses, one strip each
        strips = []
        entries = [(info[a]['rig'], None) for a in order]
        for clip, fr in (('walk', 1), ('walk', 14), ('talk', 40), ('sit', 20)):
            set_clip(rider, clip, fr)
            for aid in order:
                retarget(rider, info[aid]['rig'], ground=(clip != 'sit'))
                attach_props(info[aid])
            layout(entries, 0.95, 90 if clip != 'talk' else 25)
            rider.location = Vector((200, 0, 0))
            pth = os.path.join(PREVIEW, f'check_{clip}_{fr}.png')
            P.shot(cam, pth, (0, -40, 1.0), (0, 0, 0.8), lens=50 * 40 / 15.5 * 0.72, res=(3000, 520))
            strips.append(pth)
        contact_sheet_v(strips, os.path.join(PREVIEW, 'pose_check.png'))
    if 'sit' in shots:
        set_clip(rider, 'sit', 20)
        sitters = ['old_man', 'peasant_woman', 'boy']
        for aid in order:
            info[aid]['rig'].location = Vector((100, 100, 0))
        rider.location = Vector((100, 120, 0))
        m = bpy.data.materials.get('pv_bench') or bpy.data.materials.new('pv_bench')
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = srgb('#6a4a30')
        for i, aid in enumerate(sitters):
            rig = info[aid]['rig']
            rig.location = Vector(((i - 1) * 0.95, 0, 0))
            rig.rotation_euler = (0, 0, math.radians(20))
            retarget(rider, rig, ground=False)
            attach_props(info[aid])
            k = rig.data.bones['pelvis'].head_local.z / 0.972
            seat = 0.42 * k
            bpy.ops.mesh.primitive_cube_add(size=1)
            bench = bpy.context.object
            bench.name = f'pv_bench{i}'
            bench.data.materials.append(m)
            bench.scale = (0.62, 0.40 * k, seat)
            bench.location = rig.matrix_world @ Vector((0, 0.13 * k, seat / 2))
            bench.rotation_euler = rig.rotation_euler
        # legs of the bench
        P.sun_dir(-30, 26)
        P.shot(cam, os.path.join(PREVIEW, 'sit.png'), (1.2, -4.6, 1.2), (0, 0, 0.65), lens=50, res=(1800, 1100))
    log('previews in', PREVIEW)
