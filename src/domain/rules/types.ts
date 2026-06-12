/**
 * Schnittstelle der Regel-Engine.
 *
 * Jede Regel ist ein eigenes Modul mit dieser Gestalt und wird in
 * rules/index.ts registriert. Harte Regeln markieren eine Zuweisung als
 * Verstoß (Warnung in der UI, Verbot im Generator); weiche Regeln vergeben
 * ab Phase 4 Strafpunkte über `gewicht`. Neue Regeln brauchen NUR eine neue
 * Datei + Registrierung — Generator und UI bleiben unangetastet.
 */
import type { DienstartId, ISODate, Person, Zuweisung } from '../types';

/** Eine mögliche Besetzung: Person × Tag × Dienstart. */
export interface Kandidat {
  person: Person;
  datum: ISODate;
  dienstartId: DienstartId;
}

export interface RegelKontext {
  /**
   * Bestehende Zuweisungen — OHNE die gerade zu besetzende Zelle,
   * damit das Umbesetzen einer Zelle nicht gegen sich selbst prüft.
   */
  zuweisungen: Zuweisung[];
}

export interface Verstoss {
  regelId: string;
  /** Menschenlesbare Begründung für Warnhinweise und Generator-Bericht. */
  meldung: string;
}

export interface Regel {
  id: string;
  beschreibung: string;
  typ: 'hart' | 'weich';
  /** Strafpunkte weicher Regeln (Phase 4); für harte Regeln ohne Bedeutung. */
  gewicht: number;
  pruefe(kandidat: Kandidat, kontext: RegelKontext): Verstoss | null;
}
