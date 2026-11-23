// The game layer of the HUD:
//  - Guide: one tracked objective, shown in the world (a pillar of light, and a
//    ring on the ground for "search this area" objectives) and on screen (a
//    waypoint that clamps to the edge with an arrow when it is behind you)
//  - PlayerFrame: life, Resonance, XP, the action bar with cooldowns
//  - Banner: quest taken / quest done / level up, centre screen
//  - CharacterPanel (I) and ShopPanel (from a merchant's conversation)

import { bookTabs, closeBtn } from './kroniekui';
import { hint, nav } from './nav';
import * as THREE from 'three';
import { type Gear, LEVEL_CAP, RARITY, STAT_HELP, STAT_NAMES, type Stat, gearLines, gearValue, rollGear, sellValue, xpToNext } from '../rpg/character';
import type { QuestEngine } from '../rpg/quests';
import { FACTIONS } from '../rpg/factions';
import { stuivers } from '../rpg/money';
import { DRAGON_SKILLS } from '../player/dragonskills';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const div = (cls: string, html = '') => {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = html;
  return d;
};

// ================================================================ guide
export interface GuideTarget {
  x: number;
  z: number;
  /** search radius for area objectives (0 = a point) */
  r: number;
  title: string;
  text: string;
  /** a person to talk to: the waypoint sits above their head */
  person?: boolean;
  /** false: only the on-screen mark, no column of light (the prologue keeps its night dark) */
  pillar?: boolean;
}

export class Guide {
  group = new THREE.Group();
  private pillar: THREE.Mesh;
  private ring: THREE.Mesh;
  private el = div('waypoint', '<div class="wp-icon">◆</div><div class="wp-text"></div>');
  private icon: HTMLElement;
  private text: HTMLElement;
  private v = new THREE.Vector3();
  target: GuideTarget | null = null;
  /** a banner or a card is up: keep quiet */
  hush = false;
  private time = 0;
  private lastText = '';
  private said = 0;

