/**
 * Zentraler Anwendungszustand (Pinia).
 * Alle Änderungen an Personen/Zuweisungen laufen über die Aktionen dieses
 * Stores; gespeichert wird automatisch über den injizierten DatenSpeicher.
 */
import { defineStore } from 'pinia';
import type { Person, Zuweisung } from '../domain/types';
import { DIENSTARTEN } from '../domain/dienste';
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
  }),

  getters: {
    person: (state) => (id: string) => state.personen.find((p) => p.id === id),
    /** Nur aktive Personen — Grundlage für Plan-Ansicht und Generator. */
    aktivePersonen: (state) => state.personen.filter((p) => p.aktiv),
  },

  actions: {
    async laden() {
      if (!speicher) throw new Error('Kein DatenSpeicher gesetzt (verwendeSpeicher fehlt).');
      const daten = (await speicher.laden()) ?? leereDaten();
      const migriert = migriere(daten);
      this.personen = migriert.personen;
      this.zuweisungen = migriert.zuweisungen;
      this.geladen = true;
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
