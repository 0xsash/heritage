// The everyday coin of Brabant in 1650 is the stuiver (twenty to the gulden).
// Every amount the game shows goes through here, so "1 stuiver" and "5 stuivers" are always right.

/** "1 stuiver", "0 stuivers", "12 stuivers" */
export const stuivers = (n: number) => `${n} ${n === 1 ? 'stuiver' : 'stuivers'}`;
