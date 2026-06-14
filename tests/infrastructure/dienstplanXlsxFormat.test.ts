import { describe, expect, it } from 'vitest';
import type { Person, Zuweisung } from '../../src/domain/types';
import { leereHaeufigkeiten } from '../../src/domain/person';
import {
  baueJahresMatrix,
  ersetzeJahresAbwesenheiten,
  leseJahresMatrix,
  nachnameVon,
  KOPFZEILE,
} from '../../src/infrastructure/xlsx/dienstplanXlsxFormat';

function person(id: string, name: string, anpassen: Partial<Person> = {}): Person {
  return {
    id,
    name,
    aktiv: true,
    vollzeit: false,
    haeufigkeiten: leereHaeufigkeiten(),
    abwesenheiten: [],
    ...anpassen,
  };
}

function z(teil: Partial<Zuweisung>): Zuweisung {
  return {
    id: crypto.randomUUID(),
    datum: '2026-01-01',
    dienstartId: 'vordergrund',
    personId: 'a',
    fixiert: true,
    ...teil,
  };
}

const JAHR = 2026;

describe('nachnameVon', () => {
  it('nimmt das letzte Wort', () => {
    expect(nachnameVon('Erika Muster')).toBe('Muster');
    expect(nachnameVon('Kalthoum-Mouelhi')).toBe('Kalthoum-Mouelhi');
    expect(nachnameVon('  Anna  Maria  Schwarz ')).toBe('Schwarz');
  });
});

describe('baueJahresMatrix', () => {
  const personen = [person('a', 'Max Kneffel'), person('b', 'Eva Schwarz')];
  const blaetter = baueJahresMatrix(personen, [z({ datum: '2026-01-01', personId: 'a' })], JAHR);

  it('erzeugt 12 Monatsblätter mit Kopfzeile', () => {
    expect(blaetter).toHaveLength(12);
    expect(blaetter[0].blattName).toBe('Januar');
    expect(blaetter[11].blattName).toBe('Dezember');
    expect(blaetter[0].zeilen[0]).toEqual([...KOPFZEILE]);
  });

  it('schreibt Datum in Spalte A und Nachname in die Dienstspalte', () => {
    const zeile = blaetter[0].zeilen[1]; // 1. Januar
    expect(zeile[0]).toBe('2026-01-01');
    expect(zeile[1]).toBe('Kneffel'); // Vordergrund
    expect(zeile[4]).toBe(''); // Hintergrund bleibt leer
  });

  it('eine Tageszeile pro Kalendertag', () => {
    expect(blaetter[0].zeilen).toHaveLength(1 + 31); // Kopf + 31 Tage Januar
    expect(blaetter[1].zeilen).toHaveLength(1 + 28); // Februar 2026
  });

  it('expandiert Abwesenheits-Ranges auf Tageszellen (komma-getrennt)', () => {
    const mitUrlaub = [
      person('a', 'Max Kneffel', {
        abwesenheiten: [{ id: 'x', typ: 'urlaub', von: '2026-01-01', bis: '2026-01-03' }],
      }),
      person('b', 'Eva Schwarz', {
        abwesenheiten: [{ id: 'y', typ: 'fortbildung', von: '2026-01-01', bis: '2026-01-01' }],
      }),
    ];
    const b = baueJahresMatrix(mitUrlaub, [], JAHR);
    expect(b[0].zeilen[1][5]).toBe('Kneffel, Schwarz'); // 01.01. Urlaub + FoBi in Spalte F
    expect(b[0].zeilen[2][5]).toBe('Kneffel'); // 02.01. nur noch Urlaub
    expect(b[0].zeilen[4][5]).toBe(''); // 04.01. niemand
  });
});

