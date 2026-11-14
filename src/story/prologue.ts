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
import type { TownsfolkKit } from '../rpg/townsfolk';
import { TYPES, makeBody, type Body } from '../combat/enemies';
import { Voice } from '../audio/voice';

export interface PrologueDeps {
  scene: THREE.Scene;
  ui: HTMLElement;
  player: Player;
  kit: TownsfolkKit | null;
  voice: Voice;
  name: string;
  dragon: string;
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
}

/** Every spoken line, by id: [speaker, text]. {name} and {dragon} are filled in. */
export const PROLOGUE_LINES: Record<string, [string, string]> = {
  pro_n1: ['', 'We waren te laat. Dat waren we altijd, Neelke en ik.'],
  pro_s1: ['Neelke', 'Ge loopt te rap. Mijn benen zijn korter dan de uwe.'],
  pro_n2: ['', 'Mijn zusje telde alles. Stappen. Sterren. De slagen van de klok.'],
  pro_s2: ['Neelke', 'Als we voor de laatste slag binnen zijn, heeft moeder niets gezien.'],
  pro_s3: ['Neelke', 'Zeven. Het is middernacht. Waar zijn de andere vijf?'],
  pro_n3: ['', 'Niemand in Diest had de klokken ooit horen zwijgen. Niemand wist wat ze tegenhielden.'],
  pro_s4: ['Neelke', 'Kijk. Lichtjes op het water.'],
  pro_n4: ['', 'Ik riep haar. Ze hoorde me niet meer.'],
  pro_s5: ['Neelke', '{name}!'],
  pro_n5: ['', 'Het water nam haar zonder geluid.'],
  pro_n6: ['', 'De oude mensen noemden hem de Kludde. Ik had altijd gedacht dat het een verhaaltje was.'],
  pro_n7: ['', 'De klokken hielden alles in slaap wat oud was. Het kwade. En het andere.'],
  pro_n8: ['', 'Hij rook naar riet en naar smeulend hout. Hij keek me aan alsof hij me kende.'],
  pro_n9: ['', 'Ik noemde hem {dragon}.'],
  pro_n10: ['', 'Ze zeggen: als alle klokken van Brabant weer samen luiden, slaapt al het oude weer in. De Kludde. En hij.'],
  pro_n11: ['', 'Maar eerst: Neelke. Wat het water neemt, geeft het soms terug.'],
};

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
  private skipDown = false;

  private sis: { root: THREE.Object3D; mixer: THREE.AnimationMixer; walk: THREE.AnimationAction; idle: THREE.AnimationAction; x: number; z: number; yaw: number } | null = null;
  private sisGoal: THREE.Vector3 | null = null;
  private kludde: Body | null = null;
  private kPos = new THREE.Vector3();
  private kYaw = 0;
  private wisps: Body[] = [];
  private tolls = 0;
  private tollT = 0;
  private fired = false;

  constructor(private d: PrologueDeps) {
    this.fade.className = 'pro-fade';
    this.card.className = 'pro-card';
    this.cine.className = 'cine';
    this.cine.innerHTML = '<div class="cine-obj"></div><div class="cine-sub"></div><div class="cine-skip">Backspace ingedrukt houden · overslaan</div>';
    this.sub = this.cine.querySelector('.cine-sub')!;
    this.obj = this.cine.querySelector('.cine-obj')!;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backspace' && this.active) this.skipDown = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Backspace') this.skipDown = false;
    });
  }

  private fill(s: string) {
    return s.replace('{name}', this.d.name).replace('{dragon}', this.d.dragon);
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

  async start() {
    const d = this.d, p = d.player;
    this.active = true;
    d.ui.classList.add('prologue');
    d.ui.append(this.fade, this.card, this.cine);
    this.fade.style.opacity = '1';
    this.card.innerHTML = '<div class="pc-kick">DE DEMER, BIJ DIEST</div><div class="pc-title">De nacht van zaterdag op zondag</div><div class="pc-sub">anno 1650</div>';
    this.card.classList.add('show');
    d.scene.add(this.group);
    // the hero on foot on the river bank, facing home (west); the dragon does not exist yet
    p.debugPlaceOnFoot(START.x, START.z, -Math.PI / 2);
    p.pos.set(WATER.x, -40, WATER.z);
    p.dragon.root.visible = false;
    // Neelke
    const folk = d.kit?.buildSpec({ body: 'girl', role: 'child', seed: 1650, wear: { hair_bun: 'h_blond', coif: null, bodice: 'woad', kerchief: null, skirt: 'russet', apron: 'linen', clogs: null } }) ?? null;
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
    }
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
    this.skipHeld = this.skipDown ? this.skipHeld + dt : 0;
    this.cine.classList.toggle('skipping', this.skipHeld > 0.1);
    if (this.skipHeld > 0.8 && this.stage !== 'done') return this.end(true);
    if (!this.allowMount) input.consume('interact');

    this.updateSubtitles(dt);
    this.updateSister(dt, hero);
    for (const w of this.wisps) {
      w.update(dt);
      w.root.position.y = 1.1 + Math.sin(performance.now() / 700 + w.root.position.x) * 0.25;
    }
    if (this.kludde) {
      this.kludde.root.position.copy(this.kPos);
      this.kludde.root.rotation.y = this.kYaw;
      this.kludde.update(dt);
    }

    switch (this.stage) {
      case 'card':
        if (t > 3.6) {
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
        if (t > 25) this.go('bells');
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
            w.root.position.set(x, 1.1, z);
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
        const there = this.sis ? Math.hypot(this.sis.x - BANK.x, this.sis.z - BANK.z) < 3 : t > 8;
        if ((there && t > 5) || t > 22) {
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
          this.prompt = p.distanceToDragon() < 7 ? `<kbd>E</kbd>Klim op ${d.dragon}` : null;
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
          void d.setSky('golden').then(() => {
            this.card.innerHTML = '<div class="pc-big">BELFORT</div><div class="pc-sub">Het hertogdom Brabant · anno 1650</div>';
            this.card.classList.add('show', 'title');
            this.setFade(0, 3);
            this.t = 3;
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
    const sp = this.sisGoal ? Math.min(2.6, dist * 2) : dist > 0.5 ? Math.min(7, dist * 2.2) : 0;
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

  private end(skipped: boolean) {
    if (this.stage === 'done') return;
    this.go('done');
    this.active = false;
    this.d.voice.stop();
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
