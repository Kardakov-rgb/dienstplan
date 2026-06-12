import type { Regel } from './types';
import { visiteEinheit, zaehleDienste } from '../zaehlung';
import { zerlege } from '../datum';

/**
 * Höchstens 1 Visitendienst pro Person und Monat — der Sa+So-Block zählt
 * dabei als EINE Einheit, eine Feiertags-Visite ebenso.
 */
export const maxEineVisiteProMonat: Regel = {
  id: 'max-eine-visite-pro-monat',
  beschreibung: 'Nicht mehr als 1 Visitendienst (Einheit) pro Monat.',
  typ: 'hart',
  gewicht: 0,
  pruefe({ person, datum, dienstartId }, { zuweisungen }) {
    if (dienstartId !== 'visite') return null;
    const einheit = visiteEinheit(datum);
    const { jahr, monat } = zerlege(einheit);
    // Die eigene Einheit (Partnertag des Wochenendes) zählt nicht als zweite Visite.
    const fremde = zuweisungen.filter(
      (z) => !(z.dienstartId === 'visite' && visiteEinheit(z.datum) === einheit),
    );
    const bisher = zaehleDienste(person.id, 'visite', fremde, { jahr, monat });
    if (bisher < 1) return null;
    return {
      regelId: 'max-eine-visite-pro-monat',
      meldung: 'Hat in diesem Monat bereits einen Visitendienst',
    };
  },
};
