// The Oude Volk: the hidden sixth party. Ordinary people (a midwife, a
// reed-cutter, a shepherd and his grandson) who still do what their
// grandparents did and who remember the oak of Scherpenheuvel. They alone
// do not want the bells to ring again. What is true (the oak, its felling,
// the church that replaced it, the witch trials) is marked as history; the
// Oude Volk themselves and all they know are invented, and the Kroniek says so.
//
// You cannot pick them at creation and they show in no list until found
// (flag ov_found). The code is in src/life/oudevolk.ts. Every flag this layer
// writes starts with "ov_", so an older save simply has none of them.
//
// Positions are local metres from the Grote Markt (x east, z south).

import type { Entry } from '../rpg/kroniek';
import type { ItemDef, Line, NpcDef, QuestDef } from '../rpg/types';
import type { Good } from '../life/types';

// ===================================================================== the people
export const OV_NPCS: NpcDef[] = [
  {
    id: 'heylwich', name: 'Heylwich Coninckx', role: "midwife", at: [470, -205], facing: 2.4, tint: '#4a5048',
    look: { body: 'woman_old', wear: { hair_bun: 'h_white', coif: null, bodice: 'slate', kerchief: null, pelerine: 'moss', skirt: 'brown', apron: 'linen', clogs: null }, prop: 'basket' },
    talk: [
      { if: { quest: 'ov_tekens', state: 'active', stage: 'vrouw' }, start: 'heyl_meet' },
      { if: { not: { flag: 'ov_found' } }, start: 'heyl_busy' },
      { if: { flag: 'ov_named' }, start: 'heyl_named' },
      { if: { quest: 'ov_eik', state: 'active', stage: 'terug' }, start: 'heyl_eik_back' },
      { if: { quest: 'ov_dof', state: 'active', stage: 'kies' }, start: 'heyl_dof3' },
      { if: { quest: 'ov_dof', state: 'active', stage: 'gedaan' }, start: 'heyl_dof_back' },
      { start: 'heyl_idle' },
    ],
  },
  {
    id: 'gooris', name: 'Gooris Verbist', role: "reed-cutter near Webbekom", at: [1395, 1190], facing: -2.2, tint: '#4e5a34',
    look: { body: 'man', wear: { hair_crop: 'h_grey', beard_full: 'h_grey', cap_flat: 'moss', smock: 'green_dk', belt: null, breeches: 'brown', stockings: 'grey', boots: null }, prop: 'bundle' },
    talk: [
      { if: { quest: 'ov_broek', state: 'active', stage: 'gooris' }, start: 'goor_q3' },
      { if: { quest: 'ov_broek', state: 'active', stage: 'terug' }, start: 'goor_q3_back' },
      { if: { quest: 'ov_broek', state: 'active' }, start: 'goor_q3_busy' },
      { if: { not: { flag: 'ov_found' } }, start: 'goor_busy' },
      { if: { all: [{ quest: 'ov_dof', state: 'done' }, { quest: 'ov_leuven', state: 'none' }] }, start: 'goor_q5' },
      { start: 'goor_idle' },
    ],
  },
  {
    id: 'aert', name: 'Aert Swinnen', role: "shepherd", at: [470, -820], facing: 0.4, tint: '#5a4e3a',
    look: { body: 'man_old', wear: { hair_thin: 'h_white', beard_full: 'h_white', hat_wide: 'brown', smock: 'grey', belt: null, mantle: 'brown', breeches: 'brown', stockings: 'grey', clogs: null }, prop: 'staff' },
    talk: [
      { if: { quest: 'ov_eik', state: 'active', stage: 'aert' }, start: 'aert_eik' },
      { if: { quest: 'ov_leuven', state: 'active', stage: 'aert' }, start: 'aert_q5' },
      { if: { not: { flag: 'ov_found' } }, start: 'aert_busy' },
      { start: 'aert_idle' },
    ],
  },
  {
    id: 'peeterken', name: 'Peeterken Swinnen', role: "boy", at: [548, -588], facing: 1.2, tint: '#6b5a3a',
    look: { body: 'boy', wear: { hair_child: 'h_blond', smock: 'linen', belt: null, breeches: 'russet', stockings: 'grey', clogs: null } },
    talk: [
      { if: { not: { flag: 'ov_sign_stenen' } }, start: 'peeterken_stones' },
      { start: 'peeterken_after' },
    ],
  },
];

/** The role under their name before and after you know who they are. */
export const OV_ROLES: Record<string, string> = { heylwich: "midwife", gooris: "reed-cutter near Webbekom", aert: "shepherd", peeterken: "boy" };

// ===================================================================== the signs
/**
 * Where the signs are: the street spot (a shrine on a post, a well) nearest each anchor gets one. The town
 * already has its wells and shrines everywhere; these few now mean something.
 */
export const OV_SIGNS: { id: string; kind: 'shrine' | 'well'; near: [number, number]; text: string }[] = [
  { id: 'knoop1', kind: 'shrine', near: [700, 70], text: "A knot of reed hangs on the wayside shrine's post, wound three times and pulled tight. No child did that." },
  { id: 'knoop2', kind: 'shrine', near: [560, -600], text: "Another knot of reed on the post. The reed is still green: someone was here this morning." },
  { id: 'knoop3', kind: 'shrine', near: [-280, -40], text: "A knot of reed on the post, and beneath it pebbles in a row, in groups of five. Someone is counting something here." },
  { id: 'melk1', kind: 'well', near: [430, -230], text: "On the rim of the well stands a little bowl of milk with a crust of bread in it. It is too high for the cats." },
  { id: 'melk2', kind: 'well', near: [-100, 330], text: "Beside the well lies a pat of butter on a leaf, a knot of reed across it. Someone here is thanking the water." },
];
/** A sign you have already counted, seen again. */
export const OV_SIGN_AGAIN = ["The reed is still there. Nobody has cut it away.", "Someone has fresh milk out. The bowl is full again."];
/** Said when a sign is counted (n of 3). */
export const OV_SIGN_COUNT = ["Grandmother knotted reed like that by the Demer.", "That is the second sign. Someone in Diest still does what Grandmother did.", "That is the third sign. By the Onze-Lieve-Vrouw church an old woman is watching you."];

