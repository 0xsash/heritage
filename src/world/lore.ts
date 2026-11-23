// Discovery cards (in English), written as of 1650. History first; where a card tells a
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
    text: "A walled town on the Demer, in Brabant, under the King of Spain. Its cloth was famous once; now it mostly brews beer. Its baron is the Prince of Orange, who lives among the rebels in the north, and his drossaard is not loved here.",
    r: 700,
    major: true,
  },
  'Sint-Sulpitius en Dionysiuskerk': {
    title: "Sint-Sulpitius Church",
    text: "The chapter church is built of brown ironstone. It took more than two centuries, from 1321 to 1534, and the tower was never finished: they say the money ran out. It stands there flat and squat, like a man waiting his turn.",
    r: 90,
    major: true,
  },
  Lakenhalle: {
    title: "The Cloth Hall",
    text: "Diest cloth was measured and sealed here when it still sold in every great market, two hundred years ago. The measuring rod still hangs on the wall. The buyers stopped coming.",
    r: 45,
  },
  'Stadhuis Diest': {
    title: "The Town Hall",
    text: "The schepenen of Diest sit here. They settle disputes, fix the price of bread and quarrel over who pays for the walls. The quarrel takes longest.",
    r: 40,
  },
  'Ingang Begijnhof': {
    title: "The Begijnhof",
    text: "A town within the town, where begijnen have lived since 1245. They take no permanent vows: any of them may leave, but almost none do. The gate shuts at dusk.",
    r: 80,
    major: true,
  },
  'Sint-Catharinakerk': {
    title: "Sint-Catharina Church",
    text: "The beguines' own church. Its bell rings their hours, which run a little ahead of the town's. The beguines hold that the town runs slow.",
    r: 45,
  },
  'Hof van Nassau': {
    title: 'Hof van Nassau',
    text: "The house of the Nassaus, lords of Diest since 1499. The princes never lived here long. Prince Filips Willem received his guests here, and no prince has slept here since.",
    r: 40,
  },
  'Den Drossaerd': {
    title: "The Drossaard's House",
    text: "Here lives the drossaard, the baron's man in Diest. He keeps the peace when he must and the fines when he can. He keeps the fines better.",
    r: 35,
  },
  'Refugiehuis van Averbode': {
    title: "The Averbode Refuge",
    text: "The town house of Averbode Abbey. When soldiers march through the land, the canons come behind these walls, with everything made of silver.",
    r: 35,
  },
  'Het Spijker - Refugiehuis van Tongerlo': {
    title: "The Tongerlo Refuge",
    text: "The granary of Tongerlo Abbey. In good years its grain is stored here. In bad years the canons shelter here too, on top of the corn.",
    r: 35,
  },
  'Onze-Lieve-Vrouwekerk': {
    title: "Onze-Lieve-Vrouw Church",
    text: "A church of Our Lady in the north of the town, among gardens and orchards inside the wall. Here Diest is quiet, even on market day.",
    r: 50,
  },
  'Stadspark De Warande': {
    title: "The Warande",
    text: "The lord's hunting park, behind a high wall. Poaching here means the gallows, so the hares are bold.",
    r: 140,
    major: true,
  },
  'Ruïne Warandekasteel': {
    title: "The Castle of the Lords of Diest",
    text: "The old seat of the lords of Diest on the Warande hill, from before the barony passed to Nassau. From here the lords looked out over their town. The Nassaus watch from much further off.",
    r: 60,
  },
  Tafelrondmotte: {
    title: "The Tafelronde",
    text: "A grassed-over castle mound beside the Warande. Folk call it the Tafelronde, the Round Table, though nobody remembers which knights sat at it.",
    r: 55,
  },
  Allerheiligenkapel: {
    title: "Allerheiligen Chapel",
    text: "A chapel outside the west gate. Travellers pray here for a safe road; townsfolk pray here for travellers who still owe them money.",
    r: 45,
  },
  Antwerpsepoort: {
    title: "The Schaluinpoort",
    text: "The road north, to the Kempen and on to Antwerpen. The peace of 1648 kept the Scheldt closed, and Antwerpen lives now on its painters, its printers and its memories.",
    r: 60,
  },
  Schaffensepoort: {
    title: "The Schaffensepoort",
    text: "The road north-east, to Schaffen and the heath. The gate shuts at dusk. Whoever is late sleeps in the ditch and pays the toll in the morning.",
    r: 60,
  },
  Koepoort: {
    title: "The old Koepoort",
    text: "This gate was walled up after 1508. The cattle are driven past it now every morning to the Demer meadows, and back every evening. They are counted twice.",
    r: 60,
  },
  Maastrichtsepoort: {
    title: "The Beverenpoort",
    text: "The road to Hasselt and Maastricht begins here. Toll is paid here on wine, salt and anything the toll-keeper can find a name for.",
    r: 60,
  },
  Leuvensepoort: {
    title: "The Putterstraatpoort",
    text: "The road south-west, to Leuven and its university, and to the governor's court in Brussel. Scholars and lawyers pass through here, seldom together.",
    r: 60,
  },
  Allerheiligenpoort: {
    title: "The Allerheiligenpoort",
    text: "The west gate, named for the chapel just outside the wall. The road follows the Demer to Aarschot. The Demer follows no one.",
    r: 60,
  },
  Demerpoort: {
    title: "The Water Gate on the Demer",
    text: "Here the Demer enters the town. The river turns the mills and carries off what the town would rather forget. Sometimes it brings it back.",
    r: 60,
  },
  Webbekom: {
    title: 'Webbekom',
    text: "A village south of Diest, at the edge of the Demer marshes. People cut reeds and herd cattle. After dark they count their children.",
    r: 320,
  },
  'Sint-Trudokerk': {
    title: 'Sint-Trudo Church, Webbekom',
    text: "The village church of Webbekom, dedicated to Sint-Trudo. The bell rope is always damp.",
    r: 50,
  },
  Kaggevinne: {
    title: 'Kaggevinne',
    text: "A hamlet on the road to Scherpenheuvel: a handful of farms and a great many more geese. The geese were here first.",
    r: 250,
  },
  'Veldkapel Galgeberg': {
    title: "The Galgenberg",
    text: "The schepenbank of Kaggevinne hangs its condemned on this hill, in sight of the road, so that every traveller arrives with honest intentions. Lately they are mostly deserters from the war with France.",
    r: 120,
    major: true,
  },
  Scherpenheuvel: {
    title: 'Scherpenheuvel',
    text: "Half a century ago this was a bare hill of heath with a single oak, a little figure of Mary in its branches. Then the Archdukes Albrecht and Isabella had a seven-sided town laid out here, round a new church. Now half of Brabant comes here on pilgrimage.",
    r: 380,
    major: true,
  },
  'Basiliek van Onze-Lieve-Vrouw van Scherpenheuvel': {
    title: "The Church of Scherpenheuvel",
    text: "The church was built for the Archdukes and consecrated in 1627. It has seven sides, for the seven sorrows and seven joys of Mary, and a dome full of golden stars. The high altar stands where the oak stood.",
    r: 90,
    major: true,
  },
  'De Heilige Eik': {
    title: "The Holy Oak",
    text: "Here stood the oak with the little figure of Mary, where the sick came to pray. Shortly after 1600 it was felled on the bishop's orders, and from its wood they carved figures of Our Lady for pilgrims to take home.",
    r: 60,
    major: true,
  },
};
