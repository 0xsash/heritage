// Wat de mensen in de straat zeggen als je ze aanspreekt. Per soort volk:
// roddels, volksgeloof en hun kijk op de tijd, en wat ze zelf te bieden hebben.
// Placeholders: {name} (de held), {dragon}, {place}, {dir} (richting), {far}
// (afstand in woorden), {what} (iets om te doen), {camp}.
//
// Lines with a condition react to what the player has done; the picker in
// src/life/lines.ts prefers lines not heard in the last ten minutes.

import type { Role } from '../rpg/folk';
import type { FactionId } from '../rpg/factions';
import { OV_GREET, OV_REACTIVE, OV_REP, OV_REP_DEEDS, OV_TOWN_VIEW } from './oudevolk';

export type Special = 'work' | 'food' | 'town' | 'rep' | 'tend' | 'camps' | 'bless' | 'pilgrim' | 'dare' | 'tale';

export const ROLE_INFO: Record<Role, { label: (female: boolean, i: number) => string; faction: FactionId; special: Special; ask: string }> = {
  peasant: { label: (_f, i) => (i % 3 === 0 ? 'knecht' : 'boer'), faction: 'vrije', special: 'work', ask: 'Weet jij waar er werk is?' },
  peasantWoman: { label: (_f, i) => (i % 2 ? 'marktvrouw' : 'boerin'), faction: 'vrije', special: 'food', ask: 'Wat heb je in je mand?' },
  burgher: { label: (f) => (f ? 'poortersvrouw' : 'poorter'), faction: 'gilden', special: 'town', ask: 'Hoe staat de stad ervoor?' },
  huik: { label: () => 'poortersvrouw in huik', faction: 'gilden', special: 'rep', ask: 'Wat zeggen de mensen over mij?' },
  beguine: { label: () => 'begijn', faction: 'kerk', special: 'tend', ask: 'Kun je mijn wonden verzorgen?' },
  soldier: { label: () => 'soldaat van het garnizoen', faction: 'kroon', special: 'camps', ask: 'Zijn de wegen veilig?' },
  friar: { label: () => 'minderbroeder', faction: 'kerk', special: 'bless', ask: 'Wil je me zegenen, broeder?' },
  pilgrim: { label: (f) => (f ? 'pelgrim' : 'pelgrim'), faction: 'kerk', special: 'pilgrim', ask: 'Vertel eens over Scherpenheuvel.' },
  child: { label: (f) => (f ? 'meisje' : 'jongen'), faction: 'vrije', special: 'dare', ask: 'Wat spelen jullie?' },
  oldMan: { label: () => 'oude man', faction: 'gilden', special: 'tale', ask: 'Vertel eens een oud verhaal.' },
  oldWoman: { label: () => 'oude vrouw', faction: 'kerk', special: 'tale', ask: 'Vertel eens een oud verhaal.' },
};

export const NAMES = {
  m: ['Jan', 'Pieter', 'Hendrik', 'Gillis', 'Adriaan', 'Willem', 'Lucas', 'Cornelis', 'Steven', 'Jacob', 'Lenaert', 'Gooris', 'Merten', 'Andries', 'Rombout', 'Thijs', 'Wouter', 'Arnout', 'Claes', 'Peeter', 'Jooris', 'Frans', 'Gerard', 'Matthijs', 'Laureys', 'Gommaar', 'Huybrecht', 'Daneel', 'Aert', 'Sander'],
  f: ['Maria', 'Anna', 'Catharina', 'Margriet', 'Elisabeth', 'Barbara', 'Josine', 'Machteld', 'Geertrui', 'Lysken', 'Kathelijne', 'Magdalena', 'Joanna', 'Clara', 'Adriana', 'Digna', 'Heylwich', 'Janneke', 'Tanneken', 'Grietken', 'Lynken', 'Beatrijs', 'Heylken', 'Agnes', 'Cornelia', 'Mayken', 'Neelken', 'Wivina', 'Gertrudis', 'Aleid'],
  boy: ['Janneke', 'Peerke', 'Claeske', 'Thijske', 'Wout', 'Lowys', 'Bastiaan', 'Remke'],
  girl: ['Mieke', 'Betke', 'Lieske', 'Anneke', 'Klaarke', 'Leen', 'Griet', 'Sanneke'],
  beguine: ['Zuster Agnes', 'Zuster Beatrijs', 'Zuster Clara', 'Zuster Digna', 'Zuster Heylwich', 'Zuster Ida', 'Zuster Josine', 'Zuster Machteld'],
  friar: ['Broeder Bonaventura', 'Broeder Leo', 'Broeder Egidius', 'Broeder Anselmus', 'Broeder Ruffinus', 'Broeder Fidelis'],
};

/** How people greet you, by your standing with their party (Vreemde .. Vertrouweling). */
export const TIER_GREET: Partial<Record<FactionId, string[][]>> = {
  oranje: [
    ['Ja? De baron is er niet. Hij is er nooit.', 'Een vreemde. Bij wie hoor jij?', 'Goeiendag. Zeg niet te luid wat je komt doen.'],
    ['Ah, jij bent het. De drossaard noemde zachtjes je naam.', 'Dag. In het Hof van Nassau hebben de muren oren.', 'Jij bent die met de draak. De prins zou je willen zien.'],
    ['{name}. Het Hof onthoudt wie het helpt.', 'Dag, {name}. De drossaard spreekt goed over je, al doet hij dat binnenskamers.', '{name}. Kom, hier hoort niemand ons.'],
    ['{name}, vriend van het Hof. Wat heb je nodig?', 'Als de baron ooit terugkomt, {name}, zal hij je naam kennen.', '{name}. In Den Haag weten ze wie je bent, echt waar.'],
    ['{name}. Voor jou staat de poort van het Hof open, ook als ze dicht is.', 'De prins in de wieg heeft één vriend in Diest, {name}, en dat ben jij.', '{name}. Oranje vergeet niets, en dit zeker niet.'],
  ],
  gilden: [
    ['Ja? Wat is er?', 'Een vreemde. Wat wil je?', 'Goeiendag. Hou het kort als het kan, ik heb werk.'],
    ['Ah, jij bent het. Goeiendag.', 'Ik heb van je gehoord. Niets slechts, tot nu toe.', 'Dag. Jij bent die met de draak, hé.'],
    ['{name}. Blij dat ik je zie.', 'Dag, {name}. De gilde spreekt goed over je.', 'Kijk, {name}. Kom, wat kan ik voor je doen?'],
    ['{name}. De gilde staat bij je in het krijt.', 'Meester {name}, zou ik bijna zeggen. Goeiendag.', 'Voor jou heb ik altijd tijd, {name}.'],
    ['{name}, vriend van de stad. Zeg maar wat je nodig hebt.', 'Als de dekens over jou praten, zetten ze hun hoed af, {name}.', '{name}. Diest is jouw stad. Zeg het maar.'],
  ],
  kerk: [
    ['God zij met je. Wat zoek je?', 'Vrede zij met je, vreemdeling.', 'Ja, kind? Zeg het maar.'],
    ['God zegene je. Ik heb over je gehoord.', 'Dag. Jij bent die van de draak. We bidden voor je, en voor de zekerheid ook voor de draak.', 'Vrede zij met je.'],
    ['{name}. Het Begijnhof spreekt goed over je.', 'Dag, {name}. Je naam valt in onze gebeden.', 'God zegene je, {name}. Kom, zeg het maar.'],
    ['{name}, vriend van de Kerk. Wat kan ik doen?', 'Voor jou branden er kaarsen, {name}. Echt waar.', 'De overste zelf noemde je naam, {name}. Hij noemt weinig namen.'],
    ['{name}. Het is een zegen dat je er bent.', 'Als iemand de klokken van Brabant redt, ben jij het, {name}.', '{name}, de deur van elk klooster staat voor je open.'],
  ],
  kroon: [
    ['Halt. Wie ben jij? Ah, laat maar.', 'Heb je een pas? Nee? Goed, maar ik hou je in het oog.', 'Loop maar door, burger.'],
    ['Jij weer. Hou je rustig, hé.', 'De drossaard kent je naam. Of dat goed of slecht is, hangt van de dag af.', 'Dag. Je zoekt vandaag toch geen moeilijkheden?'],
    ['{name}. Goed volk, zegt de sergeant.', 'Dag, {name}. Het garnizoen kent je.', '{name}. Je hebt de koning een dienst bewezen, hoor ik.'],
    ['{name}. Een vriend van de Kroon is een vriend van mij.', 'Saluut, {name}. Als je hulp nodig hebt, roep je maar.', 'De landvoogd zelf zou je moeten kennen, {name}.'],
    ['{name}. Als het aan mij lag, kreeg je een vaandel.', 'Voor jou gaan alle poorten open, {name}, ook na valavond.', 'Saluut, {name}. De Kroon vergeet niet wie haar diende.'],
  ],
  vrije: [
    ['Wat kom jij hier doen?', 'Ik heb niks gezien, wat er ook gebeurd is.', 'Hm. Een vreemde met een zwaard. Wat wil je?'],
    ['Ah, die van de draak. Wees gerust, ik zeg niks.', 'Je bent te vertrouwen, zeggen ze. Dat zeggen ze toch.', 'Dag. Jij betaalt geen tol, hoor ik. Dat is slim van je.'],
    ['{name}. Je bent al half een van ons.', 'Dag, {name}. Gielis spreekt goed over je. Dat zegt veel, of het zegt niks.', 'Kijk, {name}. Wat heb je nodig?'],
    ['{name}. Voor jou weet ik altijd een sluipweg.', 'Hé, {name}. Als je iets zoekt dat niet te koop is, vraag het dan aan mij.', '{name}, vriend. Zeg het maar.'],
    ['{name}. Elke voerman tussen hier en Antwerpen kent je naam.', 'Voor jou, {name}, gaan de achterdeuren open.', '{name}. Jij en ik, wij betalen nooit tol.'],
  ],
  // the hidden party (src/content/oudevolk.ts): only their own people greet you this way
  oudevolk: OV_GREET,
};

