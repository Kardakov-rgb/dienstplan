/**
 * Statistik-Berechnung (rein fachlich, UI-frei).
 * Visite wird in Einheiten gezählt (Sa+So-Block = 1) — dieselbe Logik
 * wie bei Soll/Max und Generator (domain/zaehlung.ts).
 */
import type { DienstartId, Person, Zuweisung } from './types';
import { personName } from './types';
import { DIENSTARTEN } from './dienste';
import { istFeiertag } from './feiertage';
import { zerlege } from './datum';
import { wochenendEinsatz, zaehleDienste } from './zaehlung';

export type ZeitraumArt = 'monat' | 'jahr' | 'gesamt';

export interface Zeitraum {
  art: ZeitraumArt;
  jahr: number;
  monat: number;
}

export interface DienstartStatistik {
  ist: number;
  /** Soll im Zeitraum; null, wenn kein sinnvoller Vergleich existiert (Gesamt). */
  soll: number | null;
}

export interface PersonStatistik {
  person: Person;
  proDienstart: Record<DienstartId, DienstartStatistik>;
  /** Summe über alle Dienstarten (Visite in Einheiten). */
  gesamt: number;
  /** Distinkte Einsatz-Wochenenden im Zeitraum. */
  wochenenden: number;
  /** Diensttage an NRW-Feiertagen. */
  feiertage: number;
  /** Manuell gesetzte (fixierte) bzw. generierte Einträge. */
  manuell: number;
  generiert: number;
}

export function imZeitraum(datum: string, zeitraum: Zeitraum): boolean {
  if (zeitraum.art === 'gesamt') return true;
  const { jahr, monat } = zerlege(datum);
  if (zeitraum.art === 'jahr') return jahr === zeitraum.jahr;
  return jahr === zeitraum.jahr && monat === zeitraum.monat;
}

function sollImZeitraum(person: Person, dienstartId: DienstartId, zeitraum: Zeitraum): number | null {
  const monatsSoll = person.haeufigkeiten[dienstartId]?.soll ?? 0;
  if (zeitraum.art === 'monat') return monatsSoll;
  if (zeitraum.art === 'jahr') return monatsSoll * 12;
  return null;
}

/**
 * Statistik je Person. Enthalten sind alle aktiven Personen sowie inaktive,
 * die im Zeitraum Dienste hatten (Historie bleibt sichtbar).
 */
export function berechneStatistik(
  personen: Person[],
  zuweisungen: Zuweisung[],
  zeitraum: Zeitraum,
): PersonStatistik[] {
  const gefiltert = zuweisungen.filter((z) => imZeitraum(z.datum, zeitraum));

  return personen
    .map((person) => {
      const eigene = gefiltert.filter((z) => z.personId === person.id);

      const proDienstart = {} as Record<DienstartId, DienstartStatistik>;
      let gesamt = 0;
      for (const d of DIENSTARTEN) {
        const ist = zaehleDienste(person.id, d.id, eigene);
        proDienstart[d.id] = { ist, soll: sollImZeitraum(person, d.id, zeitraum) };
        gesamt += ist;
      }

      const wochenenden = new Set(
        eigene
          .map((z) => wochenendEinsatz(z.datum, z.dienstartId))
          .filter((sa): sa is string => sa !== null),
      ).size;

      return {
        person,
        proDienstart,
        gesamt,
        wochenenden,
        feiertage: eigene.filter((z) => istFeiertag(z.datum)).length,
        manuell: eigene.filter((z) => z.fixiert).length,
        generiert: eigene.filter((z) => !z.fixiert).length,
      };
    })
    .filter((s) => s.person.aktiv || s.gesamt > 0);
}

/** Statistik-Tabelle als CSV (Semikolon-getrennt, für deutsches Excel). */
export function statistikAlsCsv(statistiken: PersonStatistik[]): string {
  const kopf = [
    'Person',
    ...DIENSTARTEN.flatMap((d) => [`${d.name} Ist`, `${d.name} Soll`]),
    'Gesamt',
    'Wochenenden',
    'Feiertagsdienste',
    'Manuell',
    'Generiert',
  ];
  const zeilen = statistiken.map((s) => [
    personName(s.person),
    ...DIENSTARTEN.flatMap((d) => [
      String(s.proDienstart[d.id].ist),
      s.proDienstart[d.id].soll === null ? '' : String(s.proDienstart[d.id].soll),
    ]),
    String(s.gesamt),
    String(s.wochenenden),
    String(s.feiertage),
    String(s.manuell),
    String(s.generiert),
  ]);
  return [kopf, ...zeilen].map((felder) => felder.join(';')).join('\n');
}
