import type { Regel } from './types';
import { dienstart } from '../dienste';

/** Dienste sind nicht kombinierbar: maximal ein Dienst pro Person und Tag. */
export const einDienstProTag: Regel = {
  id: 'ein-dienst-pro-tag',
  beschreibung: 'Eine Person hat höchstens einen Dienst pro Tag.',
  typ: 'hart',
  gewicht: 0,
  pruefe({ person, datum }, { zuweisungen }) {
    const vorhandener = zuweisungen.find((z) => z.personId === person.id && z.datum === datum);
    if (!vorhandener) return null;
    return {
      regelId: 'ein-dienst-pro-tag',
      meldung: `Hat an diesem Tag bereits einen Dienst (${dienstart(vorhandener.dienstartId).name})`,
    };
  },
};