  constructor(root: HTMLElement) {
    root.appendChild(this.el);
    this.icon = this.el.querySelector('.wp-icon')!;
    this.text = this.el.querySelector('.wp-text')!;
    // a column of light that fades upwards: visible from anywhere in the valley
    const geo = new THREE.CylinderGeometry(1.1, 1.6, 220, 16, 1, true).translate(0, 110, 0);
    const col = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < geo.attributes.position.count; i++) {
      const y = geo.attributes.position.getY(i) / 220;
      const a = (1 - y) ** 2;
      col[i * 3] = 1 * a; col[i * 3 + 1] = 0.78 * a; col[i * 3 + 2] = 0.38 * a;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.pillar = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.pillar.frustumCulled = false;
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.97, 1, 96).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#ffcc66', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    this.group.add(this.pillar, this.ring);
  }

  update(dt: number, cam: THREE.PerspectiveCamera, px: number, pz: number, ground: (x: number, z: number) => number) {
    this.time += dt;
    const t = this.target;
    if (!t) {
      this.group.visible = false;
      this.el.style.display = 'none';
      return;
    }
    const gy = ground(t.x, t.z);
    const dist = Math.hypot(t.x - px, t.z - pz);
    this.group.visible = true;
    this.pillar.position.set(t.x, gy, t.z);
    // fade the pillar out when you are there, so it never blocks the view
    (this.pillar.material as THREE.MeshBasicMaterial).opacity = Math.min(0.55, Math.max(0, (dist - (t.r || 6)) / 60)) * (0.85 + Math.sin(this.time * 2) * 0.15);
    this.pillar.scale.set(1 + dist / 900, 1, 1 + dist / 900);
    this.pillar.visible = t.pillar !== false;
    this.ring.visible = t.r > 0;
    this.ring.position.set(t.x, gy + 0.5, t.z);
    this.ring.scale.setScalar(t.r);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(this.time * 3) * 0.15;

    // the on-screen waypoint
    const w = window.innerWidth, h = window.innerHeight;
    this.v.set(t.x, gy + (t.person ? 2.9 : t.r > 0 ? 3 : 4), t.z).project(cam);
    let x = (this.v.x * 0.5 + 0.5) * w, y = (-this.v.y * 0.5 + 0.5) * h;
    const behind = this.v.z > 1;
    if (behind) { x = w - x; y = h - y; }
    const m = 46;
    const off = behind || x < m || x > w - m || y < m || y > h - m;
    if (off) {
      // clamp to the screen edge, pointing the way
      const cx = w / 2, cy = h / 2;
      let dx = x - cx, dy = y - cy;
      if (behind && Math.abs(dy) < 1) dy = 1;
      const s = Math.min((cx - m) / Math.max(1e-3, Math.abs(dx)), (cy - m) / Math.max(1e-3, Math.abs(dy)));
      x = cx + dx * s;
      y = cy + dy * s;
      this.icon.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI / 2}rad)`;
      this.icon.textContent = '▲';
    } else {
      this.icon.style.transform = '';
      this.icon.textContent = t.person ? '!' : '◆';
    }
    this.el.classList.toggle('edge', off);
    // only words when it is in view and not right on top of you
    // words only for a few seconds when the objective changes, or when you look straight at it;
    // the tracker carries them the rest of the time
    if (t.text !== this.lastText) {
      this.lastText = t.text;
      this.said = this.time;
    }
    const looking = Math.abs(x - w / 2) < w * 0.09 && Math.abs(y - h / 2) < h * 0.14;
    const speak = !off && dist >= 8 && !this.hush && (this.time - this.said < 6 || looking);
    this.text.textContent = speak ? t.text : '';
    this.el.style.display = '';
    this.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }
}

// ================================================================ player frame
/** Engraved-line icons for the action bar (24 x 24, stroked in the current colour). */
const ICONS: Record<string, string> = {
  sword: '<path d="M20 3l-1 5-9 9-3-3 9-9zM7.500 13.500l-3 3M10.500 16.500l-3 3M4 20l2.500-2.500"/>',
  fire: '<path d="M12 21a6 6 0 0 1-6-6c0-3 2-4.500 3-7 1 1.500 1.500 2.500 1.500 4 1.500-2 2-5 1.500-9 4 3 6 7 6 12a6 6 0 0 1-6 6z"/><path d="M12 21a2.500 2.500 0 0 1-2.500-2.500c0-1.500 1.200-2.200 2.500-4 1.300 1.800 2.500 2.500 2.500 4A2.500 2.500 0 0 1 12 21z"/>',
  zware_slag: '<path d="M3 19C5 10 12 5 21 4c-5 3-9 7-10 15"/><path d="M6 20c1-6 5-10 10-13"/>',
  strijdkreet: '<path d="M4 10v4l3 .500L13 19V5L7 9.500zM16.500 9.500c1 1.200 1 3.800 0 5M19 7c2.200 2.500 2.200 7.500 0 10"/>',
  klokslag: '<path d="M12 3.500a5.500 5.500 0 0 0-5.500 5.500v4.500L4.500 17h15l-2-3.500V9A5.500 5.500 0 0 0 12 3.500zM10 19.500a2 2 0 0 0 4 0M12 1.500v2"/>',
  zuivere_toon: '<path d="M2 12h3l2.500-7 3.500 14 3-10 2 5 1.500-2H22"/>',
  pistoolschot: '<circle cx="12" cy="12" r="6.500"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  rookbom: '<path d="M7 18a4 4 0 0 1-.500-8 5.500 5.500 0 0 1 10.600-1.200A4.600 4.600 0 0 1 17 18z"/><path d="M9 21h6"/>',
  roll: '<path d="M19.500 12a7.500 7.500 0 1 1-2.600-5.700"/><path d="M17.500 2.500v4.300h-4.300"/>',
  salve: '<path d="M8 9h8l1.500 3v7.500a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V12zM9.500 5h5v4h-5zM10 15h4M12 13v4"/>',
  // the dragon's skills, taught by Het Oude Volk (src/player/dragonskills.ts): mist, the wing, the call
  ds_nevel: '<path d="M3 9c2-1.500 4-1.500 6 0s4 1.500 6 0 4-1.500 6 0M3 13c2-1.500 4-1.500 6 0s4 1.500 6 0 4-1.500 6 0M5 17c2-1.200 3.500-1.200 5.500 0s3.500 1.200 5.500 0"/>',
  ds_slag: '<path d="M12 6c-2 3-5 4.500-9 5 3 1 5.500 2.500 6.500 5L12 14l2.500 2c1-2.500 3.500-4 6.500-5-4-.500-7-2-9-5z"/><path d="M5 20h14"/>',
  ds_roep: '<path d="M12 3c2 3 5 4 5 8a5 5 0 0 1-10 0c0-4 3-5 5-8z"/><path d="M4 20c2.500-1.500 5.500-1.500 8 0s5.500 1.500 8 0"/>',
};
const icon = (id: string | undefined) => (id && ICONS[id] ? `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[id]}</svg>` : '');

export interface SlotView {
  key: string;
  name: string;
  /** which engraving to show */
  icon?: string;
  /** 0..1 of the cooldown left */
  cd: number;
  ready: boolean;
  count?: number;
  locked?: string;
}

/** The pad's button for a keyboard key the game shows (action bar, panels, hints). */
export const PAD_KEY: Record<string, string> = { LMB: 'RT', RMB: 'LT', R: 'B', SPACE: 'A', Q: '▼', G: '◀', E: 'Y', I: '▶', J: 'RB' };

/** A key cap, or a little mouse with the button lit for LMB / RMB. */
export function keyGlyph(key: string) {
  if (key === 'LMB' || key === 'RMB') {
    const left = key === 'LMB';
    return `<svg class="mouse" viewBox="0 0 14 20" aria-label="${left ? 'left mouse button' : 'right mouse button'}"><path d="M1 8V7a6 6 0 0 1 12 0v6a6 6 0 0 1-12 0z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="${left ? 'M7 1.2A5.8 5.8 0 0 0 1.2 7v1.4H7z' : 'M7 1.2A5.8 5.8 0 0 1 12.8 7v1.4H7z'}" fill="currentColor"/><path d="M1 8.4h12M7 1v7.4" stroke="currentColor" stroke-width="1"/></svg>`;
  }
  return key === 'SPACE' ? '␣' : key;
}

