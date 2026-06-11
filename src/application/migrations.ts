/**
 * Schema-Migrationen für gespeicherte Daten.
 * Jede Änderung am Datenmodell bekommt hier einen Migrationsschritt
 * (Version n → n+1), damit Bestandsdaten nie kaputtgehen.
 */
import type { GespeicherteDaten } from '../infrastructure/storage/port';
import { AKTUELLE_SCHEMA_VERSION } from '../infrastructure/storage/port';

type Migration = (daten: GespeicherteDaten) => GespeicherteDaten;

/** Index = Ausgangsversion. migrationen[1] hebt Version 1 auf 2 usw. */
const migrationen: Record<number, Migration> = {
  // Phase 2 wird hier die erste echte Migration ergänzen (Person-Umbau).
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
