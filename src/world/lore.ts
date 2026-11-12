// Discovery cards, written as of 1650. History first; where a card tells a
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
    text: 'A walled cloth town on the Demer, in the Duchy of Brabant, under the King of Spain. On paper its baron is the Prince of Orange, who lives in the rebel Republic to the north. Since the peace of 1648 his bailiffs have been allowed back. They are not loved.',
    r: 700,
    major: true,
  },
  'Sint-Sulpitius en Dionysiuskerk': {
    title: 'Sint-Sulpitiuskerk',
    text: 'The great church of Diest, built of brown ironstone over two lifetimes and finished a century ago. Except the tower: the masons argued about it until the money ran out, and it still stops short, squat and flat-topped.',
    r: 90,
    major: true,
  },
  Lakenhalle: {
    title: 'The Cloth Hall',
    text: 'Where Diest\'s weavers bring their cloth to be measured, sealed and sold. The trade is not what it was in their grandfathers\' day, and every forged seal makes it worse.',
    r: 45,
  },
  'Stadhuis Diest': {
    title: 'The Town Hall',
    text: 'The aldermen of Diest sit here to judge disputes, set the price of bread and argue about the walls.',
    r: 40,
  },
  'Ingang Begijnhof': {
    title: 'The Begijnhof',
    text: 'A town within the town, founded in 1253. The beguines take no lifelong vows: they pray, nurse the sick and weave, and they close their gate at dusk.',
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
    text: 'The house of the Nassau lords of Diest, who have held the barony since 1499. During the long war it was confiscated, and handed back in 1648. Nobody has slept in it since.',
    r: 40,
  },
  'Den Drossaerd': {
    title: 'The Drossaard\'s House',
    text: 'Home of the drossaard, the baron\'s bailiff, who keeps the peace when he must and the fines when he can.',
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
    text: 'The road north to the Kempen and on to Antwerp. The peace of 1648 left the Scheldt closed to shipping, and Antwerp lives now on its painters, printers and memories.',
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
    text: 'The road south-west to Leuven, its university and the governor\'s court in Brussels. Scholars and lawyers come this way, rarely together.',
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
    text: 'Diest hangs its condemned on this hill, in plain view of the road, so that travellers arrive in an honest frame of mind. Lately, mostly deserters from the French war.',
    r: 120,
    major: true,
  },
  Scherpenheuvel: {
    title: 'Scherpenheuvel',
    text: 'The "sharp hill". Forty years ago it was heath and a single oak. Then the Archdukes Albert and Isabella laid out a holy town here, walled in a seven-pointed star, and half of Brabant walks here every year.',
    r: 380,
    major: true,
  },
  'Basiliek van Onze-Lieve-Vrouw van Scherpenheuvel': {
    title: 'The Basilica of Our Lady',
    text: 'Built for the Archdukes and consecrated in 1627: seven sides, for the seven sorrows and the seven joys of Mary, under a dome painted with gilded stars. The high altar stands where the oak stood.',
    r: 90,
    major: true,
  },
  'De Heilige Eik': {
    title: 'The Roots of the Oak',
    text: 'The oak was felled in 1602 and its wood carved into little statues of Our Lady, which pilgrims carry home. The roots were never dug out. They lie under the altar, and some say they are still growing.',
    r: 60,
    major: true,
  },
};