/** The knots Gooris lays in the reed: the safe path through the Broek (quest ov_broek). */
export const OV_PATH: [number, number][] = [[1230, 580], [1235, 930], [1470, 1080]];

// ===================================================================== items
export const OV_ITEMS: ItemDef[] = [
  { id: 'ov_eikel', name: "Acorn of the old oak", text: "Black with age, wrapped in a rag. Aert picked it up the day the oak fell.", quest: true },
  { id: 'ov_riet', name: "Knotted reed", text: "Wound three times and wet from the Demer. Gooris knotted it.", quest: true },
  { id: 'ov_knoop', name: "Gooris's knot", text: "A knot of reed for Jaspar Goossens, ropemaker on the Dijle in Leuven.", quest: true },
];

// ===================================================================== the hidden questline
export const OV_QUESTS: QuestDef[] = [
  {
    id: 'ov_tekens', title: "Knots in the reed", kind: 'side', town: 'Diest', level: 1,
    summary: "Someone in Diest is leaving the signs your grandmother used to make.",
    reward: { xp: 120 },
    stages: [
      {
        id: 'signs',
        journal: "Today I found a sign Grandmother used to make. On Saint John's Eve she knotted reed by the Demer and set milk by the water. I never asked her why.",
        objectives: [{ id: 'signs', kind: 'flag', flag: 'ov_signs', text: "Find two more such signs in the town" }],
        onDone: [{ stage: ['ov_tekens', 'vrouw'] }],
      },
      {
        id: 'vrouw',
        journal: "Reed on a post, milk on a well, a boy who counts pebbles. By the Onze-Lieve-Vrouw church an old woman has been watching me for some time.",
        objectives: [{ id: 'heyl', kind: 'talk', text: "Speak to the old woman by the Onze-Lieve-Vrouw church", npc: 'heylwich' }],
      },
    ],
  },
  {
    id: 'ov_eik', title: "What the oak remembers", kind: 'side', town: 'Scherpenheuvel', giver: 'heylwich', level: 3,
    summary: "Heylwich wants you to hear where the Oude Volk come from.",
    reward: { xp: 300, florins: 10 },
    stages: [
      {
        id: 'aert',
        journal: "Heylwich is sending me to Aert Swinnen, a shepherd on the heath towards Schaffen. He was a boy when they cut down the oak of Scherpenheuvel. Peeterken, the boy with the pebbles, is his grandson.",
        objectives: [{ id: 'aert', kind: 'talk', text: "Find Aert the shepherd on the heath towards Schaffen", npc: 'aert' }],
      },
      {
        id: 'eik',
        journal: "Aert gave me an acorn from the old oak, black with age. I am to lay it on the hill at Scherpenheuvel, by the church they built there.",
        objectives: [{ id: 'eik', kind: 'reach', text: "Lay the acorn by the church at Scherpenheuvel", at: [-5062, 518], r: 42, onFoot: true }],
        onDone: [{ take: 'ov_eikel' }, { toast: "A father saw you kneel by the church wall" }, { stage: ['ov_eik', 'terug'] }],
      },
      {
        id: 'terug',
        journal: "I pushed the acorn between the stones at the foot of the wall. A father saw me kneel and said nothing. That is worse than saying something.",
        objectives: [{ id: 'heyl', kind: 'talk', text: "Tell Heylwich in Diest", npc: 'heylwich' }],
      },
    ],
  },
  {
    id: 'ov_broek', title: "Paths through the Broek", kind: 'side', town: 'Diest', giver: 'heylwich', level: 4,
    summary: "Gooris the reed-cutter knows the paths the hounds keep off.",
    reward: { xp: 420, florins: 15 },
    stages: [
      {
        id: 'gooris',
        journal: "Heylwich says Gooris Verbist, a reed-cutter near Webbekom, knows the paths through the Broek where the hounds never go. He works at the edge of the marsh.",
        objectives: [{ id: 'gooris', kind: 'talk', text: "Find Gooris the reed-cutter near Webbekom", npc: 'gooris' }],
      },
      {
        id: 'paden',
        journal: "Where Gooris ties a knot in the reed, the ground is firm and the hounds cannot smell you. I must follow his knots on foot, one to the next.",
        objectives: [
          { id: 'k1', kind: 'reach', text: "Follow the first knot in the reed, on foot", at: OV_PATH[0], r: 12, onFoot: true },
          { id: 'k2', kind: 'reach', text: "Follow the second knot in the reed", at: OV_PATH[1], r: 12, onFoot: true },
          { id: 'k3', kind: 'reach', text: "Follow the third knot, by the open water", at: OV_PATH[2], r: 12, onFoot: true },
        ],
        onDone: [{ stage: ['ov_broek', 'spaar'] }],
      },
      {
        id: 'spaar',
        journal: "The knots held: the ground stayed firm and no hound looked up. Gooris says the Oude Volk do not kill the hounds unless they must. He wants to see if I can manage that.",
        objectives: [{ id: 'spaar', kind: 'flag', flag: 'ov_q3', text: "Beat two marsh hounds weak, then let them go with E", hint: [1110, 520] }],
        onDone: [{ stage: ['ov_broek', 'terug'] }],
      },
      {
        id: 'terug',
        journal: "Two hounds slunk off into the reed, tails between their legs. They are still alive, and they know who I am.",
        objectives: [{ id: 'gooris', kind: 'talk', text: "Tell Gooris near Webbekom", npc: 'gooris' }],
      },
    ],
  },
  {
    id: 'ov_dof', title: "Muffled bronze", kind: 'side', town: 'Diest', giver: 'heylwich', level: 5,
    summary: "Heylwich asks one thing of you: bind the smallest bell of Sint-Sulpitius.",
    reward: { xp: 500 },
    stages: [
      {
        id: 'kies',
        journal: "Heylwich wants me to bind a knot of reed round the clapper of the smallest bell of Sint-Sulpitius. Then the Kludde and {dragon} would only half sleep. Pieter would never forgive me.",
        objectives: [{ id: 'heyl', kind: 'talk', text: "Give Heylwich your answer", npc: 'heylwich' }],
      },
      {
        id: 'toren',
        journal: "I said yes. Gooris has already knotted the reed, wet from the Demer. The smallest bell hangs at the top of the tower, where only {dragon} can reach.",
        objectives: [{ id: 'toren', kind: 'reach', text: "Fly to the smallest bell in the tower of Sint-Sulpitius", at: [-26, 30], r: 30, minY: 28 }],
        onDone: [{ take: 'ov_riet' }, { set: 'ov_choice', to: 'volk' }, { set: 'rekening_diest_klokje', to: 'dof' }, { stage: ['ov_dof', 'gedaan'] }],
      },
      {
        id: 'gedaan',
        journal: "The reed is round the clapper, wound three times. At the next stroke the little bell sounded like a pot with its lid on, and {dragon} kept his eyes open.",
        objectives: [{ id: 'heyl', kind: 'talk', text: "Tell Heylwich", npc: 'heylwich' }],
      },
      {
        id: 'nee',
        journal: "I said no. Heylwich looked at me the way Grandmother did when I came home late. Pieter must know that someone means to tamper with his bells. He need not know who.",
        objectives: [{ id: 'pieter', kind: 'talk', text: "Warn Pieter the sexton", npc: 'pieter' }],
      },
    ],
  },
  {
    id: 'ov_leuven', title: "A knot for the road", kind: 'side', town: 'Diest', giver: 'gooris', level: 6,
    summary: "Gooris and Aert give you something for the road: to Leuven, and on to the land of Loon.",
    reward: { xp: 300 },
    stages: [
      {
        id: 'aert',
        journal: "Gooris gave me a knot of reed for Jaspar Goossens, a ropemaker on the Dijle in Leuven. Aert has something for me as well.",
        objectives: [{ id: 'aert', kind: 'talk', text: "Call on Aert on the heath", npc: 'aert' }],
      },
      {
        id: 'poort',
        journal: "A knot from Gooris for a man in Leuven, and from Aert some advice: go east too, to the land of Loon, where the towers have been silent for a year. First the road to Leuven, through the Putterstraatpoort. (Leuven and Loon come in later expansions of the world.)",
        objectives: [{ id: 'poort', kind: 'reach', text: "Leave town by the road to Leuven", at: [-150, 420], r: 30 }],
        onDone: [{ call: 'ov:talisman:knoop' }, { complete: 'ov_leuven' }],
      },
    ],
  },
];

