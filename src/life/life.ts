// Everyday life in town: the layer that makes sure there is always something
// to do within a few steps. It puts merchants and guides at stalls and doors,
// fills the streets with small things (house signs, doors to knock on, wells,
// shrines), lets you talk to anyone in the crowd, keeps the notice board, the
// town walk, standing with the four parties, buffs from food and blessings,
// and the inn (rest, tales, dice).
//
// It plugs into main.ts at a few points: init(), update(), nearest() /
// interact() / prompt() for the E key, mapMarks(), call() for dialogue hooks,
// and the standing bars in the character panel.

import * as THREE from 'three';
import type { Sound } from '../audio/sound';
import type { Combat } from '../combat/combat';
import { FACTIONS, type FactionId } from '../rpg/factions';
import type { Role } from '../rpg/folk';
import { addEntries, READABLES, TRUTH, type Kroniek } from '../rpg/kroniek';
import type { QuestEngine } from '../rpg/quests';
import type { Crowd, Walker } from '../rpg/crowd';
import type { TownsfolkKit } from '../rpg/townsfolk';
import type { QuestDef } from '../rpg/types';
import type { CharacterPanel } from '../ui/gamehud';
import type { Hud } from '../ui/hud';
import type { DialogueUI } from '../ui/rpgui';
import type { World } from '../world/world';
import {
  BOARD, DICE, GATES, GOODS, INN_TALES, MARIEKE, MARKET_CENTRE, NEWS, NPC_FACTION, PAGES, PILGRIM_TOPICS, QUEST_STANDING, SERVICES,
  SHRINE_LINES, SIGN_LINES, SIGN_NAMES, TOPICS, WALK, WELL_LINES, DOOR_LINES,
} from '../content/diest_life';
import {
  BLESS, BLESS_AGAIN, BYE, BYE_REPLY, CAMPS_NONE, CAMPS_WARN, DARES, FOOD, FOOD_GOODS, GOSSIP, MORE, NAMES, PILGRIM_TALES, PLACE_LINES, REACTIVE,
  REP, REP_DEEDS, ROLE_INFO, TALE_PAGES, TALES, TEND, TIER_GREET, TODO, TODO_OPEN, TOWN_VIEW, WHERE_FRAMES, WORK,
} from '../content/diest_talk';
import { Board } from './board';
import { direction, farness, fill, hash, LinePicker, seeded, today, type Pool } from './lines';
import { People, type Person } from './people';
import { board as boardProp, clutter, door as doorProp, PropKit, shrine as shrineProp, sign as signProp, stall, well as wellProp, weathercock } from './props';
import { Shops, talismanGear } from './shop';
import { FACTION_IDS, Standing } from './standing';
import { Talk, type Ch, type Spec } from './talk';
import type { Good, ServiceDef, SpotKind, StallKind } from './types';

addEntries(PAGES);

export interface LifeDeps {
  quests: QuestEngine;
  kroniek: Kroniek;
  world: World;
  crowd: Crowd | null;
  kit: TownsfolkKit | null;
  combat: Combat;
  hud: Hud;
  chars: CharacterPanel;
  dialogue: DialogueUI;
  sound: Sound;
  ui: HTMLElement;
  toast(text: string): void;
  /** main.ts's own clean-up when a panel closes (pointer lock) */
  closeUi(): void;
  /** 0 by day, 1 at night */
  night(): number;
  pixelRatio(): number;
  /** where the player is (on foot or on the dragon) */
  heroPos(): { x: number; z: number };
}

interface Service {
  def: ServiceDef;
  x: number;
  z: number;
  person: Person;
}

interface Spot {
  key: string;
  kind: SpotKind;
  /** where you stand to use it */
  x: number;
  z: number;
  name: string;
  wall: boolean;
  /** index into the marker points */
  i: number;
}

export type Near =
  | { kind: 'svc'; s: Service }
  | { kind: 'board' }
  | { kind: 'walker'; w: Walker }
  | { kind: 'spot'; spot: Spot }
  | { kind: 'cock'; i: number };

interface Pointer { x: number; z: number; label: string; until: number; since: number }

const BUFF_NAMES: Record<string, string> = { zegen: 'Gezegend', moed: 'Moed', uitgerust: 'Uitgerust', eten: 'Gegeten' };
const R_COVER = 37;
const FEMALE_ROLES = new Set<Role>(['peasantWoman', 'huik', 'beguine', 'oldWoman']);
const MALE_ROLES = new Set<Role>(['peasant', 'soldier', 'friar', 'oldMan']);

/**
 * Market day on the Grote Markt: stalls with no merchant to deal with, each with a seller who calls out
 * when you pass. They fill the square between the merchants you can trade with.
 */
const MARKET_DAY: { kind: StallKind; look: NonNullable<ServiceDef['look']>; calls: string[] }[] = [
  { kind: 'fish', look: { body: 'woman_stout', wear: { hair_bun: 'h_dark', coif: null, bodice: 'woad_dk', kerchief: null, skirt: 'grey', apron: 'linen', clogs: null } },
    calls: ['Paling uit de Demer, vanmorgen nog levend.', 'Haring uit Zeeland. Gezouten, niet gesmokkeld.', 'Ruik maar eens. Die vis is vers.'] },
  { kind: 'cheese', look: { body: 'man_stout', wear: { hair_crop: 'h_brown', cap_flat: 'umber', smock: 'linen', belt: null, breeches: 'brown', stockings: 'grey', clogs: null } },
    calls: ['Kaas uit de Kempen. Proeven kost niets.', 'Boter van gisteren. Morgen is ze van eergisteren.', 'Drie stuivers het pond. Voor jou ook.'] },
  { kind: 'veg', look: { body: 'woman_old', wear: { hair_bun: 'h_grey', coif: null, bodice: 'brown', kerchief: null, skirt: 'moss', apron: 'grey', clogs: null } },
    calls: ['Kolen en rapen. De soldaten hebben de rest al.', 'Ajuin uit het Hageland. Je weent van de ajuin, niet van mij.', 'Koop iets, kind. Je ziet bleek.'] },
  { kind: 'pots', look: { body: 'man', wear: { hair_long: 'h_chestnut', moustache: 'h_chestnut', hat_wide: 'brown', doublet: 'russet', collar_band: null, breeches: 'umber', stockings: 'grey', shoes: null } },
    calls: ['Kannen en kruiken. Gebakken, niet gebarsten.', 'Een pot voor de soep, een pot voor de nacht.', 'Wie iets laat vallen, betaalt het. Zo gaat dat.'] },
  { kind: 'poultry', look: { body: 'woman', wear: { hair_bun: 'h_blond', coif: null, bodice: 'madder', kerchief: null, skirt: 'woad', apron: 'linen', clogs: null } },
    calls: ['Een hen voor drie stuivers. Ze legt nog.', 'Eieren, vers. De hen staat ervoor in.', 'Pas op voor de haan. Hij is van de koster.'] },
  { kind: 'cloth', look: { body: 'man_old', wear: { hair_thin: 'h_white', beard_full: 'h_white', cap_flat: 'black', doublet: 'black', collar_band: null, breeches: 'black', stockings: 'black', shoes: null } },
    calls: ['Diests laken. Gemeten met de el van de halle.', 'Voel maar. Zo weven ze het in Leiden niet.', 'Laken voor een mantel. Of voor een lijkwade.'] },
  { kind: 'bread', look: { body: 'woman', wear: { hair_bun: 'h_brown', coif: null, bodice: 'ochre', kerchief: null, skirt: 'russet', apron: 'linen', shoes: null } },
    calls: ['Mik en roggebrood, nog warm van de oven.', 'Krentenbrood voor wie iets te vieren heeft.', 'Brood van vanmorgen. Het gewicht klopt.'] },
  { kind: 'herbs', look: { body: 'woman_stout', wear: { hair_bun: 'h_red', coif: null, bodice: 'green_dk', kerchief: null, skirt: 'brown', apron: 'grey', clogs: null } },
    calls: ['Salie, rozemarijn, alsem. Tegen alles behalve armoe.', 'Kamille om te slapen. Jij kunt ze gebruiken.', 'Wijnruit helpt tegen de pest, zegt mijn moeder.'] },
];

/** Golden weathercocks on towers and gates, taken in flight (x, z, height of the top). */
const COCKS: [string, number, number, number][] = [
  ['Sint-Sulpitius', -26, 30, 48], ['Lakenhalle', 92, 22, 24], ['Onze-Lieve-Vrouwekerk', 435, -249, 30], ['Sint-Catharinakerk', 701, -325, 26],
  ['Antwerpse Poort', -68, -701, 20], ['Schaffense Poort', 583, -634, 20], ['Koepoort', 737, 77, 20], ['Maastrichtse Poort', 345, 610, 20],
  ['Leuvense Poort', -117, 380, 20], ['Allerheiligenpoort', -324, 63, 20], ['Sint-Trudokerk', 1483, 1330, 26], ['Basiliek van Scherpenheuvel', -5062, 518, 52],
];
/** How each weathercock's place is named in the note (the names above are save keys, so they stay). */
const COCK_SHOWN: Record<string, string> = {
  'Sint-Sulpitius': 'de Sint-Sulpitiuskerk', Lakenhalle: 'de Lakenhalle', 'Onze-Lieve-Vrouwekerk': 'de Onze-Lieve-Vrouwekerk', 'Sint-Catharinakerk': 'de Sint-Catharinakerk',
  'Antwerpse Poort': 'de Schaluinpoort', 'Schaffense Poort': 'de Schaffensepoort', Koepoort: 'de oude Koepoort', 'Maastrichtse Poort': 'de Beverenpoort',
  'Leuvense Poort': 'de Putterstraatpoort', Allerheiligenpoort: 'de Allerheiligenpoort', 'Sint-Trudokerk': 'de Sint-Trudokerk', 'Basiliek van Scherpenheuvel': 'de basiliek van Scherpenheuvel',
};

