// The game layer of the HUD:
//  - Guide: one tracked objective, shown in the world (a pillar of light, and a
//    ring on the ground for "search this area" objectives) and on screen (a
//    waypoint that clamps to the edge with an arrow when it is behind you)
//  - PlayerFrame: life, Resonance, XP, the action bar with cooldowns
//  - Banner: quest taken / quest done / level up, centre screen
//  - CharacterPanel (I) and ShopPanel (from a merchant's conversation)

import { bookTabs } from './kroniekui';
import * as THREE from 'three';
import { type Gear, RARITY, STAT_HELP, STAT_NAMES, type Stat, gearLines, gearValue, rollGear, xpToNext } from '../rpg/character';
import type { QuestEngine } from '../rpg/quests';

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

/** A key cap, or a little mouse with the button lit for LMB / RMB. */
export function keyGlyph(key: string) {
  if (key === 'LMB' || key === 'RMB') {
    const left = key === 'LMB';
    return `<svg class="mouse" viewBox="0 0 14 20" aria-label="${left ? 'linkermuisknop' : 'rechtermuisknop'}"><path d="M1 8V7a6 6 0 0 1 12 0v6a6 6 0 0 1-12 0z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="${left ? 'M7 1.2A5.8 5.8 0 0 0 1.2 7v1.4H7z' : 'M7 1.2A5.8 5.8 0 0 1 12.8 7v1.4H7z'}" fill="currentColor"/><path d="M1 8.4h12M7 1v7.4" stroke="currentColor" stroke-width="1"/></svg>`;
  }
  return key === 'SPATIE' ? '␣' : key;
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
    this.xp.style.width = `${(100 * h.xp) / need}%`;
    this.xpText.textContent = `Niveau ${h.level} · ${h.xp} / ${need} ervaring`;
    const who = `${esc(h.name)} <span>${esc(q.sheet.origin.name)} · niveau ${h.level}</span><b>${q.s.florins} florijnen</b>`;
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
    <div class="gt">${RARITY[g.rarity].name} · ${g.slot === 'wapen' ? 'Wapen' : g.slot === 'harnas' ? 'Harnas' : 'Talisman'} · niveau ${g.ilvl}</div>
    ${gearLines(g).map((l) => `<div class="gl">${esc(l)}</div>`).join('')}
    ${g.text ? `<div class="gx">${esc(g.text)}</div>` : ''}${extra}</div>`;
}

export class CharacterPanel {
  el = div('charpanel');
  open = false;
  /** set while talking to a merchant: items can be sold, and the shop lists wares */
  shop = false;
  private wares: Gear[] = [];
  private waresLevel = 0;

  constructor(root: HTMLElement, private q: QuestEngine, private onChange: () => void, private coins: () => void) {
    this.el.hidden = true;
    root.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (this.open && e.code === 'Escape') this.toggle(false);
    });
  }

  toggle(force?: boolean, shop = false) {
    this.open = force ?? !this.open;
    this.shop = this.open && shop;
    this.el.hidden = !this.open;
    if (this.open) {
      document.exitPointerLock?.();
      if (this.shop && (this.wares.length === 0 || this.waresLevel !== this.q.s.hero.level)) {
        this.waresLevel = this.q.s.hero.level;
        this.wares = [rollGear(this.waresLevel, 1, 'wapen'), rollGear(this.waresLevel, 1, 'harnas'), rollGear(this.waresLevel, 1, 'talisman'), rollGear(this.waresLevel + 1, 2)];
      }
      this.render();
    }
    return this.open;
  }

  render() {
    if (!this.open) return;
    const h = this.q.s.hero;
    const d = this.q.sheet.derived();
    const o = this.q.sheet.origin;
    const stat = (k: Stat) => `<div class="st" title="${esc(STAT_HELP[k])}"><span>${STAT_NAMES[k]}</span><b>${d[k]}</b></div>`;
    const worn = (['wapen', 'harnas', 'talisman'] as const)
      .map((s) => (h.gear[s] ? gearCard(h.gear[s]!) : `<div class="gcard empty">${s === 'wapen' ? 'Geen wapen' : s === 'harnas' ? 'Geen harnas' : 'Geen talisman'}</div>`))
      .join('');
    const bag = h.bag.length
      ? h.bag
          .map((g) => gearCard(g, `<div class="gb">${this.q.sheet.better(g) ? '<span class="up">▲ beter</span>' : ''}<button data-eq="${g.uid}">DRAAG</button>${this.shop ? `<button data-sell="${g.uid}">VERKOOP · ${gearValue(g)}</button>` : ''}</div>`))
          .join('')
      : '<div class="empty">Uw zak is leeg. Verslagen vijanden laten soms iets vallen.</div>';
    const shopHtml = this.shop
      ? `<div class="shop"><h3>MARIEKES WAREN</h3>
          <div class="ware"><span>Begijnenzalf (geneest de helft van uw leven)</span><button data-buy="salve">KOOP · 6</button></div>
          ${this.wares.map((g, i) => gearCard(g, `<div class="gb"><button data-buyg="${i}">KOOP · ${gearValue(g) * 4}</button></div>`)).join('')}
        </div>`
      : '';
    this.el.innerHTML = `<header>${this.shop ? '' : bookTabs('character')}<h2>${esc(h.name)}</h2><span>${esc(o.name)} · niveau ${h.level} · ${this.q.s.florins} florijnen · ${this.q.s.inv.salve ?? 0} zalf</span></header>
      <div class="cols">
        <div class="col stats"><h3>EIGENSCHAPPEN</h3>${(['kracht', 'klank', 'list', 'taaiheid'] as Stat[]).map(stat).join('')}
          <div class="st"><span>Levenskracht</span><b>${d.maxHp}</b></div>
          <div class="st"><span>Schade</span><b>${d.dmg[0]}–${d.dmg[1]}</b></div>
          <div class="st"><span>Pantser</span><b>${d.armor}</b></div>
          <div class="st"><span>Voltreffer</span><b>${d.crit.toFixed(0)}%</b></div>
          <h3>VAARDIGHEDEN</h3>
          <div class="sk"><b>Rechtermuis · ${esc(o.skill.name)}</b><p>${esc(o.skill.text)}</p></div>
          <div class="sk${h.level < o.skill2.level ? ' locked' : ''}"><b>R · ${esc(o.skill2.name)}${h.level < o.skill2.level ? ` (niveau ${o.skill2.level})` : ''}</b><p>${esc(o.skill2.text)}</p></div>
          <div class="sk"><b>Linkermuis in de lucht · Drakenvuur</b><p>${esc(h.dragon)} spuwt vuur waar ge kijkt.</p></div>
        </div>
        <div class="col"><h3>GEDRAGEN</h3>${worn}</div>
        <div class="col"><h3>ZAK</h3><div class="bag">${bag}</div></div>
        ${shopHtml ? `<div class="col">${shopHtml}</div>` : ''}
      </div>`;
    this.el.querySelectorAll<HTMLButtonElement>('button[data-eq]').forEach((b) =>
      b.addEventListener('click', () => {
        this.q.sheet.equip(b.dataset.eq!);
        this.q.save();
        this.onChange();
        this.render();
      }),
    );
    this.el.querySelectorAll<HTMLButtonElement>('button[data-sell]').forEach((b) =>
      b.addEventListener('click', () => {
        const i = h.bag.findIndex((g) => g.uid === b.dataset.sell);
        if (i < 0) return;
        this.q.s.florins += gearValue(h.bag[i]);
        h.bag.splice(i, 1);
        this.q.save();
        this.coins();
        this.render();
      }),
    );
    this.el.querySelector<HTMLButtonElement>('button[data-buy]')?.addEventListener('click', () => {
      if (this.q.s.florins < 6) return;
      this.q.s.florins -= 6;
      this.q.s.inv.salve = (this.q.s.inv.salve ?? 0) + 1;
      this.q.save();
      this.coins();
      this.render();
    });
    this.el.querySelectorAll<HTMLButtonElement>('button[data-buyg]').forEach((b) =>
      b.addEventListener('click', () => {
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
