# BELFORT townsfolk kit - stage 'anim': ONE shared clip set on the 'man' body's rig.
#
# The clips are the rider's own (public/models/rider.glb: idle, walk, walk_formal, talk, sit, run), retargeted in
# world space onto rig.man (each bone's rotation away from its A-pose rest is applied to the same bone here; the
# hips move by the pelvis-height ratio; the feet are put back on the ground). walk_old, look_around and point are
# derived from them here. All clips are in place (no root motion); only `pelvis` has a translation track.
# Other bodies play the same clips with the pelvis track scaled by bodies[b].pelvisScale (manifest).

import bpy, math, json, os
import numpy as np
from mathutils import Vector, Quaternion, Matrix
from .common import log, RIDER_GLB, to_coll

FPS = 30
SRC = ['idle', 'walk', 'walk_formal', 'talk', 'sit', 'run', 'sword_idle', 'attack1', 'attack2', 'hit', 'death']
LOOP = {'idle': True, 'walk': True, 'walk_formal': True, 'walk_old': True, 'talk': True, 'sit': True, 'run': True,
        'look_around': True, 'point': False, 'sword_idle': True, 'attack1': False, 'attack2': False, 'hit': False,
        'death': False, 'aim': True, 'pray': True}
GROUND = {'sit': None, 'attack1': None, 'attack2': None, 'hit': None, 'death': None}      # default: 'min' (the rider's one-shots are already grounded)
RIDER_SPEED = {'walk': 1.5, 'walk_formal': 1.3, 'run': 5.0}       # RIDER_NOTES.md: planted-foot speeds
LEGS = [f'{b}_{s}' for b in ('thigh', 'calf', 'foot', 'ball') for s in ('l', 'r')]
ARMS = [f'{b}_{s}' for b in ('clavicle', 'upperarm', 'lowerarm', 'hand') for s in ('l', 'r')]


def import_rider():
    bpy.context.scene.render.fps = FPS           # the importer lays keys out at the scene frame rate
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=RIDER_GLB)
    new = [o for o in bpy.data.objects if o not in before]
    arm = [o for o in new if o.type == 'ARMATURE'][0]
    arm.rotation_mode = 'XYZ'
    return arm, new


def find_action(clip):
    for a in bpy.data.actions:
        if a.name.split('_rider')[0].split('.')[0] == clip or a.name == clip:
            return a
    raise KeyError(clip)


def subtree(bones, name):
    out = [name]
    for c in bones[name].children:
        out += subtree(bones, c.name)
    return out


def sample_world(src, rig, clip):
    """Per source frame: target world (armature-space) rotations and the pelvis offset, for rig."""
    sc = bpy.context.scene
    src.animation_data_create()
    act = find_action(clip)
    src.animation_data.action = act
    f0, f1 = (int(round(x)) for x in act.frame_range)
    SW = src.matrix_world.to_3x3()
    sb, tb = src.data.bones, rig.data.bones
    names = [b.name for b in tb if b.name in src.pose.bones and b.name != 'Root']
    Rs0 = {n: (SW @ sb[n].matrix_local.to_3x3()).to_quaternion() for n in names}
    Rt0 = {b.name: b.matrix_local.to_quaternion() for b in tb}
    k_len = tb['pelvis'].head_local.z / sb['pelvis'].head_local.z
    s_rest = SW @ sb['pelvis'].head_local
    frames = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        W = {}
        for n in names:
            Rs = (SW @ src.pose.bones[n].matrix.to_3x3()).to_quaternion()
            W[n] = Rs @ Rs0[n].inverted() @ Rt0[n]
        off = (SW @ src.pose.bones['pelvis'].head - s_rest) * k_len
        frames.append(dict(W=W, off=off))
    return frames, (f1 - f0) / FPS


def to_local(rig, W, off):
    """World rotations -> local pose quaternions (+ pelvis location in its rest frame)."""
    tb = rig.data.bones
    qr = {b.name: b.matrix_local.to_quaternion() for b in tb}
    fr = {}
    for b in tb:
        n = b.name
        if n not in W:
            fr[n] = Quaternion()
            continue
        p = b.parent
        if p is None or p.name not in W:
            Wp, qp = qr[p.name] if p else Quaternion(), qr[p.name] if p else Quaternion()
            fr[n] = qr[n].inverted() @ qp @ Wp.inverted() @ W[n]
        else:
            fr[n] = qr[n].inverted() @ qr[p.name] @ W[p.name].inverted() @ W[n]
    fr['_loc'] = qr['pelvis'].inverted() @ off
    return fr


