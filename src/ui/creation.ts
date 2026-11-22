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
  ['kludde-river-remembers', 'Diest, anno 1650', 'Op een zondag zwijgen de klokken van Sint-Sulpitius. De klepels zijn weg uit een gesloten toren. Op de klokkenstoel ligt nat rivierwier, en staat de afdruk van klauwen.'],
  ['root-oak-forbidden-pilgrimage', 'Jij', 'Je hebt geen land, geen titel en geen meester. Je had een zusje. Nu heb je een draak, die op een nacht uit het riet van de Demer kroop en jou koos.'],
];

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const DIFF = ['', 'eenvoudig', 'gemiddeld', 'lastig'];
const dots = (n: number) => '●'.repeat(n) + '○'.repeat(3 - n);
/** approximate painted skin, for the swatch next to the tone */
const SKIN_BASE = [0.88, 0.69, 0.56];
/** a first hair style that shows what the kit can do: long hair for him, the 1640s ringlets for her */
const defaultHair = (o: { hair: Record<'m' | 'f', (string | null)[]> }, sex: 'm' | 'f') => (['hair_long', 'hair_f_curls'].find((x) => o.hair[sex].includes(x)) ?? o.hair[sex][0]);

type Tab = 'body' | 'face' | 'hair' | 'clothes' | 'dragon';
const TABS: [Tab, string][] = [['body', 'Lichaam'], ['face', 'Gezicht'], ['hair', 'Haar'], ['clothes', 'Kleding'], ['dragon', 'Draak']];
const TAB_LORE: Record<Tab, [string, string]> = {
  body: ['Lichaam', 'Man of vrouw, je bouw, je lengte en je huid. Wat het leven op je gezicht heeft achtergelaten, kies je hier ook.'],
  face: ['Gezicht', 'Kies een gezicht en stel het daarna fijn af: neus, kaak, kin, wangen, ogen en mond.'],
  hair: ['Haar', 'Je kapsel, de kleur van je haar en wat je op je hoofd zet.'],
  clothes: ['Kleding', 'Elke klasse heeft haar eigen kleren. Kies wat je draagt, in welke kleuren, en je reismantel.'],
  dragon: ['Je draak', 'De draak die jou koos. Kies de kleur van zijn schubben, zijn buik en vleugels, zijn ogen en zijn hoorns.'],
};
const LOOK: Record<string, [string, string]> = {
  sex: ['Man of vrouw', 'In het Brabant van 1650 draagt een vrouw geen zwaard. Een vrouw met een draak vraagt niemand om toestemming.'],
  build: ['Bouw', 'Het verandert niets aan hoe je vecht. Wel aan hoe je in een deuropening staat.'],
  height: ['Lengte', 'Een kop groter of kleiner dan de anderen op de markt. Het verandert niets aan je krachten.'],
  skin: ['Huid', 'Van bleek tot verweerd. Wie op het veld werkt, draagt het weer op zijn gezicht.'],
  mark: ['Kenmerk', 'Een litteken van een messengevecht, sproeten van de zon, een ooglap of een gezicht dat veel wind heeft gezien.'],
  face: ['Gezicht', 'Neus, kaak, kin, wangen, ogen, mond. Uit dezelfde trekken komt elk gezicht in Diest.'],
  eyes: ['Ogen', 'Bruin, blauw, grijs of groen. Je kunt ze ook laten zoals de schilder ze maakte.'],
  fine: ['Fijn afstellen', 'Schuif aan elke trek van je gezicht tot je jezelf herkent. Je ziet het meteen op je personage.'],
  hair: ['Kapsel', 'Mannen dragen het haar in 1650 vaak lang, tot op de schouders. Vrouwen steken het op, vlechten het of laten de krullen langs hun gezicht vallen.'],
  hairColor: ['Haarkleur', 'Die kleur krijgt ook je baard.'],
  beard: ['Baard', 'Een snor of een puntbaard is in 1650 de mode. Kijk maar naar de portretten van Van Dyck.'],
  hat: ['Hoofddeksel', 'Hoed, muts of niets. Wie in 1650 zonder hoed buiten komt, is arm, haastig of iets van plan.'],
  outfit: ['Kleren', 'Elke klasse heeft drie soorten kleren, voor mannen en voor vrouwen elk hun eigen snit.'],
  main: ['Hoofdkleur', 'Verf kost geld. Meekrap geeft rood, wede blauw, wouw geel. Wie niet betaalt, draagt de kleur van het schaap.'],
  accent: ['Bijkleur', 'De kleur van de onderrok, de omslagen, de linten en de broek. Kies iets dat bij je hoofdkleur past, of juist niet.'],
  mantle: ['Mantel', 'Lang tot op de kuiten, kort tot op de heupen, of lang met een kap op je rug. Op de draak waait hij achter je aan.'],
  cloak: ['Mantelkleur', 'Verf kost geld. Meekrap geeft rood, wede blauw. Wie niet betaalt, draagt de kleur van het schaap.'],
  dragonScales: ['Schubben', 'Draken zijn in dit spel verzonnen, hun kleuren ook. Kies wat je de hele reis onder je wilt zien.'],
  dragonBelly: ['Buik en vlies', 'De buikplaten en het vlies tussen de vingers van zijn vleugels. Als hij over je heen vliegt, zie je vooral deze kleur.'],
  dragonEyes: ['Ogen', 'Zijn ogen gloeien in het donker. Kies welke kleur je ’s nachts boven de Demer ziet.'],
  dragonHorns: ['Hoorns', 'Een draak uit het riet heeft hoorns zoals een oude ram, of een kroon van stekels. Niemand durft hem te vragen waarom.'],
  random: ['Willekeurig', 'Een ander uiterlijk, in één klik. Klasse, herkomst, partij en je draak blijven wat ze zijn.'],
};
const OUTFIT_LORE: Record<string, string> = {
  Buffelkolder: 'Een kolder van buffelleer over het wambuis, en de rode sjerp van het Spaanse leger. Zo loopt een schutter in 1650 erbij.',
  Musketier: 'Een wambuis met een witte kraag en een bandelier met kruitladingen over de schouder.',
  Ruiterskazak: 'Een ruime kazak tot op de dijen, met brede omslagen aan de mouwen. Ruiters dragen hem over het wambuis.',
  Rijjak: 'Een getailleerde jak met een korte schoot, een opgeschorte rok over de onderrok en laarzen. Je kunt erin rijden en lopen.',
  'Lijfje en sjerp': 'Een geregen lijfje met een witte kraag, de rok opgeschort over de onderrok, en de rode sjerp om het middel.',
  'Jak en lange rok': 'Een jak met een brede kraag over een lange rok tot op de enkels. Netjes genoeg voor de kerk, stevig genoeg voor de weg.',
  Wambuis: 'Een wambuis met een witte kraag en een platte muts. De kleren van een ambachtsman met een vaste plaats in de stad.',
  'Leren kolder': 'Een mouwloze leren kolder over het wambuis. Wie in een toren werkt, scheurt geen goede wol aan de balken.',
  Kiel: 'Een linnen kiel met een riem, zoals de knechten en de boeren hem dragen.',
  'Lijfje en schort': 'Een geregen lijfje met een halsdoek, een opgeschorte rok en een schort. Zo staan de vrouwen op de markt van Diest.',
  Stadsjak: 'Een donkere jak met een brede witte kraag en een lange rok. De kleren van een burgersvrouw.',
  Werkkleed: 'Een lijfje met een halsdoek, een lange rok en een schort, en klompen aan de voeten.',
  Bandelier: 'Een donker wambuis, een brede vilthoed en een bandelier. Op de heide vraagt niemand waar die vandaan komt.',
  'Kiel en laarzen': 'Een grijze kiel en hoge laarzen. Je ziet eruit als een voerman, en zo is het bedoeld.',
  'Donkere kazak': 'Een donkere kazak over het wambuis. Hij houdt de regen buiten en verbergt wat je onder je arm draagt.',
  Reisjak: 'Een jak met een korte schoot, een opgeschorte rok en laarzen. Gemaakt om ver te lopen en weinig op te vallen.',
  'Lijfje en laarzen': 'Een lijfje met een halsdoek, een schort over de rok en stevige laarzen eronder.',
  'Donkere jak': 'Een zwarte jak met een witte kraag, een lange rok en een bontmuts. Zo ziet een weduwe eruit, en niemand kijkt een weduwe lang aan.',
};

