// What each merchant sells, at what price: goods (food, salves, prints, dyes,
// talismans) and gear (weapons and armour rolled for your level). Standing
// with the merchant's party lowers prices and opens better wares; what is not
// open yet is shown with what it takes, so the reward for standing is visible.

import { type Gear, gearValue, rollGear } from '../rpg/character';
import { FACTIONS, TIERS, type FactionId } from '../rpg/factions';
import type { QuestEngine } from '../rpg/quests';
import type { ShopView, ShopWare } from '../ui/gamehud';
import { GEAR_STOCK, SPECIALS, TALISMANS } from '../content/diest_life';
import type { Standing } from './standing';
import type { Good } from './types';
import { today } from './lines';

export interface ShopHost {
  q: QuestEngine;
  standing: Standing;
  /** carry out a good's effect; false when it cannot be used now (already known, full life...) */
  use(g: Good, seller: string): boolean;
  /** is this good of no use any more (a print of places already known)? */
  spent(g: Good): string | null;
  coins(): void;
}

let uidN = 0;
const uid = () => `l${Date.now().toString(36)}${(uidN++).toString(36)}`;

export function talismanGear(id: string, level: number): Gear | null {
  const t = TALISMANS[id];
  if (!t) return null;
  return { uid: uid(), base: 'pelgrimsinsigne', name: t.name, slot: 'talisman', rarity: t.rarity, ilvl: Math.max(1, level), mods: { ...t.mods }, text: t.text };
}

export class Shops {
  private stock = new Map<string, { key: string; items: Gear[] }>();

  constructor(private h: ShopHost) {}

  private tierName(f: FactionId, t: number) {
    return `${TIERS[t].name} bij ${FACTIONS[f].name}`;
  }

  /** Gear on the table: rolled for the hero's level, better with standing; the same all day. */
  private gear(seller: string, f: FactionId): Gear[] {
    const spec = GEAR_STOCK[seller];
    if (!spec) return [];
    const L = this.h.q.s.hero.level, t = this.h.standing.level(f);
    const key = `${today()}|${L}|${t}`;
    let s = this.stock.get(seller);
    if (!s || s.key !== key) {
      const items: Gear[] = [];
      const slots = spec.slot ? Array(spec.count).fill(spec.slot) : ['wapen', 'harnas', 'talisman', undefined];
      slots.forEach((slot, i) => items.push(rollGear(L + (i === slots.length - 1 && t >= 1 ? 1 : 0), t >= 1 ? 1 : 0, slot)));
      if (t >= 2) items.push(rollGear(L + 1, 2, spec.slot ?? undefined));
      for (const sp of SPECIALS[seller] ?? []) {
        if (t < sp.tier) continue;
        const g = rollGear(L + 1, 2, sp.base);
        g.name = sp.name;
        g.text = sp.text;
        if (sp.tier >= 4) {
          g.rarity = 3;
          if (g.dmg) g.dmg = [Math.round(g.dmg[0] * 1.2), Math.round(g.dmg[1] * 1.2)];
          if (g.armor) g.armor = Math.round(g.armor * 1.2);
        }
        items.push(g);
      }
      s = { key, items };
      this.stock.set(seller, s);
    }
    return s.items;
  }

  /** The shop panel for a seller: their goods, their gear, and what standing would open. */
  view(seller: string, f: FactionId, title: string, goods: Good[], greet?: string): ShopView {
    const st = this.h.standing;
    const tier = st.level(f);
    const L = this.h.q.s.hero.level;
    const wares: ShopWare[] = [];
    for (const g of goods) {
      const need = g.tier ?? 0;
      const spent = this.h.spent(g);
      const w: ShopWare = { key: `g:${g.id}`, name: g.name, text: g.text, price: st.price(g.price, f) };
      if ('cloak' in g.use) {
        w.swatch = g.use.cloak;
        if (this.h.q.s.hero.cloak.toLowerCase() === g.use.cloak.toLowerCase()) w.tag = 'gedragen';
      }
      if ('salve' in g.use || 'regen' in g.use) {
        const id = 'salve' in g.use ? 'salve' : g.id;
        const n = this.h.q.s.inv[id] ?? 0;
        if (n) w.tag = `je hebt er ${n}`;
      }
      if (need > tier) w.locked = `Voor wie ${this.tierName(f, need)} is`;
      else if ((g.level ?? 0) > L) w.locked = `Vanaf niveau ${g.level}`;
      else if (spent) w.locked = spent;
      wares.push(w);
    }
    this.gear(seller, f).forEach((g, i) => {
      wares.push({ key: `w:${i}:${g.uid}`, name: g.name, gear: g, price: st.price(gearValue(g) * 4, f), tag: this.h.q.sheet.better(g) ? '▲ beter' : undefined });
    });
    // what more standing would bring
    for (const sp of SPECIALS[seller] ?? []) if (tier < sp.tier) wares.push({ key: `x:${sp.name}`, name: sp.name, text: sp.text, price: 0, locked: `Voor wie ${this.tierName(f, sp.tier)} is` });
    if (GEAR_STOCK[seller] && tier < 2) wares.push({ key: 'x:rare', name: 'Zeldzaam stuk', text: 'De beste stukken liggen onder de toonbank.', price: 0, locked: `Voor wie ${this.tierName(f, 2)} is` });
    return {
      title,
      greet,
      note: st.priceNote(f),
      wares,
      sellRate: 0.8 + tier * 0.05,
      buy: (key) => this.buy(seller, f, goods, key),
    };
  }

  private buy(seller: string, f: FactionId, goods: Good[], key: string) {
    const s = this.h.q.s;
    const st = this.h.standing;
    if (key.startsWith('g:')) {
      const g = goods.find((x) => x.id === key.slice(2));
      if (!g) return false;
      const price = st.price(g.price, f);
      if (s.florins < price || (g.tier ?? 0) > st.level(f) || this.h.spent(g)) return false;
      if (!this.h.use(g, seller)) return false;
      s.florins -= price;
      st.spend(f, price);
      return true;
    }
    if (key.startsWith('w:')) {
      const uidWanted = key.split(':')[2];
      const items = this.stock.get(seller)?.items ?? [];
      const i = items.findIndex((g) => g.uid === uidWanted);
      if (i < 0) return false;
      const g = items[i];
      const price = st.price(gearValue(g) * 4, f);
      if (s.florins < price) return false;
      s.florins -= price;
      s.hero.bag.push(g);
      items.splice(i, 1);
      st.spend(f, price);
      return true;
    }
    return false;
  }
}