// ===================================================================== conversations
// Heylwich's everyday menu (heyl_idle, heyl_tell, heyl_teach) is written by src/life/oudevolk.ts each
// time you speak to her, from what you know and your standing with them.
export const OV_DIALOGUE: Record<string, Line> = {
  // ---------------------------------------------------------------- Heylwich
  heyl_busy: { who: 'heylwich', text: "Not now, child. Behind the fish market a woman is in labour, and that child waits for nobody." },
  heyl_meet: {
    who: 'heylwich', text: "{name}. Yes, I know your name. I also know your grandmother's, and where she laid her knots.",
    choices: [
      { text: "Who are you?", next: 'heyl_meet_who' },
      { text: "What do you know about my grandmother?", next: 'heyl_meet_gm' },
    ],
  },
  heyl_meet_who: { who: 'heylwich', text: "Heylwich Coninckx, midwife. Half of Diest came into the world through my hands, and the other half wish I would forget it.", next: 'heyl_meet2' },
  heyl_meet_gm: { who: 'heylwich', text: "That she called the Kludde by his name, by the fire, to keep you indoors. And that on Saint John's Eve she set milk by the water. We all did.", next: 'heyl_meet2' },
  heyl_meet2: { who: 'heylwich', text: "You found the knots, the milk and the boy with his pebbles, so you may know. There are still people who do what their grandparents did.", next: 'heyl_meet3' },
  heyl_meet3: { who: 'heylwich', text: "We have no name. Those who whisper about us say \"the oude volk\", the old folk. The parish priest says \"superstitious\", and the dean of the chapter has an uglier word.", next: 'heyl_meet4' },
  heyl_meet4: {
    who: 'heylwich', text: "And we want something no one else in Diest wants. We want the bells to stay silent.",
    choices: [
      { text: "Why? Without bells the town doesn't know the hour.", next: 'heyl_meet_time' },
      { text: "The water took my sister. The bells hold it back.", next: 'heyl_meet_water' },
    ],
  },
  heyl_meet_time: { who: 'heylwich', text: "The town knew the hour before any bells hung: by the sun, by the cows, by the water. The bells don't count time, {name}. They keep things asleep.", next: 'heyl_meet5' },
  heyl_meet_water: { who: 'heylwich', text: "So says the priest. But the bells put the guardians to sleep too, child, and your dragon is one of them. Then there is only bronze between us and the water.", next: 'heyl_meet5' },
  heyl_meet5: { who: 'heylwich', text: "Watch your dragon when they ring, and you will see what I mean. Come back if you want to know more. I won't tell it all at once.", effects: [{ set: 'ov_found' }, { call: 'ov:found' }, { complete: 'ov_tekens' }] },

  heyl_named: { who: 'heylwich', text: "They called me before the dean of the chapter. I told him I gather herbs, and that is true. Go now, {name}. People are watching." },

  heyl_eik: {
    who: 'heylwich', text: "You want to know where we come from. Then go to Aert Swinnen, the shepherd on the heath towards Schaffen. He saw the oak before they cut it down.",
    choices: [
      { text: "I'll go to Aert.", effects: [{ start: 'ov_eik' }], next: 'heyl_eik_ok' },
      { text: "What oak?", next: 'heyl_eik_welke' },
    ],
  },
  heyl_eik_welke: { who: 'heylwich', text: "The oak of Scherpenheuvel. A seven-sided church stands there now. Before there was a church there was a tree, and we came to that tree.", next: 'heyl_eik' },
  heyl_eik_ok: { who: 'heylwich', text: "Tell him I sent you. Otherwise he'll tell you about his sheep, and that lasts till winter." },
  heyl_eik_back: { who: 'heylwich', text: "You laid it. Good. Now the hill knows someone is still here.", next: 'heyl_eik_back2' },
  heyl_eik_back2: {
    who: 'heylwich', text: "Now something you can use. A beast you have beaten weak need not be finished off. Let it go, and it remembers. (You can now let marsh hounds and will-o'-the-wisps go: beat them weak and press E.)",
    effects: [{ set: 'ov_spare' }, { call: 'ov:learn:spare' }, { complete: 'ov_eik' }],
  },

  heyl_broek: {
    who: 'heylwich', text: "Whoever walks with us must cross the Broek without the hounds smelling them. Gooris Verbist cuts reed near Webbekom, and he knows the paths.",
    choices: [
      { text: "I'll find Gooris.", effects: [{ start: 'ov_broek' }], next: 'heyl_broek_ok' },
      { text: "Why should I spare the hounds?", next: 'heyl_broek_why' },
    ],
  },
  heyl_broek_why: { who: 'heylwich', text: "Because they were here before the town was, and they come back whether you kill them or not. What you spare does not forget you.", next: 'heyl_broek' },
  heyl_broek_ok: { who: 'heylwich', text: "He doesn't talk much. When he does, listen." },
  heyl_wait: { who: 'heylwich', text: "I won't ask you to leave the clappers in the Broek. Bring them back if you must, and come and see me afterwards. Then we will talk about the bells." },

  heyl_dof: { who: 'heylwich', text: "The bells are ringing again. Watch {dragon} when they strike: his eyes fall shut, and he fights it.", next: 'heyl_dof2' },
  heyl_dof2: { who: 'heylwich', text: "My mother told it to me so, and I tell it to you: when every bell in the land rings together again, everything that woke will sleep. The Kludde. And him.", next: 'heyl_dof3' },
  heyl_dof3: {
    who: 'heylwich', text: "I ask you one thing, and never anything again. Bind a knot of reed round the clapper of the smallest bell of Sint-Sulpitius. Then it sounds muffled, and what woke only half sleeps.",
    choices: [
      { text: "I'll bind the bell.", effects: [{ start: 'ov_dof' }, { give: 'ov_riet' }, { stage: ['ov_dof', 'toren'] }], next: 'heyl_dof_ja' },
      { text: "No. The bells keep the water still, and so it stays.", effects: [{ start: 'ov_dof' }, { stage: ['ov_dof', 'nee'] }], next: 'heyl_dof_nee' },
      { text: "What happens if I don't?", next: 'heyl_dof_why' },
      { text: "Let me think about it.", effects: [{ start: 'ov_dof' }], next: 'heyl_dof_later' },
    ],
  },
  heyl_dof_why: { who: 'heylwich', text: "Then he sleeps, and the Kludde too, and Diest sleeps easy. What guards the town after that is bronze. That is something too, I know.", next: 'heyl_dof3' },
  heyl_dof_ja: { who: 'heylwich', text: "Here, Gooris has already knotted it. The rest only {dragon} can do: the bell hangs at the top, where Pieter no longer climbs." },
  heyl_dof_nee: { who: 'heylwich', text: "Then that is how it is. I won't curse you, child; we are not like that. But what he can do fully awake, I will not teach you." },
  heyl_dof_later: { who: 'heylwich', text: "Think it over. The bells won't run off, and at my age neither will I." },
  heyl_dof_back: { who: 'heylwich', text: "I heard it at the noon stroke. It sounded like a pot with its lid on. Thank you, {name}.", next: 'heyl_dof_back2' },
  heyl_dof_back2: { who: 'heylwich', text: "What he can do fully awake, I will teach you when the folk know you well enough. That won't be long now.", effects: [{ complete: 'ov_dof', outcome: 'volk' }] },

  heyl_beeld: { who: 'heylwich', text: "Show me. That is oak from the hill. The wood remembers what sleeps beneath it, and where it hums, something is awake.", effects: [{ set: 'ov_beeld' }] },
  heyl_zw_kludde: { who: 'heylwich', text: "He grows heavier when you carry him and smaller when you name him. Shout his name aloud when he comes, then strike.", effects: [{ call: 'ov:weak:kludde' }] },

  // what she knows about the dragon, a piece at a time (one per standing tier)
  heyl_k1a: { who: 'heylwich', text: "We call him a guardian. Before there were bells there were guardians like him, and they kept the water out of the land.", next: 'heyl_k1b' },
  heyl_k1b: { who: 'heylwich', text: "He is no devil and no beast. He is older than every town along the river, and he guards them all.", effects: [{ call: 'ov:know:1' }] },
  heyl_k2a: { who: 'heylwich', text: "The sound of the bells puts to sleep everything older than the town. The guardians too, and him.", next: 'heyl_k2b' },
  heyl_k2b: { who: 'heylwich', text: "On the night of your sister, the bells of Diest fell silent after seven strokes. When the silence held, he woke.", next: 'heyl_k2c' },
  heyl_k2c: { who: 'heylwich', text: "The Kludde woke too. He stole the clappers, so the bells would stay silent.", next: 'heyl_k2d' },
  heyl_k2d: { who: 'heylwich', text: "In his nest there are notches cut in a post, in groups of five. What they mean I do not know. Peeterken lays his pebbles the same way.", effects: [{ call: 'ov:know:2' }] },
  heyl_k3a: { who: 'heylwich', text: "He came to the place where the water had struck, to the one who had just lost someone to it. That is the guardians' way.", next: 'heyl_k3b' },
  heyl_k3b: { who: 'heylwich', text: "You stood there calling your sister's name. And every year your grandmother set milk by the water. He does not forget a house like that.", effects: [{ call: 'ov:know:3' }] },
  heyl_k4a: { who: 'heylwich', text: "East of here lies the land of Loon. It belongs to the Prince-Bishop of Luik, not to Brabant.", next: 'heyl_k4b' },
  heyl_k4b: { who: 'heylwich', text: "Last year they took the bells down from the towers there. More guardians are awake there than here, and there are more of us. Go and see: he will be stronger there.", effects: [{ call: 'ov:know:4' }] },

  // ---------------------------------------------------------------- Gooris
  goor_busy: { who: 'gooris', text: "Reed for the roofs of Webbekom. Mind yourself; a bundle weighs more than you think." },
  goor_q3: { who: 'gooris', text: "Heylwich said you would come. You walk too loud, but you will learn.", next: 'goor_q3b' },
  goor_q3b: { who: 'gooris', text: "Where I tie a knot in the reed, the ground is firm and the hounds can't smell you. Follow my knots on foot, and keep away from the open water.", effects: [{ done: ['ov_broek', 'gooris'] }, { stage: ['ov_broek', 'paden'] }] },
  goor_q3_busy: { who: 'gooris', text: "Follow my knots, on foot. And don't kill the hounds unless you must. They were here before us." },
  goor_q3_back: { who: 'gooris', text: "Two hounds alive tonight that know you. That is worth more than a pelt on the wall.", next: 'goor_q3_back2' },
  goor_q3_back2: {
    who: 'gooris', text: "Remember this. A marsh hound bites at your back, so turn to face it and strike as it leaps. A will-o'-the-wisp follows your breath: hold it, and strike through the light.",
    effects: [{ call: 'ov:broek' }, { complete: 'ov_broek' }],
  },
  goor_q5: {
    who: 'gooris', text: "That figure of yours points to Leuven, I hear. More bells ring there than in all the Hageland. Take this knot with you.",
    choices: [
      { text: "Who is it for?", next: 'goor_q5_who' },
      { text: "I'll take it.", effects: [{ start: 'ov_leuven' }, { give: 'ov_knoop' }], next: 'goor_q5_ok' },
    ],
  },
  goor_q5_who: { who: 'gooris', text: "For Jaspar Goossens, a ropemaker on the Dijle. He is one of us, in a town with too many bells. He twists rope and counts the strokes.", next: 'goor_q5' },
  goor_q5_ok: { who: 'gooris', text: "Show him the knot and he will know who you are. But call on Aert first. He has something for you as well." },
  goor_idle: {
    who: 'gooris', text: "The reed stands high this year. Good for the roofs, bad for whoever loses the path.",
    choices: [
      { text: "Sister Margriet says: pick the woundwort by daylight.", if: { any: [{ quest: 'side_herbs', state: 'active' }, { quest: 'side_herbs', state: 'done' }] }, next: 'goor_herbs' },
      { text: "Goodbye, Gooris." },
    ],
  },
  goor_herbs: { who: 'gooris', text: "She is right there. By night the woundwort belongs to someone else, and he takes no payment." },

  // ---------------------------------------------------------------- Aert
  aert_busy: { who: 'aert', text: "The sheep know the heath better than I do. I just follow them, and at night I count them." },
  aert_eik: { who: 'aert', text: "Heylwich sent you? Then I will tell it, once.", next: 'aert_eik2' },
  aert_eik2: { who: 'aert', text: "I was twelve. We drove the sheep up the hill, because the best grass grew there. Under the oak there were always ribbons, little loaves and children's shirts.", next: 'aert_eik3' },
  aert_eik3: { who: 'aert', text: "People came there before any figure of Mary hung in the trunk. Then men came with axes, and that night my mother wept. I didn't know why.", next: 'aert_eik4' },
  aert_eik4: {
    who: 'aert', text: "Here, an acorn from that tree. I picked it up when it fell. Lay it on the hill, by the church they built there.",
    effects: [{ give: 'ov_eikel' }, { done: ['ov_eik', 'aert'] }, { stage: ['ov_eik', 'eik'] }],
  },
  aert_q5: { who: 'aert', text: "Leuven? I went there once, with the wool. Too many bells. My sheep stopped dead at every stroke.", next: 'aert_q5b' },
  aert_q5b: { who: 'aert', text: "Tell Jaspar Goossens that Aert Swinnen is still alive. And afterwards go east as well, to the land of Loon. The towers there have been silent a year, and more of our kind live there.", effects: [{ done: ['ov_leuven', 'aert'] }, { stage: ['ov_leuven', 'poort'] }] },
  aert_idle: {
    who: 'aert', text: "Peeterken is still laying his pebbles. Five, then a gap, then five again. I count along.",
    choices: [
      { text: "Is Peeterken your grandson?", next: 'aert_peeterken' },
      { text: "Goodbye, Aert." },
    ],
  },
  aert_peeterken: { who: 'aert', text: "Yes. He went into the water that night and came out three days later, warm as bread from the oven. He has said nothing since, but he counts." },

  // ---------------------------------------------------------------- Peeterken
  peeterken_stones: {
    who: 'peeterken', text: "*He says nothing. He lays pebbles in a row, in groups of five, and does not look up.*", effects: [{ call: 'ov:sign:stenen' }],
    choices: [
      { text: "What are you counting?", next: 'peeterken_2' },
      { text: "I'll leave you be." },
    ],
  },
  peeterken_2: { who: 'peeterken', text: "*He lays another stone, and another. Then he points at the Demer, and then at you.*" },
  peeterken_after: { who: 'peeterken', text: "*Five pebbles, a gap, and five again. When you sit down beside him, he pushes a stone towards you.*" },

  // ---------------------------------------------------------------- what De Kerk says (Margriet, whose id is aleydis; Pieter; the overste, id provost)
  aleydis_ov: { who: 'aleydis', text: "You have been to Heylwich Coninckx. I can smell it: elder and Demer water.", next: 'aleydis_ov2' },
  aleydis_ov2: { who: 'aleydis', text: "She has delivered more children than I have nursed, and I pray for her. But the water she thanks took three children along the Demer last year.", next: 'aleydis_ov3' },
  aleydis_ov3: {
    who: 'aleydis', text: "The bells keep that water still. To you that may be superstition. To the mothers of those children it is mercy.",
    choices: [
      { text: "She says the bells put my dragon to sleep as well.", next: 'aleydis_ov4' },
      { text: "I'll remember that.", next: 'aleydis_ov5' },
    ],
  },
  aleydis_ov4: { who: 'aleydis', text: "I know. I saw him go down at the first stroke. I don't say it costs nothing, {name}. I say I know who pays otherwise.", next: 'aleydis_ov5' },
  aleydis_ov5: { who: 'aleydis', text: "And tell her to be careful. Women have burned for less than a bowl of milk by a well.", effects: [{ set: 'ov_aleydis' }, { call: 'ov:page:heksen' }] },

  pieter_ov: {
    who: 'pieter', text: "You look at my bells as if they had done something wrong. What is it?",
    choices: [
      { text: "Someone means to bind reed round the clapper of the little bell. Guard it.", next: 'pieter_ov_warn' },
      { text: "Heylwich Coninckx, the midwife, wants to bind your bells.", next: 'pieter_ov_named' },
      { text: "Never mind. It's nothing.", next: 'pieter_ov_niets' },
    ],
  },
  pieter_ov_warn: { who: 'pieter', text: "Reed, round my clapper. I'll put a lock on it, and I won't ask who. I don't want to know.", effects: [{ set: 'ov_choice', to: 'kerk' }, { set: 'rekening_diest_klokje', to: 'helder' }, { complete: 'ov_dof', outcome: 'kerk' }] },
  pieter_ov_named: { who: 'pieter', text: "The midwife? She brought my children into the world. I have to tell the dean of the chapter, {name}, you know that. God forgive us both.", effects: [{ set: 'ov_choice', to: 'kerk' }, { set: 'rekening_diest_klokje', to: 'helder' }, { set: 'ov_named' }, { complete: 'ov_dof', outcome: 'genoemd' }] },
  pieter_ov_niets: { who: 'pieter', text: "Nothing is something too, my grandmother used to say. She said a great deal." },
  pieter_dof: { who: 'pieter', text: "The little bell has sounded muffled for a few days. I went up to look: there was reed round the clapper, wet reed, wound three times.", next: 'pieter_dof2' },
  pieter_dof2: { who: 'pieter', text: "I left it there. Don't ask me why; I don't know myself. My grandmother knotted reed like that too.", effects: [{ set: 'ov_pieter_dof' }] },
  pieter_b_ov: { who: 'pieter', text: "Heylwich Coninckx? She says a great deal, and half of it is true. I ring the bells, {name}. What they keep asleep is God's concern.", next: 'pieter_b4' },

  provost_ov: { who: 'provost', text: "You are looking at the foot of the wall, while everyone else looks at the dome. People still come who want to lay something here: a ribbon, an acorn.", next: 'provost_ov2' },
  provost_ov2: { who: 'provost', text: "I have the sexton sweep it away. The oak that stood here was cut down, and the bishop had his reasons.", effects: [{ set: 'ov_provost' }] },
};

