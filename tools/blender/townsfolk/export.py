# BELFORT townsfolk kit - stage 'export': public/models/townsfolk.glb + townsfolk.json.
#
# GLB layout (glTF, Y up, metres):
#   rig.<body>      armature (extras {"kit":"rig","body":b}); children: its joints, body.<body> and every fitted
#                   piece <piece>.<body> (skinned to that armature only; extras tag kit/body/piece)
#   prop.<name>     unskinned mesh, origin at the grip, +Y up the held object (extras {"kit":"prop","prop":name})
#   materials       'kit' (garment/prop atlas) and 'skin' (skin atlas), embedded JPEG
#   COLOR_0         pieces and props only: r = takes dye
#   _REGION         bodies and hair: float region code (regions in the manifest)
#   animations      one shared clip set, keyed on rig.man's joints (rotations; translation on pelvis only)
# Post-pass (no third-party tools): quantised normals (int8), UVs (uint16) and weights / colours (uint8)
# under KHR_mesh_quantization; identical buffer views (indices, UVs, colours shared by every body's copy of a
# piece) stored once; translation / scale channels other than the pelvis' removed.

import bpy, os, json, struct, math
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from .common import log, REPO, WORK, to_coll
from .bodies import BODIES, BODY_ORDER, FACE_MORPHS, MORPH_ATTR
from .props import PROPS, grip_frame

OUT_GLB = os.environ.get('TOWNSFOLK_GLB', os.path.join(REPO, 'public', 'models', 'townsfolk.glb'))
OUT_JSON = os.environ.get('TOWNSFOLK_JSON', os.path.join(REPO, 'public', 'models', 'townsfolk.json'))

PALETTE = {
    'madder': '#9a3226', 'madder_dk': '#6e2219', 'rose': '#a8584a', 'woad': '#41618a', 'woad_dk': '#2c4260',
    'woad_lt': '#7088a6', 'linen': '#e2d6bc', 'white': '#ffffff', 'russet': '#6e4630', 'brown': '#5e4430',
    'umber': '#4a3626', 'black': '#262326', 'beguine': '#1f1c1e', 'capuchin': '#6a4f34', 'grey': '#7a756c',
    'slate': '#4a5058', 'moss': '#56663e', 'green_dk': '#3e4a30', 'ochre': '#b89040', 'saffron': '#c49a3a',
    'violet': '#5a4256', 'h_dark': '#3a2a20', 'h_brown': '#5e4028', 'h_chestnut': '#7a4a2a', 'h_blond': '#b8955a',
    'h_grey': '#b8b2a8', 'h_white': '#ddd8d0', 'h_black': '#241c18', 'h_red': '#8a4a26',
}
DULL = ['umber', 'brown', 'grey', 'slate', 'russet', 'green_dk']
# skin tone multipliers (linear RGB) applied where the body's COLOR_0.r is 1: pale ... weathered
SKIN_TONES = [[1.06, 1.03, 1.01], [1.0, 1.0, 1.0], [1.03, 0.97, 0.94], [0.98, 0.96, 0.90], [0.97, 0.90, 0.84],
              [0.92, 0.86, 0.80], [0.90, 0.81, 0.73], [0.95, 0.94, 0.93]]
MORPH_RANGE = {'brow': (-0.6, 1.0)}             # everything else: -1 .. 1
WORK_DYES = ['russet', 'brown', 'grey', 'umber', 'moss', 'linen']
GOOD_DYES = ['madder', 'woad', 'russet', 'moss', 'ochre', 'brown', 'woad_dk', 'rose']
HAIR_M = ['h_dark', 'h_brown', 'h_chestnut', 'h_blond', 'h_black', 'h_red']
HAIR_F = ['h_brown', 'h_chestnut', 'h_blond', 'h_dark', 'h_red']
HAIR_OLD = ['h_grey', 'h_white']


def P(piece, *dyes):
    return {'piece': piece, 'dye': list(dyes)} if dyes else {'piece': piece}


