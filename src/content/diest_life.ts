// Het dagelijks leven in Diest, 1650: wie er iets verkoopt, wie je de weg
// wijst, wat er in de straten te doen is en wat er op het aanplakbord hangt.
// Alles is hedendaags Vlaams Nederlands met "je". Wat waar is, staat als
// geschiedenis; wat het volk vertelde, als volksverhaal; wat wij erbij
// verzonnen, als verzonnen (zie Truth in src/rpg/kroniek.ts). De namen van
// de verkopers, gidsen en wachters zijn verzonnen.
//
// Positions are local metres from the Grote Markt (x east, z south); the game
// moves each stall and person to the nearest open ground.

import type { FactionId } from '../rpg/factions';
import type { Good, JobTemplate, Page, ServiceDef, Topic } from '../life/types';

// ===================================================================== services
// The Grote Markt is the triangle between the Zoutstraat, the Schepenhuis and the
// road south; its middle is about (-38, 98).
export const MARKET_CENTRE: [number, number] = [-38, 98];

export const SERVICES: ServiceDef[] = [
  // ------------------------------------------------------------ the market
  {
    id: 'bakker', name: 'Jan Verhoeven', role: 'bakker', faction: 'gilden', at: [-51, 91], stall: 'bread', glyph: '⚖', label: 'Bakker', market: true,
    look: { body: 'man_stout', wear: { hair_crop: 'h_blond', smock: 'linen', belt: null, cap_flat: 'linen', breeches: 'brown', stockings: 'linen', clogs: null }, prop: 'bread' },
    shop: 'bakker',
    greet: ['Ik heb brood van vanmorgen, of van gisteren als je wat minder wilt betalen.', 'Roggebrood is voor de maag en krentenbrood voor het hart. Pastei is voor wie gaat vechten.', 'Een soldaat met honger is een slechte soldaat. Een drakenrijder met honger is een gevaar voor mijn kraam.'],
    shopGreet: ['Wat je hier koopt, steek je in je tas. Als het spannend wordt in een gevecht, eet je het vanzelf op. Dat doet iedereen.', 'De schepenen bepalen wat het brood kost. Ik bepaal hoe het smaakt.'],
  },
  {
    id: 'kruiden', name: 'Wanne Coels', role: 'kruidenvrouw', faction: 'vrije', at: [-46, 109], stall: 'herbs', glyph: '❦', label: 'Kruidenvrouw', market: true,
    look: { body: 'woman_old', wear: { hair_bun: 'h_grey', coif: null, bodice: 'moss', kerchief: null, skirt: 'brown', apron: 'linen', clogs: null }, prop: 'basket' },
    shop: 'kruiden',
    greet: ['Ik heb alsem, kamille en smeerwortel. En zalf, voor wie niet wil wachten tot de kamille werkt.', 'De begijnen verkopen hun zalf met een zegen erbij. Ik verkoop de mijne zonder zegen, en goedkoper.', 'Wat zoek je? Iets tegen de koorts, tegen de pijn, of tegen een schoonmoeder?'],
    shopGreet: ['Vraag me niet waar ik het pluk. Ik pluk het waar het groeit.'],
  },
  {
    id: 'drukker', name: 'Lucas Haeck', role: 'boekverkoper', faction: 'gilden', at: [-31, 111], stall: 'books', glyph: '✒', label: 'Boekverkoper', market: true,
    look: { body: 'man_old', wear: { hair_thin: 'h_grey', beard_pointed: 'h_grey', skullcap: 'black', doublet: 'black', collar_band: null, breeches: 'black', stockings: 'black', shoes: null } },
    shop: 'drukker',
    greet: ['Ik verkoop kaarten, almanakken, liedbladen en plakkaten, gedrukt in Leuven en Antwerpen.', 'Een prent van een plaats is bijna even goed als er zelf geweest zijn. Ik zeg wel: bijna.', 'Wie leest, kent de weg. Wie niet leest, moet hem vragen. Ik verdien alleen aan de eerste.'],
    shopGreet: ['Een kaart toont je waar iets ligt. Een almanak zegt je wanneer je moet gaan. Een liedblad liegt, maar het liegt mooi.'],
  },
  {
    id: 'kleermaker', name: 'Cornelis Mertens', role: 'meester-kleermaker', faction: 'gilden', at: [-24, 99], stall: 'cloth', glyph: '✂', label: 'Kleermaker', market: true,
    look: { body: 'man', wear: { hair_long: 'h_chestnut', moustache: 'h_chestnut', hat_wide: 'woad_dk', doublet: 'violet', collar_band: null, breeches: 'violet', stockings: 'white', shoes: null } },
    shop: 'kleermaker',
    greet: ['Ik heb wambuizen, kolders en verf voor je mantel. Die mantel heeft het nodig, als ik eerlijk mag zijn.', 'Echt laken van Diest wordt bijna niet meer geweven. Wat ik nog heb, snijd ik zelf.', 'Een goede mantel beschermt je tegen de regen en tegen wat de mensen zeggen.'],
    shopGreet: ['De wede komt uit het zuiden, de meekrap uit Zeeland en de gele wouw van om de hoek. Zwart is het duurst, want zwart verven is een kunst.'],
  },
  {
    id: 'smid', name: 'Gillis Bosmans', role: 'wapensmid', faction: 'gilden', at: [-27, 85], stall: 'iron', glyph: '⚒', label: 'Wapensmid', market: true,
    look: { body: 'man_stout', wear: { hair_crop: 'h_black', beard_full: 'h_black', smock: 'umber', belt: null, breeches: 'brown', stockings: 'grey', boots: null }, prop: 'sword' },
    shop: 'smid',
    greet: ['Ik heb degens, rapieren en een slagzwaard voor sterke armen. Allemaal Diests ijzer. Nu ja, het ijzer is van Luik en het vuur van Diest.', 'Laat je zwaard eens zien. Dat is geen zwaard meer, dat is er ooit een geweest.', 'Ik smeed niet voor deserteurs. Ik smeed voor wie deserteurs tegenhoudt.'],
    shopGreet: ['Hoe beter de gilde je kent, hoe beter het staal dat ik je laat zien. Dat is geen hebzucht. Dat is voorzichtigheid.'],
  },
  {
    id: 'omroeper', name: 'Rombout Smolders', role: 'stadsomroeper', faction: 'gilden', at: [-39, 97], stall: 'crier', glyph: '♫', label: 'Omroeper', market: true, guide: 'crier',
    look: { body: 'man', wear: { hair_long: 'h_brown', beard_pointed: 'h_brown', hat_wide: 'madder', plume: 'white', doublet: 'madder', collar_band: null, breeches: 'madder_dk', stockings: 'white', shoes: null }, prop: 'staff' },
    greet: ['Horen, zien en zwijgen, zeggen ze. Dat laatste is niets voor een omroeper.', 'Ik roep wat de schepenen me laten roepen. Wat ik zelf hoor, kost een pint.', 'Ik breng nieuws uit Diest, uit Brabant en uit de wereld. In die volgorde, want daarvoor betaalt de stad me.'],
  },
  // ------------------------------------------------------------ around town
  {
    id: 'notaris', name: 'Meester Adriaan Wellens', role: 'notaris', faction: 'kroon', at: [-58, 42], stall: 'door', glyph: '✍', label: 'Notaris', guide: 'notary',
    look: { body: 'man_old', wear: { hair_long: 'h_white', beard_pointed: 'h_white', hat_wide: 'black', doublet: 'black', collar_band: null, breeches: 'black', stockings: 'black', shoes: null } },
    greet: ['Kom je voor een akte, een testament of wat uitleg? Uitleg is gratis. Voor de rest betaal je.', 'Ik ben door de Raad van Brabant toegelaten, dus ik weet hoe de zaken hier in elkaar zitten. Vraag maar.', 'Je wilt iets weten. Dat zie ik aan je. Mensen die niets willen weten, lopen sneller.'],
  },
  {
    id: 'waard', name: 'Mattheus Ceulemans', role: 'waard van De Zwaan', faction: 'gilden', at: [-14, -112], stall: 'beer', glyph: '♣', label: 'Herberg De Zwaan', shop: 'waard', guide: 'inn',
    look: { body: 'man_stout', wear: { hair_thin: 'h_brown', moustache: 'h_brown', smock: 'linen', belt: null, breeches: 'russet', stockings: 'grey', clogs: null } },
    greet: ['Welkom in De Zwaan. Je vindt hier bier, een bed en een verteller die niet weet wanneer hij moet zwijgen.', 'Het bier is van hier, het bed is van mij, en de dobbelstenen zijn meestal eerlijk.', 'Ga zitten. Iedereen die hier binnenkomt, heeft een verhaal. Het jouwe begint aan de rivier, dat zie ik aan je gezicht.'],
    shopGreet: ['Diests bier: je drinkt het hier, of je drinkt het in Antwerpen voor het dubbele.'],
  },
  {
    id: 'infirmerie', name: 'Zuster Machteld', role: 'zalfmaakster van het Begijnhof', faction: 'kerk', at: [705, -341], stall: 'salves', glyph: '✚', label: 'Infirmerie',
    look: { body: 'woman_stout', wear: { hair_bun: 'h_brown', habit: 'beguine', beguine_veil: null, shoes: null }, prop: 'basket' },
    shop: 'infirmerie',
    greet: ['De infirmerie is voor de zieken van het hof. De zalf is voor wie ze nodig heeft. Dat ben jij, zo te zien.', 'Zuster Margriet zegt dat je te vertrouwen bent. Zuster Margriet zegt dat over weinig mensen.', 'Ga zitten. Nee, niet daar. Daar heeft een koe gezeten.'],
    shopGreet: ['Wat je betaalt, gaat naar de zieken, en jij gaat gezond naar huis. Dat is een goede ruil.'],
  },
  {
    id: 'sergeant', name: 'Sergeant Alonso Ruiz', role: 'kwartiermeester van het garnizoen', faction: 'kroon', at: [326, 556], stall: 'army', glyph: '⚔', label: 'Kwartiermeester', shop: 'sergeant',
    look: { body: 'man', wear: { hair_crop: 'h_black', moustache: 'h_black', morion: null, doublet: 'madder_dk', buff_coat: null, sash: 'madder', breeches: 'umber', stockings: 'grey', boots: null }, prop: 'musket' },
    greet: ['Geen soldaat dus, maar een burger met een draak. Voor mijn papieren is dat erger.', 'De koning betaalt laat. Ik verkoop wat de koning niet meer nodig heeft, aan wie op tijd betaalt.', 'Ik heb kolders, kurassen en morions. Het garnizoen heeft er meer dan mannen. Vraag me niet waarom.'],
    shopGreet: ['Dit is legergoed, een beetje gebruikt. Het gat in dit kuras zat er al in toen ik het kreeg, dat zweer ik.'],
  },
  {
    id: 'kastelein', name: 'Daneel Vander Borcht', role: 'kastelein van het Hof van Nassau', faction: 'oranje', at: [300, 128], stall: 'door', glyph: '♜', label: 'Hof van Nassau', shop: 'kastelein',
    look: { body: 'man_old', wear: { hair_thin: 'h_grey', beard_pointed: 'h_grey', hat_wide: 'umber', doublet: 'ochre', collar_band: null, breeches: 'brown', stockings: 'grey', shoes: null }, prop: 'lantern' },
    greet: ['Ik hou het huis warm voor een heer die nooit komt. Dat doe ik nu zevenendertig jaar. De sleutels zijn zwaarder geworden.', 'Dit is het Hof van Nassau. Het is van de prins, zeggen de papieren. De muizen wonen er al veel langer dan hij.', 'Je komt voor de baron? Die ligt in Den Haag in de wieg. Ik zal hem zeggen dat je er was.'],
    shopGreet: ['Dit is wat het Hof nog te verkopen heeft. Vraag de drossaard niet waar het geld naartoe gaat. Hij weet het zelf niet.'],
  },
  // ------------------------------------------------------------ gatekeepers
  {
    id: 'poort_antwerpen', name: 'Jaspar Jacobs', role: 'poortwachter, Schaluinpoort', faction: 'kroon', at: [-62, -690], stall: 'door', glyph: '⚑', label: 'Poortwachter', guide: 'gate', gate: 'Antwerpsepoort',
    look: { body: 'man', wear: { hair_crop: 'h_dark', beard_full: 'h_dark', morion: null, doublet: 'woad_dk', bandolier: null, breeches: 'grey', stockings: 'grey', boots: null }, prop: 'lantern' },
    greet: ['Dit is de Schaluinpoort. Noordwaarts liggen de Kempen, en wie lang genoeg loopt, komt in Antwerpen.', 'Halt. Nee, laat maar. Iemand met een draak hou ik niet tegen.', 'Bij valavond gaat de poort dicht. Sinds de klokken zwijgen, bepaal ik zelf wanneer dat is.'],
  },
  {
    id: 'poort_schaffen', name: 'Wouter Peeters', role: 'poortwachter, Schaffensepoort', faction: 'kroon', at: [575, -622], stall: 'door', glyph: '⚑', label: 'Poortwachter', guide: 'gate', gate: 'Schaffensepoort',
    look: { body: 'man_young', wear: { hair_crop: 'h_blond', morion: null, doublet: 'moss', bandolier: null, breeches: 'brown', stockings: 'grey', boots: null } },
    greet: ['Dit is de Schaffensepoort. Daarbuiten vind je heide, schapen, en wat er nog meer op de heide woont.', 'Kom je van de markt? Breng de volgende keer iets mee. Hier gebeurt al jaren niets.', 'Ik tel wie er binnenkomt. Jij telt dubbel, met dat beest.'],
  },
  {
    id: 'poort_koe', name: 'Lenaert Vos', role: 'wachter bij de oude Koepoort', faction: 'kroon', at: [724, 80], stall: 'door', glyph: '⚑', label: 'Muurwachter', guide: 'gate', gate: 'Koepoort',
    look: { body: 'man_stout', wear: { hair_thin: 'h_grey', moustache: 'h_grey', hat_wide: 'umber', doublet: 'russet', breeches: 'umber', stockings: 'grey', boots: null }, prop: 'stick' },
    greet: ['De oude Koepoort is al lang dichtgemetseld. Van op de muur tel ik de koeien in het Broek, twee keer per dag.', 'Achter de muur ligt het Broek. Bij dag is het mooi. Bij nacht is het alsof het Broek mij telt.', 'Je ruikt naar draak. Dat is een nieuwe geur aan deze muur, en ik ken ze allemaal.'],
  },
  {
    id: 'poort_maastricht', name: 'Andries Wouters', role: 'poortwachter, Beverenpoort', faction: 'kroon', at: [338, 594], stall: 'door', glyph: '⚑', label: 'Poortwachter', guide: 'gate', gate: 'Maastrichtsepoort',
    look: { body: 'man', wear: { hair_long: 'h_dark', moustache: 'h_dark', morion: null, doublet: 'madder_dk', bandolier: null, breeches: 'grey', stockings: 'grey', boots: null } },
    greet: ['Dit is de Beverenpoort. Je betaalt tol op wijn, zout en alles wat wielen heeft. Een draak heeft geen wielen. Daar wordt nog over vergaderd.', 'De weg loopt van hier naar Hasselt en Maastricht. Pas op in de moerassen bij Webbekom.', 'Het garnizoen ligt hier vlakbij. Als je de soldaten hoort zingen, zing dan niet mee: ze kennen de woorden niet.'],
  },
  {
    id: 'poort_leuven', name: 'Jacob Smets', role: 'poortwachter, Putterstraatpoort', faction: 'kroon', at: [-108, 368], stall: 'door', glyph: '⚑', label: 'Poortwachter', guide: 'gate', gate: 'Leuvensepoort',
    look: { body: 'man_young', wear: { hair_crop: 'h_chestnut', morion: null, doublet: 'woad', bandolier: null, breeches: 'woad_dk', stockings: 'grey', boots: null } },
    greet: ['Dit is de Putterstraatpoort. Van hier ga je naar Leuven en de universiteit, en verder naar Brussel en de landvoogd.', 'Wouter de tollenaar staat daar. Hij telt en ik kijk. Met ons tweeën zijn we een poort.', 'De weg naar Leuven is goed. De weg terug ook, als je geen advocaat bent.'],
  },
  {
    id: 'poort_allerheiligen', name: 'Hendrik Coeckx', role: 'poortwachter, Allerheiligenpoort', faction: 'kroon', at: [-310, 66], stall: 'door', glyph: '⚑', label: 'Poortwachter', guide: 'gate', gate: 'Allerheiligenpoort',
    look: { body: 'man_old', wear: { hair_thin: 'h_white', beard_full: 'h_white', hat_wide: 'brown', doublet: 'grey', breeches: 'brown', stockings: 'grey', boots: null }, prop: 'stick' },
    greet: ['Dit is de Allerheiligenpoort. Westwaarts ga je langs de Demer naar Aarschot, of naar Scherpenheuvel als je wilt bidden.', 'Ik sta hier al dertig jaar. Ik heb legers zien komen en gaan. Een draak had ik nog niet gezien.', 'De kapel daarbuiten is voor reizigers. Bid er voor je vertrekt. Het kost niets.'],
  },
  {
    id: 'poort_demer', name: 'Pauwel Geens', role: 'wachter van de waterpoort op de Demer', faction: 'kroon', at: [-298, -56], stall: 'door', glyph: '⚑', label: 'Poortwachter', guide: 'gate', gate: 'Demerpoort',
    look: { body: 'man', wear: { hair_crop: 'h_red', beard_pointed: 'h_red', morion: null, doublet: 'slate', bandolier: null, breeches: 'grey', stockings: 'grey', boots: null } },
    greet: ['Dit is de waterpoort op de Demer. Hier komt de rivier de stad binnen, met alles wat ze meebrengt.', 'Ik bewaak een poort waar geen mens door kan. Alleen het water komt erdoor.', 'Die nacht stond het water een el hoger dan het mocht. En het had niet geregend, geen druppel.'],
  },
  // ------------------------------------------------------------ Scherpenheuvel
  {
    id: 'tekens', name: 'Lysken Mols', role: 'verkoopster van tinnen tekens', faction: 'kerk', at: [-5032, 568], stall: 'badges', glyph: '✪', label: 'Pelgrimstekens', shop: 'tekens',
    look: { body: 'woman', wear: { hair_bun: 'h_red', coif: null, bodice: 'woad', kerchief: null, pelerine: 'grey', skirt: 'russet', clogs: null }, prop: 'basket' },
    greet: ['Ik verkoop tekens van Onze-Lieve-Vrouw, in tin, in lood, en in zilver voor wie het kan betalen.', 'Truyken verkoopt vooral beeldjes, en ik vooral tekens. We zijn concurrenten, en we zijn ook nichten.', 'Met een teken op je hoed weet iedereen waar je geweest bent. Met een draak naast je kijkt niemand nog naar je hoed.'],
    shopGreet: ['Draag het op je hart of op je hoed. In je zak mag ook, maar dan ziet niemand het.'],
  },
  {
    id: 'pelgrimsgids', name: 'Pater Willem Pauwels', role: 'oratoriaan en gids voor de pelgrims', faction: 'kerk', at: [-5032, 478], stall: 'door', glyph: '✝', label: 'Pelgrimsgids', guide: 'pilgrims',
    look: { body: 'man', wear: { hair_thin: 'h_brown', skullcap: 'black', habit: 'black', bands: null, shoes: null }, prop: 'rosary' },
    greet: ['Welkom op de Scherpenheuvel. Je komt om te bidden, te kijken of te vliegen. Dat mag alle drie.', 'De pelgrims gaan biddend rond de kerk, zo is het gebruik. Met een draak is dat snel gedaan.', 'Ik leg uit wat hier staat en waarom. De overste legt uit wat het kost.'],
  },
];

