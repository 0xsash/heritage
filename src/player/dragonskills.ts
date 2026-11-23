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
    id: 'nevel', short: 'Mist', name: 'Mist Breath', key: 'RMB', flying: true, tier: 1, cooldown: 12, cost: 25,
    text: 'In flight your dragon breathes marsh mist instead of fire. Whoever stands in it goes blind for a while and stops fighting; a beast is easier to let go.',
  },
  slag: {
    id: 'slag', short: 'Wing', name: 'Wingbeat', key: 'R', flying: true, tier: 2, cooldown: 9, cost: 30,
    text: 'Low over the ground your dragon brings his wings down. Everything beneath them is knocked flat and takes the blow.',
  },
  roep: {
    id: 'roep', short: 'Call', name: 'Dragon Call', key: 'G', flying: false, tier: 3, cooldown: 40, cost: 0,
    text: 'On foot, you call your dragon to your side. He comes, and sets everything around you burning.',
  },
};
