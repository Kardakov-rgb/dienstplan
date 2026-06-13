/**
 * Zentraler Anwendungszustand (Pinia).
 * Alle Änderungen an Personen/Zuweisungen laufen über die Aktionen dieses
 * Stores; gespeichert wird automatisch über den injizierten DatenSpeicher.
 */
import { defineStore } from 'pinia';
import type { DienstartId, ISODate, Person, Zuweisung } from '../domain/types';
import { DIENSTARTEN } from '../domain/dienste';
import { imMonat } from '../domain/datum';
import { generierePlan, type GenerierungsErgebnis } from '../domain/generator/generator';
import type { DatenSpeicher } from '../infrastructure/storage/port';
import { AKTUELLE_SCHEMA_VERSION, leereDaten } from '../infrastructure/storage/port';
import { migriere } from './migrations';

/** Wirft bei fachlich unzulässigen Personendaten; die UI fängt das vorher ab. */
function pruefePerson(person: Omit<Person, 'id'>): void {
  for (const d of DIENSTARTEN) {
    const h = person.haeufigkeiten[d.id];
    if (!h || h.soll < 0 || h.maximum < 0) {
      throw new Error(`Ungültige Häufigkeit für ${d.name}.`);
    }
    if (h.soll > h.maximum) {
      throw new Error(`Soll darf das Maximum nicht überschreiten (${d.name}).`);
    }
  }
  for (const a of person.abwesenheiten) {
    if (a.von > a.bis) {
      throw new Error('Abwesenheit: „Von" muss vor oder auf „Bis" liegen.');
    }
  }
}

let speicher: DatenSpeicher | null = null;

/** Wird einmalig vom Einstiegspunkt (main.ts) aufgerufen. */
export function verwendeSpeicher(s: DatenSpeicher): void {
  speicher = s;
}

