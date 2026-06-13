import { describe, expect, it } from 'vitest';
import type { Person, Zuweisung } from '../../src/domain/types';
import { leereHaeufigkeiten } from '../../src/domain/person';
import { vollzeitWechsel } from '../../src/domain/rules/vollzeitWechsel';

/**
 * Juni 2026: Freitage 5, 12, 19, 26 · Samstage 6, 13, 20, 27 · Sonntage 7, 14, 21, 28.
 * Mai 2026: Sa 02, Fr 08, Sa 09, So 10, …
 * Muster A = VG Freitag + Sonntag, Muster B = VG Samstag.
 */
function vollzeitkraft(anpassen: Partial<Person> = {}): Person {
  const haeufigkeiten = leereHaeufigkeiten();
  haeufigkeiten.vordergrund = { soll: 5, maximum: 10 };
  return {
    id: 'p1',
    name: 'Erika Muster',
    aktiv: true,
    vollzeit: true,
    haeufigkeiten,
    abwesenheiten: [],
    ...anpassen,
  };
}

function vg(datum: string, personId = 'p1'): Zuweisung {
  return { id: crypto.randomUUID(), datum, dienstartId: 'vordergrund', personId, fixiert: false };
}

const MAI_SAMSTAG = [vg('2026-05-09')]; // Muster B im Mai → Juni erwartet A
const MAI_FR_SO = [vg('2026-05-08'), vg('2026-05-24')]; // Muster A im Mai → Juni erwartet B

describe('Regel: vollzeit-wechsel', () => {
  it('nach Muster B (Samstag) im Vormonat: Samstag kostet, Freitag/Sonntag frei', () => {
    const p = vollzeitkraft();
    const strafe = (datum: string) =>
      vollzeitWechsel.strafpunkte(
        { person: p, datum, dienstartId: 'vordergrund' },
        { zuweisungen: MAI_SAMSTAG },
      );
    expect(strafe('2026-06-13')).toBe(1); // Samstag im A-Monat
    expect(strafe('2026-06-12')).toBe(0); // Freitag erwünscht
    expect(strafe('2026-06-14')).toBe(0); // Sonntag erwünscht
  });

  it('nach Muster A (Fr+So) im Vormonat: nur Samstag ist frei von Strafpunkten', () => {
    const p = vollzeitkraft();
    const strafe = (datum: string) =>
      vollzeitWechsel.strafpunkte(
        { person: p, datum, dienstartId: 'vordergrund' },
        { zuweisungen: MAI_FR_SO },
      );
    expect(strafe('2026-06-13')).toBe(0);
    expect(strafe('2026-06-12')).toBe(1);
    expect(strafe('2026-06-14')).toBe(1);
  });

  it('„einmal pro Monat": der zweite Freitag bzw. Samstag kostet ebenfalls', () => {
    const p = vollzeitkraft();
    // A-Monat: ein Freitag ist schon vergeben → zweiter Freitag kostet, Sonntag nicht.
    const aMonat = [...MAI_SAMSTAG, vg('2026-06-12')];
    expect(
      vollzeitWechsel.strafpunkte(
        { person: p, datum: '2026-06-26', dienstartId: 'vordergrund' },
        { zuweisungen: aMonat },
      ),
    ).toBe(1);
    expect(
      vollzeitWechsel.strafpunkte(
        { person: p, datum: '2026-06-14', dienstartId: 'vordergrund' },
        { zuweisungen: aMonat },
      ),
    ).toBe(0);
    // B-Monat: zweiter Samstag kostet.
    const bMonat = [...MAI_FR_SO, vg('2026-06-13')];
    expect(
      vollzeitWechsel.strafpunkte(
        { person: p, datum: '2026-06-27', dienstartId: 'vordergrund' },
        { zuweisungen: bMonat },
      ),
    ).toBe(1);
  });

  it('Urlaubsmonat VERSCHIEBT das Muster: Mai ohne Wochenend-VG, April Muster B → Juni erwartet A', () => {
    const p = vollzeitkraft();
    const aprilSamstag = [vg('2026-04-11')]; // Samstag im April, Mai leer
    expect(
      vollzeitWechsel.strafpunkte(
        { person: p, datum: '2026-06-13', dienstartId: 'vordergrund' },
        { zuweisungen: aprilSamstag },
      ),
    ).toBe(1);
    expect(
      vollzeitWechsel.strafpunkte(
        { person: p, datum: '2026-06-12', dienstartId: 'vordergrund' },
        { zuweisungen: aprilSamstag },
      ),
    ).toBe(0);
  });

  it('ohne Historie zählt das im laufenden Monat begonnene Muster', () => {
    const p = vollzeitkraft();
    const begonnen = [vg('2026-06-06')]; // Samstag → Monat ist B
    expect(
      vollzeitWechsel.strafpunkte(
        { person: p, datum: '2026-06-12', dienstartId: 'vordergrund' },
        { zuweisungen: begonnen },
      ),
    ).toBe(1);
    // Ganz ohne Einträge: keine Strafpunkte, egal welcher Tag.
    expect(
      vollzeitWechsel.strafpunkte(
        { person: p, datum: '2026-06-13', dienstartId: 'vordergrund' },
        { zuweisungen: [] },
      ),
    ).toBe(0);
  });

  it('gilt nicht für Teilzeitkräfte, Wochentage oder andere Dienstarten', () => {
    const teilzeit = vollzeitkraft({ vollzeit: false });
    expect(
      vollzeitWechsel.strafpunkte(
        { person: teilzeit, datum: '2026-06-13', dienstartId: 'vordergrund' },
        { zuweisungen: MAI_SAMSTAG },
      ),
    ).toBe(0);
    const p = vollzeitkraft();
    expect(
      vollzeitWechsel.strafpunkte(
        { person: p, datum: '2026-06-10', dienstartId: 'vordergrund' },
        { zuweisungen: MAI_SAMSTAG },
      ),
    ).toBe(0);
    expect(
      vollzeitWechsel.strafpunkte(
        { person: p, datum: '2026-06-13', dienstartId: 'visite' },
        { zuweisungen: MAI_SAMSTAG },
      ),
    ).toBe(0);
  });
});