# Archetype templates: one option is picked per slot, then one dye from its list.
ARCHETYPES = [
    dict(id='beguine', role='beguine', weight=2, bodies=['woman_stout', 'woman'], gait='walk_formal',
         slots=dict(torso=[P('habit', 'beguine')], head=[P('beguine_veil')], apron=[P('apron', 'linen', 'white')],
                    feet=[P('shoes')], hair=[P('hair_bun', *HAIR_F)]),
         optional=dict(apron=0.5), props=[['rosary', 3], [None, 2], ['basket', 1]]),
    dict(id='peasant_woman', role='peasantWoman', weight=5, bodies=['woman_stout', 'woman'], gait='walk',
         slots=dict(hair=[P('hair_bun', *HAIR_F)], head=[P('coif')], torso=[P('bodice', 'madder', 'woad', 'russet', 'moss', 'brown')],
                    collar=[P('kerchief')], legs=[P('skirt', 'woad', 'russet', 'grey', 'moss', 'madder_dk', 'brown')],
                    apron=[P('apron', 'linen', 'white', 'grey')], feet=[P('clogs'), P('shoes')]),
         optional=dict(apron=0.85), props=[['basket', 3], ['bread', 1], ['bundle', 1], [None, 3]]),
    dict(id='maid', role='peasantWoman', weight=3, bodies=['woman', 'woman_stout'], gait='walk',
         slots=dict(hair=[P('hair_bun', *HAIR_F)], head=[P('coif')], torso=[P('bodice', 'woad', 'rose', 'ochre', 'woad_lt', 'madder')],
                    collar=[P('kerchief')], legs=[P('skirt', 'russet', 'woad_dk', 'brown', 'grey')],
                    apron=[P('apron', 'linen', 'white')], feet=[P('shoes'), P('clogs')]),
         props=[['bread', 2], ['basket', 2], ['lantern', 1], [None, 3]]),
    dict(id='burgher_wife', role='huik', weight=3, bodies=['woman', 'woman_stout'], gait='walk_formal',
         slots=dict(hair=[P('hair_bun', *HAIR_F)], torso=[P('bodice', 'black', 'violet', 'woad_dk')], collar=[P('kerchief')],
                    legs=[P('skirt', 'black', 'woad_dk', 'violet')], mantle=[P('huik', 'black')], feet=[P('shoes')]),
         props=[[None, 4], ['rosary', 1]]),
    dict(id='burgher_wife_bare', role='burgher', weight=2, bodies=['woman', 'woman_stout'], gait='walk_formal',
         slots=dict(hair=[P('hair_bun', *HAIR_F)], head=[P('coif')], torso=[P('bodice', 'black', 'violet', 'woad_dk', 'madder_dk')],
                    collar=[P('kerchief')], legs=[P('skirt', 'black', 'woad_dk', 'violet', 'umber')], feet=[P('shoes')]),
         props=[[None, 3], ['basket', 1]]),
    dict(id='old_woman', role='oldWoman', weight=3, bodies=['woman_old'], gait='walk_old',
         slots=dict(hair=[P('hair_bun', *HAIR_OLD)], head=[P('coif')], torso=[P('bodice', 'brown', 'umber', 'grey', 'black')],
                    collar=[P('kerchief')], legs=[P('skirt', 'moss', 'green_dk', 'umber', 'black', 'grey')],
                    apron=[P('apron', 'grey', 'linen')], feet=[P('shoes'), P('clogs')]),
         optional=dict(apron=0.7), props=[['bundle', 2], ['basket', 1], [None, 2]]),
    dict(id='old_woman_huik', role='oldWoman', weight=1, bodies=['woman_old'], gait='walk_old',
         slots=dict(hair=[P('hair_bun', *HAIR_OLD)], torso=[P('bodice', 'black', 'umber')], collar=[P('kerchief')],
                    legs=[P('skirt', 'black', 'umber')], mantle=[P('huik', 'black')], feet=[P('shoes')]),
         props=[[None, 3], ['rosary', 1]]),
    dict(id='girl', role='child', weight=3, bodies=['girl'], gait='walk',
         slots=dict(hair=[P('hair_bun', 'h_blond', 'h_chestnut', 'h_brown', 'h_red')], head=[P('coif')],
                    torso=[P('bodice', 'madder', 'woad', 'rose', 'ochre')], collar=[P('kerchief')],
                    legs=[P('skirt', 'ochre', 'russet', 'woad', 'brown')], apron=[P('apron', 'linen', 'white')],
                    feet=[P('clogs'), P('shoes')]),
         optional=dict(apron=0.6), props=[[None, 4], ['bread', 1]]),
    dict(id='peasant_man', role='peasant', weight=5, bodies=['man', 'man_young', 'man_stout'], gait='walk',
         slots=dict(hair=[P('hair_crop', *HAIR_M), P('hair_long', *HAIR_M)], beard=[P('moustache', *HAIR_M), P('beard_full', *HAIR_M)],
                    head=[P('cap_flat', 'russet', 'brown', 'grey', 'madder_dk', 'woad_dk')],
                    torso=[P('smock', 'linen', 'grey', 'linen')], belt=[P('belt')],
                    legs=[P('breeches', 'brown', 'russet', 'grey', 'umber')], legs_under=[P('stockings', 'grey', 'linen', 'brown')],
                    feet=[P('clogs'), P('shoes')]),
         optional=dict(beard=0.6, head=0.8), props=[[None, 4], ['bundle', 1], ['basket', 1]]),
    dict(id='journeyman', role='peasant', weight=3, bodies=['man_young', 'man'], gait='walk',
         slots=dict(hair=[P('hair_long', *HAIR_M), P('hair_crop', *HAIR_M)], beard=[P('moustache', *HAIR_M)],
                    head=[P('cap_flat', 'madder', 'woad', 'russet', 'black')],
                    torso=[P('doublet', 'woad', 'russet', 'moss', 'grey', 'ochre')], collar=[P('collar_band')],
                    legs=[P('breeches', 'russet', 'brown', 'grey', 'slate')], legs_under=[P('stockings', 'linen', 'grey', 'madder')],
                    feet=[P('boots'), P('shoes')]),
         optional=dict(beard=0.3, head=0.7, collar=0.7), props=[['bundle', 2], ['staff', 1], [None, 2]]),
    dict(id='merchant', role='burgher', weight=4, bodies=['man_stout', 'man', 'man_old'], gait='walk_formal',
         slots=dict(hair=[P('hair_long', *HAIR_M), P('hair_crop', *HAIR_M)], beard=[P('beard_pointed', *HAIR_M), P('moustache', *HAIR_M)],
                    head=[P('hat_wide', 'black', 'umber', 'grey')], torso=[P('doublet', 'black', 'black', 'umber', 'woad_dk', 'violet')],
                    collar=[P('collar_band')], legs=[P('breeches', 'black', 'umber', 'woad_dk')],
                    legs_under=[P('stockings', 'black', 'grey', 'linen')], feet=[P('shoes')]),
         props=[[None, 5], ['stick', 1]]),
    dict(id='soldier', role='soldier', weight=3, bodies=['man_young', 'man'], gait='walk',
         slots=dict(hair=[P('hair_crop', *HAIR_M)], beard=[P('moustache', *HAIR_M), P('beard_pointed', *HAIR_M)],
                    head=[P('morion'), P('hat_wide', 'black', 'umber')], torso=[P('doublet', 'madder_dk', 'umber', 'slate', 'ochre')],
                    coat=[P('buff_coat')], sash=[P('sash', 'madder')], legs=[P('breeches', 'slate', 'umber', 'grey', 'madder_dk')],
                    legs_under=[P('stockings', 'grey', 'madder', 'linen')], feet=[P('boots')]),
         optional=dict(beard=0.8), props=[[None, 3], ['lantern', 1]]),
    dict(id='friar', role='friar', weight=2, bodies=['man_stout', 'man', 'man_old'], gait='walk_formal',
         slots=dict(hair=[P('hair_crop', 'h_brown', 'h_dark', 'h_grey')], beard=[P('beard_full', 'h_brown', 'h_dark', 'h_grey')],
                    torso=[P('habit', 'capuchin')], mantle=[P('capuche', 'capuchin')], belt=[P('rope_belt')], feet=[P('shoes')]),
         props=[[None, 3], ['rosary', 2], ['staff', 1]]),
    dict(id='pilgrim', role='pilgrim', weight=2, bodies=['man', 'man_young', 'man_old'], gait='walk',
         slots=dict(hair=[P('hair_long', *HAIR_M)], beard=[P('beard_pointed', *HAIR_M), P('beard_full', *HAIR_M)],
                    head=[P('hat_pilgrim', 'brown', 'grey', 'umber')], mantle=[P('pelerine', 'russet', 'brown', 'grey')],
                    torso=[P('smock', 'grey', 'linen'), P('doublet', 'grey', 'brown')], belt=[P('belt')],
                    legs=[P('breeches', 'brown', 'grey')], legs_under=[P('stockings', 'linen', 'grey')], feet=[P('shoes')]),
         props=[['staff', 5], [None, 1]]),
    dict(id='old_man', role='oldMan', weight=3, bodies=['man_old'], gait='walk_old',
         slots=dict(hair=[P('hair_thin', *HAIR_OLD)], beard=[P('beard_full', *HAIR_OLD), P('beard_pointed', *HAIR_OLD)],
                    head=[P('hat_wide', 'black', 'umber'), P('cap_flat', 'brown', 'black')],
                    torso=[P('doublet', 'brown', 'umber', 'black', 'grey')], collar=[P('collar_band')],
                    legs=[P('breeches', 'brown', 'umber', 'black')], legs_under=[P('stockings', 'grey', 'black')], feet=[P('shoes')]),
         optional=dict(head=0.4), props=[['stick', 4], [None, 1]]),
    dict(id='boy', role='child', weight=3, bodies=['boy'], gait='walk',
         slots=dict(hair=[P('hair_child', 'h_chestnut', 'h_blond', 'h_brown', 'h_red')], head=[P('cap_flat', 'woad', 'russet', 'madder', 'grey')],
                    torso=[P('smock', 'linen', 'grey'), P('doublet', 'russet', 'woad', 'moss')], belt=[P('belt')],
                    legs=[P('breeches', 'russet', 'brown', 'grey')], legs_under=[P('stockings', 'grey', 'linen')],
                    feet=[P('shoes'), P('clogs')]),
         optional=dict(head=0.5, belt=0.8), props=[[None, 4], ['bread', 1], ['bundle', 1]]),
    # ---- enemies: never picked for the street crowd
    dict(id='deserter', role='soldier', weight=1, crowd=False, bodies=['man', 'man_young', 'man_stout'], gait='walk',
         slots=dict(hair=[P('hair_crop', *HAIR_M), P('hair_long', *HAIR_M)],
                    beard=[P('beard_full', *HAIR_M), P('moustache', *HAIR_M), P('beard_pointed', *HAIR_M)],
                    head=[P('hat_wide', 'umber', 'grey', 'brown'), P('cap_flat', 'umber', 'grey', 'russet')],
                    torso=[P('doublet', *DULL), P('doublet', *DULL), P('smock', 'grey', 'linen')], coat=[P('buff_coat')],
                    belt=[P('belt')], legs=[P('breeches', *DULL)], legs_under=[P('stockings', 'grey', 'umber', 'linen')],
                    feet=[P('boots')]),
         optional=dict(beard=0.8, head=0.5, coat=0.5), props=[['sword', 4], ['musket', 1], [None, 1]]),
    dict(id='musketeer', role='soldier', weight=1, crowd=False, bodies=['man', 'man_young'], gait='walk',
         slots=dict(hair=[P('hair_long', *HAIR_M), P('hair_crop', *HAIR_M)], beard=[P('moustache', *HAIR_M), P('beard_pointed', *HAIR_M)],
                    head=[P('hat_wide', 'black', 'umber', 'grey')], plume=[P('plume', 'white', 'madder', 'ochre')],
                    torso=[P('doublet', 'madder_dk', 'woad_dk', 'ochre', 'slate', 'umber')], collar=[P('collar_band')],
                    bandolier=[P('bandolier')], legs=[P('breeches', 'slate', 'umber', 'madder_dk', 'grey')],
                    legs_under=[P('stockings', 'grey', 'linen', 'madder')], feet=[P('boots')]),
         optional=dict(beard=0.8, plume=0.5, collar=0.6), props=[['musket', 1]]),
]