def write_action(rig, name, frames):
    act = bpy.data.actions.get(name)
    if act:
        bpy.data.actions.remove(act)
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    n = len(frames)
    t = np.arange(n, dtype=np.float32)
    for b in rig.data.bones:
        if b.name == 'Root':
            continue
        seq = [fr[b.name] for fr in frames]
        for i in range(1, n):
            if seq[i].dot(seq[i - 1]) < 0:
                seq[i] = -seq[i]
        for ch in range(4):
            fc = act.fcurves.new(f'pose.bones["{b.name}"].rotation_quaternion', index=ch, action_group=b.name)
            fc.keyframe_points.add(n)
            co = np.empty(n * 2, dtype=np.float32)
            co[0::2] = t
            co[1::2] = [q[ch] for q in seq]
            fc.keyframe_points.foreach_set('co', co)
            fc.keyframe_points.foreach_set('interpolation', np.full(n, 1, dtype=np.int32))
            fc.update()
    for ch in range(3):
        fc = act.fcurves.new('pose.bones["pelvis"].location', index=ch, action_group='pelvis')
        fc.keyframe_points.add(n)
        co = np.empty(n * 2, dtype=np.float32)
        co[0::2] = t
        co[1::2] = [fr['_loc'][ch] for fr in frames]
        fc.keyframe_points.foreach_set('co', co)
        fc.keyframe_points.foreach_set('interpolation', np.full(n, 1, dtype=np.int32))
        fc.update()
    return act


def resample(frames, n_out, loop):
    """Linear / slerp resample of world-rotation frames to n_out + 1 frames."""
    n = len(frames)
    out = []
    for j in range(n_out + 1):
        u = j / n_out * (n - 1)
        if loop and j == n_out:
            u = 0.0
        i = min(int(math.floor(u)), n - 2)
        f = u - i
        a, b = frames[i], frames[i + 1]
        W = {k: a['W'][k].slerp(b['W'][k], f) for k in a['W']}
        out.append(dict(W=W, off=a['off'].lerp(b['off'], f)))
    return out


def rotate_subtree(rig, W, root, q):
    for n in subtree(rig.data.bones, root):
        if n in W:
            W[n] = q @ W[n]


def aim_subtree(rig, W, bone, target_dir, amount):
    d = W[bone] @ Vector((0, 1, 0))
    q = d.rotation_difference(Vector(target_dir).normalized())
    q = Quaternion().slerp(q, amount)
    rotate_subtree(rig, W, bone, q)


def mean_rot(frames, bone):
    acc = np.zeros(4)
    ref = frames[0]['W'][bone]
    for fr in frames:
        q = fr['W'][bone]
        acc += np.array(q[:]) * (1 if q.dot(ref) >= 0 else -1)
    return Quaternion(tuple(acc / np.linalg.norm(acc)))


def derive_walk_old(rig, walk):
    """Slow, stooped, short-stepped: 1.3x slower, leg and arm swing cut to 70 % about their mean,
    spine bent forward 14 deg in all (head kept up), knees a little bent, smaller hip bob."""
    n_out = int(round((len(walk) - 1) * 1.3))
    fr = resample(walk, n_out, True)
    means = {b: mean_rot(walk, b) for b in LEGS + ARMS if b in walk[0]['W']}
    mz = sum(f['off'].z for f in walk) / len(walk)
    out = []
    for f in fr:
        W = dict(f['W'])
        for b in ('thigh_l', 'thigh_r', 'upperarm_l', 'upperarm_r', 'clavicle_l', 'clavicle_r'):
            if b in W:
                q = means[b].slerp(W[b], 0.70)
                rotate_subtree(rig, W, b, q @ W[b].inverted())
        for b in ('calf_l', 'calf_r', 'lowerarm_l', 'lowerarm_r', 'foot_l', 'foot_r'):
            if b in W:
                q = means[b].slerp(W[b], 0.7)
                rotate_subtree(rig, W, b, q @ W[b].inverted())
        rotate_subtree(rig, W, 'spine_01', Quaternion((1, 0, 0), math.radians(7)))
        rotate_subtree(rig, W, 'spine_02', Quaternion((1, 0, 0), math.radians(4)))
        rotate_subtree(rig, W, 'spine_03', Quaternion((1, 0, 0), math.radians(3)))
        rotate_subtree(rig, W, 'neck_01', Quaternion((1, 0, 0), math.radians(-8)))
        rotate_subtree(rig, W, 'head', Quaternion((1, 0, 0), math.radians(-5)))
        off = f['off'].copy()
        off.z = mz + (off.z - mz) * 0.55 - 0.02
        off.y += 0.03
        out.append(dict(W=W, off=off))
    return out