export class PlayerFrame {
  el = div('pframe');
  private hp: HTMLElement;
  private hpText: HTMLElement;
  private res: HTMLElement;
  private xp: HTMLElement;
  private xpText: HTMLElement;
  private slots: HTMLElement;
  private who: HTMLElement;
  private vignette = div('hurtvig');
  private lastSig = '';

  constructor(root: HTMLElement) {
    this.el.innerHTML = `
      <div class="pf-who"></div>
      <div class="pf-bars">
        <div class="bar hp"><i></i><span></span></div>
        <div class="bar res"><i></i></div>
      </div>
      <div class="pf-slots"></div>
      <div class="xpbar"><i></i><span></span></div>`;
    root.append(this.el, this.vignette);
    this.hp = this.el.querySelector('.hp i')!;
    this.hpText = this.el.querySelector('.hp span')!;
    this.res = this.el.querySelector('.res i')!;
    this.xp = this.el.querySelector('.xpbar i')!;
    this.xpText = this.el.querySelector('.xpbar span')!;
    this.slots = this.el.querySelector('.pf-slots')!;
    this.who = this.el.querySelector('.pf-who')!;
  }

  hurt(f: number) {
    this.vignette.style.opacity = String(Math.min(0.9, 0.35 + f * 3));
    this.vignette.classList.remove('fade');
    void this.vignette.offsetWidth;
    this.vignette.classList.add('fade');
  }

  update(q: QuestEngine, resonance: number, meterLabel: string, slots: SlotView[], fireMeter: number | null) {
    const h = q.s.hero;
    const d = q.sheet.derived();
    this.hp.style.width = `${(100 * h.hp) / d.maxHp}%`;
    this.hpText.textContent = `${Math.ceil(h.hp)} / ${d.maxHp}`;
    this.res.style.width = `${fireMeter ?? resonance}%`;
    this.res.parentElement!.dataset.label = meterLabel;
    this.res.parentElement!.classList.toggle('fire', fireMeter !== null);
    const need = xpToNext(h.level);
    const top = h.level >= LEVEL_CAP;
    this.xp.style.width = top ? '100%' : `${Math.min(100, (100 * h.xp) / need)}%`;
    this.xpText.textContent = top ? `Level ${h.level} · top level` : `Level ${h.level} · ${h.xp} / ${need} experience`;
    const who = `${esc(h.name)} <span>${esc(q.sheet.origin.name)} · level ${h.level}</span><b>${stuivers(q.s.florins)}</b>`;
    if (this.who.innerHTML !== who) this.who.innerHTML = who;
    const sig = slots.map((s) => `${s.key}${s.name}${s.count ?? ''}${s.locked ?? ''}`).join('|');
    if (sig !== this.lastSig) {
      this.lastSig = sig;
      this.slots.innerHTML = slots
        .map((s) => `<div class="slot${s.locked ? ' locked' : ''}" title="${esc(s.name)}">${icon(s.icon)}<div class="k">${keyGlyph(s.key)}</div><div class="n">${esc(s.name)}</div>${s.count !== undefined ? `<div class="c">${s.count}</div>` : ''}${s.locked ? `<div class="lk">${esc(s.locked)}</div>` : ''}<div class="cd"></div></div>`)
        .join('');
    }
    slots.forEach((s, i) => {
      const el = this.slots.children[i] as HTMLElement | undefined;
      if (!el) return;
      (el.querySelector('.cd') as HTMLElement).style.height = `${s.cd * 100}%`;
      el.classList.toggle('dim', !s.ready);
    });
  }
}