/** The notice board on the market. */
export const BOARD = { id: 'aanplakbord', name: 'Het aanplakbord', at: [-33, 87] as [number, number], glyph: '☰', label: 'Aanplakbord' };

/** Named people from diest.ts who belong to a party (and Marieke's shop). */
export const NPC_FACTION: Record<string, FactionId> = {
  pieter: 'kerk', marieke: 'vrije', joos: 'gilden', aleydis: 'kerk', drossaard: 'oranje', wouter: 'kroon',
  lijsbet: 'vrije', gielis: 'vrije', driesen: 'vrije', truyken: 'kerk', provost: 'kerk',
};
export const MARIEKE = { id: 'marieke', shop: 'marieke', glyph: '⚖', label: 'Marskraamster' };

/** What finishing a quest does for your standing, beyond the standing its reward names (by outcome). */
export const QUEST_STANDING: Record<string, [FactionId, number][] | Record<string, [FactionId, number][]>> = {
  main_bells: [['kerk', 8]],
  main_kludde: [['kerk', 10], ['gilden', 6]],
  side_herbs: [['kerk', 3]],
  side_roelof: [['kroon', 8], ['vrije', 5]],
  side_wisps: [['kerk', 4]],
  contract_letter: [['oranje', 6]],
  walk_diest: [['gilden', 6]],
  side_seals: {
    reported: [['gilden', 6], ['oranje', 5], ['vrije', -4]],
    begijnhof: [['kerk', 6], ['gilden', -2]],
    warned: [['vrije', 8], ['gilden', -3], ['kroon', -2]],
  },
  side_toll: {
    paid: [['kroon', 6]],
    bribed: [['vrije', 8], ['kroon', -5]],
    seized: [['kroon', 8], ['vrije', -5]],
  },
  // Het Oude Volk (src/content/oudevolk.ts): helping them costs you with De Kerk, and the other way round
  ov_tekens: [['oudevolk', 10]],
  ov_eik: [['oudevolk', 12], ['kerk', -4]],
  ov_broek: [['oudevolk', 14]],
  ov_dof: {
    volk: [['oudevolk', 22], ['kerk', -10]],
    kerk: [['kerk', 12], ['oudevolk', -6]],
    genoemd: [['kerk', 16], ['oudevolk', -30]],
  },
  ov_leuven: [['oudevolk', 10]],
};

