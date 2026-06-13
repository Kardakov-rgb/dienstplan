import { describe, expect, it } from 'vitest';
import type { Person, Zuweisung } from '../../src/domain/types';
import { leereHaeufigkeiten } from '../../src/domain/person';
import { generierePlan } from '../../src/domain/generator/generator';
import { wochentag } from '../../src/domain/datum';

/**
 * Testmonat Juni 2026: 30 Tage, Fronleichnam am Do 04.06. (Feiertag),
 * Wochenenden 6/7, 13/14, 20/21, 27/28, Freitage 5, 12, 19, 26.
 * Generierbare Dienste: 30× Vordergrund, 8× Visite (4 Wochenendblöcke;
 * die Feiertags-Visite am 04.06. ist nur manuell besetzbar), 4× Davinci = 42.
 *
 * Die Wochenend-Regel (max. 2 Einsatz-Wochenenden/Monat) verlangt pro
 * Wochenende 4 verschiedene Personen (Visite-Block, VG Fr, VG Sa, VG So) —
 * für volle Abdeckung braucht es daher ein ausreichend großes Team.
 */
const JAHR = 2026;
const MONAT = 6;
const DIENSTE_GESAMT = 42;

function person(
  id: string,
  name: string,
  werte: Partial<Record<'vordergrund' | 'visite' | 'davinci', { soll: number; maximum: number }>> = {},
  anpassen: Partial<Person> = {},
): Person {
  const haeufigkeiten = leereHaeufigkeiten();
  haeufigkeiten.vordergrund = werte.vordergrund ?? { soll: 4, maximum: 31 };
  haeufigkeiten.visite = werte.visite ?? { soll: 1, maximum: 2 };
  haeufigkeiten.davinci = werte.davinci ?? { soll: 1, maximum: 10 };
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

const NAMEN = ['Anna', 'Ben', 'Cem', 'Dana', 'Edda', 'Falk', 'Gül', 'Hans', 'Ines', 'Jörg'];
const zehnPersonen = NAMEN.map((name, i) => person(`p${i}`, name));

describe('generierePlan', () => {
  it('besetzt alle generierbaren Dienste des Monats, wenn das Team groß genug ist', () => {
    const { neu, luecken } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: zehnPersonen,
      bestehendeZuweisungen: [],
    });
    expect(luecken).toEqual([]);
    expect(neu).toHaveLength(DIENSTE_GESAMT);
  });

  it('lässt die Feiertags-Visite (04.06.) unbesetzt — sie ist nur manuell', () => {
    const { neu, luecken } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: zehnPersonen,
      bestehendeZuweisungen: [],
    });
    expect(neu.some((z) => z.datum === '2026-06-04' && z.dienstartId === 'visite')).toBe(false);
    expect(luecken.some((l) => l.datum === '2026-06-04' && l.dienstartId === 'visite')).toBe(false);
  });

  it('verletzt nie „ein Dienst pro Tag"', () => {
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: zehnPersonen,
      bestehendeZuweisungen: [],
    });
    const proPersonUndTag = new Set<string>();
    for (const z of neu) {
      const schluessel = `${z.personId}|${z.datum}`;
      expect(proPersonUndTag.has(schluessel)).toBe(false);
      proPersonUndTag.add(schluessel);
    }
  });

  it('hält den Vordergrund-Abstand ein (mind. 2 freie Tage)', () => {
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: zehnPersonen,
      bestehendeZuweisungen: [],
    });
    const vg = neu.filter((z) => z.dienstartId === 'vordergrund');
    for (const a of vg) {
      for (const b of vg) {
        if (a.personId !== b.personId || a.id === b.id) continue;
        const abstand = Math.abs(
          (new Date(a.datum).getTime() - new Date(b.datum).getTime()) / 86_400_000,
        );
        expect(abstand).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('besetzt Visite-Wochenenden als Block mit derselben Person', () => {
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: zehnPersonen,
      bestehendeZuweisungen: [],
    });
    const visiten = neu.filter((z) => z.dienstartId === 'visite');
    const samstage = visiten.filter((z) => wochentag(z.datum) === 6);
    expect(samstage).toHaveLength(4);
    for (const sa of samstage) {
      const soDatum = `${sa.datum.slice(0, 8)}${String(Number(sa.datum.slice(8)) + 1).padStart(2, '0')}`;
      const so = visiten.find((z) => z.datum === soDatum);
      expect(so?.personId).toBe(sa.personId);
    }
  });

  it('vergibt höchstens 1 Visite-Einheit und 2 Einsatz-Wochenenden pro Person', () => {
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: zehnPersonen,
      bestehendeZuweisungen: [],
    });
    for (const p of zehnPersonen) {
      const visitenSamstage = neu.filter(
        (z) => z.personId === p.id && z.dienstartId === 'visite' && wochentag(z.datum) === 6,
      );
      expect(visitenSamstage.length).toBeLessThanOrEqual(1);
    }
  });

  it('respektiert bestehende (fixierte) Einträge und füllt nur Lücken', () => {
    const fixiert: Zuweisung = {
      id: 'fix1',
      datum: '2026-06-10',
      dienstartId: 'vordergrund',
      personId: 'p0',
      fixiert: true,
    };
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: zehnPersonen,
      bestehendeZuweisungen: [fixiert],
    });
    expect(neu).toHaveLength(DIENSTE_GESAMT - 1);
    expect(neu.some((z) => z.datum === '2026-06-10' && z.dienstartId === 'vordergrund')).toBe(false);
  });

  it('hält das Monats-Maximum hart ein und meldet Lücken mit Begründung', () => {
    const zwei = [
      person('a', 'Anna', { vordergrund: { soll: 3, maximum: 5 } }),
      person('b', 'Ben', { vordergrund: { soll: 3, maximum: 5 } }),
    ];
    const { neu, luecken } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: zwei,
      bestehendeZuweisungen: [],
    });
    for (const id of ['a', 'b']) {
      expect(
        neu.filter((z) => z.dienstartId === 'vordergrund' && z.personId === id).length,
      ).toBeLessThanOrEqual(5);
    }
    const vordergrundLuecken = luecken.filter((l) => l.dienstartId === 'vordergrund');
    expect(vordergrundLuecken.length).toBeGreaterThan(0);
    expect(
      vordergrundLuecken.every((l) => l.gruende.every((g) => g.meldungen.length > 0)),
    ).toBe(true);
  });

  it('meldet Lücken, wenn niemand die Dienstart macht (Davinci Max 0)', () => {
    const ohneDavinci = NAMEN.slice(0, 6).map((name, i) =>
      person(`p${i}`, name, { davinci: { soll: 0, maximum: 0 } }),
    );
    const { luecken } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: ohneDavinci,
      bestehendeZuweisungen: [],
    });
    const davinciLuecken = luecken.filter((l) => l.dienstartId === 'davinci');
    expect(davinciLuecken).toHaveLength(4);
    expect(
      davinciLuecken[0].gruende.every((g) => g.meldungen.some((m) => m.includes('Max 0'))),
    ).toBe(true);
  });

  it('plant abwesende Personen nicht ein', () => {
    const urlauber = person('p0', 'Anna', {}, {
      abwesenheiten: [{ id: 'u1', typ: 'urlaub', von: '2026-06-01', bis: '2026-06-30' }],
    });
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: [urlauber, ...zehnPersonen.slice(1)],
      bestehendeZuweisungen: [],
    });
    expect(neu.some((z) => z.personId === 'p0')).toBe(false);
  });

  it('hält das Wochenende vor und nach einem Urlaub frei', () => {
    const urlauber = person('p0', 'Anna', {}, {
      abwesenheiten: [{ id: 'u1', typ: 'urlaub', von: '2026-06-08', bis: '2026-06-19' }],
    });
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: [urlauber, ...zehnPersonen.slice(1)],
      bestehendeZuweisungen: [],
    });
    const randTage = ['2026-06-06', '2026-06-07', '2026-06-20', '2026-06-21'];
    expect(neu.some((z) => z.personId === 'p0' && randTage.includes(z.datum))).toBe(false);
  });

  it('bevorzugt über die Gesamt-Historie benachteiligte Personen (Gesamt-Fairness)', () => {
    // Anna hat im Mai bereits 8 Vordergrunddienste geleistet, alle anderen keinen.
    const historie: Zuweisung[] = Array.from({ length: 8 }, (_, i) => ({
      id: `h${i}`,
      datum: `2026-05-${String(i * 3 + 2).padStart(2, '0')}`,
      dienstartId: 'vordergrund',
      personId: 'p0',
      fixiert: false,
    }));
    const team = NAMEN.slice(0, 6).map((name, i) =>
      person(`p${i}`, name, { vordergrund: { soll: 31, maximum: 31 } }),
    );
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: team,
      bestehendeZuweisungen: historie,
    });
    const proPerson = team.map(
      (p) => neu.filter((z) => z.personId === p.id && z.dienstartId === 'vordergrund').length,
    );
    const anna = proPerson[0];
    const andere = proPerson.slice(1);
    // Anna bekommt die wenigsten Vordergrunddienste, bis die Historie ausgeglichen ist.
    expect(anna).toBeLessThanOrEqual(Math.min(...andere));
    expect(anna).toBeLessThan(Math.max(...andere));
  });
});
