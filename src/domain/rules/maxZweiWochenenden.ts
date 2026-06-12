import type { Regel } from './types';
import { einsatzWochenenden, wochenendEinsatz } from '../zaehlung';
import { zerlege } from '../datum';

const MAX_WOCHENENDEN = 2;

/**
 * Höchstens 2 Einsatz-Wochenenden pro Person und Monat. Als Wochenend-Einsatz
 * zählen Vordergrund Fr/Sa/So und Visite Sa/So (Davinci freitags nicht);
 * maßgeblich ist der Monat, in dem der Samstag des Wochenendes liegt.
 */
export const maxZweiWochenenden: Regel = {
  id: 'max-zwei-wochenenden',
  beschreibung: 'Nicht mehr als 2 Wochenenden im Monat im Einsatz.',
  typ: 'hart',
  gewicht: 0,
  pruefe({ person, datum, dienstartId }, { zuweisungen }) {
    const kandidatenSa = wochenendEinsatz(datum, dienstartId);
    if (!kandidatenSa) return null;
    const { jahr, monat } = zerlege(kandidatenSa);
    const bisherige = einsatzWochenenden(person.id, zuweisungen, jahr, monat);
    if (bisherige.has(kandidatenSa) || bisherige.size < MAX_WOCHENENDEN) return null;
    return {
      regelId: 'max-zwei-wochenenden',
      meldung: `Bereits ${MAX_WOCHENENDEN} Wochenenden in diesem Monat im Einsatz`,
    };
  },
};
