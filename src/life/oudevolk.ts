// Het Oude Volk, the hidden sixth party (content in src/content/oudevolk.ts).
// This layer makes the rest of the game know them: the signs in the streets
// (a knot of reed on a shrine post, an offering on a well, a boy who counts),
// the moment you are found and they appear in your standing, what Heylwich
// teaches at each tier (the dragon's skills, what he is, the creatures'
// weaknesses, the safe paths, letting a beaten creature go), her basket, what
// people say, and what combat needs to know.
//
// Everything it remembers is a quest flag starting with "ov_" (an older save
// has none, and plays exactly as before):
//   ov_sign_<id>   a sign counted          ov_found    discovered
//   ov_spare       may let creatures go     ov_spared   how many let go
//   ov_paden       knows the safe paths     ov_zw_<type> knows its weakness
//   ov_nevel / ov_slag / ov_roep            the dragon's skills learned
//   ov_k1..ov_k4   pieces of what he is     ov_choice   'volk' | 'kerk' (the small bell)
//   ov_named       you named Heylwich to Pieter
//   ov_refused     she told you she will not teach the call
// And one flag for the long story's ledger (docs/design/story.md, section 3), for later chapters to read:
//   rekening_diest_klokje   'dof' (the small bell of Sint-Sulpitius bound with reed) | 'helder' (left clear)
//   Diest's own bells ring either way (flag bells_ring, set by the main quest as before).

import * as THREE from 'three';
import type { CombatLore } from '../combat/combat';
import { FACTIONS } from '../rpg/factions';
import { addEntries } from '../rpg/kroniek';
import type { Line, Choice } from '../rpg/types';
import { DRAGON_SKILLS, type DragonSkillId } from '../player/dragonskills';
import { TALISMANS } from '../content/diest_life';
import {
  OV_BARKS, OV_GOODS, OV_GREET, OV_GREET_COOL, OV_NOTICE, OV_PAGES, OV_PATH, OV_REACTIVE, OV_REP, OV_REP_DEEDS, OV_ROLES, OV_SIGN_AGAIN,
  OV_SIGN_COUNT, OV_SIGNS, OV_TALISMANS, OV_TEACH, OV_TOWN_VIEW, OV_WANNE,
} from '../content/oudevolk';
import type { LifeDeps } from './life';
import type { PropKit } from './props';
import type { Standing } from './standing';
import type { Ch, Spec } from './talk';
import type { SpotKind } from './types';
import { LinePicker } from './lines';

addEntries(OV_PAGES);
Object.assign(TALISMANS, OV_TALISMANS);

const C = (hex: string) => new THREE.Color(hex);
const REED = C('#a89a5c'), REED_GREEN = C('#6f7e40'), MILK = C('#efe9da'), BOWL = C('#7a5638'), STAKE = C('#4a3220');

/** Who belongs to them (for the role line under the name, once found). */
const MEMBERS = Object.keys(OV_ROLES);
/** Weakness, as a damage multiplier, once known. */
const WEAK: Record<string, number> = { broekhond: 1.33, dwaallicht: 1.33, kludde: 1.25 };
/** Signs needed before the old woman speaks to you. */
const SIGNS_NEEDED = 3;

interface SignSpot { id: string; key: string; kind: SpotKind; x: number; z: number; text: string }

export interface OudeVolkHost {
  /** say something in the note at the middle of the screen */
  note(kicker: string, text: string): void;
  /** put a pin on the map and the guide's pillar */
  point(x: number, z: number, label: string, secs?: number): void;
}

export class OudeVolk implements CombatLore {
  private signs: SignSpot[] = [];
  private pick = new LinePicker();
  private syncT = 0;

  constructor(private d: LifeDeps, private standing: Standing, private host: OudeVolkHost) {
    const q = d.quests;
    d.combat.lore = this;
    // her menu is written as you start to speak to her
    const conv = q.conversationFor.bind(q);
    q.conversationFor = (id: string) => {
      const start = conv(id);
      if (start === 'heyl_idle') this.buildHeylwich();
      return start;
    };
    // a new tier with them means something to learn
    standing.onChange = (f, before, after) => {
      if (f !== 'oudevolk' || after <= before || !this.found) return;
      if (this.teachable() || this.knowable()) d.toast('THE OUDE VOLK · Heylwich has something new to tell you');
    };
    this.buildHeylwich();
    this.sync();
  }