// ===================================================================== "Waar ben ik?"
/** How they begin the answer. */
export const WHERE_FRAMES: Record<string, string[]> = {
  any: [
    'Dit is {place}. {line}', 'Je staat bij {place}. {line}', 'Waar je bent? Je bent bij {place}. {line}', 'Allee, dat weet iedereen: {place}. {line}',
    'Hier sta je bij {place}. {line}', 'Dit is {place}, natuurlijk. {line}', 'Je bent bij {place}. {line}', 'Dat daar is {place}. {line}',
    'Kijk maar rond, dit is {place}. {line}', 'Je bent bij {place}, vreemdeling. {line}', 'Dit hier is {place}. {line}', 'Je bent verdwaald? Dit is {place}. {line}',
  ],
  child: ['Dat weet je niet? Dit is {place}! {line}', 'Dit is {place}! Dat weet toch iedereen. {line}', 'Hier is {place}. {line} Mijn broer zegt dat.'],
  soldier: ['Dit is {place}, burger. {line}', 'Je staat bij {place}. {line} Onthoud het, voor als je moet vluchten.'],
  pilgrim: ['Ik ben hier zelf vreemd, maar ze zeggen dat dit {place} is. {line}', 'Dit is {place}, als ik het goed heb. {line}'],
  oldMan: ['Dat is {place}. Ik woon hier al zestig jaar. {line}', 'Dit is {place}. {line} Vroeger was alles beter, ook dit.'],
  oldWoman: ['Je bent bij {place}, kind. {line}', 'Dit is {place}. {line} Mijn grootmoeder trouwde hier vlakbij.'],
};

/** In their own words, about each place (discovery keys from src/world/lore.ts). */
export const PLACE_LINES: Record<string, string[]> = {
  Diest: ['Een stad van brouwers en van de laatste wevers, binnen dikke muren. Iedereen kent iedereen, en iedereen heeft er een mening over.', 'De muren zijn sterk, het bier is goed, de heer woont ver weg. Er zijn ergere steden.'],
  'Sint-Sulpitius en Dionysiuskerk': ['Dat is de grote kerk. De toren is nooit afgemaakt: men zegt dat het geld op was voor de bouwmeesters het eens waren.', 'De klokken hangen daarboven, maar je weet zelf dat ze zwijgen.'],
  Lakenhalle: ['Daar keuren ze het laken. Als het goed is, krijgt het het zegel van de stad. Als het slecht is, krijgt de wever een preek.', 'Vroeger stond de Lakenhalle vol balen laken. Nu staat ze vooral vol meester Joos.'],
  'Stadhuis Diest': ['Daar zitten de schepenen. Ze zetten de broodprijs vast en maken ruzie over de muren, soms tegelijk.', 'Het schepenhuis. Een boete betaal je daar, en als je ze niet betaalt, kom je er ook terecht.'],
  'Ingang Begijnhof': ['Het Begijnhof: een stad in de stad. De begijnen sluiten de poort bij valavond, en dan gaat er niemand meer in of uit.', 'Daar wonen de begijnen. Ze weven, ze bidden, en ze weten alles over iedereen.'],
  'Sint-Catharinakerk': ['De kerk van de begijnen. Hun klok loopt een beetje voor op die van de stad. Ze zeggen dat ze dat met opzet doen.', 'Sint-Catharina is klein, maar de zusters zingen er schoner dan de kanunniken in de grote kerk.'],
  'Hof van Nassau': ['Dat is het huis van de prinsen, maar er woont niemand. De baron woont in het noorden, bij de calvinisten, en dat zegt genoeg.', 'Het Hof van Nassau. De Nassaus zijn hier al anderhalve eeuw heer, maar wonen doen ze er nooit. Alleen het slot op de deur wordt soms vervangen.'],
  'Den Drossaerd': ['Het huis van de drossaard. Wie daar binnen moet, heeft iets misdaan of is een drakenrijder.', 'Daar woont jonker Van Gorp, de drossaard. Hij slaapt slecht, zeggen ze. Met twee heren boven mij zou ik ook slecht slapen.'],
  'Refugiehuis van Averbode': ['Het huis van de abdij van Averbode. Als er soldaten komen, vluchten de kanunniken hierheen, met hun zilver.', 'Het refugie van Averbode. De paters komen hier als het onveilig is op het platteland. Het is vaak onveilig.'],
  'Het Spijker - Refugiehuis van Tongerlo': ['Het Spijker: daar ligt het graan van de abdij van Tongerlo. In een slecht jaar is het het belangrijkste huis van de stad.', 'De graanschuur van Tongerlo. Als de oogst mislukt, staat de halve stad hier aan te schuiven.'],
  'Onze-Lieve-Vrouwekerk': ['Een rustige kerk tussen de tuinen. Je hoort er de vogels beter dan de pastoor.', 'Onze-Lieve-Vrouw staat in het noorden van de stad, tussen de boomgaarden.'],
  'Stadspark De Warande': ['De Warande: het jachtpark van de heer. Wie hier een haas vangt, hangt. De hazen weten dat.', 'Het park van de heer, met een muur errond. Daarbinnen zijn de konijnen rijker dan wij.'],
  'Ruïne Warandekasteel': ['Het oude kasteel op de heuvel. Er staan nog maar wat muren. Kinderen spelen er ridder, en de schapen grazen er.', 'De ruïne. De oude heren woonden daar, voor de Nassaus. Nu woont er een uil.'],
  Tafelrondmotte: ['De Tafelronde is een ronde heuvel. Ze zeggen dat er ridders aan tafel zaten, maar ik heb er nooit een tafel gezien.', 'Daar wonen alvermannekes, zegt mijn moeder. Ik zeg: daar wonen konijnen.'],
  Allerheiligenkapel: ['De kapel voor de reizigers. Wie de weg op gaat, bidt daar. Wie terugkomt en verstand heeft, bidt er opnieuw.', 'Allerheiligen ligt buiten de poort. Elke pelgrim naar Scherpenheuvel steekt daar een kaarsje aan.'],
  Antwerpsepoort: ['De Schaluinpoort, aan de noordkant. Hier begint de weg naar Antwerpen, waar de schepen niet meer varen.', 'Langs hier komen de kooplieden uit de Kempen, met boter, wol en praatjes.'],
  Schaffensepoort: ['De Schaffensepoort. Daarachter liggen de heide en de schapen, en de laatste tijd ook de deserteurs.', 'Daar oefenen de schutters. Als je een pijl hoort fluiten, kijk dan niet om maar buk je.'],
  Koepoort: ['De oude Koepoort. Ze is al meer dan honderd jaar dichtgemetseld. De koeien gaan nu langs een andere poort, maar de naam is gebleven.', 'Voorbij de oude Koepoort liggen het Broek en de weiden. Het is mooi land, zolang het dag is.'],
  Maastrichtsepoort: ['De Beverenpoort, aan de zuidoostkant. Daar heffen ze tol op alles wat rolt.', 'Het garnizoen ligt hier in de buurt. Je hoort ze \'s avonds zingen, en ze zingen vals.'],
  Leuvensepoort: ['De Putterstraatpoort. Wouter de tollenaar staat er met zijn lijstje. Iedereen kent hem en niemand ziet hem graag.', 'Hier vertrek je naar Leuven, waar de geleerden wonen. Soms komen ze langs, en dan praten ze Latijn tegen de koeien.'],
  Allerheiligenpoort: ['Dit is de westpoort, naar Aarschot en Scherpenheuvel. De pelgrims gaan hier door, met hun stokken en hun liedjes.', 'De Allerheiligenpoort. Van hier loopt de weg langs de Demer naar het westen.'],
  Demerpoort: ['Daar komt de Demer binnen. Het water is bruin en het ruikt naar de looiers.', 'De waterpoort op de Demer. Als het water stijgt, gaan de schotten dicht, en dan wordt er gebeden.'],
  Webbekom: ['Webbekom is een dorp aan het moeras. Ze snijden er riet en blijven \'s nachts binnen.', 'De mensen van Webbekom zijn bang van het water. Ze hebben hun redenen.'],
  'Sint-Trudokerk': ['De kerk van Webbekom. Het klokkentouw is altijd vochtig, zeggen ze. Niemand weet waarom.', 'Sint-Trudo, in Webbekom. Het kerkje is klein, maar de angst is er groot.'],
  Kaggevinne: ['Kaggevinne is een paar hoeves en veel ganzen, en sinds kort ook struikrovers.', 'Hier woont boer Driesen. Hij had drie varkens, tot voor kort.'],
  'Veldkapel Galgeberg': ['De Galgenberg. Daar hangt de schepenbank van Kaggevinne haar dieven op, waar elke reiziger het ziet. Het helpt niet.', 'Kijk niet te lang naar de galg. Ze zeggen dat hij terugkijkt.'],
  Scherpenheuvel: ['Scherpenheuvel. Heel Brabant komt hier bidden, en daarna kopen, eten en drinken.', 'De heilige heuvel. Een halve eeuw geleden was het hier heide. Nu staat er een stad met zeven zijden.'],
  'Basiliek van Onze-Lieve-Vrouw van Scherpenheuvel': ['De kerk heeft zeven zijden en een koepel vol gouden sterren. Ik heb nog nooit iets mooiers gezien.', 'Hier staat het altaar op de plek van de eik. Ga binnen, en kijk naar boven.'],
  'De Heilige Eik': ['Daar stond de eik. Ze hebben hem omgehakt en er beeldjes van gesneden. De wortels zitten er nog.', 'De wortels van de eik zitten onder het altaar. Sommigen zeggen dat ze nog groeien.'],
};

