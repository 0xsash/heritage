// Discovery cards (in Flemish), written as of 1650. History first; where a card tells a
// legend or folk belief, it says so ("they say", "folk call it"). Nothing here
// refers to anything later than 1650. Keys match the place names in the world
// data (POIs or named buildings). See docs/history/diest-1560.md (method) and docs/history/regions-1650.md for sources and
// for what is known, inferred, or invented.

export interface LoreEntry {
  title: string;
  text: string;
  /** discovery radius in metres (defaults by kind) */
  r?: number;
  /** show on compass and map */
  major?: boolean;
}

export const LORE: Record<string, LoreEntry> = {
  Diest: {
    title: 'Diest',
    text: 'Een ommuurde stad aan de Demer, in Brabant, onder de koning van Spanje. Haar laken was ooit beroemd; nu brouwt ze vooral bier. Haar baron is de Prins van Oranje, en die woont bij de opstandelingen in het noorden. Zijn drossaard is hier niet geliefd.',
    r: 700,
    major: true,
  },
  'Sint-Sulpitius en Dionysiuskerk': {
    title: 'Sint-Sulpitiuskerk',
    text: 'De kapittelkerk is gebouwd van bruine ijzerzandsteen. Er is meer dan twee eeuwen aan gewerkt, van 1321 tot 1534, en de toren is nooit afgeraakt: men zegt dat het geld op was. Hij staat er plat en gedrongen bij, als een man die op zijn beurt wacht.',
    r: 90,
    major: true,
  },
  Lakenhalle: {
    title: 'De Lakenhalle',
    text: 'Hier werd het laken van Diest gemeten en gezegeld toen het nog op alle grote markten lag, tweehonderd jaar geleden. De ellenmaat hangt er nog, maar de kopers komen niet meer.',
    r: 45,
  },
  'Stadhuis Diest': {
    title: 'Het Schepenhuis',
    text: 'Hier zetelen de schepenen van Diest. Ze beslechten geschillen, zetten de broodprijs vast en maken ruzie over wie de muren betaalt. Dat laatste duurt het langst.',
    r: 40,
  },
  'Ingang Begijnhof': {
    title: 'Het Begijnhof',
    text: 'Een stad in de stad, waar al sinds 1245 begijnen wonen. Ze leggen geen eeuwige geloften af: wie wil, mag gaan. Bijna niemand gaat. De poort sluit bij valavond.',
    r: 80,
    major: true,
  },
  'Sint-Catharinakerk': {
    title: 'Sint-Catharinakerk',
    text: 'De eigen kerk van de begijnen. Haar klok luidt hun uren, die een beetje voorlopen op die van de stad. De begijnen vinden dat de stad achterloopt.',
    r: 45,
  },
  'Hof van Nassau': {
    title: 'Hof van Nassau',
    text: 'Het huis van de Nassaus, heren van Diest sinds 1499. De prinsen hebben er nooit lang gewoond. Prins Filips Willem ontving er zijn gasten, en na hem is er geen prins meer komen slapen.',
    r: 40,
  },
  'Den Drossaerd': {
    title: 'Het Huis van de Drossaard',
    text: 'Hier woont de drossaard, de man van de baron in Diest. Hij bewaart de vrede als het moet en de boetes als het kan. De boetes bewaart hij beter.',
    r: 35,
  },
  'Refugiehuis van Averbode': {
    title: 'Refugie van Averbode',
    text: 'Het stadshuis van de abdij van Averbode. Als er soldaten door het land trekken, komen de kanunniken achter deze muren, met alles wat van zilver is.',
    r: 35,
  },
  'Het Spijker - Refugiehuis van Tongerlo': {
    title: 'Refugie van Tongerlo',
    text: 'De graanschuur van de abdij van Tongerlo. In goede jaren ligt hier haar graan. In slechte jaren schuilen hier ook de kanunniken zelf, boven op het koren.',
    r: 35,
  },
  'Onze-Lieve-Vrouwekerk': {
    title: 'Onze-Lieve-Vrouwekerk',
    text: 'Een kerk van Onze-Lieve-Vrouw in het noorden van de stad, tussen tuinen en boomgaarden binnen de muur. Hier is Diest stil, zelfs op marktdag.',
    r: 50,
  },
  'Stadspark De Warande': {
    title: 'De Warande',
    text: 'Het jachtpark van de heer, achter een hoge muur. Op stropen staat hier de galg, dus de hazen zijn brutaal.',
    r: 140,
    major: true,
  },
  'Ruïne Warandekasteel': {
    title: 'Het Kasteel van de Heren van Diest',
    text: 'De oude zetel van de heren van Diest op de Warandeheuvel, uit de tijd voor de baronie aan Nassau kwam. Van hier keken de heren uit over hun stad. De Nassaus kijken van veel verder toe.',
    r: 60,
  },
  Tafelrondmotte: {
    title: 'De Tafelronde',
    text: 'Een met gras begroeide burchtheuvel naast de Warande. Het volk noemt hem de Tafelronde, al weet niemand meer welke ridders eraan zaten.',
    r: 55,
  },
  Allerheiligenkapel: {
    title: 'Allerheiligenkapel',
    text: 'Een kapel buiten de westelijke poort. Reizigers bidden hier voor een veilige weg; stedelingen bidden hier voor reizigers die hun nog geld schuldig zijn.',
    r: 45,
  },
  Antwerpsepoort: {
    title: 'De Schaluinpoort',
    text: 'De weg naar het noorden, naar de Kempen en verder naar Antwerpen. De vrede van 1648 hield de Schelde gesloten, en Antwerpen leeft nu van zijn schilders, zijn drukkers en zijn herinneringen.',
    r: 60,
  },
  Schaffensepoort: {
    title: 'De Schaffensepoort',
    text: 'De weg naar het noordoosten, naar Schaffen en de heide. De poort gaat dicht bij valavond. Wie te laat is, slaapt in de gracht en betaalt de volgende ochtend tol.',
    r: 60,
  },
  Koepoort: {
    title: 'De oude Koepoort',
    text: 'Deze poort is na 1508 dichtgemetseld. Het vee wordt er nu elke ochtend voorbij gedreven naar de Demerweiden, en elke avond terug. Het wordt twee keer geteld.',
    r: 60,
  },
  Maastrichtsepoort: {
    title: 'De Beverenpoort',
    text: 'Hier begint de weg naar Hasselt en Maastricht. Hier wordt tol betaald op wijn, zout en alles wat de tollenaar een naam kan geven.',
    r: 60,
  },
  Leuvensepoort: {
    title: 'De Putterstraatpoort',
    text: 'De weg naar het zuidwesten, naar Leuven, zijn universiteit en het hof van de landvoogd in Brussel. Geleerden en advocaten komen hier langs, zelden samen.',
    r: 60,
  },
  Allerheiligenpoort: {
    title: 'De Allerheiligenpoort',
    text: 'De westelijke poort, genoemd naar de kapel net buiten de muur. De weg volgt de Demer naar Aarschot. De Demer volgt niemand.',
    r: 60,
  },
  Demerpoort: {
    title: 'De Waterpoort op de Demer',
    text: 'Hier komt de Demer de stad binnen. De rivier drijft de molens aan en voert weg wat de stad liever vergeet. Soms brengt ze het terug.',
    r: 60,
  },
  Webbekom: {
    title: 'Webbekom',
    text: 'Een dorp ten zuiden van Diest, aan de rand van de Demermoerassen. De mensen snijden riet en hoeden vee. Na donker tellen ze hun kinderen.',
    r: 320,
  },
  'Sint-Trudokerk': {
    title: 'Sint-Trudokerk, Webbekom',
    text: 'De dorpskerk van Webbekom, toegewijd aan Sint-Trudo. Het klokkentouw is altijd vochtig.',
    r: 50,
  },
  Kaggevinne: {
    title: 'Kaggevinne',
    text: 'Een gehucht aan de weg naar Scherpenheuvel. Er staat een handvol hoeves en er lopen veel meer ganzen. De ganzen waren er eerst.',
    r: 250,
  },
  'Veldkapel Galgeberg': {
    title: 'De Galgenberg',
    text: 'De schepenbank van Kaggevinne hangt haar veroordeelden op deze heuvel, in het zicht van de weg, zodat elke reiziger met eerlijke bedoelingen aankomt. De laatste tijd zijn het vooral deserteurs uit de oorlog met Frankrijk.',
    r: 120,
    major: true,
  },
  Scherpenheuvel: {
    title: 'Scherpenheuvel',
    text: 'Een halve eeuw geleden was dit een kale heuvel met heide en één eik, met een Mariabeeldje in de takken. Toen lieten de aartshertogen Albrecht en Isabella er een stad met zeven zijden aanleggen, rond een nieuwe kerk. Nu komt half Brabant hier op bedevaart.',
    r: 380,
    major: true,
  },
  'Basiliek van Onze-Lieve-Vrouw van Scherpenheuvel': {
    title: 'De Basiliek van Onze-Lieve-Vrouw',
    text: 'De kerk is gebouwd in opdracht van de aartshertogen en ingewijd in 1627. Ze heeft zeven zijden, voor de zeven smarten en de zeven vreugden van Maria, en een koepel vol gouden sterren. Het hoogaltaar staat waar de eik stond.',
    r: 90,
    major: true,
  },
  'De Heilige Eik': {
    title: 'De Wortels van de Eik',
    text: 'De eik werd kort na 1600 geveld op bevel van de bisschop. Uit zijn hout zijn beeldjes van Onze-Lieve-Vrouw gesneden, die pelgrims mee naar huis nemen. De wortels zijn nooit uitgegraven. Ze liggen onder het altaar, en sommigen zeggen dat ze nog groeien.',
    r: 60,
    major: true,
  },
};