  get found() {
    return !!this.d.quests.s.flags.ov_found;
  }

  private flag(id: string) {
    return this.d.quests.s.flags[id];
  }

  private tier() {
    return this.standing.level('oudevolk');
  }

  // ================================================================ the people: who they are, as far as you know
  /** Names, roles, shop and quest marks follow what you know (a midwife is a midwife until you know better). */
  sync() {
    const q = this.d.quests;
    for (const id of MEMBERS) {
      const n = q.npcs.get(id);
      if (!n) continue;
      n.role = this.found ? `${OV_ROLES[id]} · ${FACTIONS.oudevolk.name}` : OV_ROLES[id];
    }
    const h = q.npcs.get('heylwich');
    if (h) {
      h.shop = this.found && !this.flag('ov_named');
      h.offers = this.heylOffers();
    }
    const g = q.npcs.get('gooris');
    if (g) g.offers = this.found && q.test({ quest: 'ov_dof', state: 'done' }) ? ['ov_leuven'] : [];
  }

  /** The quest she has for you now (drives the "!" over her head): only ever the next one. */
  private heylOffers(): string[] {
    const q = this.d.quests;
    if (!this.found || this.flag('ov_named')) return [];
    if (!q.s.quests.ov_eik) return ['ov_eik'];
    if (q.test({ quest: 'ov_eik', state: 'done' }) && !q.s.quests.ov_broek) return ['ov_broek'];
    if (q.test({ quest: 'ov_broek', state: 'done' }) && !q.s.quests.ov_dof && this.flag('bells_ring')) return ['ov_dof'];
    return [];
  }

  update(dt: number) {
    this.syncT -= dt;
    if (this.syncT <= 0) {
      this.syncT = 0.5;
      this.sync();
    }
  }

  // ================================================================ the signs in the street
  /** Pick the shrines and wells that carry a sign, and put the reed and the milk on them. */
  init(k: PropKit, spots: { key: string; kind: SpotKind; x: number; z: number; wall: boolean }[]) {
    const col = this.d.world.collision;
    const used = new Set<string>();
    for (const s of OV_SIGNS) {
      let best: (typeof spots)[number] | null = null, bd = Infinity;
      for (const sp of spots) {
        if (sp.kind !== s.kind || used.has(sp.key)) continue;
        // a knot belongs on a post by the street, not in a niche in a wall
        const dist = Math.hypot(sp.x - s.near[0], sp.z - s.near[1]) + (s.kind === 'shrine' && sp.wall ? 160 : 0);
        if (dist < bd) { bd = dist; best = sp; }
      }
      if (!best) continue;
      used.add(best.key);
      this.signs.push({ id: s.id, key: best.key, kind: s.kind, x: best.x, z: best.z, text: s.text });
      const y = col.heightAt(best.x, best.z);
      k.at(best.x, y, best.z, 0);
      // (a shrine in a wall keeps its sign in the text only: its spot stands out in the street, not at the wall)
      if (s.kind === 'shrine' && !best.wall) knotOnPost(k, 1.05);
      else if (s.kind === 'well') offering(k);
    }
    // Gooris's knots: a stake with reed at each step of the safe path
    for (const [x, z] of OV_PATH) {
      k.at(x, col.heightAt(x, z), z, 0.3);
      k.box(0.08, 1.3, 0.08, STAKE, 0, 0.65, 0);
      knotOnPost(k, 1.0, 0.05);
    }
  }

  /** A street spot was used: is it one of ours? Then this is what you see. */
  spot(key: string): { kicker: string; text: string } | null {
    const s = this.signs.find((x) => x.key === key);
    if (!s) return null;
    return this.countSign(s.id, s.text);
  }

  private countSign(id: string, text: string): { kicker: string; text: string } {
    const q = this.d.quests, f = q.s.flags;
    if (f[`ov_sign_${id}`]) return { kicker: 'A SIGN', text: `${text} ${OV_SIGN_AGAIN[id.startsWith('melk') ? 1 : 0]}` };
    f[`ov_sign_${id}`] = true;
    const n = this.signCount();
    if (this.found) return { kicker: 'A SIGN', text };
    if (n === 1) q.start('ov_tekens');
    const more = OV_SIGN_COUNT[Math.min(n, SIGNS_NEEDED) - 1];
    if (n >= SIGNS_NEEDED && q.test({ quest: 'ov_tekens', state: 'active', stage: 'signs' })) {
      q.apply([{ done: ['ov_tekens', 'signs'] }]);
      const h = q.npcPos.get('heylwich');
      if (h) this.host.point(h[0], h[1], 'An old woman', 600);
    } else if (n < SIGNS_NEEDED) this.d.toast(`A SIGN · ${n} of ${SIGNS_NEEDED}`);
    q.save();
    return { kicker: n >= SIGNS_NEEDED ? 'THE THIRD SIGN' : 'A SIGN', text: `${text} ${more}` };
  }