// ===================================================================== "Wat valt er hier te doen?"
export const TODO_OPEN = [
  'Wat er te doen valt? ', 'Hm, iets te doen... ', 'Als je je verveelt: ', 'Ik weet wel iets. ', 'Allee, kijk: ', 'Voor iemand zoals jij? ',
  'Er is altijd iets te doen. ', 'Laat me even nadenken. ', 'Wel, ', 'Weet je wat je moet doen? ', 'Dan ben je bij mij aan het juiste adres. ', 'Hier in de buurt? ',
];
export const TODO: Record<string, string[]> = {
  read: ['Er hangt {what} {far}, {dir}. Kun jij lezen? Dan weet je meer dan ik.', 'Ga {what} lezen, {dir}, {far}. Ik weet niet wat erop staat. Vertel het me eens.', '{what}, {dir}. Iedereen loopt er voorbij, maar jij blijft misschien wel staan.'],
  shop: ['{what} staat {far}, {dir}. Zeg dat ik je stuur, dan krijg je misschien korting, of misschien ook niet.', 'Ken je {what} al? Het is {far}, {dir}. De waar is goed, maar de prijzen zijn gepeperd.', 'Ga eens langs bij {what}, {dir}. Je hebt het nodig, zo te zien.'],
  guide: ['Spreek met {what}, {dir}, {far}. Die weet meer dan goed voor hem is.', '{what} legt je alles uit, {dir}. Echt alles, dus neem er je tijd voor.', 'Als je iets wilt weten, vraag het dan aan {what}, {far}, {dir}.'],
  board: ['Op de markt hangt het aanplakbord. Daar zoeken ze altijd volk. Het is {far}, {dir}.', 'Kijk op het aanplakbord, {dir}. Er hangt werk, er hangen premies, en soms een verloren kip.', 'Op het aanplakbord, {far}, staat werk voor wie kan lezen en vechten.'],
  camp: ['{what} zit {far}, {dir}. Iemand moet ze wegjagen. Jij hebt een zwaard.', 'Er liggen {what} {dir}, {far}. Dat is iets voor wie van gevaar houdt.', 'Ga niet {dir}, want daar zitten {what}. Tenzij je die net zoekt, natuurlijk.'],
  giver: ['{what} zoekt hulp, {dir}, {far}. Je ziet het aan het gezicht.', '{what} zit in de miserie, {far}. Ga eens luisteren, {dir}.', 'Spreek met {what}, {dir}. Die zit ergens mee.'],
  place: ['Ben je al bij {what} geweest? Het is {far}, {dir}. Dat moet je gezien hebben.', '{what} ligt {dir}. Het is er mooi, en het is {far}.', 'Ga eens kijken bij {what}, {far}, {dir}.'],
  spot: ['Er is {what} {far}, {dir}. Het is niet veel, maar het is iets.', '{what}, {dir}. Ga eens kijken.', 'Zie je dat, {dir}? {what}. Daar stopt iedereen even.'],
  none: ['Te doen? Je hebt alles al gedaan, zo te zien. Ga eens zitten.', 'Ik denk dat er niks meer te doen is. Ga naar de herberg.', 'Je kent de stad intussen beter dan ik.'],
};