/** "Kempense smokkelaar" and the like, for the title screen and the character panel. */
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
          <h2>EEN AVONTUUR IN BRABANT · ANNO 1650</h2>
          <div class="fe-cols">
            <div><h3>DIT IS</h3>
              <p><b>Een avonturenspel.</b> Je vliegt op een draak over Brabant, landt waar je wilt en trekt te voet de stad in.</p>
              <p><b>Het Diest van 1650.</b> De straten, de poorten en de kerken liggen waar ze toen lagen.</p>
              <p><b>Vol oude volksverhalen.</b> De Kludde, dwaallichtjes en klokken die meer kunnen dan luiden.</p>
            </div>
            <div><h3>DIT IS NIET</h3>
              <p><b>Een geschiedenisles.</b> In de Kroniek lees je wat echt gebeurd is en wat wij verzonnen hebben.</p>
              <p><b>Een vliegsimulator.</b> De draak vliegt vanzelf. Jij moet alleen sturen.</p>
              <p><b>Een afgewerkt spel.</b> Dit is het eerste hoofdstuk. Je bent er ongeveer een uur mee bezig.</p>
            </div>
          </div>
          <div class="fe-menu"><button data-go="ok">${back ? 'TERUG' : 'BEGIN'}</button>${!back && openSettings ? '<button data-go="settings">INSTELLINGEN</button>' : ''}</div>
          <div class="fe-small">Je speelt met muis en toetsenbord of met een gamepad. Zet het geluid aan. Je voortgang wordt op dit toestel bewaard.</div>
          <div class="fe-keys">${hint('Kies met de pijltjes of Tab · Enter om te bevestigen', 'Kies met de kruistoetsen · A om te bevestigen')}</div>
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
          <h2>HET HERTOGDOM BRABANT · ANNO 1650</h2>
          <div class="fe-menu">
            ${save ? `<button data-go="continue">VERDER SPELEN<small>${esc(save.name)} · ${esc(heroLine(save))} · niveau ${save.level}</small></button>` : ''}
            <button data-go="new">NIEUW SPEL</button>
            ${openSettings ? '<button data-go="settings">INSTELLINGEN</button>' : ''}
          </div>
          <div class="fe-small">Je speelt het best met muis en toetsenbord of met een gamepad, en met het geluid aan · <button class="fe-link" data-go="what">wat is dit?</button></div>
          <div class="fe-keys">${hint('Kies met de pijltjes of Tab · Enter om te bevestigen', 'Kies met de kruistoetsen · A om te bevestigen')}</div>
        </div>
        <div class="fe-credit">Stadsplan naar OpenStreetMap-bijdragers (ODbL) en de Ferrariskaart van 1777 (Digitaal Vlaanderen)</div>
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
          <h3>NIEUW SPEL</h3>
          <p>Wil je een nieuw spel beginnen? Je huidige personage, ${esc(save.name)}, gaat dan verloren.</p>
          <div class="fe-menu"><button data-go="yes">NIEUW SPEL BEGINNEN</button><button data-go="no">TERUG</button></div>
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
        <div class="fe-next">KLIK OF SPATIE · VERDER</div>
        <button class="fe-skip">OVERSLAAN</button>
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
          <div class="cc-view"><div class="cc-wait">De kleermaker zoekt zijn naalden…</div></div>
          <div class="cc-hint">${hint('Sleep om te draaien · kies met de pijltjes, Enter om te kiezen, Esc om terug te gaan', 'Kies met de kruistoetsen · A om te kiezen · LB en RB: andere tab · X: willekeurig · B om terug te gaan')}</div>
          <div class="cc-lore" aria-live="polite"></div>
        </div>
        <div class="cc-left">
          <div class="cc-tabs" role="tablist">${TABS.map(([id, t]) => `<button role="tab" data-tab="${id}" data-lore="tab:${id}">${esc(t)}</button>`).join('')}</div>
          <div class="cc-rows"></div>
          <button class="cc-random" data-lore="look:random">⚄ WILLEKEURIG</button>
          <h3>EIGENSCHAPPEN</h3>
          <div class="cc-stats"></div>
        </div>
        <div class="cc-right">
          <h3>HERKOMST</h3><div class="cc-list cc-bgs"></div>
          <h3>KLASSE</h3><div class="cc-list cc-classes"></div>
          <h3>PARTIJ</h3><div class="cc-list cc-factions"></div>
        </div>
        <div class="cc-bottom">
          <label class="cc-field" data-lore="name:you"><span>JE NAAM</span><div><input class="cc-name" maxlength="18" list="cc-names" value="${esc(h.name)}" spellcheck="false"><button class="cc-dice" data-dice="name" title="Een andere naam">⚄</button></div></label>
          <datalist id="cc-names"></datalist>
          <label class="cc-field" data-lore="name:dragon"><span>JE DRAAK</span><div><input class="cc-dragon" maxlength="18" value="${esc(h.dragon)}" spellcheck="false"><button class="cc-dice" data-dice="dragon" title="Een andere naam">⚄</button></div></label>
          <button class="cc-back">TERUG</button>
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
          return `<div class="k">KLASSE · ${dots(o.difficulty)} ${DIFF[o.difficulty]}</div>
            <h4>${esc(o.name)} <em>${esc(o.role)}</em></h4>
            <p>${esc(o.lore)}</p>
            <div class="cc-skills">
              <div><b>${hint('Rechtermuis', 'LT')} · ${esc(o.skill.name)}</b>${esc(o.skill.text)}</div>
              <div><b>${hint('R', 'B')} · ${esc(o.skill2.name)}</b><i>vanaf niveau ${o.skill2.level}.</i> ${esc(o.skill2.text)}</div>
            </div>
            ${w ? `<div class="m"><b>Begint met</b> ${esc(w.name)}, ${esc(gearLines(w).join(', '))}.</div>` : ''}`;
        }
        if (kind === 'bg') {
          const b = BACKGROUNDS[id as BackgroundId];
          return `<div class="k">HERKOMST · ${esc(b.place)}</div>
            <h4>${esc(b.name[fem ? 1 : 0])}</h4>
            <p>${esc(b.lore)}</p>
            <div class="m"><b>${esc(b.perkName)}</b> ${esc(b.perk)}</div>
            <div class="q">${b.said.map((x) => `«${esc(x)}»`).join(' ')}</div>`;
        }
        if (kind === 'faction') {
          const f = FACTIONS[id as FactionId];
          return `<div class="k">PARTIJ · eerste trouw</div>
            <h4><i class="cc-dot" style="background:${f.color}"></i>${esc(f.name)} <em>${esc(f.tagline)}</em></h4>
            <p>${esc(f.text)}</p>
            <div class="m">Je begint bij hen als <b>${tierOf(FIRST_LOYALTY).name}</b>. De andere partijen kennen je nog niet. Wat je doet, verandert dat.</div>`;
        }
        if (kind === 'name' && id === 'dragon')
          return `<div class="k">DE DRAAK</div><h4>${esc(dragonIn.value || '…')}</h4>
            <p>Hij kroop uit het riet van de Demer, de nacht dat de klokken zwegen, en koos jou. Waarom, weet niemand. Hij weet het misschien. Hij zegt het niet.</p>
            <div class="m"><b>${hint('Linkermuis', 'LB')} in de lucht</b> Drakenvuur, waar je kijkt.</div>`;
        if (kind === 'name')
          return `<div class="k">JE NAAM</div><h4>${esc(nameIn.value || '…')}</h4>
            <p>Zo zullen ze je roepen in Diest: op de markt, in de herberg, en later, als er iets misgaat.</p>
            <div class="m">Typ een eigen naam, of neem er een uit de lijst. Het zijn allemaal namen die je in 1650 in Brabant hoort.</div>`;
        if (kind === 'tab') {
          const t = TAB_LORE[id as Tab];
          return `<div class="k">UITERLIJK</div><h4>${esc(t[0])}</h4><p>${esc(t[1])}</p>`;
        }
        if (kind === 'outfit') {
          const o = outfits()[Math.min(outfits().length - 1, h.outfit ?? 0)];
          return `<div class="k">KLEDING · ${esc(ORIGINS[h.origin].name)}</div><h4>${esc(o?.name ?? '')}</h4><p>${esc(OUTFIT_LORE[o?.name ?? ''] ?? LOOK.outfit[1])}</p>`;
        }
        const [t, x] = LOOK[id] ?? ['', ''];
        const k = id.startsWith('dragon') ? 'DE DRAAK' : 'UITERLIJK';
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
          { id: 'sex', label: 'Geslacht', seg: () => [['m', 'Man', h.sex === 'm'], ['f', 'Vrouw', h.sex === 'f']] },
          { id: 'build', label: 'Bouw', seg: () => opts.bodies[h.sex].map((b, i) => [b, buildName(b, i), h.build === b]) },
          { id: 'height', label: 'Lengte', slider: () => [0.92, 1.08, h.height ?? 1], set: (v) => (h.height = v) },
          { id: 'skin', label: 'Huid', swatches: () => tones().map((t, i) => [String(i), `Huid ${i + 1}`, toneCss(t), h.skin === i]), pick: (k) => (h.skin = +k) },
          { id: 'mark', label: 'Kenmerk', value: () => MARKS.find(([k]) => k === (h.mark ?? null))?.[1] ?? 'Geen', step: (d) => (h.mark = cycle(MARKS.map(([k]) => k), h.mark ?? null, d)) },
        ],
        face: () => [
          { id: 'face', label: 'Gezicht', value: () => faceName(h.face, h.sex), step: (d) => {
            const i = faces().findIndex(([n]) => n === faceName(h.face, h.sex));
            h.face = { ...faces()[(Math.max(i, d > 0 ? -1 : 0) + d + faces().length) % faces().length][1] };
          } },
          { id: 'eyes', label: 'Ogen', swatches: () => EYES.map(([k, n]) => [k ?? '', n, k ?? 'linear-gradient(135deg,#5a3a1e 50%,#4a6e9e 50%)', (h.eyes ?? null) === k]), pick: (k) => (h.eyes = k || null) },
          ...morphRows(),
        ],
        hair: () => [
          { id: 'hair', label: 'Kapsel', value: () => hairName(h.hair), step: (d) => (h.hair = cycle(opts.hair[h.sex], h.hair, d)) },
          { id: 'hairColor', label: 'Haarkleur', swatches: () => HAIR_COLORS.map(([k, n]) => [k, n, hex(k), h.hairColor === k]), pick: (k) => (h.hairColor = k) },
          ...(h.sex === 'm' ? [{ id: 'beard', label: 'Baard', value: () => beardName(h.beard), step: (d: number) => (h.beard = cycle(opts.beards, h.beard, d)) }] : []),
          { id: 'hat', label: 'Hoofddeksel', value: () => headwearName(headwearOf(kit, h)), step: (d) => {
            h.headwear = cycle(opts.headwear[h.sex], headwearOf(kit, h), d);
            h.hat = h.headwear !== null;
          } },
        ],
        clothes: () => [
          { id: 'outfit', label: 'Kleren', value: () => outfit()?.name ?? '', step: (d) => {
            h.outfit = ((h.outfit ?? 0) + d + outfits().length) % outfits().length;
            h.headwear = undefined;
            h.hat = true;
            pin('outfit:');
          } },
          { id: 'main', label: 'Hoofdkleur', swatches: () => DYES.map(([k, n]) => [k, n, hex(k), (h.main ?? outfit()?.main) === k]), pick: (k) => (h.main = k), wide: true },
          { id: 'accent', label: 'Bijkleur', swatches: () => DYES.map(([k, n]) => [k, n, hex(k), (h.accent ?? outfit()?.accent) === k]), pick: (k) => (h.accent = k), wide: true },
          { id: 'mantle', label: 'Mantel', seg: () => opts.mantles.map((m) => [m, mantleName(m), (h.mantle ?? 'mantle') === m]) },
          { id: 'cloak', label: 'Mantelkleur', swatches: () => CLOAKS.map(([c, n]) => [c, n, c, h.cloak === c]), pick: (k) => (h.cloak = k) },
        ],
        dragon: () => [
          { id: 'dragonScales', label: 'Schubben', swatches: () => SCALES.map((s) => [s.id, s.name, s.swatch, h.scales === s.id]), pick: (k) => (h.scales = k) },
          { id: 'dragonBelly', label: 'Buik en vlies', swatches: () => BELLIES.map((s) => [s.id ?? '', s.name, s.swatch, (h.dragonBelly ?? null) === s.id]), pick: (k) => (h.dragonBelly = k || null) },
          { id: 'dragonEyes', label: 'Ogen', swatches: () => DRAGON_EYES.map((s) => [s.id ?? '', s.name, s.swatch, (h.dragonEyes ?? null) === s.id]), pick: (k) => (h.dragonEyes = k || null) },
          { id: 'dragonHorns', label: 'Hoorns', value: () => HORNS.find((x) => x.id === (h.dragonHorns ?? 'gewoon'))?.name ?? '', step: (d) => (h.dragonHorns = cycle(HORNS.map((x) => x.id), h.dragonHorns ?? 'gewoon', d)) },
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
          else if ('step' in r) ctl = `<div class="cc-step${r.off?.() ? ' off' : ''}"><button data-step="${r.id}" data-d="-1" aria-label="vorige">‹</button><span>${esc(r.value())}</span><button data-step="${r.id}" data-d="1" aria-label="volgende">›</button></div>`;
          else if ('swatches' in r) ctl = `<div class="cc-cloaks${r.wide ? ' cc-dyes' : ''}">${r.swatches().map(([k, n, css, on]) => `<button class="cc-sw${on ? ' on' : ''}" data-sw="${r.id}" data-k="${esc(k)}" title="${esc(n)}" style="background:${css}"></button>`).join('')}</div>`;
          else {
            const [lo, hi, v] = r.slider();
            ctl = `<input type="range" class="cc-range" data-range="${r.id}" min="${lo}" max="${hi}" step="0.01" value="${v}" aria-label="${esc(r.label)}">`;
          }
          return `<div class="cc-row${'swatches' in r && r.wide ? ' cc-row-wide' : ''}" data-lore="look:${r.id.startsWith('morph:') ? 'fine' : r.id}"><label>${esc(r.label)}</label>${ctl}</div>`;
        };
        rowsEl.innerHTML =
          rows.filter((r) => !r.id.startsWith('morph:')).map(one).join('') +
          (morphs.length ? `<div class="cc-fine" data-lore="look:fine"><div class="cc-fine-h">Fijn afstellen</div><div class="cc-fine-g">${morphs.map(one).join('')}</div></div>` : '');
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
          .map((id) => { const o = ORIGINS[id]; return `<button class="cc-opt${h.origin === id ? ' on' : ''}" data-origin="${id}" data-lore="origin:${id}"><b>${esc(o.name)}</b><small>${esc(o.tagline)} <span class="cc-diff" title="moeilijkheid">${dots(o.difficulty)}</span></small></button>`; })
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
          `<div class="cc-derived"><span>Levenskracht <b>${d.maxHp}</b></span><span>Pantser <b>${d.armor}</b></span><span>Voltreffer <b>${Math.round(d.crit)}%</b></span></div>`;
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