  signCount() {
    const f = this.d.quests.s.flags;
    return [...OV_SIGNS.map((s) => s.id), 'stenen'].filter((id) => f[`ov_sign_${id}`]).length;
  }

  /** Where the signs are (for tests and the map once found). */
  signSpots() {
    return this.signs.map((s) => ({ id: s.id, key: s.key, kind: s.kind, x: s.x, z: s.z }));
  }

  // ================================================================ dialogue hooks ({call: 'ov:...'})
  call(id: string): boolean {
    if (!id.startsWith('ov:')) return false;
    const q = this.d.quests, f = q.s.flags;
    const [, what, arg] = id.split(':');
    if (what === 'sign') {
      const r = this.countSign(arg, '');
      if (r.text.trim()) this.host.note(r.kicker, r.text.trim());
    } else if (what === 'found') {
      // you know them now: they appear in your standing, in the Kroniek, on your map
      this.d.kroniek.unlock('tijd:oudevolk');
      this.d.kroniek.unlock('mens:heylwich');
      this.sync();
      this.d.hud.announce('THE OUDE VOLK', 'A sixth party', 'No guild and no church: ordinary people who still do what their grandparents did. Your standing with them now shows too.');
      this.d.sound.chime(false);
    } else if (what === 'learn' && arg === 'spare') {
      this.d.kroniek.unlock('tijd:ontzien');
      this.d.kroniek.unlock('tijd:eik');
    } else if (what === 'know') {
      f[`ov_k${arg}`] = true;
      this.d.kroniek.unlock(`wezen:waker${arg}`);
    } else if (what === 'weak') {
      f[`ov_zw_${arg}`] = true;
      this.d.kroniek.unlock(`wezen:zwakte_${arg}`);
    } else if (what === 'broek') {
      f.ov_paden = true;
      for (const t of ['broekhond', 'dwaallicht']) {
        f[`ov_zw_${t}`] = true;
        this.d.kroniek.unlock(`wezen:zwakte_${t}`);
      }
      this.d.kroniek.unlock('tijd:paden');
    } else if (what === 'teach') {
      const s = arg as DragonSkillId;
      f[`ov_${s}`] = true;
      const def = DRAGON_SKILLS[s];
      this.d.hud.announce('THE DRAGON LEARNS', def.name, `${def.text} Key: ${def.key === 'RMB' ? 'right mouse' : def.key}.`);
      this.d.sound.chime(false);
    } else if (what === 'talisman') {
      const id2 = arg === 'knoop' ? 'ov_goossens' : arg;
      const t = TALISMANS[id2];
      if (t) q.giveGear({ uid: `ov${Date.now().toString(36)}`, base: 'pelgrimsinsigne', name: t.name, slot: 'talisman', rarity: t.rarity, ilvl: Math.max(1, q.s.hero.level), mods: { ...t.mods }, text: t.text });
    } else if (what === 'page') {
      this.d.kroniek.unlock(`tijd:${arg}`);
    }
    this.buildHeylwich();
    this.sync();
    q.save();
    return true;
  }

  // ================================================================ Heylwich's menu
  /** A skill she can teach now (the next one, by tier); 'refused' when she will not. */
  private teachable(): DragonSkillId | 'refused' | null {
    const f = this.d.quests.s.flags, t = this.tier();
    for (const s of ['nevel', 'slag', 'roep'] as DragonSkillId[]) {
      if (f[`ov_${s}`]) continue;
      if (t < DRAGON_SKILLS[s].tier) return null;
      if (s === 'roep' && f.ov_choice !== 'volk') return f.ov_choice === 'kerk' && !f.ov_refused ? 'refused' : null;
      return s;
    }
    return null;
  }

