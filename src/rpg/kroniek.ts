// De Kroniek: everything the player has learned about Brabant in 1650.
// Entries unlock by doing things in the world (reaching a place, meeting a
// person, killing a creature, reading a notice) and every entry says plainly
// what kind of knowledge it is: history, folk tale, or invented for this game.
// That label is the game's promise: the towns and their past are real, the
// monsters are what people then believed in, and the dragon is ours.

import { LORE } from '../world/lore';

export type Truth = 'geschiedenis' | 'volksverhaal' | 'verzonnen';
export type Cat = 'plaats' | 'tijd' | 'mens' | 'wezen';

export const TRUTH: Record<Truth, { name: string; note: string }> = {
  geschiedenis: { name: 'Geschiedenis', note: 'Zo was het, of zo staat het in de archieven.' },
  volksverhaal: { name: 'Volksverhaal', note: 'Zo vertelden de mensen het elkaar.' },
  verzonnen: { name: 'Verzonnen', note: 'Dit hebben wij erbij bedacht.' },
};
export const CATS: Record<Cat, string> = { plaats: 'Plaatsen', tijd: 'Tijd en zeden', mens: 'Mensen', wezen: 'Wezens' };

export interface Entry {
  id: string;
  cat: Cat;
  title: string;
  text: string;
  truth: Truth;
  /** shown while the entry is still locked */
  hint: string;
  /** a page about something the player has to find first (Het Oude Volk): not listed, not counted, until unlocked */
  secret?: boolean;
}

/** A notice, a stone, a thing you can read in the world: reading it unlocks an entry. */
export interface Readable {
  entry: string;
  /** what the prompt calls it */
  label: string;
  at: [number, number];
  /** what stands there (default: a notice board) */
  kind?: 'board' | 'stone' | 'cannon' | 'pillory';
}

// Places whose card tells a legend or something we made up (the rest is history). Every place card is
// history now: the Tafelronde card says what the folk call it, and the roots of the oak have their own page.
const PLACE_TRUTH: Record<string, Truth> = {};

const places: Entry[] = Object.entries(LORE).map(([key, l]) => ({
  id: `plaats:${key}`,
  cat: 'plaats',
  title: l.title,
  text: l.text,
  truth: PLACE_TRUTH[key] ?? 'geschiedenis',
  hint: 'Ga erheen, te voet of op de draak.',
}));

