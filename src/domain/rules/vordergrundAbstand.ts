import type { Regel } from './types';
import { addiereTage, formatDatum } from '../datum';

/**
 * Zwischen zwei Vordergrunddiensten (24h) liegen mindestens 2 komplett
 * freie Tage: nach VG an Tag X ist der nächste frühestens an Tag X+3.
 */
export const vordergrundAbstand: Regel = {
  id: 'vordergrund-abstand',
  beschreibung: 'Mindestens 2 freie Tage zwischen zwei Vordergrunddiensten.',
  typ: 'hart',
  gewicht: 0,
  pruefe({ person, datum, dienstartId }, { zuweisungen }) {
    if (dienstartId !== 'vordergrund') return null;
    const nachbarTage = [-2, -1, 1, 2].map((d) => addiereTage(datum, d));
    const naher = zuweisungen.find(
      (z) =>
        z.personId === person.id &&
        z.dienstartId === 'vordergrund' &&
        nachbarTage.includes(z.datum),
    );
    if (!naher) return null;
    return {
      regelId: 'vordergrund-abstand',
      meldung: `Zu nah am Vordergrund vom ${formatDatum(naher.datum)} (mind. 2 freie Tage dazwischen)`,
    };
  },
};
