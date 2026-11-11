// BELFORT — prologue build: fly a gilded hatchling over the real streets of
// Diest, land anywhere, walk the town, discover its (twisted) history.

import * as THREE from 'three';
import { Sound } from './audio/sound';
import { CameraRig } from './camera/rig';
import { Input } from './core/input';
import { clamp } from './core/math';
import { Player } from './player/player';
import { Post } from './render/post';
import { loadModel } from './render/models';
import { loadMaterialSet, type MaterialInfo } from './render/textures';
import { Hud } from './ui/hud';
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
    fetch(asset('world/diest.json')).then((r) => r.json() as Promise<WorldData>),
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
      hud.announce('PROLOGUE', 'The Quiet Bells', 'Somewhere below, the Mustard Pot has stopped ringing. Find out why — or at least look as if you are trying.');
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
    paused = !locked && input.device === 'kbm' && input.lockSupported;
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
  (window as unknown as { belfort: object }).belfort = { player, rig, world, atmo, scene, renderer, post, pose };

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
      if (input.consume('map')) mapOpen = hud.toggleMap();
      if (!mapOpen) player.update(dt, input, rig.yaw, rig.pitch);
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
    if (running && !paused) {
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

    // location line & prompts
    const street = world.streetAt(px, pz, player.onFoot ? 14 : 30);
    const near = nearestTown(px, pz);
    if (player.onFoot) {
      hud.setLocation(street ?? near, street ? near : 'On foot');
    } else {
      const alt = Math.max(0, Math.round(player.altitude()));
      hud.setLocation(near, `${alt} m above ground · ${Math.round(player.speed * 3.6)} km/h${street && alt < 60 ? ' · over ' + street : ''}`);
    }
    const key = input.device === 'pad' ? 'Y' : 'E';
    if (player.mode === 'fly' && player.canLand()) hud.setPrompt(`<kbd>${key}</kbd>Land`);
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

  function nearestTown(x: number, z: number) {
    if (Math.hypot(x, z) < 1500) return 'Diest';
    if (Math.hypot(x + 5100, z - 520) < 1500) return 'Scherpenheuvel';
    if (Math.hypot(x - 1413, z - 1276) < 900) return 'Webbekom';
    if (Math.hypot(x + 2225, z - 669) < 800) return 'Kaggevinne';
    return 'The Demer valley';
  }

  // Compile shaders before the curtain lifts, then hand over to the player.
  post.render(0);
  frame();
}

boot().catch((e) => {
  console.error(e);
  uiRoot.innerHTML = `<div class="overlay"><h2>Something went wrong</h2><p>${String(e)}</p></div>`;
});