  /** The next piece of what he is, when your tier allows it (1..4), and the Kludde's weakness at Gezien. */
  private knowable(): string[] {
    const f = this.d.quests.s.flags, t = this.tier(), q = this.d.quests;
    const out: string[] = [];
    for (let i = 1; i <= 4; i++) {
      if (f[`ov_k${i}`]) continue;
      if (t >= i) out.push(`heyl_k${i}a`);
      break;
    }
    if (t >= 2 && !f.ov_zw_kludde) out.push('heyl_zw_kludde');
    if ((q.s.inv.humming_statuette ?? 0) > 0 && !f.ov_beeld) out.push('heyl_beeld');
    return out;
  }

  /** Write heyl_idle, heyl_tell and heyl_teach for what you know and your standing now (at most five choices each). */
  buildHeylwich() {
    const q = this.d.quests, f = q.s.flags, D = q.content.dialogue;
    const t = this.tier();
    const greet = f.ov_choice === 'kerk' ? this.pick.pick(OV_GREET_COOL) : this.pick.pick(OV_GREET[t]);
    const back: Choice['effects'] = [{ call: 'ov:menu' }];
    const choices: Choice[] = [];
    // the next piece of work
    const work = this.heylOffers()[0];
    if (work === 'ov_eik') choices.push({ text: "You said you knew more.", next: 'heyl_eik' });
    else if (work === 'ov_broek') choices.push({ text: 'What else must I learn?', next: 'heyl_broek' });
    else if (work === 'ov_dof') choices.push({ text: 'The bells are ringing again.', next: 'heyl_dof' });
    else if (q.test({ quest: 'ov_broek', state: 'done' }) && !q.s.quests.ov_dof && !f.bells_ring) choices.push({ text: 'And now what?', next: 'heyl_wait' });
    // what she knows
    const know = this.knowable();
    const ASK: Record<string, string> = {
      heyl_k1a: 'What is my dragon?', heyl_k2a: 'Why did he wake?', heyl_k3a: 'Why did he choose me?', heyl_k4a: 'Where is my sister?',
      heyl_zw_kludde: 'How do I beat the Kludde?', heyl_beeld: "Truyken's little figure is humming.",
    };
    const tell: Choice[] = know.slice(0, 4).map((id) => ({ text: ASK[id], next: id }));
    tell.push({ text: 'Something else.', next: 'heyl_idle', effects: back });
    D.heyl_tell = { who: 'heylwich', text: know.length ? 'Ask, then. What I tell you, I tell you once.' : 'I will tell you more when the folk know you better.', choices: tell };
    choices.push({ text: 'Tell me something.', next: 'heyl_tell' });
    // what she teaches
    const s = this.teachable();
    if (s) {
      const text = s === 'refused' ? OV_TEACH.refused : OV_TEACH[s];
      D.heyl_teach = { who: 'heylwich', text, effects: s === 'refused' ? [{ set: 'ov_refused' }, { call: 'ov:menu' }] : [{ call: `ov:teach:${s}` }], next: 'heyl_idle' };
      choices.push({ text: q.fill('Teach {dragon} something new.'), next: 'heyl_teach', effects: back });
    } else D.heyl_teach = { who: 'heylwich', text: OV_TEACH.later };
    if (!f.ov_named) choices.push({ text: "What's in your basket?", effects: [{ open: 'shop' }] });
    choices.push({ text: 'Goodbye, Heylwich.' });
    D.heyl_idle = { who: 'heylwich', text: `${greet} ${f.ov_choice === 'kerk' ? '' : this.pick.pick(['What can I do for you?', 'Say what you came to say.', 'Sit down, if you like.'])}`.trim(), choices: choices.slice(0, 5) };
    // the pieces of knowledge go back to her menu when done
    for (const id of ['heyl_k1b', 'heyl_k2d', 'heyl_k3b', 'heyl_k4b', 'heyl_zw_kludde', 'heyl_beeld']) {
      const l = D[id] as Line | undefined;
      if (l && !l.next) l.next = 'heyl_idle_back';
    }
    D.heyl_idle_back = { who: 'heylwich', text: 'There. Now you know that too.', choices: [{ text: 'Something else.', next: 'heyl_idle', effects: back }, { text: 'Goodbye, Heylwich.' }] };
  }

  /** Her basket: priced and opened by your standing with the Oude Volk. */
  goods() {
    return OV_GOODS;
  }