const tijd: Entry[] = [
  { id: 'tijd:klokken', cat: 'tijd', truth: 'geschiedenis', title: 'De klokken regeren', hint: 'Lees het klokkenreglement bij Sint-Sulpitius.',
    text: 'Een stad leeft op haar klokken. De werkklok opent en sluit de dag, de poortklok de poorten, de banklok roept de burgers bijeen bij brand of onraad. Wie na de avondklok zonder lantaarn op straat loopt, betaalt boete. Een stad die haar klokken niet hoort, weet niet meer wanneer ze bang moet zijn.' },
  { id: 'tijd:laken', cat: 'tijd', truth: 'geschiedenis', title: 'Het lakenzegel', hint: 'Lees het bord aan de Lakenhalle.',
    text: 'Zoals in elke lakenstad wordt elk stuk laken gemeten en gekeurd. Is het goed, dan knijpt de waardijn er een loden zegel aan met het wapen van de stad. Tweehonderd jaar geleden was dat loodje het woord van Diest: kopers ver over de grens vertrouwden het zonder de wever ooit te zien. Nu komen er nog maar weinig kopers.' },
  { id: 'tijd:kaak', cat: 'tijd', truth: 'geschiedenis', title: 'De kaak', hint: 'Bekijk de schandpaal op de Grote Markt.',
    text: 'Wie vals weegt, steelt of lastert, staat een marktdag lang aan de kaak, met zijn misdaad op een bord om de hals. De straf is de schande. De rotte kolen zijn een gift van de buren.' },
  { id: 'tijd:tol', cat: 'tijd', truth: 'geschiedenis', title: 'Het toltarief', hint: 'Lees het tolbord aan de Putterstraatpoort.',
    text: 'Aan elke poort hangt het tarief: zoveel stuivers per vat bier, per zak zout, per os. Twintig stuivers maken één gulden, die het volk nog altijd florijn noemt. Poorters van de stad betalen niets. Daarom kent iedereen aan de poort plots een poorter.' },
  { id: 'tijd:schutters', cat: 'tijd', truth: 'geschiedenis', title: 'De schuttersgilden', hint: 'Lees het gildebord op het oefenveld bij de Schaffensepoort.',
    text: 'Sint-Sebastiaan schiet al sinds 1388 met de handboog, de kolveniers schieten met het vuurroer. De gilden bewaken de muren als het moet. Als het niet moet, schieten ze de gaai van de staak en drinken ze op de koning van het jaar.' },
  { id: 'tijd:vrede', cat: 'tijd', truth: 'geschiedenis', title: 'De vrede van Munster', hint: 'Lees het plakkaat aan het schepenhuis.',
    text: 'In 1648 sloot de koning van Spanje vrede met de Republiek in het noorden, na tachtig jaar. De Schelde bleef dicht voor zeeschepen, en Antwerpen bleef daar de prijs voor betalen. De oorlog met Frankrijk gaat gewoon door, en de soldaten die hem voeren moeten ergens eten.' },
  { id: 'tijd:1635', cat: 'tijd', truth: 'geschiedenis', title: 'Het jaar 1635', hint: 'Lees de steen in de stadsmuur bij de Schaluinpoort.',
    text: 'Vijftien jaar geleden trokken een Frans en een Staats leger samen door Brabant. Tienen werd geplunderd en verbrand. Diest gaf zich over en werd nog hetzelfde jaar door de Spanjaarden heroverd. Wie toen kind was, schrikt nog van trommels.' },
  { id: 'tijd:hollegriet', cat: 'tijd', truth: 'verzonnen', title: 'Holle Griet', hint: 'Bekijk het grote kanon van Diest.',
    text: 'Een smeedijzeren donderbus, te zwaar om te verplaatsen en te oud om te vertrouwen. Ze schoot stenen kogels zo groot als een kaasbol. Deze Holle Griet hebben wij erbij bedacht, maar zulke reuzen stonden echt in veel steden, zoals de Dulle Griet in Gent.' },
  { id: 'tijd:berchmans', cat: 'tijd', truth: 'geschiedenis', title: 'Jan Berchmans', hint: 'Lees het bordje aan het huis van de schoenmaker, bij de markt.',
    text: 'Jan Berchmans was de zoon van een schoenmaker uit Diest, geboren in 1599. Hij werd jezuïet en stierf in 1621 in Rome, tweeëntwintig jaar oud. Daar noemen ze hem al een heilige. In Diest zeggen ze: hij was een brave jongen, en hij groette altijd.' },
  { id: 'tijd:bier', cat: 'tijd', truth: 'geschiedenis', title: 'Het bier van Diest', hint: 'Lees het uithangbord bij het brouwershuis, ten noorden van de markt.',
    text: 'Diest is van oudsher een brouwersstad, en ze drinkt veel van haar bier zelf op. De rest gaat in vaten de Demer af, zeggen de brouwers, tot in Mechelen en Antwerpen. Ze zeggen ook dat de accijns de stadsmuren betaalt, zodat elke pint een daad van burgerzin is.' },
  { id: 'tijd:demer', cat: 'tijd', truth: 'geschiedenis', title: 'De Demer', hint: 'Lees de peilsteen bij de waterpoort op de Demer.',
    text: 'De rivier is de weg, de molenaar en de riool van de stad. In natte jaren staat het Broek blank tot aan de muren, en vertellen de mensen elkaar wat er dan uit het water komt, en wat er niet meer uit komt.' },
  { id: 'tijd:garnizoen', cat: 'tijd', truth: 'geschiedenis', title: 'Het garnizoen', hint: 'Lees het inkwartieringsbevel bij de Beverenpoort.',
    text: 'De soldaten van de koning liggen ingekwartierd bij de burgers, die hun een bed, vuur, licht en zout moeten geven. De soldij komt maanden te laat of nooit. Een soldaat zonder soldij wordt eerst een dief en dan een deserteur.' },
  { id: 'tijd:baron', cat: 'tijd', truth: 'geschiedenis', title: 'De baron in de wieg', hint: 'Lees het bericht aan de deur van het Hof van Nassau.',
    text: 'De heer van Diest is de Prins van Oranje. Het nieuws van dit najaar: prins Willem II is aan de pokken gestorven, en acht dagen later werd zijn zoon geboren. De baron van Diest ligt in Den Haag in de wieg, en anderen regeren in zijn naam.' },
  { id: 'tijd:bedevaart', cat: 'tijd', truth: 'geschiedenis', title: 'De bedevaart', hint: 'Lees het bord voor de pelgrims in Scherpenheuvel.',
    text: 'Pelgrims komen te voet uit heel Brabant en gaan biddend rond de kerk, zoals hun grootouders driemaal rond de oude eik liepen. Ze nemen een pelgrimsteken of een papieren vaantje mee naar huis. Wie genezen is, laat zijn krukken achter. De waard, de kaarsenmaker en de schoenlapper worden er niet armer van.' },
  { id: 'tijd:zeven', cat: 'tijd', truth: 'geschiedenis', title: 'De stad van zeven', hint: 'Lees de gedenksteen aan de kerk van Scherpenheuvel.',
    text: 'De aartshertogen lieten Scherpenheuvel aanleggen met zeven hoeken, rond een kerk met zeven zijden, naar een plan van Wenceslas Cobergher. Rond de kerk staan de bomen in een ster met zeven punten. De hele stad is bedoeld als een gebed. Het is nog maar de vraag of er ooit genoeg mensen komen wonen.' },
  { id: 'tijd:wortels', cat: 'tijd', truth: 'verzonnen', title: 'De wortels van de eik', hint: 'Vraag de pelgrimsgids of de kerk echt zoemt.',
    text: 'De wortels van de eik zijn nooit uitgegraven, en ze groeien nog, onder het altaar van Scherpenheuvel. Wie \'s nachts in de kerk blijft, voelt ze zoemen door de vloer. Dat hebben wij verzonnen: in geen enkele kroniek staat dat de kerk zoemt.' },
  { id: 'tijd:draken', cat: 'tijd', truth: 'verzonnen', title: 'Draken in Brabant', hint: 'Je zit erop.',
    text: 'Draken zul je in geen enkel archief vinden. Het land zelf is zoals het was: de straten, de muren, de kerken, de oorlog. De draak hebben wij erbij bedacht. De mensen van 1650 zouden er minder van opgekeken hebben dan je denkt.' },
  { id: 'tijd:klank', cat: 'tijd', truth: 'verzonnen', title: 'De macht van brons', hint: 'Laat de klokken van Diest weer luiden.',
    text: 'De mensen geloofden echt dat klokgelui onweer, pest en duivels verdreef: klokken werden gedoopt en droegen namen. Dat een beiaardier er vijanden mee kan vellen, hebben wij erbij verzonnen. Veel moesten we er niet bij verzinnen.' },
];

