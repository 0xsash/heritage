// Het Oude Volk: de verborgen zesde partij. Gewone mensen (een vroedvrouw,
// een rietsnijder, een schaapherder en zijn kleinzoon) die nog doen wat hun
// grootouders deden, en die zich de eik van Scherpenheuvel herinneren. Ze
// willen als enigen niet dat de klokken weer luiden. Wat waar is (de eik,
// het kappen ervan, de kerk die er kwam, de heksenvervolging), staat als
// geschiedenis; het Oude Volk zelf en alles wat het weet, is verzonnen, en
// de Kroniek zegt dat.
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
    id: 'heylwich', name: 'Heylwich Coninckx', role: 'vroedvrouw', at: [470, -205], facing: 2.4, tint: '#4a5048',
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
    id: 'gooris', name: 'Gooris Verbist', role: 'rietsnijder bij Webbekom', at: [1395, 1190], facing: -2.2, tint: '#4e5a34',
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
    id: 'aert', name: 'Aert Swinnen', role: 'schaapherder', at: [470, -820], facing: 0.4, tint: '#5a4e3a',
    look: { body: 'man_old', wear: { hair_thin: 'h_white', beard_full: 'h_white', hat_wide: 'brown', smock: 'grey', belt: null, mantle: 'brown', breeches: 'brown', stockings: 'grey', clogs: null }, prop: 'staff' },
    talk: [
      { if: { quest: 'ov_eik', state: 'active', stage: 'aert' }, start: 'aert_eik' },
      { if: { quest: 'ov_leuven', state: 'active', stage: 'aert' }, start: 'aert_q5' },
      { if: { not: { flag: 'ov_found' } }, start: 'aert_busy' },
      { start: 'aert_idle' },
    ],
  },
  {
    id: 'peeterken', name: 'Peeterken Swinnen', role: 'jongen', at: [548, -588], facing: 1.2, tint: '#6b5a3a',
    look: { body: 'boy', wear: { hair_child: 'h_blond', smock: 'linen', belt: null, breeches: 'russet', stockings: 'grey', clogs: null } },
    talk: [
      { if: { not: { flag: 'ov_sign_stenen' } }, start: 'peeterken_stones' },
      { start: 'peeterken_after' },
    ],
  },
];

/** The role under their name before and after you know who they are. */
export const OV_ROLES: Record<string, string> = { heylwich: 'vroedvrouw', gooris: 'rietsnijder bij Webbekom', aert: 'schaapherder', peeterken: 'jongen' };

// ===================================================================== the signs
/**
 * Where the signs are: the street spot (a shrine on a post, a well) nearest each anchor gets one. The town
 * already has its wells and shrines everywhere; these few now mean something.
 */
export const OV_SIGNS: { id: string; kind: 'shrine' | 'well'; near: [number, number]; text: string }[] = [
  { id: 'knoop1', kind: 'shrine', near: [700, 70], text: 'Aan de paal van het kapelletje hangt een knoop riet, drie keer omgeslagen en strak getrokken. Dat heeft geen kind gedaan.' },
  { id: 'knoop2', kind: 'shrine', near: [560, -600], text: 'Weer een knoop riet aan de paal. Het riet is nog groen, dus iemand is hier vanmorgen geweest.' },
  { id: 'knoop3', kind: 'shrine', near: [-280, -40], text: 'Een knoop riet aan de paal, en eronder liggen steentjes op een rij, in groepjes van vijf. Iemand telt hier iets.' },
  { id: 'melk1', kind: 'well', near: [430, -230], text: 'Op de rand van de put staat een kommetje melk, met een korst brood erin. Voor de katten staat het te hoog.' },
  { id: 'melk2', kind: 'well', near: [-100, 330], text: 'Naast de put ligt een kluitje boter op een blad, met een knoop riet erover. Hier bedankt iemand het water.' },
];
/** A sign you have already counted, seen again. */
export const OV_SIGN_AGAIN = ['Het riet hangt er nog. Niemand heeft het weggesneden.', 'Iemand heeft de melk ververst. Het kommetje is weer vol.'];
/** Said when a sign is counted (n of 3). */
export const OV_SIGN_COUNT = ['Zo knoopte grootmoeder het riet aan de Demer.', 'Dat is het tweede teken. Iemand in Diest doet nog wat grootmoeder deed.', 'Dat is het derde teken. Bij de Onze-Lieve-Vrouwekerk staat een oude vrouw die je nakijkt.'];

/** The knots Gooris lays in the reed: the safe path through the Broek (quest ov_broek). */
export const OV_PATH: [number, number][] = [[1230, 580], [1235, 930], [1470, 1080]];

// ===================================================================== items
export const OV_ITEMS: ItemDef[] = [
  { id: 'ov_eikel', name: 'Eikel van de oude eik', text: 'Zwart van ouderdom, in een lapje gewikkeld. Aert raapte hem op de dag dat de eik viel.', quest: true },
  { id: 'ov_riet', name: 'Geknoopt riet', text: 'Drie keer omgeslagen en nat van de Demer. Gooris heeft het geknoopt.', quest: true },
  { id: 'ov_knoop', name: 'Knoop van Gooris', text: 'Een knoop riet voor Jaspar Goossens, lijndraaier aan de Dijle in Leuven.', quest: true },
];