// ===================================================================== wares
/** Cloak dyes (the period's dyestuffs). */
const DYES: [string, string, string, number, number][] = [
  // id, name, colour, price, tier
  ['dye_meekrap', 'Meekraprood', '#8c2a1e', 4, 0],
  ['dye_wede', 'Wedeblauw', '#33507a', 4, 0],
  ['dye_russet', 'Roestbruin', '#6e4630', 3, 0],
  ['dye_wouw', 'Wouwgeel', '#b89040', 6, 1],
  ['dye_groen', 'Groen van wede en wouw', '#4e6a38', 8, 1],
  ['dye_rose', 'Rozerood', '#a8584a', 8, 2],
  ['dye_zwart', 'Diepzwart', '#1e1c20', 14, 2],
  ['dye_violet', 'Violet', '#5a3a62', 16, 3],
  ['dye_scharlaken', 'Scharlaken', '#b0201a', 24, 4],
];

export const GOODS: Record<string, Good[]> = {
  bakker: [
    { id: 'roggebrood', name: 'Roggebrood', text: 'In een gevecht herstel je er langzaam mee. Je steekt het in je tas.', price: 2, use: { regen: 0.015, secs: 30 } },
    { id: 'krentenbrood', name: 'Krentenbrood', text: 'Het is zoeter en het helpt sneller. Je steekt het in je tas.', price: 4, use: { regen: 0.022, secs: 30 } },
    { id: 'wafel', name: 'Wafel', text: 'Je voelt je meteen een beetje beter. Een wafel bewaart niemand voor later.', price: 1, use: { heal: 0.2 } },
    { id: 'vleespastei', name: 'Vleespastei', text: 'Voor wie gaat vechten: je herstelt er veel mee, gespreid over een halve minuut.', price: 8, tier: 1, use: { regen: 0.03, secs: 30 } },
    { id: 'peperkoek', name: 'Peperkoek met honing', text: 'Alleen voor de beste klanten van het ambacht. Je herstelt er bijna helemaal mee.', price: 14, tier: 3, use: { regen: 0.04, secs: 30 } },
  ],
  kruiden: [
    { id: 'zalf', name: 'Zalf', text: 'Wondzalf in een potje. Je smeert ze met Q.', price: 5, use: { salve: 1 } },
    { id: 'zalf3', name: 'Drie potjes zalf', text: 'Zo betaal je minder per potje.', price: 13, tier: 1, use: { salve: 3 } },
    { id: 'kamille', name: 'Aftreksel van kamille', text: 'Je herstelt er een halve minuut lang mee. Het gaat mee in je tas.', price: 2, use: { regen: 0.015, secs: 30 } },
    { id: 'alsem', name: 'Alsem in brandewijn', text: 'Het smaakt bitter. Je voelt de klappen een paar minuten lang minder.', price: 6, tier: 1, use: { buff: 'moed', secs: 180 } },
    { id: 'duivelsdrek', name: 'Duivelsdrek', text: 'Het stinkt zo erg dat de Kludde je niet wil, in welke gedaante hij ook komt. Dat zeggen de boeren. Je voelt je er in elk geval dapperder door.', price: 10, tier: 2, use: { buff: 'moed', secs: 420 } },
  ],
  infirmerie: [
    { id: 'zalf', name: 'Begijnenzalf', text: 'Je krijgt er de helft van je levenskracht mee terug. Gebruik ze met Q (gamepad: kruistoets omlaag).', price: 6, use: { salve: 1 } },
    { id: 'zalf3', name: 'Drie potjes begijnenzalf', text: 'Voor wie veel vecht, of voor wie slecht vecht.', price: 15, use: { salve: 3 } },
    { id: 'verzorging', name: 'Laat je verzorgen', text: 'Een zuster verbindt je wonden. Daarna ben je helemaal hersteld.', price: 2, use: { heal: 1 } },
    { id: 'wijwater', name: 'Gewijd water', text: 'Een zegen voor onderweg: tien minuten lang komen de klappen minder hard aan.', price: 6, tier: 1, use: { buff: 'zegen', secs: 600 } },
    { id: 'zalf5', name: 'Vijf potjes, voor een vriend van het hof', text: 'Dit is alleen voor wie het Begijnhof geholpen heeft.', price: 20, tier: 2, use: { salve: 5 } },
    { id: 'rozenkrans', name: 'Rozenkrans van het Begijnhof', text: 'Een talisman. De zusters zeggen dat bidden helpt. Taaiheid helpt ook.', price: 30, tier: 3, use: { talisman: 'rozenkrans_begijn' } },
  ],
  drukker: [
    { id: 'kaart_diest', name: 'Plattegrond van Diest', text: 'Een gravure van de stad, met de kerken, de poorten en de Warande. Je ziet ze daarna op je kaart.', price: 8, use: { reveal: ['Lakenhalle', 'Stadhuis Diest', 'Hof van Nassau', 'Den Drossaerd', 'Ruïne Warandekasteel', 'Tafelrondmotte', 'Onze-Lieve-Vrouwekerk', 'Sint-Catharinakerk', 'Refugiehuis van Averbode', 'Het Spijker - Refugiehuis van Tongerlo'] } },
    { id: 'kaart_poorten', name: 'De poorten van Diest', text: 'Een prent met alle poorten van Diest en de wegen die er vertrekken. Je ziet ze daarna op je kaart.', price: 6, use: { reveal: ['Antwerpsepoort', 'Schaffensepoort', 'Koepoort', 'Maastrichtsepoort', 'Leuvensepoort', 'Allerheiligenpoort', 'Demerpoort'] } },
    { id: 'kaart_demer', name: 'Kaart van het Demerdal', text: 'De dorpen en kapellen rond Diest, en de Galgenberg van Kaggevinne. Je ziet ze daarna op je kaart.', price: 10, tier: 1, use: { reveal: ['Webbekom', 'Sint-Trudokerk', 'Kaggevinne', 'Veldkapel Galgeberg', 'Allerheiligenkapel'] } },
    { id: 'prent_scherpenheuvel', name: 'Prent van Scherpenheuvel', text: 'De zevenhoekige stad, met de kerk in het midden. Dit is een bladzijde voor je Kroniek.', price: 6, use: { kroniek: ['tijd:zeven', 'plaats:Scherpenheuvel'] } },
    { id: 'almanak', name: 'Almanak voor het jaar 1650', text: 'Hierin staan de feestdagen, de jaarmarkten, het weer, en wanneer je moet aderlaten. Dit is een bladzijde voor je Kroniek.', price: 3, use: { kroniek: ['tijd:almanak'] } },
    { id: 'liedblad', name: 'Liedblad: De Kludde van het Broek', text: 'Een lied voor op de markt, met een prent erbij. Dit is een bladzijde voor je Kroniek.', price: 2, use: { kroniek: ['wezen:kludde'] } },
    { id: 'pamflet_vrede', name: 'Pamflet over de vrede van Munster', text: 'Wat er in 1648 getekend is, en wat niet. Dit is een bladzijde voor je Kroniek.', price: 3, use: { kroniek: ['tijd:vrede'] } },
    { id: 'berchmans', name: 'Het leven van Jan Berchmans', text: 'Een dun boekje over de schoenmakerszoon van Diest die in Rome als een heilige stierf. Dit is een bladzijde voor je Kroniek.', price: 4, use: { kroniek: ['tijd:berchmans'] } },
    { id: 'tijdingen', name: 'Tijdingen uit de wereld', text: 'Een nieuwsblad uit Antwerpen, met berichten uit Engeland, Frankrijk en Portugal. Dit is een bladzijde voor je Kroniek.', price: 4, tier: 1, use: { kroniek: ['tijd:wereld'] } },
    { id: 'wapenboek', name: 'Wapenboek van de Nassaus', text: 'Hoe de heren van Diest prinsen van Oranje werden. Dit is een bladzijde voor je Kroniek.', price: 9, tier: 2, use: { kroniek: ['tijd:nassau'] } },
  ],
  kleermaker: DYES.map(([id, name, hex, price, tier]) => ({ id, name: `Verf: ${name}`, text: 'Hiermee verf je je mantel in deze kleur.', price, tier, use: { cloak: hex } })),
  waard: [
    { id: 'pint', name: 'Een pint Diests bier', text: 'Drie minuten lang voel je de klappen wat minder.', price: 1, use: { buff: 'moed', secs: 180 } },
    { id: 'hutsepot', name: 'Een kom hutsepot', text: 'Het is warm eten. Je bent meteen helemaal hersteld.', price: 3, use: { heal: 1 } },
    { id: 'kamer', name: 'Een bed voor de nacht', text: 'Je rust uit: helemaal hersteld, en een kwartier lang herstel je vanzelf, ook in een gevecht.', price: 4, use: { buff: 'uitgerust', secs: 900 } },
    { id: 'brandewijn', name: 'Een glas brandewijn', text: 'Hier is geen accijns op betaald, fluistert de waard. Je hebt er tien minuten moed van.', price: 4, tier: 2, use: { buff: 'moed', secs: 600 } },
  ],
  tekens: [
    { id: 'wijwater', name: 'Flesje wijwater', text: 'Gewijd aan het altaar. Een kwartier lang komen de klappen minder hard aan.', price: 4, use: { buff: 'zegen', secs: 900 } },
    { id: 'insigne', name: 'Tinnen insigne van Scherpenheuvel', text: 'Een talisman die je op je hoed speldt.', price: 8, use: { talisman: 'insigne_tin' } },
    { id: 'vaantje', name: 'Papieren bedevaartsvaantje', text: 'Een prentje van Onze-Lieve-Vrouw. Dit is een bladzijde voor je Kroniek.', price: 2, use: { kroniek: ['tijd:bedevaart'] } },
    { id: 'eikbeeld', name: 'Beeldje uit eikenhout', text: 'Het is niet van de echte eik, zegt Lysken eerlijk, maar wel van een goede.', price: 22, tier: 1, use: { talisman: 'beeldje_eik' } },
    { id: 'zilver', name: 'Zilveren insigne', text: 'Alleen voor wie goed staat bij de Kerk.', price: 45, tier: 2, use: { talisman: 'insigne_zilver' } },
    { id: 'gewijd', name: 'Gewijd insigne', text: 'Het heeft het altaar aangeraakt, op de plek waar de eik stond. Alleen voor de vrienden van de overste.', price: 80, tier: 3, use: { talisman: 'insigne_gewijd' } },
  ],
  marieke: [
    { id: 'zalf', name: 'Begijnenzalf', text: 'Je krijgt er de helft van je levenskracht mee terug. Gebruik ze met Q (gamepad: kruistoets omlaag).', price: 6, use: { salve: 1 } },
    { id: 'wafel', name: 'Wafel', text: 'Ze heeft er altijd een paar in haar mand. Niemand weet waarom.', price: 1, use: { heal: 0.2 } },
  ],
  kastelein: [
    { id: 'wapenboek', name: 'Wapenboek van de Nassaus', text: 'Hoe de heren van Diest prinsen van Oranje werden. De bladzijde over 1568 is eruit gescheurd. Dit is een bladzijde voor je Kroniek.', price: 8, use: { kroniek: ['tijd:nassau'] } },
    { id: 'kaart_diest', name: 'Oude plattegrond van de baronie', text: 'Getekend voor de vorige prins, maar de straten kloppen nog. Je ziet de plaatsen van Diest daarna op je kaart.', price: 7, use: { reveal: ['Lakenhalle', 'Stadhuis Diest', 'Hof van Nassau', 'Den Drossaerd', 'Ruïne Warandekasteel', 'Tafelrondmotte', 'Onze-Lieve-Vrouwekerk', 'Sint-Catharinakerk', 'Refugiehuis van Averbode', 'Het Spijker - Refugiehuis van Tongerlo'] } },
    { id: 'penning', name: 'Penning van Nassau', text: 'Een koperen penning met de jachthoorn van Oranje. Een talisman voor wie goed staat bij het Hof.', price: 30, tier: 2, use: { talisman: 'penning_nassau' } },
  ],
  sergeant: [
    { id: 'kruit', name: 'Een slok uit de veldfles', text: 'Dit geeft je vijf minuten lang de moed van een soldaat.', price: 2, use: { buff: 'moed', secs: 300 } },
  ],
};

