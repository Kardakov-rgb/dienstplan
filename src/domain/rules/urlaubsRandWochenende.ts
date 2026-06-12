import type { Regel } from './types';
import { addiereTage, formatDatum, istWochenende } from '../datum';

/**
 * Rund um einen Urlaub bleibt das direkt vorausgehende und das direkt
 * folgende Wochenende dienstfrei (gilt nur für Abwesenheiten vom Typ Urlaub).
 */
export const urlaubsRandWochenende: Regel = {
  id: 'urlaubs-rand-wochenende',
  beschreibung: 'Am Wochenende direkt vor und nach einem Urlaub keine Dienste.',
  typ: 'hart',
  gewicht: 0,
  pruefe({ person, datum }) {
    if (!istWochenende(datum)) return null;
    for (const a of person.abwesenheiten) {
      if (a.typ !== 'urlaub') continue;
      const vorDemUrlaub = datum >= addiereTage(a.von, -7) && datum < a.von;
      const nachDemUrlaub = datum > a.bis && datum <= addiereTage(a.bis, 7);
      if (vorDemUrlaub || nachDemUrlaub) {
        return {
          regelId: 'urlaubs-rand-wochenende',
          meldung: `Wochenende direkt ${vorDemUrlaub ? 'vor' : 'nach'} dem Urlaub (${formatDatum(a.von)} – ${formatDatum(a.bis)})`,
        };
      }
    }
    return null;
  },
};
