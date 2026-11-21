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
  ch1_end_1: 'Voor het eerst sinds die zondag luiden de klokken van Sint-Sulpitius over Diest. De mensen op de markt tellen de slagen mee.',
  ch1_end_2: 'Bij elke slag vallen de ogen van {dragon} dicht, en telkens duurt het wat langer voor hij ze weer opendoet.',
  ch1_end_3: 'Diest slaapt vannacht gerust. Wat de klokken verder nog in slaap houden, vraagt niemand.',
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
    { what: 'De klokken van Diest luiden weer.', cost: 'De stad is veilig. Bij elke slag valt {dragon} even in slaap.' },
  ];
  const open: string[] = [];
  if (f.ov_choice === 'volk') rows.push({ what: 'Je hebt het kleine klokje met riet gebonden.', cost: 'Het Oude Volk vertrouwt je. De deken van het kapittel zoekt een naam.' });
  else if (f.ov_choice === 'kerk') rows.push({ what: 'Je hebt Pieter verteld van het riet aan het klokje.', cost: 'Er hangt nu een slot aan de toren. Het Oude Volk groet je koeler.' });
  if (f.seals_reported) rows.push({ what: 'Je hebt Lijsbet Vranckx aangegeven bij de drossaard.', cost: 'Ze is uit de baronie verbannen. De wevers drinken op jou.' });
  else if (f.seals_begijnhof) rows.push({ what: 'Je hebt Lijsbet Vranckx naar het Begijnhof gestuurd.', cost: 'Ze weeft nu onder het zegel van de begijnen. Meester Joos is er ziek van.' });
  else if (f.seals_warned) rows.push({ what: 'Je hebt Lijsbet Vranckx laten vluchten.', cost: 'Ze is weg uit Diest. Haar gietvorm heb jij nu.' });
  else open.push('de valse lakenzegels van meester Joos');
  if (f.toll_paid) rows.push({ what: 'Gielis de Ton heeft de tol betaald.', cost: 'Hij vloekt op je draak, maar Wouter is je dankbaar.' });
  else if (f.toll_bribe) rows.push({ what: 'Je hebt een vaatje brandewijn van Gielis aangenomen.', cost: 'Wouter weet het en zwijgt. De Kroon vertrouwt je wat minder.' });
  else if (f.toll_seized) rows.push({ what: 'Je hebt de brandewijn van Gielis in beslag genomen.', cost: 'Hij ging te voet naar huis. De Vrije Lieden vergeten dat niet.' });
  else open.push('de brandewijn van Gielis de Ton');
  return { rows, open };
}

/** The two roads, for the card and for the journal (first person, as the journal is). */
export const ROADS = {
  title: 'Twee wegen uit Diest',
  west: 'Het beeldje van Truyken zoemt naar het westen, naar Leuven. Pieter zegt dat de meesters van de universiteit oud brons en ouder hout kunnen lezen.',
  east: 'Door de Beverenpoort komen karren uit het land van Loon, in het oosten. Daar zwijgen de torens al een jaar, zeggen de voerlui, en meer zeggen ze niet.',
  /** interface: what comes, and what you can do until then */
  next: 'Leuven en het land van Loon komen in het volgende hoofdstuk. Tot dan kun je in Diest verder spelen: zijverhalen, het prikbord en de klokkenronde.',
};