/** Talismans sold in Scherpenheuvel and at the Begijnhof. */
export const TALISMANS: Record<string, { name: string; rarity: 0 | 1 | 2; mods: Record<string, number>; text: string }> = {
  insigne_tin: { name: 'Tinnen insigne', rarity: 0, mods: { taaiheid: 2 }, text: 'Het is zevenhoekig, zoals de kerk. Het blinkt als het regent.' },
  beeldje_eik: { name: 'Eikenhouten beeldje', rarity: 1, mods: { klank: 3, hp: 10 }, text: 'Gesneden door een man die zegt dat hij de eik nog gekend heeft.' },
  insigne_zilver: { name: 'Zilveren insigne', rarity: 1, mods: { taaiheid: 3, hp: 18 }, text: 'Zilver uit Antwerpen, gegoten in Scherpenheuvel.' },
  insigne_gewijd: { name: 'Gewijd insigne', rarity: 2, mods: { taaiheid: 4, klank: 4, hp: 25 }, text: 'Het heeft het altaar aangeraakt waar de eik stond. Het voelt warmer aan dan tin hoort te zijn.' },
  penning_nassau: { name: 'Penning van Nassau', rarity: 1, mods: { list: 3, kracht: 2, hp: 12 }, text: 'De jachthoorn van Oranje, geslagen in koper. In Diest draag je hem onder je hemd.' },
  rozenkrans_begijn: { name: 'Rozenkrans van het Begijnhof', rarity: 2, mods: { taaiheid: 3, hp: 30, list: 2 }, text: 'Vijftig kralen van palmhout. Een zuster heeft op elke kraal voor je gebeden, zegt ze.' },
};

/** What gear each smith and tailor shows: [slot, rarity floor by tier]. */
export const GEAR_STOCK: Record<string, { slot: 'wapen' | 'harnas' | 'talisman' | null; count: number }> = {
  smid: { slot: 'wapen', count: 3 },
  kleermaker: { slot: 'harnas', count: 2 },
  sergeant: { slot: 'harnas', count: 3 },
  marieke: { slot: null, count: 4 },
};

/** Their best piece, for the highest standing. */
export const SPECIALS: Record<string, { tier: number; base: 'wapen' | 'harnas'; name: string; text: string }[]> = {
  smid: [
    { tier: 3, base: 'wapen', name: 'Diestse slagdegen', text: 'Gesmeed voor de kolveniers van Diest. Bosmans verkoopt er één per jaar.' },
    { tier: 4, base: 'wapen', name: 'Gillis\' meesterstuk', text: 'Het zwaard waarmee hij meester werd. Hij verkoopt het aan niemand, behalve aan jou.' },
  ],
  kleermaker: [{ tier: 3, base: 'harnas', name: 'Gevoerd wambuis van Diests laken', text: 'Drie lagen laken en een vierde van leer. Aan de zoom hangt het loden zegel van de stad.' }],
  sergeant: [{ tier: 3, base: 'harnas', name: 'Kuras van een kapitein', text: 'Van een kapitein die het niet meer nodig had. Vraag niet waarom.' }],
};