// ================================================================ banner
export class Banner {
  private el = div('banner');
  private queue: { kind: string; kicker: string; title: string; lines: string[] }[] = [];
  private t = 0;

  constructor(root: HTMLElement) {
    root.appendChild(this.el);
  }

  /** showing something, or about to */
  get active() {
    return this.t > -0.5 || this.queue.length > 0;
  }

  show(kind: 'start' | 'done' | 'failed' | 'level' | 'loot', kicker: string, title: string, lines: string[] = []) {
    this.queue.push({ kind, kicker, title, lines });
  }

  /** Put everything away at once (you fell: what was waiting no longer matters). */
  clear() {
    this.queue = [];
    this.t = -1;
    this.el.classList.remove('show');
  }

  update(dt: number) {
    this.t -= dt;
    if (this.t <= 0 && this.el.classList.contains('show')) this.el.classList.remove('show');
    if (this.t < -0.5 && this.queue.length) {
      const b = this.queue.shift()!;
      this.el.className = `banner ${b.kind}`;
      this.el.innerHTML = `<div class="kick">${esc(b.kicker)}</div><div class="title">${esc(b.title)}</div>${b.lines.filter(Boolean).map((l) => `<div class="line">${esc(l)}</div>`).join('')}`;
      void this.el.offsetWidth;
      this.el.classList.add('show');
      this.t = b.kind === 'level' ? 3.6 : 3.0;
    }
  }
}

// ================================================================ character & shop
function gearCard(g: Gear, extra = '') {
  return `<div class="gcard r${g.rarity}"><div class="gn" style="color:${RARITY[g.rarity].color}">${esc(g.name)}</div>
    <div class="gt">${RARITY[g.rarity].name} · ${g.slot === 'wapen' ? 'Weapon' : g.slot === 'harnas' ? 'Armour' : 'Talisman'} · level ${g.ilvl}</div>
    ${gearLines(g).map((l) => `<div class="gl">${esc(l)}</div>`).join('')}
    ${g.text ? `<div class="gx">${esc(g.text)}</div>` : ''}${extra}</div>`;
}

/** One thing on a merchant's table (src/life/shop.ts builds these). */
export interface ShopWare {
  key: string;
  name: string;
  text?: string;
  price: number;
  /** a piece of gear: shown as a card */
  gear?: Gear;
  /** a colour sample (cloak dyes) */
  swatch?: string;
  /** why it cannot be bought yet (standing, level) */
  locked?: string;
  /** a small mark: "new", "better", "worn" */
  tag?: string;
}

/** A merchant's shop: their wares, their prices, their voice. */
export interface ShopView {
  title: string;
  greet?: string;
  /** what standing does to the prices here, in a line */
  note?: string;
  wares: ShopWare[];
  /** true when it was bought */
  buy(key: string): boolean;
  /** what the merchant pays for gear, as a share of its value (default 1) */
  sellRate?: number;
  /** a piece of gear was sold here, for this much */
  sold?(g: Gear, price: number): void;
  /** your last sale of the day to this merchant, which you can buy back for what you got */
  buyback?: { gear: Gear; price: number } | null;
  /** true when it was bought back */
  buyBack?(): boolean;
  /** the same shop rebuilt as it is now (after a purchase, a sale or a change of gear) */
  refresh?(): ShopView;
}

