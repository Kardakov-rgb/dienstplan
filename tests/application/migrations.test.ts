import { describe, expect, it } from 'vitest';
import { migriere } from '../../src/application/migrations';
import type { GespeicherteDaten } from '../../src/infrastructure/storage/port';
import { AKTUELLE_SCHEMA_VERSION } from '../../src/infrastructure/storage/port';

function v1Daten(): GespeicherteDaten {
  return {
    schemaVersion: 1,
    personen: [
      {
        id: '1',
        vorname: 'Max',
        nachname: 'Beispiel',
        rolle: 'Teamleiter',
        wochenstunden: 40,
      },
    ] as unknown as GespeicherteDaten['personen'],
    zuweisungen: [
      { id: 'z1', datum: '2026-06-12', dienstartId: 'davinci', personId: '1', fixiert: true },
    ],
  };
}

describe('Migration v1 → v2', () => {
  it('hebt die Version auf den aktuellen Stand', () => {
    expect(migriere(v1Daten()).schemaVersion).toBe(AKTUELLE_SCHEMA_VERSION);
  });

  it('entfernt Rolle/Wochenstunden und setzt sichere Defaults', () => {
    const person = migriere(v1Daten()).personen[0];
    expect(person).not.toHaveProperty('rolle');
    expect(person).not.toHaveProperty('wochenstunden');
    expect(person.aktiv).toBe(true);
    expect(person.vollzeit).toBe(false);
    expect(person.abwesenheiten).toEqual([]);
    // Sicherer Default: niemand wird ungewollt verplant.
    expect(person.haeufigkeiten.vordergrund).toEqual({ soll: 0, maximum: 0 });
    expect(person.haeufigkeiten.visite).toEqual({ soll: 0, maximum: 0 });
    expect(person.haeufigkeiten.davinci).toEqual({ soll: 0, maximum: 0 });
  });

  it('führt Vor-/Nachname zum Namensfeld zusammen und behält Zuweisungen', () => {
    const migriert = migriere(v1Daten());
    expect(migriert.personen[0].name).toBe('Max Beispiel');
    expect(migriert.personen[0]).not.toHaveProperty('vorname');
    expect(migriert.personen[0]).not.toHaveProperty('nachname');
    expect(migriert.zuweisungen).toEqual(v1Daten().zuweisungen);
  });

  it('lässt aktuelle Daten unangetastet', () => {
    const aktuell: GespeicherteDaten = {
      schemaVersion: AKTUELLE_SCHEMA_VERSION,
      personen: [],
      zuweisungen: [],
    };
    expect(migriere(aktuell)).toBe(aktuell);
  });

  it('wirft bei unbekannter (zu alter) Version ohne Migrationspfad', () => {
    const uralt = { schemaVersion: 0, personen: [], zuweisungen: [] } as GespeicherteDaten;
    expect(() => migriere(uralt)).toThrow(/Migration/);
  });
});

describe('Migration v3 → v4 (Namensfeld)', () => {
  it('führt vorname + nachname zu name zusammen', () => {
    const v3: GespeicherteDaten = {
      schemaVersion: 3,
      personen: [
        {
          id: '1',
          vorname: 'Erika',
          nachname: 'Muster',
          aktiv: true,
          vollzeit: true,
          haeufigkeiten: {
            vordergrund: { soll: 4, maximum: 6 },
            visite: { soll: 1, maximum: 2 },
            davinci: { soll: 1, maximum: 2 },
          },
          abwesenheiten: [],
        },
      ] as unknown as GespeicherteDaten['personen'],
      zuweisungen: [],
    };
    const migriert = migriere(v3);
    expect(migriert.schemaVersion).toBe(AKTUELLE_SCHEMA_VERSION);
    expect(migriert.personen[0].name).toBe('Erika Muster');
    expect(migriert.personen[0].vollzeit).toBe(true);
    expect(migriert.personen[0]).not.toHaveProperty('vorname');
  });
});
