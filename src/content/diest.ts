// Diest, 1650: the first town's people, quests and conversations.
// Historical setting: the Spanish Netherlands after the Peace of Münster (1648);
// Diest is a barony of the absent Princes of Orange; Scherpenheuvel's basilica
// (consecrated 1627) draws pilgrims from all over Brabant.

import type { Content } from '../rpg/types';

const MAIN = 'main_bells';

export const diest: Content = {
  items: [
    { id: 'pilgrim_badge', name: 'Pilgrim badge of Scherpenheuvel', text: 'A tin badge of Our Lady of Scherpenheuvel, tangled in river weed.', quest: true },
    { id: 'humming_statuette', name: 'Humming oak statuette', text: 'Carved from the felled oak. It hums when bells are near, and when they are not.', quest: true },
    { id: 'forged_seal', name: 'Forged cloth seal', text: 'A lead seal stamped with Diest\'s arms. The lion has too many teeth.', quest: true },
    { id: 'seal_mould', name: 'Seal mould', text: 'A widow\'s mould for forging the town\'s cloth seals.' },
    { id: 'marsh_herb', name: 'Marsh woundwort', text: 'Grows in the wet meadows along the Demer. The beguines brew it for fevers.', quest: true },
    { id: 'salve', name: 'Beguine salve', text: 'Heals wounds. Smells of the Begijnhof garden.' },
    { id: 'sealed_letter', name: 'Sealed letter', text: 'Addressed to the provost of Scherpenheuvel, under the drossaard\'s seal.', quest: true },
    { id: 'brandy', name: 'Cask of brandy', text: 'Untaxed. Very untaxed.' },
  ],

  npcs: [
    {
      id: 'pieter', name: 'Pieter Vandenbempt', role: 'sexton of Sint-Sulpitius', at: [30, 55], facing: Math.PI, tint: '#3a3330',
      offers: [MAIN],
      talk: [
        { if: { quest: MAIN, state: 'none' }, start: 'pieter_intro' },
        { if: { quest: MAIN, state: 'active', stage: 'report' }, start: 'pieter_report' },
        { if: { quest: MAIN, state: 'done' }, start: 'pieter_after' },
        { start: 'pieter_busy' },
      ],
    },
    {
      id: 'joos', name: 'Master Joos Peeters', role: 'dean of the weavers', at: [75, 45], facing: 0.4, tint: '#5a3a22',
      offers: ['side_seals'],
      talk: [
        { if: { quest: 'side_seals', state: 'none' }, start: 'joos_intro' },
        { if: { quest: 'side_seals', state: 'active', stage: 'report' }, start: 'joos_report' },
        { if: { quest: 'side_seals', state: 'done' }, start: 'joos_after' },
        { start: 'joos_busy' },
      ],
    },
    {
      id: 'aleydis', name: 'Sister Aleydis', role: 'beguine and healer', at: [680, -316], facing: -1.4, tint: '#2a2a2e',
      offers: ['side_herbs'],
      talk: [
        { if: { quest: MAIN, state: 'active', stage: 'badge' }, start: 'aleydis_badge' },
        { if: { quest: 'side_seals', state: 'active', stage: 'shelter' }, start: 'aleydis_lijsbet' },
        { if: { quest: 'side_herbs', state: 'none' }, start: 'aleydis_intro' },
        { if: { quest: 'side_herbs', state: 'active', stage: 'return' }, start: 'aleydis_herbs_back' },
        { start: 'aleydis_idle' },
      ],
    },
    {
      id: 'drossaard', name: 'Jonker Hendrik van Gorp', role: 'drossaard of Diest', at: [400, 140], facing: 2.2, tint: '#1e2a3a',
      offers: ['contract_letter'],
      talk: [
        { if: { quest: 'side_seals', state: 'active', stage: 'decide' }, start: 'dross_seals' },
        { if: { quest: 'side_toll', state: 'active', stage: 'report' }, start: 'dross_toll' },
        { if: { quest: 'contract_letter', state: 'none' }, start: 'dross_letter' },
        { start: 'dross_idle' },
      ],
    },
    {
      id: 'wouter', name: 'Wouter Claes', role: 'toll keeper at the Leuven Gate', at: [-95, 340], facing: 2.6, tint: '#4a4a2a',
      offers: ['side_toll'],
      talk: [
        { if: { quest: 'side_toll', state: 'none' }, start: 'wouter_intro' },
        { if: { quest: 'side_toll', state: 'active', stage: 'report' }, start: 'wouter_report' },
        { if: { flag: 'toll_bribe' }, start: 'wouter_wink' },
        { start: 'wouter_idle' },
      ],
    },
    {
      id: 'lijsbet', name: 'Lijsbet Vranckx', role: 'weaver\'s widow', at: [805, 100], facing: -1.6, tint: '#3d3428',
      talk: [
        { if: { quest: 'side_seals', state: 'active', stage: 'widow' }, start: 'lijsbet_meet' },
        { start: 'lijsbet_idle' },
      ],
    },
    {
      id: 'gielis', name: 'Gielis "the Barrel"', role: 'carter, allegedly', at: [-430, 100], facing: 1.2, tint: '#5a2a1a',
      talk: [
        { if: { quest: 'side_toll', state: 'active', stage: 'cart' }, start: 'gielis_meet' },
        { start: 'gielis_idle' },
      ],
    },
    {
      id: 'truyken', name: 'Truyken', role: 'seller of pilgrim tokens', at: [-5005, 545], facing: -2.0, tint: '#5a3f2a',
      talk: [
        { if: { quest: MAIN, state: 'active', stage: 'scherpenheuvel' }, start: 'truyken_main' },
        { start: 'truyken_idle' },
      ],
    },
    {
      id: 'provost', name: 'Provost Jan Cools', role: 'provost of Scherpenheuvel', at: [-5085, 470], facing: 0.8, tint: '#e8e0d0',
      talk: [
        { if: { quest: 'contract_letter', state: 'active', stage: 'deliver' }, start: 'provost_letter' },
        { start: 'provost_idle' },
      ],
    },
  ],

  quests: [
    // ------------------------------------------------------------------ main
    {
      id: MAIN, title: 'The Bells That Will Not Ring', kind: 'main', town: 'Diest', giver: 'pieter',
      summary: 'The bells of Sint-Sulpitius have fallen silent. Their clappers are gone.',
      reward: { florins: 30, renown: [['Diest', 15]] },
      stages: [
        {
          id: 'tower',
          journal: 'Pieter the sexton says the bells of Sint-Sulpitius fell silent on Sunday. Their clappers vanished from a locked tower. He found wet river weed on the bell frame. A dragon could reach the top of that tower.',
          objectives: [{ id: 'climb', kind: 'reach', text: 'Reach the top of Sint-Sulpitius\' tower', at: [-26, 30], r: 30, minY: 28 }],
          onDone: [{ give: 'pilgrim_badge' }, { stage: [MAIN, 'badge'] }],
        },
        {
          id: 'badge',
          journal: 'In the weed on the bell frame: a tin pilgrim badge of Our Lady of Scherpenheuvel. Sister Aleydis at the Begijnhof knows every pilgrim token in Brabant.',
          objectives: [{ id: 'show', kind: 'talk', text: 'Show the badge to Sister Aleydis at the Begijnhof', npc: 'aleydis' }],
        },
        {
          id: 'scherpenheuvel',
          journal: 'Sister Aleydis says pilgrims at Scherpenheuvel whisper that the basilica hums at night, where the old oak\'s roots lie under the altar. She sends me to Truyken, who sells tokens there and hears everything.',
          objectives: [{ id: 'truyken', kind: 'talk', text: 'Find Truyken at the basilica of Scherpenheuvel', npc: 'truyken' }],
        },
        {
          id: 'report',
          journal: 'Truyken sold oak statuettes to a man "who smelled of the Demer and paid in wet coins". She gave me one. It hums. It hums louder when I face west.',
          objectives: [{ id: 'pieter', kind: 'talk', text: 'Bring what you learned to Pieter in Diest', npc: 'pieter' }],
        },
      ],
    },

    // ------------------------------------------------------------------ side: forged seals
    {
      id: 'side_seals', title: 'Too Many Teeth', kind: 'side', town: 'Diest', giver: 'joos',
      summary: 'Someone is forging Diest\'s cloth seals.',
      stages: [
        {
          id: 'find',
          journal: 'Master Joos says bales sold in Antwerp carry forged Diest seals. Bad cloth under a good seal ruins the whole town\'s name. The forger works near the bleaching fields outside the Cow Gate.',
          objectives: [{ id: 'seals', kind: 'collect', text: 'Find forged seals near the bleaching fields outside the Cow Gate', item: 'forged_seal', count: 3, spawns: [[870, 40], [905, 125], [858, 185]] }],
          onDone: [{ stage: ['side_seals', 'widow'] }],
        },
        {
          id: 'widow',
          journal: 'The seals were dropped along a path to a cottage beyond the moat.',
          objectives: [{ id: 'meet', kind: 'talk', text: 'Confront whoever lives in the cottage', npc: 'lijsbet' }],
        },
        {
          id: 'decide',
          journal: 'Lijsbet, a weaver\'s widow, forges seals to sell her own cloth. Her husband\'s guild will not let a widow work his loom. I have told her I will take this to the drossaard.',
          objectives: [{ id: 'dross', kind: 'talk', text: 'Report the forger to the drossaard', npc: 'drossaard' }],
        },
        {
          id: 'shelter',
          journal: 'I have sent Lijsbet to the Begijnhof. The beguines take in widows, and they weave.',
          objectives: [{ id: 'aleydis', kind: 'talk', text: 'Ask Sister Aleydis to take Lijsbet in', npc: 'aleydis' }],
        },
        {
          id: 'report',
          journal: 'It is done, one way or another. Master Joos is waiting at the Cloth Hall.',
          objectives: [{ id: 'joos', kind: 'talk', text: 'Return to Master Joos at the Cloth Hall', npc: 'joos' }],
        },
      ],
    },

    // ------------------------------------------------------------------ side: herbs
    {
      id: 'side_herbs', title: 'Woundwort from the Broek', kind: 'side', town: 'Diest', giver: 'aleydis',
      summary: 'The beguines need herbs from the Demer meadows.',
      reward: { florins: 8, renown: [['Begijnhof', 10]], items: [['salve', 2]] },
      stages: [
        {
          id: 'gather',
          journal: 'Sister Aleydis needs woundwort for the fever in the infirmary. It grows in the wet meadows along the Demer, south-east of town. "Gather it by daylight," she says, and does not say why.',
          objectives: [{ id: 'herbs', kind: 'collect', text: 'Gather marsh woundwort in the Demer meadows', item: 'marsh_herb', count: 4, spawns: [[960, 160], [1060, 330], [1160, 490], [1260, 640]] }],
          onDone: [{ stage: ['side_herbs', 'return'] }],
        },
        {
          id: 'return',
          journal: 'I have enough woundwort. Back to the Begijnhof.',
          objectives: [{ id: 'back', kind: 'talk', text: 'Bring the woundwort to Sister Aleydis', npc: 'aleydis' }],
        },
      ],
    },

    // ------------------------------------------------------------------ side: toll
    {
      id: 'side_toll', title: 'The Brandy Road', kind: 'side', town: 'Diest', giver: 'wouter',
      summary: 'Smugglers are bringing brandy around the Leuven Gate.',
      stages: [
        {
          id: 'cart',
          journal: 'Wouter the toll keeper says a carter called Gielis brings brandy around the walls to avoid the toll, by the road outside the All Saints Gate. From above, his cart should be easy to spot.',
          objectives: [{ id: 'gielis', kind: 'talk', text: 'Find the smuggler\'s cart outside the All Saints Gate', npc: 'gielis' }],
        },
        {
          id: 'report',
          journal: 'I have dealt with Gielis, one way or another. Wouter and the drossaard both want to hear about it.',
          objectives: [{ id: 'wouter', kind: 'talk', text: 'Tell Wouter at the Leuven Gate', npc: 'wouter' }],
        },
      ],
    },

    // ------------------------------------------------------------------ contract: letter
    {
      id: 'contract_letter', title: 'A Letter for the Provost', kind: 'contract', town: 'Diest', giver: 'drossaard',
      summary: 'Carry the drossaard\'s letter to Scherpenheuvel.',
      reward: { florins: 15, renown: [['Diest', 5], ['Scherpenheuvel', 5]] },
      stages: [
        {
          id: 'deliver',
          journal: 'The drossaard wants a sealed letter carried to the provost of Scherpenheuvel, west along the road to Aarschot. He says the road is slow and the dragon is not.',
          objectives: [{ id: 'provost', kind: 'talk', text: 'Deliver the letter to the provost at Scherpenheuvel', npc: 'provost' }],
        },
      ],
    },
  ],

  dialogue: {
    // ------------------------------------------------------------------ Pieter
    pieter_intro: { who: 'pieter', text: 'You. With the... animal. Are you the one people are talking about? Good. Nobody else will climb my tower.', next: 'pieter_2' },
    pieter_2: { who: 'pieter', text: 'Since Sunday the bells of Sint-Sulpitius have not rung. Not for Mass, not for the hours, not for the dead. I went up. The clappers are gone, all of them. The door was locked. The key never left my belt.', next: 'pieter_3' },
    pieter_3: {
      who: 'pieter', text: 'There was river weed on the bell frame. Wet. Forty ells above the ground.',
      choices: [
        { text: 'I\'ll go up and look.', next: 'pieter_accept', effects: [{ start: MAIN }] },
        { text: 'River weed? From the Demer?', next: 'pieter_weed' },
        { text: 'Bells are not my business.', next: 'pieter_refuse' },
      ],
    },
    pieter_weed: { who: 'pieter', text: 'My grandmother would have said the Kludde. I am a sexton, so I say thieves. Thieves who climb walls and smell of the river.', next: 'pieter_3' },
    pieter_accept: { who: 'pieter', text: 'The tower is the squat one on the west end. Mind the pigeons. They are Church property.' },
    pieter_refuse: { who: 'pieter', text: 'A town without bells does not know when to wake, when to pray or when to shut its gates. It will become your business.' },
    pieter_busy: { who: 'pieter', text: 'Up the tower. Please. Before the dean of the chapter asks me again.' },
    pieter_report: { who: 'pieter', text: 'You went to Scherpenheuvel? And?', next: 'pieter_r2' },
    pieter_r2: { who: 'you', text: 'A man who smells of the Demer has been buying oak statuettes. This one hums. It hums louder towards the west.', next: 'pieter_r3' },
    pieter_r3: { who: 'pieter', text: 'West is Aarschot, and beyond that Leuven. If anyone can read what is written on old bells and older wood, it is the masters of the university.', next: 'pieter_r4' },
    pieter_r4: {
      who: 'pieter', text: 'Here. From the chapter, for your trouble. And if the other towns have gone quiet too, then this is bigger than Diest.',
      choices: [{ text: 'Then I go to Leuven.', effects: [{ complete: MAIN }, { set: 'act2_leuven' }, { toast: 'The road leads on to Leuven' }] }],
    },
    pieter_after: { who: 'pieter', text: 'Still silent. Every hour I count the bells in my head, so the town does not forget the time.' },

    // ------------------------------------------------------------------ Joos
    joos_intro: { who: 'joos', text: 'Do you know what this is? A lead seal. The arms of Diest: our promise that the cloth is good. And this one is false.', next: 'joos_2' },
    joos_2: { who: 'joos', text: 'Antwerp merchants send back bales of rubbish under our seal. One more season of this and no one will buy Diest cloth at any price. The forger works near the bleaching fields, past the Cow Gate. Find them.',
      choices: [
        { text: 'I\'ll find your forger.', effects: [{ start: 'side_seals' }], next: 'joos_3' },
        { text: 'What happens to them when I do?', next: 'joos_punish' },
      ],
    },
    joos_punish: { who: 'joos', text: 'That is for the drossaard. Banishment, if they are lucky. The guild remembers forgers for a long time.', next: 'joos_2' },
    joos_3: { who: 'joos', text: 'Look for the seals. Forgers are careless with their failures.' },
    joos_busy: { who: 'joos', text: 'Every day the forger works, Diest cloth is worth a little less.' },
    joos_report: { who: 'joos', text: 'Well? Is it finished?', next: 'joos_r_branch' },
    joos_r_branch: {
      who: 'you', text: 'It is finished.',
      choices: [
        { text: 'The drossaard has her. A weaver\'s widow.', if: { flag: 'seals_reported' }, next: 'joos_r_reported' },
        { text: 'She is with the beguines now. She will weave honestly, under their seal.', if: { flag: 'seals_begijnhof' }, next: 'joos_r_begijnhof' },
        { text: 'The trail went cold. The forger is gone.', if: { flag: 'seals_warned' }, next: 'joos_r_warned' },
      ],
    },
    joos_r_reported: { who: 'joos', text: 'A widow. Vranckx\'s widow? God help her. But the seal is the town\'s honour. Here: the guild pays its debts, even the hard ones.', effects: [{ complete: 'side_seals', outcome: 'reported' }, { florins: 30 }, { renown: ['Diest', 10] }] },
    joos_r_begijnhof: { who: 'joos', text: 'You let her go to the beguines? They sell cloth under their own seal and pay no guild dues. Hm. At least it will not be ours she forges. Take this, and do not tell the others I paid it.', effects: [{ complete: 'side_seals', outcome: 'begijnhof' }, { florins: 15 }, { renown: ['Diest', 3] }, { renown: ['Begijnhof', 10] }] },
    joos_r_warned: { who: 'joos', text: 'Gone. Then she will forge somewhere else, under some other town\'s seal. I suppose that is something. Half pay for half a job.', effects: [{ complete: 'side_seals', outcome: 'warned' }, { florins: 12 }] },
    joos_after: { who: 'joos', text: 'Antwerp has stopped sending bales back. For now.' },

    // ------------------------------------------------------------------ Lijsbet
    lijsbet_meet: { who: 'lijsbet', text: 'You found the seals. I am not surprised. My hands shake when I cast them.', next: 'lijsbet_2' },
    lijsbet_2: { who: 'lijsbet', text: 'Jan was a master weaver. When he died the guild let me finish one bale and then took his loom. The cloth I make is good. It is better than half of what goes out under the true seal. But a widow\'s cloth has no seal at all.', next: 'lijsbet_3' },
    lijsbet_3: {
      who: 'lijsbet', text: 'So. What will you do with me?',
      choices: [
        { text: 'The law is the law. I am taking this to the drossaard.', next: 'lijsbet_law', effects: [{ take: 'forged_seal', n: 3 }, { stage: ['side_seals', 'decide'] }] },
        { text: 'The beguines take in widows. Go to the Begijnhof; I will speak for you.', next: 'lijsbet_beg', effects: [{ set: 'seals_begijnhof' }, { stage: ['side_seals', 'shelter'] }] },
        { text: 'Leave Diest tonight. I never found you.', next: 'lijsbet_flee', effects: [{ set: 'seals_warned' }, { give: 'seal_mould' }, { stage: ['side_seals', 'report'] }] },
      ],
    },
    lijsbet_law: { who: 'lijsbet', text: 'Then I will be at home when they come. I have nowhere else to be.' },
    lijsbet_beg: { who: 'lijsbet', text: 'The beguines? They would have me? ...I will go before the gate shuts.' },
    lijsbet_flee: { who: 'lijsbet', text: 'Take the mould. I won\'t need it where I am going, and I won\'t be tempted. God keep you.' },
    lijsbet_idle: { who: 'lijsbet', text: 'The bleaching fields are good this year. The cloth comes up white as bone.' },

    // ------------------------------------------------------------------ Aleydis
    aleydis_intro: { who: 'aleydis', text: 'You are letting in the draught, and the dragon is letting in the sheep. What do you want?', next: 'aleydis_2' },
    aleydis_2: { who: 'aleydis', text: 'Since you are here: the fever is in the infirmary and I am out of woundwort. It grows in the wet meadows along the Demer, south-east of town. You could fetch it in the time it takes me to find my shoes.',
      choices: [
        { text: 'I\'ll gather it.', effects: [{ start: 'side_herbs' }], next: 'aleydis_3' },
        { text: 'Why only by daylight?', next: 'aleydis_why' },
      ],
    },
    aleydis_why: { who: 'aleydis', text: 'Because after dark the meadows belong to something that is sometimes a dog and sometimes a horse, and always hungry. Or so the farmers say. I say: daylight, and come back.', next: 'aleydis_2' },
    aleydis_3: { who: 'aleydis', text: 'Four good handfuls. Not the leaves the cows have been at.' },
    aleydis_herbs_back: { who: 'aleydis', text: 'Good, the cows did not get there first. Take this salve. It is for burns. With that animal of yours, you will need it.', effects: [{ take: 'marsh_herb', n: 4 }, { complete: 'side_herbs' }] },
    aleydis_badge: { who: 'aleydis', text: 'Let me see. Our Lady of Scherpenheuvel, cast this year: the moulds wear and the faces get softer. Where did you find it?', next: 'aleydis_b2' },
    aleydis_b2: { who: 'you', text: 'In wet weed, on the bell frame of Sint-Sulpitius.', next: 'aleydis_b3' },
    aleydis_b3: { who: 'aleydis', text: 'Hm. The pilgrims who come through here say the new church at Scherpenheuvel hums at night. Its altar stands where the old oak stood, and they say the oak\'s roots were never dug out.', next: 'aleydis_b4' },
    aleydis_b4: { who: 'aleydis', text: 'Go to Scherpenheuvel. Find Truyken, who sells tokens by the basilica. She hears every confession the priests do not.', effects: [{ done: [MAIN, 'show'] }, { stage: [MAIN, 'scherpenheuvel'] }] },
    aleydis_lijsbet: { who: 'aleydis', text: 'A weaver\'s widow, at the gate, with nothing but her hands? You sent her. Of course you did.', next: 'aleydis_l2' },
    aleydis_l2: { who: 'aleydis', text: 'The Begijnhof has looms and no guild to forbid them. She can stay. She will work, and she will pray, and she will not forge anything again, or I will know.', effects: [{ done: ['side_seals', 'aleydis'] }, { stage: ['side_seals', 'report'] }] },
    aleydis_idle: { who: 'aleydis', text: 'The bells were silent for vespers again. We rang our own. Small bells still count.' },

    // ------------------------------------------------------------------ drossaard
    dross_letter: { who: 'drossaard', text: 'You are the dragon-rider. Splendid. I have a sealed letter for the provost of Scherpenheuvel, and every courier I own is lame, drunk or a Calvinist.',
      choices: [
        { text: 'I\'ll carry it.', effects: [{ start: 'contract_letter' }, { give: 'sealed_letter' }], next: 'dross_letter_ok' },
        { text: 'What is in it?', next: 'dross_letter_what' },
      ],
    },
    dross_letter_what: { who: 'drossaard', text: 'A sealed letter, rider. That is what "sealed" means.', next: 'dross_letter' },
    dross_letter_ok: { who: 'drossaard', text: 'West, along the Aarschot road; you will see the dome. Do not read it. I will know.' },
    dross_seals: { who: 'drossaard', text: 'A forger of the town seal? Speak.', next: 'dross_s2' },
    dross_s2: { who: 'you', text: 'Lijsbet Vranckx, a weaver\'s widow, in the cottage beyond the Cow Gate. These are her seals.', next: 'dross_s3' },
    dross_s3: { who: 'drossaard', text: 'Vranckx. I knew her husband. Well. The law is clear and I am its servant. Banishment from the barony; she is lucky it is not the pillory as well. The weavers will be grateful.', effects: [{ set: 'seals_reported' }, { done: ['side_seals', 'dross'] }, { stage: ['side_seals', 'report'] }] },
    dross_toll: { who: 'drossaard', text: 'Smuggled brandy under my nose? Tell me everything.', next: 'dross_idle' },
    dross_idle: { who: 'drossaard', text: 'The barony has an absent lord, a quiet treasury and a great many people who think both are opportunities.' },

    // ------------------------------------------------------------------ Wouter
    wouter_intro: { who: 'wouter', text: 'Toll on wine, salt, brandy, cloth and anything with wheels. Nothing to declare? Of course not. Nobody ever has.', next: 'wouter_2' },
    wouter_2: { who: 'wouter', text: 'But you have a dragon, and I have a problem. Gielis the Barrel takes brandy round the walls, by the road outside the All Saints Gate, and the toll never sees a stiver of it. From up there you would see his cart in a moment.',
      choices: [
        { text: 'I\'ll find him.', effects: [{ start: 'side_toll' }], next: 'wouter_3' },
        { text: 'What\'s in it for me?', next: 'wouter_pay' },
      ],
    },
    wouter_pay: { who: 'wouter', text: 'The gratitude of the town. And a share of the fine, if the drossaard is in a good mood. He never is.', next: 'wouter_2' },
    wouter_3: { who: 'wouter', text: 'Big man, small cart, enormous barrels. You cannot miss him.' },
    wouter_report: { who: 'wouter', text: 'Well? Did you catch the Barrel?', next: 'wouter_r_branch' },
    wouter_r_branch: {
      who: 'you', text: 'I found him.',
      choices: [
        { text: 'He paid the toll. Here it is.', if: { flag: 'toll_paid' }, next: 'wouter_r_paid' },
        { text: 'He got away.', if: { flag: 'toll_bribe' }, next: 'wouter_r_lie' },
        { text: 'I took his brandy. It\'s the town\'s now.', if: { flag: 'toll_seized' }, next: 'wouter_r_seized' },
      ],
    },
    wouter_r_paid: { who: 'wouter', text: 'Gielis paid? Gielis? You frightened the Barrel into honesty. The town thanks you. So do I.', effects: [{ complete: 'side_toll', outcome: 'paid' }, { florins: 10 }, { renown: ['Diest', 8] }] },
    wouter_r_lie: { who: 'wouter', text: 'Got away. From a dragon. Hm. ...You smell of his brandy, friend. Never mind. What the drossaard does not know does not trouble him.', effects: [{ complete: 'side_toll', outcome: 'bribed' }, { renown: ['Diest', -3] }] },
    wouter_r_seized: { who: 'wouter', text: 'Two whole casks! The drossaard will be in a good mood for once. Here, your share.', effects: [{ take: 'brandy' }, { complete: 'side_toll', outcome: 'seized' }, { florins: 18 }, { renown: ['Diest', 5] }] },
    wouter_wink: { who: 'wouter', text: '*taps his nose* Smells like a fine evening, doesn\'t it?' },
    wouter_idle: { who: 'wouter', text: 'Toll on wine, salt, brandy, cloth and anything with wheels. Dragons are still under discussion.' },

    // ------------------------------------------------------------------ Gielis
    gielis_meet: { who: 'gielis', text: 'Ho there! Just a poor carter, resting his horse. These barrels? Vinegar. For pickling. Lots of pickling.', next: 'gielis_2' },
    gielis_2: {
      who: 'gielis', text: 'A dragon. Of course. Look, friend, the toll on brandy is robbery. Take a cask for yourself and forget my face. It is a forgettable face.',
      choices: [
        { text: 'Pay the toll, Gielis, or the dragon eats the cart.', next: 'gielis_pay', effects: [{ set: 'toll_paid' }, { stage: ['side_toll', 'report'] }] },
        { text: 'I\'ll take that cask. And I never saw you.', next: 'gielis_bribe', effects: [{ set: 'toll_bribe' }, { give: 'brandy' }, { stage: ['side_toll', 'report'] }] },
        { text: 'The brandy goes to the town. Unhitch the horse and walk.', next: 'gielis_seize', effects: [{ set: 'toll_seized' }, { give: 'brandy' }, { stage: ['side_toll', 'report'] }] },
      ],
    },
    gielis_pay: { who: 'gielis', text: 'Robbery, I tell you. Robbery with wings. Fine. Fine!' },
    gielis_bribe: { who: 'gielis', text: 'A sensible soul. May your dragon never get the hiccups.' },
    gielis_seize: { who: 'gielis', text: 'My brandy! My... vinegar! You will hear from my cousin. He is a lawyer in Leuven. Well, he sweeps for one.' },
    gielis_idle: { who: 'gielis', text: 'Vinegar. Just vinegar.' },

    // ------------------------------------------------------------------ Scherpenheuvel
    truyken_main: { who: 'truyken', text: 'Badges, rosaries, little bottles of holy water, statuettes of the true oak! The oak was cut down in 1602, God rest it, and every chip of it has worked a miracle since. Some chips have worked several.', next: 'truyken_2' },
    truyken_2: { who: 'you', text: 'Has anyone strange been buying statuettes?', next: 'truyken_3' },
    truyken_3: { who: 'truyken', text: 'Strange? Everyone is strange here, it is a shrine. But yes. A tall man in a long coat, every week since Easter. Bought only the oak ones. Paid in coins that were wet. Smelled of the Demer at low water.', next: 'truyken_4' },
    truyken_4: { who: 'truyken', text: 'Here, take one. It is a real one, the hum gives it away. I do not like how it hums. It hums louder when you face west.', effects: [{ give: 'humming_statuette' }, { done: [MAIN, 'truyken'] }, { stage: [MAIN, 'report'] }] },
    truyken_idle: { who: 'truyken', text: 'Tokens of Our Lady! Blessed, mostly!' },
    provost_letter: { who: 'provost', text: 'From the drossaard of Diest? By dragon? The Archdukes, God rest them, would have loved this.', next: 'provost_l2' },
    provost_l2: { who: 'provost', text: 'Hm. He asks whether the pilgrims have heard the bells of the basilica ringing at night. They have. Nobody is ringing them. Tell him that.', effects: [{ take: 'sealed_letter' }, { complete: 'contract_letter' }] },
    provost_idle: { who: 'provost', text: 'Seven sides, seven roads, and a dome full of stars. The Archdukes built well.' },
  },
};
