/**
 * Gesetzliche Feiertage in Nordrhein-Westfalen.
 * Bewegliche Feiertage werden über die Gauß'sche Osterformel
 * (anonymer gregorianischer Algorithmus) berechnet — keine externe API nötig.
 */
import type { ISODate } from './types';
import { addiereTage, toISODate, zerlege } from './datum';

/** Ostersonntag des Jahres (gregorianischer Kalender). */
export function ostersonntag(jahr: number): ISODate {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return toISODate(jahr, monat, tag);
}

const cache = new Map<number, Map<ISODate, string>>();

/** Alle NRW-Feiertage eines Jahres: Datum → Name. */
export function feiertageNRW(jahr: number): Map<ISODate, string> {
  const vorhanden = cache.get(jahr);
  if (vorhanden) return vorhanden;

  const ostern = ostersonntag(jahr);
  const feiertage = new Map<ISODate, string>([
    [toISODate(jahr, 1, 1), 'Neujahr'],
    [addiereTage(ostern, -2), 'Karfreitag'],
    [addiereTage(ostern, 1), 'Ostermontag'],
    [toISODate(jahr, 5, 1), 'Tag der Arbeit'],
    [addiereTage(ostern, 39), 'Christi Himmelfahrt'],
    [addiereTage(ostern, 50), 'Pfingstmontag'],
    [addiereTage(ostern, 60), 'Fronleichnam'],
    [toISODate(jahr, 10, 3), 'Tag der Deutschen Einheit'],
    [toISODate(jahr, 11, 1), 'Allerheiligen'],
    [toISODate(jahr, 12, 25), '1. Weihnachtstag'],
    [toISODate(jahr, 12, 26), '2. Weihnachtstag'],
  ]);

  cache.set(jahr, feiertage);
  return feiertage;
}

export function istFeiertag(datum: ISODate): boolean {
  return feiertageNRW(zerlege(datum).jahr).has(datum);
}

export function feiertagsName(datum: ISODate): string | null {
  return feiertageNRW(zerlege(datum).jahr).get(datum) ?? null;
}
