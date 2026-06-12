import type { BewertungsRegel } from './types';
import type { ISODate, Zuweisung } from '../types';
import { addiereTage, wochentag } from '../datum';

const FREITAG = 5;
const SAMSTAG = 6;
const SONNTAG = 0;
const MONTAG = 1;

function hatDienst(
  zuweisungen: Zuweisung[],
  personId: string,
  datum: ISODate,
  dienstarten: string[],
): boolean {
  return zuweisungen.some(
    (z) => z.personId === personId && z.datum === datum && dienstarten.includes(z.dienstartId),
  );
}

/**
 * Wer am Wochenende Visite hat, soll am Freitag davor und am Montag danach
 * keinen Vordergrund/Davinci machen. Stark gewichtet (zwischen Soll und
 * Visite-Block), aber weich: im Notfall geht Besetzung vor Schonung.
 * Die Regel wirkt in beide Richtungen (Visite zuerst oder Randdienst zuerst).
 */
export const visiteRandtage: BewertungsRegel = {
  id: 'visite-randtage',
  beschreibung: 'Kein Vordergrund/Davinci am Freitag vor oder Montag nach einer Wochenend-Visite.',
  gewicht: 18,
  strafpunkte({ person, datum, dienstartId }, { zuweisungen }) {
    const wt = wochentag(datum);

    // Richtung 1: Kandidat ist Vordergrund/Davinci am Rand eines Visite-Wochenendes.
    if (dienstartId === 'vordergrund' || dienstartId === 'davinci') {
      if (wt === FREITAG) {
        const visiteAmWE =
          hatDienst(zuweisungen, person.id, addiereTage(datum, 1), ['visite']) ||
          hatDienst(zuweisungen, person.id, addiereTage(datum, 2), ['visite']);
        if (visiteAmWE) return 1;
      }
      if (wt === MONTAG && dienstartId === 'vordergrund') {
        const visiteAmWE =
          hatDienst(zuweisungen, person.id, addiereTage(datum, -1), ['visite']) ||
          hatDienst(zuweisungen, person.id, addiereTage(datum, -2), ['visite']);
        if (visiteAmWE) return 1;
      }
      return 0;
    }

    // Richtung 2: Kandidat ist die Wochenend-Visite selbst.
    if (dienstartId === 'visite' && (wt === SAMSTAG || wt === SONNTAG)) {
      const samstag = wt === SAMSTAG ? datum : addiereTage(datum, -1);
      const freitag = addiereTage(samstag, -1);
      const montag = addiereTage(samstag, 2);
      if (
        hatDienst(zuweisungen, person.id, freitag, ['vordergrund', 'davinci']) ||
        hatDienst(zuweisungen, person.id, montag, ['vordergrund'])
      ) {
        return 1;
      }
    }
    return 0;
  },
};
