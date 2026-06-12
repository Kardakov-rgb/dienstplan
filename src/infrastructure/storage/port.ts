/**
 * Speicher-Schnittstelle (Port).
 * Die Anwendung kennt nur diese Schnittstelle — welcher Adapter dahinter
 * steckt (localStorage heute, Firestore in Phase 7), entscheidet allein
 * der Einstiegspunkt (main.ts).
 */
import type { Person, Zuweisung } from '../../domain/types';

export interface GespeicherteDaten {
  schemaVersion: number;
  personen: Person[];
  zuweisungen: Zuweisung[];
}

export const AKTUELLE_SCHEMA_VERSION = 3;

export interface DatenSpeicher {
  /** Liefert null, wenn noch nie etwas gespeichert wurde. */
  laden(): Promise<GespeicherteDaten | null>;
  speichern(daten: GespeicherteDaten): Promise<void>;
}

export function leereDaten(): GespeicherteDaten {
  return { schemaVersion: AKTUELLE_SCHEMA_VERSION, personen: [], zuweisungen: [] };
}
