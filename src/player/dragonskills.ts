// What the dragon can do besides breathing fire. Het Oude Volk teaches these
// (src/life/oudevolk.ts), one per standing tier; combat.ts carries them out,
// the way it carries out the origin skills of character.ts. Fire breath is
// the left mouse button in flight; these sit on the keys flight left free
// (right mouse and R), and the call works on foot (G).

export type DragonSkillId = 'nevel' | 'slag' | 'roep';

export interface DragonSkillDef {
  id: DragonSkillId;
  /** the name on the action bar */
  short: string;
  name: string;
  text: string;
  /** seconds */
  cooldown: number;
  /** fire it takes from the dragon's meter (flight skills) */
  cost: number;
  /** the key, as the action bar shows it */
  key: 'RMB' | 'R' | 'G';
  /** in the air, or on foot */
  flying: boolean;
  /** standing tier with Het Oude Volk at which Heylwich teaches it */
  tier: number;
}

export const DRAGON_SKILLS: Record<DragonSkillId, DragonSkillDef> = {
  nevel: {
    id: 'nevel', short: 'Nevel', name: 'Neveladem', key: 'RMB', flying: true, tier: 1, cooldown: 12, cost: 25,
    text: 'In de vlucht ademt je draak moerasnevel in plaats van vuur. Wie erin staat, ziet even niets en vecht niet; een beest kun je dan sneller laten gaan.',
  },
  slag: {
    id: 'slag', short: 'Slag', name: 'Vleugelslag', key: 'R', flying: true, tier: 2, cooldown: 9, cost: 30,
    text: 'Laag boven de grond slaat je draak zijn vleugels neer. Alles wat eronder staat, valt om en krijgt klappen.',
  },
  roep: {
    id: 'roep', short: 'Roep', name: 'Drakenroep', key: 'G', flying: false, tier: 3, cooldown: 40, cost: 0,
    text: 'Te voet roep je je draak te hulp. Hij komt, en zet alles rond je in brand.',
  },
};
