import type { BewertungsRegel } from './types';
import { zerlege } from '../datum';
import { zaehleDienste } from '../zaehlung';

/**
 * Das monatliche Soll je Dienstart soll möglichst nicht überschritten werden.
 * Unterhalb des Solls fallen keine Strafpunkte an; jede Besetzung über Soll
 * kostet zunehmend mehr (1, 2, 3, …) — bis das harte Maximum greift.
 * Visite zählt in Einheiten (Sa+So-Block = 1).
 */
export const sollUeberschreitung: BewertungsRegel = {
  id: 'soll-ueberschreitung',
  beschreibung: 'Das Monats-Soll je Dienstart möglichst nicht überschreiten.',
  gewicht: 20,
  strafpunkte({ person, datum, dienstartId }, { zuweisungen }) {
    const soll = person.haeufigkeiten[dienstartId]?.soll ?? 0;
    const { jahr, monat } = zerlege(datum);
    const nachher = zaehleDienste(
      person.id,
      dienstartId,
      [...zuweisungen, { id: 'kandidat', datum, dienstartId, personId: person.id, fixiert: false }],
      { jahr, monat },
    );
    return Math.max(0, nachher - soll);
  },
};
