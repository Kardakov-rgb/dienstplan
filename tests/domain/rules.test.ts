import { describe, expect, it } from 'vitest';
import type { Person, Zuweisung } from '../../src/domain/types';
import { leereHaeufigkeiten } from '../../src/domain/person';
import { personAbwesend } from '../../src/domain/rules/personAbwesend';
import { dienstNichtErlaubt } from '../../src/domain/rules/dienstNichtErlaubt';
import { einDienstProTag } from '../../src/domain/rules/einDienstProTag';
import { maximumProMonat } from '../../src/domain/rules/maximumProMonat';
import { harteVerstoesse } from '../../src/domain/rules';

function testPerson(anpassen: Partial<Person> = {}): Person {
  const haeufigkeiten = leereHaeufigkeiten();
  haeufigkeiten.vordergrund = { soll: 2, maximum: 4 };
  haeufigkeiten.visite = { soll: 1, maximum: 2 };
  return {
    id: 'p1',
    vorname: 'Erika',
    nachname: 'Muster',
    aktiv: true,
    vollzeit: false,
    haeufigkeiten,
    abwesenheiten: [],
    ...anpassen,
  };
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

describe('Regel: person-abwesend', () => {
  const p = testPerson({
    abwesenheiten: [{ id: 'a1', typ: 'urlaub', von: '2026-06-08', bis: '2026-06-12' }],
  });

  it('meldet Verstoß während der Abwesenheit', () => {
    const v = personAbwesend.pruefe(
      { person: p, datum: '2026-06-10', dienstartId: 'vordergrund' },
      { zuweisungen: [] },
    );
    expect(v?.meldung).toContain('Urlaub');
  });

  it('kein Verstoß außerhalb der Abwesenheit', () => {
    const v = personAbwesend.pruefe(
      { person: p, datum: '2026-06-13', dienstartId: 'vordergrund' },
      { zuweisungen: [] },
    );
    expect(v).toBeNull();
  });
});

describe('Regel: dienst-nicht-erlaubt', () => {
  it('meldet Verstoß bei Maximum 0', () => {
    const v = dienstNichtErlaubt.pruefe(
      { person: testPerson(), datum: '2026-06-12', dienstartId: 'davinci' },
      { zuweisungen: [] },
    );
    expect(v?.meldung).toContain('Davincidienst');
  });

  it('kein Verstoß bei Maximum > 0', () => {
    const v = dienstNichtErlaubt.pruefe(
      { person: testPerson(), datum: '2026-06-10', dienstartId: 'vordergrund' },
      { zuweisungen: [] },
    );
    expect(v).toBeNull();
  });
});

describe('Regel: ein-dienst-pro-tag', () => {
  it('meldet Verstoß, wenn die Person am selben Tag schon einen Dienst hat', () => {
    const v = einDienstProTag.pruefe(
      { person: testPerson(), datum: '2026-06-13', dienstartId: 'visite' },
      { zuweisungen: [zuweisung({ datum: '2026-06-13', dienstartId: 'vordergrund' })] },
    );
    expect(v?.meldung).toContain('Vordergrund');
  });

  it('kein Verstoß bei Dienst an einem anderen Tag', () => {
    const v = einDienstProTag.pruefe(
      { person: testPerson(), datum: '2026-06-13', dienstartId: 'visite' },
      { zuweisungen: [zuweisung({ datum: '2026-06-12' })] },
    );
    expect(v).toBeNull();
  });

  it('kein Verstoß bei Dienst einer anderen Person am selben Tag', () => {
    const v = einDienstProTag.pruefe(
      { person: testPerson(), datum: '2026-06-13', dienstartId: 'visite' },
      { zuweisungen: [zuweisung({ datum: '2026-06-13', personId: 'p2' })] },
    );
    expect(v).toBeNull();
  });
});

describe('Regel: maximum-pro-monat', () => {
  const zweiVordergruende = [
    zuweisung({ datum: '2026-06-03' }),
    zuweisung({ datum: '2026-06-20' }),
  ];

  it('meldet Verstoß, wenn das Maximum erreicht ist', () => {
    const p = testPerson();
    p.haeufigkeiten.vordergrund = { soll: 1, maximum: 2 };
    const v = maximumProMonat.pruefe(
      { person: p, datum: '2026-06-10', dienstartId: 'vordergrund' },
      { zuweisungen: zweiVordergruende },
    );
    expect(v?.meldung).toContain('2/2');
  });

  it('kein Verstoß unterhalb des Maximums', () => {
    const v = maximumProMonat.pruefe(
      { person: testPerson(), datum: '2026-06-10', dienstartId: 'vordergrund' },
      { zuweisungen: zweiVordergruende },
    );
    expect(v).toBeNull();
  });

  it('zählt nur Zuweisungen desselben Monats', () => {
    const p = testPerson();
    p.haeufigkeiten.vordergrund = { soll: 1, maximum: 2 };
    const v = maximumProMonat.pruefe(
      { person: p, datum: '2026-06-10', dienstartId: 'vordergrund' },
      { zuweisungen: [zuweisung({ datum: '2026-05-03' }), zuweisung({ datum: '2026-07-20' })] },
    );
    expect(v).toBeNull();
  });

  it('zählt andere Dienstarten nicht mit', () => {
    const p = testPerson();
    p.haeufigkeiten.visite = { soll: 1, maximum: 1 };
    const v = maximumProMonat.pruefe(
      { person: p, datum: '2026-06-13', dienstartId: 'visite' },
      { zuweisungen: zweiVordergruende },
    );
    expect(v).toBeNull();
  });
});

describe('harteVerstoesse (Aggregation)', () => {
  it('sammelt mehrere Verstöße gleichzeitig', () => {
    const p = testPerson({
      abwesenheiten: [{ id: 'a1', typ: 'krank', von: '2026-06-12', bis: '2026-06-12' }],
    });
    const verstoesse = harteVerstoesse(
      { person: p, datum: '2026-06-12', dienstartId: 'davinci' },
      { zuweisungen: [zuweisung({ datum: '2026-06-12', dienstartId: 'vordergrund' })] },
    );
    const regeln = verstoesse.map((v) => v.regelId);
    expect(regeln).toContain('dienst-nicht-erlaubt');
    expect(regeln).toContain('person-abwesend');
    expect(regeln).toContain('ein-dienst-pro-tag');
  });

  it('liefert leeres Array für zulässige Kandidaten', () => {
    const verstoesse = harteVerstoesse(
      { person: testPerson(), datum: '2026-06-10', dienstartId: 'vordergrund' },
      { zuweisungen: [] },
    );
    expect(verstoesse).toEqual([]);
  });
});