// ===================================================================== "Vertel eens iets"
export const GOSSIP: Record<Role, string[]> = {
  peasant: [
    'De rogge staat goed dit jaar, als de soldaten ze niet voor ons komen maaien.', 'De tiende is voor de abdij, de cijns voor de heer, de bede voor de koning. Wat overblijft, eet de muis.',
    'Op de markt krijg je voor een kip minder dan ze kost aan voer. Maar de stad moet eten, zeggen ze.', 'Mijn buurman zag lichtjes in het Broek. Hij had wel gedronken. Maar ik ook, en ik zag ze ook.',
    'Vorig voorjaar stond de Demer tot aan de weide. De koeien hebben een week op de dijk gestaan, als heiligen.', 'Een boer zonder paard is een man met zorgen. Ik heb geen paard.',
    'De soldaten betalen met papiertjes. "De koning betaalt later." De koning is nog nooit bij mij geweest.', 'Ze zeggen dat je regen ruikt als de koeien gaan liggen. Mijn koeien liggen altijd. Het regent ook altijd.',
    'Ik ga alleen naar de stad op marktdag. De rest van de week heeft de stad mij niet nodig.', 'In de oorlog van vijfendertig hebben de Fransen onze schuur verbrand. Mijn vader heeft hem herbouwd. Ik onderhoud hem. Mijn zoon zal hem wel weer zien branden.',
    'Wie aan de poort tol betaalt op zijn eigen eieren, die heeft het leven niet begrepen. Of hij is eerlijk, en dat komt eigenlijk op hetzelfde neer.', 'Heb je dat beest van jou al eens een schaap zien eten? Ik wel. Het was het mijne.',
    'De heide bij Schaffen is goed voor schapen en voor niets anders. Ook niet voor deserteurs, maar die zitten er toch.', 'Mijn grootvader zei: werk tot het donker wordt, en ga dan binnen. In het donker is het land niet van ons.',
    'Mijn grootvader ploegde dit veld al. Hij vond er een zwaard in. Wij ploegen eromheen.',
    'De abdij wil haar tiende in rogge, de soldaten in spek. Ik heb geen spek meer.',
  ],
  peasantWoman: [
    'Ik heb boter, eieren, kaas, en een kip als het moet. Ik sta hier al sinds de poort openging.', 'De bakker vraagt te veel voor zijn brood. Maar wie gaat er ruzie maken met een bakker?',
    'Die van de Lakenhalle kopen nooit iets op de markt. Ze laten het halen door hun meid. Die koopt bij mij.', 'Pas op voor de beurzensnijders, kind. Ze werken met twee: de ene praat en de andere snijdt.',
    'Mijn man is in Antwerpen met de kar. Hij zegt dat de stad stil is sinds de Schelde dicht is. Hij zegt ook dat het bier er duur is.', 'Op marktdag mogen de poorters eerst kopen, en wij van buiten pas daarna. Dan zijn de poorters al weg en is alles nog te koop.',
    'De meid van de drossaard koopt elke week twee kippen, voor één man. Ik zeg niks, ik denk er alleen het mijne van.', 'Ze zeggen dat de begijnen het beste laken weven. Ik zeg: ze hebben de beste getouwen, en geen man die erover klaagt.',
    'Vanmorgen stond er een draak op de markt, en nu leggen de kippen niet meer. Ik neem het je niet kwalijk. Of toch een beetje.', 'Kersen in juni, appels in september, en de hele winter koolsoep. Zo gaat het jaar.',
    'Als de klokken luiden, weet je wanneer de markt begint. Zonder klokken kwam iedereen te laat, behalve ik. Ik kom altijd te vroeg.', 'De tollenaar wil op alles tol: op mijn eieren, op mijn mand, en bijna op mijn kind.',
    'Mijn dochter wil begijn worden. Ik zeg: trouw liever met een wever. Zij zegt: juist daarom.',
    'Drie eieren voor een stuiver. Vorig jaar kreeg je er vier. De kippen zijn niet veranderd.',
    'Mijn man telt de muntjes, ik tel wat er overblijft. Ik ben sneller klaar.',
  ],
  burgher: [
    'De lakenhandel is niet meer wat hij was. Mijn voorouders verkochten op alle grote markten. Ik verkoop in Aarschot.', 'Ik heb twee ingekwartierde soldaten. Ze eten voor vier en betalen voor niemand.',
    'De schepenen willen de muren herstellen. Met wiens geld? Met het mijne, natuurlijk.', 'De baron woont in Den Haag, bij de ketters. Hij stuurt een drossaard en vraagt belasting. Zo is het altijd geweest.',
    'Er is in Antwerpen een nieuwe drukkerij geopend. Er zijn er al te veel. Iedereen wil lezen, niemand wil betalen.', 'Het bier van Diest gaat tot in Mechelen. Daar betalen ze er het dubbele voor en zeggen ze dat het van hen is.',
    'Een poorter betaalt geen tol aan zijn eigen poort. Daarom ben ik poorter. Het kostte me een fortuin, maar in honderd jaar verdien ik het terug.', 'Mijn schoonzoon studeert rechten in Leuven. Hij schrijft dat hij geld nodig heeft, en dat schrijft hij in het Latijn.',
    'De vrede van Munster was goed voor de Hollanders. Voor ons was ze vooral goed voor de Hollanders.', 'Ze zeggen dat de jonge prins van Oranje dood is. De baron ligt dus nog in de wieg. Ik hoop dat zijn voogden beter rekenen dan hij.',
    'Op de schepenbank spreken ze recht. Daarna gaan ze naar de herberg en spreken ze nog meer recht.', 'Mijn huis heet Het Gulden Hoofd. Mijn buurman noemt het Het Gulden Hoofd van Pieter. Hij is jaloers.',
    'Wie in de gilde zit, heeft werk. Wie er niet in zit, heeft tijd. Ik weet niet wie het beter heeft.',
    'Mijn grootvader had zes getouwen. Ik heb er twee, en een schuld bij de abdij.',
    'De muur bij de waterpoort zakt elk jaar een vinger. De schepenen meten het. Ze meten graag.',
  ],
  huik: [
    'Een huik is geen mode, het is fatsoen. Wie zonder huik naar de kerk gaat, heeft niets te verbergen. Dat is verdacht.', 'De vrouw van de drossaard draagt Spaanse kant, hier in Diest. Ik zeg er verder niets over.',
    'De kanunnik van Sint-Sulpitius preekt te lang. Ik tel de duiven in het gewelf. De laatste keer waren het er achtentwintig.', 'Mijn dochter trouwt in de zomer, met een brouwerszoon. Het is een goede familie, al ruiken ze naar mout.',
    'Ze zeggen dat de begijnen alles horen. Dat klopt. Ze vertellen het aan God, en God vertelt het aan de pastoor.', 'In Brussel dragen ze zwart, zegt mijn nicht. Hier dragen we ook zwart. Maar in Brussel kost het meer.',
    'Een vrouw zonder man mag geen ambacht uitoefenen, tenzij ze weduwe is, en dan nog alleen als de gilde het wil. Zo eenvoudig is het.', 'Er was een feest bij de schutters. De schutterskoning heeft drie dagen getrakteerd. Zijn vrouw betaalt nog altijd.',
    'Ik heb gehoord dat in Leuven de professoren ruziën over de genade. Hier ruziën we over de broodprijs. Dat is ook een soort genade.', 'Het weer is niet meer wat het was. De winters zijn kouder. De zomers ook.',
    'Je mag een huik niet op de markt dragen. Ik draag hem overal. Niemand zegt er iets van. Dat is fatsoen.', 'Mijn grootmoeder heeft de beeldenstorm nog gekend. Ze sprak er nooit over. Ze bad gewoon wat langer.',
    'Er is een draak in de stad, en de dames praten over niets anders. De heren ook, maar die doen alsof het over de oorlog gaat.',
    'Mijn moeder droeg deze huik naar de begrafenis van haar moeder. Ik draag hem naar de markt. Zo gaat alles achteruit.',
    'De dochter van de deken trouwt met een Leuvenaar. Niemand zegt het hardop. Iedereen weet het.',
  ],
  beguine: [
    'In de infirmerie liggen er zes: twee met koorts, één met een gebroken been, en drie die vooral eenzaam zijn.', 'Wij leggen geen eeuwige geloften af. Wie wil gaan, mag gaan. Bijna niemand gaat.',
    'Zuster Margriet kent elk kruid. Ik ken elk gebed. Samen helpen we de meesten.', 'We weven, en we verkopen het laken. De gilde vindt dat niet goed. De gilde vindt weinig goed.',
    'Bij valavond gaat de poort van het hof dicht. Wie te laat is, slaapt bij de pastoor. Hij snurkt.', 'Een begijn gaat naar de zieken in de stad, ook als het de pest is. Dan gaat ze zeker.',
    'Onze klok loopt voor op die van de stad. Zo zijn wij altijd op tijd voor de vespers.', 'De pelgrims die hier passeren, vertellen dat de kerk van Scherpenheuvel \'s nachts zoemt. Ik bid dat het de engelen zijn.',
    'De kinderen in de stad zijn bang van ons. Ze denken dat we hen opeten. We geven hen alleen pap.', 'Een weduwe zonder werk kan bij ons wonen. Ze moet wel kunnen spinnen en zwijgen. Het tweede is het moeilijkst.',
    'Het brood van het hof bakken we zelf. Het is niet zo goed als dat van de bakker. Het is wel beter voor de ziel.', 'Iemand heeft aan onze poort een mand met jonge katjes gezet. Nu hebben we elf katten. Zuster Clara noemt ze naar de apostelen.',
    'De Kerk had ons eeuwen geleden bijna verboden. We zijn er nog. De Kerk ook. We verdragen elkaar.',
    'Zuster Clara is negentig. Ze weet nog hoe het hof eruitzag voor de soldaten kwamen. Ze vertelt er niet graag over.',
    'Wie bij ons sterft, krijgt een kaars en een naam in het boek. Het boek is oud. Het is bijna vol.',
  ],
  soldier: [
    'Ik heb al drie maanden geen soldij gezien. Ik leef van de goedheid van de poorter bij wie ik lig, en die goedheid is op.', 'Ik kom uit Napels. Of beter: ik kwam uit Napels. Nu ben ik van Diest, van de koning, en van niemand.',
    'De Fransen zitten ver weg, in Artesië. Hier is het rustig, te rustig. Van rust worden soldaten slecht.', 'Een musket laden duurt langer dan een gebed. Ik heb gebeden geleerd, om de tijd te vullen.',
    'Mijn kameraad is vorige week weggelopen. Hij zit nu bij de deserteurs op de heide. Als ik hem vind, moet ik hem ophangen. Ik hoop dat ik hem niet vind.', 'De sergeant zegt dat discipline alles is. De sergeant heeft wel soldij gekregen.',
    'Op wacht staan aan de poort is het beste werk. Je ziet iedereen, en niemand ziet jou.', 'In de oorlog van vijfendertig heeft dit garnizoen de stad terugveroverd. Ik was er zelf niet bij, ik was nog een kind. Maar het staat op ons vaandel.',
    'Over een draak hebben ze ons bij de werving niets gezegd.', 'De poorter bij wie ik lig, heeft een dochter. Ik mag niet met haar praten, dus praat ik met de hond. De hond is eerlijk gezegd beter gezelschap.',
    'Wie op wacht slaapt, wordt gestraft. Wie niet slaapt, wordt gek. Ik slaap met één oog open.', 'Het bier van Diest is goed, te goed. De helft van het garnizoen is er gisteren mee in de gracht gevallen.',
    'Ze zeggen dat de landvoogd in Brussel een schilderijenkamer heeft zo groot als deze straat. En wij krijgen geen soldij.',
    'Mijn musket is ouder dan ik. Het heeft in Duitsland gediend. Het schiet nog altijd te ver naar links.',
    'Bij de inkwartiering kreeg ik een bed bij een weduwe. Ze telt mijn eten. Ik tel mijn dagen.',
  ],
  friar: [
    'Wij bedelen voor de armen. De rijken geven, de armen krijgen, en wij krijgen blaren aan de voeten.', 'Een preek moet kort zijn, zei mijn overste. Hij preekte twee uur over korte preken.',
    'In de oorlog hebben de soldaten ons klooster leeggehaald. Alleen ons brood lieten ze liggen. Zo slecht is het.', 'De mensen biechten bij mij wat ze bij de pastoor niet durven. Ik zwijg. Ik zwijg veel.',
    'Ik ben te voet naar Rome geweest. Het was ver en het was warm. Ik heb er de paus gezien, van ver.', 'Sint-Franciscus sprak met de vogels. Ik probeer het met de duiven van de Grote Markt. Ze luisteren niet.',
    'Wie geeft aan de armen, leent aan de Heer. De Heer betaalt terug, maar niet altijd in deze wereld.', 'Sommige pelgrims naar Scherpenheuvel lopen blootsvoets. Ik doe dat elke dag, en niemand noemt het een bedevaart.',
    'Ze zeggen dat de klokken de boze geesten tegenhouden. Ik zeg: een goed hart houdt meer tegen dan brons.', 'Het eten in het klooster is eenvoudig: pap, brood, bier, en op zondag nog eens pap.',
    'Een draak is ook een schepsel Gods. Ik heb de mijne nog niet gevonden, maar ik zoek.', 'De jansenisten in Leuven ruziën met de jezuïeten over de genade. Ik geef de genade gratis weg, hier op straat.',
    'Elke morgen sta ik om vier uur op. Dan is het bidden, werken, bidden en slapen. Het klinkt saai, en dat is het ook. Maar het is goed.',
    'Mijn sandalen zijn al drie keer verzoold. De zolen komen van een paardentuig. Ik loop als een paard.',
    'Een stervende vroeg me gisteren of de klokken weer zouden luiden. Ik zei ja. Ik hoop dat het waar is.',
  ],
  pilgrim: [
    'Ik kom uit Mechelen en heb drie dagen gelopen. Mijn voeten zijn nu heilig, of in elk geval gezwollen.', 'Ik heb een belofte gedaan toen mijn zoon ziek was. Hij is genezen. Nu loop ik. Een belofte is een belofte.',
    'Op de weg bij Kaggevinne lagen mannen in de struiken. We liepen met dertig, ze durfden niet. Alleen had ik het niet gehaald.', 'Je gaat driemaal biddend rond de kerk. Dan koop je een tinnen teken voor op je hoed, en dan een pint. In die volgorde.',
    'In Scherpenheuvel zag ik een man zijn krukken achterlaten. Hij liep zonder krukken weg. Ik heb het gezien, en ik geloof het nog niet helemaal.', 'De herbergen in Scherpenheuvel vragen het dubbele. Het is een heilige stad, en dat laten ze je betalen.',
    'Mijn tante ging elk jaar. Ze zei dat het oude beeldje in de eik zat, voor ze de kerk bouwden. Ze heeft het nog gezien, als kind.', 'Onderweg slaap ik in schuren. De boeren zijn meestal goed voor pelgrims. Soms laten ze de hond los.',
    'Je hoort veel op de weg: dat de klokken van Diest zwegen, dat er een draak is. Ik dacht dat het praatjes waren. En dan zie ik jou.', 'Mijn staf heeft al vier bedevaarten gelopen. De vorige eigenaar is er dood mee in een gracht gevonden. Hij zag er gelukkig uit.',
    'Een pelgrim mag niet vloeken, niet stelen en niet liegen. Over drinken zegt de regel niets.', 'Ze verkopen er duizenden beeldjes van de echte eik. Het moet een heel grote eik geweest zijn.',
    'Op de terugweg zingen we. Op de heenweg bidden we. In het midden klagen we over onze voeten.',
    'Mijn moeder liep deze weg met mij in haar buik. Ik loop hem nu met haar rozenkrans.',
    'Ze vragen twaalf stuivers voor een bed in Scherpenheuvel. Voor die prijs bid ik liever in de schuur.',
  ],
  child: [
    'Mijn broer zegt dat draken kinderen eten. Ik zeg dat hij liegt. Hij liegt toch?', 'Ik weet waar de duiven van de kerk slapen. Ik zeg het niet tegen de koster.',
    'Gisteren hebben we de gaai gespeeld. Ik was de gaai. Het deed pijn.', 'In de gracht zit een snoek zo groot als een hond. Ik heb hem bijna gezien.',
    'De begijnen geven pap. Je moet wel een gebed opzeggen. Ik ken er een half.', 'Als ik groot ben, word ik drakenrijder of bakker. Bij de bakker is het warmer.',
    'Mijn moeder zegt dat de Kludde stoute kinderen meeneemt. Ik ben bijna altijd braaf.', 'Weet je wat de schutters doen als ze niet schieten? Dan drinken ze. Mijn vader is schutter.',
    'Ik kan tot honderd tellen. Wil je het horen? Een, twee, drie...', 'Op de Tafelronde wonen alvermannekes. Als je \'s nachts gaat kijken, zie je ze. Ik mag \'s nachts niet buiten.',
    'De tollenaar heeft een wrat op zijn neus. Als je ernaar kijkt, betaal je dubbel.', 'Mag ik je draak aaien? Nee? Mag ik er dan naar kijken? Ik kijk al.',
    'Toen de klokken zwegen, wist niemand wanneer we moesten slapen. Het was de beste week van mijn leven.',
    'Ik heb een kogel gevonden in de gracht. Uit de oorlog, zegt mijn vader. Ik ruil hem voor jouw draak.',
    'Mijn zus telt de duiven. Ik tel de soldaten. Er zijn meer duiven.',
  ],
  oldMan: [
    'In de tijd van mijn overgrootvader was het laken van Diest het beste van Brabant. Nu koopt bijna niemand het nog.', 'Ik heb drie legers zien voorbijtrekken. Ze namen allemaal mijn kippen. Ook de Spanjaarden, en dat waren de onzen.',
    'Mijn knieën voorspellen het weer beter dan de almanak. Morgen regent het. Ik voel het in de linker.', 'In vijfendertig gaf de stad zich over aan de Fransen en de Hollanders. Datzelfde jaar nog stonden de Spanjaarden weer voor de poort. Ik weet niet meer wie we toen moesten toejuichen.',
    'De oude heren woonden op de Warande, in het kasteel. Nu is het een ruïne. Zo gaat het met heren.', 'Ik was een jongen toen Jan Berchmans hier rondliep. Het was een braaf kind, te braaf zelfs. Ik heb hem nooit zien vechten.',
    'Vroeger dronken we het bier warm, met een ei erin. Nu drinkt de jeugd het koud. Ik begrijp de wereld niet meer.', 'Mijn vader was klokkenluider. Hij zei: een klok heeft een ziel. Als ze zwijgt, is ze niet dood. Ze luistert.',
    'Wie aan de Demer woont, weet: het water neemt en het water geeft. Meestal neemt het.', 'Ik ken elke steen in deze straat. Ik heb er de helft zelf gelegd, toen ik nog kon bukken.',
    'De jonge mensen hebben geen geduld. Ze willen alles meteen. Ik wilde vroeger ook alles meteen. Ik heb het nooit gekregen.', 'Ze zeggen dat er een draak is. Ik heb er een gezien, als kind, op een wandtapijt in Brussel. Die van jou is groter.',
    'Een goede pijp, een pint, en een bank in de zon. Meer heeft een man niet nodig, behalve misschien zijn tanden.',
    'Ik heb die toren altijd zo plat gekend. Mijn vader ook, en zijn vader voor hem.',
    'Mijn vader was er toen ze in vijfendertig de poort openden. Hij heeft nooit gezegd wie het deed.',
  ],
  oldWoman: [
    'Ik heb negen kinderen gehad. Vier leven er nog. Dat is veel, voor deze tijden.', 'Ik brand elke week een kaars voor Sint-Rochus, tegen de pest. Het werkt: ik heb de pest nog nooit gehad.',
    'De begijnen zijn goed volk. Ik had er bijna een geworden. Toen kwam mijn man. Ik heb er nog altijd een beetje spijt van.', 'Als je een ekster ziet, groet je hem, anders brengt hij ongeluk. Ik groet er elke dag tien.',
    'Leg nooit een brood op zijn kop. Dan komt de duivel aan tafel. Dat zei mijn moeder, en zij heeft hem nooit gezien, dus het werkt.', 'De Demer heeft mijn broer genomen, toen hij zes was. Mijn moeder zei dat het de Nekker was. Ik zeg dat het de stroming was. Hij is in elk geval weg.',
    'Vroeger luidde de klok bij onweer, om het weg te jagen. Ik weet niet of het hielp. Maar het was een schoon geluid in het donker.', 'Mijn grootmoeder zag de beeldenstormers in de grote kerk. Ze zei dat ze weenden toen ze de beelden kapot sloegen. Ik heb dat nooit begrepen.',
    'Op Sint-Maarten krijgen de kinderen appels en noten, en ze zingen ervoor aan de deuren, vals maar met overtuiging.', 'Een vrouw die alleen leeft, wordt een heks genoemd. Een man die alleen leeft, een vrijgezel. Zo is de wereld.',
    'Je mag niet fluiten na donker. Dan roep je de dingen die in het donker leven. Mijn kleinzoon fluit altijd. Tot nu toe is hij nog niet opgehaald.', 'Kamille helpt tegen de buikpijn, vlier tegen de koorts, en een goed woord tegen al de rest.',
    'De oude koster luidde de klokken zestig jaar. Nu is het Pieter. Hij is nerveus, die jongen. Hij is vijftig.',
    'Ik heb mijn trouwring verkocht in een dure winter. Ik koop hem nooit terug. Hij past niet meer.',
    'Wat het water neemt, geeft het soms terug, zei mijn moeder. Ze zei niet wanneer.',
  ],
};

