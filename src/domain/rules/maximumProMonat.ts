import type { Regel } from './types';
import { dienstart } from '../dienste';
import { imMonat, zerlege } from '../datum';

/** Die harte Monats-Obergrenze (Max) je Dienstart darf nicht überschritten werden. */
export const maximumProMonat: Regel = {
  id: 'maximum-pro-monat',
  beschreibung: 'Das Monats-Maximum je Dienstart wird nie überschritten.',
  typ: 'hart',
  gewicht: 0,
  pruefe({ person, datum, dienstartId }, { zuweisungen }) {
    const maximum = person.haeufigkeiten[dienstartId]?.maximum ?? 0;
    const { jahr, monat } = zerlege(datum);
    const bisher = zuweisungen.filter(
      (z) =>
        z.personId === person.id && z.dienstartId === dienstartId && imMonat(z.datum, jahr, monat),
    ).length;
    if (bisher < maximum) return null;
    return {
      regelId: 'maximum-pro-monat',
      meldung: `Monats-Maximum für ${dienstart(dienstartId).name} erreicht (${bisher}/${maximum})`,
    };
  },
};