// ===================================================================== what Heylwich teaches
/** Her greeting, by your standing with the Oude Volk (Stranger .. Trusted), before what she says next. */
export const OV_GREET: string[][] = [
  ["What do you want? I don't know you.", "You don't just walk in here, stranger.", "Hm. Say what you came for."],
  ["{name}. Come in, the door is open.", "Ah, the one who found the reed. Come in.", "Good day, {name}. You have seen the knots, I hear."],
  ["{name}. You walk quieter than you used to.", "Come, {name}. The water is calm today.", "Good day, {name}. The hounds know your scent now."],
  ["{name}. Your grandmother would be pleased.", "There is always milk by the well for you, {name}.", "{name}, child of the Demer. Tell me."],
  ["{name}. What we know, you know now too.", "{name}. The guardian knows you, and so do we.", "Sit down, {name}. You are one of us."],
];
/** After she has been told no (and not named). */
export const OV_GREET_COOL = ["{name}. You made your choice, and so did I. What do you want?", "Good day, {name}. The bells are ringing, do you hear? What do you want?"];

export const OV_TEACH: Record<string, string> = {
  nevel: "Let him fly low over the Broek one morning, at first light. He can breathe mist instead of fire, and whoever stands in the mist sees nothing more. (Mist Breath: right mouse in flight.)",
  slag: "When he skims low over the ground and brings his wings down hard, everything beneath them falls. Let him; he has not done it in a long time. (Wingbeat: R in flight, low over the ground.)",
  roep: "You need not wait for him when you are in trouble. Call him the way you called your sister, and he will come, with fire. (Dragon Call: G on foot, in a fight.)",
  refused: "What he can do fully awake, I will not teach you. You chose that he should sleep, and I respect that.",
  later: "I teach you what you can carry. When the folk know you better, I will teach you more.",
};

