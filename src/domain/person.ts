/**
 * Fach-Helfer rund um Personen.
 * Werden von UI, Regeln (ab Phase 3/4) und Generator gemeinsam genutzt,
 * damit Begriffe wie „darf Dienst" überall identisch interpretiert werden.
 */
import type { Abwesenheit, AbwesenheitsTyp, DienstartId, DienstHaeufigkeit, ISODate, Person } from './types';
import { DIENSTARTEN } from './dienste';

export const ABWESENHEITS_TYPEN: ReadonlyArray<{ id: AbwesenheitsTyp; label: string }> = [
  { id: 'urlaub', label: 'Urlaub' },
  { id: 'krank', label: 'Krank' },
  { id: 'fortbildung', label: 'Fortbildung' },
  { id: 'wunschfrei', label: 'Wunsch-frei' },
] as const;

export function abwesenheitsLabel(typ: AbwesenheitsTyp): string {
  return ABWESENHEITS_TYPEN.find((t) => t.id === typ)?.label ?? typ;
}

/** Alle Dienstarten mit Soll 0 / Maximum 0 — sicherer Standard für neue Personen. */
export function leereHaeufigkeiten(): Record<DienstartId, DienstHaeufigkeit> {
  const ergebnis = {} as Record<DienstartId, DienstHaeufigkeit>;
  for (const d of DIENSTARTEN) {
    ergebnis[d.id] = { soll: 0, maximum: 0 };
  }
  return ergebnis;
}

/** Maximum 0 bedeutet: Person macht diese Dienstart grundsätzlich nicht. */
export function darfDienst(person: Person, dienstartId: DienstartId): boolean {
  return (person.haeufigkeiten[dienstartId]?.maximum ?? 0) > 0;
}

/** Macht die Person überhaupt irgendeinen Dienst? (Hinweis-Anzeige in der UI.) */
export function machtIrgendeinenDienst(person: Person): boolean {
  return DIENSTARTEN.some((d) => darfDienst(person, d.id));
}

/** Kurzzeichen für enge Plan-Zellen, z.B. "EM" für Erika Muster. */
export function personKuerzel(person: Person): string {
  return `${person.vorname.charAt(0)}${person.nachname.charAt(0)}`.toUpperCase();
}

/** Liefert die (erste) Abwesenheit, die das Datum abdeckt, sonst null. Grenztage inklusive. */
export function abwesenheitAm(person: Person, datum: ISODate): Abwesenheit | null {
  return person.abwesenheiten.find((a) => a.von <= datum && datum <= a.bis) ?? null;
}
