/**
 * Schema-Migrationen für gespeicherte Daten.
 * Jede Änderung am Datenmodell bekommt hier einen Migrationsschritt
 * (Version n → n+1), damit Bestandsdaten nie kaputtgehen.
 */
import type { GespeicherteDaten } from '../infrastructure/storage/port';
import { AKTUELLE_SCHEMA_VERSION } from '../infrastructure/storage/port';
import { leereHaeufigkeiten } from '../domain/person';

type Migration = (daten: GespeicherteDaten) => GespeicherteDaten;

/** Personengestalt bis Schema-Version 1 (Grundgerüst: Rolle + Wochenstunden). */
interface PersonV1 {
  id: string;
  vorname: string;
  nachname: string;
  rolle?: string;
  wochenstunden?: number | null;
}

/** Index = Ausgangsversion. migrationen[1] hebt Version 1 auf 2 usw. */
const migrationen: Record<number, Migration> = {
  // v1 → v2: Rolle/Wochenstunden entfallen; stattdessen aktiv-Flag,
  // Häufigkeiten je Dienstart (sicherer Default 0/0 = wird nicht verplant)
  // und Abwesenheiten.
  1: (daten) => ({
    ...daten,
    schemaVersion: 2,
    personen: (daten.personen as unknown as PersonV1[]).map((p) => ({
      id: p.id,
      vorname: p.vorname,
      nachname: p.nachname,
      aktiv: true,
      haeufigkeiten: leereHaeufigkeiten(),
      abwesenheiten: [],
    })) as unknown as GespeicherteDaten['personen'],
  }),

  // v2 → v3: Vollzeit-Kennzeichen für den monatlichen Wochenend-Wechsel.
  // Default false — die Wechsel-Regel greift erst nach bewusstem Ankreuzen.
  2: (daten) => ({
    ...daten,
    schemaVersion: 3,
    personen: daten.personen.map((p) => ({ ...p, vollzeit: p.vollzeit ?? false })),
  }),
};

export function migriere(daten: GespeicherteDaten): GespeicherteDaten {
  let aktuell = daten;
  while (aktuell.schemaVersion < AKTUELLE_SCHEMA_VERSION) {
    const schritt = migrationen[aktuell.schemaVersion];
    if (!schritt) {
      throw new Error(`Keine Migration von Schema-Version ${aktuell.schemaVersion} vorhanden.`);
    }
    aktuell = schritt(aktuell);
  }
  return aktuell;
}