# layering: what each piece was fitted over (it may sit wrong over anything else) and what it cannot share a figure with
REQUIRES = {'bands': ['habit'], 'plume': ['hat_wide'], 'bandolier': ['doublet'], 'collar_band': ['doublet'], 'kerchief': ['bodice'], 'apron': ['skirt'], 'belt': ['smock'],
            'rope_belt': ['habit'], 'capuche': ['habit'], 'sash': ['buff_coat'], 'buff_coat': ['doublet'],
            'huik': ['bodice', 'skirt'], 'beguine_veil': ['habit'], 'stockings': ['breeches']}
EXCLUDES = {'bandolier': ['buff_coat', 'sash', 'pelerine'], 'bands': ['capuche', 'collar_band', 'beguine_veil'],
            'skullcap': ['hat_wide', 'hat_pilgrim', 'cap_flat', 'morion', 'beguine_veil', 'huik', 'coif'],
            'huik': ['coif', 'beguine_veil', 'hat_wide', 'hat_pilgrim', 'cap_flat', 'morion', 'apron'],
            'beguine_veil': ['coif', 'huik', 'hat_wide', 'hat_pilgrim', 'cap_flat', 'morion'],
            'capuche': ['pelerine', 'hat_wide', 'hat_pilgrim', 'cap_flat', 'morion', 'beguine_veil'],
            'pelerine': ['capuche', 'huik', 'buff_coat'], 'belt': ['habit', 'rope_belt'], 'smock': ['doublet', 'habit', 'bodice'],
            'doublet': ['smock', 'habit', 'bodice'], 'habit': ['bodice', 'skirt', 'breeches', 'stockings']}