const mensen: Entry[] = [
  { id: 'mens:neelke', cat: 'mens', truth: 'verzonnen', title: 'Neelke', hint: 'Zij is je zusje.',
    text: 'Neelke is je zusje. Ze telde alles: stappen, sterren, de slagen van de klok, zodat de wereld niet kon weglopen. In de nacht dat de klokken van Diest zwegen, nam het water haar mee. Wat het water neemt, geeft het soms terug.' },
  { id: 'mens:pieter', cat: 'mens', truth: 'verzonnen', title: 'Pieter Vandenbempt', hint: 'Spreek met de koster van Sint-Sulpitius.',
    text: 'Pieter is de koster van Sint-Sulpitius. Hij luidt de klokken, graaft de graven en weet van elke Diestenaar wanneer hij gedoopt is en wat hij de kerkfabriek nog schuldig is.' },
  { id: 'mens:marieke', cat: 'mens', truth: 'verzonnen', title: 'Marieke Smets', hint: 'Spreek met de marskraamster op de Grote Markt.',
    text: 'Marieke is marskraamster. Ze verkoopt alles wat in een mand past en koopt alles wat je kwijt wilt, voor de helft van de prijs. Ze weet het nieuws een dag voor het gebeurt.' },
  { id: 'mens:joos', cat: 'mens', truth: 'verzonnen', title: 'Meester Joos Peeters', hint: 'Spreek met de deken van de wevers.',
    text: 'Joos is de deken van het weversambacht. Hij waakt over het zegel van Diest alsof het zijn eigen eer was, en dat is het ook. Zelf heeft hij in jaren geen draad meer geweven.' },
  { id: 'mens:aleydis', cat: 'mens', truth: 'verzonnen', title: 'Zuster Margriet', hint: 'Spreek met de begijn in het Begijnhof.',
    text: 'Margriet is begijn en verzorgt de zieken. Ze kent elk kruid in de tuin en elk pelgrimsteken van Brabant. Ze heeft geen geloften afgelegd die haar beletten te zeggen wat ze denkt.' },
  { id: 'mens:drossaard', cat: 'mens', truth: 'verzonnen', title: 'Jonker Hendrik van Gorp', hint: 'Spreek met de drossaard.',
    text: 'Hij is de drossaard van Diest: de man van de baron, die de orde bewaart en de boetes int. Hij dient een heer in het noorden en een koning in het zuiden, en hij slaapt er slecht van.' },
  { id: 'mens:wouter', cat: 'mens', truth: 'verzonnen', title: 'Wouter Claes', hint: 'Spreek met de tollenaar aan de Putterstraatpoort.',
    text: 'Wouter is tollenaar aan de Putterstraatpoort. Hij telt vaten, karren en ossen, en hij telt ze graag in zijn eigen voordeel.' },
  { id: 'mens:lijsbet', cat: 'mens', truth: 'verzonnen', title: 'Lijsbet Vranckx', hint: 'Spreek met de weversweduwe.',
    text: 'Lijsbet is de weduwe van een wever. Het ambacht heeft haar het getouw van haar man afgenomen; nu weeft ze op een oud getouw, achter in het huis. Haar kinderen zijn al lang het huis uit, haar schulden niet: zo ziet armoede eruit in een lakenstad.' },
  { id: 'mens:gielis', cat: 'mens', truth: 'verzonnen', title: 'Gielis "de Ton"', hint: 'Spreek met de voerman buiten de westpoort.',
    text: 'Hij is voerman, zegt hij zelf. Zijn kar rijdt vooral \'s nachts en zijn vaten staan op geen enkele tollijst.' },
  { id: 'mens:driesen', cat: 'mens', truth: 'verzonnen', title: 'Boer Jan Driesen', hint: 'Spreek met de boer in Kaggevinne.',
    text: 'Driesen boert in Kaggevinne. Hij heeft in dertig jaar drie legers over zijn akker zien trekken, en hij heeft van alle drie evenveel gehouden.' },
  { id: 'mens:truyken', cat: 'mens', truth: 'verzonnen', title: 'Truyken', hint: 'Spreek met de verkoopster in Scherpenheuvel.',
    text: 'Ze verkoopt beeldjes van eikenhout aan de voet van de bedevaartskerk en onthoudt elk gezicht dat er een koopt.' },
  { id: 'mens:provost', cat: 'mens', truth: 'verzonnen', title: 'Pater Jan Cools', hint: 'Spreek met de overste van Scherpenheuvel.',
    text: 'Jan Cools is de overste van de oratorianen, de paters van Scherpenheuvel. Hij is een geleerd man die het bedevaartsoord bestuurt zoals een veldheer: met lijsten.' },
];

