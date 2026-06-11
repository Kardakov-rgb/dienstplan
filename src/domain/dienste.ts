/**
 * Zentrale Konfiguration der Dienstarten.
 * Neue Dienstarten oder geänderte Stattfinde-Logik werden NUR hier gepflegt —
 * Plan-Ansicht, Generator und Statistik lesen alle aus dieser Datei.
 */
import type { DienstartId, ISODate } from './types';
import { wochentag } from './datum';
import { istFeiertag } from './feiertage';

export interface Dienstart {
  id: DienstartId;
  name: string;
  /** Kurzbeschreibung für Tooltips/Legende. */
  beschreibung: string;
  /** CSS-Farbklasse für die Darstellung im Plan. */
  farbKlasse: string;
  /** Findet der Dienst an diesem Kalendertag statt? */
  findetStattAm(datum: ISODate): boolean;
}

const SAMSTAG = 6;
const SONNTAG = 0;
const FREITAG = 5;

export const DIENSTARTEN: readonly Dienstart[] = [
  {
    id: 'vordergrund',
    name: 'Vordergrund',
    beschreibung: '24-Stunden-Dienst, findet an jedem Tag statt.',
    farbKlasse: 'dienst-vordergrund',
    findetStattAm: () => true,
  },
  {
    id: 'visite',
    name: 'Visitendienst',
    beschreibung:
      'Samstags, sonntags und an Feiertagen. Sa+So übernimmt im Normalfall dieselbe Person.',
    farbKlasse: 'dienst-visite',
    findetStattAm: (datum) => {
      const wt = wochentag(datum);
      return wt === SAMSTAG || wt === SONNTAG || istFeiertag(datum);
    },
  },
  {
    id: 'davinci',
    name: 'Davincidienst',
    beschreibung: 'Nur freitags; entfällt, wenn der Freitag ein Feiertag ist.',
    farbKlasse: 'dienst-davinci',
    findetStattAm: (datum) => wochentag(datum) === FREITAG && !istFeiertag(datum),
  },
] as const;

export function dienstart(id: DienstartId): Dienstart {
  const gefunden = DIENSTARTEN.find((d) => d.id === id);
  if (!gefunden) throw new Error(`Unbekannte Dienstart: ${id}`);
  return gefunden;
}