def derive_look_around(rig, idle):
    out = []
    n = len(idle) - 1
    for j, f in enumerate(idle):
        W = dict(f['W'])
        t = j / n
        yaw = 48.0 * math.sin(2 * math.pi * t) * (0.6 + 0.4 * math.sin(math.pi * t) ** 2)
        tilt = 6.0 * math.sin(4 * math.pi * t + 0.5)
        rotate_subtree(rig, W, 'spine_03', Quaternion((0, 0, 1), math.radians(yaw * 0.2)))
        rotate_subtree(rig, W, 'neck_01', Quaternion((0, 0, 1), math.radians(yaw * 0.35)))
        rotate_subtree(rig, W, 'head', Quaternion((0, 0, 1), math.radians(yaw * 0.45)) @ Quaternion((1, 0, 0), math.radians(-tilt)))
        out.append(dict(W=W, off=f['off'].copy()))
    return out


def derive_point(rig, idle, dur=2.5):
    n = int(round(dur * FPS))
    fr = resample(idle[:int(len(idle) * dur / 4.0) + 2], n, False)
    out = []
    for j, f in enumerate(fr):
        t = j / n
        amt = min(1.0, t / 0.25) if t < 0.7 else max(0.0, 1.0 - (t - 0.7) / 0.3)
        amt = amt * amt * (3 - 2 * amt)
        W = dict(f['W'])
        target = Vector((-0.35, -0.9, 0.18))                  # forward, a little to the right, at shoulder height
        aim_subtree(rig, W, 'upperarm_r', target, amt)
        aim_subtree(rig, W, 'lowerarm_r', target, amt)
        aim_subtree(rig, W, 'hand_r', target, amt)
        rotate_subtree(rig, W, 'head', Quaternion((0, 0, 1), math.radians(-18 * amt)))
        out.append(dict(W=W, off=f['off'].copy()))
    return out


def fk(rig, W, off):
    """Joint positions (armature space) for world rotations W and pelvis offset off."""
    tb = rig.data.bones
    pos = {}
    for b in tb:
        if b.name not in W:
            continue
        p = b.parent
        if p is None or p.name not in pos:
            pos[b.name] = b.head_local + (off if b.name == 'pelvis' else Vector())
        else:
            pos[b.name] = pos[p.name] + (W[p.name] @ p.matrix_local.to_quaternion().inverted()) @ (b.head_local - p.head_local)
    return pos


def reach(rig, W, off, side, target, elbow_dir, hand_dir=None):
    """Pose an arm so the wrist lands on `target`: aim the upper arm so the elbow sits towards elbow_dir from the
    straight shoulder-target line (two-bone solve), then the forearm at the target, then the hand."""
    tb = rig.data.bones
    ua, la, ha = f'upperarm_{side}', f'lowerarm_{side}', f'hand_{side}'
    pos = fk(rig, W, off)
    sh = pos[ua]
    l1 = (tb[la].head_local - tb[ua].head_local).length
    l2 = (tb[ha].head_local - tb[la].head_local).length
    to = Vector(target) - sh
    d = min(to.length, (l1 + l2) * 0.995)
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
    h = math.sqrt(max(l1 * l1 - a * a, 0.0))
    axis = to.normalized()
    e = Vector(elbow_dir)
    e = (e - axis * e.dot(axis))
    e = e.normalized() if e.length > 1e-6 else Vector((0, 0, -1))
    elbow = sh + axis * a + e * h
    aim_subtree(rig, W, ua, elbow - sh, 1.0)
    aim_subtree(rig, W, la, sh + axis * d - elbow, 1.0)
    aim_subtree(rig, W, ha, hand_dir if hand_dir is not None else (sh + axis * d - elbow), 1.0)


