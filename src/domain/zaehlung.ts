/**
 * Zähl-Logik für Dienste.
 *
 * Visite wird in EINHEITEN gezählt: der Sa+So-Block eines Wochenendes ist
 * EIN Visitendienst (Schlüssel = Samstag), eine Feiertags-Visite ein eigener.
 * Alle anderen Dienstarten zählen pro Tag. Soll/Max je Person sowie die
 * Spezialregel „max. 1 Visitendienst pro Monat" beziehen sich auf Einheiten.
 */
import type { DienstartId, ISODate, Zuweisung } from './types';
import { addiereTage, imMonat, monatsTage, wochentag, zerlege } from './datum';
import { DIENSTARTEN, istGenerierbar } from './dienste';

const SAMSTAG = 6;
const SONNTAG = 0;

/** Schlüssel der Visite-Einheit: Wochenende → Samstag, sonst der Tag selbst. */
export function visiteEinheit(datum: ISODate): ISODate {
  const wt = wochentag(datum);
  if (wt === SONNTAG) return addiereTage(datum, -1);
  return datum;
}

/**
 * Zählt die Dienste einer Person für eine Dienstart — Visite in Einheiten,
 * alles andere in Tagen. Optional auf einen Monat eingeschränkt.
 */
export function zaehleDienste(
  personId: string,
  dienstartId: DienstartId,
  zuweisungen: Zuweisung[],
  monatsfilter?: { jahr: number; monat: number },
): number {
  const relevante = zuweisungen.filter(
    (z) =>
      z.personId === personId &&
      z.dienstartId === dienstartId &&
      (!monatsfilter || imMonat(z.datum, monatsfilter.jahr, monatsfilter.monat)),
  );
  if (dienstartId !== 'visite') return relevante.length;
  return new Set(relevante.map((z) => visiteEinheit(z.datum))).size;
}

/**
 * Wochenend-Schlüssel (Samstag) eines Dienstes, der als „Wochenende im
 * Einsatz" zählt: Vordergrund Fr/Sa/So sowie Visite Sa/So. Sonst null.
 * (Davinci am Freitag zählt laut Auftraggeber NICHT als Wochenende.)
 */
export function wochenendEinsatz(datum: ISODate, dienstartId: DienstartId): ISODate | null {
  const wt = wochentag(datum);
  if (dienstartId === 'vordergrund') {
    if (wt === 5) return addiereTage(datum, 1);
    if (wt === SAMSTAG) return datum;
    if (wt === SONNTAG) return addiereTage(datum, -1);
    return null;
  }
  if (dienstartId === 'visite' && (wt === SAMSTAG || wt === SONNTAG)) {
    return visiteEinheit(datum);
  }
  return null;
}

/** Distinkte Einsatz-Wochenenden einer Person, deren Samstag im Monat liegt. */
export function einsatzWochenenden(
  personId: string,
  zuweisungen: Zuweisung[],
  jahr: number,
  monat: number,
): Set<ISODate> {
  const wochenenden = new Set<ISODate>();
  for (const z of zuweisungen) {
    if (z.personId !== personId) continue;
    const sa = wochenendEinsatz(z.datum, z.dienstartId);
    if (sa && zerlege(sa).jahr === jahr && zerlege(sa).monat === monat) wochenenden.add(sa);
  }
  return wochenenden;
}

/**
 * Wie viele Dienste der Monat je Dienstart verlangt (nur automatisch
 * besetzbare Tage; Visite in Einheiten). Grundlage des Kapazitäts-Checks.
 */
export function monatsBedarf(jahr: number, monat: number): Record<DienstartId, number> {
  const bedarf = {} as Record<DienstartId, number>;
  for (const d of DIENSTARTEN) {
    const tage = monatsTage(jahr, monat).filter((tag) => istGenerierbar(d, tag));
    bedarf[d.id] =
      d.id === 'visite' ? new Set(tage.map((tag) => visiteEinheit(tag))).size : tage.length;
  }
  return bedarf;
}
