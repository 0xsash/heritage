// The prologue: the night the bells of Diest fell silent. Three minutes, and
// you play them. You are walking your little sister home along the Demer;
// the bells stop at the seventh stroke of midnight; the water takes her; the
// thing that took her turns on you; and something else that the bells had
// kept asleep rises out of the reeds and chooses you.
//
// What it sets up: what is at stake (Neelke, and the town), what kind of world
// this is (the bells held every old thing asleep, the bad and the other), why
// there is a dragon, and the choice waiting at the end of the road: when all
// the bells of Brabant ring together again, he sleeps too.

import * as THREE from 'three';
import type { Input } from '../core/input';
import type { Player } from '../player/player';
import type { FolkSpec, TownsfolkKit } from '../rpg/townsfolk';
import { TYPES, makeBody, type Body } from '../combat/enemies';
import { Voice } from '../audio/voice';
import type { Sound } from '../audio/sound';
import { mist, softTexture, type Cine, type V3 } from './cine';
import { hint } from '../ui/nav';

export interface PrologueDeps {
  scene: THREE.Scene;
  ui: HTMLElement;
  player: Player;
  kit: TownsfolkKit | null;
  voice: Voice;
  name: string;
  dragon: string;
  /** the hero's sex, for {man|woman} words in the lines */
  sex?: 'm' | 'f';
  setSky(id: string): Promise<void>;
  bell(strong: boolean): void;
  howl(): void;
  fire(): void;
  boom(): void;
  trauma(t: number): void;
  hurt(f: number): void;
  /** fire and sparks where the dragon's breath lands */
  blast(at: THREE.Vector3): void;
  finish(skipped: boolean): void;
  /** turn the rider and the view towards the town (while the screen is dark, before dawn) */
  faceTown?(): void;
  /** the cinematic player: takes the camera for the big moments (see `beats` below) */
  cine?: Cine;
  /** for the beds under the big moments: the drone, the water, the night */
  sound?: Sound;
  /** the game camera (the rim light sits behind the figures, seen from here) */
  camera?: THREE.Camera;
}

/** Every spoken line, by id: [speaker, text]. {name} and {dragon} are filled in. */
export const PROLOGUE_LINES: Record<string, [string, string]> = {
  pro_n1: ['', 'Ze zeggen dat je de laatste gewone avond van je leven niet herkent. De mijne rook naar natte klaver, en mijn zusje liep te klagen.'],
  pro_s1: ['Neelke', 'Je loopt te rap. Mijn benen zijn korter dan de jouwe.'],
  pro_n2: ['', 'Neelke telde alles. Stappen, sterren, de slagen van de klok. Ze zei dat de wereld dan niet kon weglopen.'],
  pro_s2: ['Neelke', 'Twaalf slagen. Als we voor de laatste binnen zijn, heeft moeder niets gemerkt.'],
  pro_s3: ['Neelke', 'Zeven. Het is middernacht. Waar blijven de andere vijf?'],
  pro_n3: ['', 'Zolang er een Diest was, hadden de klokken elk uur geslagen. Door pest, door brand, door drie legers. Niemand wist nog waarom dat moest.'],
  pro_s4: ['Neelke', 'Kijk. Er branden lichtjes op het water.'],
  pro_n4: ['', 'Ik riep haar naam. Ze draaide zich niet om. Ze telde.'],
  pro_s5: ['Neelke', '{name}!'],
  pro_n5: ['', 'Het water nam haar zoals het alles neemt. Zonder haast. Zonder geluid.'],
  pro_n6: ['', 'Grootmoeder had hem een naam gegeven, bij het vuur, om ons binnen te houden. De Kludde. Ik had erom gelachen.'],
  pro_n7: ['', 'De klokken hadden alles in slaap gehouden wat ouder was dan de stad. Het ergste. En, zo bleek, niet alleen het ergste.'],
  pro_n8: ['', 'Hij rook naar riet en naar een smidse. Hij keek me aan zoals je iemand aankijkt op wie je lang hebt gewacht.'],
  pro_n9: ['', 'Ik heb hem {dragon} genoemd. Hij heeft het toegelaten.'],
  pro_n10: ['', 'Later zou een oude vrouw het me zeggen: als alle klokken van het land weer samen luiden, gaat alles slapen wat wakker is geworden. De Kludde. En hij.'],
  pro_n11: ['', 'Dat was later. Die ochtend wist ik maar één ding. Wat het water neemt, geeft het soms terug. Ik zou het gaan halen.'],
};

