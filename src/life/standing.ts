// Standing with the parties (src/rpg/factions.ts), made real: points in
// the save, five tiers, prices and wares that follow the tier, greetings that
// change with it, and the bars in the character panel. Points come from
// buying, helping, quests and jobs; a few acts cost points with a rival.

import * as F from '../rpg/factions';
import { FACTIONS, RENOWN_TO_FACTION, TIERS, type FactionId, tierOf } from '../rpg/factions';
import type { SaveData } from '../rpg/state';

/** Every party there is (four or five: iterate, never assume). */
export const FACTION_IDS = Object.keys(FACTIONS) as FactionId[];

/** Pairs where helping one costs a little with the other (factions.ts RIVALS, when it exists). */
const RIVAL_PAIRS: [FactionId, FactionId][] = ((F as unknown as { RIVALS?: [FactionId, FactionId][] }).RIVALS ?? []);

/** Price multiplier per tier: Vreemde pays full price, a Vertrouweling a fifth less. */
const PRICE = [1, 0.95, 0.9, 0.85, 0.8];

/** Every place that ever had renown belongs to a party (older saves, quest rewards). */
export const PLACE_FACTION: Record<string, FactionId> = { ...RENOWN_TO_FACTION, Kaggevinne: 'vrije' };

export class Standing {
  constructor(private s: SaveData, private toast: (text: string) => void) {
    // older saves kept renown per place: carry it over once (a value already set, e.g. by the
    // character-creation screen, is kept and added to)
    if (!s.life.migrated) {
      for (const [town, n] of Object.entries(s.renown)) {
        const f = PLACE_FACTION[town];
        if (f && n) s.standing[f] = (s.standing[f] ?? 0) + n;
      }
      s.life.migrated = true;
    }
  }

  points(f: FactionId) {
    return Math.max(0, this.s.standing[f] ?? 0);
  }

  tier(f: FactionId) {
    return tierOf(this.points(f));
  }

  /** 0 (Vreemde) .. 4 (Vertrouweling) */
  level(f: FactionId) {
    return this.tier(f).index;
  }

  price(base: number, f: FactionId) {
    return Math.max(1, Math.round(base * PRICE[this.level(f)]));
  }

  priceNote(f: FactionId) {
    const t = this.tier(f);
    const off = Math.round((1 - PRICE[t.index]) * 100);
    const next = t.next !== null ? ` · nog ${t.next - this.points(f)} tot ${TIERS[t.index + 1].name}` : '';
    return `${FACTIONS[f].name}: ${t.name}${off ? ` · ${off}% korting` : ' · volle prijs'}${next}`;
  }

  /** Change standing; says so in a toast, and loudly when a tier is crossed. */
  add(f: FactionId, n: number, why = '', rival = true) {
    if (!n || !FACTIONS[f]) return;
    // the rival party notices: a quarter of what you gained, at least one point
    if (rival && n >= 3) for (const [a, b] of RIVAL_PAIRS) if (a === f || b === f) this.add(a === f ? b : a, -Math.max(1, Math.round(n / 4)), '', false);
    const before = this.level(f);
    this.s.standing[f] = Math.max(0, (this.s.standing[f] ?? 0) + n);
    const after = this.tier(f);
    if (after.index !== before) this.toast(`${FACTIONS[f].name.toUpperCase()} · ${after.index > before ? 'nu' : 'nog maar'} ${after.name}`);
    else this.toast(`${FACTIONS[f].name.toUpperCase()} ${n > 0 ? '+' : ''}${n}${why ? ' · ' + why : ''}`);
  }

  /** Money spent with a party turns into standing: one point for every ten florins. */
  spend(f: FactionId, florins: number) {
    const sp = this.s.life.spent;
    sp[f] = (sp[f] ?? 0) + florins;
    const pts = Math.floor(sp[f] / 10);
    if (pts > 0) {
      sp[f] -= pts * 10;
      this.add(f, pts, 'goede klant');
    }
  }

  /** Renown with a place moved (a quest effect): the place's party follows. */
  renown(town: string, n: number) {
    const f = PLACE_FACTION[town];
    if (f) this.add(f, n);
  }

  /** Bars with the tier name, for the character panel. */
  html() {
    const rows = FACTION_IDS.map((f) => {
      const p = this.points(f);
      const t = tierOf(p);
      const lo = TIERS[t.index].at, hi = t.next ?? lo + 40;
      const frac = t.next === null ? 1 : Math.min(1, (p - lo) / (hi - lo));
      const D = FACTIONS[f];
      return `<div class="standing" title="${D.tagline}. ${D.text.replace(/"/g, '&quot;')}">
        <div class="sd-top"><span>${D.name}</span><b>${t.name}</b></div>
        <div class="sd-bar"><i style="width:${(frac * 100).toFixed(1)}%;background:${D.color}"></i></div>
        <div class="sd-sub">${p} punten${t.next !== null ? ` · ${TIERS[t.index + 1].name} bij ${t.next}` : ' · het hoogste aanzien'}</div>
      </div>`;
    }).join('');
    return `<h3>AANZIEN</h3>${rows}`;
  }
}
