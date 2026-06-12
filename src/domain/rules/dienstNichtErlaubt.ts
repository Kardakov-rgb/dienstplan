import type { Regel } from './types';
import { darfDienst } from '../person';
import { dienstart } from '../dienste';

/** Maximum 0 bedeutet: Person macht diese Dienstart grundsätzlich nicht. */
export const dienstNichtErlaubt: Regel = {
  id: 'dienst-nicht-erlaubt',
  beschreibung: 'Personen machen nur Dienstarten mit Maximum > 0.',
  typ: 'hart',
  gewicht: 0,
  pruefe({ person, dienstartId }) {
    if (darfDienst(person, dienstartId)) return null;
    return {
      regelId: 'dienst-nicht-erlaubt',
      meldung: `Macht keinen ${dienstart(dienstartId).name} (Max 0)`,
    };
  },
};