// ===================================================================== the hidden questline
export const OV_QUESTS: QuestDef[] = [
  {
    id: 'ov_tekens', title: 'Knopen in het riet', kind: 'side', town: 'Diest', level: 1,
    summary: 'Iemand in Diest laat tekens achter die je grootmoeder ook maakte.',
    reward: { xp: 120 },
    stages: [
      {
        id: 'signs',
        journal: 'Ik vond vandaag een teken dat grootmoeder ook maakte. Op Sint-Jansavond knoopte ze riet aan de Demer en zette ze melk bij het water. Ik heb haar nooit gevraagd waarom.',
        objectives: [{ id: 'signs', kind: 'flag', flag: 'ov_signs', text: 'Zoek nog twee van zulke tekens in de stad' }],
        onDone: [{ stage: ['ov_tekens', 'vrouw'] }],
      },
      {
        id: 'vrouw',
        journal: 'Riet aan een paal, melk op een put, een jongen die steentjes telt. Bij de Onze-Lieve-Vrouwekerk staat een oude vrouw die me al een tijd nakijkt.',
        objectives: [{ id: 'heyl', kind: 'talk', text: 'Spreek met de oude vrouw bij de Onze-Lieve-Vrouwekerk', npc: 'heylwich' }],
      },
    ],
  },
  {
    id: 'ov_eik', title: 'Wat de eik onthoudt', kind: 'side', town: 'Scherpenheuvel', giver: 'heylwich', level: 3,
    summary: 'Heylwich wil dat je hoort waar het Oude Volk vandaan komt.',
    reward: { xp: 300, florins: 10 },
    stages: [
      {
        id: 'aert',
        journal: 'Heylwich stuurt me naar Aert Swinnen, een schaapherder op de heide richting Schaffen. Hij was een jongen toen ze de eik van Scherpenheuvel omhakten. Peeterken, de jongen met de steentjes, is zijn kleinzoon.',
        objectives: [{ id: 'aert', kind: 'talk', text: 'Zoek Aert de schaapherder op de heide richting Schaffen', npc: 'aert' }],
      },
      {
        id: 'eik',
        journal: 'Aert gaf me een eikel van de oude eik, zwart van ouderdom. Ik moet hem op de heuvel van Scherpenheuvel leggen, bij de kerk die ze daar gebouwd hebben.',
        objectives: [{ id: 'eik', kind: 'reach', text: 'Leg de eikel bij de kerk van Scherpenheuvel', at: [-5062, 518], r: 42, onFoot: true }],
        onDone: [{ take: 'ov_eikel' }, { toast: 'Een pater zag je knielen bij de muur van de kerk' }, { stage: ['ov_eik', 'terug'] }],
      },
      {
        id: 'terug',
        journal: 'Ik heb de eikel tussen de stenen aan de voet van de muur geduwd. Een pater zag me knielen en zei niets. Dat is erger dan iets zeggen.',
        objectives: [{ id: 'heyl', kind: 'talk', text: 'Vertel het aan Heylwich in Diest', npc: 'heylwich' }],
      },
    ],
  },
  {
    id: 'ov_broek', title: 'Paden door het Broek', kind: 'side', town: 'Diest', giver: 'heylwich', level: 4,
    summary: 'Gooris de rietsnijder kent de paden waar de honden niet komen.',
    reward: { xp: 420, florins: 15 },
    stages: [
      {
        id: 'gooris',
        journal: 'Heylwich zegt dat Gooris Verbist, een rietsnijder bij Webbekom, de paden door het Broek kent waar de honden niet komen. Hij werkt aan de rand van het moeras.',
        objectives: [{ id: 'gooris', kind: 'talk', text: 'Zoek Gooris de rietsnijder bij Webbekom', npc: 'gooris' }],
      },
      {
        id: 'paden',
        journal: 'Waar Gooris een knoop in het riet legt, is de grond vast en ruiken de honden je niet. Ik moet zijn knopen volgen, te voet, van de ene naar de andere.',
        objectives: [
          { id: 'k1', kind: 'reach', text: 'Volg de eerste knoop in het riet, te voet', at: OV_PATH[0], r: 12, onFoot: true },
          { id: 'k2', kind: 'reach', text: 'Volg de tweede knoop in het riet', at: OV_PATH[1], r: 12, onFoot: true },
          { id: 'k3', kind: 'reach', text: 'Volg de derde knoop, aan het open water', at: OV_PATH[2], r: 12, onFoot: true },
        ],
        onDone: [{ stage: ['ov_broek', 'spaar'] }],
      },
      {
        id: 'spaar',
        journal: 'De knopen hielden: de grond bleef vast en geen hond keek op. Gooris zegt dat het Oude Volk de honden niet doodslaat als het niet hoeft. Hij wil zien of ik dat kan.',
        objectives: [{ id: 'spaar', kind: 'flag', flag: 'ov_q3', text: 'Sla twee broekhonden zwak en laat ze gaan met E', hint: [1110, 520] }],
        onDone: [{ stage: ['ov_broek', 'terug'] }],
      },
      {
        id: 'terug',
        journal: 'Twee honden liepen het riet in, met de staart tussen de poten. Ze leven nog, en ze weten wie ik ben.',
        objectives: [{ id: 'gooris', kind: 'talk', text: 'Vertel het aan Gooris bij Webbekom', npc: 'gooris' }],
      },
    ],
  },
  {
    id: 'ov_dof', title: 'Dof brons', kind: 'side', town: 'Diest', giver: 'heylwich', level: 5,
    summary: 'Heylwich vraagt je één ding: het kleinste klokje van Sint-Sulpitius binden.',
    reward: { xp: 500 },
    stages: [
      {
        id: 'kies',
        journal: 'Heylwich vraagt me een knoop riet om de klepel van het kleinste klokje van Sint-Sulpitius te binden. Dan slapen de Kludde en {dragon} maar half. Pieter zou het me nooit vergeven.',
        objectives: [{ id: 'heyl', kind: 'talk', text: 'Geef Heylwich je antwoord', npc: 'heylwich' }],
      },
      {
        id: 'toren',
        journal: 'Ik heb ja gezegd. Gooris heeft het riet al geknoopt, nat van de Demer. Het kleinste klokje hangt bovenaan in de toren, waar alleen {dragon} kan komen.',
        objectives: [{ id: 'toren', kind: 'reach', text: 'Vlieg naar het kleinste klokje in de toren van Sint-Sulpitius', at: [-26, 30], r: 30, minY: 28 }],
        onDone: [{ take: 'ov_riet' }, { set: 'ov_choice', to: 'volk' }, { set: 'rekening_diest_klokje', to: 'dof' }, { stage: ['ov_dof', 'gedaan'] }],
      },
      {
        id: 'gedaan',
        journal: 'Het riet zit om de klepel, drie keer omgeslagen. Bij de volgende slag klonk het kleine klokje als een pot met een deksel erop, en {dragon} hield zijn ogen open.',
        objectives: [{ id: 'heyl', kind: 'talk', text: 'Vertel het aan Heylwich', npc: 'heylwich' }],
      },
      {
        id: 'nee',
        journal: 'Ik heb nee gezegd. Heylwich keek me aan zoals grootmoeder deed als ik te laat thuiskwam. Pieter moet weten dat iemand aan zijn klokken wil. Hij hoeft niet te weten wie.',
        objectives: [{ id: 'pieter', kind: 'talk', text: 'Waarschuw Pieter de koster', npc: 'pieter' }],
      },
    ],
  },
  {
    id: 'ov_leuven', title: 'Een knoop voor onderweg', kind: 'side', town: 'Diest', giver: 'gooris', level: 6,
    summary: 'Gooris en Aert geven je iets mee voor onderweg: naar Leuven, en verder naar het land van Loon.',
    reward: { xp: 300 },
    stages: [
      {
        id: 'aert',
        journal: 'Gooris gaf me een knoop riet voor Jaspar Goossens, een lijndraaier aan de Dijle in Leuven. Aert wil me ook nog iets meegeven.',
        objectives: [{ id: 'aert', kind: 'talk', text: 'Ga langs bij Aert op de heide', npc: 'aert' }],
      },
      {
        id: 'poort',
        journal: 'Een knoop van Gooris voor een man in Leuven, en van Aert een raad: ga ook naar het oosten, naar het land van Loon, waar de torens al een jaar zwijgen. Eerst de weg naar Leuven, aan de zuidwestkant van de stad. (Leuven en Loon komen in de volgende uitbreidingen van de wereld.)',
        objectives: [{ id: 'poort', kind: 'reach', text: 'Ga de stad uit langs de weg naar Leuven', at: [-150, 420], r: 30 }],
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
  heyl_busy: { who: 'heylwich', text: 'Niet nu, kind. Achter de vismarkt ligt een vrouw in de kraam, en dat kind wacht op niemand.' },
  heyl_meet: {
    who: 'heylwich', text: '{name}. Ja, ik weet hoe je heet. Ik weet ook hoe je grootmoeder heette, en waar ze haar knopen legde.',
    choices: [
      { text: 'Wie ben jij?', next: 'heyl_meet_who' },
      { text: 'Wat weet jij van mijn grootmoeder?', next: 'heyl_meet_gm' },
    ],
  },
  heyl_meet_who: { who: 'heylwich', text: 'Heylwich Coninckx, vroedvrouw. Half Diest is door mijn handen op de wereld gekomen, en de andere helft zou willen dat ik het vergeten was.', next: 'heyl_meet2' },
  heyl_meet_gm: { who: 'heylwich', text: 'Dat ze de Kludde bij zijn naam noemde, bij het vuur, om jullie binnen te houden. En dat ze op Sint-Jansavond melk bij het water zette. Dat deden wij allemaal.', next: 'heyl_meet2' },
  heyl_meet2: { who: 'heylwich', text: 'Je hebt de knopen gevonden, de melk en de jongen met zijn steentjes, dus je mag het weten. Er zijn nog mensen die doen wat hun grootouders deden.', next: 'heyl_meet3' },
  heyl_meet3: { who: 'heylwich', text: 'Een naam hebben we niet. Wie over ons fluistert, zegt "het oude volk". De pastoor zegt "bijgelovig", en de deken van het kapittel heeft een lelijker woord.', next: 'heyl_meet4' },
  heyl_meet4: {
    who: 'heylwich', text: 'En we willen iets wat niemand anders in Diest wil. We willen dat de klokken blijven zwijgen.',
    choices: [
      { text: 'Waarom? Zonder klokken weet de stad niet hoe laat het is.', next: 'heyl_meet_time' },
      { text: 'Het water heeft mijn zusje genomen. De klokken houden het tegen.', next: 'heyl_meet_water' },
    ],
  },
  heyl_meet_time: { who: 'heylwich', text: 'De stad wist ook hoe laat het was voor er klokken hingen: aan de zon, aan de koeien, aan het water. De klokken tellen geen tijd, {name}. Ze houden dingen in slaap.', next: 'heyl_meet5' },
  heyl_meet_water: { who: 'heylwich', text: 'Dat zegt de pastoor ook. Maar de klokken laten ook de wakers slapen, kind, zoals je draak er een is. En dan staat er alleen nog brons tussen ons en het water.', next: 'heyl_meet5' },
  heyl_meet5: { who: 'heylwich', text: 'Kijk naar je draak als ze luiden, dan weet je wat ik bedoel. Kom terug als je meer wilt weten. Ik vertel het niet in één keer.', effects: [{ set: 'ov_found' }, { call: 'ov:found' }, { complete: 'ov_tekens' }] },

  heyl_named: { who: 'heylwich', text: 'Ze hebben me voor de deken van het kapittel geroepen. Ik heb gezegd dat ik kruiden pluk, en dat is waar. Ga nu maar, {name}. De mensen kijken.' },

  heyl_eik: {
    who: 'heylwich', text: 'Je wilt weten waar wij vandaan komen. Ga dan naar Aert Swinnen, de schaapherder op de heide richting Schaffen. Hij heeft de eik nog gezien voor ze hem omhakten.',
    choices: [
      { text: 'Ik ga naar Aert.', effects: [{ start: 'ov_eik' }], next: 'heyl_eik_ok' },
      { text: 'Welke eik?', next: 'heyl_eik_welke' },
    ],
  },
  heyl_eik_welke: { who: 'heylwich', text: 'De eik van Scherpenheuvel. Daar staat nu een kerk met zeven zijden. Voor er een kerk was, stond er een boom, en bij die boom kwamen wij.', next: 'heyl_eik' },
  heyl_eik_ok: { who: 'heylwich', text: 'Zeg hem dat ik je stuur. Anders vertelt hij je over zijn schapen, en dat duurt tot de winter.' },
  heyl_eik_back: { who: 'heylwich', text: 'Je hebt hem gelegd. Goed. Dan weet de heuvel dat er nog iemand is.', next: 'heyl_eik_back2' },
  heyl_eik_back2: {
    who: 'heylwich', text: 'Nu iets wat je kunt gebruiken. Een beest dat je zwak geslagen hebt, hoef je niet af te maken. Laat het gaan, en het onthoudt dat. (Je kunt nu broekhonden en dwaallichten laten gaan: sla ze zwak en druk op E.)',
    effects: [{ set: 'ov_spare' }, { call: 'ov:learn:spare' }, { complete: 'ov_eik' }],
  },

  heyl_broek: {
    who: 'heylwich', text: 'Wie met ons meeloopt, moet door het Broek kunnen zonder dat de honden hem ruiken. Gooris Verbist snijdt riet bij Webbekom, en hij kent de paden.',
    choices: [
      { text: 'Ik zoek Gooris op.', effects: [{ start: 'ov_broek' }], next: 'heyl_broek_ok' },
      { text: 'Waarom zou ik de honden sparen?', next: 'heyl_broek_why' },
    ],
  },
  heyl_broek_why: { who: 'heylwich', text: 'Omdat ze hier waren voor de stad er was, en omdat ze terugkomen, of je ze nu doodslaat of niet. Wat je spaart, vergeet jou niet.', next: 'heyl_broek' },
  heyl_broek_ok: { who: 'heylwich', text: 'Hij praat niet veel. Als hij iets zegt, luister dan.' },
  heyl_wait: { who: 'heylwich', text: 'Ik ga je niet vragen de klepels in het Broek te laten liggen. Breng ze terug als je dat moet, en kom daarna nog eens langs. Dan praten we over de klokken.' },

  heyl_dof: { who: 'heylwich', text: 'De klokken luiden weer. Kijk naar {dragon} als ze slaan: zijn ogen vallen dicht, en hij vecht ertegen.', next: 'heyl_dof2' },
  heyl_dof2: { who: 'heylwich', text: 'Mijn moeder zei het me zo, en ik zeg het jou: als alle klokken van Brabant weer samen luiden, gaat alles slapen wat wakker is geworden. De Kludde. En hij.', next: 'heyl_dof3' },
  heyl_dof3: {
    who: 'heylwich', text: 'Ik vraag je één ding, en daarna nooit meer iets. Bind een knoop riet om de klepel van het kleinste klokje van Sint-Sulpitius: dan klinkt het dof, en slaapt wat wakker werd maar half.',
    choices: [
      { text: 'Ik bind het klokje.', effects: [{ start: 'ov_dof' }, { give: 'ov_riet' }, { stage: ['ov_dof', 'toren'] }], next: 'heyl_dof_ja' },
      { text: 'Nee. De klokken houden het water stil, en zo blijft het.', effects: [{ start: 'ov_dof' }, { stage: ['ov_dof', 'nee'] }], next: 'heyl_dof_nee' },
      { text: 'Wat gebeurt er als ik het niet doe?', next: 'heyl_dof_why' },
      { text: 'Laat me erover nadenken.', effects: [{ start: 'ov_dof' }], next: 'heyl_dof_later' },
    ],
  },
  heyl_dof_why: { who: 'heylwich', text: 'Dan slaapt hij, en de Kludde ook, en Diest slaapt rustig. Wie de stad dan nog bewaakt, is brons. Dat is ook iets, ik weet het.', next: 'heyl_dof3' },
  heyl_dof_ja: { who: 'heylwich', text: 'Hier, Gooris heeft het al geknoopt. De rest kan alleen {dragon}: het klokje hangt bovenaan, waar Pieter niet meer komt.' },
  heyl_dof_nee: { who: 'heylwich', text: 'Dan is het zo. Ik ga je niet vervloeken, kind, zo zijn wij niet. Maar wat hij kan als hij helemaal wakker is, leer ik je niet.' },
  heyl_dof_later: { who: 'heylwich', text: 'Denk maar na. De klokken lopen niet weg, en ik op mijn leeftijd ook niet meer.' },
  heyl_dof_back: { who: 'heylwich', text: 'Ik hoorde het bij het middaguur. Het klonk als een pot met een deksel erop. Dank je, {name}.', next: 'heyl_dof_back2' },
  heyl_dof_back2: { who: 'heylwich', text: 'Wat hij kan als hij helemaal wakker is, leer ik je wanneer het volk je goed genoeg kent. Dat duurt niet lang meer.', effects: [{ complete: 'ov_dof', outcome: 'volk' }] },

  heyl_beeld: { who: 'heylwich', text: 'Laat zien. Dat is eikenhout van de heuvel. Het hout onthoudt wat eronder slaapt, en waar het zoemt, is iets wakker.', effects: [{ set: 'ov_beeld' }] },
  heyl_zw_kludde: { who: 'heylwich', text: 'Hij wordt zwaarder als je hem draagt en kleiner als je hem noemt. Roep zijn naam als hij komt, hardop, en sla dan.', effects: [{ call: 'ov:weak:kludde' }] },

  // what she knows about the dragon, a piece at a time (one per standing tier)
  heyl_k1a: { who: 'heylwich', text: 'Wij noemen hem een waker. Voor er klokken waren, waren er wakers zoals hij, en zij hielden het water uit het land.', next: 'heyl_k1b' },
  heyl_k1b: { who: 'heylwich', text: 'Hij is geen duivel en geen beest. Hij is ouder dan elke stad langs de rivier, en hij bewaakt ze allemaal.', effects: [{ call: 'ov:know:1' }] },
  heyl_k2a: { who: 'heylwich', text: 'Het geluid van de klokken laat alles slapen wat ouder is dan de stad. De wakers ook, en hem ook.', next: 'heyl_k2b' },
  heyl_k2b: { who: 'heylwich', text: 'In de nacht van je zusje zwegen de klokken van Diest na zeven slagen. Toen het stil bleef, werd hij wakker.', next: 'heyl_k2c' },
  heyl_k2c: { who: 'heylwich', text: 'De Kludde werd ook wakker. Hij stal de klepels, zodat de klokken zouden blijven zwijgen.', next: 'heyl_k2d' },
  heyl_k2d: { who: 'heylwich', text: 'In zijn nest staan kerven in een paal, in groepjes van vijf. Wat ze betekenen, weet ik niet. Peeterken legt zijn steentjes net zo.', effects: [{ call: 'ov:know:2' }] },
  heyl_k3a: { who: 'heylwich', text: 'Hij kwam naar de plek waar het water had toegeslagen, naar wie er net iemand aan verloren had. Zo doen de wakers.', next: 'heyl_k3b' },
  heyl_k3b: { who: 'heylwich', text: 'Jij stond daar en riep de naam van je zusje. En je grootmoeder zette elk jaar melk bij het water. Zo\'n huis vergeet hij niet.', effects: [{ call: 'ov:know:3' }] },
  heyl_k4a: { who: 'heylwich', text: 'Ten oosten van hier ligt het land van Loon. Het hoort bij de prins-bisschop van Luik, niet bij Brabant.', next: 'heyl_k4b' },
  heyl_k4b: { who: 'heylwich', text: 'Daar hebben ze vorig jaar de klokken uit de torens gehaald. Er zijn daar meer wakers wakker dan hier, en wij zijn er met meer. Ga er eens kijken: hij zal er sterker zijn dan hier.', effects: [{ call: 'ov:know:4' }] },

  // ---------------------------------------------------------------- Gooris
  goor_busy: { who: 'gooris', text: 'Riet voor de daken van Webbekom. Blijf uit de weg, want een bundel weegt meer dan je denkt.' },
  goor_q3: { who: 'gooris', text: 'Heylwich zei al dat je zou komen. Je loopt te luid, maar dat leer je wel.', next: 'goor_q3b' },
  goor_q3b: { who: 'gooris', text: 'Waar ik een knoop in het riet leg, is de grond vast en ruiken de honden je niet. Volg mijn knopen, te voet, en blijf van het open water weg.', effects: [{ done: ['ov_broek', 'gooris'] }, { stage: ['ov_broek', 'paden'] }] },
  goor_q3_busy: { who: 'gooris', text: 'Volg mijn knopen, te voet. En sla de honden niet dood als het niet hoeft: ze waren hier eerder dan wij.' },
  goor_q3_back: { who: 'gooris', text: 'Twee honden die vannacht nog leven en die jou nog kennen. Dat is meer waard dan een vel aan de muur.', next: 'goor_q3_back2' },
  goor_q3_back2: {
    who: 'gooris', text: 'Onthoud dit. Een broekhond bijt in je rug, dus draai je naar hem toe en sla als hij springt. Een dwaallicht volgt je adem: hou die in en sla door het licht heen.',
    effects: [{ call: 'ov:broek' }, { complete: 'ov_broek' }],
  },
  goor_q5: {
    who: 'gooris', text: 'Dat beeldje van jou wijst naar Leuven, hoor ik. Daar luiden meer klokken dan in heel het Hageland. Neem deze knoop mee.',
    choices: [
      { text: 'Voor wie is hij?', next: 'goor_q5_who' },
      { text: 'Ik neem hem mee.', effects: [{ start: 'ov_leuven' }, { give: 'ov_knoop' }], next: 'goor_q5_ok' },
    ],
  },
  goor_q5_who: { who: 'gooris', text: 'Voor Jaspar Goossens, een lijndraaier aan de Dijle. Hij is een van ons, in een stad met te veel klokken. Hij draait touw en telt de slagen.', next: 'goor_q5' },
  goor_q5_ok: { who: 'gooris', text: 'Toon hem de knoop, en hij weet wie je bent. Maar ga eerst langs bij Aert. Die wil je ook iets meegeven.' },
  goor_idle: {
    who: 'gooris', text: 'Het riet staat hoog dit jaar. Dat is goed voor de daken, en slecht voor wie verdwaalt.',
    choices: [
      { text: 'Zuster Margriet zegt: pluk het wondkruid bij daglicht.', if: { any: [{ quest: 'side_herbs', state: 'active' }, { quest: 'side_herbs', state: 'done' }] }, next: 'goor_herbs' },
      { text: 'Tot ziens, Gooris.' },
    ],
  },
  goor_herbs: { who: 'gooris', text: 'Daar heeft ze gelijk in. Bij nacht is het wondkruid van iemand anders, en die wil er niet voor betalen.' },

  // ---------------------------------------------------------------- Aert
  aert_busy: { who: 'aert', text: 'De schapen kennen de heide beter dan ik. Ik volg ze maar, en \'s avonds tel ik ze.' },
  aert_eik: { who: 'aert', text: 'Heylwich stuurt je? Dan vertel ik het, één keer.', next: 'aert_eik2' },
  aert_eik2: { who: 'aert', text: 'Ik was twaalf. We dreven de schapen naar de heuvel, want daar groeide het beste gras. Onder de eik lagen altijd linten, broodjes en kinderhemdjes.', next: 'aert_eik3' },
  aert_eik3: { who: 'aert', text: 'Er kwamen al mensen voor er een Mariabeeldje in de stam hing. Toen kwamen er mannen met bijlen, en mijn moeder heeft die nacht gewenen. Ik wist niet waarom.', next: 'aert_eik4' },
  aert_eik4: {
    who: 'aert', text: 'Hier, een eikel van die boom. Ik raapte hem op toen hij viel. Leg hem op de heuvel, bij de kerk die ze er gebouwd hebben.',
    effects: [{ give: 'ov_eikel' }, { done: ['ov_eik', 'aert'] }, { stage: ['ov_eik', 'eik'] }],
  },
  aert_q5: { who: 'aert', text: 'Naar Leuven? Daar ben ik één keer geweest, met de wol. Te veel klokken: mijn schapen bleven bij elke slag staan.', next: 'aert_q5b' },
  aert_q5b: { who: 'aert', text: 'Zeg tegen Jaspar Goossens dat Aert Swinnen nog leeft. En ga daarna ook eens naar het oosten, naar het land van Loon. Daar zwijgen de torens al een jaar, en daar wonen er meer zoals wij.', effects: [{ done: ['ov_leuven', 'aert'] }, { stage: ['ov_leuven', 'poort'] }] },
  aert_idle: {
    who: 'aert', text: 'Peeterken legt nog altijd zijn steentjes. Vijf, dan een gat, en dan weer vijf. Ik tel mee.',
    choices: [
      { text: 'Is Peeterken je kleinzoon?', next: 'aert_peeterken' },
      { text: 'Tot ziens, Aert.' },
    ],
  },
  aert_peeterken: { who: 'aert', text: 'Ja. Hij ging die nacht het water in en kwam er drie dagen later uit, warm als brood uit de oven. Sindsdien zegt hij niets, maar hij telt.' },

  // ---------------------------------------------------------------- Peeterken
  peeterken_stones: {
    who: 'peeterken', text: '*Hij zegt niets. Hij legt steentjes op een rij, in groepjes van vijf, en hij kijkt niet op.*', effects: [{ call: 'ov:sign:stenen' }],
    choices: [
      { text: 'Wat tel je?', next: 'peeterken_2' },
      { text: 'Ik laat je met rust.' },
    ],
  },
  peeterken_2: { who: 'peeterken', text: '*Hij legt nog een steen, en nog een. Dan wijst hij naar de Demer, en dan naar jou.*' },
  peeterken_after: { who: 'peeterken', text: '*Vijf steentjes, een gat, en weer vijf. Als je naast hem gaat zitten, schuift hij een steen naar je toe.*' },

  // ---------------------------------------------------------------- what De Kerk says (Margriet, whose id is aleydis; Pieter; the overste, id provost)
  aleydis_ov: { who: 'aleydis', text: 'Je bent bij Heylwich Coninckx geweest. Dat ruik ik: vlier en Demerwater.', next: 'aleydis_ov2' },
  aleydis_ov2: { who: 'aleydis', text: 'Ze heeft meer kinderen gehaald dan ik er verzorgd heb, en ik bid voor haar. Maar het water dat zij bedankt, nam vorig jaar drie kinderen langs de Demer.', next: 'aleydis_ov3' },
  aleydis_ov3: {
    who: 'aleydis', text: 'De klokken houden dat water stil. Voor jou is dat misschien bijgeloof. Voor de moeders van die kinderen is het genade.',
    choices: [
      { text: 'Ze zegt dat de klokken ook mijn draak in slaap brengen.', next: 'aleydis_ov4' },
      { text: 'Ik zal het onthouden.', next: 'aleydis_ov5' },
    ],
  },
  aleydis_ov4: { who: 'aleydis', text: 'Dat weet ik. Ik heb hem zien liggen bij de eerste slag. Ik zeg niet dat het niets kost, {name}. Ik zeg dat ik weet wie het anders betaalt.', next: 'aleydis_ov5' },
  aleydis_ov5: { who: 'aleydis', text: 'En zeg haar dat ze voorzichtig moet zijn. Er zijn vrouwen verbrand voor minder dan een kom melk bij een put.', effects: [{ set: 'ov_aleydis' }, { call: 'ov:page:heksen' }] },

  pieter_ov: {
    who: 'pieter', text: 'Je kijkt naar mijn klokken alsof ze iets misdaan hebben. Wat is er?',
    choices: [
      { text: 'Iemand wil riet om de klepel van het kleine klokje binden. Waak erover.', next: 'pieter_ov_warn' },
      { text: 'Heylwich Coninckx, de vroedvrouw, wil je klokken binden.', next: 'pieter_ov_named' },
      { text: 'Laat maar. Het is niets.', next: 'pieter_ov_niets' },
    ],
  },
  pieter_ov_warn: { who: 'pieter', text: 'Riet, om mijn klepel. Ik zet er een slot op, en ik vraag niet wie het is. Dat wil ik niet weten.', effects: [{ set: 'ov_choice', to: 'kerk' }, { set: 'rekening_diest_klokje', to: 'helder' }, { complete: 'ov_dof', outcome: 'kerk' }] },
  pieter_ov_named: { who: 'pieter', text: 'De vroedvrouw? Die heeft mijn kinderen gehaald. Ik moet het aan de deken van het kapittel zeggen, {name}, dat weet je. God vergeve het ons allebei.', effects: [{ set: 'ov_choice', to: 'kerk' }, { set: 'rekening_diest_klokje', to: 'helder' }, { set: 'ov_named' }, { complete: 'ov_dof', outcome: 'genoemd' }] },
  pieter_ov_niets: { who: 'pieter', text: 'Niets is ook iets, zei mijn grootmoeder. Ze zei veel.' },
  pieter_dof: { who: 'pieter', text: 'Het kleine klokje klinkt dof, sinds een paar dagen. Ik ben gaan kijken: er zat riet om de klepel, nat riet, drie keer omgeslagen.', next: 'pieter_dof2' },
  pieter_dof2: { who: 'pieter', text: 'Ik heb het laten zitten. Vraag me niet waarom, want ik weet het zelf niet. Mijn grootmoeder knoopte ook zo.', effects: [{ set: 'ov_pieter_dof' }] },
  pieter_b_ov: { who: 'pieter', text: 'Heylwich Coninckx? Die zegt veel, en de helft is waar. Ik luid de klokken, {name}. Wat ze in slaap houden, daar zorgt God voor.', next: 'pieter_b4' },

  provost_ov: { who: 'provost', text: 'U kijkt naar de voet van de muur, terwijl iedereen naar de koepel kijkt. Er komen nog altijd mensen die hier iets onder willen leggen: een lint, een eikel.', next: 'provost_ov2' },
  provost_ov2: { who: 'provost', text: 'Ik laat de koster het wegvegen. De eik die hier stond, is omgehakt, en daar had de bisschop zijn redenen voor.', effects: [{ set: 'ov_provost' }] },
};

// ===================================================================== what Heylwich teaches
/** Her greeting, by your standing with the Oude Volk (Vreemde .. Vertrouweling), before what she says next. */
export const OV_GREET: string[][] = [
  ['Wat wil je? Ik ken je niet.', 'Je komt hier niet zomaar binnenlopen, vreemdeling.', 'Hm. Zeg wat je komt doen.'],
  ['{name}. Kom maar, de deur staat open.', 'Ah, die van het riet. Kom binnen.', 'Dag, {name}. Je hebt de knopen gezien, hoor ik.'],
  ['{name}. Je loopt al stiller dan vroeger.', 'Kom, {name}. Het water is rustig vandaag.', 'Dag, {name}. De honden kennen je geur nu.'],
  ['{name}. Je grootmoeder zou content zijn.', 'Voor jou staat er altijd melk bij de put, {name}.', '{name}, kind van de Demer. Zeg het maar.'],
  ['{name}. Wat wij weten, weet jij nu ook.', '{name}. De Waker kent je, en wij kennen je ook.', 'Ga zitten, {name}. Je bent een van ons.'],
];
/** After she has been told no (and not named). */
export const OV_GREET_COOL = ['{name}. Je hebt gekozen, en ik ook. Wat kom je doen?', 'Dag, {name}. De klokken luiden, hoor je het? Wat wil je?'];

export const OV_TEACH: Record<string, string> = {
  nevel: 'Laat hem eens laag over het Broek vliegen, bij ochtendgloren. Hij kan nevel ademen in plaats van vuur, en wie in de nevel staat, ziet niets meer. (Neveladem: rechtermuis in de vlucht.)',
  slag: 'Als hij laag over de grond scheert en zijn vleugels hard neerslaat, valt alles om wat eronder staat. Laat hem dat doen, hij heeft het lang niet gedaan. (Vleugelslag: R in de vlucht, laag boven de grond.)',
  roep: 'Je hoeft niet op hem te wachten als je in nood zit. Roep hem zoals je je zusje riep, en hij komt, met vuur. (Drakenroep: G te voet, in een gevecht.)',
  refused: 'Wat hij kan als hij helemaal wakker is, leer ik je niet. Jij hebt gekozen dat hij slaapt, en dat respecteer ik.',
  later: 'Ik leer je wat je kunt dragen. Als het volk je beter kent, leer ik je meer.',
};

// ===================================================================== her basket
export const OV_GOODS: Good[] = [
  { id: 'ov_vlier', name: 'Vlierdrank', text: 'Een halve minuut lang herstel in een gevecht. Gaat in je tas.', price: 2, use: { regen: 0.018, secs: 30 } },
  { id: 'ov_zalf', name: 'Smeerwortelzalf', text: 'Zalf zonder zegen, wel met smeerwortel. Met Q.', price: 5, use: { salve: 1 } },
  { id: 'ov_talisman_knoop', name: 'Knoop van riet', text: 'Een talisman. Wie hem draagt, vindt zijn weg terug, zegt Heylwich.', price: 12, tier: 1, use: { talisman: 'ov_knoop' } },
  { id: 'ov_talisman_eikel', name: 'Eikel in een lapje', text: 'Een talisman van de heuvel. Voor wie het volk goed kent.', price: 30, tier: 2, use: { talisman: 'ov_eikel' } },
  { id: 'ov_talisman_stenen', name: 'Snoer van Demerstenen', text: 'Vijf stenen met een gat dat het water er zelf in sleet. Voor wie het volk vertrouwt.', price: 60, tier: 3, use: { talisman: 'ov_stenen' } },
];
export const OV_TALISMANS: Record<string, { name: string; rarity: 0 | 1 | 2; mods: Record<string, number>; text: string }> = {
  ov_knoop: { name: 'Knoop van riet', rarity: 0, mods: { list: 2, hp: 8 }, text: 'Drie keer omgeslagen en strak getrokken. Hij ruikt naar de Demer.' },
  ov_eikel: { name: 'Eikel in een lapje', rarity: 1, mods: { klank: 3, taaiheid: 2, hp: 14 }, text: 'Van een eik die er niet meer staat. Hij weegt meer dan een eikel hoort te wegen.' },
  ov_stenen: { name: 'Snoer van Demerstenen', rarity: 2, mods: { taaiheid: 3, kracht: 2, list: 2, hp: 22 }, text: 'Vijf stenen uit de Demer, elk met een gat dat het water er zelf in sleet.' },
  ov_goossens: { name: 'Knoop voor Jaspar Goossens', rarity: 1, mods: { list: 3, hp: 12 }, text: 'Een knoop van Gooris, om te tonen aan een lijndraaier in Leuven. Tot dan draag je hem zelf.' },
};

// ===================================================================== the Kroniek
// Every page here is secret: it is not listed or counted until you have found it.
export const OV_PAGES: Entry[] = [
  { id: 'tijd:oudevolk', cat: 'tijd', truth: 'verzonnen', secret: true, title: 'Het Oude Volk', hint: '',
    text: 'Het Oude Volk hebben wij verzonnen: gewone mensen die doen wat hun grootouders deden, die de eik van Scherpenheuvel herinneren en de oude wakers terug willen. Echt is dat zulke gewoonten in 1650 nog leefden, zoals pap voor de alvermannekes. En echt is dat de Kerk ze bijgeloof noemde en wie ze volgde verdacht maakte.' },
  { id: 'tijd:eik', cat: 'tijd', truth: 'geschiedenis', secret: true, title: 'De eik van Scherpenheuvel', hint: '',
    text: 'Op de heuvel stond een eik met een Mariabeeldje erin. Er kwamen zieken bidden en er werden genezingen gemeld. Kort na 1600 werd de eik geveld op bevel van de bisschop, vermoedelijk om het bijgeloof eromheen te smoren, en van zijn hout sneed men beeldjes. Op de heuvel kwam een kerk, in 1627 ingewijd.' },
  { id: 'tijd:heksen', cat: 'tijd', truth: 'geschiedenis', secret: true, title: 'Heksen', hint: '',
    text: 'In de Nederlanden zijn mensen als heks veroordeeld en verbrand, de meesten vrouwen, het vaakst rond 1600, toen wie nu oud is nog jong was. Een vroedvrouw, een kruidenvrouw of een weduwe alleen werd het eerst verdacht. Een buur met een zieke koe was genoeg om te beginnen.' },
  { id: 'tijd:ontzien', cat: 'tijd', truth: 'verzonnen', secret: true, title: 'Laten gaan', hint: '',
    text: 'Sla een broekhond of een dwaallicht zwak en laat het dan gaan met E. Het telt als verdreven: je krijgt minder buit en meer aanzien bij het Oude Volk. Wat je spaart, onthoudt jou, zegt Heylwich. Een volksgebruik is het niet, het is van ons.' },
  { id: 'tijd:paden', cat: 'tijd', truth: 'verzonnen', secret: true, title: 'De paden van Gooris', hint: '',
    text: 'Waar Gooris Verbist een knoop in het riet legt, is de grond vast. Wie zijn paden kent, loopt door het Broek zonder dat de honden hem ruiken: ze merken je pas op als je vlakbij bent. Riet snijden voor de daken was gewoon werk in natte streken. Deze paden en hun knopen hebben wij verzonnen.' },
  { id: 'mens:heylwich', cat: 'mens', truth: 'verzonnen', secret: true, title: 'Heylwich Coninckx', hint: '',
    text: 'Vroedvrouw in Diest. Ze heeft meer kinderen op de wereld geholpen dan de pastoor er gedoopt heeft, zegt ze, en hij spreekt het niet tegen. Ze woont bij de Onze-Lieve-Vrouwekerk, tussen de tuinen, en ze kent ieders naam.' },
  { id: 'mens:gooris', cat: 'mens', truth: 'verzonnen', secret: true, title: 'Gooris Verbist', hint: '',
    text: 'Rietsnijder bij Webbekom. Hij snijdt riet voor de daken en kent het Broek zoals een ander zijn eigen keuken. Hij praat weinig, en hij loopt nog stiller dan hij praat.' },
  { id: 'mens:aert', cat: 'mens', truth: 'verzonnen', secret: true, title: 'Aert Swinnen', hint: '',
    text: 'Schaapherder op de heide richting Schaffen. Hij was een jongen van twaalf toen de eik van Scherpenheuvel viel, en hij telt zijn schapen met knopen in een touw.' },
  { id: 'mens:peeterken', cat: 'mens', truth: 'verzonnen', secret: true, title: 'Peeterken Swinnen', hint: '',
    text: 'Kleinzoon van Aert Swinnen. In de nacht van de zeven slagen ging hij het water in, en drie dagen later kwam hij eruit, kletsnat en warm. Sindsdien spreekt hij niet. Hij legt steentjes op een rij, in groepjes van vijf.' },
  { id: 'wezen:waker1', cat: 'wezen', truth: 'verzonnen', secret: true, title: 'De wakers', hint: '',
    text: 'Zo noemt het Oude Volk je draak en zijn soort. Voor er klokken waren, zegt Heylwich, hielden de wakers het water uit het land. Hij is geen duivel en geen beest, en hij is ouder dan elke stad aan de Demer. Wij hebben hem verzonnen, met alles wat het Oude Volk over hem weet.' },
  { id: 'wezen:waker2', cat: 'wezen', truth: 'verzonnen', secret: true, title: 'Waarom hij wakker werd', hint: '',
    text: 'Het geluid van de klokken laat slapen wat ouder is dan de stad, de wakers ook. In de nacht van Neelke zwegen de klokken van Diest na zeven slagen, en toen het stil bleef, werd hij wakker. De Kludde ook: hij stal de klepels, zodat ze zouden blijven zwijgen. Wat de kerven in zijn nest betekenen, weet Heylwich niet.' },
  { id: 'wezen:waker3', cat: 'wezen', truth: 'verzonnen', secret: true, title: 'Waarom jij', hint: '',
    text: 'Een waker gaat naar de plek waar het water toesloeg, naar wie er net iemand aan verloor, zegt Heylwich. Jij stond aan het water en riep de naam van je zusje. En je grootmoeder zette elk jaar op Sint-Jansavond melk bij het water. Zo\'n huis vergeet hij niet.' },
  { id: 'wezen:waker4', cat: 'wezen', truth: 'verzonnen', secret: true, title: 'Het land van Loon', hint: '',
    text: 'Ten oosten van Diest ligt het land van Loon, dat bij de prins-bisschop van Luik hoort en niet bij Brabant. Dat is geschiedenis. Dat men er vorig jaar de klokken uit de torens haalde en dat er daar meer wakers wakker zijn, is van ons. Het Oude Volk is er sterker dan waar ook.' },
  { id: 'wezen:zwakte_broekhond', cat: 'wezen', truth: 'verzonnen', secret: true, title: 'Wat Gooris over de honden weet', hint: '',
    text: 'Een broekhond bijt in je rug en schrikt van wie hem aankijkt. Draai je naar hem toe en sla als hij springt, zegt Gooris. Wie dat weet, slaat harder: een derde meer schade. De broekhonden en deze raad hebben wij allebei verzonnen.' },
  { id: 'wezen:zwakte_dwaallicht', cat: 'wezen', truth: 'verzonnen', secret: true, title: 'Wat Gooris over de lichtjes weet', hint: '',
    text: 'Wie een dwaallicht zag, keerde zijn jas binnenstebuiten, zodat het hem niet herkende: dat vertelde het volk echt. Gooris zegt iets anders: hou je adem in en sla door het licht heen. Dat tweede is van ons, en het werkt: een derde meer schade.' },
  { id: 'wezen:zwakte_kludde', cat: 'wezen', truth: 'verzonnen', secret: true, title: 'Wat Heylwich over de Kludde weet', hint: '',
    text: 'Dat de Kludde je op de rug springt en bij elke stap zwaarder wordt, vertelde het volk echt. Dat hij kleiner wordt als je hem bij zijn naam noemt, is van ons, net als de raad van Heylwich: roep zijn naam en sla dan. Je slaat hem een kwart harder.' },
];

// ===================================================================== what people say
/** Street talk (life.ts gossip): before they are found, after, and what De Kerk's people say. `roles`: only these speakers. */
export const OV_REACTIVE: { t: string; if: string; roles?: string[] }[] = [
  { if: 'ov_rumour', t: 'Mijn grootmoeder zette melk bij de put. De pastoor zei dat het voor de duivel was.' },
  { if: 'ov_rumour', t: 'Aan sommige kapelletjes hangt geknoopt riet. De koster snijdt het eraf, en een week later hangt het er weer.' },
  { if: 'ov_rumour', t: 'Er zijn nog oude mensen die de Demer bedanken als ze erlangs lopen. Hardop zeggen ze dat niet.' },
  { if: 'ov_rumour', roles: ['beguine', 'friar', 'pilgrim'], t: 'Wie melk bij een put zet, zet ze voor de duivel. Zo staat het in het plakkaat van het kapittel.' },
  { if: 'ov_found', t: 'De vroedvrouw Coninckx heeft mij gehaald, en mijn kinderen ook. Wat ze verder doet, gaat me niet aan.' },
  { if: 'ov_found', t: 'Ze zeggen dat jij met de vroedvrouw praat. Pas op: over vroedvrouwen praten de mensen graag.' },
  { if: 'ov_found', roles: ['beguine', 'friar'], t: 'Heylwich Coninckx is een goede vroedvrouw en een slechte christen. We bidden voor de helft die het nodig heeft.' },
  { if: 'ov_high', t: 'Je ruikt naar riet en Demerwater, {name}. Je bent veel in het Broek, hoor ik.' },
  { if: 'kerk_high_ov', roles: ['beguine', 'friar'], t: 'De Kerk ziet je graag, {name}. Bij die vroedvrouw ziet ze je minder graag.' },
  { if: 'ov_spared', t: 'Ze zeggen dat je in het Broek een hond liet lopen. De boeren vinden dat raar. Ik ook.' },
  { if: 'ov_choice_volk', t: 'Het kleine klokje van Sint-Sulpitius klinkt dof. Mijn man zegt dat er een barst in zit. Ik zeg niets.' },
  { if: 'ov_choice_volk', roles: ['beguine', 'friar'], t: 'Iemand heeft aan de klokken van Sint-Sulpitius gezeten. De deken van het kapittel wil een naam.' },
  { if: 'ov_choice_kerk', t: 'Er hangt een nieuw slot aan de toren van Sint-Sulpitius. Pieter zegt niet waarom.' },
  { if: 'ov_named', t: 'Ze hebben de vroedvrouw Coninckx voor het kapittel geroepen. Wie gaat er nu de kinderen halen?' },
];
export const OV_TOWN_VIEW: { t: string; if: string }[] = [
  { if: 'ov_choice_volk', t: 'Het kleine klokje klinkt dof sinds kort, en de mensen slapen slechter. Of beter. Daar zijn ze het niet over eens.' },
];
export const OV_REP = ['Het Oude Volk weet niet wie je bent.', 'Een paar oude mensen kennen je naam. Ze zeggen hem niet hardop.', 'Ze zeggen dat je met de vroedvrouw praat. Niet iedereen vindt dat goed.', 'De oude mensen zetten een kom melk voor je bij de put.', 'Ze zeggen dat het Oude Volk je als een van hen ziet. Zeg dat niet in de kerk.'];
export const OV_REP_DEEDS: { t: string; if: string }[] = [
  { if: 'ov_choice_volk', t: 'Ze fluisteren dat jij aan de klokken hebt gezeten.' },
  { if: 'ov_named', t: 'Ze weten dat jij de vroedvrouw hebt aangegeven. De Kerk dankt je. De moeders niet.' },
];
/** What the crowd calls out as you pass (12 words at most). */
export const OV_BARKS: { if: string; t: string }[] = [
  { if: 'ov_rumour', t: 'Wie heeft er weer riet aan dat kapelletje gehangen?' },
  { if: 'ov_found', t: 'Je ruikt naar vlier. Ben je bij de vroedvrouw geweest?' },
  { if: 'ov_choice_volk', t: 'Hoor je dat kleine klokje? Het klinkt alsof het verkouden is.' },
  { if: 'ov_named', t: 'De vroedvrouw moest voor het kapittel komen. Arme vrouw.' },
];

/** The kapittel's notice on the board, once you have seen a sign (what De Kerk says about them). */
export const OV_NOTICE = 'BIJ ORDE VAN HET KAPITTEL. Wie bij putten, bronnen of kapelletjes melk, brood of geknoopt riet achterlaat, doet aan bijgeloof en wordt bij de deken aangegeven. Wie zo iemand kent, zwijgt niet.';

/** Wanne Coels, the herb woman on the market, knows more than she sells. */
export const OV_WANNE = {
  askBefore: 'Wie knoopt er riet aan de kapelletjes?',
  before: 'Wie zal dat zeggen? Oude mensen met oude handen. Vraag het aan de vroedvrouw bij de Onze-Lieve-Vrouwekerk. Of vraag het niet.',
  askAfter: 'Ken jij Heylwich Coninckx?',
  after: 'Iedereen kent Heylwich, maar niet iedereen zegt het hardop. Mijn vlier plukt zij, als je het wilt weten.',
};