/** Neelke, as the character kit makes her (the intro's last shots show her too). */
export const NEELKE: FolkSpec = { body: 'girl', role: 'child', seed: 1650, wear: { hair_bun: 'h_blond', coif: null, bodice: 'woad', kerchief: null, skirt: 'russet', apron: 'linen', clogs: null } };

/** Alone on black, before the place card. */
const EPIGRAPH = '<div class="pc-title pc-epi">Dit land is op het water veroverd.<br>Het water is dat niet vergeten.</div>';
const PLACE = '<div class="pc-kick">DE DEMER, BIJ DIEST</div><div class="pc-title">De nacht van zaterdag op zondag</div><div class="pc-sub">anno 1650</div>';

type Stage = 'card' | 'walk' | 'bells' | 'silence' | 'lure' | 'rise' | 'gone' | 'hunt' | 'down' | 'dragon' | 'meet' | 'mount' | 'dawn' | 'done';

// the place: the west bank of the Demer, east of the Koepoort
const START = new THREE.Vector3(1392, 0, 6);
const HOME = { x: 737, z: 77 };
const BANK = new THREE.Vector3(1436, 0, -46);
const WATER = new THREE.Vector3(1446, 0, -52);
const WISPS: [number, number][] = [[1449, -38], [1445, -64], [1453, -18]];

export class Prologue {
  active = false;
  stage: Stage = 'card';
  /** what the screen asks of the player right now */
  objective = '';
  target: { x: number; z: number } | null = null;
  prompt: string | null = null;
  /** E may reach the game (to climb on) */
  allowMount = false;

  private t = 0;
  private group = new THREE.Group();
  private fade = document.createElement('div');
  private card = document.createElement('div');
  private cine = document.createElement('div');
  private sub: HTMLElement;
  private obj: HTMLElement;
  private queue: { id: string; hold: number }[] = [];
  private subLeft = 0;
  private speaking = false;
  private said = new Set<string>();
  private skipHeld = 0;
  private skipFrom = 0;
  private skipDown = false;
  /** a skip from the film before is still held down */
  private needRelease = false;

  private sis: { root: THREE.Object3D; mixer: THREE.AnimationMixer; walk: THREE.AnimationAction; idle: THREE.AnimationAction; x: number; z: number; yaw: number } | null = null;
  private sisGoal: THREE.Vector3 | null = null;
  private kludde: Body | null = null;
  private kPos = new THREE.Vector3();
  private kYaw = 0;
  private wisps: Body[] = [];
  /** the lights on the water light the reeds and the bank around them */
  private wispLights: THREE.PointLight[] = [];
  private tolls = 0;
  private tollT = 0;
  private fired = false;

  // the staging: moonlight from behind the figures, mist on the water, Neelke's lantern
  private rim: THREE.DirectionalLight | null = null;
  private lamp: THREE.PointLight | null = null;
  private dropped: { obj: THREE.Object3D; light: THREE.PointLight; t: number } | null = null;
  private mists: { update(dt: number): void }[] = [];
  private beatsDone = new Set<string>();
  private wispPool: THREE.PointLight[] = [];

