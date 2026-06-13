/**
 * Zentrale Typen des fachlichen Kerns.
 * Dieses Modul (und der gesamte domain/-Ordner) darf NICHTS aus
 * application/, infrastructure/ oder ui/ importieren.
 */

/** Kalenderdatum im Format YYYY-MM-DD (lokale Zeit, keine Zeitzonen-Tücken). */
export type ISODate = string;

export type DienstartId = 'vordergrund' | 'visite' | 'davinci';

export type AbwesenheitsTyp = 'urlaub' | 'krank' | 'fortbildung' | 'wunschfrei';

/** Zeitraum, in dem eine Person nicht eingeplant werden darf. Grenztage inklusive. */
export interface Abwesenheit {
  id: string;
  typ: AbwesenheitsTyp;
  von: ISODate;
  bis: ISODate;
}

/**
 * Häufigkeit einer Dienstart pro Monat für eine Person.
 * `maximum` ist eine harte Obergrenze; 0 bedeutet: darf diesen Dienst nicht machen.
 * `soll` ist das weiche Ziel des Generators; es gilt stets soll ≤ maximum.
 */
export interface DienstHaeufigkeit {
  soll: number;
  maximum: number;
}

/** Person, die Dienste übernehmen kann. */
export interface Person {
  id: string;
  name: string;
  /** Inaktive Personen bleiben für die Historie erhalten, werden aber nicht mehr verplant. */
  aktiv: boolean;
  /** Vollzeitkräfte unterliegen dem monatlichen Wechsel der Wochenend-Muster. */
  vollzeit: boolean;
  haeufigkeiten: Record<DienstartId, DienstHaeufigkeit>;
  abwesenheiten: Abwesenheit[];
}

/**
 * Besetzung eines Dienstes an einem Tag durch genau eine Person.
 * `fixiert` = manuell gesetzt/bestätigt; der Generator überschreibt
 * fixierte Zuweisungen nie.
 */
export interface Zuweisung {
  id: string;
  datum: ISODate;
  dienstartId: DienstartId;
  personId: string;
  fixiert: boolean;
}

export function personName(p: Person): string {
  return p.name.trim();
}
