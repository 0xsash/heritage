// The end of chapter 1: what the film at the tower says, what the closing card
// shows of what you chose and what it cost, and the two roads out of Diest that
// the journal keeps once the chapter is over. Text only; src/story/chapterend.ts
// runs the film, src/ui/chapter.ts the card, src/ui/rpgui.ts the journal page.
//
// Flags read (all set elsewhere): bells_ring, ov_choice ('volk' | 'kerk'),
// seals_reported / seals_begijnhof / seals_warned (Lijsbet), toll_paid /
// toll_bribe / toll_seized (Gielis). Flag set here: ch1_end, once the card is
// closed.

/** Narration over the three shots of the film (the voice: docs/design/voice.md). */
export const END_LINES: Record<string, string> = {
  ch1_end_1: 'For the first time since that Sunday, the bells of Sint-Sulpitius ring out over Diest. In the market, people count the strokes under their breath.',
  ch1_end_2: "At every stroke {dragon}'s eyes fall shut, and each time it takes him a little longer to open them again.",
  ch1_end_3: 'Diest sleeps soundly tonight. What else the bells keep asleep, nobody asks.',
};

/** One row of the card: what you did, and what it cost or brought. */
export interface EndRow {
  what: string;
  cost: string;
}

type Flags = Record<string, string | number | boolean>;

/** What you chose in chapter 1, in the order it happened in the story. {dragon} is filled in by the card. */
export function endRows(f: Flags): { rows: EndRow[]; open: string[] } {
  const rows: EndRow[] = [
    { what: 'The bells of Diest ring again.', cost: 'The town is safe. At every stroke, {dragon} sleeps for a moment.' },
  ];
  const open: string[] = [];
  if (f.ov_choice === 'volk') rows.push({ what: 'You bound the little bell with reed.', cost: 'The Oude Volk trust you. The dean of the chapter is looking for a name.' });
  else if (f.ov_choice === 'kerk') rows.push({ what: 'You told Pieter about the reed on the little bell.', cost: 'There is a lock on the tower now. The Oude Volk greet you more coolly.' });
  if (f.seals_reported) rows.push({ what: 'You reported Lijsbet Vranckx to the drossaard.', cost: 'She has been banished from the barony. The weavers drink to you.' });
  else if (f.seals_begijnhof) rows.push({ what: 'You sent Lijsbet Vranckx to the Begijnhof.', cost: "She weaves under the beguines' seal now. Master Joos is sick about it." });
  else if (f.seals_warned) rows.push({ what: 'You let Lijsbet Vranckx run.', cost: 'She has left Diest. Her mould is yours now.' });
  else open.push('the forged cloth seals of Master Joos');
  if (f.toll_paid) rows.push({ what: 'Gielis de Ton paid the toll.', cost: 'He curses your dragon, but Wouter is grateful.' });
  else if (f.toll_bribe) rows.push({ what: 'You took a keg of brandy from Gielis.', cost: 'Wouter knows, and says nothing. De Kroon trusts you a little less.' });
  else if (f.toll_seized) rows.push({ what: 'You seized the brandy of Gielis de Ton.', cost: 'He walked home. De Vrije Lieden will not forget it.' });
  else open.push('the brandy of Gielis de Ton');
  return { rows, open };
}

/** The two roads, for the card and for the journal (first person, as the journal is). */
export const ROADS = {
  title: 'Two roads out of Diest',
  west: "Truyken's figure hums to the west, towards Leuven. Pieter says the masters of the university can read old bronze and older wood.",
  east: 'Carts come through the Beverenpoort from the land of Loon, in the east. The towers there have been silent a year, the carters say, and they say nothing more.',
  /** interface: what comes, and what you can do until then */
  next: 'Leuven and the land of Loon come in the next chapter. Until then you can play on in Diest: side quests, the notice board and the Bell Round.',
};
