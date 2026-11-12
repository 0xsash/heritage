// Discovery cards, written as of 1560. History first; where a card tells a
// legend or folk belief, it says so ("they say", "folk call it"). Nothing here
// refers to anything later than 1560. Keys match the place names in the world
// data (POIs or named buildings). See docs/history/diest-1560.md for sources and
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
    text: 'A walled cloth town on the Demer, in the Duchy of Brabant. Its lord is William, Prince of Orange and Baron of Diest, who has more titles than time to visit.',
    r: 700,
    major: true,
  },
  'Sint-Sulpitius en Dionysiuskerk': {
    title: 'Sint-Sulpitiuskerk',
    text: 'The great church of Diest, built of brown ironstone over two lifetimes and finished only lately. The masons argued about the tower until the money ran out.',
    r: 90,
    major: true,
  },
  Lakenhalle: {
    title: 'The Cloth Hall',
    text: 'Where Diest\'s weavers bring their cloth to be measured, sealed and sold. A bad seal can ruin a weaver, so the measurers are bribed accordingly.',
    r: 45,
  },
  'Stadhuis Diest': {
    title: 'The Town Hall',
    text: 'The aldermen of Diest sit here to judge disputes, set the price of bread and argue about the walls.',
    r: 40,
  },
  'Ingang Begijnhof': {
    title: 'The Begijnhof',
    text: 'A town within the town, founded in 1253. The beguines live here under no lifelong vows: they pray, nurse the sick and work cloth, and close their gate at dusk.',
    r: 80,
    major: true,
  },
  'Sint-Catharinakerk': {
    title: 'Sint-Catharinakerk',
    text: 'The beguines\' own church. Its bell rings their hours, which run a little ahead of the town\'s.',
    r: 45,
  },
  'Hof van Nassau': {
    title: 'Hof van Nassau',
    text: 'The house of the Nassau lords of Diest, who have held the barony since 1499 and rarely sleep in it.',
    r: 40,
  },
  'Den Drossaerd': {
    title: 'The Drossaard\'s House',
    text: 'Home of the drossaard, the lord\'s bailiff, who keeps the peace when he must and the fines when he can.',
    r: 35,
  },
  'Refugiehuis van Averbode': {
    title: 'Refuge of Averbode',
    text: 'The town house of Averbode Abbey. When soldiers come through the countryside, the canons and their valuables come behind these walls.',
    r: 35,
  },
  'Het Spijker - Refugiehuis van Tongerlo': {
    title: 'Refuge of Tongerlo',
    text: 'The granary and refuge of Tongerlo Abbey. The abbey\'s grain is stored here, and so is the abbey when there is trouble.',
    r: 35,
  },
  'Onze-Lieve-Vrouwekerk': {
    title: 'Onze-Lieve-Vrouwekerk',
    text: 'A church of Our Lady in the north of the town, among gardens and orchards inside the wall.',
    r: 50,
  },
  'Stadspark De Warande': {
    title: 'The Warande',
    text: 'The lord\'s hunting park, walled off within the town walls. Poaching here is a hanging matter, so the hares are bold.',
    r: 140,
    major: true,
  },
  'Ruïne Warandekasteel': {
    title: 'The Castle of the Lords of Diest',
    text: 'The old seat of the lords of Diest on the Warande hill, from the days before the barony passed to Nassau.',
    r: 60,
  },
  Tafelrondmotte: {
    title: 'The Round Table',
    text: 'A grassy castle mound beside the Warande. Folk call it the Round Table, though no one remembers which knights sat at it.',
    r: 55,
  },
  Allerheiligenkapel: {
    title: 'Chapel of All Saints',
    text: 'A chapel outside the western gate. Travellers pray here for a safe road; townsfolk pray here for travellers who owe them money.',
    r: 45,
  },
  Antwerpsepoort: {
    title: 'The Antwerp Gate',
    text: 'The road north to the Kempen and on to Antwerp, the richest market in Christendom. Wagons of Diest cloth leave by this gate.',
    r: 60,
  },
  Schaffensepoort: {
    title: 'The Schaffen Gate',
    text: 'The road north-east to Schaffen and the heath. The gate is shut at dusk, and late travellers sleep in the ditch.',
    r: 60,
  },
  Koepoort: {
    title: 'The Cow Gate',
    text: 'Herds are driven out to the Demer meadows through this gate each morning and back each evening, counted twice.',
    r: 60,
  },
  Maastrichtsepoort: {
    title: 'The Maastricht Gate',
    text: 'The road south-east to Tienen and Maastricht. Toll is paid here on wine, salt and anything else the collector can name.',
    r: 60,
  },
  Leuvensepoort: {
    title: 'The Leuven Gate',
    text: 'The road south-west to Leuven, its university and the duke\'s courts in Brussels. Scholars and lawyers come this way, rarely together.',
    r: 60,
  },
  Allerheiligenpoort: {
    title: 'The All Saints Gate',
    text: 'The western gate, named for the chapel just outside it. The road runs on to Aarschot along the Demer.',
    r: 60,
  },
  Demerpoort: {
    title: 'The Demer Gate',
    text: 'Where the Demer enters the town. The river turns the town\'s mills and carries away what the town would rather forget.',
    r: 60,
  },
  Webbekom: {
    title: 'Webbekom',
    text: 'A village south of Diest, at the edge of the Demer marshes. Its people cut reed, graze cattle and keep out of the marsh after dark.',
    r: 320,
  },
  'Sint-Trudokerk': {
    title: 'Sint-Trudokerk, Webbekom',
    text: 'The village church of Webbekom, dedicated to Saint Trudo. Its bell rope is always damp.',
    r: 50,
  },
  Kaggevinne: {
    title: 'Kaggevinne',
    text: 'A hamlet on the road west to Scherpenheuvel. A handful of farms, a great many geese.',
    r: 250,
  },
  'Veldkapel Galgeberg': {
    title: 'The Gallows Hill',
    text: 'Diest hangs its condemned on this hill, in plain view of the road, so that travellers arrive in an honest frame of mind.',
    r: 120,
    major: true,
  },
  Scherpenheuvel: {
    title: 'Scherpenheuvel',
    text: 'The "sharp hill": heath and oaks, and on the top a single old oak with a small statue of Our Lady fastened to its trunk.',
    r: 380,
    major: true,
  },
  'De Heilige Eik': {
    title: 'The Oak on the Hill',
    text: 'Shepherds tell of a boy who took the statue from this oak and could not move from the spot until it was put back. People come to pray here now, and they leave the statue where it is.',
    r: 70,
    major: true,
  },
};