const wezens: Entry[] = [
  { id: 'wezen:deserteur', cat: 'wezen', truth: 'geschiedenis', title: 'Deserteurs', hint: 'Versla er een.',
    text: 'Het zijn soldaten zonder soldij en zonder vaandel. Ze leven van wat de boeren hebben, en nemen het met het zwaard waarmee ze die boeren moesten beschermen. Ze halen ver uit voor ze slaan: wacht op de rode gloed, rol opzij en sla dan terug.' },
  { id: 'wezen:musketier', cat: 'wezen', truth: 'geschiedenis', title: 'Musketiers', hint: 'Versla er een.',
    text: 'Een musket laden duurt een halve minuut en vraagt twee handen en een brandende lont. Daarna schiet het door een harnas. Loop niet recht op hen af, en geef hen geen tijd om te herladen.' },
  { id: 'wezen:broekhond', cat: 'wezen', truth: 'verzonnen', title: 'Broekhonden', hint: 'Versla er een.',
    text: 'Ze zijn zwart, nat en mager, met ogen als lantaarns. De Kludde kon een hond zijn als hij dat wou, maar een meute hebben de mensen hem nooit gegeven. Die hebben wij erbij bedacht. Ze zijn snel maar zwak: hou ze voor je zwaard en nooit achter je rug.' },
  { id: 'wezen:dwaallicht', cat: 'wezen', truth: 'volksverhaal', title: 'Dwaallichten', hint: 'Versla er een.',
    text: 'Het zijn blauwe vlammetjes boven het moeras. De mensen zeiden dat het de zielen van ongedoopte kinderen waren, die reizigers het broek in lokten. Wie er een volgde, kwam niet meer thuis. Ze werpen vuur van ver, dus ga er dicht naartoe.' },
  { id: 'wezen:kludde', cat: 'wezen', truth: 'volksverhaal', title: 'De Kludde', hint: 'Vind hem in het Broek.',
    text: 'Brabant en Vlaanderen kenden hem, maar de meeste verhalen zijn opgetekend langs Dender en Schelde: in Lebbeke, Wichelen, Herdersem en Aalst. Hij is wat hij wil: een uitgehongerd paard, een hond of een kat, met twee blauwe vlammetjes die voor hem uit dansen. Hij kwelt reizigers en verdwijnt in het water. Dat hij in de Demer woont, hebben wij bedacht.' },
  { id: 'wezen:roelof', cat: 'wezen', truth: 'verzonnen', title: 'Lambrecht de Rode', hint: 'Zoek hem op de Galgenberg.',
    text: 'Hij was kapitein in het leger van de koning, zegt hij zelf. Zijn mannen zeggen dat hij vaandrig was. Toen de soldij uitbleef, begon hij zijn eigen belasting te heffen op de weg naar Scherpenheuvel. Hem hebben wij verzonnen, maar mannen als hij waren er genoeg.' },
];