export class CharacterPanel {
  el = div('charpanel');
  open = false;
  /** set while talking to a merchant: items can be sold, and the shop lists wares */
  shop = false;
  /** the merchant whose wares are shown (null: Marieke's old mixed stock) */
  vendor: ShopView | null = null;
  /** extra rows for the stats column (standing with the parties you know: src/life/standing.ts) */
  extra: (() => string) | null = null;
  private wares: Gear[] = [];
  private waresLevel = 0;
  /** clicks are ignored until then (ms): the panel is rebuilt after each action, so the second click of a double click would land on the next card */
  private busyUntil = 0;
  /** a rare or unique piece you pressed VERKOPEN on once: the second press sells it */
  private confirmSell: string | null = null;

  constructor(root: HTMLElement, private q: QuestEngine, private onChange: () => void, private coins: () => void) {
    this.el.hidden = true;
    root.appendChild(this.el);
    // a column that scrolls shows that there is more below it (a soft fade at its foot)
    this.el.addEventListener('scroll', (e) => this.more(e.target as HTMLElement), { capture: true });
  }

  private more(c: HTMLElement) {
    if (c.classList?.contains('scrolls')) c.classList.toggle('more', c.scrollHeight - c.scrollTop - c.clientHeight > 6);
  }

  toggle(force?: boolean, shop = false, vendor: ShopView | null = null) {
    this.open = force ?? !this.open;
    this.shop = this.open && shop;
    this.vendor = this.shop ? vendor : null;
    this.confirmSell = null;
    this.el.hidden = !this.open;
    if (this.open) {
      document.exitPointerLock?.();
      nav.refocus();
      if (this.shop && (this.wares.length === 0 || this.waresLevel !== this.q.s.hero.level)) {
        this.waresLevel = this.q.s.hero.level;
        this.wares = [rollGear(this.waresLevel, 1, 'wapen'), rollGear(this.waresLevel, 1, 'harnas'), rollGear(this.waresLevel, 1, 'talisman'), rollGear(this.waresLevel + 1, 2)];
      }
      this.render();
    }
    return this.open;
  }

  /** a purchase you cannot pay: the button says so for a moment */
  private poor(b: HTMLButtonElement) {
    const was = b.textContent;
    b.textContent = 'NOT ENOUGH STUIVERS';
    setTimeout(() => {
      if (b.isConnected) b.textContent = was;
    }, 1200);
  }

