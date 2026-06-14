import { describe, expect, it } from 'vitest';
import type { Person, Zuweisung } from '../../src/domain/types';
import { leereHaeufigkeiten } from '../../src/domain/person';
import { baueJahresMatrix, leseJahresMatrix } from '../../src/infrastructure/xlsx/dienstplanXlsxFormat';
import { matrixZuXlsx, xlsxZuMatrix } from '../../src/infrastructure/xlsx/xlsxAdapter';

function person(id: string, name: string, anpassen: Partial<Person> = {}): Person {
  return { id, name, aktiv: true, vollzeit: false, haeufigkeiten: leereHaeufigkeiten(), abwesenheiten: [], ...anpassen };
}

function z(teil: Partial<Zuweisung>): Zuweisung {
  return { id: crypto.randomUUID(), datum: '2026-01-01', dienstartId: 'vordergrund', personId: 'a', fixiert: true, ...teil };
}

describe('xlsxAdapter — echte .xlsx-Bytes', () => {
  const personen = [
    person('a', 'Max Kneffel', { abwesenheiten: [{ id: 'x', typ: 'urlaub', von: '2026-01-10', bis: '2026-01-12' }] }),
    person('b', 'Eva Schwarz'),
  ];
  const zuweisungen = [
    z({ datum: '2026-01-01', dienstartId: 'vordergrund', personId: 'a' }),
    z({ datum: '2026-12-31', dienstartId: 'vordergrund', personId: 'b' }),
  ];

  it('schreibt und liest die Matrix verlustfrei (inkl. Datumsspalte)', async () => {
    const matrix = baueJahresMatrix(personen, zuweisungen, 2026);
    const buffer = await matrixZuXlsx(matrix);
    expect(buffer.byteLength).toBeGreaterThan(0);

    const gelesen = await xlsxZuMatrix(buffer);
    const ergebnis = leseJahresMatrix(gelesen, personen);

    expect(ergebnis.jahr).toBe(2026);
    expect(ergebnis.bericht.uebersprungen).toHaveLength(0);
    const paare = ergebnis.zuweisungen.map((zw) => `${zw.datum}|${zw.dienstartId}|${zw.personId}`).sort();
    expect(paare).toEqual(['2026-01-01|vordergrund|a', '2026-12-31|vordergrund|b']);
    expect(ergebnis.abwesenheitenProPerson.get('a')).toEqual([
      { id: expect.any(String), typ: 'urlaub', von: '2026-01-10', bis: '2026-01-12' },
    ]);
  });
});
