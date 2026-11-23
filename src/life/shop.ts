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
import { hash, seeded, today } from './lines';

export interface ShopHost {
  q: QuestEngine;
  standing: Standing;
  /** carry out a good's effect (`price`: what was paid); false when it cannot be used now (already known, full life...) */
  use(g: Good, seller: string, price: number): boolean;
  /** is this good of no use any more (a print of places already known)? */
  spent(g: Good): string | null;
  coins(): void;
}

let uidN = 0;
const uid = () => `l${Date.now().toString(36)}${(uidN++).toString(36)}`;

export function talismanGear(id: string, level: number, paid?: number): Gear | null {
  const t = TALISMANS[id];
  if (!t) return null;
  return { uid: uid(), base: 'pelgrimsinsigne', name: t.name, slot: 'talisman', rarity: t.rarity, ilvl: Math.max(1, level), mods: { ...t.mods }, text: t.text, paid };
}

export class Shops {
  /** each seller's table today: rolled once a day, with what a higher tier opens added to it */
  private stock = new Map<string, { day: string; L: number; opened: Set<string>; items: Gear[] }>();

  constructor(private h: ShopHost) {}

  private tierName(f: FactionId, t: number) {
    return `${TIERS[t].name} with ${FACTIONS[f].name}`;
  }

  /**
   * Gear on the table: rolled for the hero's level, better with standing; the same all day. It is rolled
   * from the day, the seller, your level and tier, so a reload shows the same table (what you own is not
   * on it twice). A purchase or a level does not reroll it; a higher tier adds what it opens.
   */
  private gear(seller: string, f: FactionId): Gear[] {
    const spec = GEAR_STOCK[seller];
    if (!spec) return [];
    const day = today(), t = this.h.standing.level(f);
    let s = this.stock.get(seller);
    if (!s || s.day !== day) {
      const L = this.h.q.s.hero.level;
      const items: Gear[] = [];
      const slots = spec.slot ? Array(spec.count).fill(spec.slot) : ['wapen', 'harnas', 'talisman', undefined];
      slots.forEach((slot, i) => items.push(this.roll(`${day}|${seller}|${L}|${t}|${i}`, L + (i === slots.length - 1 && t >= 1 ? 1 : 0), t >= 1 ? 1 : 0, slot)));
      s = { day, L, opened: new Set(), items };
      this.stock.set(seller, s);
    }
    const L = s.L;
    if (t >= 2 && !s.opened.has('rare')) {
      s.opened.add('rare');
      s.items.push(this.roll(`${day}|${seller}|${L}|rare`, L + 1, 2, spec.slot ?? undefined));
    }
    for (const sp of SPECIALS[seller] ?? []) {
      if (t < sp.tier || s.opened.has(sp.name)) continue;
      s.opened.add(sp.name);
      const g = this.roll(`${day}|${seller}|${L}|${sp.name}`, L + 1, 2, sp.base);
      g.name = sp.name;
      g.text = sp.text;
      if (sp.tier >= 4) {
        g.rarity = 3;
        if (g.dmg) g.dmg = [Math.round(g.dmg[0] * 1.2), Math.round(g.dmg[1] * 1.2)];
        if (g.armor) g.armor = Math.round(g.armor * 1.2);
      }
      s.items.push(g);
    }
    // a piece you bought (and still have) is not for sale again, also after a reload
    const h = this.h.q.s.hero;
    const own = new Set([...h.bag.map((g) => g.uid), ...Object.values(h.gear).map((g) => g?.uid)]);
    s.items = s.items.filter((g) => !own.has(g.uid));
    return s.items;
  }

