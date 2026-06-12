import type { BewertungsRegel } from './types';

/**
 * Faire Verteilung über die GESAMTE Historie (Wunsch des Auftraggebers):
 * Wer von einer Dienstart insgesamt schon viele hatte, bekommt Strafpunkte —
 * der Generator gleicht die Gesamt-Statistik damit langfristig an.
 */
export const gesamtFairness: BewertungsRegel = {
  id: 'gesamt-fairness',
  beschreibung: 'Dienste je Art über die gesamte Historie gleichmäßig verteilen.',
  gewicht: 1,
  strafpunkte({ person, dienstartId }, { zuweisungen }) {
    return zuweisungen.filter((z) => z.personId === person.id && z.dienstartId === dienstartId)
      .length;
  },
};
