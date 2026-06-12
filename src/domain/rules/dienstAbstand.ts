import type { BewertungsRegel } from './types';
import { addiereTage } from '../datum';

const MINDEST_ABSTAND = 3;

/**
 * Dienste einer Person sollen nicht direkt aufeinander folgen:
 * Je näher ein anderer Dienst der Person liegt (±1 bis ±3 Tage),
 * desto mehr Strafpunkte. Verhindert „Klumpen" im Plan.
 */
export const dienstAbstand: BewertungsRegel = {
  id: 'dienst-abstand',
  beschreibung: 'Zwischen zwei Diensten einer Person sollen einige Tage liegen.',
  gewicht: 5,
  strafpunkte({ person, datum }, { zuweisungen }) {
    let punkte = 0;
    for (let abstand = 1; abstand <= MINDEST_ABSTAND; abstand++) {
      const nachbarn = [addiereTage(datum, -abstand), addiereTage(datum, abstand)];
      const belegt = zuweisungen.some(
        (z) => z.personId === person.id && nachbarn.includes(z.datum),
      );
      if (belegt) punkte += MINDEST_ABSTAND + 1 - abstand;
    }
    return punkte;
  },
};
