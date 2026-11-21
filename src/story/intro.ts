// The faction intros: a film of about a minute, played after BEGIN on the
// creation screen and before the prologue. Every film has the same shape, as
// in the race intros of World of Warcraft: a shared cold open (this land was
// taken from the water, the bells keep it, and something sleeps under them),
// then the player's own party in its own places, with people doing what that
// party does, and a close that turns to "jij" and to the last ordinary
// evening, which is where the prologue begins.
//
// Lines follow docs/design/voice.md: Flemish Dutch, a full sentence each,
// clear on first reading. Every line has an id (intro_open_n, intro_<party>_n,
// intro_close_n) and goes through src/audio/voice.ts, so recordings can be
// dropped in later. Facts stated here are history; see the Kroniek for sources.

import * as THREE from 'three';
import type { Player } from '../player/player';
import type { TownsfolkKit, FolkSpec } from '../rpg/townsfolk';
import type { HeroData } from '../rpg/state';
import type { World } from '../world/world';
import { FACTIONS } from '../rpg/factions';
import { NEELKE } from './prologue';
import { mist, softTexture, type Film, type Line, type Shot, type Stage, type Fig } from './cine';

export const INTRO_FACTIONS = ['gilden', 'kerk', 'kroon', 'oranje', 'vrije'] as const;
export type IntroFaction = (typeof INTRO_FACTIONS)[number];

/** Every narrated line of the intros, by id: [speaker, text] (the narrator has no name). */
export const INTRO_LINES: Record<string, [string, string]> = {
  // the cold open, the same for everyone
  intro_open_1: ['', 'Waar nu koeien grazen, stond vroeger water. Met dijken en grachten is dit land van de Demer afgenomen.'],
  intro_open_2: ['', 'Boven de daken hangen de klokken. Ze slaan elk uur, ze luiden bij brand, en ze zwijgen nooit.'],
  intro_open_3: ['', 'De oude mensen zeggen dat de klokken nog iets anders doen. Wat, dat vertellen ze alleen bij het vuur.'],

  // De Gilden
  intro_gilden_1: ['', 'Diest is een stad van ambachten. Brouwers, smeden, kleermakers: elk ambacht heeft zijn eigen deken.'],
  intro_gilden_2: ['', 'Ooit lag het laken van Diest op alle grote markten. Nu staat de Lakenhalle half leeg.'],
  intro_gilden_3: ['', 'De schutters bewaken de muren als het moet. Anders schieten ze op de gaai en drinken ze op hun koning.'],
  intro_gilden_4: ['', 'De gilden vinden dat Diest van hen is. Zij houden de wacht, zij betalen, en de heer komt nooit.'],

  // De Kerk
  intro_kerk_1: ['', 'In het Begijnhof verzorgen de begijnen de zieken. Bij valavond gaat hun poort dicht, voor iedereen.'],
  intro_kerk_2: ['', 'De toren van Sint-Sulpitius is nooit afgebouwd. De kanunniken weten waarom de klokken erin moeten slaan.'],
  intro_kerk_3: ['', 'In Scherpenheuvel stond een eik met een Mariabeeld. Nu staat daar een kerk met zeven zijden, en heel Brabant komt er bidden.'],
  intro_kerk_4: ['', 'De priesters en de begijnen weten meer over de klokken dan ze zeggen. Ze bidden dat niemand het ooit vraagt.'],

  // De Kroon
  intro_kroon_1: ['', 'Brabant is van de koning van Spanje. Hij woont in Madrid, en hij heeft Diest nog nooit gezien.'],
  intro_kroon_2: ['', 'Zijn soldaten liggen bij de burgers in huis, en hun soldij komt maanden te laat, of helemaal niet.'],
  intro_kroon_3: ['', 'Vijftien jaar geleden gaf Diest zich over aan een Frans en een Staats leger. De Kroon is dat niet vergeten.'],
  intro_kroon_4: ['', 'De Kroon wil orde en belastingen. Ze is haar soldaten geld schuldig, en de stad mag die schuld dragen.'],

  // Oranje
  intro_oranje_1: ['', 'De heer van Diest is de prins van Oranje. Zijn familie is hier heer sinds 1499, maar hun huis in de stad staat leeg.'],
  intro_oranje_2: ['', 'In zijn jachtpark, de Warande, lopen herten en reeën, voor een heer die er nooit komt jagen.'],
  intro_oranje_3: ['', 'Dit najaar is de prins aan de pokken gestorven. Acht dagen later is zijn zoon geboren, en die is nu de heer van Diest.'],
  intro_oranje_4: ['', 'Zijn drossaard dient een protestantse heer, in een katholieke stad, onder een Spaanse koning. Hij slaapt slecht.'],

  // De Vrije Lieden
  intro_vrije_1: ['', 'Buiten de muren leven de marskramers, de voerlui, en iedereen die geen meester heeft.'],
  intro_vrije_2: ['', 'Overdag bleekt het laken van de stad op de velden. \'s Nachts rijdt daar wat niemand mag zien.'],
  intro_vrije_3: ['', 'Aan elke poort betaal je tol. Daarom rijdt de kar met brandewijn \'s nachts, en altijd om de poort heen.'],
  intro_vrije_4: ['', 'Ze zijn niemand iets schuldig, zeggen ze. Maar langs de weg waar zij rijden, staat een galg.'],

  // the close, the same for everyone
  intro_close_1: ['', 'En jij, {name}, stond al aan hun kant, al wist je het zelf nog niet. Die avond moest je je zusje thuisbrengen.'],
  intro_close_2: ['', 'Het was bijna middernacht, en niemand in Diest twijfelde eraan dat de klok twaalf keer zou slaan.'],
};