// ===================================================================== her basket
export const OV_GOODS: Good[] = [
  { id: 'ov_vlier', name: "Elder draught", text: "Half a minute of healing in a fight. Goes in your bag.", price: 2, use: { regen: 0.018, secs: 30 } },
  { id: 'ov_zalf', name: "Comfrey salve", text: "A salve with no blessing in it, only comfrey. Apply it with Q.", price: 5, use: { salve: 1 } },
  { id: 'ov_talisman_knoop', name: "Knot of reed", text: "A talisman. Whoever wears it finds the way back, says Heylwich.", price: 12, tier: 1, use: { talisman: 'ov_knoop' } },
  { id: 'ov_talisman_eikel', name: "Acorn in a rag", text: "A talisman from the hill. She sells it only to those the folk know well.", price: 30, tier: 2, use: { talisman: 'ov_eikel' } },
  { id: 'ov_talisman_stenen', name: "String of Demer stones", text: "Five stones, each with a hole the water wore through itself. She sells it only to those the folk trust.", price: 60, tier: 3, use: { talisman: 'ov_stenen' } },
];
export const OV_TALISMANS: Record<string, { name: string; rarity: 0 | 1 | 2; mods: Record<string, number>; text: string }> = {
  ov_knoop: { name: "Knot of reed", rarity: 0, mods: { list: 2, hp: 8 }, text: "Wound three times and pulled tight. It smells of the Demer." },
  ov_eikel: { name: "Acorn in a rag", rarity: 1, mods: { klank: 3, taaiheid: 2, hp: 14 }, text: "From an oak that no longer stands. It weighs more than an acorn should." },
  ov_stenen: { name: "String of Demer stones", rarity: 2, mods: { taaiheid: 3, kracht: 2, list: 2, hp: 22 }, text: "Five stones from the Demer, each with a hole the water wore through itself." },
  ov_goossens: { name: "Knot for Jaspar Goossens", rarity: 1, mods: { list: 3, hp: 12 }, text: "A knot from Gooris, to show a ropemaker in Leuven. Until then you wear it yourself." },
};

