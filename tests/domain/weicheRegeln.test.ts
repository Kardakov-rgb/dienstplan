import { describe, expect, it } from 'vitest';
import type { Person, Zuweisung } from '../../src/domain/types';
import { leereHaeufigkeiten } from '../../src/domain/person';
import { sollUeberschreitung } from '../../src/domain/rules/sollUeberschreitung';
import { gesamtFairness } from '../../src/domain/rules/gesamtFairness';
import { dienstAbstand } from '../../src/domain/rules/dienstAbstand';
import { visiteWochenendBlock } from '../../src/domain/rules/visiteWochenendBlock';

function testPerson(id = 'p1'): Person {
  const haeufigkeiten = leereHaeufigkeiten();
  haeufigkeiten.vordergrund = { soll: 2, maximum: 10 };
  haeufigkeiten.visite = { soll: 1, maximum: 4 };
  return { id, vorname: 'Erika', nachname: 'Muster', aktiv: true, haeufigkeiten, abwesenheiten: [] };
}

function zuweisung(teil: Partial<Zuweisung>): Zuweisung {
  return {
    id: crypto.randomUUID(),
    datum: '2026-06-10',
    dienstartId: 'vordergrund',
    personId: 'p1',
    fixiert: false,
    ...teil,
  };
}

describe('soll-ueberschreitung', () => {
  const kandidat = { person: testPerson(), datum: '2026-06-15', dienstartId: 'vordergrund' as const };

  it('keine Strafpunkte unterhalb des Solls', () => {
    expect(sollUeberschreitung.strafpunkte(kandidat, { zuweisungen: [] })).toBe(0);
    expect(
      sollUeberschreitung.strafpunkte(kandidat, {
        zuweisungen: [zuweisung({ datum: '2026-06-02' })],
      }),
    ).toBe(0);
  });

  it('steigende Strafpunkte oberhalb des Solls', () => {
    const zwei = [zuweisung({ datum: '2026-06-02' }), zuweisung({ datum: '2026-06-05' })];
    expect(sollUeberschreitung.strafpunkte(kandidat, { zuweisungen: zwei })).toBe(1);
    const drei = [...zwei, zuweisung({ datum: '2026-06-08' })];
    expect(sollUeberschreitung.strafpunkte(kandidat, { zuweisungen: drei })).toBe(2);
  });

  it('zählt nur den Monat des Kandidaten-Datums', () => {
    const vormonat = [zuweisung({ datum: '2026-05-02' }), zuweisung({ datum: '2026-05-05' })];
    expect(sollUeberschreitung.strafpunkte(kandidat, { zuweisungen: vormonat })).toBe(0);
  });
});

describe('gesamt-fairness', () => {
  it('zählt ALLE bisherigen Dienste der Art — egal aus welchem Monat', () => {
    const kandidat = { person: testPerson(), datum: '2026-06-15', dienstartId: 'vordergrund' as const };
    const historie = [
      zuweisung({ datum: '2025-11-03' }),
      zuweisung({ datum: '2026-02-14' }),
      zuweisung({ datum: '2026-06-01' }),
      zuweisung({ datum: '2026-06-02', dienstartId: 'visite' }), // andere Art zählt nicht
      zuweisung({ datum: '2026-06-03', personId: 'p2' }), // andere Person zählt nicht
    ];
    expect(gesamtFairness.strafpunkte(kandidat, { zuweisungen: historie })).toBe(3);
  });
});

describe('dienst-abstand', () => {
  const kandidat = { person: testPerson(), datum: '2026-06-15', dienstartId: 'vordergrund' as const };

  it('keine Strafpunkte ohne nahe Dienste', () => {
    expect(
      dienstAbstand.strafpunkte(kandidat, { zuweisungen: [zuweisung({ datum: '2026-06-25' })] }),
    ).toBe(0);
  });

  it('mehr Strafpunkte, je näher der Nachbardienst liegt', () => {
    const direktDanach = dienstAbstand.strafpunkte(kandidat, {
      zuweisungen: [zuweisung({ datum: '2026-06-16' })],
    });
    const dreiTage = dienstAbstand.strafpunkte(kandidat, {
      zuweisungen: [zuweisung({ datum: '2026-06-18' })],
    });
    expect(direktDanach).toBeGreaterThan(dreiTage);
    expect(dreiTage).toBeGreaterThan(0);
  });
});

describe('visite-wochenend-block', () => {
  const samstagKandidat = { person: testPerson(), datum: '2026-06-13', dienstartId: 'visite' as const };

  it('Strafpunkte, wenn der Partnertag mit jemand anderem besetzt ist', () => {
    const so = zuweisung({ datum: '2026-06-14', dienstartId: 'visite', personId: 'p2' });
    expect(visiteWochenendBlock.strafpunkte(samstagKandidat, { zuweisungen: [so] })).toBe(1);
  });

  it('keine Strafpunkte, wenn der Partnertag dieselbe Person hat oder frei ist', () => {
    const soSelbst = zuweisung({ datum: '2026-06-14', dienstartId: 'visite', personId: 'p1' });
    expect(visiteWochenendBlock.strafpunkte(samstagKandidat, { zuweisungen: [soSelbst] })).toBe(0);
    expect(visiteWochenendBlock.strafpunkte(samstagKandidat, { zuweisungen: [] })).toBe(0);
  });

  it('gilt nicht für Wochentags-Feiertags-Visite und andere Dienstarten', () => {
    const feiertagsVisite = { person: testPerson(), datum: '2026-06-04', dienstartId: 'visite' as const };
    expect(visiteWochenendBlock.strafpunkte(feiertagsVisite, { zuweisungen: [] })).toBe(0);
    const vordergrundSa = { person: testPerson(), datum: '2026-06-13', dienstartId: 'vordergrund' as const };
    expect(visiteWochenendBlock.strafpunkte(vordergrundSa, { zuweisungen: [] })).toBe(0);
  });
});