export interface IntroContext {
  player: Player;
  kit: TownsfolkKit | null;
  hero: HeroData;
  world: World;
}

// ------------------------------------------------------------------ props, made on the spot
const matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, rough = 0.9, emissive?: string) {
  const k = color + rough + (emissive ?? '');
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, emissive: emissive ?? '#000000', emissiveIntensity: emissive ? 1.6 : 0 });
    matCache.set(k, m);
  }
  return m;
}
function box(w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function cyl(r: number, h: number, color: string, x = 0, y = 0, z = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function barrel() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.85, 12), mat('#6b4a2c'));
  b.position.y = 0.43;
  b.castShadow = true;
  g.add(b);
  for (const y of [0.15, 0.71]) g.add(cyl(0.355, 0.05, '#2b2724', 0, y, 0, 12));
  return g;
}
/** a two-wheeled handcart with three barrels */
function cart() {
  const g = new THREE.Group();
  g.add(box(1.3, 0.12, 2.0, '#5a4128', 0, 0.62, 0));
  g.add(box(0.06, 0.35, 2.0, '#4a3420', 0.65, 0.82, 0), box(0.06, 0.35, 2.0, '#4a3420', -0.65, 0.82, 0));
  for (const s of [1, -1]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 16), mat('#3a2a1a'));
    w.rotation.y = Math.PI / 2;
    w.position.set(s * 0.78, 0.5, 0.15);
    g.add(w);
    g.add(box(0.06, 0.06, 1.6, '#4a3420', s * 0.45, 0.62, -1.7));
  }
  for (const [x, z] of [[-0.3, -0.5], [0.3, -0.5], [0, 0.45]]) {
    const b = barrel();
    b.position.set(x, 0.68, z);
    b.scale.setScalar(0.8);
    g.add(b);
  }
  return g;
}
/** the guild's popinjay: a wooden bird on top of a tall pole */
function popinjay(h = 16) {
  const g = new THREE.Group();
  g.add(cyl(0.16, h, '#6a5238', 0, h / 2, 0, 8));
  const bird = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), mat('#2f7a3a', 0.6));
  body.scale.set(0.8, 0.8, 1.3);
  bird.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 6), mat('#b8342a', 0.6));
  tail.rotation.x = -Math.PI / 2 - 0.4;
  tail.position.set(0, -0.05, -0.55);
  bird.add(tail);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), mat('#d9b23a', 0.6));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.05, 0.5);
  bird.add(beak);
  bird.position.y = h + 0.35;
  g.add(bird);
  return g;
}
function gallows() {
  const g = new THREE.Group();
  const wood = '#2c241c';
  g.add(box(0.35, 5.2, 0.35, wood, -1.7, 2.6, 0), box(0.35, 5.2, 0.35, wood, 1.7, 2.6, 0), box(4.2, 0.32, 0.36, wood, 0, 5.1, 0));
  g.add(cyl(0.025, 1.4, '#8a7a5a', -0.6, 4.25, 0, 5));
  const noose = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 5, 12), mat('#8a7a5a'));
  noose.position.set(-0.6, 3.4, 0);
  g.add(noose);
  return g;
}
/** linen laid out to bleach: long white strips on the grass */
function bleach(n: number, len = 14) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#ece6d4', roughness: 0.95 });
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.1, len * (0.8 + ((i * 37) % 10) / 25)), m);
    s.rotation.x = -Math.PI / 2;
    s.position.set(i * 2.4, 0.04 + i * 0.002, ((i * 53) % 7) - 3);
    s.receiveShadow = true;
    g.add(s);
  }
  return g;
}
/** a warm flame: a small glowing ball with a point light */
function flame(s: Stage, x: number, y: number, z: number, power = 6, range = 14, color = '#ffb35a') {
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(0.28);
  glow.position.set(x, y, z);
  s.group.add(glow);
  const l = s.light(new THREE.PointLight(color, power, range, 1.6), x, y, z);
  s.every(() => {
    const f = 0.85 + Math.sin(performance.now() / 90) * 0.06 + Math.sin(performance.now() / 37) * 0.05;
    l.intensity = power * f;
  });
  return l;
}

// ------------------------------------------------------------------ people
const SCHUTTER: FolkSpec = { body: 'man', role: 'soldier', wear: { hair_long: 'h_brown', moustache: 'h_brown', hat_wide: 'black', plume: 'white', doublet: 'madder_dk', buff_coat: null, sash: 'madder', breeches: 'slate', stockings: 'grey', boots: null }, prop: 'musket' };
const SMUGGLER: FolkSpec = { body: 'man', role: 'peasant', wear: { hair_crop: 'h_dark', beard_full: 'h_dark', hat_wide: 'black', doublet: 'umber', bandolier: null, breeches: 'black', stockings: 'umber', boots: null } };
const WEAVER: FolkSpec = { body: 'man_old', role: 'burgher', wear: { hair_thin: 'h_grey', beard_pointed: 'h_grey', skullcap: 'black', doublet: 'black', collar_band: null, breeches: 'black', stockings: 'black', shoes: null } };
const DROSSAARD: FolkSpec = { body: 'man', role: 'burgher', wear: { hair_long: 'h_dark', beard_pointed: 'h_dark', hat_wide: 'black', doublet: 'black', collar_band: null, sash: 'saffron', breeches: 'black', stockings: 'black', boots: null } };
/** a canon of the chapter of Sint-Sulpitius */
const CANON: FolkSpec = { body: 'man_old', role: 'friar', wear: { hair_thin: 'h_grey', skullcap: 'black', habit: 'black', bands: null, shoes: null } };
const CLERK: FolkSpec = { body: 'man_young', role: 'burgher', wear: { hair_crop: 'h_chestnut', cap_flat: 'black', doublet: 'slate', collar_band: null, breeches: 'grey', stockings: 'grey', shoes: null } };

