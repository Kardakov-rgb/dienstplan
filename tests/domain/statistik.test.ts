import { describe, expect, it } from 'vitest';
import type { Person, Zuweisung } from '../../src/domain/types';
import { leereHaeufigkeiten } from '../../src/domain/person';
import { berechneStatistik, statistikAlsCsv } from '../../src/domain/statistik';

function person(id: string, name: string, anpassen: Partial<Person> = {}): Person {
  const haeufigkeiten = leereHaeufigkeiten();
  haeufigkeiten.vordergrund = { soll: 3, maximum: 10 };
  haeufigkeiten.visite = { soll: 1, maximum: 2 };
  return {
    id,
    name: `${name} Test`,
    aktiv: true,
    vollzeit: false,
    haeufigkeiten,
    abwesenheiten: [],
    ...anpassen,
  };
}

function z(teil: Partial<Zuweisung>): Zuweisung {
  return {
    id: crypto.randomUUID(),
    datum: '2026-06-10',
    dienstartId: 'vordergrund',
    personId: 'a',
    fixiert: false,
    ...teil,
  };
}

const anna = person('a', 'Anna');
const ben = person('b', 'Ben');

// Juni 2026: Fronleichnam Do 04.06.; Wochenende 13./14.06.
const zuweisungen: Zuweisung[] = [
  z({ datum: '2026-06-02' }),
  z({ datum: '2026-06-04', fixiert: true }), // Feiertag, manuell
  z({ datum: '2026-06-13', dienstartId: 'visite' }),
  z({ datum: '2026-06-14', dienstartId: 'visite' }),
  z({ datum: '2026-05-20' }), // Vormonat
  z({ datum: '2025-12-25' }), // Vorjahr, Feiertag
  z({ datum: '2026-06-19', personId: 'b', dienstartId: 'davinci' }),
];

describe('berechneStatistik', () => {
  it('Monatsansicht: zählt nur den Monat, Visite als Einheit, Soll aus dem Profil', () => {
    const [s] = berechneStatistik([anna], zuweisungen, { art: 'monat', jahr: 2026, monat: 6 });
    expect(s.proDienstart.vordergrund).toEqual({ ist: 2, soll: 3 });
    expect(s.proDienstart.visite).toEqual({ ist: 1, soll: 1 });
    expect(s.gesamt).toBe(3);
    expect(s.wochenenden).toBe(1);
    expect(s.feiertage).toBe(1);
    expect(s.manuell).toBe(1);
    expect(s.generiert).toBe(3);
  });

  it('Jahresansicht: zählt das Jahr, Soll = Monats-Soll × 12', () => {
    const [s] = berechneStatistik([anna], zuweisungen, { art: 'jahr', jahr: 2026, monat: 6 });
    expect(s.proDienstart.vordergrund).toEqual({ ist: 3, soll: 36 });
    expect(s.feiertage).toBe(1);
  });

  it('Gesamtansicht: zählt alles, ohne Soll-Vergleich', () => {
    const [s] = berechneStatistik([anna], zuweisungen, { art: 'gesamt', jahr: 2026, monat: 6 });
    expect(s.proDienstart.vordergrund).toEqual({ ist: 4, soll: null });
    expect(s.feiertage).toBe(2);
  });

  it('inaktive Personen erscheinen nur mit Diensten im Zeitraum', () => {
    const inaktivMit = person('a', 'Anna', { aktiv: false });
    const inaktivOhne = person('c', 'Cem', { aktiv: false });
    const ergebnis = berechneStatistik([inaktivMit, inaktivOhne, ben], zuweisungen, {
      art: 'monat',
      jahr: 2026,
      monat: 6,
    });
    expect(ergebnis.map((s) => s.person.id)).toEqual(['a', 'b']);
  });
});

describe('statistikAlsCsv', () => {
  it('liefert Kopfzeile und eine Zeile pro Person, Semikolon-getrennt', () => {
    const csv = statistikAlsCsv(
      berechneStatistik([anna, ben], zuweisungen, { art: 'monat', jahr: 2026, monat: 6 }),
    );
    const zeilen = csv.split('\n');
    expect(zeilen).toHaveLength(3);
    expect(zeilen[0]).toContain('Vordergrund Ist;Vordergrund Soll');
    expect(zeilen[1]).toContain('Anna Test;2;3;1;1');
  });

  it('lässt das Soll in der Gesamtansicht leer', () => {
    const csv = statistikAlsCsv(
      berechneStatistik([anna], zuweisungen, { art: 'gesamt', jahr: 2026, monat: 6 }),
    );
    expect(csv.split('\n')[1]).toContain('Anna Test;4;;');
  });
});