// ===================================================================== Kroniek pages
export const PAGES: Page[] = [
  { id: 'tijd:oorlog', cat: 'tijd', truth: 'geschiedenis', title: 'De oorlog met Frankrijk', hint: 'Vraag de notaris naar de oorlog.',
    text: 'Sinds 1635 vecht de koning van Spanje tegen Frankrijk, ook nadat hij in 1648 vrede sloot met de Republiek. De legers trekken door Artois, Henegouwen en Vlaanderen, en wie ze betaalt, betaalt ook voor hun plunderingen. Brabant ligt net achter het front: ver genoeg voor rust, dichtbij genoeg voor deserteurs.' },
  { id: 'tijd:ambachten', cat: 'tijd', truth: 'geschiedenis', title: 'De ambachten', hint: 'Vraag de notaris naar de gilden.',
    text: 'Wie in de stad een beroep wil uitoefenen, moet meester zijn in het ambacht: eerst leerjongen, dan gezel, dan een meesterproef en een flinke som geld. Het ambacht bepaalt wie mag werken, hoeveel, en hoe goed. Het beschermt zijn leden. Wie geen lid is, zoals een weduwe zonder recht, beschermt het niet.' },
  { id: 'tijd:begijnen', cat: 'tijd', truth: 'geschiedenis', title: 'De begijnen', hint: 'Vraag naar de begijnen.',
    text: 'Begijnen zijn vrome vrouwen die samen leven zonder eeuwige geloften: ze mogen het hof verlaten en trouwen. Ze verdienen hun brood met spinnen, weven en de zorg voor zieken, en elk hof heeft zijn eigen infirmerie. Dat ze geen kloosterzusters zijn, maakte hen eeuwenlang verdacht bij de Kerk en geliefd bij het volk.' },
  { id: 'tijd:geld', cat: 'tijd', truth: 'geschiedenis', title: 'Geld', hint: 'Vraag naar het geld.',
    text: 'Men rekent in guldens van twintig stuivers, die het volk ook florijnen noemt. Maar in de beurs zitten munten van overal: Spaanse realen, Brabantse patakons, Hollandse daalders, en veel kopergeld. De wisselaar weegt ze en weet wat elk waard is. Een dagloner verdient tien tot twaalf stuivers per dag, als hij werk heeft.' },
  { id: 'tijd:bestuur', cat: 'tijd', truth: 'geschiedenis', title: 'Wie er de baas is', hint: 'Vraag naar de drossaard en de schepenen.',
    text: 'Diest heeft een heer, de baron, en die is de prins van Oranje. Zijn drossaard bewaart de orde en int de boetes. De schepenen besturen de stad en spreken recht. Boven hen staat de hertog van Brabant, en dat is de koning van Spanje. Zijn Raad van Brabant in Brussel beslist als ze het oneens zijn. Dat zijn ze vaak.' },
  { id: 'tijd:almanak', cat: 'tijd', truth: 'geschiedenis', title: 'De almanak', hint: 'Koop een almanak bij de boekverkoper.',
    text: 'Elk jaar drukken de drukkers in Antwerpen en Leuven een almanak: de feestdagen, de jaarmarkten, de stand van de maan, het weer dat komt en de beste dagen om ader te laten. Het weer klopt zelden. Iedereen koopt hem toch, want waar staat anders wanneer de jaarmarkt is?' },
  { id: 'tijd:wereld', cat: 'tijd', truth: 'geschiedenis', title: 'Tijdingen uit de wereld', hint: 'Luister naar de omroeper of koop een nieuwsblad.',
    text: 'In Engeland hebben ze vorig jaar, in 1649, hun koning Karel onthoofd. In Frankrijk staan de edelen op tegen kardinaal Mazarin, en de prins van Condé zit sinds januari gevangen. Portugal vecht al tien jaar voor een eigen koning, los van Spanje. Het nieuws komt via Antwerpen, in gedrukte bladen, een week of drie te laat.' },
  { id: 'tijd:nassau', cat: 'tijd', truth: 'geschiedenis', title: 'De Nassaus en Diest', hint: 'Vraag naar de prins van Oranje.',
    text: 'In 1499 kwam de baronie Diest aan het huis Nassau, en zo werd Willem van Oranje er heer van. Zijn oudste zoon, Filips Willem, groeide op in Spanje en bleef katholiek. Hij stierf in 1618 en ligt begraven in de Sint-Sulpitiuskerk. Zijn broers in het noorden voerden oorlog tegen de koning. Zo is Diest: een stad van twee heren.' },
  { id: 'tijd:markt', cat: 'tijd', truth: 'geschiedenis', title: 'Marktdag', hint: 'Praat met de mensen op de Grote Markt.',
    text: 'Op marktdag komen de boeren met boter, eieren, kaas en groenten de poort door, en betalen er tol voor. De stad keurt de gewichten en zet de prijs van het brood vast. Wie vals weegt, staat aan de kaak. Wie niet van de stad is, mag pas verkopen als de poorters gekocht hebben.' },
  { id: 'tijd:huisnamen', cat: 'tijd', truth: 'geschiedenis', title: 'Huizen met een naam', hint: 'Bekijk een uithangbord in de straten.',
    text: 'Huizen hebben geen nummers. Ze hebben namen: De Zwaan, Het Hert, De Gulden Hoorn. De naam hangt op een bord of staat in een steen boven de deur, en zo vind je iemand: "de bakker in De Drie Koningen". De namen in deze straten hebben wij verzonnen, maar dat er zulke namen hingen, is echt.' },
  { id: 'tijd:kapelletjes', cat: 'tijd', truth: 'geschiedenis', title: 'Kapelletjes', hint: 'Bid bij een kapelletje in de stad.',
    text: 'Aan straathoeken, in een nis in de gevel of op een paal langs de weg, staat een Mariabeeldje of een heilige. Buren zetten er bloemen en kaarsen bij en bidden er voor een zieke of een reis. In Brabant zijn er duizenden. Elk heeft zijn eigen verhaal, en de helft ervan is waar.' },
  { id: 'tijd:putten', cat: 'tijd', truth: 'geschiedenis', title: 'Water', hint: 'Drink uit een put in de stad.',
    text: 'Water haal je uit de put op het plein of in de buurt, en wie een put deelt, deelt ook het onderhoud en de ruzie. Wie het kan betalen, drinkt bier, dat veiliger is. De Demer is voor de molens, de looiers en de vuilnis, en niet om uit te drinken.' },
  { id: 'tijd:poorten', cat: 'tijd', truth: 'geschiedenis', title: 'De poorten', hint: 'Spreek met een poortwachter.',
    text: 'De poorten gaan open bij dageraad en dicht bij valavond, op het teken van de poortklok. Aan de poort wordt tol geheven en wordt gekeken wie er binnenkomt: in oorlogstijd is dat een zaak van leven en dood. Wie na sluitingstijd aankomt, wacht tot de ochtend, of betaalt de wachter.' },
  { id: 'tijd:herberg', cat: 'tijd', truth: 'geschiedenis', title: 'De herberg', hint: 'Ga binnen in herberg De Zwaan.',
    text: 'In de herberg slapen reizigers, drinken de buren en worden zaken gedaan. De waard betaalt accijns op elk vat, en de stad houdt in de gaten wie er tot laat zit. Dobbelen om geld is verboden. Dat het verboden is, staat op een bord aan de muur, vlak boven de tafel waar gedobbeld wordt.' },
  { id: 'tijd:stadswandeling', cat: 'tijd', truth: 'verzonnen', title: 'Een wandeling door Diest', hint: 'Vraag de omroeper naar een wandeling.',
    text: 'Rondleidingen voor vreemdelingen bestonden in 1650 niet: wie een stad wilde zien, vroeg het aan een herbergier of een koster. Deze wandeling hebben wij bedacht. De haltes en wat je erover hoort, zijn wel echt.' },
  // folk tales (the creatures people believed in)
  { id: 'wezen:nekker', cat: 'wezen', truth: 'volksverhaal', title: 'De Nekker', hint: 'Laat een oude man of vrouw een verhaal vertellen.',
    text: 'Een watergeest die in rivieren, grachten en putten woont en kinderen die te dicht bij de rand komen het water in trekt. Moeders noemden hem om hun kinderen bij het water weg te houden. Dat werkte beter dan uitleggen waarom.' },
  { id: 'wezen:alvermannekes', cat: 'wezen', truth: 'volksverhaal', title: 'Alvermannekes', hint: 'Laat een oude man of vrouw een verhaal vertellen.',
    text: 'Kleine mannetjes die in heuvels en oude grafheuvels wonen en \'s nachts het werk van boeren en ambachtslui afmaken, als je ze met rust laat en een kom pap neerzet. Wie ze bespiedt of uitlacht, vindt de volgende ochtend alles stuk.' },
  { id: 'wezen:weerwolf', cat: 'wezen', truth: 'volksverhaal', title: 'De weerwolf', hint: 'Laat een oude man of vrouw een verhaal vertellen.',
    text: 'Een mens die \'s nachts een wolvenvel omdoet en als wolf over de velden gaat. Je herkent hem overdag aan een wonde op dezelfde plek waar je de wolf geslagen hebt. In heel Brabant vertelde men het, en in sommige streken werd er ook voor terechtgestaan.' },
  { id: 'wezen:oschaert', cat: 'wezen', truth: 'volksverhaal', title: 'De Oschaert', hint: 'Laat iemand in de herberg een verhaal vertellen.',
    text: 'De Oschaert van Hamme, bij Dendermonde, is een geest met gloeiende ogen die op de rug van schuldige reizigers springt en zwaarder wordt bij elke stap, tot ze bij de rand van het water neervallen. Hoe je van hem afkomt, vertellen ze in elk dorp anders. Dat je van hem afkomt, vertellen ze overal.' },
];

// ===================================================================== the notary's topics
export const TOPICS: Topic[] = [
  { id: 'oorlog', ask: 'De oorlog', page: 'tijd:oorlog', truth: 'geschiedenis',
    answer: 'Met de Republiek is het vrede, sinds Munster. Met Frankrijk is het nog altijd oorlog: die duurt al sinds 1635 en niemand weet hoe hij moet ophouden. Daarom liggen er soldaten in de stad, en daarom lopen er deserteurs op de wegen.' },
  { id: 'oranje', ask: 'De prins van Oranje', page: 'tijd:nassau', truth: 'geschiedenis',
    answer: 'De baron van Diest is de prins van Oranje, al sinds Diest in 1499 aan de Nassaus kwam. Filips Willem, de zoon van de Zwijger, ligt hier in de Sint-Sulpitius begraven. En nu is de jonge prins Willem aan de pokken gestorven, en zijn zoon is pas na zijn dood geboren. Onze heer ligt in de wieg.' },
  { id: 'gilden', ask: 'De gilden en ambachten', page: 'tijd:ambachten', truth: 'geschiedenis',
    answer: 'Eerst ben je leerjongen, dan gezel, dan meester. Wie geen meester is in het ambacht, mag het niet uitoefenen, en daarmee uit. Dat beschermt de kwaliteit, zeggen de dekens. Dat beschermt de dekens, zeggen de anderen. Ze hebben allebei gelijk.' },
  { id: 'klokken', ask: 'De klokken', page: 'tijd:klokken', truth: 'geschiedenis',
    answer: 'Er is de werkklok, de poortklok en de banklok, en de kerk luidt voor de getijden en de doden. Wie ze niet hoort, weet niet wanneer de poort dichtgaat of wanneer de markt begint. Een stad zonder klokken is een stad zonder afspraken.' },
  { id: 'begijnen', ask: 'De begijnen', page: 'tijd:begijnen', truth: 'geschiedenis',
    answer: 'Het zijn vrome vrouwen zonder eeuwige geloften. Ze mogen het hof verlaten en trouwen, en dat doen er ook een paar. De rest spint, weeft en verzorgt zieken. Voor een notaris is dat boeiend: ze zijn geen nonnen, maar ook niet helemaal van de stad.' },
  { id: 'geld', ask: 'Het geld', page: 'tijd:geld', truth: 'geschiedenis',
    answer: 'Een gulden is twintig stuivers; het volk zegt florijn. Maar in je beurs zitten realen, patakons en daalders door elkaar. Laat een wisselaar ze wegen voor je iets groots koopt. En als iemand je natte munten geeft, neem ze dan niet aan.' },
  { id: 'garnizoen', ask: 'Het garnizoen', page: 'tijd:garnizoen', truth: 'geschiedenis',
    answer: 'Het zijn soldaten van de koning, ingekwartierd bij de burgers. De burger levert bed, vuur, licht en zout. De koning levert de soldij, als hij eraan denkt. Wie te lang op zijn soldij wacht, gaat ze zelf halen bij de boeren.' },
  { id: 'schutters', ask: 'De schutterij', page: 'tijd:schutters', truth: 'geschiedenis',
    answer: 'Sint-Sebastiaan schiet met de handboog, en de kolveniers schieten met het vuurroer. Ze bewaken de muren als het moet en schieten de gaai als het niet moet. Wie de gaai afschiet, is een jaar lang koning, en betaalt de drank.' },
  { id: 'bestuur', ask: 'De drossaard en de schepenen', page: 'tijd:bestuur', truth: 'geschiedenis',
    answer: 'De drossaard is de man van de baron. De schepenen zijn de mannen van de stad. Ze spreken samen recht, en ze zijn het zelden eens. Als het echt misloopt, gaat het naar de Raad van Brabant in Brussel. Daar verdien ik mijn brood.' },
  { id: 'demer', ask: 'De Demer', page: 'tijd:demer', truth: 'geschiedenis',
    answer: 'De rivier drijft de molens, voert het bier naar Mechelen en neemt de vuilnis mee. In natte jaren staat het Broek blank tot aan de muur. Wat de mensen dan uit het water zien komen, schrijf ik niet op. Wat erin verdwijnt, schrijf ik wel op, want ik ben notaris.' },
  { id: 'bedevaart', ask: 'Scherpenheuvel', page: 'tijd:bedevaart', truth: 'geschiedenis',
    answer: 'De aartshertogen lieten daar een kerk en een hele stad bouwen, rond de plek waar een eik met een Mariabeeldje stond. Nu komt half Brabant er te voet naartoe. Het ligt naar het westen, langs de weg naar Aarschot. Met een draak ben je er voor je "Weesgegroet" kunt zeggen.' },
  { id: 'berchmans', ask: 'Jan Berchmans', page: 'tijd:berchmans', truth: 'geschiedenis',
    answer: 'Hij was de zoon van een schoenmaker hier, geboren in 1599. Hij werd jezuïet en stierf in 1621 in Rome, tweeëntwintig jaar oud. Ze willen hem heilig verklaren. Zijn vader heeft zijn schoenen nog verzoold, zeggen ze. Dat is geen bewijs, maar het is wel een mooi verhaal.' },
  { id: 'kaak', ask: 'Het recht en de kaak', page: 'tijd:kaak', truth: 'geschiedenis',
    answer: 'Voor kleine misdaden krijg je een boete of de kaak, een dag lang te kijk op de markt. Voor grote misdaden is er verbanning of de galg. Het meeste recht wordt niet gesproken maar geschikt, bij mij, met een akte en een handdruk. Dat is goedkoper voor iedereen, behalve voor de beul.' },
  { id: 'bier', ask: 'Het bier van Diest', page: 'tijd:bier', truth: 'geschiedenis',
    answer: 'Diest brouwt meer dan het drinkt, en het drinkt veel. Het bier gaat over de Demer naar Mechelen en Antwerpen. De accijns erop betaalt de muren. Elke pint is dus een daad van burgerzin. Dat zeg ik niet, dat zegt de waard. Maar hij heeft gelijk.' },
  { id: 'kludde', ask: 'De Kludde', page: 'wezen:kludde', truth: 'volksverhaal',
    answer: 'Daar sta ik als notaris niet voor in. Mijn grootmoeder zei: een uitgehongerd paard, of een hond, of een kat, met twee blauwe vlammetjes die voor hem uit dansen. Hij kwelt wie \'s nachts onderweg is en eindigt in het water. Ze kwam uit Dendermonde. Daar vertellen ze het beter.' },
];