/** someone standing about, doing one thing */
function at(s: Stage, who: FolkSpec | string, x: number, z: number, yaw: number, clip = 'idle', seed = 1) {
  return s.person(who, x, z, yaw, clip, seed);
}
const face = (f: Fig | null, x: number, z: number) => f && (f.yaw = f.root.rotation.y = Math.atan2(x - f.x, z - f.z));

// ------------------------------------------------------------------ the shared shots
function openShots(c: IntroContext): Shot[] {
  const d = c.player.dragon;
  return [
    {
      name: 'open-polder', sky: 'golden', lines: ['intro_open_1'], lead: 0.8, min: 6.5,
      env: { fog: 3.2, exposure: 1.05 },
      focus: [1340, 20],
      // low over the meadows by the Demer in the morning mist, the river turning away towards the town
      cam: { path: [[1530, 34, -80], [1495, 24, -50], [1465, 15, -25]], look: [[1300, 0, 20], [1150, 0, 50], [950, 2, 70]], fov: [50, 46], ease: 'linear' },
      cast: (s) => {
        const m = mist(s.group, 1440, -30, 140, 26, '#d9cbb2', 0.2, 34);
        s.every((dt) => m.update(dt));
        const herd = at(s, 'peasant_man', 1395, 30, 0, 'walk_old', 3);
        s.walk(herd, [[1380, 52], [1362, 70]], 1.0, 'walk_old');
      },
      cues: [[0, (s) => { s.sound.bed('water', 0.7, 2); s.sound.bed('wind', 0.5, 3); s.sound.bed('drone', 0.25, 4); }]],
    },
    {
      name: 'open-klokken', sky: 'golden', lines: ['intro_open_2'], into: 'cross', blend: 1.6, min: 6.5,
      focus: [-27, 37],
      // up the tower of Sint-Sulpitius, past the belfry, the town below
      cam: { path: [[-82, 14, 108], [-68, 26, 92], [-58, 38, 80]], look: [[-30, 22, 40], [-27, 30, 37], [-27, 38, 37]], fov: [46, 40], ease: 'inout' },
      cues: [
        [0.4, (s) => { s.sound.bellFar(147, 0.42); s.sound.bed('water', 0, 3); s.sound.bed('drone', 0.35, 4); }],
        [2.6, (s) => s.sound.bellFar(147, 0.38)],
        [4.8, (s) => s.sound.bellFar(147, 0.34)],
      ],
    },
    {
      name: 'open-slaap', sky: 'night', lines: ['intro_open_3'], into: 'black', blend: 1.2, min: 7.5, tail: 0.8,
      env: { exposure: 1.3, fog: 1.2 },
      focus: [1446, -52],
      // night on the Demer: two blue eyes under the water, and behind them, in the reeds, something larger asleep
      cam: { path: [[1431, 1.0, -64], [1436, 0.8, -59]], look: [[1448, 0.5, -50], [1454, 0.9, -46]], fov: [42, 34], ease: 'slowout', drift: 0.12 },
      cast: (s) => {
        const m = mist(s.group, 1450, -46, 60, 12, '#7f97b0', 0.11, 22, 3);
        s.every((dt) => m.update(dt));
        // the Kludde's eyes, just under the surface
        const eyes = new THREE.SpriteMaterial({ map: softTexture(), color: '#9fe2ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
        for (const dx of [-0.28, 0.28]) {
          const e = new THREE.Sprite(eyes);
          e.scale.setScalar(0.42);
          e.position.set(1442.6 + dx, 0.15, -55);
          s.group.add(e);
        }
        const glow = s.light(new THREE.PointLight('#7fc8ff', 0, 7, 2), 1442.6, 0.5, -55);
        // the dragon asleep, low in the reeds, its colour the one you chose
        s.borrow(d.root);
        // side-on to the camera, sunk to the shoulders in the water
        const dragon = s.thing(d.root, 1456, -44, 2.4);
        dragon.root.userData.y = -1.5;
        d.snapFold(1);
        const neck = ['neck2', 'neck3', 'neck4', 'head'].map((n) => d.root.getObjectByName(n)).filter((o): o is THREE.Object3D => !!o);
        s.every((dt) => {
          d.update(dt, { speed: 0, climb: 0, thrust: 0, turnRate: 0, grounded: 1, boosting: false });
          // asleep: the head laid down, a slow breath through the body
          for (const [i, o] of neck.entries()) o.rotation.x += 0.22 + i * 0.05;
          d.body.rotation.set(0.16, 0, 0.08);
          d.body.scale.setScalar(1 + Math.sin(performance.now() / 1400) * 0.012);
        });
        s.onClear(() => {
          d.body.rotation.set(0, 0, 0);
          d.body.scale.setScalar(1);
        });
        let t = 0;
        s.every((dt) => {
          t += dt;
          const open = Math.min(1, Math.max(0, (t - 3.5) / 2.5));
          eyes.opacity = open * (0.8 + Math.sin(t * 2.1) * 0.15);
          glow.intensity = open * 2.5;
        });
      },
      cues: [
        [0, (s) => { s.sound.bed('night', 0.8, 2); s.sound.bed('water', 0.5, 2); s.sound.bed('drone', 0.55, 5); s.sound.bellsGoingOut(5, 1.5); }],
        [-0.6, (s) => s.sound.hitLow(0.45)],
      ],
    },
  ];
}

function closeShots(c: IntroContext): Shot[] {
  const hero = c.player.hero;
  const putHero = (s: Stage, x: number, z: number, yaw: number) => {
    s.borrow(hero.root);
    const f = s.thing(hero.root, x, z, yaw);
    let last = { x, z };
    s.every((dt) => {
      const sp = dt > 0 ? Math.hypot(f.x - last.x, f.z - last.z) / dt : 0;
      last = { x: f.x, z: f.z };
      hero.update(dt, sp, 0, false);
    });
    return f;
  };
  return [
    {
      name: 'close-jij', sky: 'golden', lines: ['intro_close_1'], into: 'black', blend: 1.4, min: 6.5,
      env: { exposure: 0.95, fog: 1.6 },
      focus: [1392, 6],
      // you, on the bank of the Demer at the end of the day, the town on the skyline
      cam: { path: [[1384.5, 1.7, 13.5], [1386.5, 1.9, 9.2], [1389.6, 2.0, 6.6]], look: [[1392, 1.5, 6], [1392, 1.6, 6], [1392.2, 1.6, 6]], fov: [40, 36], ease: 'inout', drift: 0.05 },
      cast: (s) => {
        putHero(s, 1392, 6, -Math.PI / 2 - 0.25);
        const sis = s.person(NEELKE, 1398, 3, -Math.PI / 2, 'idle', 5);
        s.walk(sis, [[1395, 4.5], [1393.6, 7.6]], 1.6, 'walk');
        s.every(() => sis && face(sis, sis.x - 3, sis.z));
        const m = mist(s.group, 1420, -20, 90, 12, '#d8c6a8', 0.13, 30, 11);
        s.every((dt) => m.update(dt));
      },
      cues: [[0, (s) => { s.sound.bed('drone', 0.3, 3); s.sound.bed('water', 0.4, 3); s.sound.bed('night', 0, 2); }]],
    },
    {
      name: 'close-middernacht', sky: 'night', lines: ['intro_close_2'], into: 'cross', blend: 2.2, min: 7, tail: 1.3,
      env: { exposure: 1.3 },
      focus: [1380, 8],
      // the two of them walking home along the river, small under the night, the lights of Diest far ahead
      cam: { path: [[1398, 1.5, 10], [1400, 2.2, 11]], look: [[1380, 1.6, 8], [1370, 2.4, 10]], fov: [44, 40], ease: 'linear', drift: 0.08 },
      cast: (s) => {
        const h = putHero(s, 1391, 7, -Math.PI / 2);
        s.walk(h, [[1372, 9], [1352, 12]], 1.5);
        const sis = s.person({ ...NEELKE, prop: 'lantern' }, 1391.5, 8.6, -Math.PI / 2, 'walk', 7);
        s.walk(sis, [[1372.5, 10.6], [1352.5, 13.6]], 1.5, 'walk');
        // her lantern lights the path
        if (sis) {
          const l = s.light(new THREE.PointLight('#ffb35a', 7, 16, 1.5), 0, 0, 0);
          s.every(() => l.position.set(sis.x + 0.3, 1.0, sis.z + 0.2));
        }
        const m = mist(s.group, 1380, 0, 70, 14, '#8ea4bc', 0.14, 24, 17);
        s.every((dt) => m.update(dt));
      },
      cues: [
        [0, (s) => { s.sound.bed('night', 0.7, 2); s.sound.bed('drone', 0.4, 4); s.sound.bed('water', 0.3, 2); }],
        [-2.2, (s) => { s.sound.bed('drone', 0, 2.5); s.sound.bed('night', 0.35, 2); }],
      ],
    },
  ];
}

// ------------------------------------------------------------------ the parties
function title(f: IntroFaction): [string, string] {
  return [FACTIONS[f].tagline.toUpperCase(), FACTIONS[f].name.toUpperCase()];
}

function gildenShots(): Shot[] {
  return [
    {
      name: 'gilden-markt', sky: 'golden', lines: ['intro_gilden_1'], into: 'black', blend: 1.0, crowd: true, title: title('gilden'),
      focus: [-38, 98],
      // down over the Grote Markt on market day
      cam: { path: [[-66, 16, 113], [-61, 10, 108], [-55, 5, 103.5]], look: [[-38, 1.5, 97], [-37, 1.6, 97], [-36, 2, 96]], fov: [48, 44] },
      cast: (s) => {
        s.walk(at(s, 'merchant', -50, 106, 1.2, 'walk', 2), [[-40, 101], [-28, 95]], 1.2);
        s.walk(at(s, 'burgher_wife', -49, 104, 1.2, 'walk', 4), [[-39, 99], [-27, 93]], 1.1);
        const a = at(s, 'journeyman', -43, 98, 0.4, 'talk', 6);
        const b = at(s, 'peasant_woman', -41.8, 99.2, 3.4, 'idle', 8);
        face(a, -41.8, 99.2);
        face(b, -43, 98);
      },
      cues: [[0, (s) => { s.sound.bed('murmur', 0.9, 2); s.sound.bed('drone', 0.18, 3); s.sound.bed('night', 0, 1); s.sound.bed('water', 0, 1); }]],
    },
    {
      name: 'gilden-lakenhalle', sky: 'golden', lines: ['intro_gilden_2'], into: 'cut', min: 6,
      focus: [94, 34],
      // at the cloth hall: a dean weighs a weaver's cloth; the weaver waits with his cap in his hands
      cam: { path: [[87.5, 1.8, 40.5], [89.5, 1.7, 38.6]], look: [[95.5, 1.8, 32], [96, 1.7, 31.5]], fov: [44, 38], drift: 0.06 },
      cast: (s) => {
        const dean = at(s, WEAVER, 94, 33.4, 0.9, 'talk', 3);
        const weaver = at(s, { ...WEAVER, body: 'man', wear: { hair_crop: 'h_brown', smock: 'linen', belt: null, breeches: 'brown', stockings: 'linen', shoes: null } }, 96.6, 34.2, -2.3, 'idle', 5);
        face(dean, 96.6, 34.2);
        face(weaver, 94, 33.4);
        const table = box(1.6, 0.85, 0.8, '#5a4128', 95.4, 0.42, 32.4);
        const cloth = box(1.3, 0.12, 0.6, '#3d5c7a', 95.4, 0.9, 32.4);
        s.group.add(table, cloth);
      },
      cues: [[0.5, (s) => s.sound.loom()], [2.5, (s) => s.sound.loom()], [5, (s) => s.sound.bed('murmur', 0.4, 2)], [7, (s) => s.sound.loom()]],
    },
    {
      name: 'gilden-schutters', sky: 'golden', lines: ['intro_gilden_3'], into: 'cross', blend: 1.2,
      focus: [530, -570],
      // the shooting ground by the Schaffense Poort: the guild aims at the wooden bird on its pole
      cam: { path: [[509.5, 1.8, -550.5], [512, 2.2, -553]], look: [[531, 5, -575], [533, 6.5, -577]], fov: [46, 42] },
      cast: (s) => {
        const pole = popinjay(13);
        pole.position.set(538, 0, -582);
        s.group.add(pole);
        const aim = at(s, SCHUTTER, 520, -560, 0, 'aim', 2);
        face(aim, 538, -582);
        const b = at(s, { ...SCHUTTER, wear: { ...SCHUTTER.wear, hat_wide: 'umber', plume: null, doublet: 'woad_dk' } }, 517.5, -558, 0, 'idle', 3);
        face(b, 538, -582);
        const c2 = at(s, { ...SCHUTTER, body: 'man_stout', prop: null, wear: { ...SCHUTTER.wear, plume: 'madder' } }, 516, -562.5, 0, 'talk', 4);
        face(c2, 520, -560);
      },
      cues: [[2.2, (s) => s.sound.shot()], [5.6, (s) => s.sound.twang()]],
    },
    {
      name: 'gilden-stadhuis', sky: 'golden', lines: ['intro_gilden_4'], into: 'cut',
      focus: [-80, 14],
      env: { exposure: 0.92 },
      // the aldermen come out of the town hall: the town is theirs, they think
      cam: { path: [[-89, 1.7, 7.5], [-87.5, 1.8, 9]], look: [[-75, 3.2, 19], [-74, 4, 20]], fov: [46, 42] },
      cast: (s) => {
        s.walk(at(s, WEAVER, -77, 17.5, -2.3, 'walk', 6), [[-80, 15], [-82.5, 12.8]], 0.8, 'walk_formal');
        s.walk(at(s, { ...WEAVER, body: 'man_stout', wear: { ...WEAVER.wear, hair_thin: 'h_brown', beard_pointed: 'h_brown', skullcap: null, hat_wide: 'black' } }, -75.6, 19, -2.3, 'walk', 7), [[-78.6, 16.4], [-81.2, 14.4]], 0.8, 'walk_formal');
        const g = at(s, SCHUTTER, -84.5, 15.5, 0, 'idle', 8);
        face(g, -77, 17);
      },
    },
  ];
}

function kerkShots(): Shot[] {
  return [
    {
      name: 'kerk-begijnhof', sky: 'golden', lines: ['intro_kerk_1'], into: 'black', blend: 1.0, title: title('kerk'),
      focus: [703, -342],
      // beguines crossing the court to the Sint-Catharinakerk
      cam: { path: [[699.5, 1.7, -358], [700.5, 2.3, -354]], look: [[705, 4.5, -332], [705, 5.5, -330]], fov: [46, 42] },
      cast: (s) => {
        s.walk(at(s, 'beguine', 700, -348, 0.2, 'walk', 2), [[702, -344], [704, -340]], 0.8);
        s.walk(at(s, 'beguine', 698.6, -349.5, 0.2, 'walk', 3), [[700.6, -345.5], [702.6, -341.5]], 0.8);
        const b = at(s, 'beguine', 707, -343, 0, 'pray', 4);
        face(b, 706, -336);
      },
      cues: [[0, (s) => { s.sound.bed('drone', 0.25, 3); s.sound.bed('night', 0, 1); s.sound.bed('water', 0, 1); s.sound.bed('wind', 0.25, 2); }], [1.5, (s) => s.sound.bell(330, 0.12)]],
    },
    {
      name: 'kerk-toren', sky: 'golden', lines: ['intro_kerk_2'], into: 'cut',
      focus: [-15, 50],
      // up at the squat, unfinished tower; a canon of the chapter crosses below
      cam: { path: [[-76, 16, 84], [-68, 21, 76]], look: [[-28, 20, 38], [-27, 25, 37]], fov: [44, 40] },
      cast: (s) => s.walk(at(s, CANON, -13, 55, -2.3, 'walk', 5), [[-17, 51], [-21, 47]], 0.8, 'walk_formal'),
      cues: [[1.2, (s) => s.sound.bell(147, 0.32)], [3.8, (s) => s.sound.bell(147, 0.26)]],
    },
    {
      name: 'kerk-scherpenheuvel', sky: 'golden', lines: ['intro_kerk_3'], into: 'black', blend: 0.9,
      focus: [-5062, 518],
      // the church of Scherpenheuvel, where the oak stood
      cam: { path: [[-5156, 48, 484], [-5150, 40, 502], [-5140, 32, 518]], look: [[-5062, 16, 518], [-5062, 17, 518], [-5062, 19, 518]], fov: [46, 42] },
      cast: (s) => {
        s.walk(at(s, 'pilgrim', -5128, 522, 1.6, 'walk', 6), [[-5108, 520]], 1.0);
        s.walk(at(s, 'peasant_woman', -5130, 524, 1.6, 'walk', 7), [[-5110, 522]], 1.0);
      },
      cues: [[0.6, (s) => s.sound.bellFar(220, 0.3)]],
    },
    {
      name: 'kerk-gebed', sky: 'night', lines: ['intro_kerk_4'], into: 'black', blend: 1.0, env: { exposure: 1.2 },
      focus: [702, -342],
      // a beguine at prayer by a candle, at night
      cam: { path: [[699.4, 1.15, -345.2], [699.9, 1.1, -344.6]], look: [[702.4, 1.0, -341.6], [702.4, 1.0, -341.6]], fov: [40, 34], drift: 0.03 },
      cast: (s) => {
        const b = at(s, 'beguine', 702, -342, 0, 'pray', 9);
        face(b, 703, -340.6);
        s.group.add(box(0.5, 1.0, 0.4, '#5c554d', 703, 0.5, -340.6));
        flame(s, 703, 1.12, -340.6, 6, 12);
      },
      cues: [[0, (s) => { s.sound.bed('night', 0.5, 2); s.sound.bed('drone', 0.4, 3); }]],
    },
  ];
}

function kroonShots(): Shot[] {
  return [
    {
      name: 'kroon-poort', sky: 'storm', lines: ['intro_kroon_1'], into: 'black', blend: 1.0, title: title('kroon'),
      focus: [345, 610],
      // the Maastrichtse Poort under a heavy sky, a sentry on the road
      cam: { path: [[336, 1.7, 662], [338, 3, 648]], look: [[344, 8, 616], [344, 7, 617]], fov: [46, 42] },
      cast: (s) => {
        face(at(s, 'musketeer', 347, 624, 0.3, 'idle', 2), 337, 660);
        face(at(s, 'soldier', 341.5, 623, -0.3, 'idle', 3), 337, 660);
      },
      cues: [[0, (s) => { s.sound.bed('wind', 0.7, 2); s.sound.bed('drone', 0.3, 3); s.sound.bed('night', 0, 1); s.sound.bed('water', 0, 1); }], [1.5, (s) => s.sound.drum(8)]],
    },
    {
      name: 'kroon-inkwartiering', sky: 'storm', lines: ['intro_kroon_2'], into: 'cut', min: 6,
      focus: [326, 556],
      // quartered on the town: soldiers at a burgher's door, the woman of the house carrying their wood
      cam: { path: [[319.2, 1.6, 563.4], [320.4, 1.6, 562.2]], look: [[327, 1.2, 556], [327.5, 1.2, 555.6]], fov: [42, 36], drift: 0.06 },
      cast: (s) => {
        at(s, 'soldier', 326, 556, 0, 'sit', 2);
        const b = at(s, 'musketeer', 328.4, 554.5, 0, 'talk', 3);
        face(b, 326, 556);
        const c2 = at(s, 'soldier', 329, 557.6, 0, 'look_around', 4);
        face(c2, 326, 556);
        s.walk(at(s, 'maid', 322, 551, 0.8, 'walk', 5), [[327, 552.5], [332, 551]], 0.9);
        s.group.add(barrel());
        const br = s.group.children[s.group.children.length - 1];
        br.position.set(325, 0, 554.6);
      },
      cues: [[0, (s) => s.sound.bed('murmur', 0.3, 2)], [7, (s) => s.sound.bed('murmur', 0, 3)]],
    },
    {
      name: 'kroon-griet', sky: 'storm', lines: ['intro_kroon_3'], into: 'cross', blend: 1.2,
      focus: [150, 62],
      // Holle Griet, the great old gun, a musketeer beside her
      cam: { path: [[160, 1.6, 65], [158.4, 1.3, 64.6]], look: [[150, 1, 62], [149.6, 1.1, 62]], fov: [42, 36] },
      cast: (s) => {
        const m = at(s, 'musketeer', 152.5, 59.6, 0, 'idle', 6);
        face(m, 158, 71);
      },
      cues: [[0.3, (s) => s.sound.boom()], [0.3, (s) => s.sound.bed('drone', 0.45, 2)]],
    },
    {
      name: 'kroon-muur', sky: 'storm', lines: ['intro_kroon_4'], into: 'cut',
      focus: [-80, 14],
      // the bill: a soldier at the town hall door, a burgher arguing over what the town must pay
      cam: { path: [[-89.5, 1.7, 7.8], [-88, 1.7, 9.2]], look: [[-79, 1.8, 16.5], [-78.5, 1.9, 17]], fov: [42, 36], drift: 0.05 },
      cast: (s) => {
        const g = at(s, 'musketeer', -78.4, 17.2, 0, 'idle', 7);
        const b = at(s, WEAVER, -80.2, 16.0, 0, 'talk', 8);
        face(g, -80.2, 16.0);
        face(b, -78.4, 17.2);
        s.walk(at(s, 'maid', -83, 19, 1.6, 'walk', 9), [[-76, 19.5], [-70, 20]], 0.9);
      },
      cues: [[1, (s) => s.sound.drum(5)]],
    },
  ];
}

function oranjeShots(): Shot[] {
  return [
    {
      name: 'oranje-hof', sky: 'golden', lines: ['intro_oranje_1'], into: 'black', blend: 1.0, title: title('oranje'),
      focus: [307, 140],
      // the Hof van Nassau, shut; the old steward keeps a lantern at its door
      cam: { path: [[331, 1.8, 160], [325, 2.2, 155.5]], look: [[307, 4, 141.5], [306, 4.5, 141]], fov: [46, 42] },
      cast: (s) => {
        const k = at(s, { body: 'man_old', role: 'oldMan', wear: { hair_thin: 'h_grey', beard_pointed: 'h_grey', hat_wide: 'umber', doublet: 'ochre', collar_band: null, breeches: 'brown', stockings: 'grey', shoes: null }, prop: 'lantern' }, 312, 147, 0, 'idle', 2);
        face(k, 328, 158);
      },
      cues: [[0, (s) => { s.sound.bed('drone', 0.3, 3); s.sound.bed('wind', 0.3, 2); s.sound.bed('night', 0, 1); s.sound.bed('water', 0, 1); }]],
    },
    {
      name: 'oranje-warande', sky: 'golden', lines: ['intro_oranje_2'], into: 'cross', blend: 1.3,
      focus: [430, 30],
      // over the trees of the lord's hunting park, to the ruin of the old castle
      cam: { path: [[372, 24, 92], [392, 30, 70]], look: [[426, 6, 18], [428, 8, 16]], fov: [46, 42] },
      cast: (s) => s.walk(at(s, { body: 'man', role: 'peasant', wear: { hair_crop: 'h_brown', hat_wide: 'moss', doublet: 'moss', belt: null, breeches: 'brown', stockings: 'grey', boots: null }, prop: 'stick' }, 404, 52, 2.4, 'walk', 3), [[412, 42], [420, 34]], 1.0),
    },
    {
      name: 'oranje-bericht', sky: 'night', lines: ['intro_oranje_3'], into: 'black', blend: 1.0, env: { exposure: 1.2 },
      focus: [300, 160],
      // news from The Hague by night: a rider's letter read out by lantern light
      cam: { path: [[306.5, 1.7, 164.5], [305.4, 1.7, 163.6]], look: [[301.6, 1.5, 160.6], [301.6, 1.5, 160.6]], fov: [40, 34], drift: 0.05 },
      cast: (s) => {
        const a = at(s, CLERK, 301, 160, 0, 'talk', 7);
        const b = at(s, { body: 'man_old', role: 'oldMan', wear: { hair_thin: 'h_grey', beard_pointed: 'h_grey', hat_wide: 'umber', doublet: 'ochre', collar_band: null, breeches: 'brown', stockings: 'grey', shoes: null }, prop: 'lantern' }, 302.5, 161.6, 0, 'idle', 8);
        face(a, 302.5, 161.6);
        face(b, 301, 160);
        flame(s, 302.9, 1.0, 161.1, 5, 12);
      },
      cues: [[0, (s) => { s.sound.bed('night', 0.6, 2); s.sound.bed('drone', 0.35, 3); }], [1, (s) => s.sound.bellFar(110, 0.2)]],
    },
    {
      name: 'oranje-schrijft', sky: 'night', lines: ['intro_oranje_4'], into: 'cut', env: { exposure: 1.2 },
      focus: [425, 136],
      // the drossaard at his door after dark, the town's book under his arm
      cam: { path: [[431, 1.7, 142], [429.6, 1.7, 140.6]], look: [[425.5, 1.7, 136.5], [425.5, 1.7, 136.5]], fov: [40, 34], drift: 0.04 },
      cast: (s) => {
        const dr = at(s, DROSSAARD, 425.5, 136.5, 0, 'look_around', 9);
        face(dr, 431, 142);
        flame(s, 424.5, 1.9, 135.5, 6, 12);
      },
    },
  ];
}

function vrijeShots(): Shot[] {
  return [
    {
      name: 'vrije-weg', sky: 'golden', lines: ['intro_vrije_1'], into: 'black', blend: 1.0, title: title('vrije'),
      focus: [-150, 440],
      // the road outside the Leuvense Poort: a pedlar with his pack, a carter
      cam: { path: [[-164, 1.5, 456], [-161, 1.6, 451]], look: [[-149, 1.5, 438], [-146, 1.8, 432]], fov: [42, 38] },
      cast: (s) => {
        s.walk(at(s, { body: 'man_old', role: 'peasant', wear: { hair_thin: 'h_grey', beard_full: 'h_grey', hat_wide: 'brown', smock: 'russet', belt: null, breeches: 'brown', stockings: 'grey', boots: null }, prop: 'bundle' }, -144, 428, 2.6, 'walk', 2), [[-150, 437], [-156, 446]], 1.1);
        const c = cart();
        const cf = s.thing(c, -139, 420, 2.6);
        s.walk(cf, [[-145, 429], [-151, 438]], 1.1);
        s.walk(at(s, SMUGGLER, -138.2, 418.2, 2.6, 'walk', 3), [[-144.2, 427.2], [-150.2, 436.2]], 1.1);
      },
      cues: [[0, (s) => { s.sound.bed('wind', 0.4, 2); s.sound.bed('drone', 0.2, 3); s.sound.bed('night', 0, 1); s.sound.bed('water', 0, 1); }], [1, (s) => s.sound.creak()], [3.2, (s) => s.sound.creak()], [5.8, (s) => s.sound.creak()]],
    },
    {
      name: 'vrije-bleek', sky: 'golden', lines: ['intro_vrije_2'], into: 'cross', blend: 1.3,
      focus: [880, 90],
      // the bleaching fields outside the Koepoort: long strips of linen white on the grass
      cam: { path: [[852, 3, 70], [858, 5, 78]], look: [[886, 0.5, 100], [890, 0.5, 110]], fov: [46, 42] },
      cast: (s) => {
        const b = bleach(9, 16);
        b.position.set(872, 0, 100);
        b.rotation.y = 0.3;
        s.group.add(b);
        const b2 = bleach(7, 14);
        b2.position.set(880, 0, 124);
        b2.rotation.y = 0.25;
        s.group.add(b2);
        s.walk(at(s, 'peasant_woman', 874, 90, 1.2, 'walk', 4), [[884, 94], [894, 96]], 0.9);
      },
    },
    {
      name: 'vrije-smokkel', sky: 'night', lines: ['intro_vrije_3'], into: 'black', blend: 1.0, env: { exposure: 1.3 },
      focus: [-150, 360],
      // night: the brandy cart goes round the Leuvense Poort, a shuttered lantern, the town wall black beside it
      cam: { path: [[-170, 1.2, 350], [-166, 1.4, 354]], look: [[-150, 1.2, 365], [-146, 1.4, 368]], fov: [42, 38] },
      cast: (s) => {
        const cf = s.thing(cart(), -158, 356, 1.9);
        s.walk(cf, [[-148, 364], [-140, 372]], 1.0);
        const a = at(s, SMUGGLER, -159, 354.8, 1.9, 'walk', 8);
        s.walk(a, [[-149.5, 362.6], [-141.5, 370.6]], 1.0);
        const b = at(s, { ...SMUGGLER, wear: { ...SMUGGLER.wear, hat_wide: null, hair_crop: 'h_red', beard_full: 'h_red' }, prop: 'lantern' }, -157, 357.5, 1.9, 'walk', 9);
        s.walk(b, [[-147, 365.5], [-139, 373.5]], 1.0);
        if (b) {
          const l = s.light(new THREE.PointLight('#ffa040', 3, 9, 1.6), 0, 0, 0);
          s.every(() => l.position.set(b.x, 1.0, b.z));
        }
      },
      cues: [[0, (s) => { s.sound.bed('night', 0.7, 2); s.sound.bed('drone', 0.35, 3); }], [1.2, (s) => s.sound.creak()], [3.6, (s) => s.sound.creak()], [6.0, (s) => s.sound.creak()]],
    },
    {
      name: 'vrije-galg', sky: 'storm', lines: ['intro_vrije_4'], into: 'black', blend: 1.0, env: { exposure: 0.95 },
      focus: [-1745, 2110],
      // the gallows on the Galgenberg, beside the road
      cam: { path: [[-1725, 1.3, 2098], [-1729, 1.6, 2101]], look: [[-1745, 3.4, 2112], [-1745, 3.6, 2112]], fov: [40, 36] },
      cast: (s) => {
        const g = gallows();
        g.position.set(-1745, 0, 2112);
        g.rotation.y = -0.96;
        s.group.add(g);
      },
      cues: [[0, (s) => { s.sound.bed('wind', 0.8, 2); s.sound.bed('night', 0, 1); }], [0.5, (s) => s.sound.creak()]],
    },
  ];
}

/** The film for a party. */
export function makeIntro(f: IntroFaction, c: IntroContext): Film {
  const body = f === 'gilden' ? gildenShots() : f === 'kerk' ? kerkShots() : f === 'kroon' ? kroonShots() : f === 'oranje' ? oranjeShots() : vrijeShots();
  const shots = [...openShots(c), ...body, ...closeShots(c)];
  const lines: Record<string, Line> = {};
  for (const [id, [who, text]] of Object.entries(INTRO_LINES)) lines[id] = { id, who, text };
  return { id: `intro_${f}`, shots, lines };
}
