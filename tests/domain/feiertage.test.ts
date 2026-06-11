import { describe, expect, it } from 'vitest';
import { feiertageNRW, feiertagsName, istFeiertag, ostersonntag } from '../../src/domain/feiertage';

describe('ostersonntag', () => {
  it.each([
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
  ])('berechnet Ostern %i korrekt', (jahr, erwartet) => {
    expect(ostersonntag(jahr)).toBe(erwartet);
  });
});

describe('feiertageNRW', () => {
  it('enthält alle 11 gesetzlichen NRW-Feiertage', () => {
    expect(feiertageNRW(2026).size).toBe(11);
  });

  it.each([
    ['2025-04-18', 'Karfreitag'],
    ['2025-06-09', 'Pfingstmontag'],
    ['2025-06-19', 'Fronleichnam'],
    ['2026-01-01', 'Neujahr'],
    ['2026-04-03', 'Karfreitag'],
    ['2026-04-06', 'Ostermontag'],
    ['2026-05-14', 'Christi Himmelfahrt'],
    ['2026-05-25', 'Pfingstmontag'],
    ['2026-06-04', 'Fronleichnam'],
    ['2026-11-01', 'Allerheiligen'],
    ['2026-12-26', '2. Weihnachtstag'],
    ['2027-03-26', 'Karfreitag'],
    ['2027-05-06', 'Christi Himmelfahrt'],
    ['2027-05-27', 'Fronleichnam'],
  ])('%s ist %s', (datum, name) => {
    expect(feiertagsName(datum)).toBe(name);
    expect(istFeiertag(datum)).toBe(true);
  });

  it.each([
    ['2026-01-06', 'Heilige Drei Könige gilt in NRW nicht'],
    ['2026-08-15', 'Mariä Himmelfahrt gilt in NRW nicht'],
    ['2026-10-31', 'Reformationstag gilt in NRW nicht'],
    ['2026-12-24', 'Heiligabend ist kein gesetzlicher Feiertag'],
  ])('%s ist kein Feiertag (%s)', (datum) => {
    expect(istFeiertag(datum)).toBe(false);
  });
});