describe('leseJahresMatrix — Round-Trip', () => {
  const personen = [person('a', 'Max Kneffel'), person('b', 'Eva Schwarz')];
  const zuweisungen = [
    z({ datum: '2026-01-01', dienstartId: 'vordergrund', personId: 'a' }),
    z({ datum: '2026-01-02', dienstartId: 'vordergrund', personId: 'b' }),
  ];
  const personenMitAbw = [
    person('a', 'Max Kneffel', {
      abwesenheiten: [{ id: 'x', typ: 'urlaub', von: '2026-01-10', bis: '2026-01-12' }],
    }),
    person('b', 'Eva Schwarz', {
      abwesenheiten: [{ id: 'y', typ: 'wunschfrei', von: '2026-01-20', bis: '2026-01-20' }],
    }),
  ];

  it('liest Dienst-Zuweisungen verlustfrei zurück', () => {
    const matrix = baueJahresMatrix(personen, zuweisungen, JAHR);
    const ergebnis = leseJahresMatrix(matrix, personen);
    expect(ergebnis.jahr).toBe(2026);
    expect(ergebnis.bericht.uebersprungen).toHaveLength(0);
    const paare = ergebnis.zuweisungen
      .map((zw) => `${zw.datum}|${zw.dienstartId}|${zw.personId}`)
      .sort();
    expect(paare).toEqual(['2026-01-01|vordergrund|a', '2026-01-02|vordergrund|b']);
    expect(ergebnis.zuweisungen.every((zw) => zw.fixiert)).toBe(true);
  });

  it('fasst aufeinanderfolgende Abwesenheits-Tage wieder zu Ranges zusammen', () => {
    const matrix = baueJahresMatrix(personenMitAbw, [], JAHR);
    const ergebnis = leseJahresMatrix(matrix, personenMitAbw);
    const a = ergebnis.abwesenheitenProPerson.get('a');
    expect(a).toEqual([{ id: expect.any(String), typ: 'urlaub', von: '2026-01-10', bis: '2026-01-12' }]);
    const b = ergebnis.abwesenheitenProPerson.get('b');
    // wunschfrei wird beim Export in Spalte "Kann nicht" geschrieben und als wunschfrei zurückgelesen
    expect(b).toEqual([{ id: expect.any(String), typ: 'wunschfrei', von: '2026-01-20', bis: '2026-01-20' }]);
    expect(ergebnis.bericht.abwesenheitsTage).toBe(4);
  });
});

describe('leseJahresMatrix — Namensauflösung & Bericht', () => {
  const personen = [
    person('a', 'Max Kneffel'),
    person('b', 'Eva Schwarz'),
    person('c', 'Tom Schwarz'), // gleicher Nachname → mehrdeutig
  ];

  function blattMit(zeile: string[]): ReturnType<typeof baueJahresMatrix> {
    const matrix = baueJahresMatrix(personen, [], JAHR);
    matrix[0].zeilen[1] = zeile; // 1. Januar überschreiben
    return matrix;
  }

  it('überspringt unbekannte, mehrdeutige und Freitext-Namen mit Begründung', () => {
    const zeile = ['2026-01-01', 'Unbekannt', 'Schwarz', 'Kneffel', '', 'Ademi-L.', 'Beckmann muss 12:30 gehen'];
    const ergebnis = leseJahresMatrix(blattMit(zeile), personen);

    // 'Kneffel' (DaVinci-Spalte) ist eindeutig → übernommen
    expect(ergebnis.zuweisungen).toEqual([
      expect.objectContaining({ datum: '2026-01-01', dienstartId: 'davinci', personId: 'a' }),
    ]);

    const gruende = ergebnis.bericht.uebersprungen.map((u) => `${u.spalte}:${u.rohwert}`);
    expect(gruende).toContain('Vordergrund:Unbekannt'); // unbekannt
    expect(gruende).toContain('Visitendienst:Schwarz'); // mehrdeutig
    expect(gruende).toContain('Urlaub/FoBi:Ademi-L.'); // Abkürzung, kein Treffer
    expect(gruende).toContain('Kann nicht:Beckmann muss 12:30 gehen'); // Freitext
  });

  it('löst komma-getrennte Abwesenheitslisten einzeln auf', () => {
    const zeile = ['2026-01-01', '', '', '', '', 'Kneffel, Schwarz', ''];
    const ergebnis = leseJahresMatrix(blattMit(zeile), personen);
    // Kneffel eindeutig → übernommen; Schwarz mehrdeutig → Bericht
    expect(ergebnis.abwesenheitenProPerson.has('a')).toBe(true);
    expect(ergebnis.bericht.uebersprungen).toHaveLength(1);
    expect(ergebnis.bericht.uebersprungen[0].rohwert).toBe('Schwarz');
  });

  it('ignoriert unbekannte Blätter (z. B. Statistik)', () => {
    const matrix = baueJahresMatrix(personen, [], JAHR);
    matrix.push({ blattName: 'Statistik', zeilen: [['2026-01-01', 'Kneffel']] });
    const ergebnis = leseJahresMatrix(matrix, personen);
    expect(ergebnis.zuweisungen).toHaveLength(0);
  });
});

describe('ersetzeJahresAbwesenheiten', () => {
  it('ersetzt Ranges des Jahres, behält andere Jahre', () => {
    const bestehend = [
      { id: '1', typ: 'urlaub' as const, von: '2025-12-20', bis: '2025-12-31' },
      { id: '2', typ: 'urlaub' as const, von: '2026-03-01', bis: '2026-03-05' },
    ];
    const neu = [{ id: '3', typ: 'wunschfrei' as const, von: '2026-07-01', bis: '2026-07-02' }];
    const ergebnis = ersetzeJahresAbwesenheiten(bestehend, neu, 2026);
    expect(ergebnis).toEqual([bestehend[0], neu[0]]);
  });
});
