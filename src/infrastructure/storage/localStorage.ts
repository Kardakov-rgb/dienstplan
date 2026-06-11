/**
 * localStorage-Adapter (Phasen 1–6). Wird in Phase 7 durch einen
 * Firestore-Adapter hinter derselben Schnittstelle ergänzt.
 *
 * Übernimmt einmalig die Daten des alten Grundgerüsts
 * (Schlüssel `dp_personen`; die alten Von/Bis-Schichten unter
 * `dp_schichten` sind fachlich obsolet und werden verworfen).
 */
import type { Person } from '../../domain/types';
import type { DatenSpeicher, GespeicherteDaten } from './port';
import { AKTUELLE_SCHEMA_VERSION } from './port';

const SCHLUESSEL = 'dienstplan_daten';
const LEGACY_PERSONEN = 'dp_personen';
const LEGACY_SCHICHTEN = 'dp_schichten';

interface LegacyPerson {
  id: number;
  vorname: string;
  nachname: string;
  rolle: Person['rolle'];
  stunden: number | null;
}

function importiereLegacy(): GespeicherteDaten | null {
  const roh = localStorage.getItem(LEGACY_PERSONEN);
  if (!roh) return null;

  const alte = JSON.parse(roh) as LegacyPerson[];
  const personen: Person[] = alte.map((p) => ({
    id: String(p.id),
    vorname: p.vorname,
    nachname: p.nachname,
    rolle: p.rolle ?? 'Mitarbeiter',
    wochenstunden: p.stunden ?? null,
  }));

  return { schemaVersion: AKTUELLE_SCHEMA_VERSION, personen, zuweisungen: [] };
}

export function erzeugeLocalStorageSpeicher(): DatenSpeicher {
  return {
    async laden() {
      const roh = localStorage.getItem(SCHLUESSEL);
      if (roh) return JSON.parse(roh) as GespeicherteDaten;

      const importiert = importiereLegacy();
      if (importiert) {
        localStorage.setItem(SCHLUESSEL, JSON.stringify(importiert));
        localStorage.removeItem(LEGACY_PERSONEN);
        localStorage.removeItem(LEGACY_SCHICHTEN);
      }
      return importiert;
    },

    async speichern(daten) {
      localStorage.setItem(SCHLUESSEL, JSON.stringify(daten));
    },
  };
}