/** Lines anyone may say (or only `roles`), that react to what the player has done (conditions: cond() in src/life/life.ts). */
export const REACTIVE: { t: string; if: string; roles?: string[] }[] = [
  { if: 'bells_silent', t: 'Sinds de klokken zwijgen, bakt de bakker wanneer hij wakker wordt. Hij wordt laat wakker.' },
  { if: 'bells_silent', t: 'Er lag nat wier op de klokkenstoel, zeggen ze, veertig el boven de grond. Wie draagt er wier naar boven?' },
  { if: 'bells_silent', t: 'Mijn buurvrouw zette die nacht een kaars voor het raam, voor haar jongen. Die kaars brandt nog.' },
  { if: 'bells_silent', t: 'Zonder klokken gaan de poorten dicht wanneer de wachter er zin in heeft. Gisteren was dat om drie uur.' },
  { if: 'bells_ring', t: 'Hoor je de klokken? Ze slaan weer elk uur. Ik heb nooit gedacht dat ik dat geluid zou missen. Ik heb het gemist.' },
  { if: 'bells_ring', t: 'Ze zeggen dat jij de klepels uit het nest van de Kludde hebt gehaald. Ik geloof het bijna.' },
  { if: 'bells_ring', t: 'Bij de eerste slag ging je draak liggen, zag ik, als een hond bij het vuur.' },
  { if: 'bells_ring', t: 'De klokken luiden weer, en de bakker staat weer op tijd op. Het brood is er niet beter van geworden.' },
  { if: 'seals_reported', t: 'Die weduwe van Vranckx is verbannen. Haar kinderen eten nu bij de buren. De wet is de wet, zegt de gilde.' },
  { if: 'seals_begijnhof', t: 'Lijsbet Vranckx weeft nu bij de begijnen. Dat is beter zo, zeg ik. De gilde zegt iets anders, maar zachtjes.' },
  { if: 'seals_warned', t: 'Die weduwe van de valse zegels is gevlucht, zeggen ze. Iemand heeft haar gewaarschuwd. Niemand weet wie. Iedereen kijkt naar jou.' },
  { if: 'toll_bribe', t: 'Er gaat een vaatje brandewijn rond dat nooit tol heeft betaald. Je ruikt er een beetje naar, eerlijk gezegd.' },
  { if: 'toll_seized', t: 'Gielis de Ton is zijn brandewijn kwijt. Hij vloekt in drie talen, en in alle drie slecht.' },
  { if: 'toll_paid', t: 'Gielis de Ton heeft tol betaald, voor het eerst in twintig jaar. Wouter de tollenaar heeft er een kaars voor aangestoken.' },
  { if: 'roelof_done', t: 'Lambrecht de Rode is dood, en in Kaggevinne gaan de deuren weer gewoon dicht. Ze zeggen dat jij het was.' },
  { if: 'kludde_done', t: 'Jij hebt de Kludde verjaagd, zeggen ze. Mijn grootmoeder vraagt in welke gedaante. En ze zegt erbij: verjaagd is niet dood.' },
  { if: 'wisps_done', t: 'In het eikenbos dansen geen lichtjes meer. De pelgrims vinden de weg weer. Twee zijn nooit teruggekomen, maar die zoekt niemand meer.' },
  { if: 'herbs_done', t: 'Zuster Margriet heeft weer wondkruid. De koorts in de infirmerie zakt. Ze zegt dat het jouw kruid is. Ze zegt het niet graag.' },
  { if: 'letter_done', t: 'Jij bracht de brief van de drossaard naar Scherpenheuvel? Op een draak? Dan weet de overste het eerder dan de drossaard het geschreven had.' },
  { if: 'walk_done', t: 'Je hebt de hele stad rondgewandeld, hoor ik. Dan ken je ze beter dan de meeste poorters. Die kennen alleen de weg naar de herberg.' },
  { if: 'many_jobs', t: 'Jij doet al het werk van het aanplakbord, zeggen ze. De omroeper moet er nieuwe briefjes voor schrijven.' },
  { if: 'famous', t: 'Daar is {name}, die van de draak. Iedereen praat over je, en niet altijd goed.' },
  { if: 'famous', t: '{name}, mijn zoon wil later ook een draak. Ik heb gezegd: eerst je bord leegeten.' },
  { if: 'high_level', t: 'Dat is een stevig zwaard, {name}. Daar zou ik niet tegenover willen staan. Ik sta er tegenover. Ik ga even opzij.' },
  { if: 'gilden_high', t: 'De dekens van de gilden spreken goed over je. Dat doen ze over bijna niemand. Ze spreken zelfs slecht over elkaar.' },
  { if: 'kerk_high', t: 'De begijnen bidden voor je, zeggen ze, allemaal samen. Dat is veel gebed.' },
  { if: 'kroon_high', t: 'De soldaten groeten je, heb ik gezien. Anders groeten ze niemand, ook de drossaard niet als hij niet kijkt.' },
  { if: 'vrije_high', t: 'Ze zeggen dat je de paden van de smokkelaars kent. Ik zeg niets. Ik ken ze ook.' },
  { if: 'kroon_low_vrije_high', t: 'De drossaard heeft je naam laten opschrijven, hoor ik, in het boek van wie in de gaten gehouden wordt. Het is een dik boek.' },
  { if: 'blessed', t: 'Je ziet er gezegend uit. Ik weet niet hoe dat eruitziet, maar het zal ongeveer zo zijn.' },
  { if: 'night', t: 'Het wordt donker. Ga niet naar het Broek. Mijn vader ging, om een kalf te zoeken. Het kalf kwam terug.' },
  { if: 'poor', t: 'Je beurs ziet er licht uit. Op het aanplakbord zoeken ze altijd volk.' },
  // Het Oude Volk: rumours before you find them, talk after, and what De Kerk's people say
  ...OV_REACTIVE,
];

