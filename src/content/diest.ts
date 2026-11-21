// Diest en omstreken, 1650: de mensen, de opdrachten, de vijanden en de
// gesprekken. In hedendaags Vlaams Nederlands: iedereen zegt "je", behalve de
// drossaard en de overste, die de held met "u" aanspreken.
// Historische achtergrond: de Spaanse Nederlanden na de Vrede van Munster
// (1648); Diest is een baronie van de (afwezige) prinsen van Oranje; de
// basiliek van Scherpenheuvel (ingewijd 1627) trekt pelgrims uit heel Brabant.
//
// Positions are local metres from the Grote Markt (x east, z south).

import type { Content } from '../rpg/types';

const ARRIVE = 'main_arrive';
const BELLS = 'main_bells';
const KLUDDE = 'main_kludde';
const LEUVEN = 'main_leuven';

export const diest: Content = {
  items: [
    { id: 'pilgrim_badge', name: 'Pelgrimsinsigne van Scherpenheuvel', text: 'Een tinnen insigne van Onze-Lieve-Vrouw van Scherpenheuvel, verstrikt in rivierwier.', quest: true },
    { id: 'humming_statuette', name: 'Zoemend eikenbeeldje', text: 'Het is gesneden uit het hout van de gevelde eik. Het zoemt als er klokken in de buurt zijn, en ook als er geen zijn.', quest: true },
    { id: 'forged_seal', name: 'Vals lakenzegel', text: 'Een loden zegel met het wapen van Diest. De leeuw heeft te veel tanden.', quest: true },
    { id: 'seal_mould', name: 'Zegelvorm', text: 'Met deze gietvorm maakte een weduwe de zegels van de stad na.' },
    { id: 'marsh_herb', name: 'Moeraswondkruid', text: 'Het groeit in de natte weiden langs de Demer. De begijnen koken er een drank tegen de koorts van.', quest: true },
    { id: 'salve', name: 'Begijnenzalf', text: 'Deze zalf geneest wonden. Ze ruikt naar de tuin van het Begijnhof.' },
    { id: 'sealed_letter', name: 'Verzegelde brief', text: 'Een brief voor de overste van Scherpenheuvel, gesloten met het zegel van de drossaard.', quest: true },
    { id: 'brandy', name: 'Vaatje brandewijn', text: 'Voor dit vaatje heeft niemand tol betaald, en dat was ook de bedoeling.' },
    { id: 'klepel', name: 'Klepel van Sint-Sulpitius', text: 'Een ijzeren klepel, nat en vol modder. Hij is zwaarder dan hij eruitziet.', quest: true },
    { id: 'pass', name: 'Vrijgeleide naar Leuven', text: 'Een reisbrief van de drossaard, met zegel en al.', quest: true },
  ],

  camps: [
    { id: 'schaffen', name: 'Deserteurs', at: [720, -880], r: 30, enemies: [['deserteur', 1, 3]], respawn: 180 },
    { id: 'kaggevinne', name: 'Wegrovers', at: [-2120, 560], r: 30, enemies: [['deserteur', 2, 3], ['musketier', 2, 1]], respawn: 240 },
    { id: 'broek', name: 'Broekhonden', at: [1110, 520], r: 45, enemies: [['broekhond', 2, 3]], respawn: 200 },
    { id: 'broek2', name: 'Broekhonden', at: [1330, 840], r: 45, enemies: [['broekhond', 3, 4]], respawn: 240 },
    {
      id: 'kluddenest', name: 'Het nest van de Kludde', at: [1680, 1060], r: 30, enemies: [['broekhond', 4, 3]], respawn: 0,
      elite: { type: 'kludde', level: 5, name: 'De Kludde' }, if: { any: [{ quest: KLUDDE, state: 'active', stage: 'lair' }, { quest: KLUDDE, state: 'active', stage: 'clappers' }] },
    },
    {
      id: 'galgeberg', name: 'Kamp van Lambrecht', at: [-1700, 2060], r: 35, enemies: [['deserteur', 4, 3], ['musketier', 4, 1]], respawn: 300,
      elite: { type: 'deserteur', level: 5, name: 'Lambrecht de Rode' }, if: { not: { quest: 'side_roelof', state: 'done' } },
    },
    { id: 'eikenbos', name: 'Dwaallichten', at: [-4460, 960], r: 50, enemies: [['dwaallicht', 3, 4]], respawn: 240 },
  ],

  npcs: [
    {
      id: 'pieter', name: 'Pieter Vandenbempt', role: 'koster van Sint-Sulpitius', at: [30, 55], facing: Math.PI, tint: '#3a3330',
      look: { body: 'man_old', wear: { hair_thin: 'h_grey', skullcap: 'black', habit: 'umber', rope_belt: null, shoes: null }, prop: 'lantern' },
      offers: [BELLS],
      talk: [
        { if: { any: [{ quest: ARRIVE, state: 'active' }, { quest: BELLS, state: 'none' }] }, start: 'pieter_intro' },
        { if: { quest: BELLS, state: 'active', stage: 'report' }, start: 'pieter_report' },
        { if: { quest: KLUDDE, state: 'active', stage: 'return' }, start: 'pieter_bells' },
        { if: { quest: KLUDDE, state: 'active' }, start: 'pieter_kludde' },
        { if: { quest: KLUDDE, state: 'done' }, start: 'pieter_after' },
        { start: 'pieter_busy' },
      ],
    },
    {
      id: 'marieke', name: 'Marieke Smets', role: 'marskramer', at: [55, 95], facing: 0.3, tint: '#6a3a5a',
      look: { body: 'woman', wear: { hair_bun: 'h_chestnut', coif: null, bodice: 'madder', kerchief: null, skirt: 'woad_dk', apron: 'linen', shoes: null }, prop: 'basket' }, shop: true,
      talk: [{ start: 'marieke_hi' }],
    },
    {
      id: 'joos', name: 'Meester Joos Peeters', role: 'deken van de wevers', at: [75, 45], facing: 0.4, tint: '#5a3a22',
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
      id: 'aleydis', name: 'Zuster Margriet', role: 'begijn en ziekenverzorgster', at: [680, -316], facing: -1.4, tint: '#2a2a2e',
      look: { body: 'woman', wear: { hair_bun: 'h_brown', habit: 'beguine', beguine_veil: null, shoes: null }, prop: 'rosary' },
      offers: ['side_herbs'],
      talk: [
        { if: { quest: BELLS, state: 'active', stage: 'badge' }, start: 'aleydis_badge' },
        { if: { quest: 'side_seals', state: 'active', stage: 'shelter' }, start: 'aleydis_lijsbet' },
        { if: { quest: 'side_herbs', state: 'none' }, start: 'aleydis_intro' },
        { if: { quest: 'side_herbs', state: 'active', stage: 'return' }, start: 'aleydis_herbs_back' },
        { start: 'aleydis_idle' },
      ],
    },
    {
      id: 'drossaard', name: 'Jonker Hendrik van Gorp', role: 'drossaard van Diest', at: [400, 140], facing: 2.2, tint: '#1e2a3a',
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
      id: 'wouter', name: 'Wouter Claes', role: 'tollenaar aan de Putterstraatpoort', at: [-95, 340], facing: 2.6, tint: '#4a4a2a',
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
      id: 'lijsbet', name: 'Lijsbet Vranckx', role: 'weduwe van een wever', at: [805, 100], facing: -1.6, tint: '#3d3428',
      look: { body: 'woman_old', wear: { hair_bun: 'h_grey', coif: null, bodice: 'black', kerchief: null, skirt: 'slate', shoes: null } },
      talk: [
        { if: { quest: 'side_seals', state: 'active', stage: 'widow' }, start: 'lijsbet_meet' },
        { start: 'lijsbet_idle' },
      ],
    },
    {
      id: 'gielis', name: 'Gielis "de Ton"', role: 'voerman, naar eigen zeggen', at: [-430, 100], facing: 1.2, tint: '#5a2a1a',
      look: { body: 'man_stout', wear: { hair_crop: 'h_red', beard_full: 'h_red', cap_flat: 'russet', smock: 'linen', belt: null, breeches: 'russet', stockings: 'grey', clogs: null } },
      talk: [
        { if: { quest: 'side_toll', state: 'active', stage: 'cart' }, start: 'gielis_meet' },
        { start: 'gielis_idle' },
      ],
    },
    {
      id: 'driesen', name: 'Boer Jan Driesen', role: 'boer te Kaggevinne', at: [-2235, 690], facing: 0.6, tint: '#5a4a2a',
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
      id: 'truyken', name: 'Truyken', role: 'verkoopster van pelgrimstekens', at: [-5005, 545], facing: -2.0, tint: '#5a3f2a',
      look: { body: 'woman_stout', wear: { hair_bun: 'h_blond', coif: null, bodice: 'ochre', kerchief: null, pelerine: 'russet', skirt: 'umber', clogs: null }, prop: 'basket' },
      talk: [
        { if: { quest: BELLS, state: 'active', stage: 'scherpenheuvel' }, start: 'truyken_main' },
        { start: 'truyken_idle' },
      ],
    },
    {
      id: 'provost', name: 'Pater Jan Cools', role: 'overste van Scherpenheuvel', at: [-5085, 470], facing: 0.8, tint: '#e8e0d0',
      look: { body: 'man_old', wear: { hair_thin: 'h_white', skullcap: 'black', habit: 'black', bands: null, shoes: null } },
      offers: ['side_wisps'],
      talk: [
        { if: { quest: 'contract_letter', state: 'active', stage: 'deliver' }, start: 'provost_letter' },
        { if: { quest: 'side_wisps', state: 'none' }, start: 'provost_wisps' },
        { if: { quest: 'side_wisps', state: 'active', stage: 'return' }, start: 'provost_wisps_back' },
        { start: 'provost_idle' },
      ],
    },
  ],

  quests: [
    // ================================================================ hoofdverhaal
    {
      id: ARRIVE, title: 'Een vreemdeling in Diest', kind: 'main', town: 'Diest', level: 1,
      summary: 'Land in Diest en zoek uit waarom de klokken zwijgen.',
      reward: { xp: 60 },
      stages: [
        {
          id: 'land',
          journal: '{dragon} volgde de Demer tot Diest, laag over het water, alsof hij de weg kende. Van boven zag ik de muren, de markt en de kerk met haar stompe toren. Er luidde geen enkele klok. Ergens onder die daken weet iemand waar het water Neelke heeft gelaten.',
          objectives: [{ id: 'land', kind: 'reach', text: 'Land op de Grote Markt van Diest', at: [40, 45], r: 70, onFoot: true }],
          onDone: [{ stage: [ARRIVE, 'pieter'] }],
        },
        {
          id: 'pieter',
          journal: 'Op de markt kijkt iedereen naar de toren, zoals je naar een zieke kijkt. Ze sturen me naar Pieter, de koster. Hij staat bij de kerk, met een sleutelbos die hij niet meer nodig heeft.',
          objectives: [{ id: 'pieter', kind: 'talk', text: 'Spreek met Pieter de koster bij de kerk', npc: 'pieter' }],
        },
      ],
    },
    {
      id: BELLS, title: 'De klokken die niet luiden', kind: 'main', town: 'Diest', giver: 'pieter', level: 2,
      summary: 'De klokken van Sint-Sulpitius zwijgen. Hun klepels zijn weg.',
      reward: { xp: 220, florins: 30, renown: [['Diest', 10]] },
      stages: [
        {
          id: 'tower',
          journal: 'De klok gaf zeven slagen, zegt Pieter, en daarna bleef het stil. De drie klepels zijn weg, uit een toren die op slot zat. Op de klokkenstoel lag nat wier. Met {dragon} geraak ik tot boven.',
          objectives: [{ id: 'climb', kind: 'reach', text: 'Vlieg naar de top van de toren van Sint-Sulpitius', at: [-26, 30], r: 30, minY: 28 }],
          onDone: [{ give: 'pilgrim_badge' }, { xp: 60 }, { stage: [BELLS, 'badge'] }],
        },
        {
          id: 'badge',
          journal: 'In het wier op de klokkenstoel zat een tinnen insigne van Onze-Lieve-Vrouw van Scherpenheuvel, het gezichtje nog scherp. Zuster Margriet in het Begijnhof kent elk pelgrimsteken van Brabant.',
          objectives: [{ id: 'show', kind: 'talk', text: 'Toon het insigne aan zuster Margriet in het Begijnhof', npc: 'aleydis' }],
        },
        {
          id: 'road',
          journal: 'Margriet stuurt me naar Scherpenheuvel. De pelgrims durven de weg niet meer op: bij Kaggevinne liggen deserteurs uit de Franse oorlog. Ze nemen wat je bij je hebt, en soms nemen ze jou ook mee.',
          objectives: [{ id: 'rovers', kind: 'kill', text: 'Verdrijf de wegrovers bij Kaggevinne', camp: 'kaggevinne', count: 4, at: [-2120, 560], r: 45 }],
          onDone: [{ xp: 80 }, { renown: ['Diest', 5] }, { stage: [BELLS, 'scherpenheuvel'] }],
        },
        {
          id: 'scherpenheuvel',
          journal: 'De weg is vrij, als je de kraaien bij de doden niet meetelt. In het westen ligt Scherpenheuvel, waar het altaar staat op de plek van de oude eik. Truyken verkoopt er pelgrimstekens en ze hoort alles.',
          objectives: [{ id: 'truyken', kind: 'talk', text: 'Zoek Truyken bij de kerk van Scherpenheuvel', npc: 'truyken' }],
        },
        {
          id: 'report',
          journal: 'Truyken verkocht eikenbeeldjes aan een lange man "die naar de Demer rook en betaalde met natte munten". Ze gaf me er een. Het zoemt, en het zoemt luider als ik het in de richting van het Broek houd, het moeras ten zuidoosten van Diest. Daar staat water genoeg.',
          objectives: [{ id: 'pieter', kind: 'talk', text: 'Breng verslag uit bij Pieter in Diest', npc: 'pieter' }],
        },
      ],
    },
    {
      id: KLUDDE, title: 'Het beest van het Broek', kind: 'main', town: 'Diest', giver: 'pieter', level: 4,
      summary: 'Iets in de moerassen heeft de klepels van Diest gestolen.',
      reward: { xp: 600, florins: 60, renown: [['Diest', 25]], gear: ['kluddevel'] },
      stages: [
        {
          id: 'hounds',
          journal: 'Een man die naar de Demer ruikt, door gesloten deuren komt en met nat geld betaalt: Pieter zegt nu hardop dat het de Kludde is. Aan de rivier zag hij er niet uit als een man. Zijn honden zwerven door het Broek, voorbij de oude Koepoort. Als ik hen volg, kom ik bij hem uit.',
          objectives: [{ id: 'honden', kind: 'kill', text: 'Volg het spoor: versla de broekhonden in het Broek', enemy: 'broekhond', count: 5, at: [1220, 680], r: 220 }],
          onDone: [{ xp: 100 }, { stage: [KLUDDE, 'lair'] }],
        },
        {
          id: 'lair',
          journal: 'De sporen lopen naar het moeras bij Webbekom. Tussen het riet sleept iets een ketting over de grond. Het beeldje zoemt zo hard dat mijn hand ervan tintelt. Als Neelke ergens is, dan is het hier.',
          objectives: [{ id: 'kludde', kind: 'kill', text: 'Versla de Kludde in zijn nest bij Webbekom', camp: 'kluddenest', enemy: 'kludde', count: 1, at: [1680, 1060], r: 40 }],
          onDone: [{ stage: [KLUDDE, 'clappers'] }],
        },
        {
          id: 'clappers',
          journal: 'De Kludde is in het water verdwenen, met stoom en kettinggerinkel. Of hij dood is, weet je bij hem nooit. In zijn nest liggen de klepels, half in de modder. In de paal ernaast staan kerven, in groepjes van vijf.',
          objectives: [{ id: 'klepels', kind: 'collect', text: 'Raap de klepels op in het nest', item: 'klepel', count: 3, spawns: [[1672, 1048], [1694, 1070], [1662, 1078]] }],
          onDone: [{ stage: [KLUDDE, 'return'] }],
        },
        {
          id: 'return',
          journal: 'Ik heb de drie klepels. Ze zijn zwaar als een kind en koud als de rivier. Aan één ervan kleeft nog wier. Pieter gaat ervan wenen.',
          objectives: [{ id: 'pieter', kind: 'talk', text: 'Breng de klepels naar Pieter de koster', npc: 'pieter' }],
        },
      ],
    },
    {
      id: LEUVEN, title: 'De weg naar Leuven', kind: 'main', town: 'Diest', giver: 'pieter', level: 6,
      summary: 'De Kludde zocht iets in Leuven. Volg hem.',
      stages: [
        {
          id: 'pass',
          journal: 'De klokken van Diest luiden weer. Bij elke slag vielen de ogen van {dragon} dicht, en Pieter zag het ook. Het beeldje zoemt nu het hardst als ik het naar het westen houd, naar Leuven. Voor die reis heb ik een vrijgeleide nodig van de drossaard.',
          objectives: [{ id: 'dross', kind: 'talk', text: 'Vraag de drossaard om een vrijgeleide', npc: 'drossaard' }],
        },
        {
          id: 'travel',
          journal: 'Het vrijgeleide ruikt naar lak en naar de drossaard. De weg naar Leuven ligt open. (Leuven, Aarschot, Mechelen, Lier en Antwerpen komen in de volgende uitbreiding van de wereld.)',
          objectives: [{ id: 'leuven', kind: 'flag', text: 'Reis naar Leuven (binnenkort)', flag: 'reached_leuven' }],
        },
      ],
    },

    // ================================================================ zijverhalen
    {
      id: 'side_seals', title: 'Te veel tanden', kind: 'side', town: 'Diest', giver: 'joos', level: 1,
      summary: 'Iemand vervalst de lakenzegels van Diest.',
      reward: { xp: 120 },
      stages: [
        {
          id: 'find',
          journal: 'Meester Joos zegt dat Antwerpen balen vodden terugstuurt onder het zegel van Diest. Eén vals zegel kost de hele stad haar naam, en die naam is ouder dan Joos. De vervalser werkt bij de bleekvelden voorbij de oude Koepoort.',
          objectives: [{ id: 'seals', kind: 'collect', text: 'Zoek valse zegels bij de bleekvelden voorbij de oude Koepoort', item: 'forged_seal', count: 3, spawns: [[870, 40], [905, 125], [858, 185]] }],
          onDone: [{ stage: ['side_seals', 'widow'] }],
        },
        {
          id: 'widow',
          journal: 'De zegels lagen langs een pad naar een huisje voorbij de gracht, als broodkruimels. Wie ze liet vallen, wilde misschien gevonden worden.',
          objectives: [{ id: 'meet', kind: 'talk', text: 'Spreek met wie in het huisje woont', npc: 'lijsbet' }],
        },
        {
          id: 'decide',
          journal: 'Lijsbet, de weduwe van een wever, giet het zegel na om haar eigen laken te verkopen. Het ambacht laat een weduwe niet aan het getouw van haar man. Ik heb gezegd dat ik naar de drossaard ga. Ze zei dat ze thuis zou zijn.',
          objectives: [{ id: 'dross', kind: 'talk', text: 'Geef de vervalser aan bij de drossaard', npc: 'drossaard' }],
        },
        {
          id: 'shelter',
          journal: 'Ik heb Lijsbet naar het Begijnhof gestuurd. De begijnen nemen weduwen op, en ze weven onder hun eigen zegel.',
          objectives: [{ id: 'aleydis', kind: 'talk', text: 'Vraag zuster Margriet om Lijsbet op te nemen', npc: 'aleydis' }],
        },
        {
          id: 'report',
          journal: 'Het is geregeld, op de ene of de andere manier. Meester Joos wacht in de Lakenhalle. Hij zal niet vragen hoe.',
          objectives: [{ id: 'joos', kind: 'talk', text: 'Keer terug naar meester Joos in de Lakenhalle', npc: 'joos' }],
        },
      ],
    },
    {
      id: 'side_herbs', title: 'Wondkruid uit het Broek', kind: 'side', town: 'Diest', giver: 'aleydis', level: 2,
      summary: 'De begijnen hebben kruiden nodig uit de Demerweiden.',
      reward: { xp: 150, florins: 8, renown: [['Begijnhof', 10]], items: [['salve', 3]] },
      stages: [
        {
          id: 'gather',
          journal: 'Zuster Aleydis heeft wondkruid nodig tegen de koorts in de ziekenzaal. Het groeit in de natte weiden langs de Demer, ten zuidoosten van de stad. "Pluk het bij daglicht," zegt ze, en niet waarom. Uit die richting huilen honden.',
          objectives: [{ id: 'herbs', kind: 'collect', text: 'Pluk moeraswondkruid in de Demerweiden', item: 'marsh_herb', count: 4, spawns: [[960, 160], [1060, 330], [1160, 490], [1260, 640]] }],
          onDone: [{ stage: ['side_herbs', 'return'] }],
        },
        {
          id: 'return',
          journal: 'Vier handen wondkruid, nat tot aan de pols. Terug naar het Begijnhof, voor het donker.',
          objectives: [{ id: 'back', kind: 'talk', text: 'Breng het wondkruid naar zuster Aleydis', npc: 'aleydis' }],
        },
      ],
    },
    {
      id: 'side_toll', title: 'De brandewijnweg', kind: 'side', town: 'Diest', giver: 'wouter', level: 1,
      summary: 'Smokkelaars brengen brandewijn langs de Leuvense Poort.',
      reward: { xp: 100 },
      stages: [
        {
          id: 'cart',
          journal: 'Wouter de tollenaar zegt dat een voerman, Gielis de Ton, brandewijn rond de muren rijdt om de tol te ontlopen, langs de weg buiten de Allerheiligenpoort. Van boven is een kar met zulke vaten niet te missen.',
          objectives: [{ id: 'gielis', kind: 'talk', text: 'Zoek de kar van de smokkelaar buiten de Allerheiligenpoort', npc: 'gielis' }],
        },
        {
          id: 'report',
          journal: 'Ik heb Gielis gevonden. Wouter wil weten hoe het is afgelopen, en vooral hoeveel.',
          objectives: [{ id: 'wouter', kind: 'talk', text: 'Vertel het aan Wouter aan de Leuvense Poort', npc: 'wouter' }],
        },
      ],
    },
    {
      id: 'side_roelof', title: 'Roelof de Rode', kind: 'side', town: 'Kaggevinne', giver: 'driesen', level: 5,
      summary: 'Een deserteurskapitein plundert de hoeves rond Kaggevinne.',
      reward: { xp: 450, florins: 40, renown: [['Diest', 10]], gear: ['roelofs_slagzwaard'] },
      stages: [
        {
          id: 'hunt',
          journal: 'Boer Driesen van Kaggevinne is zijn varkens, zijn haver en bijna zijn dochter kwijt aan Roelof de Rode, een kapitein die het leger van de koning verliet toen het hem niet meer betaalde. Zijn kamp ligt op de Galgenberg. Ironisch, zegt Driesen.',
          objectives: [{ id: 'roelof', kind: 'kill', text: 'Versla Roelof de Rode op de Galgenberg', camp: 'galgeberg', count: 1, enemy: 'elite', at: [-1700, 2060], r: 50 }],
          onDone: [{ stage: ['side_roelof', 'return'] }],
        },
        {
          id: 'return',
          journal: 'Roelof de Rode ligt op de Galgenberg, waar hij altijd al thuishoorde. Hij droeg de laarzen van een andere man. Driesen zal het graag horen.',
          objectives: [{ id: 'driesen', kind: 'talk', text: 'Vertel het aan boer Driesen in Kaggevinne', npc: 'driesen' }],
        },
      ],
    },
    {
      id: 'side_wisps', title: 'Lichtjes in het bos', kind: 'side', town: 'Scherpenheuvel', giver: 'provost', level: 3,
      summary: 'Dwaallichten lokken pelgrims het bos in.',
      reward: { xp: 320, florins: 20, renown: [['Scherpenheuvel', 15]], gear: ['pelgrimsmantel'] },
      stages: [
        {
          id: 'wisps',
          journal: 'De proost zegt dat er pelgrims verdwalen in het eikenbos ten oosten van Scherpenheuvel. Ze volgen lichtjes die ze voor processiekaarsen houden. Twee zijn niet teruggekomen. Neelke volgde ook lichtjes.',
          objectives: [{ id: 'licht', kind: 'kill', text: 'Doof de dwaallichten in het eikenbos', enemy: 'dwaallicht', count: 4, at: [-4460, 960], r: 90 }],
          onDone: [{ stage: ['side_wisps', 'return'] }],
        },
        {
          id: 'return',
          journal: 'Het bos is weer donker, zoals een bos hoort te zijn. Van de twee pelgrims vond ik één klomp.',
          objectives: [{ id: 'proost', kind: 'talk', text: 'Keer terug naar de proost', npc: 'provost' }],
        },
      ],
    },

    // ================================================================ opdrachten
    {
      id: 'contract_letter', title: 'Een brief voor de proost', kind: 'contract', town: 'Diest', giver: 'drossaard', level: 2,
      summary: 'Breng de brief van de drossaard naar Scherpenheuvel.',
      reward: { xp: 120, florins: 15, renown: [['Diest', 5], ['Scherpenheuvel', 5]] },
      stages: [
        {
          id: 'deliver',
          journal: 'De drossaard wil een verzegelde brief laten bezorgen bij de proost van Scherpenheuvel, westwaarts langs de weg naar Aarschot. Hij zegt dat de weg traag is en de draak niet.',
          objectives: [{ id: 'provost', kind: 'talk', text: 'Bezorg de brief bij de proost in Scherpenheuvel', npc: 'provost' }],
        },
      ],
    },
  ],

  dialogue: {
    // ================================================================ Pieter
    pieter_intro: { who: 'pieter', text: 'Jij. Met dat... beest. Jij bent die waar ze op de markt over fluisteren. Goed. Niemand anders wil nog op mijn toren.', next: 'pieter_2', effects: [{ complete: ARRIVE }] },
    pieter_2: { who: 'pieter', text: 'Die nacht sloegen ze zeven keer, en toen niets meer. Niet voor de mis, niet voor de uren, niet voor de doden. Ik ben boven gaan kijken: de klepels zijn weg, alle drie. De deur zat op slot. De sleutel hangt aan mijn riem.', next: 'pieter_3' },
    pieter_3: {
      who: 'pieter', text: 'Er lag rivierwier op de klokkenstoel. Nat. Veertig el boven de grond.',
      choices: [
        { text: 'Ik ga naar boven kijken.', next: 'pieter_accept', effects: [{ start: BELLS }] },
        { text: 'Rivierwier? Van de Demer?', next: 'pieter_weed' },
        { text: 'Die nacht heeft het water mijn zusje genomen.', next: 'pieter_sister' },
        { text: 'Een stad zonder klokken: is dat zo erg?', next: 'pieter_why' },
      ],
    },
    pieter_weed: { who: 'pieter', text: 'Mijn grootmoeder zou zeggen: de Kludde. Die is wat hij wil, zei ze: een hond, een paard, een kat. Ik ben koster, dus ik zeg: dieven. Dieven die naar de rivier ruiken.', next: 'pieter_3' },
    pieter_sister: { who: 'pieter', text: 'Jij ook. De veerman zoekt zijn jongen, en achter de Lakenhalle staat een wieg leeg. Wat het water die nacht nam, heeft het nog niet teruggegeven.', next: 'pieter_3' },
    pieter_why: { who: 'pieter', text: 'Een stad zonder klokken weet niet wanneer ze moet opstaan, bidden of haar poorten sluiten. En de oude mensen zeggen dat de klokken nog iets anders in slaap houden. Ik weet niet wat. Ik wil het niet weten.', next: 'pieter_3' },
    pieter_accept: { who: 'pieter', text: 'De toren is die platte aan de westkant. Ze hebben hem nooit afgebouwd; het geld was op. Pas op voor de duiven. Die zijn eigendom van de Kerk.' },
    pieter_busy: { who: 'pieter', text: 'Naar boven, alsjeblieft. Voor de deken van het kapittel het me nog eens vraagt.' },
    pieter_report: { who: 'pieter', text: 'Je bent in Scherpenheuvel geweest. Dat zie ik aan je schoenen. En?', next: 'pieter_r2' },
    pieter_r2: { who: 'you', text: 'Een man die naar de Demer ruikt, koopt eikenbeeldjes. Dit hier zoemt. Het zoemt luider naar het Broek toe.', next: 'pieter_r3' },
    pieter_r3: { who: 'pieter', text: 'Naar het Broek. Natte munten, natte voeten, door gesloten deuren. Ik ben koster, ik geloof niet in sprookjes. Maar ik geloof wat ik op die klokkenstoel gezien heb: klauwen. Grote klauwen.', next: 'pieter_r4' },
    pieter_r4: {
      who: 'pieter', text: 'De Kludde, dan. Mijn grootmoeder had gelijk, en ze is veertig jaar dood. Zijn honden zwerven door het Broek, voorbij de Koepoort. Volg ze, en je vindt zijn nest. En de klepels.',
      choices: [
        { text: 'Dan ga ik op jacht.', effects: [{ complete: BELLS }, { start: KLUDDE }] },
        { text: 'En mijn zusje?', next: 'pieter_r5' },
      ],
    },
    pieter_r5: { who: 'pieter', text: 'Als ze ergens is, dan daar. Ik ga niet tegen je liegen: de Kludde geeft niets terug. Maar hij heeft ook nog nooit klepels gestolen.', next: 'pieter_r4' },
    pieter_kludde: { who: 'pieter', text: 'Het Broek ligt ten zuidoosten, voorbij de Koepoort. Neem zalf mee. Neem je draak mee. En kijk niet naar de lichtjes.' },
    pieter_bells: { who: 'pieter', text: 'Zijn dat... Heilige Sulpitius. Dat zijn ze. Alle drie.', next: 'pieter_b2', effects: [{ take: 'klepel', n: 3 }] },
    pieter_b2: { who: 'pieter', text: 'Help me ze ophangen. Nee, laat maar, je draak kan dat sneller. Luister. LUISTER.', next: 'pieter_b3', effects: [{ set: 'bells_ring' }, { complete: KLUDDE }] },
    pieter_b3: { who: 'pieter', text: 'Diest weet weer hoe laat het is. Kijk naar je draak: bij elke slag vallen zijn ogen dicht. En dat beeldje zoemt nog altijd, nu naar het westen. Naar Leuven.', next: 'pieter_b4' },
    pieter_b4: {
      who: 'pieter', text: 'Als iemand de opschriften op oud brons en ouder hout kan lezen, zijn het de meesters van de universiteit. Ga naar de drossaard: zonder vrijgeleide kom je met een draak geen stadspoort binnen.',
      choices: [
        { text: 'Dan ga ik naar de drossaard.', effects: [{ start: LEUVEN }] },
        { text: 'Wat doen de klokken met hem?', next: 'pieter_b5' },
      ],
    },
    pieter_b5: { who: 'pieter', text: 'Ik ben koster, geen profeet. Ik weet alleen dat hij sliep zolang ze luidden. Honderden jaren. Misschien vond hij dat niet erg.', next: 'pieter_b4' },
    pieter_after: { who: 'pieter', text: 'Hoor je dat? Elk uur. Ik heb mijn hele leven niet zo graag naar klokken geluisterd. Je draak wel minder, zie ik.' },

    // ================================================================ Marieke
    marieke_hi: {
      who: 'marieke', text: 'Amai. De drakenrijder, aan mijn kraam. Zalf, zwaarden, harnassen, amuletten: alles eerlijk verkregen. Bijna allemaal. Wat zal het zijn?',
      choices: [
        { text: 'Laat je waren eens zien.', effects: [{ open: 'shop' }] },
        { text: 'Wat hoor je zoal op de markt?', next: 'marieke_gossip' },
        { text: 'Ik zoek een meisje. Klein, blond. Ze telt alles.', next: 'marieke_girl' },
        { text: 'Niets, dank je.' },
      ],
    },
    marieke_gossip: { who: 'marieke', text: 'Dat de deserteurs bij Kaggevinne de pelgrims uitkleden. Dat Roelof de Rode op de Galgenberg de boeren hun winter opeet. Dat het in het Broek spookt, elke nacht in een ander vel. Goede tijden voor wie zalf verkoopt.', next: 'marieke_hi' },
    marieke_girl: { who: 'marieke', text: 'Ik kom in elk dorp tussen hier en Leuven. Als er een kind mijn waren telt, laat ik het je weten. Voor niets, deze keer.', next: 'marieke_hi' },

    // ================================================================ Joos
    joos_intro: { who: 'joos', text: 'Weet je wat dit is? Een loden zegel met het wapen van Diest: onze belofte dat het laken goed is. Mijn grootvader zwoer erop. Dit is vals.', next: 'joos_2' },
    joos_2: {
      who: 'joos', text: 'De Antwerpse kooplieden sturen balen vodden terug onder ons zegel. Nog één seizoen zo en niemand koopt nog Diesters laken. De vervalser werkt bij de bleekvelden, voorbij de Koepoort. Vind hem.',
      choices: [
        { text: 'Ik vind je vervalser.', effects: [{ start: 'side_seals' }], next: 'joos_3' },
        { text: 'En wat gebeurt er met hem als ik hem vind?', next: 'joos_punish' },
      ],
    },
    joos_punish: { who: 'joos', text: 'Dat is voor de drossaard. Verbanning, als hij geluk heeft. Het ambacht vergeet niets; daar hebben we een kist voor, en een klerk.', next: 'joos_2' },
    joos_3: { who: 'joos', text: 'Zoek naar de zegels. Vervalsers zijn slordig met hun mislukkingen.' },
    joos_busy: { who: 'joos', text: 'Elke dag dat die vervalser werkt, is Diesters laken een stuiver minder waard. Ik tel ze.' },
    joos_report: { who: 'joos', text: 'En? Is het geregeld?', next: 'joos_r_branch' },
    joos_r_branch: {
      who: 'you', text: 'Het is geregeld.',
      choices: [
        { text: 'De drossaard heeft haar. Een weduwe van een wever.', if: { flag: 'seals_reported' }, next: 'joos_r_reported' },
        { text: 'Ze is nu bij de begijnen. Ze weeft er eerlijk, onder hun zegel.', if: { flag: 'seals_begijnhof' }, next: 'joos_r_begijnhof' },
        { text: 'Het spoor liep dood. De vervalser is weg.', if: { flag: 'seals_warned' }, next: 'joos_r_warned' },
      ],
    },
    joos_r_reported: { who: 'joos', text: 'Een weduwe. Die van Vranckx? God sta haar bij. Maar het zegel is de eer van de stad. Hier: het ambacht betaalt zijn schulden, ook de harde.', effects: [{ complete: 'side_seals', outcome: 'reported' }, { florins: 30 }, { renown: ['Diest', 10] }, { gear: 'zegelring' }] },
    joos_r_begijnhof: { who: 'joos', text: 'Je hebt haar naar de begijnen laten gaan? Die verkopen laken onder hun eigen zegel en betalen geen cent aan het ambacht. Hm. Ze vervalst tenminste het onze niet meer. Hier, en zeg niet tegen de anderen dat ik betaald heb.', effects: [{ complete: 'side_seals', outcome: 'begijnhof' }, { florins: 15 }, { renown: ['Diest', 3] }, { renown: ['Begijnhof', 10] }] },
    joos_r_warned: { who: 'joos', text: 'Weg. Dan vervalst ze ergens anders, onder het zegel van een andere stad. Dat is ook iets, veronderstel ik. Half werk, half loon.', effects: [{ complete: 'side_seals', outcome: 'warned' }, { florins: 12 }] },
    joos_after: { who: 'joos', text: 'Antwerpen stuurt geen balen meer terug. Voorlopig. In Antwerpen is alles voorlopig.' },

    // ================================================================ Lijsbet
    lijsbet_meet: { who: 'lijsbet', text: 'Je hebt de zegels gevonden. Dat verbaast me niet. Mijn handen beven als ik ze giet.', next: 'lijsbet_2' },
    lijsbet_2: { who: 'lijsbet', text: 'Jan was meester-wever. Toen hij stierf, liet het ambacht me één baal afmaken en nam toen zijn getouw. Het laken dat ik maak is goed. Beter dan de helft van wat met het echte zegel buitengaat. Maar het laken van een weduwe krijgt geen zegel.', next: 'lijsbet_3' },
    lijsbet_3: {
      who: 'lijsbet', text: 'Wel. Wat ga je met mij doen?',
      choices: [
        { text: 'De wet is de wet. Ik ga naar de drossaard.', next: 'lijsbet_law', effects: [{ take: 'forged_seal', n: 3 }, { stage: ['side_seals', 'decide'] }] },
        { text: 'De begijnen nemen weduwen op. Ga naar het Begijnhof; ik spreek voor je.', next: 'lijsbet_beg', effects: [{ set: 'seals_begijnhof' }, { stage: ['side_seals', 'shelter'] }] },
        { text: 'Verlaat Diest vannacht. Ik heb je nooit gevonden.', next: 'lijsbet_flee', effects: [{ set: 'seals_warned' }, { give: 'seal_mould' }, { stage: ['side_seals', 'report'] }] },
      ],
    },
    lijsbet_law: { who: 'lijsbet', text: 'Dan ben ik thuis als ze komen. Ik heb nergens anders te zijn.' },
    lijsbet_beg: { who: 'lijsbet', text: 'De begijnen? Zouden die mij willen? ...Ik ga voor de poort dichtgaat.' },
    lijsbet_flee: { who: 'lijsbet', text: 'Neem de vorm. Waar ik naartoe ga heb ik hem niet nodig, en dan kom ik niet in de verleiding. God zegen je.' },
    lijsbet_idle: { who: 'lijsbet', text: 'De bleekvelden zijn goed dit jaar. Het laken komt er wit als gebeente vanaf.' },

    // ================================================================ Aleydis
    aleydis_intro: { who: 'aleydis', text: 'Je laat de tocht binnen, en die draak van jou laat de schapen binnen. Wat wil je?', next: 'aleydis_2' },
    aleydis_2: {
      who: 'aleydis', text: 'Nu je hier toch bent: er heerst koorts in de ziekenzaal en mijn wondkruid is op. Het groeit in de natte weiden langs de Demer, ten zuidoosten van de stad. Jij bent er sneller dan ik mijn klompen gevonden heb.',
      choices: [
        { text: 'Ik pluk het voor je.', effects: [{ start: 'side_herbs' }], next: 'aleydis_3' },
        { text: 'Waarom alleen bij daglicht?', next: 'aleydis_why' },
        { text: 'Is er die nacht iemand uit het water gekomen?', next: 'aleydis_water' },
      ],
    },
    aleydis_why: { who: 'aleydis', text: 'Omdat de weiden na donker van iets zijn dat de ene nacht een hond is en de andere een paard, en altijd honger heeft. Zeggen de boeren. Ik zeg: bij daglicht, en kom terug.', next: 'aleydis_2' },
    aleydis_water: { who: 'aleydis', text: 'Eén. Een jongen van bij de Schaffense Poort, drie dagen later, kletsnat en warm. Hij spreekt niet. Hij legt steentjes op een rij.', next: 'aleydis_2' },
    aleydis_3: { who: 'aleydis', text: 'Vier goede handen vol. Niet de bladeren waar de koeien al aan gezeten hebben.' },
    aleydis_herbs_back: { who: 'aleydis', text: 'Goed, de koeien waren er niet eerst. Neem deze zalf. Ze is voor brandwonden. Met dat beest van jou zul je ze nodig hebben.', effects: [{ take: 'marsh_herb', n: 4 }, { complete: 'side_herbs' }] },
    aleydis_badge: { who: 'aleydis', text: 'Laat zien. Onze-Lieve-Vrouw van Scherpenheuvel, dit jaar gegoten: de vormen slijten en de gezichtjes worden zachter. Waar heb je dat gevonden?', next: 'aleydis_b2' },
    aleydis_b2: { who: 'you', text: 'In nat wier, op de klokkenstoel van Sint-Sulpitius.', next: 'aleydis_b3' },
    aleydis_b3: { who: 'aleydis', text: 'Hm. De pelgrims die hier passeren zeggen dat de nieuwe kerk van Scherpenheuvel \'s nachts zoemt. Het altaar staat waar de oude eik stond, en ze zeggen dat ze de wortels nooit uitgegraven hebben.', next: 'aleydis_b4' },
    aleydis_b4: { who: 'aleydis', text: 'Ga naar Scherpenheuvel. Zoek Truyken, die tekens verkoopt bij de basiliek. Maar pas op: bij Kaggevinne liggen deserteurs op de weg. Ze beroven de pelgrims, en erger.', effects: [{ done: [BELLS, 'show'] }, { stage: [BELLS, 'road'] }] },
    aleydis_lijsbet: { who: 'aleydis', text: 'Een weversweduwe aan de poort, met niets dan haar handen? Jij hebt haar gestuurd. Natuurlijk.', next: 'aleydis_l2' },
    aleydis_l2: { who: 'aleydis', text: 'Het Begijnhof heeft getouwen en geen ambacht dat ze verbiedt. Ze mag blijven. Ze zal werken, en bidden, en nooit meer iets vervalsen, of ik kom het te weten.', effects: [{ done: ['side_seals', 'aleydis'] }, { stage: ['side_seals', 'report'] }] },
    aleydis_idle: { who: 'aleydis', text: 'Als de grote klokken zwijgen, luiden wij onze eigen. Kleine klokken tellen ook.' },

    // ================================================================ drossaard
    dross_letter: {
      who: 'drossaard', text: 'U bent de drakenrijder. Prachtig. Ik heb een verzegelde brief voor de proost van Scherpenheuvel, en elke koerier die ik heb is kreupel, dronken of calvinist.',
      choices: [
        { text: 'Ik breng hem.', effects: [{ start: 'contract_letter' }, { give: 'sealed_letter' }], next: 'dross_letter_ok' },
        { text: 'Wat staat erin?', next: 'dross_letter_what' },
      ],
    },
    dross_letter_what: { who: 'drossaard', text: 'Het is een verzegelde brief, {ruiter|ruiterin}. Dat is wat "verzegeld" betekent.', next: 'dross_letter' },
    dross_letter_ok: { who: 'drossaard', text: 'Westwaarts, langs de weg naar Aarschot; u zult de koepel zien. Niet lezen. Ik zal het weten.' },
    dross_seals: { who: 'drossaard', text: 'Een vervalser van het stadszegel? Spreek.', next: 'dross_s2' },
    dross_s2: { who: 'you', text: 'Lijsbet Vranckx, de weduwe van een wever, in het huisje voorbij de Koepoort. Dit zijn haar zegels.', next: 'dross_s3' },
    dross_s3: { who: 'drossaard', text: 'Vranckx. Ik kende haar man. Goed. De wet is duidelijk en ik ben haar dienaar. Verbanning uit de baronie; ze mag van geluk spreken dat het niet de kaak is. De wevers zullen dankbaar zijn.', effects: [{ set: 'seals_reported' }, { done: ['side_seals', 'dross'] }, { stage: ['side_seals', 'report'] }] },
    dross_pass: { who: 'drossaard', text: 'De klokken luiden weer, en dat dank ik u. Een vrijgeleide naar Leuven? Met een draak? De wachters aan de Mechelse Poort gaan het in hun broek doen.', next: 'dross_pass2' },
    dross_pass2: { who: 'drossaard', text: 'Hier. Met mijn zegel. En als u in Leuven bent: vraag naar professor Fromondus. Hij weet alles over de hemel en de aarde, en hij praat er graag over. Te graag.', effects: [{ give: 'pass' }, { xp: 50 }, { stage: [LEUVEN, 'travel'] }] },
    dross_idle: { who: 'drossaard', text: 'De baronie heeft een afwezige heer, een lege schatkist en een heleboel mensen die in allebei een kans zien.' },

    // ================================================================ Wouter
    wouter_intro: { who: 'wouter', text: 'Tol op wijn, zout, brandewijn, laken en alles op wielen. Niets aan te geven? Natuurlijk niet. Niemand heeft ooit iets aan te geven.', next: 'wouter_2' },
    wouter_2: {
      who: 'wouter', text: 'Maar jij hebt een draak, en ik heb een probleem. Gielis de Ton smokkelt brandewijn rond de muren, langs de weg buiten de Allerheiligenpoort, en de tol ziet er geen stuiver van. Van daarboven zie je zijn kar in een oogwenk.',
      choices: [
        { text: 'Ik vind hem.', effects: [{ start: 'side_toll' }], next: 'wouter_3' },
        { text: 'Wat krijg ik ervoor?', next: 'wouter_pay' },
      ],
    },
    wouter_pay: { who: 'wouter', text: 'De dank van de stad. En een deel van de boete, als de drossaard goedgezind is. Dat is hij nooit.', next: 'wouter_2' },
    wouter_3: { who: 'wouter', text: 'Grote vent, kleine kar, enorme vaten. Je kunt hem niet missen.' },
    wouter_report: { who: 'wouter', text: 'En? Heb je de Ton gevangen?', next: 'wouter_r_branch' },
    wouter_r_branch: {
      who: 'you', text: 'Ik heb hem gevonden.',
      choices: [
        { text: 'Hij heeft de tol betaald. Hier is het.', if: { flag: 'toll_paid' }, next: 'wouter_r_paid' },
        { text: 'Hij is ontsnapt.', if: { flag: 'toll_bribe' }, next: 'wouter_r_lie' },
        { text: 'Ik heb zijn brandewijn in beslag genomen. Hij is van de stad.', if: { flag: 'toll_seized' }, next: 'wouter_r_seized' },
      ],
    },
    wouter_r_paid: { who: 'wouter', text: 'Gielis heeft betaald? Gielis? Jij hebt de Ton eerlijk gemaakt. De stad dankt je. Ik ook.', effects: [{ complete: 'side_toll', outcome: 'paid' }, { florins: 10 }, { renown: ['Diest', 8] }] },
    wouter_r_lie: { who: 'wouter', text: 'Ontsnapt. Aan een draak. Hm. ...Je ruikt naar zijn brandewijn, {vriend|vriendin}. Laat maar. Wat de drossaard niet weet, deert hem niet.', effects: [{ complete: 'side_toll', outcome: 'bribed' }, { renown: ['Diest', -3] }] },
    wouter_r_seized: { who: 'wouter', text: 'Twee hele vaten! De drossaard zal voor één keer goedgezind zijn. Hier, jouw deel.', effects: [{ take: 'brandy' }, { complete: 'side_toll', outcome: 'seized' }, { florins: 18 }, { renown: ['Diest', 5] }] },
    wouter_wink: { who: 'wouter', text: '*tikt tegen zijn neus* Ruikt naar een gezellige avond, hé?' },
    wouter_idle: { who: 'wouter', text: 'Tol op wijn, zout, brandewijn, laken en alles op wielen. Over draken wordt nog vergaderd.' },

    // ================================================================ Gielis
    gielis_meet: { who: 'gielis', text: 'Hola. Gewoon een arme voerman die zijn paard laat rusten. Die vaten? Azijn. Om in te leggen. Heel veel inleggen.', next: 'gielis_2' },
    gielis_2: {
      who: 'gielis', text: 'Een draak. Natuurlijk. Allee, {vriend|vriendin}, de tol op brandewijn is diefstal. Neem een vaatje voor jezelf en vergeet mijn gezicht. Het is een gezicht dat je makkelijk vergeet.',
      choices: [
        { text: 'Betaal de tol, Gielis, of de draak eet de kar op.', next: 'gielis_pay', effects: [{ set: 'toll_paid' }, { stage: ['side_toll', 'report'] }] },
        { text: 'Ik neem dat vaatje. En ik heb je nooit gezien.', next: 'gielis_bribe', effects: [{ set: 'toll_bribe' }, { give: 'brandy' }, { stage: ['side_toll', 'report'] }] },
        { text: 'De brandewijn gaat naar de stad. Span je paard uit en wandel.', next: 'gielis_seize', effects: [{ set: 'toll_seized' }, { give: 'brandy' }, { stage: ['side_toll', 'report'] }] },
      ],
    },
    gielis_pay: { who: 'gielis', text: 'Diefstal, zeg ik je. Diefstal met vleugels. Goed. GOED!' },
    gielis_bribe: { who: 'gielis', text: 'Een verstandig mens. Dat je draak nooit de hik mag krijgen.' },
    gielis_seize: { who: 'gielis', text: 'Mijn brandewijn! Mijn... azijn! Je hoort nog van mijn neef. Hij is advocaat in Leuven. Nu ja, hij veegt er de vloer voor een advocaat.' },
    gielis_idle: { who: 'gielis', text: 'Azijn. Gewoon azijn.' },

    // ================================================================ Driesen
    driesen_intro: { who: 'driesen', text: 'Een {ruiter|ruiterin}! Met een... Heer, sta ons bij. Ben je van de koning? Van de prins? Van niemand? Van niemand is het beste, dan kun je misschien helpen.', next: 'driesen_2' },
    driesen_2: {
      who: 'driesen', text: 'Roelof de Rode. Hij was kapitein in het leger, tot het leger hem niet meer betaalde. Nu betaalt hij zichzelf, met mijn varkens, mijn haver en mijn rust. Zijn kamp ligt op de Galgenberg, ten zuiden van hier.',
      choices: [
        { text: 'Ik ga naar de Galgenberg.', effects: [{ start: 'side_roelof' }], next: 'driesen_3' },
        { text: 'Hoeveel mannen heeft hij?', next: 'driesen_men' },
      ],
    },
    driesen_men: { who: 'driesen', text: 'Genoeg om een dorp leeg te halen. Een stuk of vier, en eentje met een musket die beter schiet dan hij nuchter is. Roelof zelf is zo groot als een deur.', next: 'driesen_2' },
    driesen_3: { who: 'driesen', text: 'God zij met je. En als je mijn varkens ziet: ze heten Pier, Pol en Mieke.' },
    driesen_busy: { who: 'driesen', text: 'De Galgenberg, ten zuiden van hier. Je ziet de galg van ver.' },
    driesen_back: { who: 'driesen', text: 'Hij is dood? Roelof de Rode is dood? Vrouw! VROUW! Kom hier!', next: 'driesen_b2' },
    driesen_b2: { who: 'driesen', text: 'Ik ben maar een boer, ik heb niet veel. Maar wat ik heb, deel ik. En iedereen in Kaggevinne gaat jouw naam kennen, {name}.', effects: [{ complete: 'side_roelof' }] },
    driesen_after: { who: 'driesen', text: 'Pier is terug. Pol en Mieke niet, maar Pier is terug.' },

    // ================================================================ Scherpenheuvel
    truyken_main: { who: 'truyken', text: 'Insignes, rozenkransen, flesjes wijwater, beeldjes van de echte eik! De eik is in 1602 omgehakt, God hebbe zijn ziel, en elk splintertje ervan heeft sindsdien een mirakel gedaan. Sommige splintertjes meerdere.', next: 'truyken_2' },
    truyken_2: { who: 'you', text: 'Heeft er iemand vreemds beeldjes gekocht?', next: 'truyken_3' },
    truyken_3: { who: 'truyken', text: 'Vreemd? Iedereen is hier vreemd, het is een bedevaartsoord. Maar ja. Een lange man in een lange jas, elke week sinds Pasen. Kocht alleen de eikenhouten. Betaalde met munten die nat waren. Rook naar de Demer bij laag water.', next: 'truyken_4' },
    truyken_4: { who: 'truyken', text: 'Hier, neem er een. Een echte, je hoort het aan het zoemen. Ik hou niet van hoe het zoemt.', effects: [{ give: 'humming_statuette' }, { done: [BELLS, 'truyken'] }, { stage: [BELLS, 'report'] }] },
    truyken_idle: { who: 'truyken', text: 'Tekens van Onze-Lieve-Vrouw. Gezegend. Grotendeels.' },
    provost_letter: { who: 'provost', text: 'Van de drossaard van Diest? Per draak? De aartshertogen, God hebbe hun ziel, hadden dat prachtig gevonden.', next: 'provost_l2' },
    provost_l2: { who: 'provost', text: 'Hm. Hij vraagt of de pelgrims de klokken van de basiliek \'s nachts hebben horen luiden. Dat hebben ze. Niemand luidt ze. Zeg hem dat.', effects: [{ take: 'sealed_letter' }, { complete: 'contract_letter' }] },
    provost_wisps: {
      who: 'provost', text: 'U hebt een sterke arm en een vreemd rijdier. Luister. In het eikenbos ten oosten van hier dwalen pelgrims af. Ze volgen lichtjes die ze voor processiekaarsen houden. Twee zijn niet teruggekomen.',
      choices: [
        { text: 'Ik doof die lichtjes.', effects: [{ start: 'side_wisps' }], next: 'provost_w2' },
        { text: 'Lichtjes? Dat klinkt onschuldig.', next: 'provost_w3' },
      ],
    },
    provost_w2: { who: 'provost', text: 'Ze zweven buiten het bereik van een zwaard, zeggen de houthakkers. Maar niet buiten het bereik van een draak, denk ik.' },
    provost_w3: { who: 'provost', text: 'De twee die niet terugkwamen dachten dat ook.', next: 'provost_wisps' },
    provost_wisps_back: { who: 'provost', text: 'Het bos is donker? Goddank. Neem deze mantel; hij is gezegend aan het altaar, op de plek van de eik. Hij zal u beter beschermen dan die van u.', effects: [{ complete: 'side_wisps' }] },
    provost_idle: { who: 'provost', text: 'Zeven zijden, zeven wegen, en een koepel vol gouden sterren. De aartshertogen hebben goed gebouwd.' },
  },
};