  render() {
    if (!this.open) return;
    const h = this.q.s.hero;
    const d = this.q.sheet.derived();
    const o = this.q.sheet.origin;
    const stat = (k: Stat) => `<div class="st" title="${esc(STAT_HELP[k])}"><span>${STAT_NAMES[k]}</span><b>${d[k]}</b></div>`;
    const worn = (['wapen', 'harnas', 'talisman'] as const)
      .map((s) => (h.gear[s] ? gearCard(h.gear[s]!) : `<div class="gcard empty">${s === 'wapen' ? 'No weapon' : s === 'harnas' ? 'No armour' : 'No talisman'}</div>`))
      .join('');
    const bag = h.bag.length
      ? h.bag
          .map((g) => {
            const price = sellValue(g, this.vendor?.sellRate ?? 1);
            const sure = this.shop && this.confirmSell === g.uid;
            // a rare or unique piece asks once more; what you sell can be bought back today (from a merchant)
            const warn = sure ? `<div class="gsure">A ${RARITY[g.rarity].name.toLowerCase()} piece. Sell it for good? ${this.vendor?.sold ? 'You can buy it back today at the same price.' : 'Sold is sold.'}</div>` : '';
            const sell = this.shop ? `<button data-sell="${g.uid}"${sure ? ' class="warn"' : ''}>${sure ? 'YES, SELL' : 'SELL'} · ${price} st.</button>` : '';
            return gearCard(g, `${warn}<div class="gb">${this.q.sheet.better(g) ? '<span class="up">▲ better</span>' : ''}<button data-eq="${g.uid}">EQUIP</button>${sell}</div>`);
          })
          .join('')
      : '<div class="empty">Your bag is empty. Beaten enemies sometimes drop something.</div>';
    const v = this.vendor;
    const shopHtml = this.shop && v
      ? `<div class="shop vshop scrolls"><h3>${esc(v.title)}</h3>${v.greet ? `<p class="vgreet">${esc(v.greet)}</p>` : ''}${v.note ? `<p class="vnote">${esc(v.note)}</p>` : ''}
          ${v.buyback ? gearCard(v.buyback.gear, `<div class="gsure back">Sold to me today. Buy it back for what you got.</div><div class="gb"><button data-back="1"${this.q.s.florins < v.buyback.price ? ' class="poor"' : ''}>BUY BACK · ${v.buyback.price} st.</button></div>`) : ''}
          ${v.wares.map((w) => {
            const btn = w.locked ? `<span class="vlock">${esc(w.locked)}</span>` : `<button data-vbuy="${esc(w.key)}"${this.q.s.florins < w.price ? ' class="poor"' : ''}>BUY · ${w.price} st.</button>`;
            if (w.gear) return gearCard(w.gear, `<div class="gb">${w.tag ? `<span class="up">${esc(w.tag)}</span>` : ''}${btn}</div>`);
            return `<div class="ware vware${w.locked ? ' locked' : ''}">${w.swatch ? `<i class="swatch" style="background:${esc(w.swatch)}"></i>` : ''}<span><b>${esc(w.name)}</b>${w.tag ? ` <em>${esc(w.tag)}</em>` : ''}${w.text ? `<small>${esc(w.text)}</small>` : ''}</span>${btn}</div>`;
          }).join('')}
        </div>`
      : this.shop
      ? `<div class="shop scrolls"><h3>MARIEKE'S WARES</h3>
          <div class="ware"><span>Begijn salve (restores half your health)</span><button data-buy="salve">BUY · 6 st.</button></div>
          ${this.wares.map((g, i) => gearCard(g, `<div class="gb"><button data-buyg="${i}">BUY · ${gearValue(g) * 4} st.</button></div>`)).join('')}
        </div>`
      : '';
    const sellRate = v?.sellRate ?? 1;
    this.el.innerHTML = `<header>${this.shop ? '' : bookTabs('character')}<h2>${esc(h.name)}</h2>${closeBtn()}<span><b class="ch-who" title="${esc(`${this.q.sheet.background.perkName}: ${this.q.sheet.background.perk} Born loyal to: ${FACTIONS[h.faction]?.name ?? ''}.`)}">${esc(this.q.sheet.background.name[h.sex === 'f' ? 1 : 0])} · ${esc(FACTIONS[h.faction]?.name ?? '')}</b> · ${esc(o.name)} · level ${h.level} · ${stuivers(this.q.s.florins)} · ${this.q.s.inv.salve ?? 0} salve</span></header>
      <div class="cols${this.shop ? ' shopcols' : ''}">
        <div class="col stats"${this.shop ? " hidden" : ""}><h3>ATTRIBUTES</h3>${(['kracht', 'klank', 'list', 'taaiheid'] as Stat[]).map(stat).join('')}
          <div class="st"><span>Health</span><b>${d.maxHp}</b></div>
          <div class="st"><span>Damage</span><b>${d.dmg[0]}–${d.dmg[1]}</b></div>
          <div class="st"><span>Armour</span><b>${d.armor}</b></div>
          <div class="st"><span>Critical</span><b>${d.crit.toFixed(0)}%</b></div>
          <h3>SKILLS</h3>
          <p class="res-note">Resonance, the gold bar under your health, grows with every hit that lands and drains outside a fight. Your skills cost Resonance.</p>
          <div class="sk"><b>${hint('Right mouse', 'LT')} · ${esc(o.skill.name)}</b><p>${esc(o.skill.text)}</p></div>
          <div class="sk${h.level < o.skill2.level ? ' locked' : ''}"><b>${hint('R', 'B')} · ${esc(o.skill2.name)}${h.level < o.skill2.level ? ` (level ${o.skill2.level})` : ''}</b><p>${esc(o.skill2.text)}</p></div>
          <div class="sk"><b>${hint('Left mouse', 'LB')} in the air · Dragonfire</b><p>${esc(h.dragon)} breathes fire where you look.</p></div>
          ${(() => {
            // what Het Oude Volk taught the dragon, in one entry (the panel has to fit at 1280 x 720)
            const ds = Object.values(DRAGON_SKILLS).filter((d) => this.q.s.flags[`ov_${d.id}`]);
            return ds.length ? `<div class="sk"><b>Gifts of ${esc(h.dragon)}</b><p>${ds.map((d) => `${esc(d.name)} (${hint(d.key === 'RMB' ? 'right mouse' : d.key, PAD_KEY[d.key] ?? d.key)}${d.flying ? ' in the air' : ' on foot'})`).join(', ')}. Learned from the Oude Volk.</p></div>` : '';
          })()}
        </div>
        ${this.shop
          ? `<div class="col mine scrolls"><h3>IN YOUR BAG</h3><div class="bag">${bag}</div><h3>WORN</h3>${worn}</div>`
          : `<div class="col"><h3>WORN</h3>${worn}${this.extra ? this.extra() : ''}</div>
        <div class="col"><h3>IN YOUR BAG</h3><div class="bag scrolls">${bag}</div></div>`}
        ${shopHtml ? `<div class="col">${shopHtml}</div>` : ''}
      </div>`;
    requestAnimationFrame(() => this.el.querySelectorAll<HTMLElement>('.scrolls').forEach((c) => this.more(c)));
    /** one action per click, and none for a moment after it */
    const act = (b: HTMLButtonElement, fn: () => void) =>
      b.addEventListener('click', () => {
        const now = performance.now();
        if (now < this.busyUntil) return;
        this.busyUntil = now + 450;
        fn();
      });
    /** after an action: the shop as it is now, then the panel */
    const redraw = () => {
      if (this.vendor?.refresh) this.vendor = this.vendor.refresh();
      this.render();
    };
    this.el.querySelectorAll<HTMLButtonElement>('button[data-eq]').forEach((b) =>
      act(b, () => {
        this.q.sheet.equip(b.dataset.eq!);
        this.q.save();
        this.onChange();
        redraw();
      }),
    );
    this.el.querySelectorAll<HTMLButtonElement>('button[data-sell]').forEach((b) =>
      act(b, () => {
        const i = h.bag.findIndex((g) => g.uid === b.dataset.sell);
        if (i < 0) return;
        const g = h.bag[i];
        if (g.rarity >= 2 && this.confirmSell !== g.uid) {
          this.confirmSell = g.uid;
          this.render();
          return;
        }
        this.confirmSell = null;
        const price = sellValue(g, sellRate);
        this.q.s.florins += price;
        h.bag.splice(i, 1);
        this.vendor?.sold?.(g, price);
        this.q.save();
        this.coins();
        redraw();
      }),
    );
    const back = this.el.querySelector<HTMLButtonElement>('button[data-back]');
    if (back) act(back, () => {
      if (!this.vendor?.buyBack?.()) return this.poor(back);
      this.q.save();
      this.coins();
      this.onChange();
      redraw();
    });
    // any other press puts a waiting "are you sure?" away
    if (this.confirmSell) this.el.querySelectorAll<HTMLButtonElement>('button:not([data-sell])').forEach((b) => b.addEventListener('click', () => (this.confirmSell = null), { capture: true }));
    const buyOne = this.el.querySelector<HTMLButtonElement>('button[data-buy]');
    if (buyOne) act(buyOne, () => {
      if (this.q.s.florins < 6) return;
      this.q.s.florins -= 6;
      this.q.s.inv.salve = (this.q.s.inv.salve ?? 0) + 1;
      this.q.save();
      this.coins();
      this.render();
    });
    this.el.querySelectorAll<HTMLButtonElement>('button[data-vbuy]').forEach((b) =>
      act(b, () => {
        if (!this.vendor?.buy(b.dataset.vbuy!)) {
          const w = this.vendor?.wares.find((x) => x.key === b.dataset.vbuy);
          if (w && !w.locked && this.q.s.florins < w.price) this.poor(b);
          return;
        }
        this.q.save();
        this.coins();
        this.onChange();
        redraw();
      }),
    );
    this.el.querySelectorAll<HTMLButtonElement>('button[data-buyg]').forEach((b) =>
      act(b, () => {
        const i = Number(b.dataset.buyg);
        const g = this.wares[i];
        if (!g || this.q.s.florins < gearValue(g) * 4) return;
        this.q.s.florins -= gearValue(g) * 4;
        h.bag.push(g);
        this.wares.splice(i, 1);
        this.q.save();
        this.coins();
        this.render();
      }),
    );
  }
}
