// The front end: title, what this is, and making your character. Research
// rules (docs/research): get players in fast, let every choice matter, set
// the hook before the first flight. Character creation is one screen in the
// manner of World of Warcraft: looks on the left, who you are on the right,
// your hero in the middle, a lore panel that teaches the world, and one
// button. Every choice has a default, so BEGIN works at once.

import { BACKGROUNDS, type BackgroundId, ORIGINS, type OriginId, STAT_NAMES, type Stat, Sheet, uniqueGear, gearLines } from '../rpg/character';
import { FACTIONS, type FactionId, tierOf } from '../rpg/factions';
import {
  CLOAKS, DRAGONS, DYES, EYES, FACES, FACES_BY_SEX, HAIR_COLORS, MARKS, MORPH_NAMES, NAMES, type Sex, beardName, buildName, faceName, hairName,
  headwearName, headwearOf, heroOptions, heroSpec, mantleName, outfitsFor,
} from '../rpg/look';
import type { HeroData } from '../rpg/state';
import type { TownsfolkKit } from '../rpg/townsfolk';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BELLIES, DRAGON_EYES, HORNS, SCALES } from '../player/scales';
import { HeroPreview } from './preview';
import { hint, nav } from './nav';

/** What creation decides; the rest of HeroData starts fresh. */
export type NewHero = Pick<HeroData, 'name' | 'origin' | 'cloak' | 'dragon' | 'sex' | 'build' | 'face' | 'skin' | 'hair' | 'hairColor' | 'beard' | 'hat' | 'background' | 'faction' | 'scales'
  | 'height' | 'eyes' | 'mark' | 'outfit' | 'main' | 'accent' | 'headwear' | 'mantle' | 'dragonBelly' | 'dragonEyes' | 'dragonHorns'>;

export type FrontEndResult = { mode: 'continue' } | { mode: 'new'; hero: NewHero };

export interface SaveSummary { name: string; level: number; origin: string; sex?: string; background?: string }

/** The standing your first loyalty starts at (the "Bekende" tier). */
export const FIRST_LOYALTY = 12;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const asset = (p: string) => new URL(p, document.baseURI).toString();

// Two slides, about twenty seconds: the hook and you. The rest of the story is told in play.
const SLIDES: [string, string, string][] = [
  ['kludde-river-remembers', 'Diest, 1650', 'One Sunday the bells of Sint-Sulpitius fall silent. The clappers are gone from a locked tower. Wet river weed lies on the bell frame, and the print of claws.'],
  ['root-oak-forbidden-pilgrimage', 'You', 'You have no land, no title and no master. You had a little sister. Now you have a dragon, who crept out of the Demer reeds one night and chose you.'],
];

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const DIFF = ['', 'easy', 'moderate', 'hard'];
const dots = (n: number) => '●'.repeat(n) + '○'.repeat(3 - n);
/** approximate painted skin, for the swatch next to the tone */
const SKIN_BASE = [0.88, 0.69, 0.56];
/** a first hair style that shows what the kit can do: long hair for him, the 1640s ringlets for her */
const defaultHair = (o: { hair: Record<'m' | 'f', (string | null)[]> }, sex: 'm' | 'f') => (['hair_long', 'hair_f_curls'].find((x) => o.hair[sex].includes(x)) ?? o.hair[sex][0]);

