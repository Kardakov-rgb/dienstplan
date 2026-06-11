import { describe, expect, it } from 'vitest';
import type { Person } from '../../src/domain/types';
import {
  abwesenheitAm,
  darfDienst,
  leereHaeufigkeiten,
  machtIrgendeinenDienst,
} from '../../src/domain/person';

function testPerson(anpassen: Partial<Person> = {}): Person {
  return {
    id: 'p1',
    vorname: 'Erika',
    nachname: 'Muster',
    aktiv: true,
    haeufigkeiten: leereHaeufigkeiten(),
    abwesenheiten: [],
    ...anpassen,
  };
}

describe('darfDienst', () => {
  it('verneint bei Maximum 0', () => {
    const p = testPerson();
    expect(darfDienst(p, 'vordergrund')).toBe(false);
    expect(machtIrgendeinenDienst(p)).toBe(false);
  });

  it('bejaht bei positivem Maximum — unabhängig vom Soll', () => {
    const p = testPerson();
    p.haeufigkeiten.visite = { soll: 0, maximum: 2 };
    expect(darfDienst(p, 'visite')).toBe(true);
    expect(darfDienst(p, 'davinci')).toBe(false);
    expect(machtIrgendeinenDienst(p)).toBe(true);
  });
});

describe('abwesenheitAm', () => {
  const urlaub = { id: 'a1', typ: 'urlaub' as const, von: '2026-07-06', bis: '2026-07-17' };
  const krank = { id: 'a2', typ: 'krank' as const, von: '2026-08-03', bis: '2026-08-03' };
  const p = testPerson({ abwesenheiten: [urlaub, krank] });

  it.each([
    ['2026-07-06', 'erster Tag'],
    ['2026-07-10', 'mitten im Zeitraum'],
    ['2026-07-17', 'letzter Tag'],
  ])('erkennt Abwesenheit am %s (%s)', (datum) => {
    expect(abwesenheitAm(p, datum)).toEqual(urlaub);
  });

  it.each([
    ['2026-07-05', 'Tag davor'],
    ['2026-07-18', 'Tag danach'],
    ['2026-12-24', 'völlig außerhalb'],
  ])('liefert null am %s (%s)', (datum) => {
    expect(abwesenheitAm(p, datum)).toBeNull();
  });

  it('erkennt einen eintägigen Zeitraum', () => {
    expect(abwesenheitAm(p, '2026-08-03')).toEqual(krank);
  });

  it('liefert null ohne Abwesenheiten', () => {
    expect(abwesenheitAm(testPerson(), '2026-07-10')).toBeNull();
  });
});
