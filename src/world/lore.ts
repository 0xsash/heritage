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
    text: 'Een ommuurde lakenstad aan de Demer, in het hertogdom Brabant, onder de koning van Spanje. Op papier is de Prins van Oranje haar baron, en die woont in de opstandige Republiek in het noorden. Sinds de vrede van 1648 mogen zijn baljuws terugkomen. Ze zijn niet geliefd.',
    r: 700,
    major: true,
  },
  'Sint-Sulpitius en Dionysiuskerk': {
    title: 'Sint-Sulpitiuskerk',
    text: 'De grote kerk van Diest, gebouwd van bruine ijzerzandsteen over twee mensenlevens en een eeuw geleden voltooid. Behalve de toren: de bouwmeesters ruzieden erover tot het geld op was, en hij staat er nog altijd plat en gedrongen bij.',
    r: 90,
    major: true,
  },
  Lakenhalle: {
    title: 'De Lakenhalle',
    text: 'Hier brengen de wevers van Diest hun laken om het te laten meten, zegelen en verkopen. De handel is niet meer wat hij was in de tijd van hun grootvaders, en elk vals zegel maakt het erger.',
    r: 45,
  },
  'Stadhuis Diest': {
    title: 'Het Stadhuis',
    text: 'Hier zetelen de schepenen van Diest: ze beslechten geschillen, zetten de broodprijs vast en maken ruzie over de muren.',
    r: 40,
  },
  'Ingang Begijnhof': {
    title: 'Het Begijnhof',
    text: 'Een stad in de stad, gesticht in 1253. De begijnen leggen geen eeuwige geloften af: ze bidden, verzorgen de zieken en weven, en ze sluiten hun poort bij valavond.',
    r: 80,
    major: true,
  },
  'Sint-Catharinakerk': {
    title: 'Sint-Catharinakerk',
    text: 'De eigen kerk van de begijnen. Haar klok luidt hun uren, die een beetje voorlopen op die van de stad.',
    r: 45,
  },
  'Hof van Nassau': {
    title: 'Hof van Nassau',
    text: 'Het huis van de Nassaus, heren van Diest sinds 1499. Tijdens de lange oorlog werd het in beslag genomen en in 1648 teruggegeven. Sindsdien heeft er niemand geslapen.',
    r: 40,
  },
  'Den Drossaerd': {
    title: 'Het Huis van de Drossaard',
    text: 'Hier woont de drossaard, de baljuw van de baron, die de vrede bewaart als het moet en de boetes als het kan.',
    r: 35,
  },
  'Refugiehuis van Averbode': {
    title: 'Refugie van Averbode',
    text: 'Het stadshuis van de abdij van Averbode. Als er soldaten door het land trekken, komen de kanunniken en hun kostbaarheden achter deze muren.',
    r: 35,
  },
  'Het Spijker - Refugiehuis van Tongerlo': {
    title: 'Refugie van Tongerlo',
    text: 'De graanschuur en het toevluchtsoord van de abdij van Tongerlo. Het graan van de abdij ligt hier, en de abdij zelf ook, als er onrust is.',
    r: 35,
  },
  'Onze-Lieve-Vrouwekerk': {
    title: 'Onze-Lieve-Vrouwekerk',
    text: 'Een kerk van Onze-Lieve-Vrouw in het noorden van de stad, tussen tuinen en boomgaarden binnen de muur.',
    r: 50,
  },
  'Stadspark De Warande': {
    title: 'De Warande',
    text: 'Het jachtpark van de heer, ommuurd binnen de stadsmuren. Stropen is hier een zaak voor de galg, dus de hazen zijn brutaal.',
    r: 140,
    major: true,
  },
  'Ruïne Warandekasteel': {
    title: 'Het Kasteel van de Heren van Diest',
    text: 'De oude zetel van de heren van Diest op de Warandeheuvel, uit de tijd voor de baronie aan Nassau kwam.',
    r: 60,
  },
  Tafelrondmotte: {
    title: 'De Tafelronde',
    text: 'Een begraasde mottenheuvel naast de Warande. Het volk noemt hem de Tafelronde, al weet niemand meer welke ridders eraan zaten.',
    r: 55,
  },
  Allerheiligenkapel: {
    title: 'Allerheiligenkapel',
    text: 'Een kapel buiten de westelijke poort. Reizigers bidden hier voor een veilige weg; stedelingen bidden hier voor reizigers die hun nog geld schuldig zijn.',
    r: 45,
  },
  Antwerpsepoort: {
    title: 'De Antwerpse Poort',
    text: 'De weg naar het noorden, naar de Kempen en verder naar Antwerpen. De vrede van 1648 hield de Schelde gesloten, en Antwerpen leeft nu van zijn schilders, zijn drukkers en zijn herinneringen.',
    r: 60,
  },
  Schaffensepoort: {
    title: 'De Schaffense Poort',
    text: 'De weg naar het noordoosten, naar Schaffen en de heide. De poort gaat dicht bij valavond, en late reizigers slapen in de gracht.',
    r: 60,
  },
  Koepoort: {
    title: 'De Koepoort',
    text: 'Elke ochtend wordt het vee langs deze poort naar de Demerweiden gedreven, en elke avond terug. Twee keer geteld.',
    r: 60,
  },
  Maastrichtsepoort: {
    title: 'De Maastrichtse Poort',
    text: 'De weg naar het zuidoosten, naar Tienen en Maastricht. Hier wordt tol betaald op wijn, zout en alles wat de tollenaar een naam kan geven.',
    r: 60,
  },
  Leuvensepoort: {
    title: 'De Leuvense Poort',
    text: 'De weg naar het zuidwesten, naar Leuven, zijn universiteit en het hof van de landvoogd in Brussel. Geleerden en advocaten komen langs hier, zelden samen.',
    r: 60,
  },
  Allerheiligenpoort: {
    title: 'De Allerheiligenpoort',
    text: 'De westelijke poort, genoemd naar de kapel net buiten de muur. De weg loopt verder langs de Demer naar Aarschot.',
    r: 60,
  },
  Demerpoort: {
    title: 'De Demerpoort',
    text: 'Waar de Demer de stad binnenkomt. De rivier drijft de molens van de stad aan en voert weg wat de stad liever vergeet.',
    r: 60,
  },
  Webbekom: {
    title: 'Webbekom',
    text: 'Een dorp ten zuiden van Diest, aan de rand van de Demermoerassen. De mensen snijden riet, hoeden vee en blijven na donker uit het moeras.',
    r: 320,
  },
  'Sint-Trudokerk': {
    title: 'Sint-Trudokerk, Webbekom',
    text: 'De dorpskerk van Webbekom, toegewijd aan Sint-Truiden. Het klokkentouw is altijd vochtig.',
    r: 50,
  },
  Kaggevinne: {
    title: 'Kaggevinne',
    text: 'Een gehucht aan de weg naar Scherpenheuvel. Een handvol hoeves, een heleboel ganzen.',
    r: 250,
  },
  'Veldkapel Galgeberg': {
    title: 'De Galgenberg',
    text: 'Diest hangt zijn veroordeelden op deze heuvel, in het zicht van de weg, zodat reizigers in een eerlijke stemming aankomen. De laatste tijd vooral deserteurs uit de Franse oorlog.',
    r: 120,
    major: true,
  },
  Scherpenheuvel: {
    title: 'Scherpenheuvel',
    text: 'De "scherpe heuvel". Veertig jaar geleden was het hier heide en één eik. Toen lieten de aartshertogen Albrecht en Isabella hier een heilige stad aanleggen, ommuurd in een zevenpuntige ster, en nu wandelt half Brabant hier elk jaar naartoe.',
    r: 380,
    major: true,
  },
  'Basiliek van Onze-Lieve-Vrouw van Scherpenheuvel': {
    title: 'De Basiliek van Onze-Lieve-Vrouw',
    text: 'Gebouwd voor de aartshertogen en ingewijd in 1627: zeven zijden, voor de zeven smarten en de zeven vreugden van Maria, onder een koepel beschilderd met gouden sterren. Het hoogaltaar staat waar de eik stond.',
    r: 90,
    major: true,
  },
  'De Heilige Eik': {
    title: 'De Wortels van de Eik',
    text: 'De eik werd in 1602 geveld en zijn hout gesneden tot beeldjes van Onze-Lieve-Vrouw, die pelgrims mee naar huis nemen. De wortels zijn nooit uitgegraven. Ze liggen onder het altaar, en sommigen zeggen dat ze nog groeien.',
    r: 60,
    major: true,
  },
};