def curl(rig, W, side, amount):
    """Curl the fingers of one hand (about the knuckle line)."""
    tb = rig.data.bones
    across = (W[f'hand_{side}'] @ tb[f'hand_{side}'].matrix_local.to_quaternion().inverted()) @ \
        (tb[f'index_01_{side}'].head_local - tb[f'pinky_01_{side}'].head_local)
    across.normalize()
    sg = -1.0 if side == 'l' else 1.0
    for fgr in ('index', 'middle', 'ring', 'pinky'):
        for kk in (1, 2, 3):
            rotate_subtree(rig, W, f'{fgr}_0{kk}_{side}', Quaternion(across, math.radians(sg * amount * (38 if kk == 1 else 46))))


def derive_aim(rig, idle, dur=3.0):
    """Musket levelled: body turned a quarter right, right forearm level at chest height pointing at the target
    (the musket lies along it), left hand forward under the barrel, head down to the stock. A held, breathing pose."""
    n = int(round(dur * FPS))
    fr = resample(idle[:int(len(idle) * dur / 4.0) + 2], n, True)
    tb = rig.data.bones
    k = tb['pelvis'].head_local.z / 0.917
    out = []
    for j, f in enumerate(fr):
        W = dict(f['W'])
        off = f['off'].copy()
        sway = math.sin(2 * math.pi * j / n)
        rotate_subtree(rig, W, 'spine_01', Quaternion((0, 0, 1), math.radians(-14)))
        rotate_subtree(rig, W, 'spine_03', Quaternion((0, 0, 1), math.radians(-12)))
        rotate_subtree(rig, W, 'neck_01', Quaternion((0, 0, 1), math.radians(18)))
        rotate_subtree(rig, W, 'head', Quaternion((0, 0, 1), math.radians(8)) @ Quaternion((0, 1, 0), math.radians(-8)))
        pos = fk(rig, W, off)
        sh_r = pos['upperarm_r']
        aim_pt = Vector((0.0, -1.0, 0.0))
        hand_r = sh_r + Vector((0.10 * k, -0.20 * k, -0.075 * k + 0.004 * sway))
        reach(rig, W, off, 'r', hand_r, Vector((-0.8, 0.5, -0.2)), aim_pt)
        aim_subtree(rig, W, 'lowerarm_r', aim_pt + Vector((0.10, 0, 0.0)), 0.55)
        aim_subtree(rig, W, 'hand_r', aim_pt, 1.0)
        pos = fk(rig, W, off)
        support = pos['hand_r'] + Vector((0.03 * k, -0.36 * k, -0.02 * k))
        reach(rig, W, off, 'l', support, Vector((0.3, 0.0, -1.0)), Vector((-0.6, -0.75, 0.2)))
        curl(rig, W, 'r', 0.7)
        curl(rig, W, 'l', 0.5)
        out.append(dict(W=W, off=off))
    return out


def derive_pray(rig, idle, dur=4.0):
    """Standing in prayer: hands together before the chest, head bowed, a slow breath."""
    n = int(round(dur * FPS))
    fr = resample(idle, n, True)
    tb = rig.data.bones
    k = tb['pelvis'].head_local.z / 0.917
    out = []
    for j, f in enumerate(fr):
        W = dict(f['W'])
        off = f['off'].copy()
        br = math.sin(2 * math.pi * j / n)
        rotate_subtree(rig, W, 'spine_03', Quaternion((1, 0, 0), math.radians(4 + 1.0 * br)))
        rotate_subtree(rig, W, 'neck_01', Quaternion((1, 0, 0), math.radians(10)))
        rotate_subtree(rig, W, 'head', Quaternion((1, 0, 0), math.radians(12 + 1.5 * br)))
        pos = fk(rig, W, off)
        chest = (pos['upperarm_l'] + pos['upperarm_r']) / 2
        for side, sx in (('l', 1.0), ('r', -1.0)):
            wrist = chest + Vector((0.030 * k * sx, -0.215 * k, -0.150 * k + 0.003 * br))
            reach(rig, W, off, side, wrist, Vector((sx * 0.7, 0.1, -1.0)), Vector((-0.10 * sx, -0.45, 0.9)))
        out.append(dict(W=W, off=off))
    return out


