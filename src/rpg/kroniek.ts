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

// Places whose card tells a legend or something we made up (the rest is history).
const PLACE_TRUTH: Record<string, Truth> = { Tafelrondmotte: 'volksverhaal', 'De Heilige Eik': 'verzonnen' };

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
    text: 'Een stad leeft op haar klokken. De werkklok opent en sluit de dag, de poortklok de poorten, de banklok roept de burgers bijeen bij brand of onraad. Wie na de avondklok zonder lantaarn op straat loopt, betaalt boete.' },
  { id: 'tijd:laken', cat: 'tijd', truth: 'geschiedenis', title: 'Het lakenzegel', hint: 'Lees het bord aan de Lakenhalle.',
    text: 'Elk stuk laken wordt gemeten en gekeurd. Is het goed, dan knijpt de waardijn er een loden zegel aan met het wapen van de stad. Dat loodje is het woord van Diest: een koper in Keulen vertrouwt het zonder de wever ooit te zien.' },
  { id: 'tijd:kaak', cat: 'tijd', truth: 'geschiedenis', title: 'De kaak', hint: 'Bekijk de schandpaal op de Grote Markt.',
    text: 'Wie vals weegt, steelt of lastert, staat een marktdag lang aan de kaak, met zijn misdaad op een bord om de hals. De straf is de schande. De rotte kolen zijn een gift van de buren.' },
  { id: 'tijd:tol', cat: 'tijd', truth: 'geschiedenis', title: 'Het toltarief', hint: 'Lees het tolbord aan de Leuvense Poort.',
    text: 'Aan elke poort hangt het tarief: zoveel stuivers per vat bier, per zak zout, per os. Twintig stuivers maken één gulden, die het volk nog altijd florijn noemt. Poorters van de stad betalen niets. Iedereen kent plots een poorter.' },
  { id: 'tijd:schutters', cat: 'tijd', truth: 'geschiedenis', title: 'De schuttersgilden', hint: 'Lees het gildebord op het oefenveld bij de Schaffense Poort.',
    text: 'Sint-Joris schiet met de voetboog, Sint-Sebastiaan met de handboog, de kolveniers met het vuurroer. De gilden bewaken de muren als het moet. Als het niet moet, schieten ze de gaai van de staak en drinken ze op de koning van het jaar.' },
  { id: 'tijd:vrede', cat: 'tijd', truth: 'geschiedenis', title: 'De vrede van Munster', hint: 'Lees het plakkaat aan het Stadhuis.',
    text: 'In 1648 sloot de koning van Spanje vrede met de Republiek in het noorden, na tachtig jaar. De Schelde bleef dicht en Antwerpen bleef arm. De oorlog met Frankrijk gaat gewoon door, en de soldaten die hem voeren moeten ergens eten.' },
  { id: 'tijd:1635', cat: 'tijd', truth: 'geschiedenis', title: 'Het jaar 1635', hint: 'Lees de steen in de stadsmuur bij de Antwerpse Poort.',
    text: 'Vijftien jaar geleden trokken een Frans en een Staats leger samen door Brabant. Tienen werd geplunderd en verbrand. Diest gaf zich over en werd nog hetzelfde jaar door de Spanjaarden heroverd. Wie toen kind was, schrikt nog van trommels.' },
  { id: 'tijd:hollegriet', cat: 'tijd', truth: 'geschiedenis', title: 'Holle Griet', hint: 'Bekijk het grote kanon van Diest.',
    text: 'Een smeedijzeren donderbus uit de tijd van de overgrootvaders, te zwaar om te verplaatsen en te oud om te vertrouwen. Ze schoot stenen kogels zo groot als een kaasbol. Nu jaagt ze alleen nog kinderen de stuipen op het lijf.' },
  { id: 'tijd:berchmans', cat: 'tijd', truth: 'geschiedenis', title: 'Jan Berchmans', hint: 'Lees het bordje aan het huis van de schoenmaker, bij de markt.',
    text: 'Zoon van een schoenmaker uit Diest, geboren in 1599. Hij werd jezuïet en stierf in 1621 in Rome, tweeëntwintig jaar oud. Daar noemen ze hem al een heilige. In Diest zegt men: hij was een brave jongen, en hij groette altijd.' },
  { id: 'tijd:bier', cat: 'tijd', truth: 'geschiedenis', title: 'Het bier van Diest', hint: 'Lees het uithangbord bij het brouwershuis, ten noorden van de markt.',
    text: 'Diest brouwt meer bier dan het zelf kan drinken, en dat wil wat zeggen. De vaten gaan over de Demer naar Mechelen en Antwerpen. De accijns op het bier betaalt de stadsmuren, zodat elke pint een daad van burgerzin is.' },
  { id: 'tijd:demer', cat: 'tijd', truth: 'geschiedenis', title: 'De Demer', hint: 'Lees de peilsteen bij de Demerpoort.',
    text: 'De rivier is de weg, de molenaar en de riool van de stad. In natte jaren staat het broek blank tot aan de muren, en vertellen de mensen elkaar wat er dan uit het water komt.' },
  { id: 'tijd:garnizoen', cat: 'tijd', truth: 'geschiedenis', title: 'Het garnizoen', hint: 'Lees het inkwartieringsbevel bij de Maastrichtse Poort.',
    text: 'De soldaten van de koning liggen ingekwartierd bij de burgers: een bed, vuur, licht en zout zijn ze verschuldigd. De soldij komt maanden te laat of nooit. Een soldaat zonder soldij wordt eerst een dief en dan een deserteur.' },
  { id: 'tijd:baron', cat: 'tijd', truth: 'geschiedenis', title: 'De baron in de wieg', hint: 'Lees het bericht aan de deur van het Hof van Nassau.',
    text: 'De heer van Diest is de Prins van Oranje. Het nieuws van dit najaar: prins Willem II is aan de pokken gestorven, en acht dagen later werd zijn zoon geboren. De baron van Diest ligt in Den Haag in de wieg, en zijn voogden maken ruzie.' },
  { id: 'tijd:bedevaart', cat: 'tijd', truth: 'geschiedenis', title: 'De bedevaart', hint: 'Lees het bord voor de pelgrims in Scherpenheuvel.',
    text: 'Pelgrims komen te voet uit heel Brabant, bidden driemaal rond de kerk en nemen een tinnen teken of een papieren vaantje mee naar huis. Wie genezen is, laat zijn krukken achter. De waard, de kaarsenmaker en de schoenlapper worden er niet armer van.' },
  { id: 'tijd:zeven', cat: 'tijd', truth: 'geschiedenis', title: 'De stad van zeven', hint: 'Lees de gedenksteen aan de basiliek.',
    text: 'De aartshertogen lieten Scherpenheuvel bouwen als een ster met zeven punten rond een kerk met zeven zijden, naar een plan van bouwmeester Wenceslas Cobergher. Een hele stad als gebed. Het is nog maar de vraag of er ooit genoeg mensen komen wonen.' },
  { id: 'tijd:draken', cat: 'tijd', truth: 'verzonnen', title: 'Draken in Brabant', hint: 'Ge zit erop.',
    text: 'Het enige in deze kroniek dat ge in geen enkel archief zult vinden. De rest van dit land is zoals het was: de straten, de muren, de kerken, de oorlog. De draak is van ons. De mensen van 1650 zouden er minder van opgekeken hebben dan gij denkt.' },
  { id: 'tijd:klank', cat: 'tijd', truth: 'verzonnen', title: 'De macht van brons', hint: 'Laat de klokken van Diest weer luiden.',
    text: 'De mensen geloofden echt dat klokgelui onweer, pest en duivels verdreef: klokken werden gedoopt en droegen namen. Dat een beiaardier er vijanden mee kan vellen, hebben wij erbij verzonnen. Maar niet veel.' },
];