// ===================================================================== role specials
export const TEND = {
  offer: ['Laat zien. Hm. Dat ziet er niet goed uit. Een gift voor de zieken, twee stuivers, en ik verbind het.', 'Je bloedt op de stoep. Kom hier. Twee stuivers voor de armen, en je bent weer heel.', 'Ga zitten. Een gift voor de infirmerie, als je kunt, twee stuivers. Dan maak ik het schoon.', 'Je hebt geluk dat ik mijn tas bij me heb. Twee stuivers voor de zieken en ik doe het.'],
  fine: ['Je hebt niets, hooguit een schram. Kom terug als je echt bloedt.', 'Je bent kerngezond. Ga liever eens biechten, dat heb je misschien wel nodig.', 'Ik zie geen wonden. Ik zie wel een ziel die wat rust kan gebruiken. Daar heb ik geen zalf voor.'],
  done: ['Zo. Krab er niet meer aan, en ga niet vechten. Je gaat toch vechten, ik zie het aan je.', 'Dat is klaar. God helpe je, en ik ook, af en toe.', 'Het is verbonden. Bedankt voor je gift: er is een zieke die er vanavond van eet.', 'Ziezo. Dat geneest wel, met Gods hulp en een beetje smeerwortel.'],
  poor: ['Heb je geen geld? Dan doe ik het voor een gebed. Bid vanavond voor de zieken. Beloof je dat?', 'Je beurs is leeg en je wonden zijn open. Kom, ik doe het toch. Zeg het niet tegen de grootjuffrouw.'],
};

export const CAMPS_WARN = [
  'Pas op voor {camp}, {far}, {dir}. Als je daarheen gaat, trek dan eerst je zwaard. Ik zet het op je kaart.',
  'Er liggen {camp} {dir}, {far}. Wij mogen er niet heen zonder bevel. Jij hebt geen bevel nodig. Ik zet het op je kaart.',
  'Onveilig is het {dir}, {far}: daar heb je {camp}. Ik teken het voor je op je kaart.',
  'De sergeant waarschuwt voor {camp}, {dir}. Ze vallen aan in groep. Hou je rug vrij. Ik zet het op je kaart.',
  'Ik zou niet {dir} gaan. Daar heb je {camp}, {far}. Maar jij hebt een draak. Ik zet het op je kaart.',
  'Ze melden {camp}, {dir}, {far}. Als je ze verjaagt, betaalt het garnizoen misschien. Kijk op het aanplakbord.',
  'De wegen zijn veilig, behalve {dir}. Daar zitten {camp}, {far}. Op je kaart staat het nu.',
  'Hm. Je hebt {camp}, {dir}, {far}. Sommigen waren ooit soldaten. Nu hebben ze alleen nog honger en een zwaard.',
  'Als je van gevaar houdt, zoek dan {camp} op, {dir}. Ik zet het op je kaart. Daarna ben je op jezelf aangewezen.',
  'Wacht, ik wijs het je aan: {dir}, {far}, heb je {camp}. Ga niet alleen. Ah, je bent nooit alleen, met dat beest.',
  'Iedereen heeft het over {camp}, {dir}. De pelgrims lopen er met een boog omheen. Jij hoeft dat misschien niet te doen.',
  'Mijn kameraad is er gewond teruggekomen: {camp}, {dir}, {far}. Wees voorzichtig.',
];
export const CAMPS_NONE = ['Of het veilig is? Nu wel, en voor een deel dankzij jou. Ze komen terug, ze komen altijd terug.', 'Alles is rustig, bijna te rustig. Ga eens naar de herberg, daar gebeurt meer.', 'Ik weet van niets. En als ik niets weet, is het veilig.'];

export const BLESS = [
  'In nomine Patris... Zo. Ga in vrede, en sla alleen wie het verdient.', 'De Heer zegene en behoede je, en je draak ook. Vooral je draak, die heeft het nodig.',
  'Ik zegen je. Het is gratis. Een aalmoes voor de armen mag, maar het moet niet.', 'Kniel. Nee, niet in de modder, daar. Zo, nu ben je gezegend.',
  'Moge Sint-Joris je zwaard leiden en Sint-Franciscus je hart. Ze kennen elkaar niet, maar ze werken goed samen.', 'Je bent gezegend. Dat helpt tegen de slagen, zeggen de soldaten. Ze zeggen veel.',
  'Een kruisje op je voorhoofd. Zo. Je bent nu een beetje beter beschermd. Een beetje.', 'Ga, en wees niet bang. Of wees een beetje bang. Dat is gezond.',
  'De zegen van de Heer, voor wie onderweg is. Jij bent altijd onderweg, zo te zien.', 'Ik zegen je, je zwaard en je laarzen. Vooral je laarzen, die gaan het verst.',
  'Pax tecum. Dat is Latijn, voor: kijk uit waar je slaat.', 'Gezegend zij wie de zwakken beschermt. Ik hoop dat jij dat doet.',
];
export const BLESS_AGAIN = ['Ik heb je net gezegend. Gods zegen slijt niet zo snel. Kom morgen terug als je nog twijfelt.', 'Nog eens? De Heer heeft je al gehoord. Hij is niet doof.', 'Eén zegen per keer, vriend. Anders wordt het hoogmoed.'];

