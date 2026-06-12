import type { BewertungsRegel } from './types';
import type { Zuweisung } from '../types';
import { imMonat, wochentag, zerlege } from '../datum';

const FREITAG = 5;
const SAMSTAG = 6;
const SONNTAG = 0;

/** Wie viele Monate rückwärts nach dem zuletzt erfüllten Muster gesucht wird. */
const RUECKBLICK_MONATE = 12;

/**
 * Wochenend-Muster eines Monats:
 * A = Vordergrund an einem Freitag UND einem Sonntag (verschiedene Wochenenden),
 * B = Vordergrund an einem Samstag (+ ggf. Visite bei Bedarf).
 */
type Muster = 'A' | 'B';

function musterImMonat(
  personId: string,
  jahr: number,
  monat: number,
  zuweisungen: Zuweisung[],
): Muster | null {
  const wochenendVG = zuweisungen.filter(
    (z) =>
      z.personId === personId &&
      z.dienstartId === 'vordergrund' &&
      imMonat(z.datum, jahr, monat) &&
      [FREITAG, SAMSTAG, SONNTAG].includes(wochentag(z.datum)),
  );
  if (wochenendVG.length === 0) return null;
  return wochenendVG.some((z) => wochentag(z.datum) === SAMSTAG) ? 'B' : 'A';
}

/**
 * Erwartetes Muster: das Gegenteil des zuletzt tatsächlich erfüllten.
 * Monate ohne Wochenend-VG (z.B. Urlaub) VERSCHIEBEN das Muster, statt es
 * zu wechseln — es wird so lange zurückgeschaut, bis ein Muster gefunden ist.
 */
function erwartetesMuster(
  personId: string,
  jahr: number,
  monat: number,
  zuweisungen: Zuweisung[],
): Muster | null {
  let j = jahr;
  let m = monat;
  for (let i = 0; i < RUECKBLICK_MONATE; i++) {
    m -= 1;
    if (m < 1) {
      m = 12;
      j -= 1;
    }
    const muster = musterImMonat(personId, j, m, zuweisungen);
    if (muster) return muster === 'A' ? 'B' : 'A';
  }
  return null;
}

/**
 * Vollzeitkräfte wechseln monatlich zwischen Muster A (VG Freitag + Sonntag,
 * je einmal pro Monat) und Muster B (VG Samstag, einmal pro Monat).
 * Bestraft Muster-fremde Tage sowie ein zweites Fr/Sa/So desselben Musters.
 */
export const vollzeitWechsel: BewertungsRegel = {
  id: 'vollzeit-wechsel',
  beschreibung:
    'Vollzeitkräfte: monatlicher Wechsel zwischen VG Freitag+Sonntag und VG Samstag.',
  gewicht: 12,
  strafpunkte({ person, datum, dienstartId }, { zuweisungen }) {
    if (!person.vollzeit || dienstartId !== 'vordergrund') return 0;
    const wt = wochentag(datum);
    if (![FREITAG, SAMSTAG, SONNTAG].includes(wt)) return 0;

    const { jahr, monat } = zerlege(datum);
    // Ohne Historie zählt das, was im laufenden Monat schon begonnen wurde.
    const muster =
      erwartetesMuster(person.id, jahr, monat, zuweisungen) ??
      musterImMonat(person.id, jahr, monat, zuweisungen);

    const tageImMonat = (wochentage: number[]) =>
      zuweisungen.filter(
        (z) =>
          z.personId === person.id &&
          z.dienstartId === 'vordergrund' &&
          imMonat(z.datum, jahr, monat) &&
          wochentage.includes(wochentag(z.datum)),
      ).length;

    if (muster === 'A') {
      if (wt === SAMSTAG) return 1;
      // Je ein Freitag und ein Sonntag — der zweite gleiche Tag kostet.
      return tageImMonat([wt]) >= 1 ? 1 : 0;
    }
    if (muster === 'B') {
      if (wt !== SAMSTAG) return 1;
      return tageImMonat([SAMSTAG]) >= 1 ? 1 : 0;
    }
    return 0;
  },
};
