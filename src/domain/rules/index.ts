/**
 * Registrierung aller Regeln.
 * Eine neue Regel wird hier eingetragen — sonst nirgends.
 */
import type { BewertungsRegel, Kandidat, Regel, RegelKontext, Verstoss } from './types';
import { personAbwesend } from './personAbwesend';
import { dienstNichtErlaubt } from './dienstNichtErlaubt';
import { einDienstProTag } from './einDienstProTag';
import { maximumProMonat } from './maximumProMonat';
import { sollUeberschreitung } from './sollUeberschreitung';
import { gesamtFairness } from './gesamtFairness';
import { dienstAbstand } from './dienstAbstand';
import { visiteWochenendBlock } from './visiteWochenendBlock';

export const ALLE_REGELN: readonly Regel[] = [
  dienstNichtErlaubt,
  personAbwesend,
  einDienstProTag,
  maximumProMonat,
];

export const WEICHE_REGELN: readonly BewertungsRegel[] = [
  sollUeberschreitung,
  visiteWochenendBlock,
  dienstAbstand,
  gesamtFairness,
];

/** Alle Verstöße eines Kandidaten gegen HARTE Regeln (für Warnungen und Generator-Verbote). */
export function harteVerstoesse(kandidat: Kandidat, kontext: RegelKontext): Verstoss[] {
  return ALLE_REGELN.filter((r) => r.typ === 'hart')
    .map((r) => r.pruefe(kandidat, kontext))
    .filter((v): v is Verstoss => v !== null);
}

/** Gewichtete Strafpunkt-Summe aller weichen Regeln (niedriger = besser). */
export function bewerteKandidat(kandidat: Kandidat, kontext: RegelKontext): number {
  return WEICHE_REGELN.reduce(
    (summe, r) => summe + r.gewicht * r.strafpunkte(kandidat, kontext),
    0,
  );
}
