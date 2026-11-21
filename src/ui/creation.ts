// The front end: title, what this is, and making your character. Research
// rules (docs/research): get players in fast, let every choice matter, set
// the hook before the first flight. Character creation is one screen in the
// manner of World of Warcraft: looks on the left, who you are on the right,
// your hero in the middle, a lore panel that teaches the world, and one
// button. Every choice has a default, so BEGIN works at once.

import { BACKGROUNDS, type BackgroundId, ORIGINS, type OriginId, STAT_NAMES, type Stat, Sheet, uniqueGear, gearLines } from '../rpg/character';
import { FACTIONS, type FactionId, tierOf } from '../rpg/factions';
import {
  CLOAKS, DRAGONS, FACES, HAIR_COLORS, NAMES, type Sex, beardName, buildName, faceName, hairName, hatLabel, heroOptions, heroSpec, outfitHasHat,
} from '../rpg/look';
import type { HeroData } from '../rpg/state';
import type { TownsfolkKit } from '../rpg/townsfolk';
import { SCALES } from '../player/scales';
import { HeroPreview } from './preview';

/** What creation decides; the rest of HeroData starts fresh. */
export type NewHero = Pick<HeroData, 'name' | 'origin' | 'cloak' | 'dragon' | 'sex' | 'build' | 'face' | 'skin' | 'hair' | 'hairColor' | 'beard' | 'hat' | 'background' | 'faction' | 'scales'>;

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

/** "Kempense smokkelaar" and the like, for the title screen and the character panel. */
export function heroLine(h: { sex?: string; background?: string; origin: string }) {
  const bg = BACKGROUNDS[h.background as BackgroundId];
  const cls = ORIGINS[h.origin as OriginId]?.name ?? '';
  return bg ? `${bg.name[h.sex === 'f' ? 1 : 0]} · ${cls}` : cls;
}