export class Life {
  group = new THREE.Group();
  standing: Standing;
  board: Board;
  pointer: Pointer | null = null;
  private people: People;
  private shops: Shops;
  private talk: Talk;
  private pick = new LinePicker();
  private services: Service[] = [];
  private byId = new Map<string, Service>();
  private boardPos = { x: 0, z: 0 };
  private spots: Spot[] = [];
  private spotPoints: THREE.Points | null = null;
  private spotAlpha: THREE.BufferAttribute | null = null;
  private spotUniforms = { uPlayer: { value: new THREE.Vector3() }, uScale: { value: 30 }, uMap: { value: null as THREE.Texture | null } };
  private cocks: { g: THREE.Group; x: number; y: number; z: number; key: string; name: string }[] = [];
  /** the market-day sellers (no trade: they call out as you pass) */
  private hawkers: { x: number; z: number; y: number; calls: string[]; next: number; n: number }[] = [];
  private time = 0;
  private note: HTMLElement;
  private noteT = 0;
  private buffsEl: HTMLElement;
  private buffsT = 0;
  private race: { x: number; z: number; label: string; t: number; who: string } | null = null;
  private talkingTo: string | null = null;
  private raceShown = -1;
  /** '?' / '!' over people and the board, worked out twice a second (not every frame) */
  private marks = new Map<string, string | null>();
  private marksT = 0;
  private readonly markOf = (id: string) => this.marks.get(id) ?? null;
  private walker: Walker | null = null;
  /** street samples inside the walls (for placement and the density measure) */
  streetSamples: [number, number][] = [];

  constructor(private d: LifeDeps) {
    const q = d.quests;
    this.standing = new Standing(q.s, (t) => d.toast(t));
    this.talk = new Talk(q, d.dialogue, () => {
      this.talkingTo = null;
      if (this.walker) {
        this.walker.chat = 3; // linger a moment, then walk on
        this.walker = null;
      }
      d.closeUi();
    });
    this.people = new People(d.kit);
    this.group.add(this.people.group);
    this.board = new Board(q, q.content.camps);
    this.shops = new Shops({
      q, standing: this.standing,
      use: (g, seller) => this.useGood(g, seller),
      spent: (g) => this.spentGood(g),
      coins: () => d.sound.coins(),
    });
    this.note = document.createElement('div');
    this.note.className = 'lifenote';
    this.buffsEl = document.createElement('div');
    this.buffsEl.className = 'lifebuffs';
    d.ui.append(this.note, this.buffsEl);
    // food that goes in your bag (eaten by itself in a fight)
    for (const list of [...Object.values(GOODS), FOOD_GOODS as unknown as Good[]])
      for (const g of list) if ('regen' in g.use) q.addItem({ id: g.id, name: g.name, text: g.text });
    q.addQuest(walkQuest());
    // every named person belongs to a party: say so under their name
    for (const [id, f] of Object.entries(NPC_FACTION)) {
      const n = q.npcs.get(id);
      if (n && !n.role.includes(' · ')) n.role = `${n.role} · ${FACTIONS[f].name}`;
    }
  }

  // ================================================================ building the town
  init() {
    const col = this.d.world.collision;
    const k = new PropKit();
    const open = (x: number, z: number, r: number, max = 14): [number, number] | null => {
      for (let rr = 0; rr <= max; rr += 0.75)
        for (let a = 0; a < Math.PI * 2; a += rr < 1 ? 7 : 0.5 / Math.max(1, rr * 0.25)) {
          const tx = x + Math.cos(a) * rr, tz = z + Math.sin(a) * rr;
          if (col.heightAround(tx, tz, r) < 0.08) return [tx, tz];
        }
      return null;
    };
    for (const def of SERVICES) {
      const isStall = def.stall !== 'door';
      const at = (isStall && open(def.at[0], def.at[1], 2.1, 10)) || open(def.at[0], def.at[1], 1.0, 30) || def.at;
      let [x, z] = at;
      let yaw = def.facing ?? 0;
      const wall = this.wallNear(x, z, 7);
      if (def.facing === undefined) {
        if (def.market || isStall) yaw = Math.atan2(MARKET_CENTRE[0] - x, MARKET_CENTRE[1] - z);
        if (!def.market && wall) yaw = Math.atan2(wall.nx, wall.nz);
        if (def.gate) {
          const g = this.d.world.data.walls?.gates?.[def.gate];
          if (g) yaw = Math.atan2(g[0] - x, g[1] - z) + Math.PI / 2;
        }
      }
      if (def.market && def.id !== 'omroeper') yaw = Math.atan2(MARKET_CENTRE[0] - x, MARKET_CENTRE[1] - z);
      const y = col.heightAt(x, z);
      // the stall, with the seller behind the table; a door in the nearest wall, with the person before it
      let px = x, pz = z;
      if (def.stall === 'door') {
        if (wall && wall.d < 5) {
          k.at(wall.x, y, wall.z, Math.atan2(wall.nx, wall.nz));
          doorProp(k);
          px = wall.x + wall.nx * 1.3;
          pz = wall.z + wall.nz * 1.3;
          if (def.facing === undefined && !def.gate) yaw = Math.atan2(wall.nx, wall.nz);
        }
      } else {
        k.at(x, y, z, yaw);
        stall(k, def.stall, hash(def.id) % 1000);
        const back = def.stall === 'crier' ? -0.7 : def.stall === 'beer' ? -0.4 : 1.25;
        const side = def.stall === 'beer' ? 1.3 : 0;
        px = x - Math.sin(yaw) * back + Math.cos(yaw) * side;
        pz = z - Math.cos(yaw) * back - Math.sin(yaw) * side;
        if (def.stall === 'beer' && wall && wall.d < 6) {
          k.at(wall.x, y, wall.z, Math.atan2(wall.nx, wall.nz));
          doorProp(k, new THREE.Color('#2e4a2a'));
        }
      }
      const person = this.people.add(def, px, col.heightAt(px, pz), pz, yaw);
      const s: Service = { def, x: px, z: pz, person };
      this.services.push(s);
      this.byId.set(def.id, s);
      this.talk.speaker(def.id, def.name, `${def.role} · ${FACTIONS[def.faction].name}`, [px, pz]);
      this.d.quests.npcPos.set(def.id, [px, pz]);
    }
    // the notice board, near the crier
    {
      const [x, z] = open(BOARD.at[0], BOARD.at[1], 1.6, 12) ?? BOARD.at;
      const yaw = Math.atan2(MARKET_CENTRE[0] - x, MARKET_CENTRE[1] - z);
      k.at(x, col.heightAt(x, z), z, yaw);
      boardProp(k);
      this.boardPos = { x: x + Math.sin(yaw) * 0.6, z: z + Math.cos(yaw) * 0.6 };
      this.people.addSign(BOARD.id, BOARD.glyph, x, col.heightAt(x, z) + 3.1, z);
      this.talk.speaker(BOARD.id, BOARD.name, 'op de Grote Markt', [x, z]);
      this.d.quests.npcPos.set(BOARD.id, [x, z]);
    }
    this.placeMarket(k);
    this.placeSpots(k);
    const mesh = k.build();
    if (mesh) this.group.add(mesh);
    // weathercocks on the towers
    for (const [name, x, z, h] of COCKS) {
      const g = weathercock();
      g.position.set(x, h, z);
      g.scale.setScalar(1.6);
      const key = `haan:${name}`;
      g.visible = !this.d.quests.s.life.cocks.includes(key);
      this.group.add(g);
      this.cocks.push({ g, x, y: h + 1.5, z, key, name });
    }
  }

  /**
   * Market day: fill the open square around the merchants with more stalls (each with a seller), and with
   * barrels, crates, sacks and a handcart between them. Deterministic, on open ground only, and clear of
   * everything you can talk to or read.
   */
  private placeMarket(k: PropKit) {
    const col = this.d.world.collision;
    const taken: [number, number, number][] = this.fixedPoints().map(([x, z]) => [x, z, 5.5]);
    const free = (x: number, z: number, r: number) => taken.every(([tx, tz, tr]) => Math.hypot(tx - x, tz - z) > Math.max(r, tr));
    const cands: [number, number, number][] = [];
    for (let gx = -48; gx <= 48; gx += 3)
      for (let gz = -48; gz <= 48; gz += 3) {
        const x = MARKET_CENTRE[0] + gx, z = MARKET_CENTRE[1] + gz, d = Math.hypot(gx, gz);
        if (d < 9 || d > 48 || !this.d.world.inTown(x, z)) continue;
        cands.push([x, z, d + (hash(`${gx},${gz}`) % 100) / 25]);
      }
    cands.sort((a, b) => a[2] - b[2]);
    let n = 0;
    for (const [x, z] of cands) {
      if (n >= MARKET_DAY.length) break;
      if (col.heightAround(x, z, 2.6) > 0.08 || !free(x, z, 7.5)) continue;
      const m = MARKET_DAY[n++];
      const yaw = Math.atan2(MARKET_CENTRE[0] - x, MARKET_CENTRE[1] - z) + ((hash(m.kind) % 40) - 20) / 100;
      const y = col.heightAt(x, z);
      k.at(x, y, z, yaw);
      stall(k, m.kind, hash(m.kind) % 1000);
      const px = x - Math.sin(yaw) * 1.25, pz = z - Math.cos(yaw) * 1.25;
      this.people.add({ id: `markt_${m.kind}`, glyph: '', look: m.look }, px, col.heightAt(px, pz), pz, yaw);
      this.hawkers.push({ x: px, z: pz, y: col.heightAt(px, pz), calls: m.calls, next: 0, n: hash(m.kind) % m.calls.length });
      taken.push([x, z, 7.5]);
      // something beside it: a barrel, a crate, sacks or a handcart
      const side = hash(`${m.kind}s`) % 2 ? 1 : -1, c = hash(`${m.kind}c`) % 4;
      const cx = x + Math.cos(yaw) * side * 2.4 + Math.sin(yaw) * 0.6, cz = z - Math.sin(yaw) * side * 2.4 + Math.cos(yaw) * 0.6;
      if (col.heightAround(cx, cz, 0.9) < 0.08) {
        k.at(cx, col.heightAt(cx, cz), cz, yaw + side * 0.4);
        clutter(k, c);
      }
    }
  }