const mensen: Entry[] = [
  { id: 'mens:pieter', cat: 'mens', truth: 'verzonnen', title: 'Pieter Vandenbempt', hint: 'Spreek met de koster van Sint-Sulpitius.',
    text: 'Koster van Sint-Sulpitius. Hij luidt de klokken, graaft de graven en weet van iedereen in Diest wanneer hij gedoopt is en wat hij nog schuldig is aan de kerkfabriek.' },
  { id: 'mens:marieke', cat: 'mens', truth: 'verzonnen', title: 'Marieke Smets', hint: 'Spreek met de marskraamster op de Grote Markt.',
    text: 'Marskraamster. Ze verkoopt alles wat in een mand past en koopt alles wat ge kwijt wilt, voor de helft. Ze weet het nieuws een dag voor het gebeurt.' },
  { id: 'mens:joos', cat: 'mens', truth: 'verzonnen', title: 'Meester Joos Peeters', hint: 'Spreek met de deken van de wevers.',
    text: 'Deken van het weversambacht. Hij waakt over het zegel van Diest alsof het zijn eigen eer was, wat het ook is.' },
  { id: 'mens:aleydis', cat: 'mens', truth: 'verzonnen', title: 'Zuster Aleydis', hint: 'Spreek met de begijn in het Begijnhof.',
    text: 'Begijn en ziekenverzorgster. Ze kent elk kruid in de tuin en elk pelgrimsteken van Brabant. Ze heeft geen geloften afgelegd die haar beletten te zeggen wat ze denkt.' },
  { id: 'mens:drossaard', cat: 'mens', truth: 'verzonnen', title: 'Jonker Hendrik van Gorp', hint: 'Spreek met de drossaard.',
    text: 'Drossaard van Diest: de man van de baron, die de orde bewaart en de boetes int. Hij dient een heer in het noorden en een koning in het zuiden, en slaapt slecht.' },
  { id: 'mens:wouter', cat: 'mens', truth: 'verzonnen', title: 'Wouter Claes', hint: 'Spreek met de tollenaar aan de Leuvense Poort.',
    text: 'Tollenaar aan de Leuvense Poort. Hij telt vaten, karren en ossen, en hij telt ze graag in zijn eigen voordeel.' },
  { id: 'mens:lijsbet', cat: 'mens', truth: 'verzonnen', title: 'Lijsbet Vranckx', hint: 'Spreek met de weversweduwe.',
    text: 'Weduwe van een wever. Een getouw, drie kinderen en een schuld bij het ambacht: zo ziet armoede eruit in een lakenstad.' },
  { id: 'mens:gielis', cat: 'mens', truth: 'verzonnen', title: 'Gielis "de Ton"', hint: 'Spreek met de voerman buiten de westpoort.',
    text: 'Voerman, zegt hij. Zijn kar rijdt vooral \'s nachts en zijn vaten staan op geen enkele tollijst.' },
  { id: 'mens:driesen', cat: 'mens', truth: 'verzonnen', title: 'Boer Jan Driesen', hint: 'Spreek met de boer te Kaggevinne.',
    text: 'Boer te Kaggevinne. Hij heeft in dertig jaar drie legers over zijn akker zien trekken en van alle drie evenveel gehouden.' },
  { id: 'mens:truyken', cat: 'mens', truth: 'verzonnen', title: 'Truyken', hint: 'Spreek met de verkoopster in Scherpenheuvel.',
    text: 'Ze verkoopt pelgrimstekens aan de voet van de basiliek en onthoudt elk gezicht dat er een koopt.' },
  { id: 'mens:provost', cat: 'mens', truth: 'verzonnen', title: 'Proost Jan Cools', hint: 'Spreek met de proost van Scherpenheuvel.',
    text: 'Proost van Scherpenheuvel. Een geleerd man die een bedevaartsoord bestuurt als een veldheer: met lijsten.' },
];