  constructor(private d: PrologueDeps) {
    this.fade.className = 'pro-fade';
    this.card.className = 'pro-card';
    this.cine.className = 'cine';
    // the prologue is played, so Escape pauses it as always (and the pause menu can skip it); Backspace held skips it
    this.cine.innerHTML = `<div class="cine-obj"></div><div class="cine-sub"></div><div class="cine-skip">${hint('Houd <kbd>Backspace</kbd> ingedrukt om over te slaan · <kbd>Esc</kbd> pauze', '<kbd>Start</kbd> pauze · daar kun je de proloog overslaan')}</div>`;
    this.sub = this.cine.querySelector('.cine-sub')!;
    this.obj = this.cine.querySelector('.cine-obj')!;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backspace' && this.active && !this.needRelease) this.skipDown = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Backspace') {
        this.skipDown = false;
        this.needRelease = false;
      }
    });
  }

  private fill(s: string) {
    return s.replace('{name}', this.d.name).replace('{dragon}', this.d.dragon).replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m: string, w: string) => (this.d.sex === 'f' ? w : m));
  }

  /** Queue a line: narration (no speaker) or someone speaking. Said once. */
  private say(id: string, hold = 0) {
    if (this.said.has(id)) return;
    this.said.add(id);
    this.queue.push({ id, hold });
  }

  private setFade(v: number, seconds = 1.2) {
    this.fade.style.transitionDuration = `${seconds}s`;
    this.fade.style.opacity = String(v);
  }

  private go(s: Stage) {
    this.stage = s;
    this.t = 0;
  }

  /** @param skipKeyHeld the skip key is still down from the film before: it must be let go first */
  async start(skipKeyHeld = false) {
    const d = this.d, p = d.player;
    this.active = true;
    this.needRelease = skipKeyHeld;
    this.skipDown = false;
    d.ui.classList.add('prologue');
    d.ui.append(this.fade, this.card, this.cine);
    this.fade.style.opacity = '1';
    this.card.innerHTML = EPIGRAPH;
    this.card.classList.add('show');
    d.scene.add(this.group);
    // the hero on foot on the river bank, facing home (west); the dragon does not exist yet
    p.debugPlaceOnFoot(START.x, START.z, -Math.PI / 2);
    p.pos.set(WATER.x, -40, WATER.z);
    p.dragon.root.visible = false;
    // Neelke
    // she carries the lantern: after curfew nobody walks without a light (and it is the only warm light in the night)
    const folk = d.kit?.buildSpec({ ...NEELKE, prop: 'lantern' }) ?? null;
    if (folk) {
      folk.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.castShadow = true;
      });
      const mixer = new THREE.AnimationMixer(folk.root);
      const walk = mixer.clipAction(folk.clip('run') ?? folk.clips.walk), idle = mixer.clipAction(folk.clips.idle);
      walk.play();
      idle.play();
      walk.weight = 0;
      this.group.add(folk.root);
      this.sis = { root: folk.root, mixer, walk, idle, x: START.x + 1.5, z: START.z + 2.2, yaw: -Math.PI / 2 };
      this.lamp = new THREE.PointLight('#ffb35a', 5.5, 14, 1.6);
      this.group.add(this.lamp);
    }
    this.light();
    await d.setSky('night');
    this.go('card');
  }

  update(dt: number, input: Input) {
    if (!this.active) return;
    const d = this.d, p = d.player;
    this.t += dt;
    const t = this.t;
    const hero = p.heroPos;

    // hold Backspace to skip
    const now = performance.now();
    if (this.skipDown) this.skipFrom ||= now;
    else this.skipFrom = 0;
    this.skipHeld = this.skipFrom ? (now - this.skipFrom) / 1000 : 0;
    this.cine.classList.toggle('skipping', this.skipHeld > 0.1);
    if (this.skipHeld > 0.8 && this.stage !== 'done') return this.end(true);
    if (!this.allowMount || this.stage === 'dawn') input.consume('interact'); // no landing during the dawn titles

    this.updateSubtitles(dt);
    this.updateSister(dt, hero);
    for (const w of this.wisps) {
      w.update(dt);
      w.root.position.y = -1.2 + Math.sin(performance.now() / 700 + w.root.position.x) * 0.25;
    }
    for (const [i, l] of this.wispLights.entries()) l.intensity = Math.min(9, l.intensity + dt * 4) * (0.85 + Math.sin(performance.now() / 260 + i * 2) * 0.15);
    if (this.kludde) {
      this.kludde.root.position.copy(this.kPos);
      this.kludde.root.rotation.y = this.kYaw;
      this.kludde.update(dt);
    }
    this.stageLight(dt);
    this.direct(dt);

    switch (this.stage) {
      case 'card':
        // the epigraph for four seconds, then the place card
        if (t > 4 && !this.said.has('epigraph')) {
          this.said.add('epigraph');
          this.card.classList.remove('show');
        }
        if (t > 5.4 && !this.said.has('place')) {
          this.said.add('place');
          this.card.innerHTML = PLACE;
          this.card.classList.add('show');
        }
        if (t > 9) {
          this.card.classList.remove('show');
          this.setFade(0, 2.4);
          this.objective = 'Breng Neelke naar huis';
          this.target = HOME;
          this.go('walk');
        }
        break;
      case 'walk':
        if (t > 2.5) this.say('pro_n1');
        if (t > 8) this.say('pro_s1');
        if (t > 13.5) this.say('pro_n2');
        if (t > 19.5) this.say('pro_s2');
        // the bells wait for the last line to be read
        if (t > 25 && !this.queue.length && !this.speaking && this.subLeft < 0.3) this.go('bells');
        break;
      case 'bells':
        // midnight: twelve strokes are owed. Seven come.
        this.tollT -= dt;
        if (this.tollT <= 0 && this.tolls < 7) {
          this.tolls++;
          this.tollT = 1.75;
          d.bell(this.tolls === 1);
          const words = ['Eén', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven'];
          this.sub.innerHTML = `<b>Neelke</b>${words.slice(0, this.tolls).join('… ')}…`;
          this.sub.classList.add('show');
          this.subLeft = 2.2;
        }
        if (this.tolls >= 7 && this.tollT <= -1.4) this.go('silence');
        break;
      case 'silence':
        if (t > 1.2) this.say('pro_s3');
        if (t > 6) this.say('pro_n3');
        if (t > 8 && !this.wisps.length) {
          for (const [x, z] of WISPS) {
            const w = makeBody(TYPES.dwaallicht, null, false);
            w.root.position.set(x, -1.2, z); // just over the water (the body floats its light 2.6 m up)
            // (made at the start and kept in the scene: a new light would make every material compile again, right at this moment)
            const light = this.wispPool.shift() ?? new THREE.PointLight('#9fe0ff', 0, 26, 1.6);
            light.intensity = 0;
            light.position.set(0, 0, 0);
            light.position.y = 2.4;
            w.root.add(light);
            this.wispLights.push(light);
            this.group.add(w.root);
            this.wisps.push(w);
          }
        }
        if (t > 11.5) {
          this.say('pro_s4');
          this.sisGoal = BANK;
          this.objective = 'Haal Neelke terug';
          this.go('lure');
        }
        break;
      case 'lure': {
        if (this.sis) this.target = { x: this.sis.x, z: this.sis.z };
        if (t > 4) this.say('pro_n4');
        // she waits at the edge of the water, counting, until you are close enough to see what comes
        const there = this.sis ? Math.hypot(this.sis.x - BANK.x, this.sis.z - BANK.z) < 3 : t > 8;
        const near = Math.hypot(hero.x - BANK.x, hero.z - BANK.z) < 26;
        if ((there && near && t > 5) || t > 60) {
          // it comes up out of the river between you and her
          this.kludde = makeBody(TYPES.kludde, null, false);
          this.kPos.set(WATER.x - 3, -3.2, WATER.z);
          this.kYaw = Math.atan2(BANK.x - this.kPos.x, BANK.z - this.kPos.z);
          this.group.add(this.kludde.root);
          d.howl();
          d.trauma(0.7);
          this.go('rise');
        }
        break;
      }
      case 'rise':
        this.kPos.y = Math.min(0, -3.2 + t * 3);
        if (t > 0.9) this.say('pro_s5');
        if (t > 2.3) {
          this.setFade(1, 0.25);
          this.go('gone');
        }
        break;
      case 'gone':
        if (t > 0.5 && this.sis) {
          this.group.remove(this.sis.root);
          this.sis = null;
          for (const w of this.wisps) this.group.remove(w.root);
          this.wisps = [];
          this.wispLights = [];
          this.kPos.set(BANK.x, 0, BANK.z);
        }
        if (t > 1.5) {
          this.setFade(0, 1.4);
          this.say('pro_n5');
          this.target = null;
          this.objective = '';
        }
        if (t > 5) {
          d.howl();
          this.objective = 'Loop!';
          this.target = HOME;
          this.go('hunt');
        }
        break;
      case 'hunt': {
        // faster than you. It was always going to catch you.
        const dx = hero.x - this.kPos.x, dz = hero.z - this.kPos.z, dist = Math.hypot(dx, dz);
        const sp = Math.min(8.2, 3 + t * 2.2);
        this.kYaw = Math.atan2(dx, dz);
        if (dist > 2.4) this.kPos.addScaledVector(new THREE.Vector3(dx / dist, 0, dz / dist), sp * dt);
        this.kludde?.move(sp);
        if (dist < 2.6 || t > 9) {
          p.lock = 60; // down, until help comes
          p.push(dx / (dist || 1) * 4, dz / (dist || 1) * 4);
          p.hero.act('death', 99); // thrown to the ground: you stay there until something else comes out of the reeds
          d.hurt(0.9);
          d.trauma(0.9);
          this.kludde?.act('strike', 0.5);
          this.objective = '';
          this.target = null;
          this.go('down');
        }
        break;
      }
      case 'down':
        this.kludde?.move(0);
        if (t > 0.8) this.say('pro_n6');
        if (t > 5.5) {
          // the reeds part
          d.boom();
          d.trauma(0.5);
          p.summonFrom(WATER.x + 2, -7, WATER.z - 16);
          this.go('dragon');
        }
        break;
      case 'dragon': {
        const dd = p.pos.distanceTo(hero);
        if (!this.fired && (dd < 26 || t > 3.5)) {
          this.fired = true;
          d.fire();
          d.boom();
          d.trauma(0.8);
          d.blast(this.kPos.clone().setY(1));
        }
        if (this.fired && this.kludde) {
          // it goes back to the water
          const dx = WATER.x - this.kPos.x, dz = WATER.z - this.kPos.z, dist = Math.hypot(dx, dz);
          this.kYaw = Math.atan2(dx, dz);
          this.kPos.addScaledVector(new THREE.Vector3(dx / (dist || 1), 0, dz / (dist || 1)), 13 * dt);
          this.kludde.move(13);
          if (dist < 4) this.kPos.y -= dt * 4;
          if (dist < 1.5 || this.kPos.y < -3) {
            this.group.remove(this.kludde.root);
            this.kludde.dispose();
            this.kludde = null;
          }
        }
        if (this.fired) this.say('pro_n7');
        if (p.mode === 'walk' && t > 2 && !this.kludde) {
          p.lock = 0;
          p.hero.revive();
          p.hero.act('land', 0.9); // getting up
          this.go('meet');
        }
        break;
      }
      case 'meet':
        if (t > 0.6) this.say('pro_n8');
        if (t > 6.5) this.say('pro_n9');
        if (t > 9.5) {
          this.allowMount = true;
          this.objective = `Klim op ${d.dragon}`;
          this.target = { x: p.pos.x, z: p.pos.z };
          this.prompt = p.distanceToDragon() < 7 ? `<kbd>${hint('E', 'Y')}</kbd>Klim op ${d.dragon}` : null;
        }
        if (p.mode === 'fly') {
          this.prompt = null;
          this.objective = '';
          this.target = null;
          this.go('dawn');
          this.setFade(1, 1.6);
        }
        break;
      case 'dawn':
        if (t > 1.8 && !this.said.has('sky')) {
          this.said.add('sky');
          d.faceTown?.();
          void d.setSky('golden').then(() => {
            this.card.innerHTML = '<div class="pc-big">BELFORT</div><div class="pc-sub">Het hertogdom Brabant · anno 1650</div>';
            this.card.classList.add('show', 'title');
            this.setFade(0, 3);
            this.t = 3;
            this.said.add('lit');
          });
        }
        if (this.said.has('sky') && t > 5) this.say('pro_n10');
        if (this.said.has('sky') && t > 7.5) this.card.classList.remove('show');
        if (this.said.has('sky') && t > 13) this.say('pro_n11');
        if (this.said.has('sky') && t > 19 && !this.queue.length && !this.speaking) this.end(false);
        break;
      case 'done':
        break;
    }
    this.obj.textContent = this.objective;
    this.obj.classList.toggle('show', !!this.objective);
  }

  private updateSubtitles(dt: number) {
    if (this.speaking) return;
    this.subLeft -= dt;
    if (this.subLeft > 0) return;
    const next = this.queue.shift();
    if (!next) {
      this.sub.classList.remove('show');
      return;
    }
    const [who, raw] = PROLOGUE_LINES[next.id];
    const text = this.fill(raw);
    this.sub.innerHTML = `${who ? `<b>${who}</b>` : ''}<span class="${who ? '' : 'narr'}">${text}</span>`;
    this.sub.classList.add('show');
    if (this.d.voice.has(next.id)) {
      this.speaking = true;
      this.subLeft = 0.5;
      void this.d.voice.play(next.id).then(() => (this.speaking = false));
    } else this.subLeft = Voice.readTime(text) + next.hold;
  }

  private updateSister(dt: number, hero: THREE.Vector3) {
    const s = this.sis;
    if (!s) return;
    const p = this.d.player;
    // beside you, half a step behind; or wherever the lights are
    const gx = this.sisGoal ? this.sisGoal.x : hero.x - Math.sin(p.heroYaw) * 1.1 - Math.cos(p.heroYaw) * 1.5;
    const gz = this.sisGoal ? this.sisGoal.z : hero.z - Math.cos(p.heroYaw) * 1.1 + Math.sin(p.heroYaw) * 1.5;
    const dx = gx - s.x, dz = gz - s.z, dist = Math.hypot(dx, dz);
    const sp = this.sisGoal ? Math.min(3.2, dist * 2) : dist > 0.5 ? Math.min(7, dist * 2.2) : 0;
    if (sp > 0.15) {
      s.x += (dx / dist) * sp * dt;
      s.z += (dz / dist) * sp * dt;
      s.yaw = Math.atan2(dx, dz);
    } else if (this.stage === 'rise') s.yaw = Math.atan2(hero.x - s.x, hero.z - s.z);
    s.root.position.set(s.x, 0, s.z);
    s.root.rotation.y += Math.atan2(Math.sin(s.yaw - s.root.rotation.y), Math.cos(s.yaw - s.root.rotation.y)) * Math.min(1, dt * 7);
    const w = sp > 0.3 ? 1 : 0;
    s.walk.weight += (w - s.walk.weight) * Math.min(1, dt * 6);
    s.idle.weight = 1 - s.walk.weight;
    s.walk.timeScale = Math.max(0.45, sp / 3.6);
    s.mixer.update(dt);
  }

  // ================================================================ staging
  /** Night light for the scene: a cool rim of moonlight behind the figures, mist lying on the river. */
  private light() {
    this.rim = new THREE.DirectionalLight('#a9c4ff', 1.3);
    this.group.add(this.rim, this.rim.target);
    this.wispPool = WISPS.map(([x, z]) => {
      const l = new THREE.PointLight('#9fe0ff', 0, 26, 1.6);
      l.position.set(x, -50, z);
      this.group.add(l);
      return l;
    });
    this.mists = [
      mist(this.group, 1446, -40, 120, 22, '#8ea6c0', 0.12, 30, 5),
      mist(this.group, 1400, 10, 160, 16, '#7f95ad', 0.09, 34, 9),
    ];
  }

  private stageLight(dt: number) {
    const d = this.d, p = d.player, hero = p.heroPos;
    for (const m of this.mists) m.update(dt);
    // the rim light comes from the far side of the figures, so their edges catch the moon
    if (this.rim && d.camera) {
      const c = d.camera.position;
      const dx = hero.x - c.x, dz = hero.z - c.z, l = Math.hypot(dx, dz) || 1;
      this.rim.position.set(hero.x + (dx / l) * 40, hero.y + 22, hero.z + (dz / l) * 40);
      this.rim.target.position.set(hero.x, hero.y + 1, hero.z);
      // stronger once the night has turned bad, gone at dawn
      const want = this.stage === 'dawn' || this.stage === 'done' ? 0 : this.stage === 'walk' || this.stage === 'card' ? 1.3 : 2.0;
      this.rim.intensity += (want - this.rim.intensity) * Math.min(1, dt * 1.5);
    }
    // Neelke's lantern
    if (this.lamp && this.sis) {
      const f = 0.88 + Math.sin(performance.now() / 83) * 0.06 + Math.sin(performance.now() / 31) * 0.04;
      this.lamp.position.set(this.sis.x + Math.sin(this.sis.yaw + 1.2) * 0.35, 0.9, this.sis.z + Math.cos(this.sis.yaw + 1.2) * 0.35);
      this.lamp.intensity = 5.5 * f;
    }
    // the lantern she dropped burns on in the grass for a while, then goes out
    if (this.dropped) {
      const dr = this.dropped;
      dr.t += dt;
      const k = Math.max(0, 1 - dr.t / 14);
      dr.light.intensity = 4 * k * (0.75 + Math.sin(dr.t * 23) * 0.1 + Math.sin(dr.t * 7.3) * 0.1);
      if (k <= 0 && dr.light.parent) dr.light.removeFromParent();
    }
  }

  /** Her lantern falls where she stood: lying in the grass, still burning. */
  private dropLantern() {
    if (!this.sis || this.dropped) return;
    const lantern = this.sis.root.getObjectByName('prop.lantern');
    const x = this.sis.x + 0.3, z = this.sis.z + 0.2;
    let obj: THREE.Object3D;
    if (lantern) {
      lantern.removeFromParent();
      obj = lantern;
      obj.scale.setScalar(this.sis.root.scale.x);
    } else {
      obj = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.26, 8), new THREE.MeshStandardMaterial({ color: '#3a3020' }));
    }
    obj.position.set(x, 0.1, z);
    obj.rotation.set(0, 0.6, Math.PI / 2);
    this.group.add(obj);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: '#ffb060', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 }));
    glow.scale.setScalar(0.8);
    glow.position.set(x, 0.15, z);
    this.group.add(glow);
    const light = new THREE.PointLight('#ffb35a', 4, 10, 1.6);
    light.position.set(x, 0.4, z);
    this.group.add(light);
    this.dropped = { obj: glow, light, t: 0 };
    this.lamp?.removeFromParent();
    this.lamp = null;
  }

  /** Once per id. */
  private once(id: string) {
    if (this.beatsDone.has(id)) return false;
    this.beatsDone.add(id);
    return true;
  }

  /**
   * The big moments, directed: the camera is taken for a few seconds and handed back with a blend;
   * sound and light change with the moment. Nothing here changes what happens, only how it is seen.
   */
  private direct(dt: number) {
    const d = this.d, c = d.cine, snd = d.sound, p = d.player, hero = p.heroPos, t = this.t;
    c?.updateBeat(dt);
    // the dropped lantern's glow fades with its light
    if (this.dropped) (this.dropped.obj as THREE.Sprite).material.opacity = Math.min(0.7, this.dropped.light.intensity / 5);
    // while a beat holds the camera, the hero stands still (and listens)
    if (c?.beating && p.mode === 'walk') p.lock = Math.max(p.lock, 0.15);
    const v = (x: number, y: number, z: number): V3 => [x, y, z];
    const sis = this.sis;

    switch (this.stage) {
      case 'walk':
        if (this.once('walk')) {
          snd?.bed('night', 0.8, 3);
          snd?.bed('water', 0.45, 3);
        }
        break;
      case 'bells':
        if (this.tolls >= 1 && this.once('bells')) {
          // midnight: cut away to the tower of Sint-Sulpitius, where the strokes come from
          snd?.bed('drone', 0.35, 4);
          c?.startBeat({ path: [v(-66, 20, 92), v(-58, 27, 80)], look: [v(-27, 24, 37), v(-27, 29, 37)], fov: [44, 38], ease: 'inout' }, 6.6, 0, 0);
        }
        if (this.tolls >= 5 && this.once('bells-back') && sis) {
          // and back to her, counting, her face to the town
          const fx = Math.sin(sis.yaw), fz = Math.cos(sis.yaw);
          c?.startBeat({ path: [v(sis.x + fx * 3.4 + fz * 1.3, 1.2, sis.z + fz * 3.4 - fx * 1.3), v(sis.x + fx * 2.5 + fz * 0.9, 1.05, sis.z + fz * 2.5 - fx * 0.9)], look: [v(sis.x, 0.95, sis.z), v(sis.x, 1.0, sis.z)], fov: [40, 34], ease: 'inout' }, 7.5, 0, 1.6);
        }
        break;
      case 'silence':
        if (this.once('silence')) {
          // the eighth stroke does not come. The frogs stop too.
          snd?.bed('night', 0, 0.8);
          snd?.bed('drone', 0.12, 1);
          snd?.silence(5);
        }
        if (t > 8 && this.once('wisps')) {
          // lights on the water: the camera turns from the two of them to the river
          snd?.bed('drone', 0.5, 4);
          snd?.bed('water', 0.7, 2);
          // (a cut to the water's edge and back: the trees stand between the path and the river)
          c?.startBeat({ path: [v(1431, 1.3, -67), v(1434, 1.0, -63)], look: [v(1449, 0.6, -42), v(1449, 0.4, -40)], fov: [46, 38] }, 6.5, 0, 0);
        }
        break;
      case 'rise':
        if (this.once('rise')) {
          // it comes up between you and her: seen low, from the water's edge
          snd?.splash(true);
          snd?.bed('drone', 0.8, 0.8);
          const sx = sis?.x ?? BANK.x, sz = sis?.z ?? BANK.z;
          c?.startBeat({ path: [v(sx - 6, 0.7, sz + 6.5), v(sx - 7, 0.9, sz + 7.8)], look: [v(this.kPos.x, 1.2, this.kPos.z), v(this.kPos.x, 2.4, this.kPos.z)], fov: [46, 52], ease: 'out' }, 6.0, 0.25, 1.2);
        }
        break;
      case 'gone':
        if (t > 0.45 && this.once('drop')) this.dropLantern();
        if (t > 0.6 && this.once('gone')) {
          snd?.bed('drone', 0.3, 3);
          snd?.bed('water', 0.4, 3);
        }
        break;
      case 'hunt':
        if (this.once('hunt')) snd?.bed('drone', 0.6, 1.5);
        break;
      case 'down':
        if (t > 5.4 && this.once('reeds')) {
          // from the ground beside you: the reeds part, something comes out of the river
          const hx = hero.x, hz = hero.z;
          const tx = WATER.x + 2, tz = WATER.z - 16;
          const dx = tx - hx, dz = tz - hz, l = Math.hypot(dx, dz) || 1;
          const ux = dx / l, uz = dz / l;
          c?.startBeat(
            { path: [v(hx - ux * 2.5 + uz * 1.6, 0.5, hz - uz * 2.5 - ux * 1.6), v(hx - ux * 3.2 + uz * 2.2, 0.7, hz - uz * 3.2 - ux * 2.2)], look: [v(tx, 4, tz), v(hx + ux * 8, 3, hz + uz * 8)], fov: [50, 44] },
            6, 0.6, 1.8,
            () => (p.dragon.root.visible && p.pos.y > -5 ? p.pos.clone().setY(p.pos.y + 1.5) : null),
          );
          snd?.bed('drone', 1, 2);
        }
        break;
      case 'dragon':
        if (this.fired && this.once('fire')) snd?.hitLow(0.5);
        break;
      case 'meet':
        if (this.once('meet')) {
          // face to face: a slow turn round the two of them
          snd?.bed('drone', 0.45, 3);
          const ax = p.pos.x, az = p.pos.z;
          const mx = (hero.x + ax) / 2, mz = (hero.z + az) / 2;
          const dx = ax - hero.x, dz = az - hero.z, l = Math.hypot(dx, dz) || 1;
          const nx = -dz / l, nz = dx / l, ux = dx / l, uz = dz / l;
          c?.startBeat({ path: [v(mx + nx * 7 - ux * 3, 1.5, mz + nz * 7 - uz * 3), v(mx + nx * 7.5 + ux * 1, 2.0, mz + nz * 7.5 + uz * 1), v(mx + nx * 6 + ux * 4, 2.3, mz + nz * 6 + uz * 4)], look: [v(mx, 1.6, mz), v(mx, 1.8, mz), v(mx, 2, mz)], fov: [42, 38] }, 8.5, 1.4, 1.8);
        }
        break;
      case 'dawn':
        if (this.said.has('lit') && this.once('dawn')) {
          // dawn: from beside the rider, up and back until the meadows and the town are the picture; then it is yours
          snd?.bed('drone', 0.5, 3);
          snd?.bed('wind', 0.4, 3);
          const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), P = p.pos;
          c?.startBeat({
            path: [v(P.x + fz * 5 - fx * 1, P.y + 2.2, P.z - fx * 5 - fz * 1), v(P.x + fz * 7 - fx * 8, P.y + 5, P.z - fx * 7 - fz * 8), v(P.x - fx * 13, P.y + 5.5, P.z - fz * 13)],
            look: [v(P.x, P.y + 2.4, P.z), v(P.x + fx * 30, P.y + 3, P.z + fz * 30), v(P.x + fx * 60, P.y + 2, P.z + fz * 60)],
            fov: [42, 58], ease: 'inout',
          }, 11, 0.4, 2.6, () => p.pos.clone(), true);
        }
        if (t > 16 && this.once('dawn-quiet')) {
          snd?.bed('drone', 0, 4);
          snd?.bed('water', 0, 3);
        }
        break;
    }
  }

  /** Skip the rest (the pause menu's PROLOOG OVERSLAAN). */
  skip() {
    if (this.active && this.stage !== 'done') this.end(true);
  }

  private end(skipped: boolean) {
    if (this.stage === 'done') return;
    this.go('done');
    this.active = false;
    this.d.voice.stop();
    this.d.cine?.cancelBeat();
    this.d.sound?.cineStop(skipped ? 0.4 : 3);
    this.d.scene.remove(this.group);
    this.kludde?.dispose();
    this.d.player.lock = 0;
    this.d.player.dragon.root.visible = true;
    this.d.ui.classList.remove('prologue');
    this.cine.remove();
    this.card.remove();
    if (skipped) {
      this.fade.style.transitionDuration = '0s';
      this.fade.style.opacity = '1';
      void this.d.setSky('golden').then(() => {
        this.setFade(0, 1.5);
        setTimeout(() => this.fade.remove(), 1800);
      });
    } else this.fade.remove();
    this.d.finish(skipped);
  }
}
