import type { Regel } from './types';
import { abwesenheitAm, abwesenheitsLabel } from '../person';
import { formatDatum } from '../datum';

/** Eine abwesende Person (Urlaub, Krank, …) darf an dem Tag keinen Dienst bekommen. */
export const personAbwesend: Regel = {
  id: 'person-abwesend',
  beschreibung: 'Abwesende Personen werden nicht eingeplant.',
  typ: 'hart',
  gewicht: 0,
  pruefe({ person, datum }) {
    const a = abwesenheitAm(person, datum);
    if (!a) return null;
    return {
      regelId: 'person-abwesend',
      meldung: `Abwesend: ${abwesenheitsLabel(a.typ)} (${formatDatum(a.von)} – ${formatDatum(a.bis)})`,
    };
  },
};
