import { describe, expect, it } from 'vitest';
import type { Person, Zuweisung } from '../../src/domain/types';
import { leereHaeufigkeiten } from '../../src/domain/person';
import { dienstart, istGenerierbar } from '../../src/domain/dienste';
import { visiteEinheit, zaehleDienste } from '../../src/domain/zaehlung';
import { vordergrundAbstand } from '../../src/domain/rules/vordergrundAbstand';
import { urlaubsRandWochenende } from '../../src/domain/rules/urlaubsRandWochenende';
import { maxZweiWochenenden } from '../../src/domain/rules/maxZweiWochenenden';
import { maxEineVisiteProMonat } from '../../src/domain/rules/maxEineVisiteProMonat';
import { maximumProMonat } from '../../src/domain/rules/maximumProMonat';
import { visiteRandtage } from '../../src/domain/rules/visiteRandtage';

// Juni 2026: Fronleichnam Do 04.06., Wochenenden 6/7, 13/14, 20/21, 27/28.

function testPerson(anpassen: Partial<Person> = {}): Person {
  const haeufigkeiten = leereHaeufigkeiten();
  haeufigkeiten.vordergrund = { soll: 4, maximum: 10 };
  haeufigkeiten.visite = { soll: 1, maximum: 2 };
  haeufigkeiten.davinci = { soll: 1, maximum: 4 };
  return {
    id: 'p1',
    name: 'Erika Muster',
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
    personId: 'p1',
    fixiert: false,
    ...teil,
  };
}

describe('Visite-Einheiten (Zählung)', () => {
  it('Sa und So desselben Wochenendes bilden eine Einheit', () => {
    expect(visiteEinheit('2026-06-13')).toBe('2026-06-13');
    expect(visiteEinheit('2026-06-14')).toBe('2026-06-13');
  });

  it('eine Feiertags-Visite ist ihre eigene Einheit', () => {
    expect(visiteEinheit('2026-06-04')).toBe('2026-06-04');
  });

  it('zaehleDienste zählt den Sa+So-Block als EINEN Visitendienst', () => {
    const wochenende = [
      z({ datum: '2026-06-13', dienstartId: 'visite' }),
      z({ datum: '2026-06-14', dienstartId: 'visite' }),
    ];
    expect(zaehleDienste('p1', 'visite', wochenende)).toBe(1);
    expect(zaehleDienste('p1', 'vordergrund', wochenende)).toBe(0);
  });
});

describe('Regel: vordergrund-abstand (mind. 2 freie Tage)', () => {
  it.each([
    ['2026-06-11', 'direkt am Folgetag'],
    ['2026-06-12', 'nur 1 freier Tag dazwischen'],
    ['2026-06-08', '1 freier Tag davor'],
  ])('Verstoß bei bestehendem VG am %s (%s)', (bestehend) => {
    const v = vordergrundAbstand.pruefe(
      { person: testPerson(), datum: '2026-06-10', dienstartId: 'vordergrund' },
      { zuweisungen: [z({ datum: bestehend })] },
    );
    expect(v?.meldung).toContain('mind. 2 freie Tage');
  });

  it('kein Verstoß ab 2 freien Tagen Abstand (X und X+3)', () => {
    const v = vordergrundAbstand.pruefe(
      { person: testPerson(), datum: '2026-06-10', dienstartId: 'vordergrund' },
      { zuweisungen: [z({ datum: '2026-06-13' })] },
    );
    expect(v).toBeNull();
  });

  it('gilt nur zwischen Vordergrunddiensten', () => {
    const v = vordergrundAbstand.pruefe(
      { person: testPerson(), datum: '2026-06-10', dienstartId: 'vordergrund' },
      { zuweisungen: [z({ datum: '2026-06-11', dienstartId: 'davinci' })] },
    );
    expect(v).toBeNull();
  });
});

