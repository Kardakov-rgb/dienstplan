/**
 * Zentrale Typen des fachlichen Kerns.
 * Dieses Modul (und der gesamte domain/-Ordner) darf NICHTS aus
 * application/, infrastructure/ oder ui/ importieren.
 */

/** Kalenderdatum im Format YYYY-MM-DD (lokale Zeit, keine Zeitzonen-Tücken). */
export type ISODate = string;

export type DienstartId = 'vordergrund' | 'visite' | 'davinci';

/**
 * Person, die Dienste übernehmen kann.
 * Hinweis: rolle/wochenstunden stammen noch aus dem Grundgerüst und werden
 * in Phase 2 durch dienstbezogene Eigenschaften (Berechtigung, Häufigkeit,
 * Abwesenheiten) ersetzt.
 */
export interface Person {
  id: string;
  vorname: string;
  nachname: string;
  rolle: 'Mitarbeiter' | 'Teamleiter' | 'Azubi';
  wochenstunden: number | null;
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
  return `${p.vorname} ${p.nachname}`.trim();
}
