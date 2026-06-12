import type { Regel } from './types';
import { dienstart } from '../dienste';
import { zerlege } from '../datum';
import { zaehleDienste } from '../zaehlung';

/**
 * Die harte Monats-Obergrenze (Max) je Dienstart darf nicht überschritten
 * werden. Visite zählt in Einheiten (Sa+So-Block = 1): der Partnertag eines
 * bereits begonnenen Wochenendblocks erhöht den Zähler daher nicht.
 */
export const maximumProMonat: Regel = {
  id: 'maximum-pro-monat',
  beschreibung: 'Das Monats-Maximum je Dienstart wird nie überschritten.',
  typ: 'hart',
  gewicht: 0,
  pruefe({ person, datum, dienstartId }, { zuweisungen }) {
    const maximum = person.haeufigkeiten[dienstartId]?.maximum ?? 0;
    const { jahr, monat } = zerlege(datum);
    const bisher = zaehleDienste(person.id, dienstartId, zuweisungen, { jahr, monat });
    const nachher = zaehleDienste(
      person.id,
      dienstartId,
      [...zuweisungen, { id: 'kandidat', datum, dienstartId, personId: person.id, fixiert: false }],
      { jahr, monat },
    );
    if (nachher <= Math.max(maximum, bisher)) return null;
    return {
      regelId: 'maximum-pro-monat',
      meldung: `Monats-Maximum für ${dienstart(dienstartId).name} erreicht (${bisher}/${maximum})`,
    };
  },
};
