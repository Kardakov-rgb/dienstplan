import { describe, expect, it } from 'vitest';
import { dienstart } from '../../src/domain/dienste';

describe('Vordergrunddienst', () => {
  const vordergrund = dienstart('vordergrund');

  it.each([
    ['2026-06-10', 'gewöhnlicher Mittwoch'],
    ['2026-06-13', 'Samstag'],
    ['2026-06-14', 'Sonntag'],
    ['2026-06-04', 'Feiertag (Fronleichnam)'],
    ['2026-12-25', 'Feiertag (1. Weihnachtstag)'],
  ])('findet am %s statt (%s)', (datum) => {
    expect(vordergrund.findetStattAm(datum)).toBe(true);
  });
});

describe('Visitendienst', () => {
  const visite = dienstart('visite');

  it.each([
    ['2026-06-13', 'Samstag'],
    ['2026-06-14', 'Sonntag'],
    ['2026-06-04', 'Wochentags-Feiertag (Fronleichnam, Donnerstag)'],
    ['2026-05-01', 'Wochentags-Feiertag (Tag der Arbeit, Freitag)'],
  ])('findet am %s statt (%s)', (datum) => {
    expect(visite.findetStattAm(datum)).toBe(true);
  });

  it.each([
    ['2026-06-10', 'gewöhnlicher Mittwoch'],
    ['2026-06-12', 'gewöhnlicher Freitag'],
  ])('findet am %s NICHT statt (%s)', (datum) => {
    expect(visite.findetStattAm(datum)).toBe(false);
  });
});

describe('Davincidienst', () => {
  const davinci = dienstart('davinci');

  it.each([
    ['2026-06-12', 'gewöhnlicher Freitag'],
    ['2026-01-02', 'Freitag nach Neujahr'],
  ])('findet am %s statt (%s)', (datum) => {
    expect(davinci.findetStattAm(datum)).toBe(true);
  });

  it.each([
    ['2026-06-11', 'Donnerstag'],
    ['2026-06-13', 'Samstag'],
    ['2026-04-03', 'Freitag, aber Feiertag (Karfreitag)'],
    ['2026-05-01', 'Freitag, aber Feiertag (Tag der Arbeit)'],
  ])('findet am %s NICHT statt (%s)', (datum) => {
    expect(davinci.findetStattAm(datum)).toBe(false);
  });
});
