/**
 * Datums-Hilfsfunktionen auf Basis von ISO-Strings (YYYY-MM-DD).
 * Bewusst ohne Date-Objekte an den Schnittstellen, um Zeitzonenfehler
 * (z.B. toISOString() kippt in MEZ auf den Vortag) auszuschließen.
 */
import type { ISODate } from './types';

export function toISODate(jahr: number, monat: number, tag: number): ISODate {
  return `${jahr}-${String(monat).padStart(2, '0')}-${String(tag).padStart(2, '0')}`;
}

export function heuteISO(): ISODate {
  const d = new Date();
  return toISODate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function zerlege(datum: ISODate): { jahr: number; monat: number; tag: number } {
  const [jahr, monat, tag] = datum.split('-').map(Number);
  return { jahr, monat, tag };
}

/** Wochentag: 0 = Sonntag, 1 = Montag, …, 6 = Samstag (wie Date.getDay). */
export function wochentag(datum: ISODate): number {
  const { jahr, monat, tag } = zerlege(datum);
  return new Date(jahr, monat - 1, tag).getDay();
}

export function istWochenende(datum: ISODate): boolean {
  const wt = wochentag(datum);
  return wt === 0 || wt === 6;
}

export function tageImMonat(jahr: number, monat: number): number {
  return new Date(jahr, monat, 0).getDate();
}

/** Alle Tage eines Monats als ISO-Daten, aufsteigend. */
export function monatsTage(jahr: number, monat: number): ISODate[] {
  const anzahl = tageImMonat(jahr, monat);
  return Array.from({ length: anzahl }, (_, i) => toISODate(jahr, monat, i + 1));
}

export function addiereTage(datum: ISODate, tage: number): ISODate {
  const { jahr, monat, tag } = zerlege(datum);
  const d = new Date(jahr, monat - 1, tag + tage);
  return toISODate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Liegt das Datum im angegebenen Monat? */
export function imMonat(datum: ISODate, jahr: number, monat: number): boolean {
  const z = zerlege(datum);
  return z.jahr === jahr && z.monat === monat;
}

export const WOCHENTAG_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;

export const MONATS_NAMEN = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;

/** "05.06.2026" für die Anzeige. */
export function formatDatum(datum: ISODate): string {
  const { jahr, monat, tag } = zerlege(datum);
  return `${String(tag).padStart(2, '0')}.${String(monat).padStart(2, '0')}.${jahr}`;
}