/** The crier's news of 1650 (and of this game). */
export const NEWS: { t: string; truth: 'geschiedenis' | 'verzonnen' }[] = [
  { truth: 'geschiedenis', t: 'Uit Den Haag: prins Willem van Oranje, de tweede van die naam, is aan de pokken gestorven. Acht dagen later is zijn zoon geboren. De baron van Diest ligt in de wieg.' },
  { truth: 'geschiedenis', t: 'Uit Frankrijk: de kardinaal heeft de prins van Condé laten opsluiten, en de edelen staan op. Ze noemen het de Fronde. Wij noemen het: goed nieuws voor de koning van Spanje.' },
  { truth: 'geschiedenis', t: 'Men zegt dat de Franse maarschalk Turenne nu aan de kant van Spanje vecht, tegen zijn eigen koning. Zo gaat dat met maarschalken.' },
  { truth: 'geschiedenis', t: 'De landvoogd, aartshertog Leopold Willem, voert de oorlog tegen Frankrijk verder. Wie soldaten ziet: groet beleefd en tel je kippen.' },
  { truth: 'geschiedenis', t: 'Uit Engeland, nog altijd: ze hebben vorig jaar hun eigen koning onthoofd. Diest heeft nog nooit iemand onthoofd die meer was dan een dief.' },
  { truth: 'geschiedenis', t: 'Het is twee jaar vrede met de Republiek, sinds Munster. De Schelde blijft dicht. Antwerpen weent, Amsterdam lacht, en Diest verkoopt zijn bier aan wie betaalt.' },
  { truth: 'geschiedenis', t: 'Portugal vecht al tien jaar voor een eigen koning. De koning van Spanje vindt dat Portugal al een koning heeft: hem.' },
  { truth: 'verzonnen', t: 'Op bevel van de schepenen: wie na de avondklok zonder licht op straat loopt, betaalt boete. Wie met een draak op straat loopt, daar wordt over gepraat.' },
  { truth: 'geschiedenis', t: 'De broodprijs blijft deze week gelijk, zeggen de schepenen. De bakkers zeggen er niets over, toch niet hardop.' },
  { truth: 'geschiedenis', t: 'Pelgrims voor Scherpenheuvel: de weg langs Kaggevinne is niet veilig. Ga in groep, of ga met iemand die een zwaard heeft.' },
  { truth: 'verzonnen', t: 'Gezien boven de Demer: een draak met een ruiter. De schepenen laten weten dat niemand bang hoeft te zijn. Nieuwsgierig zijn mag wel.' },
  { truth: 'verzonnen', t: 'Gevonden in de Lakenhalle: een loden zegel met te veel tanden. Wie meer weet, meldt zich bij meester Joos, deken van de wevers.' },
  { truth: 'verzonnen', t: 'Gezocht: boden, wachters en sterke armen. Kijk op het aanplakbord hier naast mij. Ja, dat bord, ik wijs ernaar.' },
  { truth: 'verzonnen', t: 'De veerman vraagt nieuws van zijn jongen, die weg is sinds de nacht van de zeven slagen. Hij betaalt in vis.' },
  { truth: 'geschiedenis', t: 'Volgende maand is het jaarmarkt. Kooplieden van buiten betalen standgeld, de poorters niet. De poorters zijn blij. De kooplieden van buiten ook, want ze verhogen hun prijzen.' },
];

/** Stops of the town walk (a quest made by src/life/walk.ts). Each line is history, or says that it is not. */
export const WALK: { at: [number, number]; title: string; go: string; line: string }[] = [
  { at: [-38, 98], title: 'De Grote Markt', go: 'Begin op de Grote Markt, bij de omroeper.',
    line: 'Een driehoekig plein, waar de wegen uit de poorten samenkomen. Op marktdag staan hier de kramen, op gerechtsdagen de kaak. Wat de stad wil zeggen, wordt hier geroepen.' },
  { at: [-62, 36], title: 'Het Schepenhuis', go: 'Loop naar het Schepenhuis, aan de noordwestkant van de markt.',
    line: 'Hier vergaderen de schepenen en spreken ze recht. Onder het huis liggen oude gewelfde kelders: de stad bouwt op wat ze al had.' },
  { at: [10, 44], title: 'Sint-Sulpitius', go: 'Ga naar de zuidkant van de Sint-Sulpitiuskerk.',
    line: 'De kerk is gebouwd van bruine ijzerzandsteen uit de heuvels rond de stad. Er is meer dan twee eeuwen aan gewerkt, en de toren is nooit afgebouwd. Filips Willem van Oranje, de oudste zoon van Willem de Zwijger, ligt hier begraven.' },
  { at: [88, 40], title: 'De Lakenhalle', go: 'Verder naar het oosten, naar de Lakenhalle.',
    line: 'Hier werd het laken van Diest gemeten, gekeurd en gezegeld, in de eeuwen dat het tot ver in het buitenland gekocht werd. Het zegel van de stad was haar woord. Vandaag is die handel bijna dood, en de hal staat half leeg.' },
  { at: [300, 128], title: 'Het Hof van Nassau', go: 'Volg de straat oostwaarts tot aan het Hof van Nassau.',
    line: 'Dit is het huis van de Nassaus, die sinds 1499 heer van Diest zijn. Lang gewoond hebben ze er nooit. Ook nu woont er niemand: de baron ligt in Den Haag in de wieg.' },
  { at: [420, 40], title: 'De Warande', go: 'Ga naar de Warande, het jachtpark op de heuvel.',
    line: 'Dit is het jachtpark van de heer, achter een hoge muur. Op de heuvel liggen de resten van het oude kasteel van de heren van Diest, van voor de tijd van de Nassaus. Wie hier stroopt, riskeert de galg, dus de hazen zijn brutaal.' },
  { at: [500, -40], title: 'De Tafelronde', go: 'Een eindje verder ligt een groene heuvel: de Tafelronde.',
    line: 'Dit is een oude mottenheuvel, waarop ooit de eerste burcht van de heren van Diest stond. Het volk noemt hem de Tafelronde, naar de ridders van koning Arthur. Dat er ooit ridders aan een ronde tafel zaten, is een volksverhaal. De heuvel is echt.' },
  { at: [636, -318], title: 'Het Begijnhof', go: 'Eindig aan de poort van het Begijnhof, in het noordoosten.',
    line: 'Het is een stad in de stad, met eigen straten, een eigen kerk en een infirmerie. De eerste begijnen kwamen hier rond 1245. Ze leggen geen eeuwige geloften af. Ze sluiten hun poort bij valavond, en wie te laat is, blijft buiten.' },
];

/** What each gatekeeper tells about his road (and which camp or place to watch for). */
export const GATES: Record<string, { road: string; watch: string; mark: string | null; lore: string }> = {
  Antwerpsepoort: {
    road: 'Deze weg gaat noordwaarts door de Kempen, naar Geel en Herentals, en wie lang genoeg loopt, komt in Antwerpen. Het zijn zandwegen door heide en dennenbos. Te voet ben je twee dagen onderweg tot aan de Schelde.',
    watch: 'Ten noordoosten van hier, op de weg naar Schaffen, liggen deserteurs. Ze zijn met drie, slecht gewapend en slecht gezind.', mark: 'schaffen',
    lore: 'Vijftien jaar geleden kwam het Franse leger langs deze kant. De stad gaf zich over. Ik was erbij, en meer zeg ik er niet over.',
  },
  Schaffensepoort: {
    road: 'Deze weg gaat naar Schaffen en verder de heide op. Daar vind je schapen, herders en zand. Het oefenveld van de schutters ligt hier vlakbij, binnen de muur.',
    watch: 'Op de weg naar Schaffen zitten deserteurs. Ze beroven wie alleen reist. Met een draak reis je nooit alleen, denk ik.', mark: 'schaffen',
    lore: 'De schutters oefenen hier op de gaai. Als je een pijl ziet vliegen, buk je eerst en klap je daarna in je handen.',
  },
  Koepoort: {
    road: 'De oude Koepoort is al lang dichtgemetseld. Naar het oosten liggen de Demerweiden en het Broek, en verder Hasselt. Het vee gaat nu langs een andere poort naar buiten.',
    watch: 'In het Broek, ten zuidoosten, zwerven grote zwarte honden. Ze jagen in groep. Ik laat de koeien niet meer zo ver lopen.', mark: 'broek',
    lore: 'Buiten de muur liggen de bleekvelden, waar het laken in de zon wit wordt. Meester Joos let erop alsof het goud is.',
  },
  Maastrichtsepoort: {
    road: 'Deze weg gaat zuidoostwaarts, naar Sint-Truiden en verder naar Maastricht. Het is een goede weg, voor zover er goede wegen bestaan.',
    watch: 'Links van de weg ligt het moeras van Webbekom. De mensen daar blijven na donker binnen. Ze zeggen er niet bij waarom.', mark: 'broek2',
    lore: 'Het garnizoen ligt hier vlakbij. Sergeant Ruiz verkoopt wat het leger niet meer nodig heeft, en soms ook wat het leger nog niet mist.',
  },
  Leuvensepoort: {
    road: 'Deze weg gaat zuidwestwaarts naar Leuven met zijn universiteit, en verder naar het hof van de landvoogd in Brussel. De tol wordt aan de poort geheven; Wouter weet van elk vat hoeveel het kost.',
    watch: 'Ten zuiden ligt de Galgenberg, waar Kaggevinne zijn galg heeft staan. Daar zitten deserteurs met een kapitein die zo groot is als een deur.', mark: 'galgeberg',
    lore: 'Langs deze poort komen geleerden en advocaten, maar zelden samen. Ze verdragen elkaar niet in dezelfde koets.',
  },
  Allerheiligenpoort: {
    road: 'Deze weg gaat westwaarts langs de Demer, naar Aarschot en naar Scherpenheuvel. De pelgrims nemen deze poort. Ze bidden in de kapel voor ze vertrekken.',
    watch: 'Bij Kaggevinne, op de weg naar Scherpenheuvel, beroven struikrovers de pelgrims. Verder naar het westen, in het eikenbos, dwalen lichtjes. Volg ze niet.', mark: 'kaggevinne',
    lore: 'De Allerheiligenkapel is ouder dan deze poort. Reizigers bidden er voor een veilige weg. Stedelingen bidden er voor reizigers die hun nog geld schuldig zijn.',
  },
  Demerpoort: {
    road: 'Dit is de waterpoort op de Demer: hier stroomt de rivier onder de muur door. Het is geen weg voor voeten, alleen voor boten, bier en wat de rivier meeneemt.',
    watch: 'Pas op voor het water. Wie te dicht bij de rand speelt, wordt meegenomen door de Nekker, zeggen de moeders. Ik zeg dat het de stroming is. Het komt op hetzelfde neer.', mark: null,
    lore: 'Als het hard regent, staat het water tegen de poort. Dan gaan de schotten dicht en bidden we dat ze houden.',
  },
};