export const useDatenStore = defineStore('daten', {
  state: () => ({
    personen: [] as Person[],
    zuweisungen: [] as Zuweisung[],
    geladen: false,
    /** Läuft bereits ein Echtzeit-Abonnement? (verhindert Doppel-Abos) */
    syncAktiv: false,
  }),

  getters: {
    person: (state) => (id: string) => state.personen.find((p) => p.id === id),
    /** Nur aktive Personen — Grundlage für Plan-Ansicht und Generator. */
    aktivePersonen: (state) => state.personen.filter((p) => p.aktiv),
    /** Die Besetzung einer Plan-Zelle (höchstens eine pro Tag × Dienstart). */
    zuweisungFuer: (state) => (datum: ISODate, dienstartId: DienstartId) =>
      state.zuweisungen.find((z) => z.datum === datum && z.dienstartId === dienstartId),
  },

  actions: {
    async laden() {
      if (!speicher) throw new Error('Kein DatenSpeicher gesetzt (verwendeSpeicher fehlt).');
      const daten = (await speicher.laden()) ?? leereDaten();
      const migriert = migriere(daten);
      this.personen = migriert.personen;
      this.zuweisungen = migriert.zuweisungen;
      this.geladen = true;

      // Echtzeit-Sync (Firestore): einmalig abonnieren, damit Änderungen
      // anderer Geräte automatisch erscheinen.
      if (speicher.abonniere && !this.syncAktiv) {
        this.syncAktiv = true;
        speicher.abonniere((remote) => {
          const migriert = migriere(remote);
          this.personen = migriert.personen;
          this.zuweisungen = migriert.zuweisungen;
        });
      }
    },

    /** Leert den lokalen Zustand (z. B. nach dem Abmelden). */
    zuruecksetzen() {
      this.personen = [];
      this.zuweisungen = [];
      this.geladen = false;
    },

    async speichern() {
      if (!speicher) throw new Error('Kein DatenSpeicher gesetzt (verwendeSpeicher fehlt).');
      await speicher.speichern({
        schemaVersion: AKTUELLE_SCHEMA_VERSION,
        personen: this.personen,
        zuweisungen: this.zuweisungen,
      });
    },

    async personSpeichern(person: Omit<Person, 'id'> & { id?: string }) {
      pruefePerson(person);
      if (person.id) {
        const idx = this.personen.findIndex((p) => p.id === person.id);
        if (idx === -1) throw new Error(`Person ${person.id} nicht gefunden.`);
        this.personen[idx] = { ...person, id: person.id };
      } else {
        this.personen.push({ ...person, id: crypto.randomUUID() });
      }
      await this.speichern();
    },

    /**
     * Besetzt eine Plan-Zelle (ersetzt eine vorhandene Besetzung).
     * Manuelle Zuweisungen sind `fixiert` — der Generator überschreibt sie nie.
     */
    async zuweisungSetzen(datum: ISODate, dienstartId: DienstartId, personId: string) {
      this.zuweisungen = this.zuweisungen.filter(
        (z) => !(z.datum === datum && z.dienstartId === dienstartId),
      );
      this.zuweisungen.push({ id: crypto.randomUUID(), datum, dienstartId, personId, fixiert: true });
      await this.speichern();
    },

    async zuweisungEntfernen(datum: ISODate, dienstartId: DienstartId) {
      this.zuweisungen = this.zuweisungen.filter(
        (z) => !(z.datum === datum && z.dienstartId === dienstartId),
      );
      await this.speichern();
    },

    /** Füllt alle offenen Dienste des Monats; bestehende Einträge bleiben unangetastet. */
    async monatGenerieren(jahr: number, monat: number): Promise<GenerierungsErgebnis> {
      const ergebnis = generierePlan({
        jahr,
        monat,
        personen: this.aktivePersonen,
        bestehendeZuweisungen: this.zuweisungen,
      });
      this.zuweisungen.push(...ergebnis.neu);
      await this.speichern();
      return ergebnis;
    },

    /** Entfernt ALLE Zuweisungen des Monats — auch fixierte (kompletter Neustart). */
    async monatLeeren(jahr: number, monat: number) {
      this.zuweisungen = this.zuweisungen.filter((z) => !imMonat(z.datum, jahr, monat));
      await this.speichern();
    },

    /**
     * Entfernt alle NICHT-fixierten Einträge des Monats und generiert neu.
     * Fixierte (manuell gesetzte) Einträge bleiben erhalten.
     */
    async neuVerteilen(jahr: number, monat: number): Promise<GenerierungsErgebnis> {
      this.zuweisungen = this.zuweisungen.filter(
        (z) => !(imMonat(z.datum, jahr, monat) && !z.fixiert),
      );
      return this.monatGenerieren(jahr, monat);
    },

    /** Wechselt den fixiert-Status einer Zuweisung. */
    async zuweisungFixierenToggle(datum: ISODate, dienstartId: DienstartId) {
      const z = this.zuweisungen.find((z) => z.datum === datum && z.dienstartId === dienstartId);
      if (!z) return;
      z.fixiert = !z.fixiert;
      await this.speichern();
    },

    /** Ersetzt alle Zuweisungen durch einen gespeicherten Schnappschuss (Undo). */
    async zuweisungenWiederherstellen(snapshot: Zuweisung[]) {
      this.zuweisungen = [...snapshot];
      await this.speichern();
    },

    /** Serialisiert den gesamten Datenstand als JSON-String. */
    async exportierenAlsJson(): Promise<string> {
      return JSON.stringify(
        {
          schemaVersion: AKTUELLE_SCHEMA_VERSION,
          personen: this.personen,
          zuweisungen: this.zuweisungen,
        },
        null,
        2,
      );
    },

    /** Importiert einen zuvor exportierten JSON-String und speichert ihn. */
    async importierenAusJson(json: string): Promise<void> {
      const daten = JSON.parse(json);
      const migriert = migriere(daten);
      this.personen = migriert.personen;
      this.zuweisungen = migriert.zuweisungen;
      await this.speichern();
    },

    async personAktivSetzen(id: string, aktiv: boolean) {
      const p = this.personen.find((p) => p.id === id);
      if (!p) throw new Error(`Person ${id} nicht gefunden.`);
      p.aktiv = aktiv;
      await this.speichern();
    },

    async personLoeschen(id: string) {
      this.personen = this.personen.filter((p) => p.id !== id);
      this.zuweisungen = this.zuweisungen.filter((z) => z.personId !== id);
      await this.speichern();
    },
  },
});