  /** One piece, the same every time for the same key (and with a uid made from it). */
  private roll(key: string, level: number, minRarity: 0 | 1 | 2, slot?: 'wapen' | 'harnas' | 'talisman') {
    const g = rollGear(level, minRarity, slot, seeded(hash(key)));
    g.uid = `s${hash(key).toString(36)}`;
    return g;
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
        if (this.h.q.s.hero.cloak.toLowerCase() === g.use.cloak.toLowerCase()) w.tag = 'worn';
      }
      if ('salve' in g.use || 'regen' in g.use) {
        const id = 'salve' in g.use ? 'salve' : g.id;
        const n = this.h.q.s.inv[id] ?? 0;
        if (n) w.tag = `you have ${n}`;
      }
      if (need > tier) w.locked = `Requires ${this.tierName(f, need)}`;
      else if ((g.level ?? 0) > L) w.locked = `From level ${g.level}`;
      else if (spent) w.locked = spent;
      else if ('heal' in g.use && this.h.q.s.hero.hp >= this.h.q.sheet.derived().maxHp) w.locked = 'You are already fully healed';
      wares.push(w);
    }
    this.gear(seller, f).forEach((g, i) => {
      wares.push({ key: `w:${i}:${g.uid}`, name: g.name, gear: g, price: st.price(gearValue(g) * 4, f), tag: this.h.q.sheet.better(g) ? '▲ better' : undefined });
    });
    // what more standing would bring
    for (const sp of SPECIALS[seller] ?? []) if (tier < sp.tier) wares.push({ key: `x:${sp.name}`, name: sp.name, text: sp.text, price: 0, locked: `Requires ${this.tierName(f, sp.tier)}` });
    if (GEAR_STOCK[seller] && tier < 2) wares.push({ key: 'x:rare', name: 'Rare piece', text: 'The best pieces lie under the counter.', price: 0, locked: `Requires ${this.tierName(f, 2)}` });
    return {
      title,
      greet,
      note: st.priceNote(f),
      wares,
      sellRate: 0.8 + tier * 0.05,
      buy: (key) => this.buy(seller, f, goods, key),
      sold: (g, price) => this.sold(seller, g, price),
      buyback: this.buyback(seller),
      buyBack: () => this.buyBack(seller),
      // the same shop again, as it is now (prices, tiers, what is left, what you wear), with the same greeting
      refresh: () => this.view(seller, f, title, goods, greet),
    };
  }

  /**
   * You sold a piece here. Standing it earned when you bought it is taken back (whichever merchant
   * buys it: you did not keep it), and it is remembered until the end of the day, so you can buy it
   * back for what you got.
   */
  private sold(seller: string, g: Gear, price: number) {
    const s = this.h.q.s;
    if (g.from && g.paid) this.h.standing.unspend(g.from as FactionId, g.paid);
    s.life.sold = { day: today(), at: seller, price, gear: g };
  }

  /** Your last sale of the day, if it was to this seller. */
  private buyback(seller: string) {
    const b = this.h.q.s.life.sold;
    return b && b.day === today() && b.at === seller ? { gear: b.gear, price: b.price } : null;
  }

  private buyBack(seller: string) {
    const s = this.h.q.s;
    const b = this.buyback(seller);
    if (!b || s.florins < b.price) return false;
    s.florins -= b.price;
    s.hero.bag.push(b.gear);
    s.life.sold = null;
    // back as you bought it: so is what it earned you
    if (b.gear.from && b.gear.paid) this.h.standing.spend(b.gear.from as FactionId, b.gear.paid);
    return true;
  }

  private buy(seller: string, f: FactionId, goods: Good[], key: string) {
    const s = this.h.q.s;
    const st = this.h.standing;
    if (key.startsWith('g:')) {
      const g = goods.find((x) => x.id === key.slice(2));
      if (!g) return false;
      const price = st.price(g.price, f);
      if (s.florins < price || (g.tier ?? 0) > st.level(f) || this.h.spent(g)) return false;
      const had = s.hero.bag.length;
      if (!this.h.use(g, seller, price)) return false;
      s.florins -= price;
      // a talisman you bought: what it earned with the party goes back if you sell it again
      for (const x of s.hero.bag.slice(had)) if (x.paid !== undefined) x.from = f;
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
      g.paid = price;
      g.from = f;
      s.hero.bag.push(g);
      items.splice(i, 1);
      st.spend(f, price);
      return true;
    }
    return false;
  }
}