export const ENTRIES: Entry[] = [...places, ...tijd, ...mensen, ...wezens];
const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

/** More pages, written elsewhere (src/content/diest_life.ts: what guides and townsfolk teach). */
export function addEntries(list: Entry[]) {
  for (const e of list) {
    if (BY_ID.has(e.id)) continue;
    ENTRIES.push(e);
    BY_ID.set(e.id, e);
  }
}

/** Things to read in and around Diest (positions are adjusted to open ground when placed). */
export const READABLES: Readable[] = [
  { entry: 'tijd:klokken', label: 'het klokkenreglement', at: [22, 44] },
  { entry: 'tijd:kaak', label: 'de kaak', at: [-10, -14], kind: 'pillory' },
  { entry: 'tijd:laken', label: 'het keurbord', at: [84, 34] },
  { entry: 'tijd:vrede', label: 'het plakkaat', at: [-50, 30] },
  { entry: 'tijd:berchmans', label: 'het bordje', at: [48, -40] },
  { entry: 'tijd:tol', label: 'het tolbord', at: [-108, 362] },
  { entry: 'tijd:schutters', label: 'het gildebord', at: [520, -560] },
  { entry: 'tijd:1635', label: 'de steen', at: [-52, -676], kind: 'stone' },
  { entry: 'tijd:hollegriet', label: 'het grote kanon', at: [150, 62], kind: 'cannon' },
  { entry: 'tijd:bier', label: 'het uithangbord', at: [-8, -118] },
  { entry: 'tijd:demer', label: 'de peilsteen', at: [-290, -52], kind: 'stone' },
  { entry: 'tijd:garnizoen', label: 'het bevel', at: [330, 580] },
  { entry: 'tijd:baron', label: 'het bericht', at: [300, 162] },
  { entry: 'tijd:bedevaart', label: 'het pelgrimsbord', at: [-5020, 560] },
  { entry: 'tijd:zeven', label: 'de gedenksteen', at: [-5040, 500], kind: 'stone' },
];

export interface KroniekEvents {
  /** a new entry: toast it and pay the reward */
  unlocked(e: Entry, count: number, total: number): void;
  /** every tenth entry */
  milestone(count: number, total: number): void;
}

export class Kroniek {
  constructor(private store: { kroniek: string[] }, private ev: KroniekEvents, private save: () => void) {}

  /** what the player can see exists: every page, except secret ones not found yet */
  private shown(e: Entry) {
    return !e.secret || this.has(e.id);
  }
  get total() {
    return ENTRIES.filter((e) => this.shown(e)).length;
  }
  get count() {
    return this.store.kroniek.filter((id) => BY_ID.has(id)).length;
  }
  has(id: string) {
    return this.store.kroniek.includes(id);
  }
  entry(id: string) {
    return BY_ID.get(id);
  }
  list(cat: Cat) {
    return ENTRIES.filter((e) => e.cat === cat && this.shown(e));
  }