describe('Regel: urlaubs-rand-wochenende', () => {
  const p = testPerson({
    abwesenheiten: [{ id: 'u1', typ: 'urlaub', von: '2026-06-08', bis: '2026-06-19' }],
  });

  it.each([
    ['2026-06-06', 'Samstag vor dem Urlaub'],
    ['2026-06-07', 'Sonntag vor dem Urlaub'],
    ['2026-06-20', 'Samstag nach dem Urlaub'],
    ['2026-06-21', 'Sonntag nach dem Urlaub'],
  ])('Verstoß am %s (%s)', (datum) => {
    const v = urlaubsRandWochenende.pruefe(
      { person: p, datum, dienstartId: 'vordergrund' },
      { zuweisungen: [] },
    );
    expect(v?.meldung).toContain('Urlaub');
  });

  it('kein Verstoß an weiter entfernten Wochenenden oder Wochentagen', () => {
    for (const datum of ['2026-06-27', '2026-06-28', '2026-06-05', '2026-06-22']) {
      expect(
        urlaubsRandWochenende.pruefe(
          { person: p, datum, dienstartId: 'vordergrund' },
          { zuweisungen: [] },
        ),
      ).toBeNull();
    }
  });

  it('gilt nicht für andere Abwesenheitstypen (z.B. krank)', () => {
    const krank = testPerson({
      abwesenheiten: [{ id: 'k1', typ: 'krank', von: '2026-06-08', bis: '2026-06-19' }],
    });
    expect(
      urlaubsRandWochenende.pruefe(
        { person: krank, datum: '2026-06-06', dienstartId: 'vordergrund' },
        { zuweisungen: [] },
      ),
    ).toBeNull();
  });
});

describe('Regel: max-zwei-wochenenden', () => {
  // Zwei Einsatz-Wochenenden: VG am Sa 06.06. und Visite am 13./14.06.
  const bestehende = [
    z({ datum: '2026-06-06' }),
    z({ datum: '2026-06-13', dienstartId: 'visite' }),
    z({ datum: '2026-06-14', dienstartId: 'visite' }),
  ];

  it('Verstoß beim dritten Wochenende (auch via VG am Freitag)', () => {
    const v = maxZweiWochenenden.pruefe(
      { person: testPerson(), datum: '2026-06-19', dienstartId: 'vordergrund' },
      { zuweisungen: bestehende },
    );
    expect(v?.meldung).toContain('2 Wochenenden');
  });

  it('kein Verstoß am bereits gezählten Wochenende', () => {
    const v = maxZweiWochenenden.pruefe(
      { person: testPerson(), datum: '2026-06-07', dienstartId: 'vordergrund' },
      { zuweisungen: bestehende },
    );
    expect(v).toBeNull();
  });

  it('Wochentags-VG und Davinci am Freitag zählen nicht als Wochenende', () => {
    expect(
      maxZweiWochenenden.pruefe(
        { person: testPerson(), datum: '2026-06-17', dienstartId: 'vordergrund' },
        { zuweisungen: bestehende },
      ),
    ).toBeNull();
    expect(
      maxZweiWochenenden.pruefe(
        { person: testPerson(), datum: '2026-06-19', dienstartId: 'davinci' },
        { zuweisungen: bestehende },
      ),
    ).toBeNull();
  });
});

describe('Regel: max-eine-visite-pro-monat', () => {
  const wochenendVisite = [
    z({ datum: '2026-06-06', dienstartId: 'visite' }),
    z({ datum: '2026-06-07', dienstartId: 'visite' }),
  ];

  it('Verstoß bei zweiter Visite-Einheit im Monat', () => {
    const v = maxEineVisiteProMonat.pruefe(
      { person: testPerson(), datum: '2026-06-13', dienstartId: 'visite' },
      { zuweisungen: wochenendVisite },
    );
    expect(v?.meldung).toContain('bereits einen Visitendienst');
  });

  it('kein Verstoß beim Partnertag derselben Einheit', () => {
    const v = maxEineVisiteProMonat.pruefe(
      { person: testPerson(), datum: '2026-06-07', dienstartId: 'visite' },
      { zuweisungen: [z({ datum: '2026-06-06', dienstartId: 'visite' })] },
    );
    expect(v).toBeNull();
  });

  it('kein Verstoß in einem anderen Monat', () => {
    const v = maxEineVisiteProMonat.pruefe(
      { person: testPerson(), datum: '2026-07-04', dienstartId: 'visite' },
      { zuweisungen: wochenendVisite },
    );
    expect(v).toBeNull();
  });
});