HAT_HIDES = ['hair_crown']
GRIP_KINDS = {'fist_r': ('hand_r', 'fist'), 'hang_r': ('hand_r', 'hang'), 'hang_l': ('hand_l', 'hang'),
              'sword_r': ('hand_r', 'sword'), 'along_r': ('hand_r', 'along')}
PROP_GRIP = {'basket': 'hang_r', 'bread': 'hang_r', 'bundle': 'hang_r', 'lantern': 'hang_r', 'rosary': 'hang_r',
             'staff': 'fist_r', 'stick': 'fist_r', 'sword': 'sword_r', 'musket': 'along_r'}

C = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))          # Blender (Z up) -> glTF (Y up)


def simple_material(name, base, orm, nrm, normal_strength=1.0):
    old = bpy.data.materials.get(name)
    if old:
        bpy.data.materials.remove(old)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tb = nt.nodes.new('ShaderNodeTexImage')
    tb.image = base
    nt.links.new(tb.outputs['Color'], bsdf.inputs['Base Color'])
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
    grp = bpy.data.node_groups.get('glTF Material Output') or bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    if not grp.interface.items_tree:
        grp.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    g = nt.nodes.new('ShaderNodeGroup')
    g.node_tree = grp
    nt.links.new(sep.outputs[0], g.inputs[0])
    return mat