  /** Learn something. Returns the entry when it is new. */
  unlock(id: string, quiet = false): Entry | null {
    const e = BY_ID.get(id);
    if (!e || this.has(id)) return null;
    this.store.kroniek.push(id);
    this.save();
    if (!quiet) this.ev.unlocked(e, this.count, this.total);
    if (this.count % 10 === 0) this.ev.milestone(this.count, this.total);
    return e;
  }

  /** A line of lore the player already knows (for loading screens and gossip), or any place card. */
  tip(r = Math.random()): Entry {
    const known = ENTRIES.filter((e) => this.has(e.id) && e.cat !== 'mens');
    const pool = known.length >= 4 ? known : ENTRIES.filter((e) => e.cat === 'tijd' && e.truth === 'geschiedenis' && !e.secret);
    return pool[Math.floor(r * pool.length)];
  }
}

/** Words of the time, explained where they are used (hover in a conversation or the Kroniek). */
export const GLOSSARY: Record<string, string> = {
  drossaard: 'De ambtenaar van de heer: hij bewaart de orde en int de boetes.',
  schepen: 'Een van de bestuurders en rechters van de stad.',
  schepenen: 'De bestuurders en rechters van de stad.',
  schepenbank: 'De rechtbank en het bestuur van een stad of een dorp.',
  begijn: 'Een vrome vrouw die in het begijnhof leeft, zonder eeuwige geloften.',
  begijnen: 'Vrome vrouwen die in het begijnhof leven, zonder eeuwige geloften.',
  koster: 'Hij onderhoudt de kerk en luidt de klokken.',
  deken: 'Het gekozen hoofd van een ambacht of van een kapittel.',
  ambacht: 'De vereniging van alle meesters van één beroep. Wie er niet bij hoort, mag het beroep niet uitoefenen.',
  poorter: 'Een burger met stadsrecht: hij betaalt geen tol aan de eigen poort.',
  florijn: 'Een gulden: twintig stuivers. Een dagloon is tien à twaalf stuivers.',
  florijnen: 'Guldens: twintig stuivers elk. Een dagloon is tien à twaalf stuivers.',
  stuiver: 'De munt van elke dag. Twintig stuivers maken een gulden; een dagloon is tien à twaalf stuivers.',
  stuivers: 'De munt van elke dag. Twintig stuivers maken een gulden; een dagloon is tien à twaalf stuivers.',
  overste: 'De geestelijke die aan het hoofd van een klooster of een orde staat.',
  oratorianen: 'Priesters die samen leven zonder kloostergeloften. Ze bedienen Scherpenheuvel sinds 1624.',
  waardijn: 'De keurder die laken meet en zegelt.',
  huik: 'Een lange zwarte mantel met kap, gedragen door deftige vrouwen.',
  landvoogd: 'Hij bestuurt de Nederlanden in naam van de koning van Spanje.',
  klepel: 'Het ijzeren hart van een klok, dat tegen het brons slaat.',
  klepels: 'Het ijzeren hart van de klokken, dat tegen het brons slaat.',
  broek: 'Laag, nat land langs de rivier: moeras.',
  soldij: 'Het loon van een soldaat.',
  inkwartiering: 'Soldaten die bij burgers thuis worden ondergebracht, op kosten van de burger.',
  lakenzegel: 'Het loden zegel dat de kwaliteit van Diests laken waarborgt.',
  schutterij: 'De gewapende gilden die de stad bewaken.',
  tollenaar: 'Hij int de tol aan de poort.',
};

/** Words that also have an everyday meaning: glossed only right after these words (het broek: the marsh, not trousers). */
const GLOSS_AFTER: Record<string, RegExp> = { broek: /(^|[^\p{L}])het\s+$/iu };

const GLOSS_RE = new RegExp(`(^|[^\\p{L}])(${Object.keys(GLOSSARY).sort((a, b) => b.length - a.length).join('|')})(?![\\p{L}])`, 'giu');

/** Mark the period words in a piece of (already escaped) text, once each. */
export function gloss(html: string) {
  const seen = new Set<string>();
  return html.replace(GLOSS_RE, (m, pre: string, word: string, at: number, all: string) => {
    const k = word.toLowerCase();
    if (seen.has(k)) return m;
    const after = GLOSS_AFTER[k];
    if (after && !after.test(all.slice(Math.max(0, at - 12), at + pre.length))) return m;
    seen.add(k);
    return `${pre}<span class="gl" tabindex="0" data-g="${GLOSSARY[k].replace(/"/g, '&quot;')}">${word}</span>`;
  });
}