// ===================================================================== the Kroniek
// Every page here is secret: it is not listed or counted until you have found it.
export const OV_PAGES: Entry[] = [
  { id: 'tijd:oudevolk', cat: 'tijd', truth: 'verzonnen', secret: true, title: "The Oude Volk", hint: '',
    text: "We invented the Oude Volk: ordinary people who do what their grandparents did, who remember the oak of Scherpenheuvel and want the old guardians back. What is real is that such customs still lived in 1650, like porridge left out for the alvermannekes. Real too is that the Church called them superstition, and made suspects of those who kept them." },
  { id: 'tijd:eik', cat: 'tijd', truth: 'geschiedenis', secret: true, title: "The oak of Scherpenheuvel", hint: '',
    text: "On the hill stood an oak with a figure of Mary in it. The sick came to pray, and cures were reported. Shortly after 1600 the oak was felled on the bishop's orders, probably to smother the superstition around it, and figures were carved from its wood. A church rose on the hill, consecrated in 1627." },
  { id: 'tijd:heksen', cat: 'tijd', truth: 'geschiedenis', secret: true, title: "Witches", hint: '',
    text: "In the Netherlands people were condemned and burned as witches, most of them women, most often around 1600, when those who are old now were young. A midwife, a herb woman or a widow living alone fell under suspicion first. A neighbour with a sick cow was enough to begin." },
  { id: 'tijd:ontzien', cat: 'tijd', truth: 'verzonnen', secret: true, title: "Letting go", hint: '',
    text: "Beat a marsh hound or a will-o'-the-wisp weak, then let it go with E. It counts as driven off: you get less loot and more standing with the Oude Volk. What you spare remembers you, says Heylwich. This is no folk custom; it is ours." },
  { id: 'tijd:paden', cat: 'tijd', truth: 'verzonnen', secret: true, title: "The paths of Gooris", hint: '',
    text: "Where Gooris Verbist ties a knot in the reed, the ground is firm. Whoever knows his paths crosses the Broek unsmelt by the hounds: they notice you only when you are close. Cutting reed for roofs was ordinary work in wet country. These paths and their knots we invented." },
  { id: 'mens:heylwich', cat: 'mens', truth: 'verzonnen', secret: true, title: 'Heylwich Coninckx', hint: '',
    text: "Midwife in Diest. She has brought more children into the world than the priest has baptised, she says, and he does not deny it. She lives by the Onze-Lieve-Vrouw church, among the gardens, and knows everyone's name." },
  { id: 'mens:gooris', cat: 'mens', truth: 'verzonnen', secret: true, title: 'Gooris Verbist', hint: '',
    text: "Reed-cutter near Webbekom. He cuts reed for roofs and knows the Broek the way another man knows his own kitchen. He says little, and he walks even quieter than he talks." },
  { id: 'mens:aert', cat: 'mens', truth: 'verzonnen', secret: true, title: 'Aert Swinnen', hint: '',
    text: "Shepherd on the heath towards Schaffen. He was a boy of twelve when the oak of Scherpenheuvel fell, and he counts his sheep with knots in a cord." },
  { id: 'mens:peeterken', cat: 'mens', truth: 'verzonnen', secret: true, title: 'Peeterken Swinnen', hint: '',
    text: "Grandson of Aert Swinnen. On the night of the seven strokes he went into the water, and three days later he came out, soaked through and warm. He has not spoken since. He lays pebbles in a row, in groups of five." },
  { id: 'wezen:waker1', cat: 'wezen', truth: 'verzonnen', secret: true, title: "The guardians", hint: '',
    text: "That is what the Oude Volk call your dragon and his kind. Before there were bells, says Heylwich, the guardians kept the water out of the land. He is no devil and no beast, and he is older than every town on the Demer. We invented him, with all the Oude Volk know of him." },
  { id: 'wezen:waker2', cat: 'wezen', truth: 'verzonnen', secret: true, title: "Why he woke", hint: '',
    text: "The sound of the bells puts to sleep what is older than the town, the guardians too. On Neelke's night the bells of Diest fell silent after seven strokes, and when the silence held, he woke. So did the Kludde: he stole the clappers so they would stay silent. What the notches in his nest mean, Heylwich does not know." },
  { id: 'wezen:waker3', cat: 'wezen', truth: 'verzonnen', secret: true, title: "Why you", hint: '',
    text: "A guardian goes where the water struck, to whoever has just lost someone to it, says Heylwich. You stood by the water calling your sister's name. And every Saint John's Eve your grandmother set milk by the water. He does not forget a house like that." },
  { id: 'wezen:waker4', cat: 'wezen', truth: 'verzonnen', secret: true, title: "The land of Loon", hint: '',
    text: "East of Diest lies the land of Loon, which belongs to the Prince-Bishop of Luik and not to Brabant. That is history. That they took the bells down from the towers there last year, and that more guardians are awake there, is ours. The Oude Volk are stronger there than anywhere." },
  { id: 'wezen:zwakte_broekhond', cat: 'wezen', truth: 'verzonnen', secret: true, title: "What Gooris knows of the hounds", hint: '',
    text: "A marsh hound bites at your back and shies from whoever looks at it. Turn to face it and strike as it leaps, says Gooris. Whoever knows this hits harder: a third more damage. The marsh hounds and this advice are both our invention." },
  { id: 'wezen:zwakte_dwaallicht', cat: 'wezen', truth: 'verzonnen', secret: true, title: "What Gooris knows of the lights", hint: '',
    text: "Whoever saw a will-o'-the-wisp turned his coat inside out so it would not know him: that, folk really told. Gooris says something else: hold your breath and strike through the light. That second part is ours, and it works: a third more damage." },
  { id: 'wezen:zwakte_kludde', cat: 'wezen', truth: 'verzonnen', secret: true, title: "What Heylwich knows of the Kludde", hint: '',
    text: "That the Kludde leaps onto your back and grows heavier with every step, folk really told. That he shrinks when you call him by name is ours, as is Heylwich's advice: shout his name, then strike. You hit him a quarter harder." },
];

