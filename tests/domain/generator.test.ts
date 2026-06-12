import { describe, expect, it } from 'vitest';
import type { Person, Zuweisung } from '../../src/domain/types';
import { leereHaeufigkeiten } from '../../src/domain/person';
import { generierePlan } from '../../src/domain/generator/generator';
import { wochentag } from '../../src/domain/datum';

/**
 * Testmonat Juni 2026: 30 Tage, Fronleichnam am Do 04.06. (Feiertag),
 * Wochenenden 6/7, 13/14, 20/21, 27/28, Freitage 5, 12, 19, 26.
 * Erwartete Slots: 30× Vordergrund, 9× Visite (8 Wochenendtage + Feiertag),
 * 4× Davinci = 43 Dienste.
 */
const JAHR = 2026;
const MONAT = 6;
const DIENSTE_GESAMT = 43;

function person(
  id: string,
  name: string,
  werte: Partial<Record<'vordergrund' | 'visite' | 'davinci', { soll: number; maximum: number }>> = {},
  anpassen: Partial<Person> = {},
): Person {
  const haeufigkeiten = leereHaeufigkeiten();
  haeufigkeiten.vordergrund = werte.vordergrund ?? { soll: 8, maximum: 31 };
  haeufigkeiten.visite = werte.visite ?? { soll: 2, maximum: 10 };
  haeufigkeiten.davinci = werte.davinci ?? { soll: 1, maximum: 10 };
  return {
    id,
    vorname: name,
    nachname: 'Test',
    aktiv: true,
    haeufigkeiten,
    abwesenheiten: [],
    ...anpassen,
  };
}

const vierPersonen = [person('a', 'Anna'), person('b', 'Ben'), person('c', 'Cem'), person('d', 'Dana')];

describe('generierePlan', () => {
  it('besetzt alle Dienste des Monats, wenn genug Personen da sind', () => {
    const { neu, luecken } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: vierPersonen,
      bestehendeZuweisungen: [],
    });
    expect(luecken).toEqual([]);
    expect(neu).toHaveLength(DIENSTE_GESAMT);
  });

  it('verletzt nie „ein Dienst pro Tag"', () => {
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: vierPersonen,
      bestehendeZuweisungen: [],
    });
    const proPersonUndTag = new Set<string>();
    for (const z of neu) {
      const schluessel = `${z.personId}|${z.datum}`;
      expect(proPersonUndTag.has(schluessel)).toBe(false);
      proPersonUndTag.add(schluessel);
    }
  });

  it('besetzt Visite-Wochenenden als Block mit derselben Person', () => {
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: vierPersonen,
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

  it('respektiert bestehende (fixierte) Einträge und füllt nur Lücken', () => {
    const fixiert: Zuweisung = {
      id: 'fix1',
      datum: '2026-06-10',
      dienstartId: 'vordergrund',
      personId: 'a',
      fixiert: true,
    };
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: vierPersonen,
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
    const vordergruende = neu.filter((z) => z.dienstartId === 'vordergrund');
    expect(vordergruende).toHaveLength(10); // 2 × Max 5
    for (const id of ['a', 'b']) {
      expect(vordergruende.filter((z) => z.personId === id).length).toBeLessThanOrEqual(5);
    }
    const vordergrundLuecken = luecken.filter((l) => l.dienstartId === 'vordergrund');
    expect(vordergrundLuecken).toHaveLength(20);
    expect(
      vordergrundLuecken[0].gruende.every((g) =>
        g.meldungen.some((m) => m.includes('Monats-Maximum')),
      ),
    ).toBe(true);
  });

  it('meldet Lücken, wenn niemand die Dienstart macht (Davinci Max 0)', () => {
    const ohneDavinci = [
      person('a', 'Anna', { davinci: { soll: 0, maximum: 0 } }),
      person('b', 'Ben', { davinci: { soll: 0, maximum: 0 } }),
    ];
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
    const urlauber = person('a', 'Anna', {}, {
      abwesenheiten: [{ id: 'u1', typ: 'urlaub', von: '2026-06-01', bis: '2026-06-30' }],
    });
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: [urlauber, person('b', 'Ben'), person('c', 'Cem')],
      bestehendeZuweisungen: [],
    });
    expect(neu.some((z) => z.personId === 'a')).toBe(false);
  });

  it('bevorzugt über die Gesamt-Historie benachteiligte Personen (Gesamt-Fairness)', () => {
    // Anna hat im Mai bereits 8 Vordergrunddienste geleistet, Ben keinen.
    const historie: Zuweisung[] = Array.from({ length: 8 }, (_, i) => ({
      id: `h${i}`,
      datum: `2026-05-${String(i + 2).padStart(2, '0')}`,
      dienstartId: 'vordergrund',
      personId: 'a',
      fixiert: false,
    }));
    // Soll = 31 nimmt den Soll-Druck aus dem Vergleich, damit allein die
    // Gesamt-Fairness sichtbar wird (die Abstands-Regel dämpft den Ausgleich
    // bewusst: niemand soll zum Aufholen viele Tage am Stück arbeiten).
    const zwei = [
      person('a', 'Anna', { vordergrund: { soll: 31, maximum: 31 } }),
      person('b', 'Ben', { vordergrund: { soll: 31, maximum: 31 } }),
    ];
    const { neu } = generierePlan({
      jahr: JAHR,
      monat: MONAT,
      personen: zwei,
      bestehendeZuweisungen: historie,
    });
    const vordergruende = neu.filter((z) => z.dienstartId === 'vordergrund');
    const anna = vordergruende.filter((z) => z.personId === 'a').length;
    const ben = vordergruende.filter((z) => z.personId === 'b').length;
    expect(ben).toBeGreaterThan(anna);
    // Annas Mai-Vorsprung (8) wird zu großen Teilen ausgeglichen.
    expect(ben - anna).toBeGreaterThanOrEqual(4);
  });
});