  /** The nearest wall from (x, z) within `max` metres: where it is, and which way is out. */
  private wallNear(x: number, z: number, max: number) {
    const col = this.d.world.collision;
    let best: { x: number; z: number; nx: number; nz: number; d: number } | null = null;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const dx = Math.sin(a), dz = Math.cos(a);
      for (let r = 0.5; r <= max; r += 0.5) {
        if (col.heightAround(x + dx * r, z + dz * r, 0.12) > 1.5) {
          if (!best || r < best.d) best = { x: x + dx * (r - 0.3), z: z + dz * (r - 0.3), nx: -dx, nz: -dz, d: r };
          break;
        }
      }
    }
    return best;
  }

  /**
   * Something to do near every street: walk the crowd's streets inside the walls and, wherever
   * nothing (a merchant, a guide, a readable, a named person, the board, another spot) is close,
   * put a house sign, a door, a shrine or a well. Deterministic: the same town gives the same spots.
   */
  private placeSpots(k: PropKit) {
    const crowd = this.d.crowd;
    if (!crowd) return;
    const world = this.d.world, col = world.collision;
    const samples: { x: number; z: number; line: number; s: number }[] = [];
    crowd.streets().forEach((l, li) => {
      for (let s = 0; s <= l.len; s += 4) {
        const p = pointOn(l.p, l.seg, s);
        if (world.inTown(p[0], p[1])) samples.push({ x: p[0], z: p[1], line: li, s });
      }
    });
    this.streetSamples = samples.map((s) => [s.x, s.z]);
    // a grid of samples, 16 m cells
    const cell = 16;
    const grid = new Map<number, number[]>();
    const key = (x: number, z: number) => (Math.floor(x / cell) + 1000) * 4000 + Math.floor(z / cell) + 1000;
    samples.forEach((s, i) => {
      const kk = key(s.x, s.z);
      let l = grid.get(kk);
      if (!l) grid.set(kk, (l = []));
      l.push(i);
    });
    const covered = new Uint8Array(samples.length);
    const cover = (x: number, z: number, r = R_COVER) => {
      const c = Math.ceil(r / cell);
      const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
      for (let i = -c; i <= c; i++)
        for (let j = -c; j <= c; j++)
          for (const n of grid.get((cx + i + 1000) * 4000 + cz + j + 1000) ?? []) {
            const s = samples[n];
            if ((s.x - x) ** 2 + (s.z - z) ** 2 < r * r) covered[n] = 1;
          }
    };
    for (const p of this.fixedPoints()) cover(p[0], p[1]);
    const lines = crowd.streets();
    const wells: [number, number][] = [];
    let n = 0;
    for (let i = 0; i < samples.length && this.spots.length < 400; i++) {
      if (covered[i]) continue;
      const s = samples[i];
      const line = lines[s.line];
      // a little further along the street, so one spot covers the stretch ahead too
      let placed = false;
      for (const ahead of [22, 12, 4, 0, -8]) {
        const ss = Math.max(0, Math.min(line.len, s.s + ahead));
        const [x, z] = pointOn(line.p, line.seg, ss);
        if (!world.inTown(x, z)) continue;
        const h = hash(`${Math.round(x)},${Math.round(z)}`);
        const wall = this.wallNear(x, z, 6.5);
        const farWell = wells.every(([wx, wz]) => Math.hypot(wx - x, wz - z) > 110);
        let kind: SpotKind;
        if (!wall) kind = farWell && col.heightAround(x, z, 1.8) < 0.08 ? 'well' : 'shrine';
        else if (farWell && h % 9 === 0 && col.heightAround(x, z, 1.8) < 0.08) kind = 'well';
        else kind = h % 100 < 46 ? 'sign' : h % 100 < 80 ? 'door' : 'shrine';
        let ix = x, iz = z, onWall = false;
        const y = col.heightAt(x, z);
        if (wall && (kind === 'sign' || kind === 'door' || kind === 'shrine')) {
          ix = wall.x + wall.nx * 1.3;
          iz = wall.z + wall.nz * 1.3;
          if (col.heightAround(ix, iz, 0.4) > 0.1) continue;
          onWall = true;
          k.at(wall.x, y, wall.z, Math.atan2(wall.nx, wall.nz));
          if (kind === 'sign') signProp(k, ['#9a3226', '#41618a', '#c49a3a', '#56663e', '#6e2219', '#2c4260', '#b8862e'][h % 7]);
          else if (kind === 'door') doorProp(k, new THREE.Color(['#3e2a1a', '#2e3a2a', '#4a2a1e', '#2a2e3a'][h % 4]));
          else shrineProp(k, true);
        } else if (kind === 'well') {
          k.at(x, y, z, h % 6);
          wellProp(k);
          wells.push([x, z]);
        } else {
          // a shrine on a post at the side of the street
          if (col.heightAround(x, z, 0.6) > 0.08) continue;
          // its open niche looks along the street, at whoever comes walking
          const [x2, z2] = pointOn(line.p, line.seg, Math.min(line.len, ss + 1.5));
          const [x0, z0] = pointOn(line.p, line.seg, Math.max(0, ss - 1.5));
          k.at(x, y, z, Math.atan2(x2 - x0, z2 - z0) + (h % 2 ? Math.PI : 0));
          shrineProp(k, false);
        }
        const name = kind === 'sign' ? SIGN_NAMES[n % SIGN_NAMES.length] : '';
        this.spots.push({ key: `${kind}:${this.spots.length}`, kind, x: ix, z: iz, name, wall: onWall, i: this.spots.length });
        n++;
        cover(ix, iz);
        placed = true;
        break;
      }
      if (!placed) covered[i] = 1; // nowhere to put anything here: move on
    }
    this.buildSpotMarks();
  }

  /** Everything that already counts as something to do (for placing spots, and for the density measure). */
  fixedPoints(): [number, number][] {
    const pts: [number, number][] = [];
    for (const s of this.services) pts.push([s.x, s.z]);
    pts.push([this.boardPos.x, this.boardPos.z]);
    for (const r of READABLES) pts.push(r.at);
    for (const p of this.d.quests.npcPos.values()) pts.push(p);
    return pts;
  }

  /** Every interactable that is not a walker: fixed ones and spots. */
  allPoints(): [number, number][] {
    return [...this.fixedPoints(), ...this.spots.map((s) => [s.x, s.z] as [number, number])];
  }

  private buildSpotMarks() {
    const n = this.spots.length;
    if (!n) return;
    const pos = new Float32Array(n * 3), kind = new Float32Array(n), alpha = new Float32Array(n);
    const col = this.d.world.collision;
    const KI: Record<SpotKind, number> = { sign: 0, door: 1, well: 2, shrine: 3 };
    this.spots.forEach((s, i) => {
      pos[i * 3] = s.x;
      pos[i * 3 + 1] = col.heightAt(s.x, s.z) + (s.kind === 'well' ? 2.9 : 2.5);
      pos[i * 3 + 2] = s.z;
      kind[i] = KI[s.kind];
      alpha[i] = 1;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
    this.spotAlpha = new THREE.BufferAttribute(alpha, 1);
    g.setAttribute('aAlpha', this.spotAlpha);
    this.spotUniforms.uMap.value = spotAtlas();
    const mat = new THREE.ShaderMaterial({
      uniforms: this.spotUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `attribute float aKind; attribute float aAlpha; uniform vec3 uPlayer; uniform float uScale; varying float vKind; varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = distance(position.xz, uPlayer.xz);
          vAlpha = aAlpha * (1.0 - smoothstep(20.0, 32.0, d)) * smoothstep(1.8, 3.6, d);
          vKind = aKind;
          gl_PointSize = clamp(uScale * 9.0 / max(1.0, -mv.z), 15.0, 40.0);
        }`,
      fragmentShader: `uniform sampler2D uMap; varying float vKind; varying float vAlpha;
        void main() {
          if (vAlpha < 0.01) discard;
          vec2 pc = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
          vec2 uv = (pc + vec2(mod(vKind, 2.0), 1.0 - floor(vKind / 2.0))) * 0.5;
          vec4 c = texture2D(uMap, uv);
          gl_FragColor = vec4(c.rgb, c.a * vAlpha);
        }`,
    });
    this.spotPoints = new THREE.Points(g, mat);
    this.spotPoints.frustumCulled = false;
    this.spotPoints.renderOrder = 18;
    this.group.add(this.spotPoints);
    this.refreshSpotMarks();
  }

  /** Signs read once fade away; doors knocked on and shrines prayed at today dim. */
  private refreshSpotMarks() {
    if (!this.spotAlpha) return;
    const L = this.d.quests.s.life, day = today();
    for (const s of this.spots) {
      let a = 1;
      if (s.kind === 'sign' && L.spots.includes(s.key)) a = 0;
      else if ((s.kind === 'door' || s.kind === 'shrine') && L.spotDay[s.key] === day) a = 0.3;
      else if (s.kind === 'well') a = 0.7;
      this.spotAlpha.setX(s.i, a);
    }
    this.spotAlpha.needsUpdate = true;
  }

  /** Signs, marks and markers, hidden when the view is painted. */
  signs(): THREE.Object3D[] {
    return [...this.people.signs(), ...(this.spotPoints ? [this.spotPoints] : [])];
  }

  // ================================================================ per frame
  /** dt is the real frame time (people keep breathing while a panel is open); gameDt stops then. */
  update(dt: number, gameDt: number, px: number, pz: number, py: number, flying: boolean, hidden: boolean) {
    this.group.visible = !hidden;
    this.note.style.display = hidden ? 'none' : '';
    this.buffsEl.style.display = hidden ? 'none' : '';
    if (hidden) return;
    this.time += dt;
    this.pick.time += gameDt;
    const q = this.d.quests;
    this.marksT -= dt;
    if (this.marksT <= 0) {
      this.marksT = 0.5;
      for (const p of this.people.list) this.marks.set(p.def.id, this.markFor(p.def.id));
    }
    this.people.update(dt, px, pz, this.talkingTo, this.markOf);
    // market-day sellers call out to whoever passes close by (now and then, never over each other)
    for (const h of this.hawkers) {
      const d = Math.hypot(h.x - px, h.z - pz);
      if (d < 7 && d > 1.2 && this.time > h.next && !this.talk.open && py < h.y + 4) {
        h.next = this.time + 14 + (h.n % 3) * 4;
        for (const o of this.hawkers) o.next = Math.max(o.next, this.time + 3.5);
        this.d.combat.floaters.add(h.calls[h.n++ % h.calls.length], new THREE.Vector3(h.x, h.y + 2.2, h.z), 'bark', 3.4, 0.35);
      }
    }
    if (this.talk.open) this.d.crowd?.tickChat(dt);
    // markers in the street
    this.spotUniforms.uPlayer.value.set(px, 0, pz);
    this.spotUniforms.uScale.value = 30 * this.d.pixelRatio() * (window.innerHeight / 800);
    // buffs: count down, and do what they do
    const B = q.s.life.buffs;
    let mul = 1;
    for (const id in B) {
      if (id === 'etenRate') continue;
      B[id] -= gameDt;
      if (B[id] <= 0) {
        delete B[id];
        if (id === 'eten') delete B.etenRate;
        continue;
      }
      if (id === 'zegen') mul *= 0.85;
      if (id === 'moed') mul *= 0.9;
    }
    this.d.combat.dmgTakenMul = mul;
    const maxHp = q.sheet.derived().maxHp;
    let regen = 0;
    if (B.uitgerust) regen += 0.008;
    if (B.eten) regen += B.etenRate ?? 0.015;
    if (regen && q.s.hero.hp > 0) q.s.hero.hp = Math.min(maxHp, q.s.hero.hp + maxHp * regen * gameDt);
    // food in the bag is eaten by itself when a fight goes badly
    if (this.d.combat.inCombat && !B.eten && q.s.hero.hp > 0 && q.s.hero.hp < maxHp * 0.5) this.autoEat();
    this.buffsT -= dt;
    if (this.buffsT <= 0) {
      this.buffsT = 0.5;
      const chips = Object.entries(B).filter(([id]) => BUFF_NAMES[id]).map(([id, t]) => `<span class="lb-${id}">${BUFF_NAMES[id]} <b>${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}</b></span>`).join('');
      if (this.buffsEl.innerHTML !== chips) this.buffsEl.innerHTML = chips;
    }
    // someone pointed somewhere: until you are there, or it has been a while
    if (this.pointer && (this.time > this.pointer.until || Math.hypot(this.pointer.x - px, this.pointer.z - pz) < 9)) this.pointer = null;
    // a child's race
    if (this.race) {
      this.race.t -= gameDt;
      const left = Math.ceil(this.race.t);
      if (Math.hypot(this.race.x - px, this.race.z - pz) < 4) {
        const r = this.race;
        this.race = null;
        const secret = this.todoTarget(px, pz, true);
        const line = fill(this.pick.pick(DARES.win), secret ? { what: secret.label, dir: direction(secret.x - px, secret.z - pz) } : { what: 'de put op de markt', dir: 'daarginds' });
        this.showNote(`${r.who.toUpperCase()} · GEWONNEN`, line);
        q.addXp(15 + q.s.hero.level * 3);
        if (secret) this.point(secret.x, secret.z, secret.label);
        this.d.sound.chime(false);
      } else if (this.race.t <= 0) {
        this.showNote(`${this.race.who.toUpperCase()} · TE LAAT`, this.pick.pick(DARES.lose));
        this.race = null;
      } else if (left !== this.raceShown) {
        this.raceShown = left;
        this.showNote(`WEDLOOP · ${this.race.label.toUpperCase()}`, `Nog ${left} tellen`, true);
        this.noteT = 1.5;
      }
    }
    // a banner or a discovery card has the middle of the screen: wait
    this.note.style.visibility = this.d.hud.hold ? "hidden" : "";
    if (this.noteT > 0) {
      this.noteT -= dt;
      if (this.noteT <= 0) this.note.classList.remove('show');
    }
    // weathercocks: fly through them
    for (const c of this.cocks) {
      if (!c.g.visible) continue;
      c.g.rotation.y += dt * 0.6;
      if (flying && Math.abs(py - c.y) < 9 && Math.hypot(c.x - px, c.z - pz) < 9) this.takeCock(c);
    }
  }

  private markFor(id: string): string | null {
    if (id === BOARD.id) return this.board.open() ? '!' : null;
    if (this.board.wants(id)) return '?';
    if (this.d.quests.marker(id) === '?') return '?';
    if (id === 'omroeper' && !this.d.quests.s.quests.walk_diest) return '!';
    return null;
  }

  // ================================================================ E: what is in reach
  nearest(x: number, z: number): Near | null {
    let best: Near | null = null, bd = Infinity;
    for (const s of this.services) {
      const d = (s.x - x) ** 2 + (s.z - z) ** 2;
      const reach = s.def.stall === 'door' || s.def.stall === 'crier' ? 3.2 : 3.8;
      if (d < reach * reach && d < bd) { bd = d; best = { kind: 'svc', s }; }
    }
    if (best) return best;
    if ((this.boardPos.x - x) ** 2 + (this.boardPos.z - z) ** 2 < 3.2 * 3.2) return { kind: 'board' };
    const w = this.d.crowd?.nearestWalker(x, z, 2.6);
    if (w) return { kind: 'walker', w };
    for (const s of this.spots) {
      const d = (s.x - x) ** 2 + (s.z - z) ** 2;
      if (d < 2.6 * 2.6 && d < bd) { bd = d; best = { kind: 'spot', spot: s }; }
    }
    return best;
  }

  prompt(n: Near, key: string) {
    const k = `<kbd>${key}</kbd>`;
    if (n.kind === 'svc') return `${k}Spreek met ${n.s.def.name} · ${n.s.def.label.toLowerCase()}`;
    if (n.kind === 'board') return `${k}Lees het aanplakbord${this.board.open() ? ' · werk' : ''}`;
    if (n.kind === 'walker') {
      const p = this.persona(n.w);
      return `${k}Spreek ${p.article} ${p.label} aan`;
    }
    if (n.kind === 'cock') return '';
    const s = n.spot;
    if (s.kind === 'sign') return `${k}Bekijk het uithangbord`;
    if (s.kind === 'door') return `${k}Klop aan`;
    if (s.kind === 'well') return `${k}Drink uit de put`;
    return `${k}Bid bij het kapelletje`;
  }

  interact(n: Near) {
    if (n.kind === 'svc') this.talkService(n.s);
    else if (n.kind === 'board') this.talkBoard();
    else if (n.kind === 'walker') this.talkWalker(n.w);
    else if (n.kind === 'spot') this.useSpot(n.spot);
  }

  /** A `{call}` effect from the dialogue box (ours) or a quest (the town walk). */
  call(id: string) {
    if (this.talk.call(id)) return;
    const m = /^walk:(\d+)$/.exec(id);
    if (m) {
      const i = Number(m[1]);
      const stop = WALK[i];
      if (!stop) return;
      this.d.quests.s.life.walk = Math.max(this.d.quests.s.life.walk, i + 1);
      this.d.hud.announce(`STADSWANDELING · HALTE ${i + 1} VAN ${WALK.length}`, stop.title, stop.line);
      if (i === 0) this.d.kroniek.unlock('tijd:stadswandeling');
      this.d.sound.chime(false);
    }
  }

  /** A quest was finished: its people's parties remember. */
  completed(id: string, outcome?: string) {
    const rule = QUEST_STANDING[id];
    if (rule) {
      const list = Array.isArray(rule) ? rule : rule[outcome ?? ''] ?? [];
      for (const [f, n] of list) this.standing.add(f, n);
    }
    if (id.startsWith('job_')) {
      const j = this.board.job(id);
      const f = j ? this.factionOf(j.client) : null;
      if (f) this.standing.add(f, j!.template.kind === 'bounty' ? 5 : 4);
    }
    if (id === 'walk_diest') this.useGood(GOODS.drukker[0], 'omroeper');
  }

  /** Renown with a place moved: its party follows. */
  renown(town: string, n: number) {
    this.standing.renown(town, n);
  }

  /** You read something: it counts for a "read the notices" job. */
  onRead(entry: string) {
    const q = this.d.quests;
    for (const [id, st] of Object.entries(q.s.quests)) {
      if (!id.startsWith('job_') || st.status !== 'active' || st.stage !== 'read') continue;
      const tag = `${id}:${entry}`;
      if (!q.s.life.reads.includes(tag)) q.s.life.reads.push(tag);
      const n = q.s.life.reads.filter((r) => r.startsWith(`${id}:`)).length;
      const need = this.board.job(id)?.n ?? 3;
      this.d.toast(`OPDRACHT · ${Math.min(n, need)} van ${need} gelezen`);
      if (n >= need) q.apply([{ done: [id, 'read'] }]);
    }
  }

  // ================================================================ map, pointer
  mapMarks() {
    const out: { x: number; z: number; kind: 'svc' | 'pin'; label: string; glyph?: string }[] = [];
    if (this.d.hud.mapScale < 2) out.push({ x: MARKET_CENTRE[0], z: MARKET_CENTRE[1], kind: 'svc', label: 'Markt', glyph: '⚖' });
    for (const s of this.services) {
      if (s.def.market && this.d.hud.mapScale < 2) continue;
      out.push({ x: s.x, z: s.z, kind: 'svc', label: s.def.label, glyph: s.def.glyph });
    }
    if (this.d.hud.mapScale >= 2) out.push({ x: this.boardPos.x, z: this.boardPos.z, kind: 'svc', label: 'Aanplakbord', glyph: BOARD.glyph });
    const m = this.d.quests.npcPos.get(MARIEKE.id);
    if (m) out.push({ x: m[0], z: m[1], kind: 'svc', label: MARIEKE.label, glyph: MARIEKE.glyph });
    if (this.pointer) out.push({ x: this.pointer.x, z: this.pointer.z, kind: 'pin', label: this.pointer.label });
    return out;
  }

  /** Seconds since someone pointed the way (the guide gives it back to the tracked quest after a while). */
  get pointerAge() {
    return this.pointer ? this.time - this.pointer.since : Infinity;
  }

  /** Mark a place for a while (on the map, and with the guide's pillar). */
  point(x: number, z: number, label: string, secs = 150) {
    this.pointer = { x, z, label, until: this.time + secs, since: this.time };
  }

  // ================================================================ people in the street
  private persona(w: Walker) {
    const i = this.d.crowd?.indexOf(w) ?? 0;
    const r = seeded(i * 7717 + 3);
    const info = ROLE_INFO[w.role];
    // the role decides where it can (an old woman is a woman whatever body the crowd gave her); the body decides the rest
    const female = FEMALE_ROLES.has(w.role) ? true : MALE_ROLES.has(w.role) ? false : w.female;
    const label = info.label(female, i);
    let name: string;
    if (w.role === 'beguine') name = NAMES.beguine[Math.floor(r() * NAMES.beguine.length)];
    else if (w.role === 'friar') name = NAMES.friar[Math.floor(r() * NAMES.friar.length)];
    else if (w.role === 'child') name = (female ? NAMES.girl : NAMES.boy)[Math.floor(r() * 8)];
    else {
      const list = female ? NAMES.f : NAMES.m;
      name = list[Math.floor(r() * list.length)];
    }
    const article = label === 'meisje' ? 'het' : 'de';
    return { name, label, article, info };
  }

  private greetFor(f: FactionId) {
    return this.pick.pick((TIER_GREET[f] ?? TIER_GREET.gilden!)[this.standing.level(f)]);
  }

  private talkWalker(w: Walker) {
    const p = this.persona(w);
    const px = this.hero().x, pz = this.hero().z;
    this.d.crowd?.engage(w, 9999, px, pz);
    this.walker = w;
    this.talkingTo = 'life_walker';
    this.talk.speaker('life_walker', p.name, p.label);
    const f = p.info.faction;
    const role = w.role;
    const menu = (first: string): Spec => ({
      who: 'life_walker',
      text: first,
      choices: [
        { text: p.info.ask, reply: () => this.special(role, p.name) },
        { text: 'Waar ben ik?', reply: () => this.after(this.where(role)) },
        { text: 'Wat valt er hier te doen?', reply: () => this.after(this.todo()) },
        { text: 'Vertel eens iets.', reply: () => this.after(this.gossip(role)) },
        { text: this.pick.pick(BYE), close: () => this.d.toast(`${p.name.toUpperCase()} · ${this.pick.pick(BYE_REPLY)}`) },
      ],
    });
    this.menuBack = () => menu(this.pick.pick(['Wil je nog iets weten?', 'Ja, zeg het maar.', 'Wat wil je nog vragen?', 'Vraag maar.']));
    this.talk.start('life_walker', menu(this.quests().fill(this.greetFor(f))));
  }

  /** The way back to the menu after an answer. */
  private menuBack: () => Spec = () => ({ who: 'life_walker', text: '' });
  private after(text: string, who = 'life_walker'): Spec {
    return {
      who,
      text,
      choices: [
        { text: this.pick.pick(MORE), reply: () => this.menuBack() },
        { text: this.pick.pick(BYE), close: () => {} },
      ],
    };
  }

  private quests() {
    return this.d.quests;
  }

  private hero() {
    return this.d.heroPos();
  }

  /** "Waar ben ik?": the nearest place, in their own words; it counts for the Kroniek. */
  private where(role: Role): string {
    const { x, z } = this.hero();
    let best: (typeof this.d.world.discoveries)[number] | null = null, bd = Infinity;
    for (const d of this.d.world.discoveries) {
      if (d.key === 'Diest' || !PLACE_LINES[d.key]) continue;
      const dist = Math.hypot(d.x - x, d.z - z);
      if (dist < Math.max(160, d.r * 2.2) && dist < bd) { bd = dist; best = d; }
    }
    if (!best) best = this.d.world.discoveries.find((d) => d.key === 'Diest' && this.d.world.inTown(x, z)) ?? null;
    if (!best) return this.pick.pick(['Hier ben je nergens, vreemdeling, tussen twee dorpen in. Volg de weg maar.', 'Je bent ergens in het Demerdal. Meer weet ik ook niet.']);
    const frames = [...(WHERE_FRAMES[role] ?? []), ...WHERE_FRAMES.any];
    const line = this.pick.pick(PLACE_LINES[best.key]);
    const known = this.d.kroniek.has(`plaats:${best.key}`);
    if (!known) {
      this.d.kroniek.unlock(`plaats:${best.key}`);
      best.found = true;
      this.d.toast(`KRONIEK · ${best.title}`);
      this.d.quests.addXp(15);
    }
    const near = bd > 70 && best.key !== 'Diest' ? `Het ligt ${farness(bd)}, ${direction(best.x - x, best.z - z)}. ` : '';
    const place = best.title.replace(/^(De|Het) /, (m) => m.toLowerCase());
    const out = fill(this.pick.pick(frames), { place, line: near + line });
    return out[0].toUpperCase() + out.slice(1);
  }

  /** The nearest thing you have not done yet (or a "secret": an unread sign or an unvisited shrine). */
  private todoTarget(px: number, pz: number, secret = false): { kind: string; x: number; z: number; label: string } | null {
    const q = this.d.quests, L = q.s.life;
    const c: { kind: string; x: number; z: number; label: string; w: number }[] = [];
    if (!secret) {
      for (const r of READABLES) if (!this.d.kroniek.has(r.entry)) c.push({ kind: 'read', x: r.at[0], z: r.at[1], label: r.label, w: 1 });
      for (const s of this.services) if (!L.met.includes(s.def.id)) c.push({ kind: s.def.guide && s.def.guide !== 'inn' ? 'guide' : 'shop', x: s.x, z: s.z, label: `${s.def.name}, de ${s.def.role.split(',')[0]}`, w: 1 });
      if (this.board.open()) c.push({ kind: 'board', x: this.boardPos.x, z: this.boardPos.z, label: 'het aanplakbord', w: 0.9 });
      for (const m of this.d.combat.campMarks()) if (!m.cleared && m.level <= q.s.hero.level + 2) c.push({ kind: 'camp', x: m.x, z: m.z, label: m.name.toLowerCase(), w: 1.3 });
      for (const n of q.content.npcs) {
        const p = q.npcPos.get(n.id);
        if (p && q.marker(n.id) === '!') c.push({ kind: 'giver', x: p[0], z: p[1], label: n.name, w: 0.8 });
      }
      for (const d of this.d.world.discoveries) if (!d.found && d.key !== 'Diest') c.push({ kind: 'place', x: d.x, z: d.z, label: d.title, w: 1.2 });
    }
    for (const s of this.spots) {
      if (s.kind === 'sign' && !L.spots.includes(s.key)) c.push({ kind: 'spot', x: s.x, z: s.z, label: `een uithangbord, "${s.name}"`, w: secret ? 1 : 2.5 });
      if (s.kind === 'shrine' && !L.spots.includes(s.key)) c.push({ kind: 'spot', x: s.x, z: s.z, label: 'een kapelletje', w: secret ? 1 : 2.5 });
    }
    let best: (typeof c)[number] | null = null, bd = Infinity;
    for (const t of c) {
      const d = Math.hypot(t.x - px, t.z - pz);
      if (d < 7) continue;
      const score = d * t.w;
      if (score < bd) { bd = score; best = t; }
    }
    return best;
  }

  private todo(): string {
    const { x, z } = this.hero();
    const t = this.todoTarget(x, z);
    if (!t) return this.pick.pick(TODO.none);
    const vars = { what: t.label, dir: direction(t.x - x, t.z - z), far: farness(Math.hypot(t.x - x, t.z - z)) };
    let line = fill(this.pick.pick(TODO[t.kind] ?? TODO.place), vars);
    line = line[0].toUpperCase() + line.slice(1);
    this.point(t.x, t.z, t.label[0].toUpperCase() + t.label.slice(1));
    return `${this.pick.pick(TODO_OPEN)}${line}`;
  }

  /** Conditions for the lines that react to what you did. */
  private cond(c: string): boolean {
    const q = this.d.quests, f = q.s.flags, st = this.standing;
    const done = (id: string) => q.s.quests[id]?.status === 'done';
    switch (c) {
      case 'bells_silent': return !f.bells_ring;
      case 'bells_ring': return !!f.bells_ring;
      case 'seals_reported': case 'seals_begijnhof': case 'seals_warned': case 'toll_bribe': case 'toll_seized': case 'toll_paid': return !!f[c];
      case 'roelof_done': return done('side_roelof');
      case 'kludde_done': return done('main_kludde');
      case 'wisps_done': return done('side_wisps');
      case 'herbs_done': return done('side_herbs');
      case 'letter_done': return done('contract_letter');
      case 'walk_done': return done('walk_diest');
      case 'many_jobs': return Object.entries(q.s.quests).filter(([id, s]) => id.startsWith('job_') && s.status === 'done').length >= 3;
      case 'famous': return FACTION_IDS.reduce((a, x) => a + st.points(x), 0) >= 40;
      case 'high_level': return q.s.hero.level >= 5;
      case 'gilden_high': case 'kerk_high': case 'kroon_high': case 'vrije_high': return st.level(c.split('_')[0] as FactionId) >= 2;
      case 'gilden_low': return st.level('gilden') === 0;
      case 'gilden_mid': return st.level('gilden') === 1;
      case 'kroon_low_vrije_high': return st.level('kroon') === 0 && st.level('vrije') >= 2;
      case 'blessed': return !!q.s.life.buffs.zegen;
      case 'night': return this.d.night() > 0.5;
      case 'poor': return q.s.florins < 5;
    }
    return false;
  }

  private gossip(role: Role): string {
    const pool: Pool = [...GOSSIP[role], ...REACTIVE.map((r) => ({ t: r.t, when: () => this.cond(r.if), w: 2 }))];
    return this.d.quests.fill(this.pick.pick(pool));
  }

  // ---------------------------------------------------------------- what each kind of person offers
  private special(role: Role, name: string): Spec {
    const q = this.d.quests;
    const { x, z } = this.hero();
    const sp = ROLE_INFO[role].special;
    if (sp === 'work') {
      const jobs = this.board.open();
      const t = this.todoTarget(x, z);
      let what = jobs ? `Op het aanplakbord op de markt ${jobs === 1 ? 'hangt vandaag één briefje' : `hangen vandaag ${jobs} briefjes`}.` : 'Het aanplakbord is leeg vandaag, maar morgen hangt er weer iets.';
      const giver = q.nearestGiver(x, z);
      if (giver) {
        what += ` En ${giver.npc.name} zoekt hulp, ${direction(giver.x - x, giver.z - z)}.`;
        this.point(giver.x, giver.z, giver.npc.name);
      } else if (jobs) this.point(this.boardPos.x, this.boardPos.z, 'Het aanplakbord');
      else if (t) this.point(t.x, t.z, t.label);
      return this.after(fill(this.pick.pick(WORK), { what }));
    }
    if (sp === 'food') {
      return {
        who: 'life_walker', text: this.pick.pick(FOOD.open),
        choices: [
          { text: 'Laat eens zien.', close: () => this.openShop('marktvrouw', 'vrije', `${name.toUpperCase()}S MAND`, FOOD_GOODS as unknown as Good[]) },
          { text: 'Nee, dank je.', reply: () => this.menuBack() },
        ],
      };
    }
    if (sp === 'town') {
      const pool: Pool = TOWN_VIEW.map((v) => ({ t: v.t, when: v.if ? () => this.cond(v.if!) : undefined, w: v.if ? 2 : 1 }));
      return this.after(this.pick.pick(pool));
    }
    if (sp === 'rep') {
      const tiers = FACTION_IDS.map((f) => ({ f, t: this.standing.level(f) })).sort((a, b) => b.t - a.t);
      const deeds = REP_DEEDS.filter((r) => this.cond(r.if)).map((r) => r.t);
      const last = tiers[tiers.length - 1];
      const parts = [REP[tiers[0].f]?.[tiers[0].t], REP[last.f]?.[last.t]].filter(Boolean);
      if (deeds.length) parts.push(deeds[Math.floor(Math.random() * deeds.length)]);
      return this.after(`Wat ze zeggen? ${parts.join(' ')}`);
    }
    if (sp === 'tend') {
      const max = q.sheet.derived().maxHp;
      if (q.s.hero.hp >= max * 0.92) return this.after(this.pick.pick(TEND.fine));
      return {
        who: 'life_walker', text: this.pick.pick(TEND.offer),
        choices: [
          {
            text: 'Hier, twee stuivers.',
            reply: () => {
              if (q.s.florins < 2) return this.after(this.healBy(0.6, TEND.poor));
              q.s.florins -= 2;
              this.d.sound.coins();
              this.standing.spend('kerk', 2);
              this.onceToday('tend', () => this.standing.add('kerk', 1, 'een gift'));
              return this.after(this.healBy(1, TEND.done));
            },
          },
          { text: 'Ik heb niets bij me.', reply: () => this.after(this.healBy(0.5, TEND.poor)) },
          { text: 'Laat maar, het gaat wel.', reply: () => this.menuBack() },
        ],
      };
    }
    if (sp === 'camps') {
      const camps = this.d.combat.campMarks().filter((m) => !m.cleared).map((m) => ({ ...m, d: Math.hypot(m.x - x, m.z - z) })).sort((a, b) => a.d - b.d);
      const c = camps.find((m) => m.level <= q.s.hero.level + 2) ?? camps[0];
      if (!c) return this.after(this.pick.pick(CAMPS_NONE));
      this.point(c.x, c.z, `${c.name} · niveau ${c.level}`, 240);
      this.d.kroniek.unlock('tijd:garnizoen');
      return this.after(fill(this.pick.pick(CAMPS_WARN), { camp: c.name.toLowerCase(), dir: direction(c.x - x, c.z - z), far: farness(c.d) }).replace(/^./, (m) => m.toUpperCase()));
    }
    if (sp === 'bless') {
      if (q.s.life.buffs.zegen) return this.after(this.pick.pick(BLESS_AGAIN));
      this.addBuff('zegen', 300);
      this.onceToday('bless', () => this.standing.add('kerk', 1, 'gezegend'));
      this.d.sound.chime(false);
      return this.after(`${this.pick.pick(BLESS)} (Gezegend: je krijgt vijf minuten lang minder schade.)`);
    }
    if (sp === 'pilgrim') {
      const b = this.d.world.discoveries.find((d) => d.key === 'Basiliek van Onze-Lieve-Vrouw van Scherpenheuvel');
      if (b && !b.found) this.point(b.x, b.z, 'Scherpenheuvel', 600);
      this.d.kroniek.unlock('tijd:bedevaart');
      return this.after(this.pick.pick(PILGRIM_TALES));
    }
    if (sp === 'dare') {
      if (Math.random() < 0.55) {
        const t = this.raceTarget(x, z);
        if (t) {
          const n = Math.ceil(t.d / 4.6) + 4;
          const text = fill(this.pick.pick(DARES.race), { what: t.label, dir: direction(t.x - x, t.z - z), n: String(n) });
          return { who: 'life_walker', text, choices: [
            { text: 'Afgesproken!', close: () => this.startRace(t.x, t.z, t.label, n, name) },
            { text: 'Een andere keer.', reply: () => this.menuBack() },
          ] };
        }
      }
      const win = Math.random() < 0.5 ? 0 : 1;
      const guess = (i: number) => () => {
        if (i === win) {
          q.addXp(5 + q.s.hero.level);
          return this.after(this.pick.pick(DARES.guessWin));
        }
        return this.after(this.pick.pick(DARES.guessLose));
      };
      return { who: 'life_walker', text: this.pick.pick(DARES.guess), choices: [{ text: 'Links.', reply: guess(0) }, { text: 'Rechts.', reply: guess(1) }] };
    }
    // tale
    const said = this.pick.pick(TALES.map((x) => x.t));
    const i = TALES.findIndex((t) => t.t === said);
    const tale = TALES[Math.max(0, i)];
    const page = TALE_PAGES[Math.max(0, i)];
    if (page) this.d.kroniek.unlock(page);
    return this.after(`${tale.t} (${TRUTH[tale.truth].name})`);
  }

  private healBy(frac: number, lines: string[]) {
    const q = this.d.quests;
    const max = q.sheet.derived().maxHp;
    q.s.hero.hp = Math.min(max, q.s.hero.hp + max * frac);
    this.d.sound.chime(false);
    return this.pick.pick(lines);
  }

  private onceToday(id: string, fn: () => void) {
    const L = this.d.quests.s.life, day = today();
    if (L.spotDay[id] === day) return;
    L.spotDay[id] = day;
    fn();
  }

  private raceTarget(x: number, z: number) {
    const c: { x: number; z: number; label: string; d: number }[] = [];
    for (const s of this.spots) c.push({ x: s.x, z: s.z, label: s.kind === 'sign' ? `het bord van ${s.name}` : s.kind === 'well' ? 'de put' : s.kind === 'door' ? 'die deur daar' : 'het kapelletje', d: Math.hypot(s.x - x, s.z - z) });
    for (const s of this.services) c.push({ x: s.x, z: s.z, label: s.def.label.toLowerCase().replace(/^/, 'de '), d: Math.hypot(s.x - x, s.z - z) });
    const ok = c.filter((t) => t.d > 35 && t.d < 110);
    return ok.length ? ok[Math.floor(Math.random() * ok.length)] : null;
  }

  private startRace(x: number, z: number, label: string, secs: number, who: string) {
    this.race = { x, z, label, t: secs, who };
    this.point(x, z, label, secs + 2);
    this.d.sound.chime(false);
  }

  // ================================================================ merchants and guides
  private factionOf(id: string): FactionId | null {
    return this.byId.get(id)?.def.faction ?? (NPC_FACTION[id] as FactionId | undefined) ?? null;
  }

  private talkService(s: Service) {
    const def = s.def;
    const q = this.d.quests;
    const first = !q.s.life.met.includes(def.id);
    if (first) q.s.life.met.push(def.id);
    this.talkingTo = def.id;
    const greet = `${this.greetFor(def.faction)} ${this.pick.pick(def.greet)}`;
    const menu = (text: string): Spec => ({ who: def.id, text, choices: this.serviceChoices(s) });
    this.menuBack = () => menu(this.pick.pick(['Had je nog iets nodig?', 'Zeg het maar.', 'Wat kan ik nog voor je doen?']));
    this.talk.start(def.id, menu(q.fill(greet)));
    if (def.guide === 'gate') this.d.kroniek.unlock('tijd:poorten');
    if (def.guide === 'inn') this.d.kroniek.unlock('tijd:herberg');
    if (def.market) this.d.kroniek.unlock('tijd:markt');
  }

  /** Jobs first (a delivery to hand over, a premium to collect), then the trade, then talk. */
  private serviceChoices(s: Service): Ch[] {
    const def = s.def;
    const q = this.d.quests;
    const out: Ch[] = [];
    const want = this.board.wants(def.id);
    if (want) {
      const j = want.job;
      const isPick = j.template.kind === 'delivery' && want.stage === 'pick';
      const text = isPick ? `Ik kom ${j.def.stages[0].objectives[0].text.replace(/^Haal (.*) op bij .*$/, '$1')} halen.` : j.template.kind === 'bounty' ? 'Het werk is gedaan. De weg is weer vrij.' : j.template.kind === 'delivery' ? 'Hier is je bestelling.' : j.template.kind === 'read' ? 'Ik heb gelezen wat er aan de muren hangt.' : 'Ik heb je spullen gevonden.';
      out.push({
        text,
        reply: () => {
          if (isPick) {
            q.apply([{ give: j.item! }, { done: [j.id, 'pick'] }, { stage: [j.id, 'bring'] }]);
            return this.after(this.pick.pick(['Hier, wees er voorzichtig mee en eet het onderweg niet op.', 'Daar is het. Zeg dat het van mij komt.', 'Eindelijk komt er iemand. Hier, en haast je.']), def.id);
          }
          const eff: Parameters<QuestEngine['apply']>[0] = [];
          if (j.item) eff.push({ take: j.item, n: 99 });
          eff.push({ done: [j.id, want.objective] }, { complete: j.id });
          q.apply(eff);
          return this.after(j.template.thanks, def.id);
        },
      });
    }
    if (def.shop) out.push({ text: def.guide === 'inn' ? 'Wat schenk je?' : 'Laat je waren eens zien.', close: () => this.openShop(def.id, def.faction, `${def.name.toUpperCase()} · ${def.label.toUpperCase()}`, GOODS[def.shop!] ?? [], def.shopGreet) });
    if (def.guide === 'crier') {
      out.push({ text: 'Is er nieuws?', reply: () => this.after(this.news(), def.id) });
      out.push({ text: 'Wat is er te zien in Diest?', reply: () => this.after(this.sights(), def.id) });
      if (!q.s.quests.walk_diest) out.push({ text: 'Kun je me de stad laten zien?', reply: () => {
        q.start('walk_diest');
        return this.after('Ik kan hier niet weg, ik moet roepen. Maar ik zeg je waar je moet kijken: acht plekken, van de markt tot aan het Begijnhof. Bij elke plek vertel ik je iets. Nu ja, de stad vertelt het. Ik heb het alleen opgeschreven.', def.id);
      } });
      out.push({ text: 'Is er werk?', reply: () => {
        const n = this.board.open();
        this.point(this.boardPos.x, this.boardPos.z, 'Het aanplakbord', 90);
        return this.after(n ? `Kijk op het aanplakbord, hier naast me. Er ${n === 1 ? 'hangt vandaag één briefje' : `hangen vandaag ${n} briefjes`}. Wie kan lezen, kan iets verdienen.` : 'Alles van vandaag is al genomen. Morgen hang ik nieuwe briefjes op. Of iemand anders doet het, want ik kan niet zo goed plakken.', def.id);
      } });
    }
    if (def.guide === 'notary') out.push({ text: 'Ik wil je iets vragen…', reply: () => this.topics(def.id, TOPICS, 0) });
    if (def.guide === 'pilgrims') out.push({ text: 'Vertel me iets over deze plek…', reply: () => this.topics(def.id, PILGRIM_TOPICS, 0) });
    if (def.guide === 'gate' && def.gate) {
      const g = GATES[def.gate];
      out.push({ text: 'Waar gaat deze weg naartoe?', reply: () => this.after(g.road, def.id) });
      out.push({ text: 'Waar moet ik op letten?', reply: () => {
        if (g.mark) {
          const c = this.d.combat.campMarks().find((m) => this.d.quests.content.camps.find((cd) => cd.id === g.mark && cd.at[0] === m.x && cd.at[1] === m.z));
          if (c && !c.cleared) this.point(c.x, c.z, `${c.name} · niveau ${c.level}`, 240);
        }
        return this.after(g.watch + (g.mark ? ' Ik duid het aan op je kaart.' : ''), def.id);
      } });
      out.push({ text: 'Hoe gaat het hier aan de poort?', reply: () => this.after(g.lore, def.id) });
    }
    if (def.guide === 'inn') {
      out.push({ text: 'Is er een verteller vanavond?', reply: () => this.after(this.innTale(), def.id) });
      out.push({ text: 'Zullen we een spelletje dobbelen?', reply: () => this.dice(def.id) });
    }
    if (!def.guide || def.guide === 'gate') out.push({ text: 'Wat hoor je zoal?', reply: () => this.after(this.serviceGossip(def.faction), def.id) });
    out.push({ text: this.pick.pick(BYE), close: () => {} });
    return out.slice(0, 6);
  }

  private serviceGossip(f: FactionId) {
    const role: Role = f === 'gilden' ? 'burgher' : f === 'kerk' ? 'beguine' : f === 'kroon' ? 'soldier' : 'peasantWoman';
    return this.gossip(role);
  }

  /** A guide's list of topics, five at a time; what you have asked is marked. */
  private topics(who: string, list: typeof TOPICS, page: number): Spec {
    const L = this.d.quests.s.life;
    const order = [...list].sort((a, b) => Number(L.topics.includes(a.id)) - Number(L.topics.includes(b.id)));
    const per = 5;
    const shown = order.slice(page * per, page * per + per);
    const choices: Ch[] = shown.map((t) => ({
      text: `${t.ask}${L.topics.includes(t.id) ? ' (gehoord)' : ''}`,
      reply: () => {
        if (!L.topics.includes(t.id)) L.topics.push(t.id);
        this.d.kroniek.unlock(t.page);
        const label = t.truth === 'geschiedenis' ? '' : ` (${TRUTH[t.truth].name})`;
        return {
          who, text: t.answer + label,
          choices: [
            { text: 'Nog iets anders vragen.', reply: () => this.topics(who, list, 0) },
            { text: this.pick.pick(BYE), close: () => {} },
          ],
        };
      },
    }));
    if (order.length > per) choices.push({ text: 'Andere onderwerpen…', reply: () => this.topics(who, list, (page + 1) % Math.ceil(order.length / per)) });
    choices.push({ text: 'Laat maar.', reply: () => this.menuBack() });
    const left = list.filter((t) => !L.topics.includes(t.id)).length;
    return { who, text: left ? `Vraag maar. Ik weet iets over ${list.length} dingen, en over ${left} daarvan heb je me nog niets gevraagd.` : 'Je hebt me alles al gevraagd. Vraag gerust nog eens: ik word er niet moe van.', choices };
  }

  private news() {
    const pool: Pool = NEWS.map((n, i) => ({ t: n.t, w: i < 7 ? 1 : 0.8 }));
    const t = this.pick.pick(pool);
    const item = NEWS.find((n) => n.t === t);
    if (item && NEWS.indexOf(item) < 7) this.d.kroniek.unlock('tijd:wereld');
    return `Horen, zien en zwijgen! ${t}`;
  }

  private sights() {
    const { x, z } = this.hero();
    const keys = ['Sint-Sulpitius en Dionysiuskerk', 'Lakenhalle', 'Stadhuis Diest', 'Hof van Nassau', 'Stadspark De Warande', 'Ingang Begijnhof', 'Onze-Lieve-Vrouwekerk', 'Tafelrondmotte'];
    const ds = keys.map((k) => this.d.world.discoveries.find((d) => d.key === k)).filter((d): d is NonNullable<typeof d> => !!d);
    const unseen = ds.filter((d) => !d.found).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
    const list = ds.map((d) => d.title).join(', ');
    let out = `In Diest heb je: ${list}. Op de markt staan de bakker, de kruidenvrouw, de boekverkoper, de kleermaker en de wapensmid. De herberg De Zwaan ligt ten noorden van de markt, de infirmerie in het Begijnhof, en aan elke poort staat een wachter die de weg kent.`;
    if (unseen[0]) {
      this.point(unseen[0].x, unseen[0].z, unseen[0].title);
      out += ` Je hebt ${unseen[0].title} nog niet gezien: ${direction(unseen[0].x - x, unseen[0].z - z)}, ${farness(Math.hypot(unseen[0].x - x, unseen[0].z - z))}.`;
    } else out += ' Je hebt alles al gezien, hoor ik. Dan ken je de stad beter dan ik.';
    return out;
  }

  private innTale() {
    const pick = this.pick.pick(INN_TALES.map((x) => x.t));
    const tale = INN_TALES.find((x) => x.t === pick) ?? INN_TALES[0];
    if (tale.page) this.d.kroniek.unlock(tale.page);
    if (tale.camp) {
      const cd = this.d.quests.content.camps.find((c) => c.id === tale.camp);
      if (cd) this.point(cd.at[0], cd.at[1], cd.name, 300);
    }
    const truth = tale.page || tale.camp === 'eikenbos' ? 'volksverhaal' : 'verzonnen';
    return `Een oude voerman bij het vuur vertelt: "${tale.t}" (${TRUTH[truth].name}${tale.camp ? '. Hij wijst het aan op je kaart' : ''})`;
  }

  /** Three dice each, highest wins. Forbidden, of course: the begijnen hear of it. */
  private dice(who: string): Spec {
    const q = this.d.quests;
    const play = (bet: number) => (): Spec => {
      if (q.s.florins < bet) return this.after('Zonder geld geen spel. Dat is de enige regel die hier niemand breekt.', who);
      const roll = () => [1, 2, 3].map(() => 1 + Math.floor(Math.random() * 6));
      const a = roll(), b = roll();
      const sa = a.reduce((x, y) => x + y), sb = b.reduce((x, y) => x + y);
      q.s.life.dice[1]++;
      this.onceToday('dice', () => this.standing.add('kerk', -1, 'dobbelen'));
      let res: string;
      if (sa > sb) {
        q.s.florins += bet;
        q.s.life.dice[0]++;
        res = this.pick.pick(DICE.win);
        this.d.sound.coins();
      } else if (sa < sb) {
        q.s.florins -= bet;
        res = this.pick.pick(DICE.lose);
      } else res = this.pick.pick(DICE.tie);
      return {
        who, text: `Jij gooit ${a.join(', ')}: ${sa}. De waard gooit ${b.join(', ')}: ${sb}. ${res}`,
        choices: [{ text: 'Ik gooi nog eens.', reply: () => this.dice(who) }, { text: 'Het is genoeg voor vandaag.', reply: () => this.menuBack() }],
      };
    };
    return {
      who, text: `${this.pick.pick(DICE.ask)} (${DICE.sign})`,
      choices: [
        { text: 'Ik zet één stuiver in.', reply: play(1) },
        ...(this.standing.level('vrije') >= 1 || q.s.florins >= 20 ? [{ text: 'Ik zet vijf stuivers in.', reply: play(5) }] : []),
        { text: 'Nee, laat maar.', reply: () => this.menuBack() },
      ],
    };
  }

  // ---------------------------------------------------------------- the board
  private talkBoard() {
    const q = this.d.quests;
    this.talkingTo = BOARD.id;
    const list = (): Spec => {
      const jobs = this.board.todays();
      const choices: Ch[] = jobs.map((j) => {
        const taken = this.board.taken(j.id);
        const st = q.s.quests[j.id]?.status;
        const tag = st === 'done' ? ' (gedaan)' : taken ? ' (aangenomen)' : ` · ${j.def.reward?.florins ?? 0} stuivers`;
        return {
          text: `${j.def.title}${tag}`,
          reply: (): Spec => ({
            who: BOARD.id,
            text: `${j.notice} (Niveau ${j.def.level}. Beloning: ${j.def.reward?.florins} stuivers, ${j.def.reward?.xp} ervaring, en aanzien bij ${FACTIONS[this.factionOf(j.client) ?? 'gilden'].name}.)`,
            choices: [
              ...(taken ? [] : [{ text: 'Ik neem het aan.', reply: (): Spec => {
                this.board.pinLevel(j.id);
                this.board.take(j);
                return { who: BOARD.id, text: 'Je trekt het briefje van het bord. Het staat nu in je dagboek, bij de opdrachten.', choices: [{ text: 'Verder kijken.', reply: list }, { text: 'Weggaan.', close: () => {} }] };
              } }]),
              { text: 'Iets anders bekijken.', reply: list },
            ],
          }),
        };
      });
      choices.push({ text: 'Weggaan.', close: () => {} });
      const open = this.board.open();
      return { who: BOARD.id, text: open ? `Er hangen briefjes, plakkaten en een premie met een rode lakzegel. ${open === 1 ? 'Eén opdracht is' : `${open} opdrachten zijn`} nog niet genomen. Morgen hangen er nieuwe.` : 'Alles van vandaag is genomen. Morgen hangen er nieuwe briefjes.', choices };
    };
    this.menuBack = list;
    this.talk.start(BOARD.id, list());
  }

  // ================================================================ shops and goods
  /** The shop panel for this seller (also Marieke's, from her own conversation). */
  shopFor(id: string) {
    if (id === MARIEKE.id) return this.shops.view(id, 'vrije', 'MARIEKES WAREN', GOODS.marieke, 'Alles is eerlijk verkregen. Bijna alles toch.');
    const s = this.byId.get(id);
    if (!s) return null;
    return this.shops.view(id, s.def.faction, `${s.def.name.toUpperCase()} · ${s.def.label.toUpperCase()}`, GOODS[s.def.shop ?? ''] ?? [], s.def.shopGreet ? this.pick.pick(s.def.shopGreet) : undefined);
  }

  private openShop(id: string, f: FactionId, title: string, goods: Good[], greet?: string[]) {
    const view = id === 'marktvrouw' ? this.shops.view(id, f, title, goods) : this.shopFor(id) ?? this.shops.view(id, f, title, goods);
    if (greet?.length) view.greet = this.pick.pick(greet);
    this.d.chars.toggle(true, true, view);
  }

  private spentGood(g: Good): string | null {
    const u = g.use;
    if ('reveal' in u) return u.reveal.every((k) => this.d.kroniek.has(`plaats:${k}`)) ? 'Je kent die plaatsen al' : null;
    if ('kroniek' in u) return u.kroniek.every((k) => this.d.kroniek.has(k)) ? 'Al in je Kroniek' : null;
    if ('cloak' in u) return this.d.quests.s.hero.cloak.toLowerCase() === u.cloak.toLowerCase() ? 'Je mantel heeft deze kleur al' : null;
    return null;
  }

  private useGood(g: Good, _seller: string): boolean {
    const q = this.d.quests;
    const u = g.use;
    const max = q.sheet.derived().maxHp;
    if ('heal' in u) {
      q.s.hero.hp = Math.min(max, q.s.hero.hp + max * u.heal);
      this.d.toast(`${g.name.toUpperCase()} · hersteld`);
    } else if ('regen' in u) {
      q.s.inv[g.id] = (q.s.inv[g.id] ?? 0) + 1;
      this.d.toast(`IN JE TAS · ${g.name}`);
    } else if ('salve' in u) {
      q.s.inv.salve = (q.s.inv.salve ?? 0) + u.salve;
      this.d.toast(`ZALF · +${u.salve}`);
    } else if ('buff' in u) {
      if (u.buff === 'uitgerust') q.s.hero.hp = max;
      this.addBuff(u.buff, u.secs);
    } else if ('cloak' in u) {
      q.s.hero.cloak = u.cloak;
      this.d.toast(`JE MANTEL · ${g.name.replace('Verf: ', '')}`);
    } else if ('reveal' in u) {
      const names: string[] = [];
      for (const key of u.reveal) {
        const d = this.d.world.discoveries.find((x) => x.key === key);
        if (!d) continue;
        if (!d.found) names.push(d.title);
        d.found = true;
        this.d.kroniek.unlock(`plaats:${key}`, true);
      }
      this.d.toast(names.length ? `OP JE KAART · ${names.slice(0, 3).join(', ')}${names.length > 3 ? ' …' : ''}` : 'OP JE KAART');
    } else if ('kroniek' in u) {
      for (const id of u.kroniek) this.d.kroniek.unlock(id);
    } else if ('talisman' in u) {
      const gear = talismanGear(u.talisman, q.s.hero.level);
      if (!gear) return false;
      q.giveGear(gear);
    }
    this.d.quests.save();
    return true;
  }

  private addBuff(id: string, secs: number) {
    const B = this.d.quests.s.life.buffs;
    B[id] = Math.max(B[id] ?? 0, secs);
    this.d.toast(`${(BUFF_NAMES[id] ?? id).toUpperCase()} · ${Math.round(secs / 60)} minuten`);
  }

  private autoEat() {
    const q = this.d.quests;
    const foods = [...Object.values(GOODS).flat(), ...(FOOD_GOODS as unknown as Good[])].filter((g) => 'regen' in g.use && (q.s.inv[g.id] ?? 0) > 0);
    if (!foods.length) return;
    foods.sort((a, b) => ('regen' in b.use ? b.use.regen : 0) - ('regen' in a.use ? a.use.regen : 0));
    const f = foods[0];
    if (!('regen' in f.use)) return;
    q.s.inv[f.id]--;
    q.s.life.buffs.eten = f.use.secs;
    q.s.life.buffs.etenRate = f.use.regen;
    this.d.toast(`JE EET · ${f.name.toLowerCase()}`);
  }

  // ================================================================ things in the street
  private useSpot(s: Spot) {
    const q = this.d.quests, L = q.s.life, day = today();
    const first = !L.spots.includes(s.key);
    if (first) L.spots.push(s.key);
    const max = q.sheet.derived().maxHp;
    const h = hash(s.key + day);
    if (s.kind === 'sign') {
      const count = this.spots.filter((x) => x.kind === 'sign' && L.spots.includes(x.key)).length;
      const total = this.spots.filter((x) => x.kind === 'sign').length;
      this.showNote(first ? `UITHANGBORD · ${count} VAN ${total}` : 'UITHANGBORD', fill(SIGN_LINES[hash(s.key) % SIGN_LINES.length], { name: s.name }));
      if (first) {
        q.addXp(6 + q.s.hero.level);
        this.d.kroniek.unlock('tijd:huisnamen');
        if (count % 10 === 0) {
          q.s.florins += 5;
          this.d.toast(`${count} UITHANGBORDEN · de gilde van Sint-Lucas geeft je 5 stuivers`);
          this.standing.add('gilden', 2, 'oog voor de stad');
        }
      }
    } else if (s.kind === 'door') {
      if (L.spotDay[s.key] === day) {
        this.showNote('DEUR', this.pick.pick(['Niemand doet nog open. Ze hebben je vandaag al gezien.', 'Je klopt nog eens. Binnen wordt het heel stil.', 'Het gordijn beweegt, maar de deur blijft dicht.']));
      } else {
        L.spotDay[s.key] = day;
        const line = DOOR_LINES[h % DOOR_LINES.length];
        this.showNote('JE KLOPT AAN', line);
        if (/appel|pap/.test(line)) q.s.hero.hp = Math.min(max, q.s.hero.hp + max * 0.2);
        if (first) q.addXp(4 + q.s.hero.level);
      }
    } else if (s.kind === 'well') {
      q.s.hero.hp = Math.min(max, q.s.hero.hp + max * 0.3);
      this.showNote('WATERPUT', this.pick.pick(WELL_LINES));
      if (first) {
        this.d.kroniek.unlock('tijd:putten');
        q.addXp(4);
      }
    } else {
      if (L.spotDay[s.key] === day) {
        this.showNote('KAPELLETJE', `${SHRINE_LINES[hash(s.key) % SHRINE_LINES.length]} Je hebt hier vandaag al gebeden.`);
      } else {
        L.spotDay[s.key] = day;
        this.showNote('JE BIDT', `${SHRINE_LINES[hash(s.key) % SHRINE_LINES.length]} Je voelt je beschermd.`);
        this.addBuff('zegen', 120);
        if (first) {
          q.addXp(6 + q.s.hero.level);
          this.d.kroniek.unlock('tijd:kapelletjes');
          const n = this.spots.filter((x) => x.kind === 'shrine' && L.spots.includes(x.key)).length;
          if (n % 5 === 0) this.standing.add('kerk', 2, `${n} kapelletjes`);
        }
      }
    }
    this.d.sound.chime(false);
    this.refreshSpotMarks();
    q.save();
  }

  private showNote(kicker: string, text: string, quiet = false) {
    this.note.innerHTML = `<div class="ln-k">${esc(kicker)}</div><div class="ln-t">${esc(text)}</div>`;
    this.note.classList.add('show');
    this.noteT = quiet ? 1.2 : Math.min(9, 3 + text.length / 28);
  }

  private takeCock(c: (typeof this.cocks)[number]) {
    const q = this.d.quests;
    c.g.visible = false;
    if (q.s.life.cocks.includes(c.key)) return;
    q.s.life.cocks.push(c.key);
    const n = q.s.life.cocks.length;
    q.s.florins += 3 + n;
    q.addXp(25 + q.s.hero.level * 5);
    this.d.sound.chime(false);
    this.showNote(`TORENHAAN · ${n} VAN ${COCKS.length}`, `De gouden haan van ${COCK_SHOWN[c.name] ?? c.name} draait en zingt in de wind. Je tikt hem aan in het voorbijvliegen. ${n === COCKS.length ? 'Nu heb je alle hanen van het Demerdal! De klokkengieters zullen ervan horen.' : ''}`);
    if (n === COCKS.length) this.standing.add('gilden', 6, 'alle torenhanen');
    q.save();
  }

  /** For tests: how many spots of each kind. */
  stats() {
    const by: Record<string, number> = {};
    for (const s of this.spots) by[s.kind] = (by[s.kind] ?? 0) + 1;
    return { services: this.services.length, spots: this.spots.length, ...by, cocks: this.cocks.length };
  }
}

// ---------------------------------------------------------------- helpers
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function pointOn(p: number[], seg: number[], s: number): [number, number] {
  let lo = 1, hi = seg.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (seg[m] < s) lo = m + 1;
    else hi = m;
  }
  const i = Math.max(1, lo);
  const a = seg[i - 1], b = seg[i];
  const t = b > a ? Math.max(0, Math.min(1, (s - a) / (b - a))) : 0;
  return [p[(i - 1) * 2] + (p[i * 2] - p[(i - 1) * 2]) * t, p[(i - 1) * 2 + 1] + (p[i * 2 + 1] - p[(i - 1) * 2 + 1]) * t];
}