  // ================================================================ what people say
  /** Conditions for the lines that react to them (life.ts cond()). undefined: not ours. */
  cond(c: string): boolean | undefined {
    const f = this.d.quests.s.flags, st = this.standing;
    switch (c) {
      case 'ov_rumour': return !this.found;
      case 'ov_found': return this.found;
      case 'ov_high': return this.found && st.level('oudevolk') >= 2;
      case 'kerk_high_ov': return this.found && st.level('kerk') >= 2;
      case 'ov_spared': return Number(f.ov_spared ?? 0) > 0;
      case 'ov_choice_volk': return f.ov_choice === 'volk';
      case 'ov_choice_kerk': return f.ov_choice === 'kerk';
      case 'ov_named': return !!f.ov_named;
    }
    return undefined;
  }

  reactive() {
    return OV_REACTIVE;
  }
  townView() {
    return OV_TOWN_VIEW;
  }
  repLine() {
    return this.found ? OV_REP[this.tier()] : null;
  }
  repDeeds() {
    return OV_REP_DEEDS;
  }
  /** A line for the crowd to call out, if one holds (crowd.ts). */
  barks() {
    return OV_BARKS.filter((b) => this.cond(b.if)).map((b) => b.t);
  }
  /** The kapittel's notice on the board, once there is something to warn about. */
  notice() {
    return this.signCount() > 0 || this.found ? OV_NOTICE : null;
  }

  /** Wanne, the herb woman on the market: a question about them, once there is something to ask. */
  serviceChoices(serviceId: string, after: (text: string) => Spec): Ch[] {
    if (serviceId !== 'kruiden') return [];
    if (this.found) return [{ text: OV_WANNE.askAfter, reply: () => after(OV_WANNE.after) }];
    if (this.signCount() > 0) {
      return [{ text: OV_WANNE.askBefore, reply: () => {
        const h = this.d.quests.npcPos.get('heylwich');
        if (h) this.host.point(h[0], h[1], 'The midwife', 300);
        return after(OV_WANNE.before);
      } }];
    }
    return [];
  }

  /** Map pins: the safe path, once Gooris showed it. */
  mapMarks() {
    if (!this.flag('ov_paden')) return [];
    return OV_PATH.map(([x, z]) => ({ x, z, kind: 'pin' as const, label: 'Firm ground' }));
  }

  // ================================================================ combat (CombatLore)
  weak(type: string) {
    return this.flag(`ov_zw_${type}`) ? WEAK[type] ?? 1 : 1;
  }

  aggro(type: string) {
    return type === 'broekhond' && this.flag('ov_paden') ? 0.45 : 1;
  }

  canSpare() {
    return !!this.flag('ov_spare');
  }

  spared(type: string) {
    const q = this.d.quests, f = q.s.flags;
    f.ov_spared = Number(f.ov_spared ?? 0) + 1;
    this.standing.add('oudevolk', 2, 'let go');
    if (type === 'broekhond' && q.test({ quest: 'ov_broek', state: 'active', stage: 'spaar' })) {
      const n = Number(f.ov_q3n ?? 0) + 1;
      f.ov_q3n = n;
      if (n >= 2) {
        f.ov_q3 = true;
        q.apply([{ done: ['ov_broek', 'spaar'] }]);
      } else this.d.toast(`PATHS THROUGH THE BROEK · ${n} of 2 hounds let go`);
    }
    q.save();
  }

  has(id: DragonSkillId) {
    return !!this.flag(`ov_${id}`);
  }
}

/** Three strands of reed bound round a post, with the knot on top. */
function knotOnPost(k: PropKit, y: number, z = 0) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    k.cyl(0.012, 0.012, 0.55, i ? REED : REED_GREEN, Math.cos(a) * 0.085, y, z + Math.sin(a) * 0.085, 0.08 * Math.sin(a), -0.08 * Math.cos(a), 4);
  }
  k.ball(0.04, REED, 0, y + 0.3, z, 1.2);
  k.cyl(0.095, 0.095, 0.04, REED_GREEN, 0, y + 0.12, z, 0, 0, 8);
}

/** A bowl of milk with a crust in it, on the rim of a well. */
function offering(k: PropKit) {
  k.cyl(0.11, 0.07, 0.07, BOWL, 0.72, 0.79, 0, 0, 0, 8);
  k.cyl(0.095, 0.095, 0.01, MILK, 0.72, 0.82, 0, 0, 0, 8);
  k.box(0.07, 0.03, 0.04, C('#b88a4a'), 0.74, 0.835, 0.01);
  k.ball(0.035, REED_GREEN, 0.6, 0.79, 0.1, 1.3);
}
