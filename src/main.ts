// BELFORT — prologue build: fly a gilded hatchling over the real streets of
// Diest, land anywhere, walk the town, discover its (twisted) history.

import * as THREE from 'three';
import { Sound } from './audio/sound';
import { CameraRig } from './camera/rig';
import { Input } from './core/input';
import { clamp } from './core/math';
import { Player } from './player/player';
import { Hud } from './ui/hud';
import { Atmosphere } from './world/sky';
import type { WorldData } from './world/types';
import { World } from './world/world';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui')!;

async function boot() {
  const params = new URLSearchParams(location.search);
  const lowQ = params.has('lowq');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
  renderer.setPixelRatio(lowQ ? 0.75 : Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !lowQ;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const input = new Input(canvas);
  const sound = new Sound();

  // --- load the world
  const res = await fetch('/world/diest.json');
  const data = (await res.json()) as WorldData;
  const world = new World(data);
  const hud = new Hud(uiRoot, world);
  hud.showTitle('Unrolling the map of Diest…');
  await new Promise((r) => setTimeout(r, 30));
  world.build((m) => hud.setLoading(m));
  hud.initMarks();
  scene.add(world.group);

  const atmo = new Atmosphere(scene, renderer);
  const rig = new CameraRig(window.innerWidth / window.innerHeight, world.collision);

  const player = new Player(world.collision, {
    trauma: (t) => rig.addTrauma(t),
    flap: (s) => sound.flap(s),
    land: (i) => sound.land(i),
    takeoff: () => sound.takeoff(),
    step: () => sound.step(),
  });
  scene.add(player.group);
  // Spawn east of town over the Demer meadows, gliding toward the Grote Markt.
  const sx = 1150, sz = 380;
  player.spawn(sx, 95, sz, Math.atan2(-sx, -sz));
  rig.yaw = player.yaw;

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    rig.camera.aspect = window.innerWidth / window.innerHeight;
    rig.camera.updateProjectionMatrix();
  });

  // Warm up shaders before the curtain lifts.
  renderer.compile(scene, rig.camera);

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
    // Gamepad players don't need pointer lock; only pause for mouse users.
    paused = !locked && input.device === 'kbm';
    hud.pauseOverlay(paused);
    if (paused) {
      const resume = () => {
        hud.overlay.removeEventListener('click', resume);
        input.requestLock();
      };
      hud.overlay.addEventListener('click', resume);
    }
  });

  // Debug/screenshot hooks
  if (params.has('t')) {
    atmo.time = parseFloat(params.get('t')!);
    atmo.apply(true);
  }
  if (params.has('autostart')) {
    running = true;
    uiRoot.querySelector('.overlay')?.classList.add('hidden');
  }
  (window as unknown as { belfort: object }).belfort = { player, rig, world, atmo, scene, renderer };

  const clock = new THREE.Clock();
  const focus = new THREE.Vector3();
  let mapOpen = false;

  function frame() {
    requestAnimationFrame(frame);
    const dt = clamp(clock.getDelta(), 0, 1 / 20);
    input.poll();
    if (running && !paused) {
      if (input.consume('help')) hud.toggleHelp();
      if (input.consume('time')) atmo.advance();
      if (input.consume('map')) mapOpen = hud.toggleMap();
      if (!mapOpen) player.update(dt, input, rig.yaw, rig.pitch);
      rig.update(dt, input, player);
    } else {
      rig.update(0.0001, input, player);
    }

    player.focus(focus);
    atmo.update(dt, focus);
    world.cull(rig.camera.position);
    world.uniforms.uNight.value = atmo.night;
    world.uniforms.uTime.value += dt;
    world.demerMat.emissiveIntensity = 0.45 + Math.sin(world.uniforms.uTime.value * 0.7) * 0.15 + atmo.night * 0.6;
    if (world.oak) {
      for (const m of world.oak.children) {
        if (m.userData.float !== undefined) m.position.y += Math.sin(world.uniforms.uTime.value * 0.8 + m.userData.float) * 0.01;
      }
    }

    // discoveries
    const px = player.onFoot ? player.heroPos.x : player.pos.x;
    const pz = player.onFoot ? player.heroPos.z : player.pos.z;
    const py = player.onFoot ? player.heroPos.y : player.pos.y;
    for (const d of world.discoveries) {
      if (d.found) continue;
      const r = d.r + (player.onFoot ? 0 : Math.min(py * 0.5, 120));
      if ((d.x - px) ** 2 + (d.z - pz) ** 2 < r * r) {
        d.found = true;
        hud.discover(d);
        sound.chime(d.key === 'Sint-Sulpitius en Dionysiuskerk');
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
    renderer.render(scene, rig.camera);
    input.endFrame();
  }

  function nearestTown(x: number, z: number) {
    if (Math.hypot(x, z) < 1500) return 'Diest';
    if (Math.hypot(x + 5100, z - 520) < 1500) return 'Scherpenheuvel';
    if (Math.hypot(x - 1413, z - 1276) < 900) return 'Webbekom';
    if (Math.hypot(x + 2225, z - 669) < 800) return 'Kaggevinne';
    return 'The Demer valley';
  }

  frame();
}

boot().catch((e) => {
  console.error(e);
  uiRoot.innerHTML = `<div class="overlay"><h2>Something went wrong</h2><p>${String(e)}</p></div>`;
});
