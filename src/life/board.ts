// Het aanplakbord: three or four jobs a day, made from templates and seeded by
// the date, so everyone has the same board today and a new one tomorrow. A job
// is an ordinary contract in the quest engine (it shows in the journal and the
// tracker), always ends with a person who pays, and pays florins, experience
// and standing with that person's party. Its definition is rebuilt from its id,
// so the save only keeps the id and the quest's progress.

import type { CampDef, QuestDef } from '../rpg/types';
import type { QuestEngine } from '../rpg/quests';
import { FETCH_SPOTS, JOBS, SERVICES } from '../content/diest_life';
import type { JobTemplate } from './types';
import { fill as fillRaw, hash, seeded, today } from './lines';

/** Fill a template and start every sentence with a capital ("{what}" may begin it). */
const fill = (t: string, v: Record<string, string>) => fillRaw(t, v).replace(/(^|[.!?] )([a-zà-ÿ])/g, (_m, a: string, b: string) => a + b.toUpperCase());

export interface Job {
  id: string;
  template: JobTemplate;
  def: QuestDef;
  /** the notice as it hangs on the board */
  notice: string;
  client: string;
  /** delivery: who sends, and the goods item */
  from?: string;
  item?: string;
  /** read: how many */
  n?: number;
}

/** Where each camp is, in words (camps without a place here are not posted). */
const CAMP_WHERE: Record<string, string> = {
  schaffen: 'de weg naar Schaffen', kaggevinne: 'Kaggevinne', broek: 'het Broek, buiten de Koepoort', broek2: 'het moeras bij Webbekom', eikenbos: 'het eikenbos bij Scherpenheuvel',
};
const CAMP_NAME: Record<string, string> = { schaffen: 'de deserteurs', kaggevinne: 'de wegrovers', broek: 'de broekhonden', broek2: 'de broekhonden', eikenbos: 'de dwaallichten' };

const svc = (id: string) => SERVICES.find((s) => s.id === id);
const who = (id: string) => {
  const s = svc(id);
  return s ? `${s.name} (${s.role.split(",")[0]})` : id;
};
const short = (id: string) => svc(id)?.name ?? id;

export class Board {
  private cache = new Map<string, Job>();

  constructor(private q: QuestEngine, private camps: CampDef[]) {
    // jobs taken on earlier days are still in the save: give the engine their definitions back
    for (const id of Object.keys(q.s.quests)) if (id.startsWith('job_')) this.job(id);
  }

  /** Today's jobs (three, or four from level 3). */
  todays(): Job[] {
    const day = today();
    const n = this.q.s.hero.level >= 3 ? 4 : 3;
    const out: Job[] = [];
    for (let i = 0; i < n; i++) {
      const j = this.job(`job_${day}_${i}`);
      if (j) out.push(j);
    }
    return out;
  }

  taken(id: string) {
    return !!this.q.s.quests[id];
  }

  /** Untaken jobs today: the board wears a "!" while there are any. */
  open() {
    return this.todays().filter((j) => !this.taken(j.id)).length;
  }

  take(j: Job) {
    if (this.taken(j.id)) return;
    this.q.start(j.id);
    this.q.s.life.boardTaken.push(j.id);
  }