def ground(rig, frames, mode='min'):
    """Lower / raise the hips so the lowest foot joint over the clip sits at its rest height."""
    tb = rig.data.bones
    lows = []
    for f in frames:
        W = f['W']
        pel = tb['pelvis'].head_local + f['off']
        low = 9.0
        for s in ('l', 'r'):
            p = pel.copy()
            parent = 'pelvis'
            for j in ('thigh', 'calf', 'foot', 'ball'):
                nm = f'{j}_{s}'
                p = p + (W[parent] @ tb[parent].matrix_local.to_quaternion().inverted()) @ (tb[nm].head_local - tb[parent].head_local)
                parent = nm
                if j in ('foot', 'ball'):
                    low = min(low, p.z - tb[nm].head_local.z)
        lows.append(low)
    dz = -(lows[0] if mode == 'first' else min(lows))
    for f in frames:
        f['off'] = f['off'] + Vector((0, 0, dz))
    return dz


def stride(rig, frames, dur):
    """Ground distance one loop covers: the planted (lower) foot's backward travel, summed over the loop."""
    tb = rig.data.bones
    feet = []
    for f in frames:
        W = f['W']
        pos = {}
        for s in ('l', 'r'):
            p = tb['pelvis'].head_local + f['off']
            parent = 'pelvis'
            for j in ('thigh', 'calf', 'foot', 'ball'):
                nm = f'{j}_{s}'
                p = p + (W[parent] @ tb[parent].matrix_local.to_quaternion().inverted()) @ (tb[nm].head_local - tb[parent].head_local)
                parent = nm
            pos[s] = p
        feet.append(pos)
    tot = 0.0
    for i in range(len(feet) - 1):
        s = 'l' if feet[i]['l'].z < feet[i]['r'].z else 'r'
        dy = feet[i + 1][s].y - feet[i][s].y                      # Blender: forward is -Y, so backward travel is +Y
        tot += max(0.0, dy)
    return tot


def stage_anim():
    rig = bpy.data.objects['rig.man']
    for r in [o for o in bpy.data.objects if o.type == 'ARMATURE']:
        for pb in r.pose.bones:                    # MPFB rigs default to Euler: the clips key quaternions
            pb.rotation_mode = 'QUATERNION'
    src, new = import_rider()
    info = {}
    W_src = {}
    for clip in SRC:
        frames, dur = sample_world(src, rig, clip)
        W_src[clip] = frames
    for o in new:
        bpy.data.objects.remove(o)
    for a in [a for a in bpy.data.actions if a.name.split('_rider')[0] in SRC and '_rider' in a.name]:
        bpy.data.actions.remove(a)
    clips = dict(W_src)
    clips['walk_old'] = derive_walk_old(rig, W_src['walk'])
    clips['look_around'] = derive_look_around(rig, W_src['idle'])
    clips['point'] = derive_point(rig, W_src['idle'])
    clips['aim'] = derive_aim(rig, W_src['idle'])
    clips['pray'] = derive_pray(rig, W_src['idle'])
    made = {}
    for name, frames in clips.items():
        dz = 0.0
        if GROUND.get(name, 'min'):
            dz = ground(rig, frames, GROUND.get(name, 'min'))
        dur = (len(frames) - 1) / FPS
        loc = [to_local(rig, f['W'], f['off']) for f in frames]
        act = write_action(rig, name, loc)
        made[name] = act
        st = 0.0
        if name in RIDER_SPEED:
            # the rider's clips were retimed to plant their feet at a known speed; scale by leg length
            k_len = rig.data.bones['pelvis'].head_local.z / 0.972
            st = RIDER_SPEED[name] * dur * k_len
        elif name.startswith('walk'):
            st = stride(rig, frames, dur)
        info[name] = dict(loop=LOOP[name], duration=round(dur, 3), frames=len(frames) - 1,
                          stride=round(st, 3) if st else None, speed=round(st / dur, 3) if st else None)
        log('clip %-12s %.3f s  %3d frames  ground %+.3f  stride/loop %s' % (name, dur, len(frames) - 1, dz,
                                                                            ('%.3f m (%.2f m/s)' % (st, st / dur)) if st else '-'))
    rig.animation_data_create()
    rig.animation_data.action = None
    for tr in list(rig.animation_data.nla_tracks):
        rig.animation_data.nla_tracks.remove(tr)
    for name, act in made.items():
        tr = rig.animation_data.nla_tracks.new()
        tr.name = name
        st = tr.strips.new(name, 0, act)
        st.name = name
        tr.mute = True
    bpy.context.scene['clips'] = json.dumps(info)
    bpy.context.scene.render.fps = FPS
