/**
 * Registrierung aller Regeln.
 * Eine neue Regel wird hier eingetragen — sonst nirgends.
 */
import type { Kandidat, Regel, RegelKontext, Verstoss } from './types';
import { personAbwesend } from './personAbwesend';
import { dienstNichtErlaubt } from './dienstNichtErlaubt';
import { einDienstProTag } from './einDienstProTag';
import { maximumProMonat } from './maximumProMonat';

export const ALLE_REGELN: readonly Regel[] = [
  dienstNichtErlaubt,
  personAbwesend,
  einDienstProTag,
  maximumProMonat,
];

/** Alle Verstöße eines Kandidaten gegen HARTE Regeln (für Warnungen und Generator-Verbote). */
export function harteVerstoesse(kandidat: Kandidat, kontext: RegelKontext): Verstoss[] {
  return ALLE_REGELN.filter((r) => r.typ === 'hart')
    .map((r) => r.pruefe(kandidat, kontext))
    .filter((v): v is Verstoss => v !== null);
}