export function runFrontEnd(root: HTMLElement, save: SaveSummary | null, onFirstGesture: () => void, kitP: Promise<TownsfolkKit | null> = Promise.resolve(null)): Promise<FrontEndResult> {
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
    let keys: ((e: KeyboardEvent) => void) | null = null;
    const done = (r: FrontEndResult) => {
      preview?.dispose();
      preview = null;
      if (keys) window.removeEventListener('keydown', keys);
      el.classList.add('out');
      setTimeout(() => el.remove(), 900);
      resolve(r);
    };

    // ---------------------------------------------------------------- what this is (first visit)
    const promise = (back: boolean) => {
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
          <div class="fe-menu"><button data-go="ok">${back ? 'TERUG' : 'BEGIN'}</button></div>
          <div class="fe-small">Je speelt met muis en toetsenbord of met een gamepad. Zet het geluid aan. Je voortgang wordt op dit toestel bewaard.</div>
        </div>
      </div>`;
      el.querySelector('[data-go="ok"]')!.addEventListener('click', () => (back ? title() : create()));
    };

    // ---------------------------------------------------------------- title
    const title = () => {
      el.innerHTML = `<div class="fe-title" style="background-image:url(${asset('ui/intro/flight-demer-valley.jpg')})">
        <div class="fe-shade"></div>
        <div class="fe-center">
          <h1>BELFORT</h1>
          <h2>HET HERTOGDOM BRABANT · ANNO 1650</h2>
          <div class="fe-menu">
            ${save ? `<button data-go="continue">VERDER SPELEN<small>${esc(save.name)} · ${esc(heroLine(save))} · niveau ${save.level}</small></button>` : ''}
            <button data-go="new">NIEUW SPEL</button>
          </div>
          <div class="fe-small">Je speelt het best met muis en toetsenbord of met een gamepad, en met het geluid aan · <button class="fe-link" data-go="what">wat is dit?</button></div>
        </div>
        <div class="fe-credit">Stadsplan naar OpenStreetMap-bijdragers (ODbL) en de Ferrariskaart van 1777 (Digitaal Vlaanderen)</div>
      </div>`;
      el.querySelector('[data-go="continue"]')?.addEventListener('click', () => done({ mode: 'continue' }));
      el.querySelector('[data-go="what"]')!.addEventListener('click', () => promise(true));
      el.querySelector('[data-go="new"]')!.addEventListener('click', () => {
        if (save && !confirm('Wil je een nieuw spel beginnen? Je huidige personage gaat dan verloren.')) return;
        create(); // the story is told in the prologue, which you play
      });
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
      let kit: TownsfolkKit | null = null;
      let kitState: 'loading' | 'ok' | 'none' = 'loading';
      let opts = heroOptions(null);
      const h: NewHero = {
        name: pick(NAMES.m), origin: 'schutter', cloak: CLOAKS[0][0], dragon: pick(DRAGONS),
        sex: 'm', build: opts.bodies.m[0], face: { ...FACES[0][1] }, skin: 1, hair: opts.hair.m[0], hairColor: 'h_brown', beard: 'moustache', hat: true,
        background: 'diest', faction: 'gilden', scales: 'demer',
      };
      let nameTouched = false;
      /** what the lore panel shows when nothing is hovered: the last thing chosen */
      let pinned: string = 'origin:schutter';

      const back = `radial-gradient(ellipse 55% 65% at 50% 40%, rgba(130, 78, 32, 0.38), transparent 70%), linear-gradient(rgba(10, 7, 4, 0.84), rgba(8, 6, 4, 0.93)), url(${asset('ui/intro/diest-living-town.jpg')})`;
      el.innerHTML = `<div class="cc" style="background-image:${back}">
        <div class="cc-stage">
          <div class="cc-view"><div class="cc-wait">De kleermaker zoekt zijn naalden…</div></div>
          <div class="cc-lore" aria-live="polite"></div>
        </div>
        <div class="cc-left">
          <h3>UITERLIJK</h3>
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
          <div class="cc-field cc-scales" data-lore="name:scales"><span>SCHUBBEN</span><div>${SCALES.map((sc) => `<button class="cc-sw" data-scales="${sc.id}" title="${sc.name}" style="background:${sc.swatch}"></button>`).join('')}</div></div>
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
              <div><b>Rechtermuis · ${esc(o.skill.name)}</b>${esc(o.skill.text)}</div>
              <div><b>R · ${esc(o.skill2.name)}</b><i>vanaf niveau ${o.skill2.level}.</i> ${esc(o.skill2.text)}</div>
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
            <div class="m"><b>Linkermuis in de lucht</b> Drakenvuur, waar je kijkt.</div>`;
        if (kind === 'name' && id === 'scales') {
          const sc = SCALES.find((x) => x.id === h.scales)!;
          return `<div class="k">DE DRAAK · SCHUBBEN</div><h4>${esc(sc.name)}</h4>
            <p>Draken zijn in dit spel verzonnen, hun kleuren ook. Kies wat je de hele reis onder je wilt zien.</p>`;
        }
        if (kind === 'name')
          return `<div class="k">JE NAAM</div><h4>${esc(nameIn.value || '…')}</h4>
            <p>Zo zullen ze je roepen in Diest: op de markt, in de herberg, en later, als er iets misgaat.</p>
            <div class="m">Typ een eigen naam, of neem er een uit de lijst. Allemaal namen die je in 1650 in Brabant hoort.</div>`;
        const LOOK: Record<string, [string, string]> = {
          sex: ['Man of vrouw', 'In het Brabant van 1650 draagt een vrouw geen zwaard. Een vrouw met een draak vraagt niemand om toestemming.'],
          build: ['Bouw', 'Het verandert niets aan hoe je vecht. Wel aan hoe je in een deuropening staat.'],
          face: ['Gezicht', 'Neus, kaak, kin, wangen, ogen, mond. Uit dezelfde trekken komt elk gezicht in Diest.'],
          skin: ['Huid', 'Van bleek tot verweerd. Wie op het veld werkt, draagt het weer op zijn gezicht.'],
          hair: ['Haar', 'Mannen dragen het haar in 1650 vaak lang, tot op de schouders. Vrouwen dragen het opgestoken, en meestal onder een muts.'],
          hairColor: ['Haarkleur', 'Ook voor de baard.'],
          beard: ['Baard', 'Een snor of een puntbaard is in 1650 de mode. Kijk maar naar de portretten van Van Dyck.'],
          hat: ['Hoed', 'Hoed, muts of niets. Wie in 1650 zonder hoed buiten komt, is arm, haastig of iets van plan.'],
          cloak: ['Reismantel', 'Verf kost geld. Meekrap geeft rood, wede blauw. Wie niet betaalt, draagt de kleur van het schaap.'],
          random: ['Willekeurig', 'Een ander uiterlijk, in één klik. Klasse, herkomst en partij blijven wat ze zijn.'],
        };
        const [t, x] = LOOK[id] ?? ['', ''];
        return `<div class="k">UITERLIJK</div><h4>${esc(t)}</h4><p>${esc(x)}</p>`;
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
      const pin = (key: string) => {
        pinned = key;
        shown = '';
        showLore(key);
      };

      // ------------------------------------------------ the figure
      const refreshFigure = () => {
        if (!preview || !kit) return;
        preview.show(heroSpec(kit, { ...h, level: 1, xp: 0, hp: 1, gear: {}, bag: [] }));
      };

      // ------------------------------------------------ appearance rows
      const rowsEl = $('.cc-rows');
      type Row = { id: string; label: string; value: () => string; step?: (d: number) => void; swatch?: () => string; off?: () => boolean; seg?: () => [string, string, boolean][] };
      const cycle = <T,>(list: readonly T[], cur: T, d: number) => list[(Math.max(0, list.indexOf(cur)) + d + list.length) % list.length];
      const rows: Row[] = [
        { id: 'sex', label: 'Geslacht', value: () => '', seg: () => [['m', 'Man', h.sex === 'm'], ['f', 'Vrouw', h.sex === 'f']] },
        { id: 'build', label: 'Bouw', value: () => '', seg: () => opts.bodies[h.sex].map((b, i) => [b, buildName(b, i), h.build === b]) },
        { id: 'face', label: 'Gezicht', value: () => faceName(h.face), step: (d) => {
          const i = FACES.findIndex(([n]) => n === faceName(h.face));
          h.face = { ...FACES[(Math.max(i, d > 0 ? -1 : 0) + d + FACES.length) % FACES.length][1] };
        } },
        { id: 'skin', label: 'Huid', value: () => `${h.skin + 1} van ${tones().length}`, step: (d) => (h.skin = (h.skin + d + tones().length) % tones().length), swatch: () => {
          const t = tones()[h.skin] ?? [1, 1, 1];
          return `rgb(${t.map((v, i) => Math.round(Math.min(1, v * SKIN_BASE[i]) * 255)).join(',')})`;
        } },
        { id: 'hair', label: 'Haar', value: () => hairName(h.hair), step: (d) => (h.hair = cycle(opts.hair[h.sex], h.hair, d)) },
        { id: 'hairColor', label: 'Haarkleur', value: () => HAIR_COLORS.find(([k]) => k === h.hairColor)?.[1] ?? '', step: (d) => (h.hairColor = cycle(HAIR_COLORS.map(([k]) => k), h.hairColor, d)), swatch: () => kit?.m.palette[h.hairColor] ?? '#5e4028' },
        { id: 'beard', label: 'Baard', value: () => (h.sex === 'f' ? '—' : beardName(h.beard)), step: (d) => (h.beard = cycle(opts.beards, h.beard, d)), off: () => h.sex === 'f' },
        { id: 'hat', label: 'Hoed', value: () => hatLabel(kit, h.origin, h.sex, h.hat), step: () => (h.hat = !h.hat), off: () => !outfitHasHat(kit, h.origin, h.sex) },
      ];
      const tones = (): [number, number, number][] => kit?.m.skinTones ?? new Array(8).fill([1, 1, 1]);
      const renderRows = () => {
        rowsEl.innerHTML = rows
          .map((r) => {
            const ctl = r.seg
              ? `<div class="cc-seg">${r.seg().map(([k, t, on]) => `<button data-seg="${r.id}" data-k="${k}" class="${on ? 'on' : ''}">${esc(t)}</button>`).join('')}</div>`
              : `<div class="cc-step${r.off?.() ? ' off' : ''}"><button data-step="${r.id}" data-d="-1" aria-label="vorige">‹</button><span>${r.swatch ? `<i style="background:${r.swatch()}"></i>` : ''}${esc(r.value())}</span><button data-step="${r.id}" data-d="1" aria-label="volgende">›</button></div>`;
            return `<div class="cc-row" data-lore="look:${r.id}"><label>${esc(r.label)}</label>${ctl}</div>`;
          })
          .join('') +
          `<div class="cc-row" data-lore="look:cloak"><label>Mantel</label><div class="cc-cloaks">${CLOAKS.map(([c, n]) => `<button class="cc-sw${c === h.cloak ? ' on' : ''}" data-cloak="${c}" title="${n}" style="background:${c}"></button>`).join('')}</div></div>`;
      };
      rowsEl.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (!b) return;
        if (b.dataset.cloak) {
          h.cloak = b.dataset.cloak;
          rowsEl.querySelectorAll('[data-cloak]').forEach((x) => x.classList.toggle('on', x === b));
          preview?.setCloak(h.cloak);
          return;
        }
        if (b.dataset.seg === 'sex') setSex(b.dataset.k as Sex);
        else if (b.dataset.seg === 'build') h.build = b.dataset.k!;
        else if (b.dataset.step) {
          const r = rows.find((x) => x.id === b.dataset.step)!;
          if (r.off?.()) return;
          r.step!(Number(b.dataset.d));
        }
        renderRows();
        refreshFigure();
      });
      const setSex = (sex: Sex) => {
        if (h.sex === sex) return;
        h.sex = sex;
        h.build = opts.bodies[sex][Math.min(opts.bodies[sex].length - 1, sex === 'm' ? 0 : 0)];
        h.hair = opts.hair[sex][0];
        if (sex === 'f') h.beard = null;
        else h.beard = 'moustache';
        if (!nameTouched) nameIn.value = pick(NAMES[sex]);
        fillNames();
        renderLists();
        updateTexts();
      };
      const randomLook = () => {
        h.build = pick(opts.bodies[h.sex]);
        h.face = Math.random() < 0.5 || !kit ? { ...pick(FACES)[1] } : kit.randomFace(Math.random);
        h.skin = Math.floor(Math.random() * tones().length);
        h.hair = pick(opts.hair[h.sex]);
        h.hairColor = pick(HAIR_COLORS.slice(0, 6))[0];
        if (h.sex === 'm') h.beard = pick(opts.beards);
        h.cloak = pick(CLOAKS)[0];
        renderRows();
        refreshFigure();
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
        else if (b.dataset.origin) { h.origin = b.dataset.origin as OriginId; pin(`origin:${h.origin}`); renderRows(); refreshFigure(); }
        else if (b.dataset.faction) { h.faction = b.dataset.faction as FactionId; pin(`faction:${h.faction}`); }
        renderLists();
        renderStats();
      });

      // ------------------------------------------------ what it adds up to
      const renderStats = () => {
        const sheet = new Sheet({ ...h, level: 1, xp: 0, hp: 1, gear: { wapen: uniqueGear(ORIGINS[h.origin].start) ?? undefined }, bag: [] });
        const d = sheet.derived();
        const bonus = BACKGROUNDS[h.background].bonus;
        $('.cc-stats').innerHTML = (['kracht', 'klank', 'list', 'taaiheid'] as Stat[])
          .map((k) => `<div class="cc-st" data-lore="origin:${h.origin}"><span>${STAT_NAMES[k]}</span><i><em style="width:${Math.min(100, d[k] * 9)}%"></em></i><b>${d[k]}${bonus[k] ? '<sup>+</sup>' : ''}</b></div>`)
          .join('') +
          `<div class="cc-derived"><span>Leven <b>${d.maxHp}</b></span><span>Pantser <b>${d.armor}</b></span><span>Voltreffer <b>${Math.round(d.crit)}%</b></span></div>`;
      };

      // ------------------------------------------------ names, dragon, begin
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
      const renderScales = () => el.querySelectorAll<HTMLElement>('[data-scales]').forEach((x) => x.classList.toggle('on', x.dataset.scales === h.scales));
      el.querySelectorAll<HTMLButtonElement>('[data-scales]').forEach((b) =>
        b.addEventListener('click', () => {
          h.scales = b.dataset.scales!;
          renderScales();
          pin('name:scales');
        }),
      );
      const begin = () => {
        h.name = nameIn.value.trim() || pick(NAMES[h.sex]);
        h.dragon = dragonIn.value.trim() || pick(DRAGONS);
        if (!opts.hair[h.sex].includes(h.hair)) h.hair = opts.hair[h.sex][0];
        done({ mode: 'new', hero: { ...h, face: { ...h.face } } });
      };
      $('.cc-go').addEventListener('click', begin);
      keys = (e: KeyboardEvent) => {
        const typing = document.activeElement === nameIn || document.activeElement === dragonIn;
        if (e.code === 'Enter' && !e.repeat) { e.preventDefault(); begin(); }
        else if (!typing && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) preview?.turn(e.code === 'ArrowLeft' ? -0.6 : 0.6);
      };
      window.addEventListener('keydown', keys);

      // ------------------------------------------------ first paint, then the figure when the kit is in
      renderRows();
      renderLists();
      renderStats();
      renderScales();
      fillNames();
      pin(pinned);
      preview = new HeroPreview(view, () => loreEl.offsetHeight + 10, [loreEl]);
      // without a live figure (no kit, no second WebGL context) the painted rider stands in
      const flat = (on: boolean) => {
        view.classList.toggle('cc-flat', on);
        view.style.backgroundImage = on ? `url(${asset('ui/intro/rider-guild-equipment.jpg')})` : '';
      };
      flat(!preview.ok);
      void kitP.then((k) => {
        if (!preview) return; // creation already over
        kit = k;
        kitState = k ? 'ok' : 'none';
        view.classList.toggle('cc-ready', kitState === 'ok');
        flat(kitState === 'none' || !preview.ok);
        opts = heroOptions(k);
        if (!opts.bodies[h.sex].includes(h.build)) h.build = opts.bodies[h.sex][0];
        if (!opts.hair[h.sex].includes(h.hair)) h.hair = opts.hair[h.sex][0];
        if (!opts.beards.includes(h.beard)) h.beard = opts.beards.find((b) => b) ?? null;
        preview.setKit(k);
        renderRows();
        refreshFigure();
      });
    };

    // a first-time visitor is told what this is before anything else; a returning one goes to the title
    if (save) title();
    else promise(false);
  });
}