  /** Every job, rebuilt from its id ("job_<yyyymmdd>_<slot>"). */
  job(id: string): Job | null {
    const hit = this.cache.get(id);
    if (hit) return hit;
    const m = /^job_(\d{8})_(\d+)$/.exec(id);
    if (!m) return null;
    const day = m[1], slot = Number(m[2]);
    const r = seeded(hash(day) + slot * 7919);
    // a level for the job: the hero's level the first time it was made (kept in the save once taken)
    const flagKey = `${id}_lv`;
    const level = Number(this.q.s.flags[flagKey]) || this.q.s.hero.level;
    const kinds: JobTemplate['kind'][] = [Number(day) % 2 ? 'bounty' : 'delivery', Number(day) % 2 ? 'delivery' : 'bounty', Number(day) % 3 ? 'read' : 'fetch', Number(day) % 3 ? 'fetch' : 'read'];
    const kind = kinds[slot % kinds.length];
    const pool = JOBS.filter((t) => t.kind === kind);
    const t = pool[Math.floor(r() * pool.length)];
    const client = t.clients[Math.floor(r() * t.clients.length)];
    const vars: Record<string, string> = { client: who(client) };
    let job: Job | null = null;
    const base = { id, kind: 'contract' as const, town: 'Diest', giver: client, level };
    const pay = (fl: number, xp: number) => ({ florins: Math.round(fl), xp: Math.round(xp) });

    if (t.kind === 'bounty') {
      const ok = this.camps.filter((c) => CAMP_WHERE[c.id] && c.respawn > 0 && !c.if);
      const fits = ok.filter((c) => Math.max(...c.enemies.map((e) => e[1])) <= level + 1);
      const list = fits.length ? fits : ok;
      const camp = list[Math.floor(r() * list.length)];
      if (!camp) return null;
      const lv = Math.max(...camp.enemies.map((e) => e[1]));
      const count = Math.min(4, camp.enemies.reduce((s, e) => s + e[2], 0));
      Object.assign(vars, { camp: CAMP_NAME[camp.id], campName: CAMP_NAME[camp.id], where: CAMP_WHERE[camp.id], n: String(count) });
      vars.campName = vars.campName[0].toUpperCase() + vars.campName.slice(1);
      const def: QuestDef = {
        ...base, title: fill(t.title, vars), summary: fill(t.notice, vars), level: Math.max(level, lv),
        reward: pay(10 + level * 4 + lv * 3, 60 + level * 25),
        stages: [
          { id: 'kill', journal: fill(t.journal[0], vars), objectives: [{ id: 'kill', kind: 'kill', text: `Verdrijf ${vars.camp} bij ${vars.where}`, camp: camp.id, count, at: camp.at, r: camp.r + 20 }], onDone: [{ stage: [id, 'pay'] }] },
          { id: 'pay', journal: fill(t.journal[1], vars), objectives: [{ id: 'pay', kind: 'talk', text: `Haal je premie bij ${short(client)}`, npc: client }] },
        ],
      };
      job = { id, template: t, def, notice: def.summary, client };
    } else if (t.kind === 'delivery') {
      const froms = (t.from ?? []).filter((f) => f !== client);
      const fi = Math.floor(r() * froms.length);
      const from = froms[fi];
      const what = (t.goods ?? [])[Math.min((t.goods ?? []).length - 1, (t.from ?? []).indexOf(from))] ?? 'een pakje';
      Object.assign(vars, { from: who(from), to: who(client), what });
      const item = `${id}_goods`;
      this.q.addItem({ id: item, name: what[0].toUpperCase() + what.slice(1), text: `Van ${short(from)}, voor ${short(client)}.`, quest: true });
      const def: QuestDef = {
        ...base, title: fill(t.title, { ...vars, to: short(client) }), summary: fill(t.notice, vars),
        reward: pay(8 + level * 2, 40 + level * 15),
        stages: [
          { id: 'pick', journal: fill(t.journal[0], vars), objectives: [{ id: 'pick', kind: 'talk', text: `Haal ${what} op bij ${short(from)}`, npc: from }] },
          { id: 'bring', journal: fill(t.journal[1], vars), objectives: [{ id: 'bring', kind: 'talk', text: `Breng ${what} naar ${short(client)}`, npc: client }] },
        ],
      };
      job = { id, template: t, def, notice: def.summary, client, from, item };
    } else if (t.kind === 'read') {
      const n = 3;
      vars.n = String(n);
      const def: QuestDef = {
        ...base, title: t.title, summary: fill(t.notice, vars),
        reward: pay(6 + level * 2, 50 + level * 15),
        stages: [
          { id: 'read', journal: fill(t.journal[0], vars), objectives: [{ id: 'read', kind: 'flag', text: `Lees ${n} plakkaten, borden of stenen in de stad`, flag: `${id}_read`, hint: [22, 44] }], onDone: [{ stage: [id, 'pay'] }] },
          { id: 'pay', journal: fill(t.journal[1], vars), objectives: [{ id: 'pay', kind: 'talk', text: `Vertel het aan ${short(client)}`, npc: client }] },
        ],
      };
      job = { id, template: t, def, notice: def.summary, client, n };
    } else {
      const spot = FETCH_SPOTS[Math.floor(r() * FETCH_SPOTS.length)];
      Object.assign(vars, { where: spot.where, what: spot.what });
      const item = `${id}_lost`;
      this.q.addItem({ id: item, name: spot.what[0].toUpperCase() + spot.what.slice(1), text: `Verloren ${spot.where}. Van ${short(client)}.`, quest: true });
      const def: QuestDef = {
        ...base, title: fill(t.title, { ...vars, what: spot.what }), summary: fill(t.notice, vars),
        reward: pay(10 + level * 3, 50 + level * 18),
        stages: [
          { id: 'find', journal: fill(t.journal[0], vars), objectives: [{ id: 'find', kind: 'collect', text: `Zoek ${spot.what} ${spot.where}`, item, count: spot.at.length, spawns: spot.at }], onDone: [{ stage: [id, 'pay'] }] },
          { id: 'pay', journal: fill(t.journal[1], vars), objectives: [{ id: 'pay', kind: 'talk', text: `Breng alles terug naar ${short(client)}`, npc: client }] },
        ],
      };
      job = { id, template: t, def, notice: def.summary, client, item };
    }
    if (!job) return null;
    this.q.addQuest(job.def);
    this.cache.set(id, job);
    return job;
  }

  /** Remember the level a job was made for, once it is taken (so its rewards do not change). */
  pinLevel(id: string) {
    const j = this.job(id);
    if (j) this.q.s.flags[`${id}_lv`] = j.def.level ?? this.q.s.hero.level;
  }

  /** The job (and its current stage) that wants this person now, if any. */
  wants(person: string): { job: Job; stage: string; objective: string } | null {
    for (const [id, st] of Object.entries(this.q.s.quests)) {
      if (!id.startsWith('job_') || st.status !== 'active') continue;
      const job = this.job(id);
      if (!job) continue;
      const stage = job.def.stages.find((s) => s.id === st.stage);
      const o = stage?.objectives.find((x) => x.kind === 'talk' && x.npc === person && !st.done.includes(x.id));
      if (o && stage) return { job, stage: stage.id, objective: o.id };
    }
    return null;
  }
}