describe('maximum-pro-monat zählt Visite in Einheiten', () => {
  it('Partnertag eines Blocks verletzt das Maximum 1 nicht', () => {
    const p = testPerson();
    p.haeufigkeiten.visite = { soll: 1, maximum: 1 };
    const v = maximumProMonat.pruefe(
      { person: p, datum: '2026-06-07', dienstartId: 'visite' },
      { zuweisungen: [z({ datum: '2026-06-06', dienstartId: 'visite' })] },
    );
    expect(v).toBeNull();
  });

  it('eine zweite Einheit verletzt das Maximum 1', () => {
    const p = testPerson();
    p.haeufigkeiten.visite = { soll: 1, maximum: 1 };
    const v = maximumProMonat.pruefe(
      { person: p, datum: '2026-06-13', dienstartId: 'visite' },
      {
        zuweisungen: [
          z({ datum: '2026-06-06', dienstartId: 'visite' }),
          z({ datum: '2026-06-07', dienstartId: 'visite' }),
        ],
      },
    );
    expect(v?.meldung).toContain('Monats-Maximum');
  });
});

describe('weiche Regel: visite-randtage', () => {
  const visiteWE = [
    z({ datum: '2026-06-13', dienstartId: 'visite' }),
    z({ datum: '2026-06-14', dienstartId: 'visite' }),
  ];

  it.each([
    ['2026-06-12', 'vordergrund', 'VG am Freitag davor'],
    ['2026-06-12', 'davinci', 'Davinci am Freitag davor'],
    ['2026-06-15', 'vordergrund', 'VG am Montag danach'],
  ] as const)('Strafpunkte für %s %s (%s)', (datum, dienstartId, _begruendung) => {
    expect(
      visiteRandtage.strafpunkte(
        { person: testPerson(), datum, dienstartId },
        { zuweisungen: visiteWE },
      ),
    ).toBe(1);
  });

  it('keine Strafpunkte ab Dienstag bzw. ohne Visite am Wochenende', () => {
    expect(
      visiteRandtage.strafpunkte(
        { person: testPerson(), datum: '2026-06-16', dienstartId: 'vordergrund' },
        { zuweisungen: visiteWE },
      ),
    ).toBe(0);
    expect(
      visiteRandtage.strafpunkte(
        { person: testPerson(), datum: '2026-06-12', dienstartId: 'vordergrund' },
        { zuweisungen: [] },
      ),
    ).toBe(0);
  });

  it('wirkt auch umgekehrt: Visite-Kandidat mit bestehendem VG am Freitag', () => {
    expect(
      visiteRandtage.strafpunkte(
        { person: testPerson(), datum: '2026-06-13', dienstartId: 'visite' },
        { zuweisungen: [z({ datum: '2026-06-12' })] },
      ),
    ).toBe(1);
  });
});

describe('Feiertags-Visite ist nicht generierbar, aber manuell möglich', () => {
  const visite = dienstart('visite');

  it('Fronleichnam (Do 04.06.2026): Zelle offen, Generator tabu', () => {
    expect(visite.findetStattAm('2026-06-04')).toBe(true);
    expect(istGenerierbar(visite, '2026-06-04')).toBe(false);
  });

  it('normales Wochenende und Feiertag auf Samstag bleiben generierbar', () => {
    expect(istGenerierbar(visite, '2026-06-13')).toBe(true);
    // 2. Weihnachtstag 2026 fällt auf einen Samstag.
    expect(istGenerierbar(visite, '2026-12-26')).toBe(true);
  });

  it('Vordergrund bleibt an Feiertagen generierbar', () => {
    expect(istGenerierbar(dienstart('vordergrund'), '2026-06-04')).toBe(true);
  });
});
