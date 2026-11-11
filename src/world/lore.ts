// Discovery cards. History first, then the twist. Tone: dark, mischievous,
// tongue-in-cheek. Keys match OSM names (POIs or named buildings).

export interface LoreEntry {
  title: string;
  text: string;
  /** discovery radius in metres (defaults by kind) */
  r?: number;
  /** show on compass / map */
  major?: boolean;
}

export const LORE: Record<string, LoreEntry> = {
  Diest: {
    title: 'Diest',
    text: 'A walled town on the Demer, "the dark water". The bells have gone quiet, and the river has started whispering back.',
    r: 700,
    major: true,
  },
  'Sint-Sulpitius en Dionysiuskerk': {
    title: 'Sint-Sulpitiuskerk',
    text: 'Built of brown iron sandstone; the locals call its squat tower the Mustard Pot. Its carillon cracked the night the Demer turned black. Nobody admits to hearing it since.',
    r: 90,
    major: true,
  },
  Lakenhalle: {
    title: 'The Cloth Hall',
    text: 'Diest grew rich on wool and weaving. The weavers swear their red dye once frightened off the devil. These days it mostly frightens buyers.',
    r: 45,
  },
  'Holle Griet': {
    title: 'Holle Griet',
    text: '"Hollow Greta", a cannon with a temper. Feed her iron, never insults. She remembers both.',
    r: 30,
  },
  'De Gulden Maan': {
    title: 'De Gulden Maan',
    text: 'The Golden Moon: birthplace of Saint John Berchmans, who was very good at being good. The moon over this roof still refuses to set on time.',
    r: 35,
  },
  'Ingang Begijnhof': {
    title: 'The Begijnhof',
    text: 'Founded in 1253. The beguines took no vows they could not break, and they keep a Book of Quiet Bells that they lend to no one. Mind the cobbles. Mind the beguines more.',
    r: 70,
    major: true,
  },
  'Sint-Catharinakerk': {
    title: 'Sint-Catharinakerk',
    text: 'The beguines\' own church. They ring its little bell at odd hours. "For the drowned," they say, and then they change the subject.',
    r: 45,
  },
  'Hof van Nassau': {
    title: 'Hof van Nassau',
    text: 'For three centuries the House of Orange-Nassau held the barony of Diest. They left a son in the church crypt and a lasting habit of being barons of somewhere.',
    r: 40,
  },
  'Ruïne Warandekasteel': {
    title: 'Warande Castle (ruins)',
    text: 'The lords of Diest hunted in the Warande. The deer kept a tally of their own. The deer are winning.',
    r: 60,
  },
  Tafelrondmotte: {
    title: 'The Round Table Mound',
    text: 'An old castle mound with a grand name. No king ever sat here. Something else did, and it is still waiting for a seat.',
    r: 55,
    major: true,
  },
  Saspoort: {
    title: 'Saspoort',
    text: 'The sluice gate, where the Demer is let into town. Lately the river has been trying to let itself out.',
    r: 50,
  },
  Schaffensepoort: {
    title: 'Schaffensepoort',
    text: 'The road to Limburg. Shut the gate after dark: the Bokkenrijders ride their goats on the night wind, and they do not knock.',
    r: 50,
  },
  'Citadel van Diest': {
    title: 'The Citadel',
    text: 'Raised in brick to hold off the Dutch. It now holds off things with far worse manners.',
    r: 160,
    major: true,
  },
  'Fort Leopold': {
    title: 'Fort Leopold',
    text: 'Earthworks and casemates on the northern line. The sentries swear the moat runs both ways.',
    r: 120,
  },
  'Sint-Jansruïne': {
    title: 'Ruin of Sint-Jan',
    text: 'First the roof left, then the parishioners. One of them still turns up on Sundays.',
    r: 40,
  },
  'Onze-Lieve-Vrouwekerk': {
    title: 'Onze-Lieve-Vrouwekerk',
    text: 'A quieter church on the north side. Its tower is a fine place for a hatchling to perch, if the pigeons can be talked round.',
    r: 50,
  },
  'Sint-Barbarakerk': {
    title: 'Sint-Barbarakerk',
    text: 'Saint Barbara looks after gunners and anyone else who works with fire. Your dragon has been eyeing the candles.',
    r: 40,
  },
  'Basiliek van Onze-Lieve-Vrouw van Scherpenheuvel': {
    title: 'Scherpenheuvel',
    text: 'A shepherd once tried to carry the Virgin\'s statue down from an oak here, and found he could not move his feet. The oak was cut down long ago. Its roots were not.',
    r: 140,
    major: true,
  },
  'De Heilige Eik': {
    title: 'The Root-Oak',
    text: 'It should not exist. Every year it is a little taller, and every year the pilgrims walk a little slower as they pass it.',
    r: 60,
    major: true,
  },
  Webbekom: {
    title: 'Webbekom',
    text: 'This is where the marsh begins and good sense runs out.',
    r: 300,
  },
  'Bezoekerscentrum Webbekoms Broek': {
    title: 'Webbekoms Broek',
    text: 'Reed and marsh, home of the Kludde: a dog, a horse, a crow or your uncle, depending on the evening. Do not let it give you a lift.',
    r: 120,
  },
  Kaggevinne: {
    title: 'Kaggevinne',
    text: 'A hamlet on the road west. The people are friendly, and the geese are not.',
    r: 250,
  },
  Scherpenheuvel: {
    title: 'Scherpenheuvel',
    text: 'The pilgrimage town on the "sharp hill". Seven roads lead to it, and none of them lead away quite as easily.',
    r: 400,
    major: true,
  },
  'Sint-Trudokerk': {
    title: 'Sint-Trudokerk, Webbekom',
    text: 'A village church at the edge of the marsh. Its bell rope is always damp.',
    r: 50,
  },
  'Stadspark De Warande': {
    title: 'The Warande',
    text: 'The old hunting grounds of the lords of Diest, now a town park. The trees still keep their secrets, and some of the hunters too.',
    r: 120,
  },
};