def half_image(img, name):
    c = img.copy()
    c.name = name
    w, h = img.size
    c.scale(w // 2, h // 2)
    c.pack()
    return c


def clear_props(idb):
    for k in list(idb.keys()):
        del idb[k]


def assign(o, mat):
    o.data.materials.clear()
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.material_index = 0


def only_color(o, keep):
    me = o.data
    for name in [a.name for a in me.color_attributes]:
        if name != keep:
            try:
                me.color_attributes.remove(me.color_attributes[name])
            except RuntimeError:
                log('  (kept required attribute', name, 'on', o.name, ')')
    if keep and keep in me.color_attributes:
        me.color_attributes.active_color = me.color_attributes[keep]
        me.color_attributes.render_color_index = me.color_attributes.find(keep)
    for lay in list(me.uv_layers):
        if lay.name != 'UVMap':
            me.uv_layers.remove(lay)


def skin_mask(body, eyes):
    """COLOR_0 for the bodies: r = 1 on skin, 0 on the lips and the eyeballs (brows and lashes are painted in
    the skin texture and take the tone with it)."""
    me = body.data
    lips = np.zeros(len(me.vertices) * 4, dtype=np.float32)
    if 'aux' in me.color_attributes:
        me.color_attributes['aux'].data.foreach_get('color', lips)
    lips = np.clip(lips.reshape(-1, 4)[:, 0], 0, 1)
    for o, r in [(body, 1.0 - lips)] + [(e, np.zeros(len(e.data.vertices), np.float32)) for e in eyes]:
        a = o.data.color_attributes.get('dye') or o.data.color_attributes.new('dye', 'FLOAT_COLOR', 'POINT')
        flat = np.zeros((len(o.data.vertices), 4), dtype=np.float32)
        flat[:, 0] = r
        flat[:, 3] = 1.0
        a.data.foreach_set('color', flat.ravel())


def morphs_to_shape_keys(o):
    """fm_<name> attributes -> shape keys named <name>, in FACE_MORPHS order."""
    me = o.data
    if not all((MORPH_ATTR + n) in me.attributes for n in FACE_MORPHS):
        return False
    deltas = {}
    for n in FACE_MORPHS:
        d = np.zeros(len(me.vertices) * 3, dtype=np.float32)
        me.attributes[MORPH_ATTR + n].data.foreach_get('vector', d)
        deltas[n] = d
    for n in FACE_MORPHS:
        me.attributes.remove(me.attributes[MORPH_ATTR + n])
    base = np.zeros(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get('co', base)
    o.shape_key_add(name='Basis', from_mix=False)
    for n in FACE_MORPHS:
        k = o.shape_key_add(name=n, from_mix=False)
        k.data.foreach_set('co', base + deltas[n])
        k.value = 0.0
    return True


def drop_morph_attrs(o):
    for n in FACE_MORPHS:
        a = o.data.attributes.get(MORPH_ATTR + n)
        if a is not None:
            o.data.attributes.remove(a)


# --------------------------------------------------------------------------
def grips_for(rig, idle):
    """Per grip kind: the prop's transform relative to the hand joint (glTF frame), such that in the idle pose a
    hanging prop hangs straight down and a staff stands straight up from the fist."""
    rig.animation_data_create()
    rig.animation_data.action = idle
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    out = {}
    for kind, (hand, grip) in GRIP_KINDS.items():
        if grip in ('sword', 'along'):
            # fixed to the hand itself (the fist's own axes): the same in every pose
            Mw = grip_frame(rig, hand, grip, pose=False)
            H = rig.data.bones[hand].matrix_local
        else:
            M = grip_frame(rig, hand, grip, pose=True)                # armature space, posed (idle)
            z = Vector((0, 0, 1))
            x = M.to_3x3() @ Vector((1, 0, 0))
            x = (x - z * x.dot(z)).normalized()
            y = z.cross(x)
            Mw = Matrix((x, y, z)).transposed().to_4x4()
            Mw.translation = M.translation
            if grip == 'hang':
                Mw.translation += Vector((0.05 if hand.endswith('_l') else -0.05, 0, 0))
            H = rig.pose.bones[hand].matrix                            # hand joint, posed, armature space
        rel = H.inverted() @ Mw
        q = (rel.to_3x3() @ C.inverted()).to_quaternion()
        t = rel.translation
        out[kind] = dict(bone=hand, pos=[round(t.x, 5), round(t.y, 5), round(t.z, 5)],
                         quat=[round(q.x, 6), round(q.y, 6), round(q.z, 6), round(q.w, 6)])
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    return out


def stage_export():
    from .game import REGIONS
    sc = bpy.context.scene
    meta = json.loads(sc['garments'])
    hides = json.loads(sc['hides'])
    clips = json.loads(sc['clips'])
    morph_pieces = set(json.loads(sc.get('morph_pieces', '[]')))
    man = bpy.data.objects['rig.man']
    idle = bpy.data.actions['idle']
    pel_man = man.data.bones['pelvis'].head_local.z
    bodies_json = {}
    for bid in BODY_ORDER:
        rig = bpy.data.objects[f'rig.{bid}']
        spec = BODIES[bid]
        bodies_json[bid] = dict(sex=spec['sex'], age=spec['age_group'], height=spec['height'],
                                pelvisScale=round(rig.data.bones['pelvis'].head_local.z / pel_man, 5),
                                grips=grips_for(rig, idle))
    # ---- materials (ORM and normal at half size)
    imgs = {n: bpy.data.images[n] for n in ('kit_basecolor', 'kit_orm', 'kit_normal', 'kit_skin_basecolor', 'kit_skin_orm', 'kit_skin_normal')}
    kit = simple_material('kit', imgs['kit_basecolor'], half_image(imgs['kit_orm'], 'kit_orm_1k'), half_image(imgs['kit_normal'], 'kit_normal_1k'), 0.8)
    skin = simple_material('skin', imgs['kit_skin_basecolor'], half_image(imgs['kit_skin_orm'], 'skin_orm_1k'), half_image(imgs['kit_skin_normal'], 'skin_normal_1k'), 0.5)
    # ---- objects
    sel = []
    for bid in BODY_ORDER:
        rig = bpy.data.objects[f'rig.{bid}']
        clear_props(rig)
        rig['kit'], rig['body'] = 'rig', bid
        clear_props(rig.data)
        body = bpy.data.objects[f'body.{bid}']
        eyes = [bpy.data.objects[f'eye_l.{bid}'], bpy.data.objects[f'eye_r.{bid}']]
        for e in eyes:
            a = e.data.attributes.get('_REGION') or e.data.attributes.new('_REGION', 'FLOAT', 'POINT')
            a.data.foreach_set('value', np.full(len(e.data.vertices), REGIONS['face'], dtype=np.float32))
        skin_mask(body, eyes)
        bpy.ops.object.select_all(action='DESELECT')
        for o in [body] + eyes:
            o.hide_set(False)
            o.select_set(True)
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.join()
        assign(body, skin)
        only_color(body, 'dye')
        morphs_to_shape_keys(body)
        clear_props(body)
        body['kit'], body['body'] = 'body', bid
        sel += [rig, body]
    for g, m in meta.items():
        for bid in m['bodies']:
            o = bpy.data.objects[f'{g}.{bid}']
            o.hide_set(False)
            assign(o, kit)
            only_color(o, 'dye')
            if '_REGION' in o.data.attributes and m['slot'] != 'hair':
                o.data.attributes.remove(o.data.attributes['_REGION'])
            if g in morph_pieces:
                morphs_to_shape_keys(o)
            else:
                drop_morph_attrs(o)
            clear_props(o)
            o['kit'], o['piece'], o['body'] = 'piece', g, bid
            sel.append(o)
    props_json = {}
    for o in [o for o in bpy.data.objects if o.get('prop') and o.name.startswith('prop.')]:
        name = o['prop']
        o.hide_set(False)
        o.hide_render = False
        assign(o, kit)
        only_color(o, 'dye')
        clear_props(o)
        o['kit'], o['prop'] = 'prop', name
        props_json[name] = dict(grip=PROP_GRIP[name], hand=GRIP_KINDS[PROP_GRIP[name]][0])
        sel.append(o)
    for o in sel:
        if o.type == 'MESH':
            clear_props(o.data)
    # one group node per body: the armature and that body's skinned meshes as SIBLINGS under it (the runtime
    # tags nodes top-down, so meshes must not sit inside the armature's subtree)
    for bid in BODY_ORDER:
        rig = bpy.data.objects[f'rig.{bid}']
        grp = bpy.data.objects.new(f'folk.{bid}', None)
        bpy.context.scene.collection.objects.link(grp)
        grp['kit'], grp['body'] = 'group', bid
        mine = [o for o in sel if o.type == 'MESH' and o.parent == rig]
        rig.parent = grp
        for o in mine:
            mw = o.matrix_world.copy()
            o.parent = grp
            o.matrix_world = mw
        sel.append(grp)
    # ---- only rig.man carries the clips
    for bid in BODY_ORDER:
        rig = bpy.data.objects[f'rig.{bid}']
        if bid != 'man' and rig.animation_data:
            rig.animation_data_clear()
    for tr in man.animation_data.nla_tracks:
        tr.mute = False
    man.animation_data.action = None
    bpy.ops.object.select_all(action='DESELECT')
    for o in sel:
        o.select_set(True)
    bpy.context.view_layer.objects.active = man
    raw = os.path.join(WORK, 'townsfolk_raw.glb')
    bpy.context.scene.frame_set(0)
    bpy.ops.export_scene.gltf(
        filepath=raw, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
        export_skins=True, export_all_influences=False, export_def_bones=False, export_materials='EXPORT',
        export_image_format='JPEG', export_jpeg_quality=86, export_tangents=False, export_normals=True,
        export_texcoords=True, export_attributes=True, export_vertex_color='ACTIVE', export_extras=True,
        export_draco_mesh_compression_enable=False, export_cameras=False, export_lights=False,
        export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1,
        export_optimize_animation_size=False, export_reset_pose_bones=True, export_bake_animation=False,
        export_morph=True, export_morph_normal=False, export_morph_tangent=False, export_morph_animation=False,
        export_try_sparse_sk=False)
    log('raw export %.2f MB' % (os.path.getsize(raw) / 1e6))
    os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
    stats = postprocess(raw, OUT_GLB)
    log('wrote', OUT_GLB, '%.2f MB' % (os.path.getsize(OUT_GLB) / 1e6), stats)
    # ---- manifest
    pieces = {}
    for g, m in meta.items():
        if not m['bodies']:
            continue
        o = bpy.data.objects[f'{g}.{m["bodies"][0]}']
        dye = np.zeros(len(o.data.vertices) * 4, dtype=np.float32)
        o.data.color_attributes['dye'].data.foreach_get('color', dye)
        h = list(hides.get(g, []))
        if g in ('hat_wide', 'hat_pilgrim', 'cap_flat', 'morion'):
            h += HAT_HIDES
        layer = {'legs_under': 0, 'feet': 1, 'legs': 1, 'torso': 2, 'hair': 2, 'beard': 3, 'apron': 3, 'coat': 3,
                 'collar': 4, 'belt': 4, 'sash': 5, 'bandolier': 5, 'mantle': 5, 'head': 6, 'plume': 7}.get(m['slot'], 3)
        pc = dict(slot=m['slot'], layer=layer, bodies=m['bodies'], dyeable=bool(dye.reshape(-1, 4)[:, 0].max() > 0.5),
                  hides=h, desc=m['desc'])
        if g in morph_pieces:
            pc['morphs'] = True
        if g in REQUIRES:
            pc['requires'] = REQUIRES[g]
        if g in EXCLUDES:
            pc['excludes'] = EXCLUDES[g]
        pieces[g] = pc
    man_clips = {k: dict(loop=v['loop'], duration=v['duration'], **({'stride': v['stride']} if v.get('stride') else {}))
                 for k, v in clips.items()}
    manifest = dict(version=1, units='metres; glTF Y up, characters face +Z',
                    regions=REGIONS, regionRule='drop a triangle when all three of its vertices are in hidden regions',
                    bodies=bodies_json, pieces=pieces, props=props_json, palette=PALETTE, clips=man_clips,
                    clipNotes=('one shared set keyed on rig.man; stride = metres covered per loop on the man body (1.70 m); '
                               'scale the pelvis translation track by bodies[b].pelvisScale for other bodies'),
                    dye=dict(attribute='COLOR_0.r', rule='base = texture * dye / 0.55 where COLOR_0.r = 1'),
                    faceMorphs={n: dict(min=MORPH_RANGE.get(n, (-1.0, 1.0))[0], max=MORPH_RANGE.get(n, (-1.0, 1.0))[1])
                                for n in FACE_MORPHS},
                    faceMorphNotes=('morph targets of these names, in this order, on every body mesh and on the pieces '
                                    'marked morphs:true; drive them together with the same weights'),
                    skinTones=SKIN_TONES,
                    skinToneNotes='multiply into the base colour of body meshes where COLOR_0.r = 1 (skin; 0 on lips and eyes)',
                    archetypes=[dict(a, crowd=a.get('crowd', True)) for a in ARCHETYPES])
    with open(OUT_JSON, 'w') as f:
        json.dump(manifest, f, indent=1)
    log('wrote', OUT_JSON)


# --------------------------------------------------------------------------
# GLB post-pass
# --------------------------------------------------------------------------
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def read_glb(path):
    b = open(path, 'rb').read()
    magic, ver, ln = struct.unpack_from('<III', b, 0)
    jl, jt = struct.unpack_from('<II', b, 12)
    js = json.loads(b[20:20 + jl])
    off = 20 + jl
    bl, bt = struct.unpack_from('<II', b, off)
    return js, b[off + 8:off + 8 + bl]


def acc_array(js, binb, i):
    a = js['accessors'][i]
    bv = js['bufferViews'][a['bufferView']]
    dt = CT[a['componentType']]
    nc = NC[a['type']]
    stride = bv.get('byteStride', 0)
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    item = np.dtype(dt).itemsize * nc
    if stride and stride != item:
        raw = np.frombuffer(binb, dtype=np.uint8, count=stride * a['count'], offset=start).reshape(a['count'], stride)[:, :item]
        arr = np.frombuffer(raw.tobytes(), dtype=dt).reshape(a['count'], nc)
    else:
        arr = np.frombuffer(binb, dtype=dt, count=nc * a['count'], offset=start).reshape(a['count'], nc)
    return arr.copy()


def postprocess(src, dst):
    js, binb = read_glb(src)
    nodes = js['nodes']
    # 1. animations: rotations everywhere, translation on the pelvis only, nothing on Root
    for an in js.get('animations', []):
        keep = []
        for ch in an['channels']:
            n = nodes[ch['target']['node']].get('name', '')
            path = ch['target']['path']
            if n == 'Root':
                continue
            if path == 'rotation' or (path == 'translation' and n == 'pelvis'):
                keep.append(ch)
        used = sorted({c['sampler'] for c in keep})
        remap = {s: i for i, s in enumerate(used)}
        an['samplers'] = [an['samplers'][s] for s in used]
        for c in keep:
            c['sampler'] = remap[c['sampler']]
        an['channels'] = keep
    # 2. collect accessor data, quantise vertex attributes
    acc_data = {}
    quant = {}
    for mesh in js['meshes']:
        for prim in mesh['primitives']:
            for name, ai in prim['attributes'].items():
                if ai in quant:
                    continue
                a = js['accessors'][ai]
                arr = acc_array(js, binb, ai)
                if name == 'NORMAL' and a['componentType'] == 5126:
                    q = np.clip(np.rint(arr * 127.0), -127, 127).astype(np.int8)
                    q = np.concatenate([q, np.zeros((len(q), 1), np.int8)], axis=1)     # pad to 4 bytes
                    quant[ai] = (q, 5120, True, 'VEC3', 4)
                elif name.startswith('TEXCOORD') and a['componentType'] == 5126:
                    q = np.clip(np.rint(np.clip(arr, 0, 1) * 65535.0), 0, 65535).astype(np.uint16)
                    quant[ai] = (q, 5123, True, 'VEC2', 0)
                elif name.startswith('COLOR') and a['componentType'] != 5121:
                    f = arr.astype(np.float32) / (65535.0 if a['componentType'] == 5123 else 1.0)
                    if f.shape[1] == 3:
                        f = np.concatenate([f, np.ones((len(f), 1), np.float32)], axis=1)
                    q = np.clip(np.rint(f * 255.0), 0, 255).astype(np.uint8)
                    quant[ai] = (q, 5121, True, 'VEC4', 0)
                elif name.startswith('WEIGHTS') and a['componentType'] == 5126:
                    w = arr / np.maximum(arr.sum(axis=1, keepdims=True), 1e-8)
                    q = np.floor(w * 255.0).astype(np.int32)
                    rest = 255 - q.sum(axis=1)
                    q[np.arange(len(q)), np.argmax(w, axis=1)] += rest
                    quant[ai] = (q.astype(np.uint8), 5121, True, 'VEC4', 0)
    # 3. rebuild buffer views, sharing identical ones
    out = bytearray()
    views = []
    vcache = {}

    def add_view(data, target=None, stride=0):
        b = data.tobytes()
        key = (b, target, stride)
        if key in vcache:
            return vcache[key]
        while len(out) % 4:
            out.append(0)
        v = dict(buffer=0, byteOffset=len(out), byteLength=len(b))
        if target:
            v['target'] = target
        if stride:
            v['byteStride'] = stride
        out.extend(b)
        views.append(v)
        vcache[key] = len(views) - 1
        return vcache[key]
    attr_acc = set()
    index_acc = set()
    for mesh in js['meshes']:
        for prim in mesh['primitives']:
            attr_acc.update(prim['attributes'].values())
            if 'indices' in prim:
                index_acc.add(prim['indices'])
    target_acc = set()
    for mesh in js['meshes']:
        for prim in mesh['primitives']:
            for t in prim.get('targets', []):
                target_acc.update(t.values())
    new_acc = []
    acache = {}
    remap = {}
    for i, a in enumerate(js['accessors']):
        a = dict(a)
        if i in target_acc:
            # morph target deltas: sparse, int16 normalised (1 unit = 1/32767 m), only the vertices that move
            d = acc_array(js, binb, i).astype(np.float64)
            q = np.clip(np.rint(d * 32767.0), -32767, 32767).astype(np.int16)
            nz = np.nonzero(np.abs(q).max(axis=1) > 1)[0]
            if len(nz) == 0:
                nz = np.array([0])
            idx = nz.astype(np.uint16 if a['count'] <= 65535 else np.uint32)
            vals = q[nz]
            vals4 = np.concatenate([vals, np.zeros((len(vals), 1), np.int16)], axis=1)[:, :3].copy()
            a.pop('bufferView', None)
            a.pop('byteOffset', None)
            a['componentType'] = 5122
            a['normalized'] = True
            a['type'] = 'VEC3'
            a['min'] = [int(x) for x in vals.min(axis=0)]
            a['max'] = [int(x) for x in vals.max(axis=0)]
            a['min'] = [min(0, x) for x in a['min']]
            a['max'] = [max(0, x) for x in a['max']]
            a['sparse'] = dict(count=int(len(nz)),
                               indices=dict(bufferView=add_view(np.ascontiguousarray(idx)), componentType=5123 if idx.dtype == np.uint16 else 5125),
                               values=dict(bufferView=add_view(np.ascontiguousarray(vals4))))
            key = json.dumps(a, sort_keys=True)
            if key not in acache:
                new_acc.append(a)
                acache[key] = len(new_acc) - 1
            remap[i] = acache[key]
            continue
        if i in quant:
            q, ct, norm, typ, stride = quant[i]
            target = 34962
            data = q
            a['componentType'] = ct
            a['normalized'] = norm
            a['type'] = typ
            a.pop('min', None)
            a.pop('max', None)
        else:
            data = acc_array(js, binb, i)
            stride = 0
            target = 34962 if i in attr_acc else (34963 if i in index_acc else None)
            if i in attr_acc and data.dtype.itemsize * data.shape[1] % 4:
                stride = ((data.dtype.itemsize * data.shape[1] + 3) // 4) * 4
                pad = np.zeros((len(data), stride - data.dtype.itemsize * data.shape[1]), np.uint8)
                data = np.concatenate([data.view(np.uint8).reshape(len(data), -1), pad], axis=1)
        a.pop('byteOffset', None)
        a['bufferView'] = add_view(np.ascontiguousarray(data), target, stride)
        key = json.dumps(a, sort_keys=True)
        if key in acache:
            remap[i] = acache[key]
            continue
        new_acc.append(a)
        acache[key] = len(new_acc) - 1
        remap[i] = acache[key]
    # images keep their bytes
    for img in js.get('images', []):
        if 'bufferView' in img:
            bv = js['bufferViews'][img['bufferView']]
            b = binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
            img['bufferView'] = add_view(np.frombuffer(b, dtype=np.uint8))
    for mesh in js['meshes']:
        for prim in mesh['primitives']:
            if 'targets' in prim:
                prim['targets'] = [{k: remap[v] for k, v in t.items()} for t in prim['targets']]
            prim['attributes'] = {k: remap[v] for k, v in prim['attributes'].items()}
            if 'indices' in prim:
                prim['indices'] = remap[prim['indices']]
    for sk in js.get('skins', []):
        if 'inverseBindMatrices' in sk:
            sk['inverseBindMatrices'] = remap[sk['inverseBindMatrices']]
    for an in js.get('animations', []):
        for s in an['samplers']:
            s['input'] = remap[s['input']]
            s['output'] = remap[s['output']]
    js['accessors'] = new_acc
    js['bufferViews'] = views
    while len(out) % 4:
        out.append(0)
    js['buffers'] = [dict(byteLength=len(out))]
    ext = set(js.get('extensionsUsed', [])) | {'KHR_mesh_quantization'}
    js['extensionsUsed'] = sorted(ext)
    js['extensionsRequired'] = sorted(set(js.get('extensionsRequired', [])) | {'KHR_mesh_quantization'})
    jb = json.dumps(js, separators=(',', ':')).encode()
    while len(jb) % 4:
        jb += b' '
    total = 12 + 8 + len(jb) + 8 + len(out)
    with open(dst, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(jb), 0x4E4F534A))
        f.write(jb)
        f.write(struct.pack('<II', len(out), 0x004E4942))
        f.write(out)
    return dict(accessors=len(new_acc), views=len(views), bin_mb=round(len(out) / 1e6, 2))