/** The pilgrims' guide at the church of Scherpenheuvel. */
export const PILGRIM_TOPICS: Topic[] = [
  { id: 'kerk', ask: 'Waarom zeven zijden?', page: 'tijd:zeven', truth: 'geschiedenis',
    answer: 'Het zijn er zeven, voor de zeven vreugden en de zeven smarten van Maria. De kerk heeft zeven zijden en de stad eromheen ook. De bomen rond de kerk staan in een ster met zeven punten. Bouwmeester Cobergher tekende het voor de aartshertogen. In 1627 werd de kerk ingewijd.' },
  { id: 'eik', ask: 'De eik', page: 'plaats:De Heilige Eik', truth: 'geschiedenis',
    answer: 'Hier stond een eik met een Mariabeeldje erin. Mensen kwamen er bidden en er gebeurden genezingen. Kort na 1600 liet de bisschop de eik vellen. Van het hout sneden ze beeldjes. Het altaar staat waar de eik stond.' },
  { id: 'rondgang', ask: 'Wat doen de pelgrims hier?', page: 'tijd:bedevaart', truth: 'geschiedenis',
    answer: 'Ze komen te voet, uit heel Brabant en verder. Ze gaan rond de kerk, biddend, en kopen een teken of een vaantje om thuis te tonen. Wie genezen is, laat iets achter: een kruk, een wassen arm, een bedankje. Kijk maar naar de muren.' },
  { id: 'aartshertogen', ask: 'Wie waren de aartshertogen?', page: 'plaats:Scherpenheuvel', truth: 'geschiedenis',
    answer: 'Dat waren Albrecht en Isabella. Ze bestuurden de Nederlanden als vorsten, tot Albrecht stierf in 1621 en Isabella in 1633. Ze waren vroom en ze bouwden graag. Deze stad is hun gebed in steen. Kinderen hadden ze niet, maar ze hadden Scherpenheuvel.' },
  { id: 'nacht', ask: 'Zoemt de kerk echt \'s nachts?', page: 'tijd:wortels', truth: 'verzonnen',
    answer: 'Dat zeggen de pelgrims. Ik slaap dan. Maar één ding kan ik je wel zeggen: de wortels van de eik zijn nooit uitgegraven, en soms, als het stil is, voel je iets door de vloer. Dat staat in geen enkele kroniek: dit stuk van het verhaal is verzonnen.' },
];

// ===================================================================== the inn
/** The storyteller in De Zwaan: tales that hint where creatures live (camp to point at). */
export const INN_TALES: { t: string; camp: string | null; page?: string }[] = [
  { camp: 'broek', t: 'Mijn neef hoedde koeien in het Broek, voorbij de oude Koepoort. Op een avond telde hij er één te veel: een zwarte, met ogen als lantaarns. De volgende ochtend was er één te weinig. Daar zwerven ze nog, die honden. Een volksverhaal, zeg jij? Vraag het dan maar aan de koe.' },
  { camp: 'broek2', t: 'Verder in het moeras, richting Webbekom, wordt het water zwart en de honden groter. De rietsnijders gaan er alleen bij dag naartoe, en altijd met z\'n drieën. Twee om te snijden, één om te tellen of ze er nog allemaal zijn.' },
  { camp: 'eikenbos', t: 'In het eikenbos ten oosten van Scherpenheuvel zie je lichtjes dansen, net kaarsen in een processie. Pelgrims volgen ze, en die pelgrims komen niet terug. Dwaallichten, zeggen de ouden: zielen die de weg kwijt zijn en gezelschap zoeken.' },
  { camp: 'kaggevinne', t: 'Bij Kaggevinne, aan de weg naar Scherpenheuvel, liggen mannen in de struiken. Het waren ooit soldaten. Nu nemen ze de schoenen van de pelgrims, en soms de voeten erbij. Ga er niet alleen heen. Of ga wel, met dat beest van jou, en breng me een paar schoenen mee.' },
  { camp: 'schaffen', t: 'Op de heide bij Schaffen ligt een handvol deserteurs. Ze hebben hun vaandel verkocht voor brandewijn en hun eer voor minder. Het zijn arme duivels, maar wel gevaarlijke.' },
  { camp: 'galgeberg', t: 'Op de Galgenberg hangt de schepenbank van Kaggevinne haar dieven op. Nu zitten er dieven die niemand ophangt: Lambrecht de Rode en zijn mannen. Ze zeggen dat de galg kraakt van ongeduld als hij voorbijkomt.' },
  { camp: null, page: 'wezen:oschaert', t: 'In Hamme hebben ze de Oschaert: die springt je op de rug en wordt zwaarder bij elke stap. Rond Dendermonde hebben ze de Kludde, en sinds die nacht wij ook. Wat het verschil is? De Kludde rammelt met kettingen, dus die hoor je tenminste komen.' },
  { camp: null, page: 'wezen:nekker', t: 'Kinderen, blijf weg van de Demer, zei mijn moeder, of de Nekker trekt je erin. Ik ben nooit in de Demer gevallen. Mijn broer wel. Hij kwam er weer uit, maar hij is nooit meer helemaal dezelfde geweest. Hij werd advocaat.' },
  { camp: null, page: 'wezen:alvermannekes', t: 'Op de Tafelronde, die groene heuvel in de stad, wonen alvermannekes. Als je \'s avonds een kom pap neerzet, is \'s morgens je werk gedaan. Ik heb het geprobeerd. De pap was op, maar het werk was niet gedaan. Het waren de katten, denk ik.' },
  { camp: null, page: 'wezen:weerwolf', t: 'Een smid in Zichem sloeg op een nacht een wolf met een hamer op de poot. De volgende ochtend liep zijn buurman mank. Zo gaat dat met weerwolven: overdag zie je het aan de wonden, of aan de buren.' },
];

/** Dice: what the waard and the players say. */
export const DICE = {
  ask: ['Zin in een spelletje? We gooien drie dobbelstenen en de hoogste worp wint. De inzet is één stuiver.', 'Je hebt het gezicht van iemand die wil verliezen. Gooi je een keer mee?'],
  win: ['Hm. Dat is geluk, of je draak fluistert je iets in. Hier is je stuiver.', 'Jij wint. De tafel zwijgt. Dat is het geluid van verliezers.', 'Alweer jij. Ik ga die stenen eens goed bekijken.'],
  lose: ['Je hebt te weinig ogen gegooid. Dank je voor de stuiver.', 'Het is niet jouw dag, maar wel de mijne.', 'De stenen zijn eerlijk en ik ben het ook, vandaag toch.'],
  tie: ['We staan gelijk. Niemand wint, de waard ook niet, en dat is het ergste.'],
  sign: 'Op het bord boven de tafel staat dat dobbelen om geld verboden is.',
};

// ===================================================================== the notice board
export const JOBS: JobTemplate[] = [
  {
    id: 'premie_kamp', kind: 'bounty', title: 'Premie: {campName}',
    notice: 'PREMIE. Wie bij {where} {n} van {campName} verdrijft, krijgt een beloning van {client}. Als bewijs volstaat het dat je levend terugkomt.',
    journal: ['Op het aanplakbord hing een premie: {campName} bij {where}. {client} betaalt wie ze verdrijft.', 'Het is gedaan. Nu {client} nog laten weten dat de weg weer veilig is.'],
    thanks: 'Is het gedaan? Dan slaapt er vannacht iemand beter, al ben jij dat misschien niet. Hier is je premie.',
    clients: ['sergeant', 'poort_allerheiligen', 'poort_koe', 'omroeper'],
  },
  {
    id: 'premie_wacht', kind: 'bounty', title: 'De weg vrijmaken',
    notice: 'GEVRAAGD door het garnizoen: een sterke arm tegen {campName} bij {where}. Het gaat om {n} stuks. Meld je bij {client}.',
    journal: ['Het garnizoen heeft geen mannen over om {campName} bij {where} te verjagen. Dus moet ik het blijkbaar doen.', 'De weg is vrij. {client} wil het horen.'],
    thanks: 'De koning dankt je. Ik betaal je. Dat laatste is zekerder.',
    clients: ['sergeant', 'poort_maastricht', 'poort_schaffen'],
  },
  {
    id: 'bezorg_brood', kind: 'delivery', title: 'Een bestelling voor {to}',
    notice: 'BODE GEZOCHT om {what} van {from} naar {to} te brengen. Het moet vlug, droog en heel aankomen. Loon bij aflevering.',
    journal: ['{from} heeft een bestelling klaarstaan voor {to}: {what}. Eerst ga ik het ophalen.', 'Ik heb {what} bij me. Nu naar {to}, voor het koud wordt.'],
    thanks: 'Eindelijk, en alles is nog heel, zie ik. Hier is je loon.',
    clients: ['waard', 'notaris', 'infirmerie', 'sergeant', 'omroeper'],
    goods: ['een mand broden', 'een pak drukwerk', 'een bundel kruiden', 'een vat bier', 'een rol laken', 'een kistje nagels'],
    from: ['bakker', 'drukker', 'kruiden', 'waard', 'kleermaker', 'smid'],
  },
  {
    id: 'lees', kind: 'read', title: 'Wat er aan de muren hangt',
    notice: 'De omroeper zoekt iemand die leest. Lees {n} plakkaten, borden of stenen in de stad en vertel hem wat erop staat.',
    journal: ['Rombout de omroeper wil weten wat er overal in de stad aan de muren hangt. Hij kan het zelf lezen, zegt hij, maar niet overal tegelijk.', 'Ik heb genoeg gelezen. Terug naar de omroeper op de markt.'],
    thanks: 'Zo, zo. En dat staat er allemaal? Dan weet ik weer wat ik moet roepen. Hier, dit is voor de moeite.',
    clients: ['omroeper'],
  },
  {
    id: 'haal', kind: 'fetch', title: 'Verloren: {what}',
    notice: 'VERLOREN {where}: {what}. Wie het terugbrengt bij {client}, krijgt een beloning. Er worden geen vragen gesteld.',
    journal: ['{client} is {what} kwijtgeraakt, ergens {where}. Het moet nog te vinden zijn. Van boven zie ik het misschien sneller.', 'Ik heb alles gevonden. Nu terug naar {client}.'],
    thanks: 'Dat zijn mijn spullen. Ik dacht dat de Kludde ze had, want die neemt tegenwoordig alles. Hier, en dank je.',
    clients: ['waard', 'kleermaker', 'smid', 'bakker', 'drukker'],
  },
];