const wezens: Entry[] = [
  { id: 'wezen:deserteur', cat: 'wezen', truth: 'geschiedenis', title: 'Deserteurs', hint: 'Versla er een.',
    text: 'Soldaten zonder soldij en zonder vaandel. Ze leven van wat de boeren hebben en nemen het met het zwaard. Ze vallen aan met een brede uithaal: wacht op de rode gloed, rol opzij, en sla terug.' },
  { id: 'wezen:musketier', cat: 'wezen', truth: 'geschiedenis', title: 'Musketiers', hint: 'Versla er een.',
    text: 'Een musket laden duurt een halve minuut en vraagt twee handen en een brandende lont. Daarna schiet het door een harnas. Loop niet recht op hen af, en geef hen geen tijd om te herladen.' },
  { id: 'wezen:broekhond', cat: 'wezen', truth: 'verzonnen', title: 'Broekhonden', hint: 'Versla er een.',
    text: 'De meute van de Kludde, zegt men: zwart, nat en mager, met ogen als lantaarns. Het volk kende de Kludde alleen. Zijn honden hebben wij hem gegeven. Ze zijn snel en zwak: houd ze voor uw zwaard, niet in uw rug.' },
  { id: 'wezen:dwaallicht', cat: 'wezen', truth: 'volksverhaal', title: 'Dwaallichten', hint: 'Versla er een.',
    text: 'Blauwe vlammetjes boven het moeras. De mensen zeiden: de zielen van ongedoopte kinderen, die reizigers het broek in lokken. Wie er een volgde, kwam niet thuis. Ze werpen vuur van ver. Kom dichtbij.' },
  { id: 'wezen:kludde', cat: 'wezen', truth: 'volksverhaal', title: 'De Kludde', hint: 'Vind hem in het broek.',
    text: 'Een watergeest die elke gedaante aanneemt, liefst die van een grote zwarte hond met rammelende kettingen en blauwe vlammen om zijn kop. Hij springt reizigers op de rug en wordt zwaarder bij elke stap. Heel Brabant en Vlaanderen kende hem. Niemand had hem gezien die het nuchter navertelde.' },
  { id: 'wezen:roelof', cat: 'wezen', truth: 'verzonnen', title: 'Roelof de Rode', hint: 'Zoek hem op de Galgenberg.',
    text: 'Vaandrig in het leger van de koning, tot de soldij uitbleef. Nu heft hij zijn eigen belasting op de weg naar Scherpenheuvel. Hem hebben wij verzonnen. Mannen als hij waren er genoeg.' },
];

export const ENTRIES: Entry[] = [...places, ...tijd, ...mensen, ...wezens];
const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

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
  { entry: 'tijd:hollegriet', label: 'Holle Griet', at: [150, 62], kind: 'cannon' },
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

  get total() {
    return ENTRIES.length;
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
    return ENTRIES.filter((e) => e.cat === cat);
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
    const pool = known.length >= 4 ? known : ENTRIES.filter((e) => e.cat === 'tijd' && e.truth === 'geschiedenis');
    return pool[Math.floor(r * pool.length)];
  }
}