/** Four small marks for the street: a sign, a door, a well, a shrine (2 x 2 atlas). */
function spotAtlas() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const draw = (cx: number, cy: number, path: () => void) => {
    g.save();
    g.translate(cx, cy);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    path();
    g.lineWidth = 7;
    g.strokeStyle = 'rgba(30, 18, 6, 0.85)';
    g.stroke();
    // ivory, not gold: gold belongs to the ! and ? of people with work, and a small door arch in gold reads as a "!"
    g.lineWidth = 3;
    g.strokeStyle = '#ece2c6';
    g.stroke();
    g.restore();
  };
  // sign: an arm with a hanging board
  draw(32, 32, () => {
    g.beginPath();
    g.moveTo(-18, -16); g.lineTo(16, -16);
    g.moveTo(-8, -16); g.lineTo(-8, -8); g.moveTo(8, -16); g.lineTo(8, -8);
    g.rect(-14, -8, 28, 20);
  });
  // door: an arch
  draw(96, 32, () => {
    g.beginPath();
    g.moveTo(-11, 18); g.lineTo(-11, -4); g.arc(0, -4, 11, Math.PI, 0); g.lineTo(11, 18); g.closePath();
    g.moveTo(5, 4); g.arc(4, 4, 1.5, 0, Math.PI * 2);
  });
  // well: a bucket under a beam
  draw(32, 96, () => {
    g.beginPath();
    g.moveTo(-16, -16); g.lineTo(16, -16); g.moveTo(0, -16); g.lineTo(0, -4);
    g.moveTo(-10, -4); g.lineTo(10, -4); g.lineTo(7, 16); g.lineTo(-7, 16); g.closePath();
  });
  // shrine: a little house with a cross
  draw(96, 96, () => {
    g.beginPath();
    g.moveTo(-14, -2); g.lineTo(0, -16); g.lineTo(14, -2); g.lineTo(14, 16); g.lineTo(-14, 16); g.closePath();
    g.moveTo(0, -2); g.lineTo(0, 12); g.moveTo(-5, 3); g.lineTo(5, 3);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The town walk: eight stops from the market to the Begijnhof, each with a line of history. */
function walkQuest(): QuestDef {
  return {
    id: 'walk_diest', title: 'Een wandeling door Diest', kind: 'side', town: 'Diest', giver: 'omroeper', level: 1,
    summary: 'Je wandelt langs acht haltes, van de Grote Markt tot aan het Begijnhof. Bij elke halte hoor je iets over de stad.',
    reward: { xp: 260, florins: 15 },
    stages: WALK.map((w, i) => ({
      id: `stop${i}`,
      journal: `Halte ${i + 1} van ${WALK.length}: ${w.title}. ${w.go}`,
      objectives: [{ id: 'reach', kind: 'reach' as const, text: `Halte ${i + 1}: ${w.title}`, at: w.at, r: 16, onFoot: true }],
      onDone: i < WALK.length - 1 ? [{ call: `walk:${i}` }, { stage: ['walk_diest', `stop${i + 1}`] as [string, string] }] : [{ call: `walk:${i}` }, { complete: 'walk_diest' }],
    })),
  };
}