/** Where lost things lie (outside the walls, on open ground near a road). */
export const FETCH_SPOTS: { where: string; what: string; at: [number, number][] }[] = [
  { where: 'op de bleekvelden voorbij de oude Koepoort', what: 'drie stukken laken', at: [[880, 50], [915, 120], [866, 180]] },
  { where: 'langs de weg naar Schaffen', what: 'drie zakken nagels', at: [[640, -760], [690, -800], [610, -720]] },
  { where: 'in de weiden langs de Demer', what: 'drie verloren kippen', at: [[960, 200], [1010, 260], [940, 290]] },
  { where: 'langs de weg naar Kaggevinne', what: 'drie vaatjes', at: [[-700, 240], [-760, 280], [-650, 300]] },
  { where: 'bij de Allerheiligenkapel, buiten de Allerheiligenpoort', what: 'drie bundels boeken', at: [[-420, 120], [-380, 160], [-460, 80]] },
];

// ===================================================================== the streets
/** House names, as they hung on signs (the names are ours; the custom is real). */
export const SIGN_NAMES = [
  'De Zwaan', 'Het Hert', 'De Gulden Hoorn', 'De Drie Koningen', 'De Rode Leeuw', 'Het Wit Paard', 'De Sterre', 'De Gulden Arend', 'Het Schaakbord',
  'De Pelikaan', 'De Maan', 'Het Vliegend Hert', 'De Blauwe Hand', 'De Gouden Sleutel', 'Het Lam Gods', 'De Drie Haringen', 'De Engel', 'De Kroon',
  'De Wildeman', 'Het Zwart Schaap', 'De Hazewind', 'De Klok', 'De Gulden Pot', 'Het Anker', 'De Rozenhoed', 'De Pauw', 'De Valk', 'Het Rad',
  'De Schaar', 'De Eenhoorn', 'De Kat', 'De Druif', 'De Ketel', 'Sint-Michiel', 'Sint-Maarten', 'De Spiegel', 'Het Kasteel', 'De Lelie',
  'De Drie Ringen', 'Het Gulden Vlies', 'De Molen', 'De Ham', 'Het Hoefijzer', 'De Kroonkraan', 'De Zon', 'De Bijenkorf', 'Het Schip', 'De Os',
];

/** What you notice about a sign ({name}). */
export const SIGN_LINES = [
  'Een geschilderd bord aan een smeedijzeren arm. "{name}". De verf bladdert, de naam blijft.',
  '"{name}", staat er in gouden letters. Wie hier woont, is trots op zijn huis, of op zijn schilder.',
  'Een bord met "{name}" en een prentje erbij, voor wie niet kan lezen. Dat is de halve stad.',
  '"{name}". Het bord is ouder dan het huis. Het hing al aan het vorige, dat afbrandde.',
  'In de steen boven de deur: "{name}", en een jaartal dat je niet meer kunt lezen.',
  '"{name}". Iemand heeft er met krijt een snor bij getekend. Het staat het bord goed.',
  'Een uithangbord: "{name}". Bij wind piept het. De buren hebben het opgegeven.',
  '"{name}". Zo vind je een huis in Diest: niet met een nummer, maar met een naam.',
  'Het bord van "{name}" hangt scheef. Of het huis hangt scheef, dat is moeilijk te zeggen.',
  '"{name}", in rood en goud. De eigenaar heeft er meer voor betaald dan voor zijn deur.',
  'Op het bord: "{name}". Daaronder, kleiner: "Hier verkoopt men niets. Klop niet."',
  'Een gevelsteen: "{name}". De duiven hebben er hun eigen versiering aan toegevoegd.',
];

/** Knock on a door: who answers. */
export const DOOR_LINES = [
  'Een vrouw doet open, ziet je zwaard, en doet weer dicht. Dan weer open: "Je bent die van de draak. Goeiendag." En weer dicht.',
  'Niemand doet open. Binnen hoor je iemand heel stil zijn.',
  'Een jongen doet open: "Moeder is er niet. Vader ook niet. Ik ook niet." Hij doet de deur dicht.',
  'Een oude man: "Ik koop niets, ik verkoop niets, en ik heb geen dochter." Hij heeft wel een hond, die het met hem eens is.',
  'Een meid met meel aan haar handen: "Als je de bakker zoekt, die is op de markt. Als je mij zoekt: ik heb het druk."',
  'Een man in zijn hemd: "Is er brand? Nee? Waarom klop je dan?"',
  'Een vrouw met een kind op de arm: "Ben jij de nieuwe koster? Nee? Jammer, die oude luidt niet meer." ',
  'Een wever, met pluisjes in zijn baard: "Het getouw staat stil als jij klopt. Hou het kort, alsjeblieft."',
  'Je hoort een stoel schuiven, voetstappen, en dan niets meer. Door het sleutelgat kijkt een oog je aan.',
  'Een ingekwartierde soldaat van het garnizoen doet open: "Dit is mijn huis niet, ik slaap hier alleen maar. Vraag het aan de eigenaar. Die zit op zolder."',
  'Een vrouw geeft je een appel zonder iets te zeggen, en doet de deur dicht. Je hebt geen idee waarom. De appel is goed.',
  'Een man met inkt op zijn vingers: "Een schrijver heeft geen tijd. Een schrijver heeft ook geen geld. Wat wil je?"',
  'Binnen roept iemand: "Als het de tollenaar is: ik ben dood!" Je besluit het te geloven.',
  'Een meisje doet open, kijkt langs je heen naar de lucht, en vraagt: "Waar is je draak?"',
  'Een begijn op bezoek doet open: "De zieke slaapt. Kom later terug, of nooit, dat mag ook."',
  'Een kleermakersgezel met spelden in zijn mond: "Mmf. Mmmf." Je begrijpt het en je gaat weg.',
  'Een oude vrouw: "Je ziet er hongerig uit. Kom binnen, eet iets." Je eet iets. Het is pap. Het is goede pap.',
  'De deur is niet op slot en gaat vanzelf open. Een kat kijkt je aan alsof jij hier niet hoort. Je doet de deur weer dicht.',
  'Een brouwersknecht: "Bier? Dat vind je hier niet. Dit is het huis van mijn moeder. Zij drinkt water, de arme vrouw."',
  'Een vrouw met een bezem: "De stoep is net geveegd." Ze kijkt naar je laarzen. Ze kijkt naar de stoep.',
  'Een vrouw doet open, kijkt je lang aan en zegt: "Nee. Ik dacht dat je mijn zoon was."',
];

/** A shrine in a wall or on a post: what you see when you stop to pray. */
export const SHRINE_LINES = [
  'Een Mariabeeldje in een nis, met verse bloemen. Iemand zorgt ervoor.',
  'Sint-Rochus, met zijn hond en zijn wonde. Hij helpt tegen de pest. Er brandt een kaarsje.',
  'Een kapelletje op een paal, met een blauw dakje. Er hangt een wassen hand aan een spijker: een gebed dat verhoord werd.',
  'Onze-Lieve-Vrouw van Scherpenheuvel, in tin, met een snoer kralen eromheen.',
  'Sint-Antonius, met zijn varken. Boeren bidden hier voor hun beesten.',
  'Een kruisbeeld, verweerd door de regen. Iemand heeft er een groene tak bij gestoken.',
  'Sint-Sulpitius, de patroon van de stad, met een bisschopsstaf. Hij kijkt een beetje streng.',
  'Een nisje met een Maria en een briefje: "Voor mijn zoon in het leger." Geen naam.',
  'Sint-Barbara, voor wie in de buurt van buskruit werkt. Er liggen twee kogels aan haar voeten.',
  'Een kapelletje met een kaars die nog brandt. Iemand is je net voorgegaan. Ze heeft een kinderschoentje achtergelaten.',
  'Sint-Christoffel, die het kind over het water draagt. Hij beschermt reizigers, en dus ook jou.',
  'Een oud, scheefgezakt beeldje. Het gezicht is weggesleten door de handen die het aanraakten.',
];

export const WELL_LINES = [
  'Fris water uit de put, met een smaak van roest. Je voelt je beter.',
  'Het water smaakt naar ijzer en naar steen. Het doet deugd.',
  'Een emmer aan een ketting, en water zo koud dat je tanden er pijn van doen. Het smaakt heerlijk.',
  'Iemand heeft een houten nap bij de put gelegd. Je drinkt, en je legt hem terug.',
  'Een vrouw die water komt halen, wacht beleefd tot je gedronken hebt. Dan wacht ze nog wat langer, omdat je een draak hebt.',
  'Het water is helder. De put is goed onderhouden: de buren betalen er samen voor.',
  'Je drinkt. Een kind kijkt toe en vraagt of draken ook water drinken. Je weet het eigenlijk niet.',
  'De katrol piept, de emmer komt boven. Je drinkt, en je denkt aan de rivier. Je drinkt toch.',
  'Er drijft een blad in de emmer. Je drinkt eromheen.',
  'Het is geen bier en geen wijn, gewoon water. Soms is dat het beste.',
  'Je wast het stof van je gezicht en drinkt. De stad ruikt even minder naar de stad.',
  'Het water is koud en goed. Op de rand van de put staat gekrast: "Hier dronk Joos, 1621".',
];