// ===================================================================== what people say
/** Street talk (life.ts gossip): before they are found, after, and what De Kerk's people say. `roles`: only these speakers. */
export const OV_REACTIVE: { t: string; if: string; roles?: string[] }[] = [
  { if: 'ov_rumour', t: "My grandmother put milk by the well. The priest said it was for the devil." },
  { if: 'ov_rumour', t: "Some shrines have knotted reed on them. The sexton cuts it off. A week later it is back." },
  { if: 'ov_rumour', t: "Some old people still thank the Demer when they walk by it. Not out loud." },
  { if: 'ov_rumour', roles: ['beguine', 'friar', 'pilgrim'], t: "Whoever leaves milk by a well leaves it for the devil. So says the chapter's notice." },
  { if: 'ov_found', t: "Coninckx the midwife delivered me, and my children too. What else she does is none of my business." },
  { if: 'ov_found', t: "They say you talk to the midwife. Careful: people love to talk about midwives." },
  { if: 'ov_found', roles: ['beguine', 'friar'], t: "Heylwich Coninckx is a good midwife and a bad Christian. We pray for the half that needs it." },
  { if: 'ov_high', t: "You smell of reed and Demer water, {name}. You're in the Broek a lot, I hear." },
  { if: 'kerk_high_ov', roles: ['beguine', 'friar'], t: "De Kerk thinks well of you, {name}. Less so when you are at that midwife's." },
  { if: 'ov_spared', t: "They say you let a hound go in the Broek. The farmers find that strange. So do I." },
  { if: 'ov_choice_volk', t: "The little bell of Sint-Sulpitius sounds muffled. My husband says it's cracked. I say nothing." },
  { if: 'ov_choice_volk', roles: ['beguine', 'friar'], t: "Someone has tampered with the bells of Sint-Sulpitius. The dean of the chapter wants a name." },
  { if: 'ov_choice_kerk', t: "There is a new lock on the tower of Sint-Sulpitius. Pieter won't say why." },
  { if: 'ov_named', t: "They called Coninckx the midwife before the chapter. Who will deliver the children now?" },
];
export const OV_TOWN_VIEW: { t: string; if: string }[] = [
  { if: 'ov_choice_volk', t: "The little bell has sounded muffled lately, and people sleep worse, or better. They cannot agree which." },
];
export const OV_REP = ["The Oude Volk do not know who you are.", "A few old people know your name. They do not say it aloud.", "They say you talk to the midwife. Not everyone approves.", "The old people leave a bowl of milk by the well for you.", "They say the Oude Volk count you as one of their own. Don't say so in church."];
export const OV_REP_DEEDS: { t: string; if: string }[] = [
  { if: 'ov_choice_volk', t: "They whisper that you tampered with the bells." },
  { if: 'ov_named', t: "They know you gave up the midwife. De Kerk thanks you. The mothers do not." },
];
/** What the crowd calls out as you pass (12 words at most). */
export const OV_BARKS: { if: string; t: string }[] = [
  { if: 'ov_rumour', t: "Who's been hanging reed on that shrine again?" },
  { if: 'ov_found', t: "You smell of elder. Been to the midwife?" },
  { if: 'ov_choice_volk', t: "Hear that little bell? Sounds like it has a cold." },
  { if: 'ov_named', t: "The midwife was called before the chapter. Poor woman." },
];

/** The kapittel's notice on the board, once you have seen a sign (what De Kerk says about them). */
export const OV_NOTICE = "BY ORDER OF THE CHAPTER. Whoever leaves milk, bread or knotted reed at wells, springs or shrines practises superstition and will be reported to the dean. Whoever knows such a person shall not keep silent.";

/** Wanne Coels, the herb woman on the market, knows more than she sells. */
export const OV_WANNE = {
  askBefore: "Who ties reed to the shrines?",
  before: "Who can say? Old people with old hands. Ask the midwife by the Onze-Lieve-Vrouw church. Or don't.",
  askAfter: "Do you know Heylwich Coninckx?",
  after: "Everyone knows Heylwich, but not everyone says so aloud. She picks my elder, if you must know.",
};