type Tab = 'body' | 'face' | 'hair' | 'clothes' | 'dragon';
const TABS: [Tab, string][] = [['body', 'Body'], ['face', 'Face'], ['hair', 'Hair'], ['clothes', 'Clothes'], ['dragon', 'Dragon']];
const TAB_LORE: Record<Tab, [string, string]> = {
  body: ['Body', 'Man or woman, your build, your height and your skin. What life has left on your face is chosen here too.'],
  face: ['Face', 'Choose a face, then fine-tune it: nose, jaw, chin, cheeks, eyes and mouth.'],
  hair: ['Hair', 'Your hairstyle, its colour and what you put on your head.'],
  clothes: ['Clothes', 'Every class has its own clothes. Choose what you wear, in which colours, and your travelling cloak.'],
  dragon: ['Your dragon', 'The dragon that chose you. Choose the colour of his scales, his belly and wings, his eyes and his horns.'],
};
const LOOK: Record<string, [string, string]> = {
  sex: ['Man or woman', "In the Brabant of 1650 a woman does not carry a sword. A woman with a dragon asks nobody's leave."],
  build: ['Build', 'It changes nothing about how you fight. Only how you stand in a doorway.'],
  height: ['Height', 'A head taller or shorter than the rest of the market. It changes nothing about your powers.'],
  skin: ['Skin', 'From pale to weathered. Whoever works the field wears the weather on their face.'],
  mark: ['Mark', 'A scar from a knife fight, freckles from the sun, an eyepatch, or a face that has seen a lot of wind.'],
  face: ['Face', 'Nose, jaw, chin, cheeks, eyes, mouth. Every face in Diest is made of the same features.'],
  eyes: ['Eyes', 'Brown, blue, grey or green. Or leave them as the painter made them.'],
  fine: ['Fine-tune', 'Slide each feature of your face until you know yourself. You see it on your character at once.'],
  hair: ['Hairstyle', 'In 1650 men often wear their hair long, to the shoulder. Women pin it up, braid it, or let the curls fall along the face.'],
  hairColor: ['Hair colour', 'Your beard takes that colour too.'],
  beard: ['Beard', 'A moustache or pointed beard is the fashion in 1650. Look at the portraits of Van Dyck.'],
  hat: ['Headwear', 'Hat, cap or nothing. Whoever goes out without a hat in 1650 is poor, in a hurry or up to something.'],
  outfit: ['Outfit', 'Every class has three kinds of clothes, and men and women each have their own cut.'],
  main: ['Main colour', 'Dye costs money. Madder gives red, woad blue, weld yellow. Whoever does not pay wears the colour of the sheep.'],
  accent: ['Accent colour', 'The colour of the underskirt, the cuffs, the ribbons and the breeches. Choose something to match your main colour, or not.'],
  mantle: ['Mantle', 'Calf-length, hip-length, or long with a hood down your back. On the dragon it streams out behind you.'],
  cloak: ['Cloak colour', 'Dye costs money. Madder gives red, woad blue. Whoever does not pay wears the colour of the sheep.'],
  dragonScales: ['Scales', 'Dragons in this game are invented, and so are their colours. Choose what you want to see beneath you the whole journey.'],
  dragonBelly: ['Belly and membrane', 'The belly plates and the membrane between the fingers of his wings. When he flies over you, this is the colour you mostly see.'],
  dragonEyes: ['Eyes', 'His eyes glow in the dark. Choose the colour you see above the Demer at night.'],
  dragonHorns: ['Horns', 'A dragon from the reeds has horns like an old ram, or a crown of spikes. Nobody dares ask him why.'],
  random: ['Random', 'A different look in one click. Class, origin, faction and your dragon stay as they are.'],
};
const OUTFIT_LORE: Record<string, string> = {
  'Buff Coat': 'A buff-leather coat over the doublet, and the red sash of the Spanish army. This is how a guildsman goes about in 1650.',
  Musketeer: 'A doublet with a white collar and a bandolier of powder charges over the shoulder.',
  "Rider's Casaque": 'A loose casaque to the thigh, with wide cuffs at the sleeves. Riders wear it over the doublet.',
  'Riding Jacket': 'A fitted jacket with a short skirt, the skirt pinned up over the underskirt, and boots. You can ride and walk in it.',
  'Bodice and Sash': 'A laced bodice with a white collar, the skirt pinned up over the underskirt, and the red sash at the waist.',
  'Jacket and Long Skirt': 'A jacket with a broad collar over a skirt to the ankles. Neat enough for church, sturdy enough for the road.',
  Doublet: 'A doublet with a white collar and a flat cap. The clothes of a craftsman with a settled place in town.',
  'Leather Jerkin': 'A sleeveless leather jerkin over the doublet. Whoever works in a tower tears no good wool on the beams.',
  Smock: 'A linen smock with a belt, as the farmhands and farmers wear it.',
  'Bodice and Apron': 'A laced bodice with a neckerchief, a pinned-up skirt and an apron. This is how the women stand in the market of Diest.',
  'Town Jacket': 'A dark jacket with a broad white collar and a long skirt. The clothes of a burgher\'s wife.',
  'Work Dress': 'A bodice with a neckerchief, a long skirt and an apron, and clogs on the feet.',
  Bandolier: 'A dark doublet, a wide felt hat and a bandolier. On the heath nobody asks where that came from.',
  'Smock and Boots': 'A grey smock and high boots. You look like a carter, and that is the point.',
  'Dark Casaque': 'A dark casaque over the doublet. It keeps the rain out and hides what you carry under your arm.',
  'Travel Jacket': 'A jacket with a short skirt, a pinned-up skirt and boots. Made to walk far and be noticed little.',
  'Bodice and Boots': 'A bodice with a neckerchief, an apron over the skirt and sturdy boots beneath.',
  'Dark Jacket': 'A black jacket with a white collar, a long skirt and a fur cap. This is how a widow looks, and nobody looks at a widow for long.',
};

/** "Kempen-born · Smuggler" and the like, for the title screen and the character panel. */
export function heroLine(h: { sex?: string; background?: string; origin: string }) {
  const bg = BACKGROUNDS[h.background as BackgroundId];
  const cls = ORIGINS[h.origin as OriginId]?.name ?? '';
  return bg ? `${bg.name[h.sex === 'f' ? 1 : 0]} · ${cls}` : cls;
}

