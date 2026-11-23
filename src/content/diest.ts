// Diest and its surroundings, 1650: the people, the quests, the enemies and the
// conversations. In English (docs/design/voice.md); the drossaard and the provost
// speak to the hero more formally than the rest.
// Historical background: the Spanish Netherlands after the Peace of Munster
// (1648); Diest is a barony of the (absent) princes of Orange; the church of
// Scherpenheuvel (consecrated 1627) draws pilgrims from all over Brabant.
//
// Positions are local metres from the Grote Markt (x east, z south).

import type { Content } from '../rpg/types';
import { OV_DIALOGUE, OV_ITEMS, OV_NPCS, OV_QUESTS } from './oudevolk';

const ARRIVE = 'main_arrive';
const BELLS = 'main_bells';
const KLUDDE = 'main_kludde';
const LEUVEN = 'main_leuven';

export const diest: Content = {
  items: [
    { id: 'pilgrim_badge', name: 'Pilgrim badge of Scherpenheuvel', text: 'A tin badge of Our Lady of Scherpenheuvel, tangled in river weed.', quest: true },
    { id: 'humming_statuette', name: 'Humming oak figure', text: 'It is carved from the wood of the felled oak. It hums when there are bells nearby, and also when there are none.', quest: true },
    { id: 'forged_seal', name: 'Forged cloth seal', text: 'A lead seal with the arms of Diest. The lion has too many teeth.', quest: true },
    { id: 'seal_mould', name: 'Seal mould', text: "A widow cast the town's good name in this, in lead." },
    { id: 'marsh_herb', name: 'Marsh woundwort', text: 'It grows where the Demer floods each winter. The beguines brew it into a draught against fever.', quest: true },
    { id: 'salve', name: 'Beguine salve', text: 'It heals wounds, and it smells of the Begijnhof garden.' },
    { id: 'sealed_letter', name: 'Sealed letter', text: "A letter for the provost of Scherpenheuvel, closed with the drossaard's seal.", quest: true },
    { id: 'brandy', name: 'Keg of brandy', text: 'No one paid the toll on this keg, which was the whole idea.' },
    { id: 'klepel', name: 'Clapper of Sint-Sulpitius', text: 'An iron clapper, wet and caked in river mud. It is heavier than it looks, and colder.', quest: true },
    { id: 'pass', name: 'Safe conduct to Leuven', text: 'A travel letter from the drossaard, seal and all.', quest: true },
    // Het Oude Volk, the hidden party (src/content/oudevolk.ts)
    ...OV_ITEMS,
  ],

  camps: [
    { id: 'schaffen', name: 'Deserters', at: [720, -880], r: 30, enemies: [['deserteur', 1, 3]], respawn: 180 },
    { id: 'kaggevinne', name: 'Highwaymen', at: [-2120, 560], r: 30, enemies: [['deserteur', 2, 3], ['musketier', 2, 1]], respawn: 240 },
    { id: 'broek', name: 'Broek hounds', at: [1110, 520], r: 45, enemies: [['broekhond', 2, 3]], respawn: 200 },
    { id: 'broek2', name: 'Broek hounds', at: [1330, 840], r: 45, enemies: [['broekhond', 3, 4]], respawn: 240 },
    {
      id: 'kluddenest', name: "The Kludde's nest", at: [1680, 1060], r: 30, enemies: [['broekhond', 4, 3]], respawn: 0,
      elite: { type: 'kludde', level: 5, name: 'The Kludde' }, if: { any: [{ quest: KLUDDE, state: 'active', stage: 'lair' }, { quest: KLUDDE, state: 'active', stage: 'clappers' }] },
    },
    {
      id: 'galgeberg', name: "Lambrecht's camp", at: [-1700, 2060], r: 35, enemies: [['deserteur', 4, 3], ['musketier', 4, 1]], respawn: 300,
      elite: { type: 'deserteur', level: 5, name: 'Lambrecht de Rode' }, if: { not: { quest: 'side_roelof', state: 'done' } },
    },
    { id: 'eikenbos', name: "Will-o'-the-wisps", at: [-4460, 960], r: 50, enemies: [['dwaallicht', 3, 4]], respawn: 240 },
  ],

  npcs: [
    {
      id: 'pieter', name: 'Pieter Vandenbempt', role: 'sexton of Sint-Sulpitius', at: [30, 55], facing: Math.PI, tint: '#3a3330',
      look: { body: 'man_old', wear: { hair_thin: 'h_grey', skullcap: 'black', habit: 'umber', rope_belt: null, shoes: null }, prop: 'lantern' },
      // the road to Leuven, for a save that lost it after the Kludde (see the talk entry below)
      offers: [BELLS, { quest: LEUVEN, if: { quest: KLUDDE, state: 'done' } }],
      talk: [
        { if: { any: [{ quest: ARRIVE, state: 'active' }, { quest: BELLS, state: 'none' }] }, start: 'pieter_intro' },
        { if: { quest: BELLS, state: 'active', stage: 'report' }, start: 'pieter_report' },
        { if: { quest: KLUDDE, state: 'active', stage: 'return' }, start: 'pieter_bells' },
        { if: { quest: KLUDDE, state: 'active' }, start: 'pieter_kludde' },
        // Het Oude Volk: a warning about the small bell, or what he found on its clapper
        { if: { quest: 'ov_dof', state: 'active', stage: 'nee' }, start: 'pieter_ov' },
        { if: { all: [{ flag: 'ov_choice', is: 'volk' }, { not: { flag: 'ov_pieter_dof' } }] }, start: 'pieter_dof' },
        // a save from before main_leuven started on the klepel line (Escape on the last lines lost it): give it again
        { if: { all: [{ quest: KLUDDE, state: 'done' }, { quest: LEUVEN, state: 'none' }] }, start: 'pieter_b3' },
        { if: { quest: KLUDDE, state: 'done' }, start: 'pieter_after' },
        { start: 'pieter_busy' },
      ],
    },
    {
      id: 'marieke', name: 'Marieke Smets', role: 'pedlar', at: [55, 95], facing: 0.3, tint: '#6a3a5a',
      look: { body: 'woman', wear: { hair_bun: 'h_chestnut', coif: null, bodice: 'madder', kerchief: null, skirt: 'woad_dk', apron: 'linen', shoes: null }, prop: 'basket' }, shop: true,
      talk: [{ start: 'marieke_hi' }],
    },
    {
      id: 'joos', name: 'Master Joos Peeters', role: 'dean of the weavers', at: [75, 45], facing: 0.4, tint: '#5a3a22',
      look: { body: 'man_stout', wear: { hair_crop: 'h_brown', beard_pointed: 'h_brown', cap_flat: 'madder_dk', doublet: 'woad', collar_band: null, breeches: 'brown', stockings: 'grey', shoes: null } },
      offers: ['side_seals'],
      talk: [
        { if: { quest: 'side_seals', state: 'none' }, start: 'joos_intro' },
        { if: { quest: 'side_seals', state: 'active', stage: 'report' }, start: 'joos_report' },
        { if: { quest: 'side_seals', state: 'done' }, start: 'joos_after' },
        { start: 'joos_busy' },
      ],
    },
    {
      id: 'aleydis', name: 'Sister Margriet', role: 'beguine of the infirmary', at: [680, -316], facing: -1.4, tint: '#2a2a2e',
      look: { body: 'woman', wear: { hair_bun: 'h_brown', habit: 'beguine', beguine_veil: null, shoes: null }, prop: 'rosary' },
      offers: ['side_herbs'],
      talk: [
        { if: { quest: BELLS, state: 'active', stage: 'badge' }, start: 'aleydis_badge' },
        { if: { quest: 'side_seals', state: 'active', stage: 'shelter' }, start: 'aleydis_lijsbet' },
        // once you have met Heylwich, what the begijnhof thinks of her (once)
        { if: { all: [{ flag: 'ov_found' }, { not: { flag: 'ov_aleydis' } }] }, start: 'aleydis_ov' },
        { if: { quest: 'side_herbs', state: 'none' }, start: 'aleydis_intro' },
        { if: { quest: 'side_herbs', state: 'active', stage: 'return' }, start: 'aleydis_herbs_back' },
        { start: 'aleydis_idle' },
      ],
    },
    {
      id: 'drossaard', name: 'Jonker Hendrik van Gorp', role: 'drossaard of Diest', at: [400, 140], facing: 2.2, tint: '#1e2a3a',
      look: { body: 'man', wear: { hair_long: 'h_dark', beard_pointed: 'h_dark', hat_wide: 'black', plume: 'madder', doublet: 'black', collar_band: null, breeches: 'black', stockings: 'black', boots: null } },
      offers: ['contract_letter'],
      talk: [
        { if: { quest: LEUVEN, state: 'active', stage: 'pass' }, start: 'dross_pass' },
        { if: { quest: 'side_seals', state: 'active', stage: 'decide' }, start: 'dross_seals' },
        { if: { quest: 'contract_letter', state: 'none' }, start: 'dross_letter' },
        { start: 'dross_idle' },
      ],
    },
    {
      id: 'wouter', name: 'Wouter Claes', role: 'toll keeper at the Putterstraatpoort', at: [-95, 340], facing: 2.6, tint: '#4a4a2a',
      look: { body: 'man_stout', wear: { hair_crop: 'h_black', moustache: 'h_black', hat_wide: 'umber', doublet: 'moss', collar_band: null, breeches: 'umber', stockings: 'grey', shoes: null } },
      offers: ['side_toll'],
      talk: [
        { if: { quest: 'side_toll', state: 'none' }, start: 'wouter_intro' },
        { if: { quest: 'side_toll', state: 'active', stage: 'report' }, start: 'wouter_report' },
        { if: { flag: 'toll_bribe' }, start: 'wouter_wink' },
        { start: 'wouter_idle' },
      ],
    },
    {
      id: 'lijsbet', name: 'Lijsbet Vranckx', role: "weaver's widow", at: [805, 100], facing: -1.6, tint: '#3d3428',
      look: { body: 'woman_old', wear: { hair_bun: 'h_grey', coif: null, bodice: 'black', kerchief: null, skirt: 'slate', shoes: null } },
      talk: [
        { if: { quest: 'side_seals', state: 'active', stage: 'widow' }, start: 'lijsbet_meet' },
        { start: 'lijsbet_idle' },
      ],
    },
    {
      id: 'gielis', name: 'Gielis "de Ton"', role: 'carter, or so he says', at: [-430, 100], facing: 1.2, tint: '#5a2a1a',
      look: { body: 'man_stout', wear: { hair_crop: 'h_red', beard_full: 'h_red', cap_flat: 'russet', smock: 'linen', belt: null, breeches: 'russet', stockings: 'grey', clogs: null } },
      talk: [
        { if: { quest: 'side_toll', state: 'active', stage: 'cart' }, start: 'gielis_meet' },
        { start: 'gielis_idle' },
      ],
    },
    {
      id: 'driesen', name: 'Farmer Jan Driesen', role: 'farmer at Kaggevinne', at: [-2235, 690], facing: 0.6, tint: '#5a4a2a',
      look: { body: 'man', wear: { hair_crop: 'h_blond', moustache: 'h_blond', cap_flat: 'brown', smock: 'grey', belt: null, breeches: 'brown', stockings: 'linen', clogs: null }, prop: 'stick' },
      offers: ['side_roelof'],
      talk: [
        { if: { quest: 'side_roelof', state: 'none' }, start: 'driesen_intro' },
        { if: { quest: 'side_roelof', state: 'active', stage: 'return' }, start: 'driesen_back' },
        { if: { quest: 'side_roelof', state: 'active' }, start: 'driesen_busy' },
        { start: 'driesen_after' },
      ],
    },
    {
      id: 'truyken', name: 'Truyken', role: 'seller of oak figures', at: [-5005, 545], facing: -2.0, tint: '#5a3f2a',
      look: { body: 'woman_stout', wear: { hair_bun: 'h_blond', coif: null, bodice: 'ochre', kerchief: null, pelerine: 'russet', skirt: 'umber', clogs: null }, prop: 'basket' },
      talk: [
        { if: { quest: BELLS, state: 'active', stage: 'scherpenheuvel' }, start: 'truyken_main' },
        { start: 'truyken_idle' },
      ],
    },
    {
      id: 'provost', name: 'Father Jan Cools', role: 'provost of Scherpenheuvel', at: [-5085, 470], facing: 0.8, tint: '#e8e0d0',
      look: { body: 'man_old', wear: { hair_thin: 'h_white', skullcap: 'black', habit: 'black', bands: null, shoes: null } },
      offers: ['side_wisps'],
      talk: [
        { if: { quest: 'contract_letter', state: 'active', stage: 'deliver' }, start: 'provost_letter' },
        { if: { all: [{ quest: 'ov_eik', state: 'active' }, { not: { flag: 'ov_provost' } }] }, start: 'provost_ov' },
        { if: { quest: 'side_wisps', state: 'none' }, start: 'provost_wisps' },
        { if: { quest: 'side_wisps', state: 'active', stage: 'return' }, start: 'provost_wisps_back' },
        { start: 'provost_idle' },
      ],
    },
    // Het Oude Volk: Heylwich the midwife, Gooris the reed cutter, Aert the shepherd and his grandson
    ...OV_NPCS,
  ],

  quests: [
    // ================================================================ hoofdverhaal
    {
      id: ARRIVE, title: 'Diest without bells', kind: 'main', town: 'Diest', level: 1,
      summary: 'Land in Diest and find out why the bells are silent.',
      reward: { xp: 60 },
      stages: [
        {
          id: 'land',
          journal: '{dragon} followed the Demer to Diest, low over the water, as though he had flown it before. From above I saw the walls, the market and the church with its blunt tower. Not one bell was ringing. Somewhere under those roofs, someone knows where the water left Neelke.',
          objectives: [{ id: 'land', kind: 'reach', text: 'Land on the Grote Markt of Diest', at: [40, 45], r: 70, onFoot: true }],
          onDone: [{ stage: [ARRIVE, 'pieter'] }],
        },
        {
          id: 'pieter',
          journal: 'In the market everyone looks at the tower the way you look at a sickbed. They send me to Pieter, the sexton. He stands by the church with a ring of keys he no longer needs.',
          objectives: [{ id: 'pieter', kind: 'talk', text: 'Speak with Pieter the sexton at the church', npc: 'pieter' }],
        },
      ],
    },
    {
      id: BELLS, title: 'The bells that do not ring', kind: 'main', town: 'Diest', giver: 'pieter', level: 2,
      summary: 'The bells of Sint-Sulpitius are silent. Their clappers are gone.',
      reward: { xp: 220, florins: 30, standing: [['gilden', 10]] },
      stages: [
        {
          id: 'tower',
          journal: 'The bell struck seven times, Pieter says, and then nothing. The three clappers are gone, out of a tower that was locked. There was wet weed on the bell frame. With {dragon} I can reach the top.',
          objectives: [{ id: 'climb', kind: 'reach', text: 'Fly to the top of the tower of Sint-Sulpitius', at: [-26, 30], r: 30, minY: 28 }],
          onDone: [{ give: 'pilgrim_badge' }, { xp: 60 }, { stage: [BELLS, 'badge'] }],
        },
        {
          id: 'badge',
          journal: 'In the weed on the bell frame was a tin badge of Our Lady of Scherpenheuvel, its little face still sharp. Sister Margriet in the Begijnhof knows every pilgrim badge in Brabant.',
          objectives: [{ id: 'show', kind: 'talk', text: 'Show the badge to Sister Margriet in the Begijnhof', npc: 'aleydis' }],
        },
        {
          id: 'road',
          journal: 'Margriet sends me to Scherpenheuvel. The pilgrims no longer dare the road: deserters from the French war lie in wait near Kaggevinne. They take what you carry, and sometimes they take you as well.',
          objectives: [{ id: 'rovers', kind: 'kill', text: 'Drive off the highwaymen near Kaggevinne', camp: 'kaggevinne', count: 4, at: [-2120, 560], r: 45 }],
          onDone: [{ xp: 80 }, { standing: ['gilden', 5] }, { stage: [BELLS, 'scherpenheuvel'] }],
        },
        {
          id: 'scherpenheuvel',
          journal: "The road is clear, if you don't count the crows on the dead. To the west lies Scherpenheuvel, where the altar stands on the spot where the old oak stood. Truyken sells figures there, and she hears everything.",
          objectives: [{ id: 'truyken', kind: 'talk', text: 'Find Truyken at the church of Scherpenheuvel', npc: 'truyken' }],
        },
        {
          id: 'report',
          journal: 'Truyken sold oak figures to a tall man "who smelled of the Demer and paid in wet coins". She gave me one. It hums, and it hums louder when I hold it towards the Broek, the marsh south-east of Diest. There is water enough there.',
          objectives: [{ id: 'pieter', kind: 'talk', text: 'Report to Pieter in Diest', npc: 'pieter' }],
        },
      ],
    },
    {
      id: KLUDDE, title: 'The beast of the Broek', kind: 'main', town: 'Diest', giver: 'pieter', level: 4,
      summary: 'Something in the marshes has stolen the clappers of Diest.',
      reward: { xp: 600, florins: 60, standing: [['gilden', 25]], gear: ['kluddevel'] },
      stages: [
        {
          id: 'hounds',
          journal: 'A man who smells of the Demer, walks through locked doors and pays in wet money: Pieter now says it aloud. It is the Kludde. By the river he did not look like a man. His hounds roam the Broek, past the old Koepoort. If I follow them, they will lead me to him.',
          objectives: [{ id: 'honden', kind: 'kill', text: 'Follow the trail: kill the hounds in the Broek', enemy: 'broekhond', count: 5, at: [1220, 680], r: 220 }],
          onDone: [{ xp: 100 }, { stage: [KLUDDE, 'lair'] }],
        },
        {
          id: 'lair',
          journal: 'The tracks run to the marsh by Webbekom. Among the reeds, something drags a chain along the ground. The figure hums so hard my hand tingles. If Neelke is anywhere, she is here.',
          objectives: [{ id: 'kludde', kind: 'kill', text: 'Defeat the Kludde in his nest by Webbekom', camp: 'kluddenest', enemy: 'kludde', count: 1, at: [1680, 1060], r: 40 }],
          onDone: [{ stage: [KLUDDE, 'clappers'] }],
        },
        {
          id: 'clappers',
          journal: 'The Kludde vanished into the water in steam and a rattle of chain. With him you never know if he is dead. The clappers lie in his nest, half sunk in mud. The post beside it is notched, in groups of five.',
          objectives: [{ id: 'klepels', kind: 'collect', text: 'Pick up the clappers in the nest', item: 'klepel', count: 3, spawns: [[1672, 1048], [1694, 1070], [1662, 1078]] }],
          onDone: [{ stage: [KLUDDE, 'return'] }],
        },
        {
          id: 'return',
          journal: 'I have the three clappers, heavy as a child, cold as the river. Weed still clings to one of them. Pieter will weep.',
          objectives: [{ id: 'pieter', kind: 'talk', text: 'Bring the clappers to Pieter the sexton', npc: 'pieter' }],
        },
      ],
    },
    {
      id: LEUVEN, title: 'The road to Leuven', kind: 'main', town: 'Diest', giver: 'pieter', level: 6,
      summary: 'The figure hums towards Leuven. Ask the drossaard for a safe conduct.',
      reward: { xp: 50 },
      stages: [
        {
          id: 'pass',
          journal: "The bells of Diest ring again. At every stroke {dragon}'s eyes fell shut, and Pieter saw it too. Now the figure hums loudest when I hold it to the west, towards Leuven. For that journey I need a safe conduct from the drossaard.",
          objectives: [{ id: 'dross', kind: 'talk', text: 'Ask the drossaard for a safe conduct', npc: 'drossaard' }],
        },
        {
          id: 'travel',
          journal: 'The safe conduct smells of sealing wax and of the drossaard. The road to Leuven lies open. In the east, in the land of Loon, the towers have been silent for a year. Whichever road I take, the figure hums with me.',
          objectives: [{ id: 'leuven', kind: 'flag', text: 'Travel to Leuven (coming soon)', flag: 'reached_leuven' }],
        },
      ],
    },

    // ================================================================ zijverhalen
    {
      id: 'side_seals', title: 'Too many teeth', kind: 'side', town: 'Diest', giver: 'joos', level: 1,
      summary: 'Someone is forging the cloth seals of Diest.',
      reward: { xp: 120 },
      stages: [
        {
          id: 'find',
          journal: 'Master Joos says Antwerpen is sending back bales of rags under the seal of Diest. One forged seal costs the whole town its name, and that name is older than Joos. The forger works by the bleaching fields past the old Koepoort.',
          objectives: [{ id: 'seals', kind: 'collect', text: 'Look for forged seals by the bleaching fields past the old Koepoort', item: 'forged_seal', count: 3, spawns: [[870, 40], [905, 125], [858, 185]] }],
          onDone: [{ stage: ['side_seals', 'widow'] }],
        },
        {
          id: 'widow',
          journal: 'The seals lay along a path to a cottage beyond the moat, like breadcrumbs. Whoever dropped them may have wanted to be found.',
          objectives: [{ id: 'meet', kind: 'talk', text: 'Speak with whoever lives in the cottage', npc: 'lijsbet' }],
        },
        {
          id: 'decide',
          journal: "Lijsbet, a weaver's widow, casts the seal to sell her own cloth. The guild will not let a widow work her husband's loom. I told her I would go to the drossaard. She said she would be at home.",
          objectives: [{ id: 'dross', kind: 'talk', text: 'Report the forger to the drossaard', npc: 'drossaard' }],
        },
        {
          id: 'shelter',
          journal: 'I sent Lijsbet to the Begijnhof. The beguines take in widows, and they weave under their own seal.',
          objectives: [{ id: 'aleydis', kind: 'talk', text: 'Ask Sister Margriet to take Lijsbet in', npc: 'aleydis' }],
        },
        {
          id: 'report',
          journal: 'It is settled, one way or another. Master Joos is waiting in the Cloth Hall. He will not ask how.',
          objectives: [{ id: 'joos', kind: 'talk', text: 'Return to Master Joos in the Cloth Hall', npc: 'joos' }],
        },
      ],
    },
    {
      id: 'side_herbs', title: 'Woundwort from the Broek', kind: 'side', town: 'Diest', giver: 'aleydis', level: 2,
      summary: 'The beguines need herbs from the Demer meadows.',
      reward: { xp: 150, florins: 8, standing: [['kerk', 10]], items: [['salve', 3]] },
      stages: [
        {
          id: 'gather',
          journal: 'Sister Margriet needs woundwort for the fever in the infirmary. It grows in the wet meadows along the Demer, south-east of town. "Pick it by daylight," she says, but she does not say why. From that way I hear dogs howling.',
          objectives: [{ id: 'herbs', kind: 'collect', text: 'Pick marsh woundwort in the Demer meadows', item: 'marsh_herb', count: 4, spawns: [[960, 160], [1060, 330], [1160, 490], [1260, 640]] }],
          onDone: [{ stage: ['side_herbs', 'return'] }],
        },
        {
          id: 'return',
          journal: 'I have four handfuls of woundwort, wet to the wrists. I want to be back in the Begijnhof before dark.',
          objectives: [{ id: 'back', kind: 'talk', text: 'Bring the woundwort to Sister Margriet', npc: 'aleydis' }],
        },
      ],
    },
    {
      id: 'side_toll', title: 'The brandy road', kind: 'side', town: 'Diest', giver: 'wouter', level: 1,
      summary: 'Smugglers are bringing brandy past the Putterstraatpoort.',
      reward: { xp: 100 },
      stages: [
        {
          id: 'cart',
          journal: 'Wouter the toll keeper says a carter, Gielis de Ton, drives brandy round the walls to dodge the toll, by the road outside the Allerheiligenpoort. From above, a cart with barrels like that is hard to miss.',
          objectives: [{ id: 'gielis', kind: 'talk', text: "Find the smuggler's cart outside the Allerheiligenpoort", npc: 'gielis' }],
        },
        {
          id: 'report',
          journal: 'I found Gielis. Wouter wants to know how it ended, and above all what it brings in.',
          objectives: [{ id: 'wouter', kind: 'talk', text: 'Tell Wouter at the Putterstraatpoort', npc: 'wouter' }],
        },
      ],
    },
    {
      id: 'side_roelof', title: 'Lambrecht de Rode', kind: 'side', town: 'Kaggevinne', giver: 'driesen', level: 5,
      summary: 'A deserter captain is plundering the farms around Kaggevinne.',
      reward: { xp: 450, florins: 40, standing: [['gilden', 10]], gear: ['roelofs_slagzwaard'] },
      stages: [
        {
          id: 'hunt',
          journal: "Farmer Driesen of Kaggevinne has lost his pigs, his oats and nearly his daughter to Lambrecht de Rode, a captain who left the king's army when it stopped paying him. His camp is on the Galgenberg, the gallows hill. He belongs there, says Driesen.",
          objectives: [{ id: 'roelof', kind: 'kill', text: 'Defeat Lambrecht de Rode on the Galgenberg', camp: 'galgeberg', count: 1, enemy: 'elite', at: [-1700, 2060], r: 50 }],
          onDone: [{ stage: ['side_roelof', 'return'] }],
        },
        {
          id: 'return',
          journal: "Lambrecht de Rode lies dead on the Galgenberg, where he always belonged. He was wearing someone else's boots. Driesen will be glad to hear it.",
          objectives: [{ id: 'driesen', kind: 'talk', text: 'Tell Farmer Driesen in Kaggevinne', npc: 'driesen' }],
        },
      ],
    },
    {
      id: 'side_wisps', title: 'Lights in the wood', kind: 'side', town: 'Scherpenheuvel', giver: 'provost', level: 3,
      summary: "Will-o'-the-wisps are luring pilgrims into the wood.",
      reward: { xp: 320, florins: 20, standing: [['kerk', 15]], gear: ['pelgrimsmantel'] },
      stages: [
        {
          id: 'wisps',
          journal: 'The provost says pilgrims are getting lost in the oak wood east of Scherpenheuvel. They follow lights they take for procession candles. Two have not come back. Neelke followed lights too.',
          objectives: [{ id: 'licht', kind: 'kill', text: "Put out the will-o'-the-wisps in the oak wood", enemy: 'dwaallicht', count: 4, at: [-4460, 960], r: 90 }],
          onDone: [{ stage: ['side_wisps', 'return'] }],
        },
        {
          id: 'return',
          journal: 'The wood is dark again, as a wood should be. Of the two pilgrims, I found only one clog.',
          objectives: [{ id: 'proost', kind: 'talk', text: 'Return to the provost', npc: 'provost' }],
        },
      ],
    },

    // ================================================================ opdrachten
    {
      id: 'contract_letter', title: 'A letter for the provost', kind: 'contract', town: 'Diest', giver: 'drossaard', level: 2,
      summary: "Take the drossaard's letter to Scherpenheuvel.",
      reward: { xp: 120, florins: 15, standing: [['gilden', 5], ['kerk', 5]] },
      stages: [
        {
          id: 'deliver',
          journal: 'The drossaard wants a sealed letter delivered to the provost of Scherpenheuvel, west along the road to Aarschot. He says a courier takes a day over it, and a dragon does not.',
          objectives: [{ id: 'provost', kind: 'talk', text: 'Deliver the letter to the provost in Scherpenheuvel', npc: 'provost' }],
        },
      ],
    },

    // ================================================================ Het Oude Volk (hidden until found)
    ...OV_QUESTS,
  ],

  dialogue: {
    // ================================================================ Pieter
    pieter_intro: { who: 'pieter', text: "You there, with that... beast. You're the one they whisper about in the market. Good. Nobody else dares climb my tower now.", next: 'pieter_2', effects: [{ complete: ARRIVE }] },
    pieter_2: { who: 'pieter', text: 'That night the bells struck seven times, and then never again: not for Mass, not for the hours, not for the dead. I went up to look. The clappers are gone, all three. The door was locked, and the key hangs on my belt.', next: 'pieter_3' },
    pieter_3: {
      who: 'pieter', text: 'There was river weed on the bell frame. Still wet, forty ells above the ground.',
      choices: [
        { text: "I'll go up and look.", next: 'pieter_accept', effects: [{ start: BELLS }] },
        { text: 'River weed? From the Demer?', next: 'pieter_weed' },
        { text: 'That night the water took my little sister.', next: 'pieter_sister' },
        { text: 'A town without bells. Is that so bad?', next: 'pieter_why' },
      ],
    },
    pieter_weed: { who: 'pieter', text: "My grandmother would have said it was the Kludde. He becomes whatever he likes, she said: a dog, a horse, a cat. I'm a sexton, so I say thieves. Thieves who smell of the river.", next: 'pieter_3' },
    pieter_sister: { who: 'pieter', text: 'Then you are not the only one. The ferryman is looking for his boy, and behind the Cloth Hall a cradle stands empty. What the water took that night, it has not given back.', next: 'pieter_3' },
    pieter_why: { who: 'pieter', text: "A town without bells doesn't know when to rise, or pray, or shut its gates. And the old people say the bells keep something asleep as well. I don't know what, and I don't want to.", next: 'pieter_3' },
    pieter_accept: { who: 'pieter', text: 'The tower is the flat one on the west side. They never finished it; people say the money ran out. Mind the pigeons. They belong to the Church.' },
    pieter_busy: { who: 'pieter', text: 'Go up, please, before the dean of the chapter asks me about it again.' },
    pieter_report: { who: 'pieter', text: "You've been to Scherpenheuvel. I can see it on your shoes. Well, what did you find?", next: 'pieter_r2' },
    pieter_r2: { who: 'you', text: 'A man who smells of the Demer buys oak figures there. This one hums, and it hums louder towards the Broek.', next: 'pieter_r3' },
    pieter_r3: { who: 'pieter', text: "The Broek, then. Someone with wet coins and wet feet, who walks through locked doors. I'm a sexton, I don't believe in fairy tales. But I believe what I saw on that bell frame: claw marks. Big claws.", next: 'pieter_r4' },
    pieter_r4: {
      who: 'pieter', text: "Then it is the Kludde after all. My grandmother was right, and she has been dead forty years. His hounds roam the Broek, past the old Koepoort. Follow them and you'll find his nest, and the clappers.",
      choices: [
        { text: "Then I'll go hunting.", effects: [{ complete: BELLS }, { start: KLUDDE }] },
        { text: 'And my sister?', next: 'pieter_r5' },
      ],
    },
    pieter_r5: { who: 'pieter', text: "If she is anywhere, she is there. I won't lie to you: the Kludde gives nothing back. But he has never stolen clappers before, either.", next: 'pieter_r4' },
    pieter_kludde: { who: 'pieter', text: "The Broek lies south-east of town, past the old Koepoort. Take salve, and take your dragon. And don't look at the lights." },
    pieter_bells: { who: 'pieter', text: "Are those... Holy Sulpitius. It's them, all three.", next: 'pieter_b2', effects: [{ take: 'klepel', n: 3 }] },
    pieter_b2: { who: 'pieter', text: 'Help me hang them. No, leave it, your dragon is quicker. Listen. LISTEN.', next: 'pieter_b3', effects: [{ set: 'bells_ring' }, { complete: KLUDDE }, { start: LEUVEN }] },
    pieter_b3: { who: 'pieter', text: 'Diest knows what hour it is again. Look at your dragon: at every stroke his eyes fall shut. And that figure still hums, but westward now, towards Leuven.', next: 'pieter_b4', effects: [{ start: LEUVEN }] },
    pieter_b4: {
      who: 'pieter', text: 'If anyone can read the writing on old bronze and older wood, it is the masters of the university. Go to the drossaard: without a safe conduct, no town gate will let you in with a dragon.',
      choices: [
        { text: "Then I'll go to the drossaard." },
        { text: 'What do the bells do to my dragon?', next: 'pieter_b5' },
        { text: 'Does the figure only hum towards the west?', next: 'pieter_b_loon' },
        { text: 'The midwife says the bells keep him asleep.', if: { flag: 'ov_found' }, next: 'pieter_b_ov' },
      ],
    },
    pieter_b5: { who: 'pieter', text: "I'm a sexton, not a prophet. I only know that he slept as long as the bells rang, for hundreds of years. Perhaps he didn't mind.", next: 'pieter_b4' },
    pieter_b_loon: { who: 'pieter', text: 'The figure does. But carts come through the Beverenpoort now from the land of Loon, past Halen. The towers there have been silent a year, the carters say, and they say nothing more.', next: 'pieter_b4' },
    pieter_after: { who: 'pieter', text: 'Do you hear that? They strike every hour again. Never in my life have I been so glad to hear bells. Your dragon is less glad, I see.' },

    // ================================================================ Marieke
    marieke_hi: {
      who: 'marieke', text: 'Well now, the dragon rider at my stall. Salve, swords, armour, amulets: all honestly come by, or nearly all. What will it be?',
      choices: [
        { text: 'Show me your wares.', effects: [{ open: 'shop' }] },
        { text: 'What do you hear in the market?', next: 'marieke_gossip' },
        { text: "I'm looking for a girl, small and fair. She counts everything she sees.", next: 'marieke_girl' },
        { text: 'I need nothing, thank you.' },
      ],
    },
    marieke_gossip: { who: 'marieke', text: "They say the deserters at Kaggevinne strip the pilgrims, and Lambrecht de Rode on the Galgenberg is eating the farmers' winter stores. The Broek is haunted, every night in a different skin. Good times for anyone who sells salve.", next: 'marieke_hi' },
    marieke_girl: { who: 'marieke', text: "I pass through every village between here and Leuven. If a child counts my wares, I'll let you know. This time I won't charge for it.", next: 'marieke_hi' },

    // ================================================================ Joos
    joos_intro: { who: 'joos', text: 'Do you know what this is? A lead seal with the arms of Diest: our promise that the cloth is good. My grandfather swore by it. But this seal is false.', next: 'joos_2' },
    joos_2: {
      who: 'joos', text: 'The merchants in Antwerpen send back bales of rags that bear our seal. One more season of this and the last buyers of Diest cloth stay away too. The forger works by the bleaching fields, past the old Koepoort. Find him for me.',
      choices: [
        { text: "I'll find your forger.", effects: [{ start: 'side_seals' }], next: 'joos_3' },
        { text: 'And what happens to him when I find him?', next: 'joos_punish' },
      ],
    },
    joos_punish: { who: 'joos', text: "That is for the drossaard to decide. If he's lucky, banishment. The guild forgets nothing; we have a chest for that, and a clerk.", next: 'joos_2' },
    joos_3: { who: 'joos', text: 'Look for the seals. Forgers leave their failures lying about.' },
    joos_busy: { who: 'joos', text: 'Every day that forger works, Diest cloth is worth a stuiver less. And I count those stuivers.' },
    joos_report: { who: 'joos', text: 'Well? Is it settled?', next: 'joos_r_branch' },
    joos_r_branch: {
      who: 'you', text: "It's settled.",
      choices: [
        { text: "The drossaard has her. It's a weaver's widow.", if: { flag: 'seals_reported' }, next: 'joos_r_reported' },
        { text: 'She is with the beguines now. She weaves honestly there, under their seal.', if: { flag: 'seals_begijnhof' }, next: 'joos_r_begijnhof' },
        { text: 'The trail went cold. The forger is gone.', if: { flag: 'seals_warned' }, next: 'joos_r_warned' },
      ],
    },
    joos_r_reported: { who: 'joos', text: "A widow? Not Vranckx's? God help her. But the seal is the honour of the town. Here is your pay: the guild pays its debts, even when it hurts.", effects: [{ complete: 'side_seals', outcome: 'reported' }, { florins: 30 }, { standing: ['gilden', 10] }, { gear: 'zegelring' }] },
    joos_r_begijnhof: { who: 'joos', text: "You let her go to the beguines? They sell cloth under their own seal and pay the guild not a duit. Hm. At least she isn't forging ours any more. Here's your money, and don't tell the others I paid.", effects: [{ complete: 'side_seals', outcome: 'begijnhof' }, { florins: 15 }, { standing: ['gilden', 3] }, { standing: ['kerk', 10] }] },
    joos_r_warned: { who: 'joos', text: "Gone, then. So now he forges some other town's seal somewhere else. That's something, I suppose. Half the work, half the pay.", effects: [{ complete: 'side_seals', outcome: 'warned' }, { florins: 12 }] },
    joos_after: { who: 'joos', text: 'Antwerpen sends no more bales back, for now. In Antwerpen everything is for now.' },

    // ================================================================ Lijsbet
    lijsbet_meet: { who: 'lijsbet', text: "You found the seals. That doesn't surprise me. My hands shake when I cast them.", next: 'lijsbet_2' },
    lijsbet_2: { who: 'lijsbet', text: "Jan was a master weaver. When he died, the guild let me finish one bale, and then they took his loom. My cloth is good, better than half of what goes out under the real seal. But a widow's cloth gets no seal.", next: 'lijsbet_3' },
    lijsbet_3: {
      who: 'lijsbet', text: 'Say it, then. What will you do with me?',
      choices: [
        { text: "The law is the law. I'm going to the drossaard.", next: 'lijsbet_law', effects: [{ take: 'forged_seal', n: 3 }, { stage: ['side_seals', 'decide'] }] },
        { text: "The beguines take in widows. Go to the Begijnhof; I'll put in a good word for you.", next: 'lijsbet_beg', effects: [{ set: 'seals_begijnhof' }, { stage: ['side_seals', 'shelter'] }] },
        { text: 'Leave Diest tonight. I never found you.', next: 'lijsbet_flee', effects: [{ set: 'seals_warned' }, { give: 'seal_mould' }, { stage: ['side_seals', 'report'] }] },
      ],
    },
    lijsbet_law: { who: 'lijsbet', text: "Then I'll be at home when they come. I have nowhere else to go." },
    lijsbet_beg: { who: 'lijsbet', text: "The beguines? Would they have me? ...I'll go before the gate shuts." },
    lijsbet_flee: { who: 'lijsbet', text: "Take the mould. Where I'm going I won't need it, and this way I won't be tempted. God bless you." },
    lijsbet_idle: { who: 'lijsbet', text: 'The bleaching fields are good this year. The cloth comes off them white as bone.' },

    // ================================================================ Margriet
    aleydis_intro: { who: 'aleydis', text: "Shut the door, you're letting the draught in. And keep that dragon of yours outside, the sheep are afraid of it. What do you want?", next: 'aleydis_2' },
    aleydis_2: {
      who: 'aleydis', text: "Since you're here: there's fever in the infirmary and my woundwort is gone. It grows in the wet meadows along the Demer, south-east of town. You'll be there before I've found my clogs.",
      choices: [
        { text: "I'll pick it for you.", effects: [{ start: 'side_herbs' }], next: 'aleydis_3' },
        { text: 'Why only by daylight?', next: 'aleydis_why' },
        { text: 'Did anyone come out of the water that night?', next: 'aleydis_water' },
      ],
    },
    aleydis_why: { who: 'aleydis', text: "The farmers say the meadows belong to something else after dark: one night it's a dog, the next a horse, and it is always hungry. I only say this: pick by daylight, and come back.", next: 'aleydis_2' },
    aleydis_water: { who: 'aleydis', text: "One came back: a boy from near the Schaffensepoort, three days later, soaking wet and yet warm. He doesn't speak. He lays pebbles in a row.", next: 'aleydis_2' },
    aleydis_3: { who: 'aleydis', text: 'Bring me four good handfuls, and not the leaves the cows have been at.' },
    aleydis_herbs_back: { who: 'aleydis', text: "Good, the cows didn't get there first. Take this salve, it's for burns. With that beast of yours, you'll need it.", effects: [{ take: 'marsh_herb', n: 4 }, { complete: 'side_herbs' }] },
    aleydis_badge: { who: 'aleydis', text: 'Let me see. Our Lady of Scherpenheuvel, and cast this year: the moulds wear down, and every year the little face grows fainter. Where did you find this?', next: 'aleydis_b2' },
    aleydis_b2: { who: 'you', text: 'It was in wet weed, on the bell frame of Sint-Sulpitius.', next: 'aleydis_b3' },
    aleydis_b3: { who: 'aleydis', text: 'Hm. The pilgrims who pass through say the new church at Scherpenheuvel hums at night. The altar stands where the old oak stood, and they say the roots were never dug out.', next: 'aleydis_b4' },
    aleydis_b4: { who: 'aleydis', text: 'Go to Scherpenheuvel. Find Truyken, who sells figures by the pilgrimage church. But take care: deserters lie in wait along the road near Kaggevinne. They rob the pilgrims, and sometimes they do worse.', effects: [{ done: [BELLS, 'show'] }, { stage: [BELLS, 'road'] }] },
    aleydis_lijsbet: { who: 'aleydis', text: "There's a weaver's widow at the gate with nothing but her hands. You sent her, of course.", next: 'aleydis_l2' },
    aleydis_l2: { who: 'aleydis', text: 'The Begijnhof has looms, and no guild to forbid her weaving. She may stay. She will work, and pray, and never forge anything again, or I will hear of it.', effects: [{ done: ['side_seals', 'aleydis'] }, { stage: ['side_seals', 'report'] }] },
    aleydis_idle: { who: 'aleydis', text: 'When the great bells are silent, we ring our own. Small bells count too.' },

    // ================================================================ drossaard
    dross_letter: {
      who: 'drossaard', text: 'You are the dragon rider. How fortunate. I have a sealed letter for the provost of Scherpenheuvel, and every courier I have is lame, drunk or Calvinist.',
      choices: [
        { text: "I'll take the letter.", effects: [{ start: 'contract_letter' }, { give: 'sealed_letter' }], next: 'dross_letter_ok' },
        { text: 'What does it say?', next: 'dross_letter_what' },
      ],
    },
    dross_letter_what: { who: 'drossaard', text: 'It is a sealed letter, rider. That is what "sealed" means.', next: 'dross_letter' },
    dross_letter_ok: { who: 'drossaard', text: 'Fly west along the road to Aarschot; you will see the dome. And do not read the letter. I will know.' },
    dross_seals: { who: 'drossaard', text: 'A forger of the town seal? Go on.', next: 'dross_s2' },
    dross_s2: { who: 'you', text: "It's Lijsbet Vranckx, a weaver's widow. She lives in the cottage past the old Koepoort. These are her seals.", next: 'dross_s3' },
    dross_s3: { who: 'drossaard', text: 'Vranckx. I knew her husband. The law is clear, and I serve the law. She will be banished from the barony, and may count herself lucky not to stand in the pillory. The weavers will be grateful.', effects: [{ set: 'seals_reported' }, { done: ['side_seals', 'dross'] }, { stage: ['side_seals', 'report'] }] },
    dross_pass: { who: 'drossaard', text: 'The bells ring again, and I have you to thank for it. A safe conduct to Leuven, with a dragon? The guards at the Mechelse Poort will wet themselves.', next: 'dross_pass2' },
    dross_pass2: { who: 'drossaard', text: 'Here it is, with my seal on it. And when you are in Leuven, ask for Professor Fromondus. He knows everything about heaven and earth, and he likes to talk about it. Far too much.', effects: [{ give: 'pass' }, { stage: [LEUVEN, 'travel'] }, { complete: LEUVEN, outcome: 'pass' }, { toast: 'Leuven and the land of Loon come in the next chapter' }] },
    dross_idle: { who: 'drossaard', text: 'The barony has an absent lord, an empty treasury, and a great many people who see their chance in both.' },

    // ================================================================ Wouter
    wouter_intro: { who: 'wouter', text: 'There is toll on wine, salt, brandy, cloth and anything that runs on wheels. Nothing to declare? Of course not. Nobody ever has anything to declare.', next: 'wouter_2' },
    wouter_2: {
      who: 'wouter', text: "But you have a dragon, and I have Gielis de Ton. He smuggles brandy round the walls, by the road outside the Allerheiligenpoort, and the toll never sees a stuiver of it. From up there you'll spot his cart at once.",
      choices: [
        { text: "I'll find him.", effects: [{ start: 'side_toll' }], next: 'wouter_3' },
        { text: "What's in it for me?", next: 'wouter_pay' },
      ],
    },
    wouter_pay: { who: 'wouter', text: 'The thanks of the town, and a share of the fine if the drossaard is in a good mood. He never is.', next: 'wouter_2' },
    wouter_3: { who: 'wouter', text: "A big fellow on a small cart with enormous barrels. You can't miss him." },
    wouter_report: { who: 'wouter', text: 'Well? Did you catch Gielis?', next: 'wouter_r_branch' },
    wouter_r_branch: {
      who: 'you', text: 'I found him.',
      choices: [
        { text: 'He paid the toll. Here is the money.', if: { flag: 'toll_paid' }, next: 'wouter_r_paid' },
        { text: 'He got away.', if: { flag: 'toll_bribe' }, next: 'wouter_r_lie' },
        { text: 'I seized his brandy. It belongs to the town now.', if: { flag: 'toll_seized' }, next: 'wouter_r_seized' },
      ],
    },
    wouter_r_paid: { who: 'wouter', text: "Gielis paid? Gielis? You've made an honest man of him. The town thanks you, and so do I.", effects: [{ complete: 'side_toll', outcome: 'paid' }, { florins: 10 }, { standing: ['gilden', 8] }] },
    wouter_r_lie: { who: 'wouter', text: "He got away from a dragon? Hm. ...You smell of his brandy, friend. Never mind. What the drossaard doesn't know won't hurt him.", effects: [{ complete: 'side_toll', outcome: 'bribed' }, { standing: ['gilden', -3] }] },
    wouter_r_seized: { who: 'wouter', text: 'Two whole barrels! For once the drossaard will be in a good mood. Here is your share.', effects: [{ take: 'brandy' }, { complete: 'side_toll', outcome: 'seized' }, { florins: 18 }, { standing: ['gilden', 5] }] },
    wouter_wink: { who: 'wouter', text: '*taps his nose* Smells like a pleasant evening round here, eh?' },
    wouter_idle: { who: 'wouter', text: 'There is toll on wine, salt, brandy, cloth and anything on wheels. Dragons are still under discussion.' },

    // ================================================================ Gielis
    gielis_meet: { who: 'gielis', text: "Hola. I'm just a poor carter resting his horse. Those barrels? Vinegar, for pickling. There's a great deal to pickle.", next: 'gielis_2' },
    gielis_2: {
      who: 'gielis', text: "A dragon, of course. Come on, friend, the toll on brandy is theft. Take a keg for yourself and forget my face. It's a face that's easy to forget.",
      choices: [
        { text: 'Pay the toll, Gielis, or the dragon eats the cart.', next: 'gielis_pay', effects: [{ set: 'toll_paid' }, { stage: ['side_toll', 'report'] }] },
        { text: "I'll take that keg. And I never saw you.", next: 'gielis_bribe', effects: [{ set: 'toll_bribe' }, { give: 'brandy' }, { stage: ['side_toll', 'report'] }] },
        { text: 'The brandy goes to the town. Unhitch your horse and walk on.', next: 'gielis_seize', effects: [{ set: 'toll_seized' }, { give: 'brandy' }, { stage: ['side_toll', 'report'] }] },
      ],
    },
    gielis_pay: { who: 'gielis', text: "It's theft, I tell you. Theft with wings. Fine, I'll pay. I'M PAYING!" },
    gielis_bribe: { who: 'gielis', text: "You're a sensible soul. May your dragon never get the hiccups." },
    gielis_seize: { who: 'gielis', text: "My brandy! My... vinegar! You'll hear from my cousin. He's a lawyer in Leuven. Well, he sweeps the floor for a lawyer." },
    gielis_idle: { who: 'gielis', text: "It's vinegar. Just vinegar." },

    // ================================================================ Driesen
    driesen_intro: { who: 'driesen', text: "A rider! With a... Lord help us. Are you the king's? The prince's? Nobody's? Nobody's is best. Then maybe you can help us.", next: 'driesen_2' },
    driesen_2: {
      who: 'driesen', text: "It's Lambrecht de Rode. He was a captain in the army, until the army stopped paying him. Now he pays himself, with my pigs, my oats and my peace. His camp is on the Galgenberg, south of here.",
      choices: [
        { text: "I'll go to the Galgenberg.", effects: [{ start: 'side_roelof' }], next: 'driesen_3' },
        { text: 'How many men does he have?', next: 'driesen_men' },
      ],
    },
    driesen_men: { who: 'driesen', text: 'Enough to strip a village: four or so, and one with a musket who shoots straight even drunk. Lambrecht himself is as big as a door.', next: 'driesen_2' },
    driesen_3: { who: 'driesen', text: "God be with you. And if you see my pigs, they're called Pier, Pol and Mieke." },
    driesen_busy: { who: 'driesen', text: 'The Galgenberg is south of here. You can see the gallows from a long way off.' },
    driesen_back: { who: 'driesen', text: "He's dead? Lambrecht de Rode is dead? Wife! WIFE! Come here!", next: 'driesen_b2' },
    driesen_b2: { who: 'driesen', text: "I'm only a farmer, I haven't much. But what I have, I share. And everyone in Kaggevinne will know your name, {name}.", effects: [{ complete: 'side_roelof' }] },
    driesen_after: { who: 'driesen', text: "Pier is back. Pol and Mieke aren't, but Pier is back." },

    // ================================================================ Scherpenheuvel
    truyken_main: { who: 'truyken', text: 'Badges, rosaries, phials of holy water, figures from the wood of the true oak! The oak was felled just after 1600, God rest its soul, and every splinter of it has worked a miracle since. Some splinters more than one.', next: 'truyken_2' },
    truyken_2: { who: 'you', text: 'Has anyone strange been buying figures?', next: 'truyken_3' },
    truyken_3: { who: 'truyken', text: "Strange? Everyone here is strange, it's a place of pilgrimage. But yes, a tall man in a long coat comes every week since Easter. He buys only the oak figures, and he pays in wet coins. He smells of the Demer at low water.", next: 'truyken_4' },
    truyken_4: { who: 'truyken', text: "Here, take one. It's a real one, you can tell by the humming. I don't like that humming.", effects: [{ give: 'humming_statuette' }, { done: [BELLS, 'truyken'] }, { stage: [BELLS, 'report'] }] },
    truyken_idle: { who: 'truyken', text: 'Figures of the true oak! All of them blessed, or most of them.' },
    provost_letter: { who: 'provost', text: 'A letter from the drossaard of Diest, brought by dragon? The Archdukes, God rest them, would have loved that.', next: 'provost_l2' },
    provost_l2: { who: 'provost', text: 'Hm. He asks whether the pilgrims have heard the bells of the pilgrimage church ringing at night. They have, and nobody rings them. Tell him that.', effects: [{ take: 'sealed_letter' }, { complete: 'contract_letter' }] },
    provost_wisps: {
      who: 'provost', text: 'You have a strong arm and a strange mount. Listen a moment. In the oak wood east of here, pilgrims go astray. They follow lights they take for procession candles. Two have not come back.',
      choices: [
        { text: "I'll put out those lights.", effects: [{ start: 'side_wisps' }], next: 'provost_w2' },
        { text: 'Lights? That sounds harmless.', next: 'provost_w3' },
      ],
    },
    provost_w2: { who: 'provost', text: 'They float beyond the reach of a sword, the woodcutters say. Not beyond the reach of a dragon, I think.' },
    provost_w3: { who: 'provost', text: 'The two who did not come back thought so too.', next: 'provost_wisps' },
    provost_wisps_back: { who: 'provost', text: 'Is the wood dark again? Thank God. Take this cloak; it was blessed at the altar, on the spot where the oak stood. It will guard you better than your own.', effects: [{ complete: 'side_wisps' }] },
    provost_idle: { who: 'provost', text: 'The church has seven sides, the town seven corners, and the dome is full of golden stars. The Archdukes built well.' },

    // ================================================================ Het Oude Volk
    ...OV_DIALOGUE,
  },
};
