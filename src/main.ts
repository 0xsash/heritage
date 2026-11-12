// BELFORT — Brabant, 1650. An open-world action RPG: make a character, fly a
// dragon over the real streets of Diest, land, talk, take on quests, fight,
// level up, and decide how the troubles of the town end.

import * as THREE from 'three';
import { Sound } from './audio/sound';
import { CameraRig } from './camera/rig';
import { Combat } from './combat/combat';
import { diest } from './content/diest';
import { Input } from './core/input';
import { clamp } from './core/math';
import { Player } from './player/player';
import { Post } from './render/post';
import { loadModel } from './render/models';
import { loadMaterialSet, type MaterialInfo } from './render/textures';
import { Actors } from './rpg/actors';
import { RARITY, type Gear, rollGear, uniqueGear } from './rpg/character';
import { Crowd } from './rpg/crowd';
import { loadTownsfolk } from './rpg/townsfolk';
import { Kroniek, READABLES, ENTRIES } from './rpg/kroniek';
import { Readables } from './rpg/readables';
import { QuestEngine } from './rpg/quests';
import { freshSave, loadSave, writeSave } from './rpg/state';
import { runFrontEnd } from './ui/creation';
import { Banner, CharacterPanel, Guide, PlayerFrame, type SlotView } from './ui/gamehud';
import { Hud } from './ui/hud';
import { KroniekUI } from './ui/kroniekui';
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

  // --- the front end runs while the world loads behind it
  const loading = document.createElement('div');
  loading.className = 'overlay';
  loading.innerHTML = '<h1>BELFORT</h1><h2>HET HERTOGDOM BRABANT · ANNO 1650</h2><div class="loading">De pigmenten worden gemalen…</div>';
  uiRoot.appendChild(loading);
  // something true to read while the world loads
  const tips = ENTRIES.filter((e) => e.cat === 'tijd' && e.truth === 'geschiedenis');
  const tipEl = document.createElement('div');
  tipEl.className = 'loadtip';
  loading.appendChild(tipEl);
  const showTip = () => {
    const e = tips[Math.floor(Math.random() * tips.length)];
    tipEl.innerHTML = `<b>${e.title}</b>${e.text.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.')}`;
  };
  showTip();
  const tipTimer = setInterval(showTip, 7000);
  const setLoading = (m: string) => {
    const l = loading.querySelector('.loading');
    if (l) l.textContent = m;
  };
  const peek = loadSave();
  const skipFront = params.has('autostart');
  const front = skipFront
    ? Promise.resolve({ mode: 'continue' as const })
    : runFrontEnd(uiRoot, peek.created ? { name: peek.hero.name, level: peek.hero.level, origin: peek.hero.origin } : null, () => sound.start());

  // --- load everything
  const [data, meta] = await Promise.all([
    fetch(asset(`world/${params.get('world') ?? 'diest_1650'}.json`)).then((r) => r.json() as Promise<WorldData>),
    fetch(asset('textures/materials.json')).then((r) => r.json() as Promise<Record<string, MaterialInfo[]>>),
  ]);
  await nextFrame();
  const [build, ground, trees] = await Promise.all([
    loadMaterialSet('build', meta, renderer, lowQ),
    loadMaterialSet('ground', meta, renderer, lowQ),
    loadTreeAtlas(renderer),
  ]);
  setLoading('De kaart van Diest wordt opengerold…');
  await nextFrame();
  const world = new World(data, { build, ground, trees });
  world.build(setLoading);
  const hud = new Hud(uiRoot, world);
  hud.overlay.classList.add('hidden');
  hud.initMarks();
  scene.add(world.group);
  setLoading('De hemel wordt geschilderd…');

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
  setLoading('De draak wordt gewekt…');
  const dragonModel = await loadModel('models/dragon.glb');
  if (dragonModel) player.dragon.useModel(dragonModel.scene);
  const riderModel = await loadModel('models/rider.glb');
  if (riderModel) player.hero.useModel(riderModel);
  setLoading('De stad komt tot leven…');
  const townsfolk = await loadTownsfolk();
  setLoading('Klaar. Uw verhaal wacht.');

  // --- who are you?
  const fe = await front;
  loading.classList.add('hidden');
  setTimeout(() => loading.remove(), 700);
  clearInterval(tipTimer);
  sound.start();
  const isNew = fe.mode === 'new' || !peek.created;
  if (fe.mode === 'new') {
    const s = freshSave();
    s.created = true;
    s.hero = { ...s.hero, ...fe.hero, hp: 99999 };
    writeSave(s);
  } else if (!peek.created) {
    // straight in (debug / screenshot): a default character
    const s = freshSave();
    s.created = true;
    writeSave(s);
  }

  // --- quests, people, combat, HUD
  const toasts: string[] = [];
  let toastAt = 0;
  let pendingShop = false;
  const late: { journal?: JournalUI; actors?: Actors; chars?: CharacterPanel; banner?: Banner } = {};
  const lootNotice = (g: Gear) => {
    if (g.rarity >= 2) late.banner?.show('loot', RARITY[g.rarity].name.toUpperCase(), g.name, ['Druk op I om het te bekijken']);
    else toasts.push(`OPGERAAPT · ${g.name}`);
    late.chars?.render();
  };
  const quests = new QuestEngine(diest, {
    toast: (kicker, text) => toasts.push(kicker ? `${kicker} · ${text}` : text),
    changed: () => {
      late.journal?.render();
      late.actors?.syncPickups();
    },
    banner: (kind, title, lines) => {
      late.banner?.show(kind, kind === 'start' ? 'NIEUWE OPDRACHT' : kind === 'done' ? 'OPDRACHT VOLBRACHT' : 'MISLUKT', title, lines);
      if (kind === 'done') sound.questDone();
    },
    xp: (_n, levels) => {
      if (!levels) return;
      const L = quests.s.hero.level;
      const o = quests.sheet.origin;
      late.banner?.show('level', 'NIEUW NIVEAU', `Niveau ${L}`, [
        'Uw kracht groeit. Levenskracht hersteld.',
        L === o.skill2.level ? `Nieuwe vaardigheid: ${o.skill2.name} (R)` : '',
      ]);
      sound.levelUp();
      combat.fx.ring(player.onFoot ? player.heroPos : player.pos, 6, '#c8a8ff', 0.8);
    },
    gear: lootNotice,
    open: (panel) => {
      if (panel === 'shop') pendingShop = true;
      else late.chars?.toggle(true);
    },
  });
  const d0 = quests.sheet.derived();
  if (quests.s.hero.hp > d0.maxHp || quests.s.hero.hp <= 0) quests.s.hero.hp = d0.maxHp;
  if (isNew && !quests.s.hero.gear.wapen) {
    // starting gear for the origin
    const w = uniqueGear(quests.sheet.origin.start);
    if (w) quests.s.hero.gear.wapen = w;
    quests.s.hero.hp = quests.sheet.derived().maxHp;
  }
  player.hero.setCloak(quests.s.hero.cloak);

  // --- the Kroniek: what you have learned about Brabant
  const kroniek = new Kroniek(quests.s, {
    unlocked: (e) => {
      if (e.cat === 'plaats') return; // the discovery card already said so
      toasts.push(`KRONIEK · ${e.title}`);
      quests.addXp(10 + quests.s.hero.level * 2);
    },
    milestone: (n, total) => {
      const g = rollGear(quests.s.hero.level + 1, n >= 30 ? 2 : 1);
      quests.s.florins += 20;
      quests.giveGear(g);
      late.banner?.show('done', 'KRONIEK', `${n} van ${total} bladzijden`, ['Marieke betaalt goed voor nieuws: 20 florijnen', `En een geschenk: ${g.name}`]);
      sound.questDone();
    },
  }, () => quests.save());
  for (const d of world.discoveries) d.found = kroniek.has(`plaats:${d.key}`);
  const readables = new Readables(READABLES, world.collision, kroniek);
  scene.add(readables.group);
  const kroniekUI = new KroniekUI(uiRoot, kroniek);
  kroniekUI.onClose = () => closeUi();
  {
    // creatures enter the Kroniek the first time one falls
    const onKill = quests.onKill.bind(quests);
    quests.onKill = (type, camp, x, z, elite) => {
      onKill(type, camp, x, z, elite);
      kroniek.unlock(elite && camp === 'galgeberg' ? 'wezen:roelof' : `wezen:${type}`);
    };
  }

  const actors = (late.actors = new Actors(riderModel, quests, world.collision, townsfolk));
  actors.spawnNpcs(diest.npcs);
  actors.syncPickups();
  scene.add(actors.group);
  const combat = new Combat(riderModel, world.collision, player, quests, sound, uiRoot, {
    trauma: (t) => rig.addTrauma(t),
    hurt: (f) => frame.hurt(f),
    died: () => respawn(),
    levelUp: () => {},
    loot: lootNotice,
  });
  combat.setCamps(diest.camps);
  scene.add(combat.group);
  const crowd = riderModel ? new Crowd(riderModel, world, quests, (text, at) => combat.floaters.add(text, at, 'bark', 3.2, 0.35), townsfolk) : null;
  if (crowd) scene.add(crowd.group);
  const guide = new Guide(uiRoot);
  scene.add(guide.group);
  const frame = new PlayerFrame(uiRoot);
  const banner = (late.banner = new Banner(uiRoot));
  const dialogue = new DialogueUI(uiRoot, quests);
  const journal = (late.journal = new JournalUI(uiRoot, quests));
  const chars = (late.chars = new CharacterPanel(uiRoot, quests, () => player.hero.setCloak(quests.s.hero.cloak), () => sound.coins()));
  let uiClosedAt = 0;
  const uiOpen = () => dialogue.open || journal.open || chars.open || kroniekUI.open || kroniekUI.reading;
  let bellsRang = !!quests.s.flags.bells_ring;
  let bellTimer = 30;

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

  let running = true;
  let paused = false;
  input.requestLock();
  if (isNew) {
    quests.start('main_arrive');
    setTimeout(() => hud.announce('BRABANT · 1650', `${quests.s.hero.name} en ${quests.s.hero.dragon}`, `Volg het gouden licht naar de Grote Markt van Diest. Druk op E om te landen. Linkermuis spuwt vuur, H toont de besturing.`), 2600);
  } else {
    hud.toggleHelp();
    banner.show('start', 'WELKOM TERUG', quests.s.hero.name, [`Niveau ${quests.s.hero.level} · ${quests.s.florins} florijnen`, 'J: dagboek · I: personage']);
  }
  if (isNew) setTimeout(() => hud.toggleHelp(), 30000);

  canvas.addEventListener('click', () => {
    if (running && !uiOpen()) input.requestLock();
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

  if (params.has('autostart')) uiRoot.querySelector('.frontend')?.remove();
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
  (window as unknown as { belfort: object }).belfort = { input, player, rig, world, atmo, scene, renderer, post, pose, quests, actors, dialogue, journal, combat, crowd, chars, banner, kroniek, kroniekUI, readables };

  const clock = new THREE.Clock();
  const focus = new THREE.Vector3();
  let mapOpen = false;
  // Dynamic resolution: hold a playable frame rate on weaker GPUs.
  const adaptive = !params.has('dpr') && !lowQ;
  let fpsFrames = 0, fpsTime = 0;
  let mapTimer = 0;
  const LIGHT: Record<string, string> = { 'Gouden uur': 'GOUDEN UUR', Hoogzomer: 'HOOGZOMER', Stormlicht: 'STORMLICHT', Maannacht: 'MAANNACHT' };

  function frameLoop() {
    requestAnimationFrame(frameLoop);
    const dt = clamp(clock.getDelta(), 0, 1 / 20);
    input.poll();
    let sdt = dt;
    if (running && !paused) {
      if (input.consume('help')) hud.toggleHelp();
      if (input.consume('time')) {
        atmo.advance();
        setTimeout(() => hud.flash(LIGHT[atmo.look.label] ?? atmo.look.label.toUpperCase()), 400);
      }
      if (input.consume('map') && !uiOpen()) mapOpen = hud.toggleMap();
      // one book, three sections: opening one closes the others
      const book = (which: 'journal' | 'kroniek' | 'character') => {
        if (dialogue.open || kroniekUI.reading) return;
        const was = which === 'journal' ? journal.open : which === 'kroniek' ? kroniekUI.open : chars.open;
        if (journal.open) journal.toggle();
        if (kroniekUI.open) kroniekUI.toggle();
        if (chars.open) chars.toggle(false);
        if (was) closeUi();
        else if (which === 'journal') journal.toggle();
        else if (which === 'kroniek') kroniekUI.toggle();
        else chars.toggle(true);
      };
      if (input.consume('journal')) book('journal');
      if (input.consume('kroniek')) book('kroniek');
      if (input.consume('character')) book('character');
      const blocked = uiOpen() || mapOpen;
      combat.update(blocked ? 0 : dt, input, rig.yaw, rig.camera, !blocked && performance.now() - uiClosedAt > 250);
      sdt = blocked ? 0 : dt * combat.timeScale;
      if (uiOpen()) {
        // the world waits while you read; keys belong to the open panel
        input.consume('interact');
        input.consume('jump');
      } else if (!mapOpen) {
        if (player.mode === 'walk' && !player.dead && performance.now() - uiClosedAt > 250 && talkOrPickUp()) {
          // the press went to a person or a thing on the ground
        } else player.update(sdt, input, rig.yaw, rig.pitch);
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

    const px = player.onFoot ? player.heroPos.x : player.pos.x;
    const pz = player.onFoot ? player.heroPos.z : player.pos.z;
    const py = player.onFoot ? player.heroPos.y : player.pos.y;
    uiRoot.classList.toggle('ui-open', uiOpen());
    if (running && !paused) {
      quests.update(px, py, pz, player.mode === 'walk');
      actors.update(sdt, px, pz, dialogue.npcId);
      readables.update(sdt, px, pz);
      crowd?.update(sdt, px, pz, player.onFoot ? 0 : player.altitude(), rig.camera, {
        x: px, z: pz, onFoot: player.onFoot, dragonX: player.pos.x, dragonZ: player.pos.z, dragonDown: player.mode === 'walk' || player.mode === 'calling',
      });
      // where to go next: the tracked objective, or the nearest person with work
      const t = quests.target();
      if (t) {
        const o = t.objective;
        const r = o.kind === 'kill' ? o.r : o.kind === 'reach' && o.r >= 40 ? o.r : 0;
        const text = quests.fill(o.text) + quests.progress(t.quest.id, o);
        guide.target = { x: t.x, z: t.z, r, title: t.quest.title, text, person: o.kind === 'talk' };
        hud.questTarget = { x: t.x, z: t.z, title: t.quest.title, objective: text, r };
      } else {
        const g = quests.nearestGiver(px, pz);
        guide.target = g ? { x: g.x, z: g.z, r: 0, title: 'Werk', text: `${g.npc.name} heeft werk voor u`, person: true } : null;
        hud.questTarget = g ? { x: g.x, z: g.z, title: 'Werk', objective: `Spreek met ${g.npc.name}` } : null;
      }
      const list = quests.activeList().map((a) => ({
        title: a.quest.title,
        kind: a.quest.kind,
        level: a.quest.level,
        tracked: a.tracked,
        objectives: a.objectives.map((o) => quests.fill(o.text) + quests.progress(a.quest.id, o)),
      }));
      hud.trackerList = list.length ? list : [{ title: 'Op zoek naar werk', kind: 'side', objectives: ['Zoek iemand met een gouden ! boven het hoofd'], tracked: true }];
      if (toasts.length && performance.now() - toastAt > 1900) {
        hud.flash(toasts.shift()!);
        toastAt = performance.now();
      }
      // the bells of Diest, once they ring again
      const ring = !!quests.s.flags.bells_ring;
      if (ring && !bellsRang) {
        bellsRang = true;
        kroniek.unlock('tijd:klank');
        banner.show('done', 'DIEST', 'De klokken luiden weer', ['Voor het eerst sinds zondag weet de stad hoe laat het is.']);
        for (let i = 0; i < 3; i++) setTimeout(() => sound.chime(), i * 1400);
        rig.addTrauma(0.15);
      }
      bellTimer -= dt;
      if (ring && bellTimer <= 0) {
        bellTimer = 75;
        if (Math.hypot(px, pz) < 1600) sound.chime();
      }
      for (const d of world.discoveries) {
        if (d.found) continue;
        const r = d.r + (player.onFoot ? 0 : Math.min(py * 0.5, 120));
        if ((d.x - px) ** 2 + (d.z - pz) ** 2 < r * r) {
          d.found = true;
          kroniek.unlock(`plaats:${d.key}`);
          hud.discover(d);
          sound.chime(d.key === 'Sint-Sulpitius en Dionysiuskerk' && !ring);
          quests.addXp(15);
        }
      }
      mapTimer -= dt;
      if (mapTimer <= 0) {
        mapTimer = 0.5;
        const marks: typeof hud.mapMarks = [];
        for (const n of diest.npcs) {
          const m = quests.marker(n.id);
          const p = quests.npcPos.get(n.id);
          if (m && p) marks.push({ x: p[0], z: p[1], kind: m, label: n.name });
        }
        for (const c of combat.campMarks()) marks.push({ x: c.x, z: c.z, kind: c.cleared ? 'camp-cleared' : 'camp', label: `${c.name} · ${c.level}` });
        hud.mapMarks = marks;
      }
    }

    // location line: where you are, in the world's own terms (no numbers)
    const place = placeName(px, pz);
    if (player.onFoot) hud.setLocation(place.name, place.where);
    else hud.setLocation(place.name, pace(player.speed, player.boostTime > 0, player.altitude()));
    const key = input.device === 'pad' ? 'Y' : 'E';
    const near = player.mode === 'walk' && !uiOpen() && !player.dead ? nearby() : null;
    const dragon = quests.s.hero.dragon;
    if (uiOpen() || player.dead) hud.setPrompt(null);
    else if (near?.npc) hud.setPrompt(`<kbd>${key}</kbd>Spreek met ${near.npc.name}${near.npc.shop ? ' · winkel' : ''}`);
    else if (near?.loot) hud.setPrompt(`<kbd>${key}</kbd>Raap op: <span style="color:${RARITY[near.loot.rarity].color}">${near.loot.name}</span>`);
    else if (near?.read) hud.setPrompt(`<kbd>${key}</kbd>${near.read.read ? 'Herlees' : 'Lees'} ${near.read.def.label}`);
    else if (near?.pickup) hud.setPrompt(`<kbd>${key}</kbd>Raap op: ${quests.item(near.pickup.item)?.name ?? near.pickup.item}`);
    else if (player.mode === 'fly' && player.canLand()) hud.setPrompt(`<kbd>${key}</kbd>Landen`);
    else if (player.mode === 'walk') hud.setPrompt(player.distanceToDragon() < 7 ? `<kbd>${key}</kbd>Bestijg ${dragon}` : combat.inCombat ? null : `<kbd>${key}</kbd>Roep ${dragon}`);
    else hud.setPrompt(null);

    // the player frame and action bar
    const o = quests.sheet.origin;
    const flying = !player.onFoot;
    const slots: SlotView[] = flying
      ? [
          { key: 'LMB', name: 'Vuur', cd: combat.fire < 18 ? 1 - combat.fire / 18 : 0, ready: combat.fire >= 18 },
          { key: 'Q', name: 'Zalf', cd: combat.cds.potion / 12, ready: combat.cds.potion <= 0, count: quests.s.inv.salve ?? 0 },
        ]
      : [
          { key: 'LMB', name: 'Zwaard', cd: 0, ready: true },
          { key: 'RMB', name: o.skill.short, cd: combat.cds.skill / o.skill.cooldown, ready: combat.cds.skill <= 0 && combat.resonance >= o.skill.cost },
          { key: 'R', name: o.skill2.short, cd: combat.cds.skill2 / o.skill2.cooldown, ready: combat.cds.skill2 <= 0 && combat.resonance >= o.skill2.cost, locked: quests.s.hero.level < o.skill2.level ? `niveau ${o.skill2.level}` : undefined },
          { key: 'SPATIE', name: 'Rol', cd: 0, ready: combat.inCombat },
          { key: 'Q', name: 'Zalf', cd: combat.cds.potion / 12, ready: combat.cds.potion <= 0, count: quests.s.inv.salve ?? 0 },
        ];
    frame.update(quests, combat.resonance, flying ? 'Vuur' : 'Resonantie', slots, flying ? combat.fire : null);
    banner.update(dt);
    hud.hold = banner.active;
    guide.update(dt, rig.camera, px, pz, (x, z) => world.collision.heightAt(x, z));
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
    if (npc) return { npc, pickup: null, loot: null, read: null };
    const loot = combat.nearestLoot(x, z);
    if (loot) return { npc: null, pickup: null, loot, read: null };
    const pickup = actors.nearestPickup(x, z);
    if (pickup) return { npc: null, pickup, loot: null, read: null };
    const read = readables.nearest(x, z);
    return read ? { npc: null, pickup: null, loot: null, read } : null;
  }

  /** E near a person starts a conversation; near something on the ground picks it up. */
  function talkOrPickUp(): boolean {
    if (!input.peek('interact')) return false;
    const near = nearby();
    if (!near) return false; // nothing here: the press calls or mounts the dragon
    input.consume('interact');
    if (near.read) {
      const e = kroniek.entry(near.read.def.entry);
      if (e) {
        const xp = 20 + quests.s.hero.level * 5;
        const isNew = !!kroniek.unlock(e.id, true);
        if (isNew) {
          quests.addXp(xp);
          sound.chime(false);
        }
        kroniekUI.show(e, isNew, `+${xp} ervaring`);
      }
    } else if (near.npc) {
      const start = quests.conversationFor(near.npc.id);
      kroniek.unlock(`mens:${near.npc.id}`);
      if (start) {
        if (mapOpen) mapOpen = hud.toggleMap();
        dialogue.start(near.npc.id, start, () => {
          closeUi();
          if (pendingShop) {
            pendingShop = false;
            chars.toggle(true, true);
          }
        });
      }
    } else if (near.loot) {
      near.loot.take();
    } else if (near.pickup) {
      quests.take(near.pickup.key, near.pickup.item);
      sound.chime(false);
    }
    return true;
  }

  function closeUi() {
    uiClosedAt = performance.now();
    if (input.device === 'kbm' && !uiOpen()) input.requestLock();
  }

  /** Fallen in battle: wake up in the nearest town, a little poorer. */
  function respawn() {
    const towns: [number, number, string][] = [[40, 70, 'Diest'], [-5040, 560, 'Scherpenheuvel']];
    const px = player.onFoot ? player.heroPos.x : player.pos.x, pz = player.onFoot ? player.heroPos.z : player.pos.z;
    const [tx, tz, name] = towns.sort((a, b) => Math.hypot(a[0] - px, a[1] - pz) - Math.hypot(b[0] - px, b[1] - pz))[0];
    const fee = Math.floor(quests.s.florins * 0.1);
    quests.s.florins -= fee;
    let x = tx, z = tz;
    const c = world.collision;
    search: for (let r = 0; r < 60; r += 1.5)
      for (let a = 0; a < 6.28; a += 0.3) {
        const sx2 = tx + Math.cos(a) * r, sz2 = tz + Math.sin(a) * r;
        if (c.heightAround(sx2, sz2, 1.5) < 0.1) { x = sx2; z = sz2; break search; }
      }
    player.debugPlaceOnFoot(x, z, 0);
    player.hero.revive();
    combat.reset();
    quests.save();
    banner.show('failed', 'GESNEUVELD', `Ge komt bij in ${name}`, [fee ? `De chirurgijn rekende ${fee} florijnen aan.` : 'De chirurgijn wilde niets aannemen.']);
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
    if (town) return { name: best?.title ?? 'Diest', where: 'Binnen de muren van Diest' };
    for (const [g, [gx, gz]] of gates) {
      if (Math.hypot(gx - x, gz - z) < 220) {
        const lore = world.discoveries.find((d) => d.key === g);
        return { name: lore?.title ?? 'Diest', where: 'Buiten de muren van Diest' };
      }
    }
    const villages: [string, number, number, number][] = [
      ['Scherpenheuvel', -5062, 518, 900], ['Kaggevinne', -2225, 669, 700], ['Webbekom', 1413, 1276, 800],
    ];
    for (const [n, vx, vz, r] of villages) if (Math.hypot(vx - x, vz - z) < r) return { name: best?.title ?? n, where: 'Het Demerdal' };
    if (Math.hypot(x, z) < 2000) return { name: best?.title ?? 'De velden van Diest', where: 'Het Demerdal' };
    return { name: best?.title ?? 'Het Demerdal', where: 'Hertogdom Brabant' };
  }

  /** How the dragon is flying, in words. */
  function pace(speed: number, boosting: boolean, alt: number) {
    if (boosting) return 'Op volle snelheid';
    if (speed < 2.5) return alt < 3 ? 'Landend' : 'Zwevend';
    if (speed < 10) return 'Drijvend';
    if (speed < 24) return 'Glijdend';
    if (speed < 42) return 'Hard vliegend';
    return 'Sneller dan de wind';
  }

  // Compile shaders before the curtain lifts, then hand over to the player.
  post.render(0);
  frameLoop();
}

boot().catch((e) => {
  console.error(e);
  uiRoot.innerHTML = `<div class="overlay"><h2>Er ging iets mis</h2><p>${String(e)}</p></div>`;
});
