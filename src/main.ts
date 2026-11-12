// BELFORT — Brabant, 1650. Fly a dragon over the real streets of Diest, land
// anywhere, walk the town, take on quests from its people and keep a journal.

import * as THREE from 'three';
import { Sound } from './audio/sound';
import { CameraRig } from './camera/rig';
import { Input } from './core/input';
import { clamp } from './core/math';
import { Player } from './player/player';
import { Post } from './render/post';
import { loadModel } from './render/models';
import { loadMaterialSet, type MaterialInfo } from './render/textures';
import { diest } from './content/diest';
import { Actors } from './rpg/actors';
import { QuestEngine } from './rpg/quests';
import { Hud } from './ui/hud';
import { DialogueUI, JournalUI } from './ui/rpgui';
import { Atmosphere } from './world/sky';
import { loadTreeAtlas } from './world/trees';
import type { WorldData } from './world/types';
import { World } from './world/world';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui')!;
const asset = (p: string) => new URL(p, document.baseURI).toString();
const nextFrame = () => new Promise((r) => setTimeout(r, 20));

type Quality = 'low' | 'medium' | 'high';

async function boot() {
  const params = new URLSearchParams(location.search);
  const quality: Quality = params.has('lowq') ? 'low' : ((params.get('q') as Quality) ?? 'high');
  const lowQ = quality === 'low';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: lowQ, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
  const maxRatio = lowQ ? 0.8 : Math.min(window.devicePixelRatio, 1.5);
  let ratio = params.has('dpr') ? parseFloat(params.get('dpr')!) : maxRatio;
  renderer.setPixelRatio(ratio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !lowQ;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the final post pass
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const input = new Input(canvas);
  const sound = new Sound();

  // --- load everything
  const [data, meta] = await Promise.all([
    fetch(asset(`world/${params.get('world') ?? 'diest_1650'}.json`)).then((r) => r.json() as Promise<WorldData>),
    fetch(asset('textures/materials.json')).then((r) => r.json() as Promise<Record<string, MaterialInfo[]>>),
  ]);
  const stub = { discoveries: [], data } as unknown as World;
  let hud = new Hud(uiRoot, stub);
  hud.showTitle('Grinding pigments…');
  await nextFrame();
  const [build, ground, trees] = await Promise.all([
    loadMaterialSet('build', meta, renderer, lowQ),
    loadMaterialSet('ground', meta, renderer, lowQ),
    loadTreeAtlas(renderer),
  ]);
  hud.setLoading('Unrolling the map of Diest…');
  await nextFrame();
  const world = new World(data, { build, ground, trees });
  world.build((m) => hud.setLoading(m));
  uiRoot.innerHTML = '';
  hud = new Hud(uiRoot, world);
  hud.showTitle('Priming the sky…');
  hud.initMarks();
  scene.add(world.group);

  const atmo = new Atmosphere(scene, renderer, quality === 'high' ? 4096 : quality === 'medium' ? 2048 : 0);
  const rig = new CameraRig(window.innerWidth / window.innerHeight, world.collision);
  const post = new Post(renderer, scene, rig.camera, quality);
  atmo.onChange = (look) => {
    post.setLook(look);
    world.uniforms.uNight.value = look.night;
  };
  await atmo.init(params.get('sky') ?? 'golden');

  const player = new Player(world.collision, {
    trauma: (t) => rig.addTrauma(t),
    flap: (s) => sound.flap(s),
    land: (i) => sound.land(i),
    takeoff: () => sound.takeoff(),
    step: () => sound.step(),
  });
  scene.add(player.group);
  hud.setLoading('Waking the dragon…');
  const dragonModel = await loadModel('models/dragon.glb');
  if (dragonModel) player.dragon.useModel(dragonModel.scene);
  const riderModel = await loadModel('models/rider.glb');
  if (riderModel) player.hero.useModel(riderModel);
  // --- quests, people, journal
  const toasts: string[] = [];
  let toastAt = 0;
  const late: { journal?: JournalUI; actors?: Actors } = {};
  const quests = new QuestEngine(diest, {
    toast: (kicker, text) => toasts.push(kicker ? `${kicker} · ${text}` : text),
    changed: () => {
      late.journal?.render();
      late.actors?.syncPickups();
    },
  });
  const actors = (late.actors = new Actors(riderModel, quests, world.collision));
  actors.spawnNpcs(diest.npcs);
  actors.syncPickups();
  scene.add(actors.group);
  const dialogue = new DialogueUI(uiRoot, quests);
  const journal = (late.journal = new JournalUI(uiRoot, quests));
  let uiClosedAt = 0;
  const uiOpen = () => dialogue.open || journal.open;

  // Spawn east of town over the Demer meadows, gliding toward the Grote Markt.
  const sx = 1150, sz = 380;
  player.spawn(sx, 95, sz, Math.atan2(-sx, -sz));
  rig.yaw = player.yaw;

  const resize = () => {
    renderer.setPixelRatio(ratio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    post.composer.setPixelRatio(ratio);
    post.setSize(window.innerWidth, window.innerHeight);
    rig.camera.aspect = window.innerWidth / window.innerHeight;
    rig.camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);

  let running = false;
  let paused = false;
  hud.ready(() => {
    running = true;
    sound.start();
    input.requestLock();
    setTimeout(() => {
      const fresh = !Object.keys(quests.s.quests).length;
      if (fresh) hud.announce('BRABANT · 1650', 'The Quiet Bells', 'The war with France drags on, Antwerp\'s river is closed, and the bells of Diest have stopped ringing. Land in town and talk to people: look for the gold ! above their heads.');
      else hud.announce('BRABANT · 1650', 'Welcome back', 'Your journal is as you left it. Press J to read it.');
    }, 900);
  });
  canvas.addEventListener('click', () => {
    if (running) input.requestLock();
  });
  document.addEventListener('pointerlockchange', () => {
    if (!running) return;
    const locked = document.pointerLockElement === canvas;
    // Gamepad players don't need pointer lock; only pause for mouse users,
    // and only where pointer lock actually works (embedded pages fall back to drag-look).
    paused = !locked && input.device === 'kbm' && input.lockSupported && !uiOpen();
    hud.pauseOverlay(paused);
    if (paused) hud.overlay.addEventListener('click', () => input.requestLock(), { once: true });
  });

  // Debug / screenshot hooks
  if (params.has('autostart')) {
    running = true;
    uiRoot.querySelector('.overlay')?.classList.add('hidden');
  }
  /**
   * Debug hook used by the critic loop (tools/critic): put the player and the
   * camera in an exact, repeatable pose so every round shoots the same frame.
   */
  const pose = async (s: {
    sky?: string; walk?: boolean; x: number; y?: number; z: number; yaw: number; camYaw?: number; pitch?: number; ui?: boolean;
  }) => {
    if (s.sky) await atmo.setPreset(s.sky);
    let { x, z } = s;
    if (s.walk) {
      // nearest open ground to the requested spot
      const c = world.collision;
      search: for (let r = 0; r < 60; r += 1.5)
        for (let a = 0; a < 6.28; a += 0.3) {
          const tx = s.x + Math.cos(a) * r, tz = s.z + Math.sin(a) * r;
          if (c.heightAround(tx, tz, 1.5) < 0.1) { x = tx; z = tz; break search; }
        }
      player.debugPlaceOnFoot(x, z, s.yaw);
    } else {
      player.debugPlaceFlying(x, s.y ?? 80, z, s.yaw);
    }
    rig.yaw = s.camYaw ?? s.yaw;
    rig.pitch = s.pitch ?? -0.2;
    rig.snap();
    uiRoot.style.display = s.ui ? '' : 'none';
  };
  (window as unknown as { belfort: object }).belfort = { player, rig, world, atmo, scene, renderer, post, pose, quests, actors, dialogue, journal };

  const clock = new THREE.Clock();
  const focus = new THREE.Vector3();
  let mapOpen = false;
  // Dynamic resolution: hold a playable frame rate on weaker GPUs.
  const adaptive = !params.has('dpr') && !lowQ;
  let fpsFrames = 0, fpsTime = 0;

  function frame() {
    requestAnimationFrame(frame);
    const dt = clamp(clock.getDelta(), 0, 1 / 20);
    input.poll();
    if (running && !paused) {
      if (input.consume('help')) hud.toggleHelp();
      if (input.consume('time')) {
        atmo.advance();
        setTimeout(() => hud.flash(atmo.look.label.toUpperCase()), 400);
      }
      if (input.consume('map') && !uiOpen()) mapOpen = hud.toggleMap();
      if (input.consume('journal') && !dialogue.open) {
        if (!journal.toggle()) closeUi();
      }
      if (uiOpen()) {
        // the world waits while you read; keys belong to the open panel
        input.consume('interact');
        input.consume('jump');
      } else if (!mapOpen) {
        if (player.mode === 'walk' && performance.now() - uiClosedAt > 250 && talkOrPickUp()) {
          // the press went to a person or a thing on the ground
        } else player.update(dt, input, rig.yaw, rig.pitch);
      }
      rig.update(dt, input, player);
    } else {
      rig.update(0.0001, input, player);
    }

    player.focus(focus);
    atmo.update(rig.camera.position, focus, Math.max(0, rig.camera.position.y));
    world.cull(rig.camera.position);
    world.uniforms.uTime.value += dt;
    world.demerMat.emissiveIntensity = 0.3 + Math.sin(world.uniforms.uTime.value * 0.7) * 0.12 + atmo.night * 0.7;
    if (world.oak) {
      for (const m of world.oak.children) m.position.y += Math.sin(world.uniforms.uTime.value * 0.8 + m.userData.float) * 0.012;
    }

    // discoveries
    const px = player.onFoot ? player.heroPos.x : player.pos.x;
    const pz = player.onFoot ? player.heroPos.z : player.pos.z;
    const py = player.onFoot ? player.heroPos.y : player.pos.y;
    uiRoot.classList.toggle('ui-open', uiOpen());
    if (running && !paused) {
      quests.update(px, py, pz);
      actors.update(dt, px, pz, dialogue.npcId);
      const t = quests.target();
      hud.questTarget = t ? { x: t.x, z: t.z, title: t.quest.title, objective: t.objective.text } : null;
      if (toasts.length && performance.now() - toastAt > 1900) {
        hud.flash(toasts.shift()!);
        toastAt = performance.now();
      }
      for (const d of world.discoveries) {
        if (d.found) continue;
        const r = d.r + (player.onFoot ? 0 : Math.min(py * 0.5, 120));
        if ((d.x - px) ** 2 + (d.z - pz) ** 2 < r * r) {
          d.found = true;
          hud.discover(d);
          sound.chime(d.key === 'Sint-Sulpitius en Dionysiuskerk');
        }
      }
    }

    // location line: where you are, in the world's own terms (no numbers)
    const place = placeName(px, pz);
    if (player.onFoot) hud.setLocation(place.name, place.where);
    else hud.setLocation(place.name, pace(player.speed, player.boostTime > 0, player.altitude()));
    const key = input.device === 'pad' ? 'Y' : 'E';
    const near = player.mode === 'walk' && !uiOpen() ? nearby() : null;
    if (uiOpen()) hud.setPrompt(null);
    else if (near?.npc) hud.setPrompt(`<kbd>${key}</kbd>Talk to ${near.npc.name}`);
    else if (near?.pickup) hud.setPrompt(`<kbd>${key}</kbd>Pick up ${quests.item(near.pickup.item)?.name ?? near.pickup.item}`);
    else if (player.mode === 'fly' && player.canLand()) hud.setPrompt(`<kbd>${key}</kbd>Land`);
    else if (player.mode === 'walk') hud.setPrompt(player.distanceToDragon() < 7 ? `<kbd>${key}</kbd>Mount your dragon` : `<kbd>${key}</kbd>Call your dragon`);
    else hud.setPrompt(null);

    sound.wind(player.onFoot ? 0 : player.speed, player.boostTime > 0);
    hud.update(dt, rig.yaw, px, pz);
    post.render(dt);
    input.endFrame();

    if (adaptive && running && !paused) {
      fpsFrames++;
      fpsTime += dt;
      if (fpsTime >= 1.5) {
        const fps = fpsFrames / fpsTime;
        fpsFrames = 0;
        fpsTime = 0;
        const prev = ratio;
        if (fps < 38) ratio = Math.max(0.55, ratio * 0.86);
        else if (fps > 57 && ratio < maxRatio) ratio = Math.min(maxRatio, ratio * 1.07);
        if (ratio !== prev) resize();
      }
    }
  }

  function nearby() {
    const x = player.heroPos.x, z = player.heroPos.z;
    const npc = actors.nearestNpc(x, z);
    if (npc) return { npc, pickup: null };
    const pickup = actors.nearestPickup(x, z);
    return pickup ? { npc: null, pickup } : null;
  }

  /** E near a person starts a conversation; near a quest item picks it up. */
  function talkOrPickUp(): boolean {
    if (!input.peek('interact')) return false;
    const near = nearby();
    if (!near) return false; // nothing here: the press calls or mounts the dragon
    input.consume('interact');
    if (near.npc) {
      const start = quests.conversationFor(near.npc.id);
      if (start) {
        mapOpen = mapOpen && hud.toggleMap();
        dialogue.start(near.npc.id, start, closeUi);
      }
    } else if (near.pickup) {
      quests.take(near.pickup.key, near.pickup.item);
      sound.chime(false);
    }
    return true;
  }

  function closeUi() {
    uiClosedAt = performance.now();
    if (input.device === 'kbm') input.requestLock();
  }

  /** The nearest named place, and where it lies (inside the walls, before a gate, out in the fields). */
  function placeName(x: number, z: number): { name: string; where: string } {
    let best: { title: string; d: number } | null = null;
    for (const d of world.discoveries) {
      const dist = Math.hypot(d.x - x, d.z - z);
      const reach = Math.min(d.r * 1.6, 260);
      if (dist < reach && (!best || dist < best.d)) best = { title: d.title, d: dist };
    }
    const gates = Object.entries(world.data.walls?.gates ?? {});
    const town = world.inTown(x, z);
    if (town) return { name: best?.title ?? 'Diest', where: 'Within the walls of Diest' };
    for (const [g, [gx, gz]] of gates) {
      if (Math.hypot(gx - x, gz - z) < 220) {
        const lore = world.discoveries.find((d) => d.key === g);
        return { name: lore?.title ?? 'Diest', where: 'Outside the walls of Diest' };
      }
    }
    const villages: [string, number, number, number][] = [
      ['Scherpenheuvel', -5062, 518, 900], ['Kaggevinne', -2225, 669, 700], ['Webbekom', 1413, 1276, 800],
    ];
    for (const [n, vx, vz, r] of villages) if (Math.hypot(vx - x, vz - z) < r) return { name: best?.title ?? n, where: 'The Demer valley' };
    if (Math.hypot(x, z) < 2000) return { name: best?.title ?? 'The fields of Diest', where: 'The Demer valley' };
    return { name: best?.title ?? 'The Demer valley', where: 'Duchy of Brabant' };
  }

  /** How the dragon is flying, in words. */
  function pace(speed: number, boosting: boolean, alt: number) {
    if (boosting) return 'At full stretch';
    if (speed < 2.5) return alt < 3 ? 'Settling' : 'Hovering';
    if (speed < 10) return 'Drifting';
    if (speed < 24) return 'Gliding';
    if (speed < 42) return 'Flying hard';
    return 'Racing the wind';
  }

  // Compile shaders before the curtain lifts, then hand over to the player.
  post.render(0);
  frame();
}

boot().catch((e) => {
  console.error(e);
  uiRoot.innerHTML = `<div class="overlay"><h2>Something went wrong</h2><p>${String(e)}</p></div>`;
});
