// The front end: title, the story so far (five painted slides, narrated in
// Flemish), and making your character. Research rules (docs/research): get
// players in fast (character creation under two minutes), let every choice
// matter (origin = how you fight), and set the hook before the first flight.

import { ORIGINS, type OriginId, STAT_NAMES, type Stat } from '../rpg/character';

export interface NewHero {
  name: string;
  origin: OriginId;
  cloak: string;
  dragon: string;
}

export type FrontEndResult = { mode: 'continue' } | { mode: 'new'; hero: NewHero };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const asset = (p: string) => new URL(p, document.baseURI).toString();

// Two slides, about twenty seconds: the hook and you. The rest of the story is told in play.
const SLIDES: [string, string, string][] = [
  ['kludde-river-remembers', 'Diest, anno 1650', 'Op een zondag zwijgen de klokken van Sint-Sulpitius. De klepels zijn weg uit een gesloten toren. Op de klokkenstoel ligt nat rivierwier, en staat de afdruk van klauwen.'],
  ['root-oak-forbidden-pilgrimage', 'Gij', 'Gij hebt geen land, geen titel en geen meester. Gij hebt een draak, die op een nacht uit het riet van de Demer kroop en u koos. Niemand weet waarom.'],
];

const NAMES = ['Lieven', 'Joris', 'Rombout', 'Gommaar', 'Bartel', 'Machteld', 'Clara', 'Katelijne', 'Margriet', 'Barbara', 'Josijne', 'Geertruid', 'Arnout', 'Willem'];
const DRAGONS = ['Gloed', 'Sintel', 'Vonk', 'Brons', 'Goudvleugel', 'Beiaard', 'Demerdraak', 'Gouden Griet'];
const CLOAKS = ['#8c2a1e', '#2e5a3c', '#2f3f66', '#5a3a6a', '#b0782a', '#3a3a3a', '#7a5a3a', '#e8e0d0'];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function runFrontEnd(root: HTMLElement, save: { name: string; level: number; origin: string } | null, onFirstGesture: () => void): Promise<FrontEndResult> {
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
    const done = (r: FrontEndResult) => {
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
              <p><b>Een avontuur.</b> Vlieg op een draak, land waar ge wilt, kies partij, vecht.</p>
              <p><b>Echt Brabant.</b> Diest ligt waar het in 1650 lag, straat voor straat.</p>
              <p><b>Folklore die bijt.</b> De Kludde, dwaallichten, klokken met macht.</p>
            </div>
            <div><h3>DIT IS NIET</h3>
              <p><b>Een geschiedenisles.</b> De Kroniek zegt eerlijk wat verzonnen is.</p>
              <p><b>Een simulator.</b> De draak vliegt vanzelf. Gij stuurt.</p>
              <p><b>Af.</b> Dit is het eerste hoofdstuk: een goed uur spel.</p>
            </div>
          </div>
          <div class="fe-menu"><button data-go="ok">${back ? 'TERUG' : 'BEGIN UW VERHAAL'}</button></div>
          <div class="fe-small">Muis en toetsenbord of een gamepad · geluid aan · uw voortgang wordt op dit toestel bewaard</div>
        </div>
      </div>`;
      el.querySelector('[data-go="ok"]')!.addEventListener('click', () => (back ? title() : story(0)));
    };

    // ---------------------------------------------------------------- title
    const title = () => {
      el.innerHTML = `<div class="fe-title" style="background-image:url(${asset('ui/intro/flight-demer-valley.jpg')})">
        <div class="fe-shade"></div>
        <div class="fe-center">
          <h1>BELFORT</h1>
          <h2>HET HERTOGDOM BRABANT · ANNO 1650</h2>
          <div class="fe-menu">
            ${save ? `<button data-go="continue">VERDER SPELEN<small>${esc(save.name)} · ${esc(ORIGINS[save.origin as OriginId]?.name ?? '')} · niveau ${save.level}</small></button>` : ''}
            <button data-go="new">${save ? 'NIEUW VERHAAL' : 'BEGIN UW VERHAAL'}</button>
          </div>
          <div class="fe-small">Best met muis en toetsenbord of een gamepad · met geluid · <button class="fe-link" data-go="what">wat is dit?</button></div>
        </div>
        <div class="fe-credit">Stadsplan naar OpenStreetMap-bijdragers (ODbL) en de Ferrariskaart van 1777 (Digitaal Vlaanderen)</div>
      </div>`;
      el.querySelector('[data-go="continue"]')?.addEventListener('click', () => done({ mode: 'continue' }));
      el.querySelector('[data-go="what"]')!.addEventListener('click', () => promise(true));
      el.querySelector('[data-go="new"]')!.addEventListener('click', () => {
        if (save && !confirm('Een nieuw verhaal beginnen? Uw huidige personage gaat verloren.')) return;
        story(0);
      });
    };

    // ---------------------------------------------------------------- story
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

    // ---------------------------------------------------------------- creation
    const create = () => {
      const h: NewHero = { name: pick(NAMES), origin: 'schutter', cloak: CLOAKS[0], dragon: pick(DRAGONS) };
      const statBar = (o: OriginId, k: Stat) => `<div class="fe-st"><span>${STAT_NAMES[k]}</span><i style="width:${ORIGINS[o].base[k] * 10}%"></i></div>`;
      el.innerHTML = `<div class="fe-create">
        <div class="fe-portrait" style="background-image:url(${asset('ui/intro/rider-guild-equipment.jpg')})"><div class="fe-tint"></div><div class="fe-pname"></div></div>
        <div class="fe-form">
          <h2>WIE ZIJT GIJ?</h2>
          <label>Naam<div class="fe-row"><input class="fe-name" maxlength="18" value="${esc(h.name)}"><button class="fe-dice" data-dice="name" title="Een andere naam">⚄</button></div></label>
          <div class="fe-label">Klasse</div>
          <div class="fe-origins">
            ${(Object.keys(ORIGINS) as OriginId[])
              .map((id) => {
                const o = ORIGINS[id];
                return `<button class="fe-origin${id === h.origin ? ' on' : ''}" data-origin="${id}">
                  <b>${esc(o.name)}</b><em>${esc(o.tagline)}</em><p>${esc(o.text)}</p>
                  ${(['kracht', 'klank', 'list', 'taaiheid'] as Stat[]).map((k) => statBar(id, k)).join('')}
                  <div class="fe-skills"><b>${esc(o.skill.short)}</b> · <b>${esc(o.skill2.short)}</b></div>
                </button>`;
              })
              .join('')}
          </div>
          <div class="fe-label">Mantel</div>
          <div class="fe-cloaks">${CLOAKS.map((c, k) => `<button class="fe-cloak${k === 0 ? ' on' : ''}" data-cloak="${c}" style="background:${c}"></button>`).join('')}</div>
          <label>Draak<div class="fe-row"><input class="fe-dragon" maxlength="18" value="${esc(h.dragon)}"><button class="fe-dice" data-dice="dragon" title="Een andere naam">⚄</button></div></label>
          <button class="fe-go">BEGIN</button>
        </div>
      </div>`;
      const nameIn = el.querySelector<HTMLInputElement>('.fe-name')!;
      const dragonIn = el.querySelector<HTMLInputElement>('.fe-dragon')!;
      const pname = el.querySelector<HTMLElement>('.fe-pname')!;
      const tint = el.querySelector<HTMLElement>('.fe-tint')!;
      const refresh = () => {
        pname.innerHTML = `${esc(nameIn.value || '…')}<small>${esc(ORIGINS[h.origin].name)} · met ${esc(dragonIn.value || '…')}</small>`;
        tint.style.background = h.cloak;
      };
      nameIn.addEventListener('input', refresh);
      dragonIn.addEventListener('input', refresh);
      el.querySelectorAll<HTMLButtonElement>('[data-dice]').forEach((b) =>
        b.addEventListener('click', () => {
          if (b.dataset.dice === 'name') nameIn.value = pick(NAMES);
          else dragonIn.value = pick(DRAGONS);
          refresh();
        }),
      );
      el.querySelectorAll<HTMLButtonElement>('[data-origin]').forEach((b) =>
        b.addEventListener('click', () => {
          h.origin = b.dataset.origin as OriginId;
          el.querySelectorAll('.fe-origin').forEach((x) => x.classList.toggle('on', x === b));
          refresh();
        }),
      );
      el.querySelectorAll<HTMLButtonElement>('[data-cloak]').forEach((b) =>
        b.addEventListener('click', () => {
          h.cloak = b.dataset.cloak!;
          el.querySelectorAll('.fe-cloak').forEach((x) => x.classList.toggle('on', x === b));
          refresh();
        }),
      );
      el.querySelector('.fe-go')!.addEventListener('click', () => {
        h.name = nameIn.value.trim() || pick(NAMES);
        h.dragon = dragonIn.value.trim() || pick(DRAGONS);
        done({ mode: 'new', hero: h });
      });
      refresh();
      nameIn.focus();
      nameIn.select();
    };

    // a first-time visitor is told what this is before anything else; a returning one goes to the title
    if (save) title();
    else promise(false);
  });
}
