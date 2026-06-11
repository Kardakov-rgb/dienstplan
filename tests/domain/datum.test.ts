import { describe, expect, it } from 'vitest';
import {
  addiereTage,
  istWochenende,
  monatsTage,
  tageImMonat,
  toISODate,
  wochentag,
} from '../../src/domain/datum';

describe('wochentag', () => {
  it('liefert Werte wie Date.getDay (0 = Sonntag)', () => {
    expect(wochentag('2026-06-12')).toBe(5); // Freitag
    expect(wochentag('2026-06-13')).toBe(6); // Samstag
    expect(wochentag('2026-06-14')).toBe(0); // Sonntag
    expect(wochentag('2026-06-15')).toBe(1); // Montag
  });
});

describe('istWochenende', () => {
  it('erkennt Samstag und Sonntag', () => {
    expect(istWochenende('2026-06-13')).toBe(true);
    expect(istWochenende('2026-06-14')).toBe(true);
    expect(istWochenende('2026-06-15')).toBe(false);
  });
});

describe('tageImMonat / monatsTage', () => {
  it('kennt Monatslängen inkl. Schaltjahr', () => {
    expect(tageImMonat(2026, 2)).toBe(28);
    expect(tageImMonat(2028, 2)).toBe(29);
    expect(tageImMonat(2026, 6)).toBe(30);
    expect(tageImMonat(2026, 7)).toBe(31);
  });

  it('liefert alle Tage aufsteigend', () => {
    const tage = monatsTage(2026, 2);
    expect(tage[0]).toBe('2026-02-01');
    expect(tage[tage.length - 1]).toBe('2026-02-28');
    expect(tage).toHaveLength(28);
  });
});

describe('addiereTage', () => {
  it('rechnet über Monats- und Jahresgrenzen', () => {
    expect(addiereTage('2026-01-31', 1)).toBe('2026-02-01');
    expect(addiereTage('2026-12-31', 1)).toBe('2027-01-01');
    expect(addiereTage('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('toISODate', () => {
  it('füllt mit führenden Nullen auf', () => {
    expect(toISODate(2026, 6, 4)).toBe('2026-06-04');
  });
});