export function runFrontEnd(root: HTMLElement, save: SaveSummary | null, onFirstGesture: () => void, kitP: Promise<TownsfolkKit | null> = Promise.resolve(null), dragonP: Promise<GLTF | null> = Promise.resolve(null), openSettings?: () => void): Promise<FrontEndResult> {
  const el = document.createElement('div');
  el.className = 'frontend';
  root.appendChild(el);
  let gestured = false;
  const gesture = () => {
    if (!gestured) {
      gestured = true;
      onFirstGesture();
    }
  };
  el.addEventListener('pointerdown', gesture);
  window.addEventListener('keydown', gesture, { once: true });

  return new Promise((resolve) => {
    let preview: HeroPreview | null = null;
    /** which page is up, for Escape / B (and the confirm question over the title) */
    let page: 'title' | 'promise' | 'promise-back' | 'create' = 'title';
    let confirmEl: HTMLElement | null = null;
    /** creation's own commands for the keyboard and the pad (set while it is up) */
    let ccHandle: ((cmd: string, f: HTMLElement | null) => boolean) | null = null;
    // the keyboard and the gamepad: the same navigation as every other screen (nav.ts)
    nav.add({
      layer: 10,
      active: () => el.isConnected && !el.classList.contains('out'),
      root: () => confirmEl ?? el,
      // the safe answer first in the question; in creation the first tab (BEGIN is one press away, not the first)
      first: () => confirmEl?.querySelector<HTMLElement>('[data-go="no"]') ?? el.querySelector<HTMLElement>('.fe-menu button, .cc-tabs button.on'),
      back: () => {
        if (confirmEl) return closeConfirm();
        if (page === 'promise-back') title();
        else if (page === 'create') (save ? title() : promise(false));
      },
      handle: (cmd, f) => (page === 'create' && !confirmEl && ccHandle ? ccHandle(cmd, f) : false),
    });
    const closeConfirm = () => {
      confirmEl?.remove();
      confirmEl = null;
      nav.refocus();
      // back on NIEUW SPEL, where the question came from
      requestAnimationFrame(() => el.querySelector<HTMLElement>('[data-go="new"]')?.focus());
    };
    const done = (r: FrontEndResult) => {
      preview?.dispose();
      preview = null;
      ccHandle = null;
      el.classList.add('out');
      setTimeout(() => el.remove(), 900);
      resolve(r);
    };

    // ---------------------------------------------------------------- what this is (first visit)
    const promise = (back: boolean) => {
      page = back ? 'promise-back' : 'promise';
      ccHandle = null;
      el.innerHTML = `<div class="fe-title fe-promise" style="background-image:url(${asset('ui/intro/flight-demer-valley.jpg')})">
        <div class="fe-shade"></div>
        <div class="fe-center">
          <h1>BELFORT</h1>
          <h2>AN ADVENTURE IN BRABANT · 1650</h2>
          <div class="fe-cols">
            <div><h3>THIS IS</h3>
              <p><b>An adventure.</b> You fly a dragon over Brabant, land where you please and walk into the town on foot.</p>
              <p><b>Diest, 1650.</b> The streets, the gates and the churches lie where they lay then.</p>
              <p><b>Full of old folk tales.</b> The Kludde, will-o'-the-wisps, and bells that can do more than ring.</p>
            </div>
            <div><h3>THIS IS NOT</h3>
              <p><b>A history lesson.</b> In the Kroniek you read what truly happened and what we made up.</p>
              <p><b>A flight simulator.</b> The dragon flies itself. You only have to steer.</p>
              <p><b>A finished game.</b> This is the first chapter. It takes about an hour.</p>
            </div>
          </div>
          <div class="fe-menu"><button data-go="ok">${back ? 'BACK' : 'BEGIN'}</button>${!back && openSettings ? '<button data-go="settings">SETTINGS</button>' : ''}</div>
          <div class="fe-small">Play with mouse and keyboard or a gamepad. Turn the sound on. Your progress is saved on this device.</div>
          <div class="fe-keys">${hint('Arrows or Tab to choose · Enter to confirm', 'D-pad to choose · A to confirm')}</div>
        </div>
      </div>`;
      nav.refocus();
      el.querySelector('[data-go="ok"]')!.addEventListener('click', () => (back ? title() : create()));
      el.querySelector('[data-go="settings"]')?.addEventListener('click', () => openSettings?.());
    };

    // ---------------------------------------------------------------- title
    const title = () => {
      page = 'title';
      ccHandle = null;
      el.innerHTML = `<div class="fe-title" style="background-image:url(${asset('ui/intro/flight-demer-valley.jpg')})">
        <div class="fe-shade"></div>
        <div class="fe-center">
          <h1>BELFORT</h1>
          <h2>THE DUCHY OF BRABANT · 1650</h2>
          <div class="fe-menu">
            ${save ? `<button data-go="continue">CONTINUE<small>${esc(save.name)} · ${esc(heroLine(save))} · level ${save.level}</small></button>` : ''}
            <button data-go="new">NEW GAME</button>
            ${openSettings ? '<button data-go="settings">SETTINGS</button>' : ''}
          </div>
          <div class="fe-small">Best played with mouse and keyboard or a gamepad, with the sound on · <button class="fe-link" data-go="what">what is this?</button></div>
          <div class="fe-keys">${hint('Arrows or Tab to choose · Enter to confirm', 'D-pad to choose · A to confirm')}</div>
        </div>
        <div class="fe-credit">Town plan after OpenStreetMap contributors (ODbL) and the 1777 Ferraris map (Digitaal Vlaanderen)</div>
      </div>`;
      el.querySelector('[data-go="continue"]')?.addEventListener('click', () => done({ mode: 'continue' }));
      el.querySelector('[data-go="what"]')!.addEventListener('click', () => promise(true));
      el.querySelector('[data-go="settings"]')?.addEventListener('click', () => openSettings?.());
      el.querySelector('[data-go="new"]')!.addEventListener('click', () => {
        if (!save) return create(); // the story is told in the prologue, which you play
        // a returning player: the game's own question, in the game's own frame (not the browser's)
        confirmEl?.remove();
        confirmEl = document.createElement('div');
        confirmEl.className = 'fe-confirm';
        confirmEl.innerHTML = `<div class="fe-confirm-in" role="dialog" aria-modal="true">
          <h3>NEW GAME</h3>
          <p>Start a new game? Your current character, ${esc(save.name)}, will be lost.</p>
          <div class="fe-menu"><button data-go="yes">START NEW GAME</button><button data-go="no">BACK</button></div>
        </div>`;
        el.querySelector('.fe-title')!.appendChild(confirmEl);
        confirmEl.querySelector('[data-go="yes"]')!.addEventListener('click', () => {
          confirmEl?.remove();
          confirmEl = null;
          create();
        });
        confirmEl.querySelector('[data-go="no"]')!.addEventListener('click', closeConfirm);
        confirmEl.addEventListener('click', (e) => {
          if (e.target === confirmEl) closeConfirm();
        });
        nav.refocus();
      });
      nav.refocus();
    };

    // ---------------------------------------------------------------- story (kept for a later trailer; creation skips it)
    let keyHandler: ((e: KeyboardEvent) => void) | null = null;
    const story = (i: number) => {
      if (i >= SLIDES.length) {
        if (keyHandler) window.removeEventListener('keydown', keyHandler);
        return create();
      }
      const [img, head, text] = SLIDES[i];
      el.innerHTML = `<div class="fe-slide">
        <div class="fe-img" style="background-image:url(${asset(`ui/intro/${img}.jpg`)})"></div>
        <div class="fe-shade"></div>
        <div class="fe-story"><div class="fe-head">${esc(head)}</div><p>${esc(text)}</p></div>
        <div class="fe-dots">${SLIDES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="fe-next">CLICK OR SPACE · CONTINUE</div>
        <button class="fe-skip">SKIP</button>
      </div>`;
      const slide = el.querySelector('.fe-slide')!;
      slide.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('fe-skip')) story(SLIDES.length);
        else story(i + 1);
      });
      if (keyHandler) window.removeEventListener('keydown', keyHandler);
      keyHandler = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); story(i + 1); }
        if (e.code === 'Escape') story(SLIDES.length);
      };
      window.addEventListener('keydown', keyHandler);
    };
    void story;

    // ---------------------------------------------------------------- creation
    const create = () => {
      page = 'create';
      let kit: TownsfolkKit | null = null;
      let kitState: 'loading' | 'ok' | 'none' = 'loading';
      let opts = heroOptions(null);
      const h: NewHero = {
        name: pick(NAMES.m), origin: 'schutter', cloak: CLOAKS[0][0], dragon: pick(DRAGONS),
        sex: 'm', build: opts.bodies.m[1] ?? opts.bodies.m[0], face: { ...FACES[0][1] }, skin: 1, hair: 'hair_long', hairColor: 'h_brown', beard: 'moustache', hat: true,
        background: 'diest', faction: 'gilden', scales: 'demer',
        height: 1, eyes: null, mark: null, outfit: 0, mantle: 'mantle', dragonBelly: null, dragonEyes: null, dragonHorns: 'gewoon',
      };
      let nameTouched = false;
      /** what the lore panel shows when nothing is hovered: the last thing chosen */
      let pinned: string = 'origin:schutter';
      let tab: Tab = 'body';

      const back = `radial-gradient(ellipse 55% 65% at 50% 40%, rgba(130, 78, 32, 0.38), transparent 70%), linear-gradient(rgba(10, 7, 4, 0.84), rgba(8, 6, 4, 0.93)), url(${asset('ui/intro/diest-living-town.jpg')})`;
      el.innerHTML = `<div class="cc" style="background-image:${back}">
        <div class="cc-stage">
          <div class="cc-view"><div class="cc-wait">The tailor is looking for his needles…</div></div>
          <div class="cc-hint">${hint('Drag to rotate · arrows to choose, Enter to select, Esc to go back', 'D-pad to choose · A to select · LB and RB: other tab · X: random · B to go back')}</div>
          <div class="cc-lore" aria-live="polite"></div>
        </div>
        <div class="cc-left">
          <div class="cc-tabs" role="tablist">${TABS.map(([id, t]) => `<button role="tab" data-tab="${id}" data-lore="tab:${id}">${esc(t)}</button>`).join('')}</div>
          <div class="cc-rows"></div>
          <button class="cc-random" data-lore="look:random">⚄ RANDOM</button>
          <h3>ATTRIBUTES</h3>
          <div class="cc-stats"></div>
        </div>
        <div class="cc-right">
          <h3>ORIGIN</h3><div class="cc-list cc-bgs"></div>
          <h3>CLASS</h3><div class="cc-list cc-classes"></div>
          <h3>FACTION</h3><div class="cc-list cc-factions"></div>
        </div>
        <div class="cc-bottom">
          <label class="cc-field" data-lore="name:you"><span>YOUR NAME</span><div><input class="cc-name" maxlength="18" list="cc-names" value="${esc(h.name)}" spellcheck="false"><button class="cc-dice" data-dice="name" title="Another name">⚄</button></div></label>
          <datalist id="cc-names"></datalist>
          <label class="cc-field" data-lore="name:dragon"><span>YOUR DRAGON</span><div><input class="cc-dragon" maxlength="18" value="${esc(h.dragon)}" spellcheck="false"><button class="cc-dice" data-dice="dragon" title="Another name">⚄</button></div></label>
          <button class="cc-back">BACK</button>
          <button class="cc-go">BEGIN</button>
        </div>
      </div>`;
      const $ = <T extends HTMLElement>(q: string) => el.querySelector<T>(q)!;
      const nameIn = $<HTMLInputElement>('.cc-name');
      const dragonIn = $<HTMLInputElement>('.cc-dragon');
      const loreEl = $('.cc-lore');
      const view = $('.cc-view');

      // ------------------------------------------------ the lore panel
      const lore = (key: string): string => {
        const [kind, id] = key.split(':');
        const fem = h.sex === 'f';
        if (kind === 'origin') {
          const o = ORIGINS[id as OriginId];
          const w = uniqueGear(o.start);
          return `<div class="k">CLASS · ${dots(o.difficulty)} ${DIFF[o.difficulty]}</div>
            <h4>${esc(o.name)} <em>${esc(o.role)}</em></h4>
            <p>${esc(o.lore)}</p>
            <div class="cc-skills">
              <div><b>${hint('Right mouse', 'LT')} · ${esc(o.skill.name)}</b>${esc(o.skill.text)}</div>
              <div><b>${hint('R', 'B')} · ${esc(o.skill2.name)}</b><i>from level ${o.skill2.level}.</i> ${esc(o.skill2.text)}</div>
            </div>
            ${w ? `<div class="m"><b>Starts with</b> ${esc(w.name)}, ${esc(gearLines(w).join(', '))}.</div>` : ''}`;
        }
        if (kind === 'bg') {
          const b = BACKGROUNDS[id as BackgroundId];
          return `<div class="k">ORIGIN · ${esc(b.place)}</div>
            <h4>${esc(b.name[fem ? 1 : 0])}</h4>
            <p>${esc(b.lore)}</p>
            <div class="m"><b>${esc(b.perkName)}</b> ${esc(b.perk)}</div>
            <div class="q">${b.said.map((x) => `«${esc(x)}»`).join(' ')}</div>`;
        }
        if (kind === 'faction') {
          const f = FACTIONS[id as FactionId];
          return `<div class="k">FACTION · first loyalty</div>
            <h4><i class="cc-dot" style="background:${f.color}"></i>${esc(f.name)} <em>${esc(f.tagline)}</em></h4>
            <p>${esc(f.text)}</p>
            <div class="m">You start with them as <b>${tierOf(FIRST_LOYALTY).name}</b>. The other factions do not know you yet. What you do changes that.</div>`;
        }
        if (kind === 'name' && id === 'dragon')
          return `<div class="k">THE DRAGON</div><h4>${esc(dragonIn.value || '…')}</h4>
            <p>He crept out of the Demer reeds the night the bells fell silent, and chose you. Why, nobody knows. He may know. He does not say.</p>
            <div class="m"><b>${hint('Left mouse', 'LB')} in the air</b> Dragonfire, where you look.</div>`;
        if (kind === 'name')
          return `<div class="k">YOUR NAME</div><h4>${esc(nameIn.value || '…')}</h4>
            <p>This is how they will call you in Diest: at the market, in the inn, and later, when something goes wrong.</p>
            <div class="m">Type a name of your own, or take one from the list. They are all names you hear in Brabant in 1650.</div>`;
        if (kind === 'tab') {
          const t = TAB_LORE[id as Tab];
          return `<div class="k">APPEARANCE</div><h4>${esc(t[0])}</h4><p>${esc(t[1])}</p>`;
        }
        if (kind === 'outfit') {
          const o = outfits()[Math.min(outfits().length - 1, h.outfit ?? 0)];
          return `<div class="k">CLOTHES · ${esc(ORIGINS[h.origin].name)}</div><h4>${esc(o?.name ?? '')}</h4><p>${esc(OUTFIT_LORE[o?.name ?? ''] ?? LOOK.outfit[1])}</p>`;
        }
        const [t, x] = LOOK[id] ?? ['', ''];
        const k = id.startsWith('dragon') ? 'THE DRAGON' : 'APPEARANCE';
        return `<div class="k">${k}</div><h4>${esc(t)}</h4><p>${esc(x)}</p>`;
      };
      let shown = '';
      const showLore = (key: string) => {
        if (key === shown) return;
        shown = key;
        loreEl.innerHTML = lore(key);
      };
      el.addEventListener('pointerover', (e) => {
        const t = (e.target as HTMLElement).closest<HTMLElement>('[data-lore]');
        showLore(t ? t.dataset.lore! : pinned);
      });
      // the keyboard and the pad: the panel tells about what has the focus
      el.addEventListener('focusin', (e) => {
        const t = (e.target as HTMLElement).closest<HTMLElement>('[data-lore]');
        showLore(t ? t.dataset.lore! : pinned);
      });
      const pin = (key: string) => {
        pinned = key;
        shown = '';
        showLore(key);
      };

      // ------------------------------------------------ the figure
      const full = (): HeroData => ({ ...h, level: 1, xp: 0, hp: 1, gear: {}, bag: [] });
      const refreshFigure = () => {
        if (!preview || !kit) return;
        preview.show(heroSpec(kit, full()));
      };
      const refreshDragon = () => preview?.showDragon(h.scales, h);

      // ------------------------------------------------ appearance rows, by tab
      const rowsEl = $('.cc-rows');
      const tones = (): [number, number, number][] => kit?.m.skinTones ?? new Array(8).fill([1, 1, 1]);
      const toneCss = (t: [number, number, number]) => `rgb(${t.map((v, i) => Math.round(Math.min(1, v * SKIN_BASE[i]) * 255)).join(',')})`;
      const hex = (k: string | null | undefined) => (k ? kit?.colour(k) ?? (k.startsWith('#') ? k : '#777') : '#777');
      const outfits = () => outfitsFor(kit, h.origin, h.sex);
      const outfit = () => outfits()[Math.min(outfits().length - 1, h.outfit ?? 0)];
      const faces = () => FACES_BY_SEX[h.sex];
      const cycle = <T,>(list: readonly T[], cur: T, d: number) => list[(Math.max(0, list.indexOf(cur)) + d + list.length) % list.length];
      type Row =
        | { id: string; label: string; seg: () => [string, string, boolean][] }
        | { id: string; label: string; value: () => string; step: (d: number) => void; off?: () => boolean }
        | { id: string; label: string; swatches: () => [string, string, string, boolean][]; pick: (k: string) => void; wide?: boolean }
        | { id: string; label: string; slider: () => [number, number, number]; set: (v: number) => void; live?: (v: number) => void };
      const morphRows = (): Row[] =>
        Object.entries(kit?.m.faceMorphs ?? {}).map(([name, lim]) => ({
          id: `morph:${name}`, label: MORPH_NAMES[name] ?? name,
          slider: () => [lim.min, lim.max, h.face[name] ?? 0],
          set: (v: number) => { h.face = { ...h.face, [name]: v }; },
          live: (v: number) => preview?.setMorph(name, v),
        }));
      const TAB_ROWS: Record<Tab, () => Row[]> = {
        body: () => [
          { id: 'sex', label: 'Sex', seg: () => [['m', 'Man', h.sex === 'm'], ['f', 'Woman', h.sex === 'f']] },
          { id: 'build', label: 'Build', seg: () => opts.bodies[h.sex].map((b, i) => [b, buildName(b, i), h.build === b]) },
          { id: 'height', label: 'Height', slider: () => [0.92, 1.08, h.height ?? 1], set: (v) => (h.height = v) },
          { id: 'skin', label: 'Skin', swatches: () => tones().map((t, i) => [String(i), `Skin ${i + 1}`, toneCss(t), h.skin === i]), pick: (k) => (h.skin = +k) },
          { id: 'mark', label: 'Mark', value: () => MARKS.find(([k]) => k === (h.mark ?? null))?.[1] ?? 'None', step: (d) => (h.mark = cycle(MARKS.map(([k]) => k), h.mark ?? null, d)) },
        ],
        face: () => [
          { id: 'face', label: 'Face', value: () => faceName(h.face, h.sex), step: (d) => {
            const i = faces().findIndex(([n]) => n === faceName(h.face, h.sex));
            h.face = { ...faces()[(Math.max(i, d > 0 ? -1 : 0) + d + faces().length) % faces().length][1] };
          } },
          { id: 'eyes', label: 'Eyes', swatches: () => EYES.map(([k, n]) => [k ?? '', n, k ?? 'linear-gradient(135deg,#5a3a1e 50%,#4a6e9e 50%)', (h.eyes ?? null) === k]), pick: (k) => (h.eyes = k || null) },
          ...morphRows(),
        ],
        hair: () => [
          { id: 'hair', label: 'Hairstyle', value: () => hairName(h.hair), step: (d) => (h.hair = cycle(opts.hair[h.sex], h.hair, d)) },
          { id: 'hairColor', label: 'Hair colour', swatches: () => HAIR_COLORS.map(([k, n]) => [k, n, hex(k), h.hairColor === k]), pick: (k) => (h.hairColor = k) },
          ...(h.sex === 'm' ? [{ id: 'beard', label: 'Beard', value: () => beardName(h.beard), step: (d: number) => (h.beard = cycle(opts.beards, h.beard, d)) }] : []),
          { id: 'hat', label: 'Headwear', value: () => headwearName(headwearOf(kit, h)), step: (d) => {
            h.headwear = cycle(opts.headwear[h.sex], headwearOf(kit, h), d);
            h.hat = h.headwear !== null;
          } },
        ],
        clothes: () => [
          { id: 'outfit', label: 'Outfit', value: () => outfit()?.name ?? '', step: (d) => {
            h.outfit = ((h.outfit ?? 0) + d + outfits().length) % outfits().length;
            h.headwear = undefined;
            h.hat = true;
            pin('outfit:');
          } },
          { id: 'main', label: 'Main colour', swatches: () => DYES.map(([k, n]) => [k, n, hex(k), (h.main ?? outfit()?.main) === k]), pick: (k) => (h.main = k), wide: true },
          { id: 'accent', label: 'Accent colour', swatches: () => DYES.map(([k, n]) => [k, n, hex(k), (h.accent ?? outfit()?.accent) === k]), pick: (k) => (h.accent = k), wide: true },
          { id: 'mantle', label: 'Mantle', seg: () => opts.mantles.map((m) => [m, mantleName(m), (h.mantle ?? 'mantle') === m]) },
          { id: 'cloak', label: 'Cloak colour', swatches: () => CLOAKS.map(([c, n]) => [c, n, c, h.cloak === c]), pick: (k) => (h.cloak = k) },
        ],
        dragon: () => [
          { id: 'dragonScales', label: 'Scales', swatches: () => SCALES.map((s) => [s.id, s.name, s.swatch, h.scales === s.id]), pick: (k) => (h.scales = k) },
          { id: 'dragonBelly', label: 'Belly and membrane', swatches: () => BELLIES.map((s) => [s.id ?? '', s.name, s.swatch, (h.dragonBelly ?? null) === s.id]), pick: (k) => (h.dragonBelly = k || null) },
          { id: 'dragonEyes', label: 'Eyes', swatches: () => DRAGON_EYES.map((s) => [s.id ?? '', s.name, s.swatch, (h.dragonEyes ?? null) === s.id]), pick: (k) => (h.dragonEyes = k || null) },
          { id: 'dragonHorns', label: 'Horns', value: () => HORNS.find((x) => x.id === (h.dragonHorns ?? 'gewoon'))?.name ?? '', step: (d) => (h.dragonHorns = cycle(HORNS.map((x) => x.id), h.dragonHorns ?? 'gewoon', d)) },
        ],
      };
      let rows: Row[] = [];
      const renderRows = () => {
        rows = TAB_ROWS[tab]();
        el.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
        const morphs = rows.filter((r) => r.id.startsWith('morph:'));
        const one = (r: Row) => {
          let ctl = '';
          if ('seg' in r) ctl = `<div class="cc-seg">${r.seg().map(([k, t, on]) => `<button data-seg="${r.id}" data-k="${k}" class="${on ? 'on' : ''}">${esc(t)}</button>`).join('')}</div>`;
          else if ('step' in r) ctl = `<div class="cc-step${r.off?.() ? ' off' : ''}"><button data-step="${r.id}" data-d="-1" aria-label="previous">‹</button><span>${esc(r.value())}</span><button data-step="${r.id}" data-d="1" aria-label="next">›</button></div>`;
          else if ('swatches' in r) ctl = `<div class="cc-cloaks${r.wide ? ' cc-dyes' : ''}">${r.swatches().map(([k, n, css, on]) => `<button class="cc-sw${on ? ' on' : ''}" data-sw="${r.id}" data-k="${esc(k)}" title="${esc(n)}" style="background:${css}"></button>`).join('')}</div>`;
          else {
            const [lo, hi, v] = r.slider();
            ctl = `<input type="range" class="cc-range" data-range="${r.id}" min="${lo}" max="${hi}" step="0.01" value="${v}" aria-label="${esc(r.label)}">`;
          }
          return `<div class="cc-row${'swatches' in r && r.wide ? ' cc-row-wide' : ''}" data-lore="look:${r.id.startsWith('morph:') ? 'fine' : r.id}"><label>${esc(r.label)}</label>${ctl}</div>`;
        };
        rowsEl.innerHTML =
          rows.filter((r) => !r.id.startsWith('morph:')).map(one).join('') +
          (morphs.length ? `<div class="cc-fine" data-lore="look:fine"><div class="cc-fine-h">Fine-tune</div><div class="cc-fine-g">${morphs.map(one).join('')}</div></div>` : '');
      };
      const changed = (id: string) => {
        if (id.startsWith('dragon')) refreshDragon();
        else if (id === 'cloak') preview?.setCloak(h.cloak);
        else refreshFigure();
        if (id.startsWith('dragon') || id === 'cloak') return;
        renderStats();
      };
      rowsEl.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (!b) return;
        let id = '';
        if (b.dataset.sw) {
          const r = rows.find((x) => x.id === b.dataset.sw)!;
          if ('pick' in r) r.pick(b.dataset.k ?? '');
          id = r.id;
        } else if (b.dataset.seg === 'sex') { setSex(b.dataset.k as Sex); id = 'sex'; }
        else if (b.dataset.seg === 'build') { h.build = b.dataset.k!; id = 'build'; }
        else if (b.dataset.seg === 'mantle') { h.mantle = b.dataset.k!; id = 'mantle'; }
        else if (b.dataset.step) {
          const r = rows.find((x) => x.id === b.dataset.step)!;
          if (!('step' in r) || r.off?.()) return;
          r.step(Number(b.dataset.d));
          id = r.id;
        }
        renderRows();
        changed(id);
      });
      rowsEl.addEventListener('input', (e) => {
        const t = e.target as HTMLInputElement;
        const r = rows.find((x) => x.id === t.dataset.range);
        if (!r || !('slider' in r)) return;
        r.set(+t.value);
        if (r.live) r.live(+t.value);
        else preview?.setScale(+t.value);
      });
      rowsEl.addEventListener('change', (e) => {
        const t = e.target as HTMLInputElement;
        if (t.dataset.range) { renderRows(); refreshFigure(); }
      });
      el.querySelector('.cc-tabs')!.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
        if (!b) return;
        tab = b.dataset.tab as Tab;
        preview?.setFocus(tab === 'face' ? 'face' : tab === 'hair' ? 'head' : tab === 'dragon' ? 'dragon' : 'body');
        pin(`tab:${tab}`);
        renderRows();
      });
      const setSex = (sex: Sex) => {
        if (h.sex === sex) return;
        h.sex = sex;
        h.build = opts.bodies[sex][Math.min(1, opts.bodies[sex].length - 1)];
        h.hair = defaultHair(opts, sex);
        h.beard = sex === 'f' ? null : 'moustache';
        h.face = { ...FACES[0][1] };
        h.outfit = 0;
        h.main = undefined;
        h.accent = undefined;
        h.headwear = undefined;
        h.hat = true;
        if (sex === 'f' && h.mark === 'weathered') h.mark = null;
        if (!nameTouched) nameIn.value = pick(NAMES[sex]);
        fillNames();
        renderLists();
        updateTexts();
      };
      const randomLook = () => {
        const r = Math.random;
        h.build = pick(opts.bodies[h.sex]);
        h.height = Math.round((0.94 + r() * 0.12) * 100) / 100;
        // a preset as the base, then the kit's own variety on top, so no two faces come out alike
        const base = pick(faces())[1];
        const rand = kit ? kit.randomFace(r) : {};
        h.face = {};
        for (const k of new Set([...Object.keys(base), ...Object.keys(rand)])) h.face[k] = Math.round(((base[k] ?? 0) * 0.6 + (rand[k] ?? 0) * 0.7) * 100) / 100;
        h.skin = Math.floor(r() * tones().length);
        h.eyes = r() < 0.25 ? null : pick(EYES.slice(1))[0];
        h.mark = r() < 0.6 ? null : pick(MARKS.slice(1))[0];
        h.hair = pick(opts.hair[h.sex].filter((x) => x !== 'hair_thin'));
        h.hairColor = pick(HAIR_COLORS.slice(0, 9))[0];
        if (h.sex === 'm') h.beard = pick(opts.beards);
        h.outfit = Math.floor(r() * outfits().length);
        h.headwear = r() < 0.3 ? null : pick(opts.headwear[h.sex].filter((x) => x));
        h.hat = h.headwear !== null;
        const dyes = DYES.map(([k]) => k);
        h.main = pick(dyes);
        h.accent = pick(dyes.filter((d) => d !== h.main));
        h.mantle = pick(opts.mantles);
        h.cloak = pick(CLOAKS)[0];
        renderRows();
        refreshFigure();
        renderStats();
      };
      $('.cc-random').addEventListener('click', randomLook);

      // ------------------------------------------------ who you are
      const renderLists = () => {
        const fem = h.sex === 'f';
        $('.cc-bgs').innerHTML = (Object.keys(BACKGROUNDS) as BackgroundId[])
          .map((id) => { const b = BACKGROUNDS[id]; return `<button class="cc-opt${h.background === id ? ' on' : ''}" data-bg="${id}" data-lore="bg:${id}"><b>${esc(b.name[fem ? 1 : 0])}</b><small>${esc(b.perk.replace(/\.$/, ''))}</small></button>`; })
          .join('');
        $('.cc-classes').innerHTML = (Object.keys(ORIGINS) as OriginId[])
          .map((id) => { const o = ORIGINS[id]; return `<button class="cc-opt${h.origin === id ? ' on' : ''}" data-origin="${id}" data-lore="origin:${id}"><b>${esc(o.name)}</b><small>${esc(o.tagline)} <span class="cc-diff" title="difficulty">${dots(o.difficulty)}</span></small></button>`; })
          .join('');
        $('.cc-factions').innerHTML = (Object.keys(FACTIONS) as FactionId[])
          .map((id) => { const f = FACTIONS[id]; return `<button class="cc-opt${h.faction === id ? ' on' : ''}" data-faction="${id}" data-lore="faction:${id}"><b><i class="cc-dot" style="background:${f.color}"></i>${esc(f.name.replace(/^De /, ''))}</b><small>${esc(f.tagline)}</small></button>`; })
          .join('');
      };
      el.querySelector('.cc-right')!.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (!b) return;
        if (b.dataset.bg) { h.background = b.dataset.bg as BackgroundId; pin(`bg:${h.background}`); }
        else if (b.dataset.origin) {
          h.origin = b.dataset.origin as OriginId;
          h.main = undefined;
          h.accent = undefined;
          h.headwear = undefined;
          h.hat = true;
          pin(`origin:${h.origin}`);
          renderRows();
          refreshFigure();
        }
        else if (b.dataset.faction) { h.faction = b.dataset.faction as FactionId; pin(`faction:${h.faction}`); }
        renderLists();
        renderStats();
      });

      // ------------------------------------------------ what it adds up to
      const renderStats = () => {
        const sheet = new Sheet({ ...full(), gear: { wapen: uniqueGear(ORIGINS[h.origin].start) ?? undefined } });
        const d = sheet.derived();
        const bonus = BACKGROUNDS[h.background].bonus;
        $('.cc-stats').innerHTML = (['kracht', 'klank', 'list', 'taaiheid'] as Stat[])
          .map((k) => `<div class="cc-st" data-lore="origin:${h.origin}"><span>${STAT_NAMES[k]}</span><i><em style="width:${Math.min(100, d[k] * 9)}%"></em></i><b>${d[k]}${bonus[k] ? '<sup>+</sup>' : ''}</b></div>`)
          .join('') +
          `<div class="cc-derived"><span>Health <b>${d.maxHp}</b></span><span>Armour <b>${d.armor}</b></span><span>Critical <b>${Math.round(d.crit)}%</b></span></div>`;
      };

      // ------------------------------------------------ names, begin
      const fillNames = () => {
        $('#cc-names').innerHTML = NAMES[h.sex].map((n) => `<option value="${esc(n)}">`).join('');
      };
      const updateTexts = () => {
        if (shown.startsWith('name:') || shown.startsWith('bg:')) { const k = shown; shown = ''; showLore(k); }
      };
      nameIn.addEventListener('input', () => { nameTouched = true; updateTexts(); });
      dragonIn.addEventListener('input', updateTexts);
      el.querySelectorAll<HTMLButtonElement>('[data-dice]').forEach((b) =>
        b.addEventListener('click', () => {
          if (b.dataset.dice === 'name') { nameIn.value = pick(NAMES[h.sex].filter((n) => n !== nameIn.value)); nameTouched = false; }
          else dragonIn.value = pick(DRAGONS.filter((n) => n !== dragonIn.value));
          updateTexts();
        }),
      );
      const begin = () => {
        h.name = nameIn.value.trim() || pick(NAMES[h.sex]);
        h.dragon = dragonIn.value.trim() || pick(DRAGONS);
        if (!opts.hair[h.sex].includes(h.hair)) h.hair = opts.hair[h.sex][0];
        done({ mode: 'new', hero: { ...h, face: { ...h.face } } });
      };
      $('.cc-go').addEventListener('click', begin);
      // back to where you came from: the title (a returning player keeps the game they had), or the first page
      $('.cc-back').addEventListener('click', () => (save ? title() : promise(false)));
      // Enter presses what has the focus (nav.ts); only in a name field does it mean BEGIN.
      // LB / RB change the appearance tab; left and right on a ‹ › stepper change its value.
      ccHandle = (cmd, f) => {
        if (cmd === 'ok' && (f === nameIn || f === dragonIn)) {
          begin();
          return true;
        }
        if (cmd === 'prev' || cmd === 'next') {
          const i = TABS.findIndex(([id]) => id === tab);
          const nt = TABS[(i + (cmd === 'next' ? 1 : -1) + TABS.length) % TABS.length][0];
          el.querySelector<HTMLElement>(`[data-tab="${nt}"]`)?.click();
          return true;
        }
        if ((cmd === 'left' || cmd === 'right') && f?.dataset.step) {
          el.querySelector<HTMLElement>(`[data-step="${f.dataset.step}"][data-d="${cmd === 'right' ? 1 : -1}"]`)?.click();
          return true;
        }
        if (cmd === 'x') {
          randomLook();
          return true;
        }
        return false;
      };
      nav.refocus();

      // ------------------------------------------------ first paint, then the figure when the kit is in
      renderRows();
      renderLists();
      renderStats();
      fillNames();
      pin(pinned);
      preview = new HeroPreview(view, () => loreEl.offsetHeight + 10, [loreEl]);
      // without a live figure (no kit, no second WebGL context) the painted rider stands in
      const flat = (on: boolean) => {
        view.classList.toggle('cc-flat', on);
        view.style.backgroundImage = on ? `url(${asset('ui/intro/rider-guild-equipment.jpg')})` : '';
      };
      flat(!preview.ok);
      void dragonP.then((d) => {
        if (!preview) return;
        preview.setDragon(d);
        refreshDragon();
      });
      void kitP.then((k) => {
        if (!preview) return; // creation already over
        kit = k;
        kitState = k ? 'ok' : 'none';
        view.classList.toggle('cc-ready', kitState === 'ok');
        flat(kitState === 'none' || !preview.ok);
        opts = heroOptions(k);
        if (!opts.bodies[h.sex].includes(h.build)) h.build = opts.bodies[h.sex][Math.min(1, opts.bodies[h.sex].length - 1)];
        if (!opts.hair[h.sex].includes(h.hair)) h.hair = defaultHair(opts, h.sex);
        if (!opts.beards.includes(h.beard)) h.beard = opts.beards.find((b) => b) ?? null;
        if (!opts.mantles.includes(h.mantle ?? 'mantle')) h.mantle = opts.mantles[0];
        preview.setKit(k);
        renderRows();
        refreshFigure();
      });
      (window as unknown as { belfortCreation?: object }).belfortCreation = { h, random: randomLook, tab: (t: Tab) => (el.querySelector(`[data-tab="${t}"]`) as HTMLElement | null)?.click(), refresh: () => { renderRows(); refreshFigure(); refreshDragon(); }, preview: () => preview };
    };

    // a first-time visitor is told what this is before anything else; a returning one goes to the title
    if (save) title();
    else promise(false);
  });
}
