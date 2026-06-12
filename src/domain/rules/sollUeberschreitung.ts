import type { BewertungsRegel } from './types';
import { imMonat, zerlege } from '../datum';

/**
 * Das monatliche Soll je Dienstart soll möglichst nicht überschritten werden.
 * Unterhalb des Solls fallen keine Strafpunkte an; jede Besetzung über Soll
 * kostet zunehmend mehr (1, 2, 3, …) — bis das harte Maximum greift.
 */
export const sollUeberschreitung: BewertungsRegel = {
  id: 'soll-ueberschreitung',
  beschreibung: 'Das Monats-Soll je Dienstart möglichst nicht überschreiten.',
  gewicht: 20,
  strafpunkte({ person, datum, dienstartId }, { zuweisungen }) {
    const soll = person.haeufigkeiten[dienstartId]?.soll ?? 0;
    const { jahr, monat } = zerlege(datum);
    const bisher = zuweisungen.filter(
      (z) =>
        z.personId === person.id && z.dienstartId === dienstartId && imMonat(z.datum, jahr, monat),
    ).length;
    return Math.max(0, bisher + 1 - soll);
  },
};