export const PILGRIM_TALES = [
  'In Scherpenheuvel stond vroeger een eik met een beeldje van Maria. Een herdersjongen wilde het meenemen en kon niet meer bewegen, tot zijn meester het terugzette. Zo vertellen ze het. Sindsdien komen de mensen.',
  'De aartshertogen lieten er een kerk bouwen met zeven zijden, in een stad met zeven hoeken. Het is het mooiste wat ik ooit gezien heb. En ik ben in Mechelen geweest.',
  'Ze gaan driemaal biddend rond de kerk, sommigen op hun knieën. Ik heb het één keer op mijn knieën gedaan en daarna nooit meer. Mijn knieën zijn nu ook pelgrims.',
  'Binnen hangen krukken, wassen armen, wassen benen en zelfs een wassen hart. Ze komen allemaal van mensen die genezen zijn, of die erop hoopten.',
  'Je gaat naar het westen, langs de weg naar Aarschot. Bij Kaggevinne moet je opletten voor de wegrovers. Daarna zie je de koepel boven de bomen, en dan ben je er bijna.',
  'De koepel is van binnen blauw, met gouden sterren. Als je lang genoeg kijkt, denk je dat ze bewegen. Dat komt van de wierook, zegt de overste.',
  'Truyken verkoopt beeldjes bij de kerk. Het zijn echte, uit het hout van de eik, zegt ze. Ik heb er drie gekocht. Ze zoemen niet. Dat is goed, denk ik.',
  'In het eikenbos ten oosten van Scherpenheuvel zie je \'s avonds lichtjes. Volg ze niet. Twee van onze groep hebben het gedaan. We hebben gebeden. Ze kwamen niet terug.',
  'De herbergen zitten vol, rond de grote bedevaartsdagen. Dan slapen de pelgrims in de schuren, in de kerk, en in de gracht als het moet.',
  'Mijn grootvader liep naar Scherpenheuvel toen er nog geen kerk was, alleen een kapelletje en de eik. Hij zei dat het toen stiller was. Hij zei ook dat hij toen jonger was.',
  'Je koopt een tinnen teken en speldt het op je hoed. Dan weet iedereen onderweg waar je geweest bent. Dan krijg je soms een bord soep. Pelgrims helpen pelgrims.',
  'Ze zeggen dat de kerk van Scherpenheuvel\'s nachts zoemt, sinds kort. De overste zegt dat het de wind is. De wind zoemt niet, zeg ik.',
  'De Spanjaarden, de Brabanders, de Walen, zelfs Fransen komen er. In de kerk zijn we allemaal hetzelfde. Buiten niet: de Walen zingen luider.',
  'Het hout van de eik is in stukken gezaagd en tot beeldjes gesneden. Die staan nu in kerken over heel de wereld. In Spanje en nog verder, zegt men. Een eik uit Brabant, overal ter wereld.',
];

export const DARES = {
  race: [
    'Ik daag je uit! Wie het eerst bij {what} is, {dir}! Ik tel tot {n}!', 'Wedden dat je niet bij {what} bent voor ik tot {n} heb geteld? {dir}! Lopen!',
    'Wie eerst! Tot aan {what}, {dir}. Ik tel tot {n}. Een, twee...', 'Kun jij lopen zonder je draak? Bewijs het! Naar {what}, {dir}, voor ik tot {n} tel!',
    'Ik ben de snelste van de straat. En jij? Tot {what}! {dir}! Ik tel tot {n}!',
  ],
  win: ['Je was er! Je bent snel. Voor een grote mens. Ik weet een geheim: {what}, {dir}. Niet verder vertellen!', 'Gewonnen! Hier, mijn mooiste knikker. Nee, die krijg je niet. Maar ik vertel je iets: {what}, {dir}.', 'Oei, je was er! Mijn broer gaat lachen. Hier, een appel. Hij is maar een beetje aangebeten.'],
  lose: ['Te laat! Ik heb gewonnen! Ik heb gewonnen van de drakenrijder!', 'Ha! Je bent traag! Zelfs mijn grootmoeder is sneller, en die heeft een stok!', 'Te laat, te laat! Wil je nog eens? Morgen. Nu moet ik eten.'],
  guess: ['In welke hand zit de knikker? Raad!', 'Raad! Links of rechts? Als je wint, krijg je hem. Als je verliest, krijg ik een stuiver. Nee, het is om te lachen.', 'Kies een hand. Snel!'],
  guessWin: ['Hoe wist je dat?! Hier. Hij is van glas. Uit Antwerpen. Bijna.', 'Juist! Je hebt gespiekt. Ik weet het zeker. Hier, je mag hem houden. Even.'],
  guessLose: ['Mis! Hij zat in de andere! Ik ben de beste goochelaar van Diest.', 'Fout! Mijn broer raadt het altijd. Mijn broer is slimmer dan jij. Hij is zes.'],
};

/** Old folks' tales: what people told each other (volksverhaal), or what we made up in that spirit (verzonnen). */
export const TALES: { t: string; truth: 'volksverhaal' | 'verzonnen' }[] = [
  { truth: 'verzonnen', t: 'Lang geleden woonde er een reus in de Demer, die de schippers tol liet betalen. Een vrouw van Diest kookte hem pap met spijkers erin. Hij at het en zonk. Zo vertelt men het. Ik zeg: met spijkers kun je niet koken.' },
  { truth: 'volksverhaal', t: 'De Kludde, kind. Hij is wat hij wil: een mager paard, een hond, een kat, een vleermuis. Twee blauwe vlammetjes, dat zijn zijn ogen. Hij springt je op de rug en wordt zwaarder bij elke stap, tot aan het water. Als je kettingen hoort, kijk dan niet om en bid.' },
  { truth: 'volksverhaal', t: 'In de Demer woont de Nekker. Hij trekt kinderen die aan de rand spelen het water in. Mijn moeder vertelde het me elke dag. Ik ben nooit in het water gevallen. Het werkt dus.' },
  { truth: 'volksverhaal', t: 'Op de Tafelronde, die ronde heuvel, wonen alvermannekes. Als je een kom pap buiten zet, maken ze \'s nachts je werk af. Maar als je ze bespiedt, maken ze alles kapot. Mijn grootvader bespiedde ze. Hij had daarna nooit meer een heel bord.' },
  { truth: 'volksverhaal', t: 'Een smid in een dorp hier vlakbij sloeg op een nacht een wolf met zijn hamer. De volgende morgen liep zijn buurman met een verbonden arm. Weerwolf, zei het dorp. De buurman verhuisde. Wat moest hij anders?' },
  { truth: 'volksverhaal', t: 'Als het onweert, luidt men de klokken. De klank jaagt het onweer weg, en de duivels die erin rijden. Daarom hebben de klokken een naam en zijn ze gedoopt. Een klok zonder naam is maar brons.' },
  { truth: 'volksverhaal', t: 'Sint-Maarten deelde zijn mantel met een bedelaar. Daarom krijgen de kinderen op zijn feest appels en noten. Wij delen onze appels. De appels zijn wel van de buren.' },
  { truth: 'verzonnen', t: 'Ze zeggen dat de stenen van de grote kerk uit de heuvels komen, waar het ijzer in de grond zit. Daarom is de kerk bruin, en daarom slaat de bliksem er nooit in. Dat laatste is niet waar. Hij is er twee keer ingeslagen.' },
  { truth: 'verzonnen', t: 'In de oorlog, lang geleden, verstopten de mensen van Diest hun zilver in de Warande. Niet iedereen kwam terug om het op te halen. Er ligt nog zilver onder de bomen, zeggen ze. Er hebben al veel mensen gegraven. Ze vonden wortels.' },
  { truth: 'volksverhaal', t: 'Een ei dat op Goede Vrijdag gelegd is, bederft nooit. Mijn moeder had er een, twintig jaar oud. Niemand durfde het open te breken. Het ligt nog in de kast.' },
  { truth: 'volksverhaal', t: 'De dwaallichten in het moeras zijn de zielen van wie de weg kwijt is. Ze zoeken gezelschap. Volg ze niet. Als je ze ziet, keer je je jas binnenstebuiten. Dan herkennen ze je niet.' },
  { truth: 'verzonnen', t: 'Een ekster op het dak: er komt nieuws. Twee eksters: er komt een bruiloft. Drie: er komt een begrafenis. Vier: er komen te veel eksters, en dan moet je een kat nemen.' },
  { truth: 'verzonnen', t: 'Wie op oudejaarsavond onder de appelboom luistert, hoort wie er volgend jaar trouwt. Ik heb het gedaan. Ik hoorde niets. Ik ben ook nooit getrouwd. Het klopt dus.' },
  { truth: 'verzonnen', t: 'In de toren van Sint-Sulpitius woont een uil die zo oud is als de toren. Hij heeft gezien hoe ze stopten met bouwen. Hij lacht er nog om, \'s nachts. Dat hoor je, als je goed luistert.' },
  { truth: 'verzonnen', t: 'De Galgenberg heeft zijn naam niet gestolen. Ze zeggen dat wie er bij volle maan langs loopt, de touwen hoort kraken, ook als er niemand hangt. Ik ben er nooit bij volle maan langs gelopen. Ik ben niet gek.' },
  { truth: 'verzonnen', t: 'Mijn grootmoeder zei: als de klokken zwijgen, komt het water. Ik heb nooit geweten wat ze bedoelde. Ze zei het toen de klokken luidden. Nu zwijgen ze, en ik denk er elke nacht aan.' },
];
/** Which tales open which pages of the Kroniek (index into TALES). */
export const TALE_PAGES: Record<number, string> = { 1: 'wezen:kludde', 2: 'wezen:nekker', 3: 'wezen:alvermannekes', 4: 'wezen:weerwolf', 10: 'wezen:dwaallicht' };

