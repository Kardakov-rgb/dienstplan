import type { BewertungsRegel } from './types';
import { addiereTage, wochentag } from '../datum';

const SAMSTAG = 6;
const SONNTAG = 0;

/**
 * Visite Sa+So im Normalfall durch dieselbe Person: Ist der Partnertag des
 * Wochenendes bereits mit jemand anderem besetzt, kostet das Strafpunkte —
 * die bereits eingeteilte Person wird dadurch klar bevorzugt.
 */
export const visiteWochenendBlock: BewertungsRegel = {
  id: 'visite-wochenend-block',
  beschreibung: 'Visite am Wochenende möglichst von derselben Person (Sa+So-Block).',
  gewicht: 15,
  strafpunkte({ person, datum, dienstartId }, { zuweisungen }) {
    if (dienstartId !== 'visite') return 0;
    const wt = wochentag(datum);
    const partnerTag =
      wt === SAMSTAG ? addiereTage(datum, 1) : wt === SONNTAG ? addiereTage(datum, -1) : null;
    if (!partnerTag) return 0;
    const partner = zuweisungen.find((z) => z.datum === partnerTag && z.dienstartId === 'visite');
    if (!partner || partner.personId === person.id) return 0;
    return 1;
  },
};
