// Picking what people say: a line that fits, that has not been said lately.
// Everything said is remembered for ten minutes of play; a pool only repeats
// itself once every line in it has been heard.

export interface CondLine {
  /** the line; {name}, {dragon}, {place}... are filled in by the caller */
  t: string;
  /** only when this holds */
  when?: () => boolean;
  /** weight (default 1); reactive lines get more so they are heard */
  w?: number;
}

export type Pool = (string | CondLine)[];

const TEN_MINUTES = 600;

export class LinePicker {
  private said = new Map<string, number>();
  /** seconds of play (advanced by the caller) */
  time = 0;

  /** A line from the pool that holds now, preferring ones not heard in the last ten minutes. */
  pick(pool: Pool, r = Math.random()): string {
    const ok: CondLine[] = [];
    for (const l of pool) {
      const c = typeof l === 'string' ? { t: l } : l;
      if (!c.when || c.when()) ok.push(c);
    }
    if (!ok.length) return '';
    const fresh = ok.filter((c) => (this.said.get(c.t) ?? -1e9) < this.time - TEN_MINUTES);
    const from = fresh.length ? fresh : ok.sort((a, b) => (this.said.get(a.t) ?? 0) - (this.said.get(b.t) ?? 0)).slice(0, Math.max(1, ok.length >> 2));
    let total = 0;
    for (const c of from) total += c.w ?? 1;
    let x = r * total;
    let out = from[0];
    for (const c of from) if ((x -= c.w ?? 1) <= 0) { out = c; break; }
    this.said.set(out.t, this.time);
    return out.t;
  }

  /** Has this exact line been said in the last ten minutes? */
  recent(t: string) {
    return (this.said.get(t) ?? -1e9) >= this.time - TEN_MINUTES;
  }
}

/** Fill {key} placeholders. */
export function fill(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

/** Small deterministic random numbers (a day's jobs, a walker's name). */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    s ^= s >>> 13;
    return (s >>> 0) / 4294967296;
  };
}

export function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Today's key (local date), so jobs and once-a-day things change at midnight. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** Direction in words, from a to b (x east, z south). */
export function direction(dx: number, dz: number) {
  const a = Math.atan2(dx, -dz); // 0 = north, clockwise
  const names = ['naar het noorden', 'naar het noordoosten', 'naar het oosten', 'naar het zuidoosten', 'naar het zuiden', 'naar het zuidwesten', 'naar het westen', 'naar het noordwesten'];
  return names[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
}

/** Distance in 1650 terms: no metres. */
export function farness(d: number) {
  if (d < 35) return 'hier vlakbij';
  if (d < 120) return 'een eindje verder';
  if (d < 400) return 'een paar straten verder';
  if (d < 1200) return 'aan de andere kant van de stad';
  return 'een flink eind buiten de stad';
}