export const TOWN_VIEW: { t: string; if?: string }[] = [
  { t: 'Het gaat slecht. De lakenhandel ligt zo goed als stil, het garnizoen eet ons de oren van het hoofd, en de baron ligt in de wieg. Maar het bier is goed.' },
  { t: 'De stad houdt zich recht, zoals een oude man op een stok. Het gaat. Maar vraag het niet aan de stok.' },
  { t: 'De schepenen hebben de belasting op het bier verhoogd, om de muren te herstellen. Dus drinken we meer, voor de muren.' },
  { t: 'De weefgetouwen staan bijna allemaal stil, maar de brouwerijen niet. Diest is van het laken naar het bier gegaan. Het had erger gekund.' },
  { t: 'Sinds de vrede met de Republiek is het rustiger. Sinds de oorlog met Frankrijk is het onrustiger. Alles samen blijft het dus hetzelfde.' },
  { t: 'Er zijn te veel soldaten, te weinig werk en te veel praatjes. Zo is het eigenlijk altijd geweest.' },
  { if: 'bells_silent', t: 'Zonder klokken is het een stad zonder hart. De mensen komen te laat, de poorten gaan dicht wanneer het uitkomt, en \'s nachts staan er kaarsen voor de ramen.' },
  { if: 'bells_ring', t: 'De klokken luiden weer. Je merkt het overal: de mensen lopen rechter. Het klinkt belachelijk, maar het is waar.' },
  { if: 'gilden_low', t: 'De gilden kennen je nog niet. Doe zaken op de markt, help eens iemand, en ze leren je kennen. Zo gaat dat hier.' },
  { if: 'gilden_mid', t: 'De gilden beginnen je te kennen. Je krijgt al betere prijzen, heb ik gemerkt. Zo begin je een poorter te worden.' },
  { if: 'gilden_high', t: 'De gilden noemen je al bijna een van hen. Pas op: straks moet je mee vergaderen.' },
  { if: 'kroon_high', t: 'Het garnizoen is tevreden over je. De drossaard ook. Dat is goed voor jou, en voor de stad. Voor de smokkelaars minder.' },
  { if: 'vrije_high', t: 'Ze zeggen dat je goed staat bij de voerlui en de marskramers. Dat is handig, maar zeg het niet te luid bij de tollenaar.' },
  { if: 'kerk_high', t: 'De Kerk is blij met je, en de begijnen nog meer. Als je ziek wordt, ben je in goede handen.' },
  ...OV_TOWN_VIEW,
];

/** What people say about you, per party and tier (src/life/talk.ts). */
export const REP: Partial<Record<FactionId, string[]>> = {
  oranje: ['Het Hof van Nassau weet niet wie je bent.', 'De drossaard heeft je naam in zijn boek gezet, voorlopig zonder oordeel.', 'Ze zeggen stilletjes dat het Hof je goedgezind is.', 'De mannen van de prins groeten je als een van hen.', 'Ze zeggen dat ze in Den Haag je naam kennen.'],
  gilden: ['De gilden kennen je niet.', 'De gilden hebben je naam al eens gehoord.', 'De gilden zeggen dat je goed volk bent.', 'De dekens van de gilden spreken met respect over je.', 'De gilden noemen je een vriend van de stad. Dat zeggen ze over bijna niemand.'],
  kerk: ['De Kerk weet niet wie je bent.', 'De begijnen hebben over je gehoord.', 'De begijnen bidden voor je, af en toe.', 'De Kerk spreekt goed over je, van de koster tot de deken.', 'Ze zeggen in de kerk dat je door God gestuurd bent. Of door de draak. Ze zijn er nog niet uit.'],
  kroon: ['Het garnizoen kent je niet. Dat is misschien maar goed ook.', 'De drossaard heeft je naam laten opschrijven, zonder er iets bij te zetten.', 'De soldaten zeggen dat je te vertrouwen bent.', 'De Kroon is je dankbaar. De sergeant groet je zelfs.', 'Ze zeggen dat de landvoogd zelf van je gehoord heeft.'],
  oudevolk: OV_REP,
  vrije: ['De voerlui en de marskramers weten niet wie je bent.', 'De voerlui hebben je zien vliegen. Ze vragen zich af wat je vervoert.', 'De marskramers zeggen dat je een van hen bent, half en half.', 'De smokkelaars noemen je een vriend. Zeg het niet tegen de tollenaar.', 'Elke voerman tussen hier en Antwerpen kent je naam, en houdt zijn mond.'],
};
export const REP_DEEDS: { t: string; if: string }[] = [
  { if: 'bells_ring', t: 'Iedereen weet dat jij de klokken weer hebt doen luiden.' },
  { if: 'seals_reported', t: 'Ze weten dat jij de weduwe van Vranckx hebt aangegeven. Sommigen vinden dat goed, maar niet iedereen.' },
  { if: 'seals_begijnhof', t: 'Ze weten dat jij Lijsbet Vranckx naar de begijnen hebt gestuurd. Dat vinden ze menselijk.' },
  { if: 'seals_warned', t: 'Ze fluisteren dat jij de vervalster hebt laten lopen.' },
  { if: 'toll_bribe', t: 'En van de brandewijn weet iedereen, echt iedereen.' },
  { if: 'roelof_done', t: 'In Kaggevinne noemen ze je naam aan tafel, sinds dat met Lambrecht de Rode.' },
  { if: 'kludde_done', t: 'En dat van de Kludde, dat vertellen ze aan de kinderen.' },
  ...OV_REP_DEEDS,
];

export const WORK = [
  'Werk? Op het aanplakbord op de markt hangt altijd iets. {what}', 'Ik zou zeggen: het aanplakbord. Of kijk wie er met een zorgelijk gezicht staat te wachten. {what}',
  'Iemand zoekt altijd hulp, als je goed kijkt. {what}', 'Werk voor een sterke arm? {what}', 'Ik heb geen werk, ik heb zelf geen werk. Maar {what}',
  'De omroeper weet waar volk gezocht wordt. En het aanplakbord. {what}', 'Hm. {what} Ga eens kijken.',
  'Voor wie wil werken, is er werk. Voor wie wil betaald worden, is het moeilijker. {what}', 'Mijn neef zocht werk en vond een vrouw. Jij vindt misschien werk. {what}',
  'Werk ligt niet op straat. Behalve vandaag: {what}', 'Vraag het aan de poortwachters. Of: {what}', 'Ik weet iets. {what}',
];

export const FOOD = {
  open: ['Ik heb appels, kaas en een stuk brood. Alles komt vers van de hoeve, of toch bijna.', 'Wat heb ik in mijn mand? Alles wat een mens nodig heeft, behalve geld.', 'Kijk maar. Mijn kaas is de beste van de markt, zegt mijn man. Hij is kaasboer.', 'Een vreemdeling betaalt hier evenveel als een poorter. Een draak betaalt het dubbele.'],
};
export const FOOD_GOODS = [
  { id: 'appel', name: 'Een appel', text: 'Je voelt je meteen een beetje beter.', price: 1, use: { heal: 0.15 } },
  { id: 'kaas', name: 'Een stuk kaas', text: 'De kaas herstelt langzaam je leven tijdens een gevecht. Je bewaart hem in je tas.', price: 2, use: { regen: 0.018, secs: 30 } },
  { id: 'eieren', name: 'Twee gekookte eieren', text: 'Je voelt je meteen een flink stuk beter.', price: 2, use: { heal: 0.35 } },
] as const;

/** After an answer: the way back to the menu. */
export const MORE = ['Ik wil nog iets vragen.', 'Ik heb nog een vraag.', 'Wat weet je nog meer?'];
export const BYE = ['Dank je. Tot ziens.', 'Dank je wel. Ik ga verder.', 'Goed. Dag.'];
export const BYE_REPLY = ['Dag. Pas op voor de karren.', 'Tot ziens. En hou dat beest van je in toom.', 'Goeiendag.', 'God zij met je.', 'Allee, salut.', 'Ga in vrede.'];
