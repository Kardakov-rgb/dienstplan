/**
 * Reine Abbildung zwischen Domänenobjekten und der Zell-Matrix der
 * Klinik-Vorlage (ein Workbook = ein Jahr, 12 Monatsblätter).
 *
 * Bewusst frei von der xlsx-Bibliothek: hier nur String-/Datums-Logik,
 * damit die Abbildung ohne Datei-I/O testbar bleibt. Das Lesen/Schreiben
 * echter .xlsx-Dateien übernimmt der Adapter (xlsxAdapter.ts).
 *
 * Spaltenlayout je Blatt:
 *   A = Datum (ISO-String in der Matrix), B = Vordergrund, C = Visitendienst,
 *   D = DaVinci, E = Hintergrund (ignoriert), F = Urlaub/FoBi, G = Kann nicht.
 */
import type { Abwesenheit, AbwesenheitsTyp, DienstartId, ISODate, Person, Zuweisung } from '../../domain/types';
import { MONATS_NAMEN, addiereTage, monatsTage, zerlege } from '../../domain/datum';

/** Eine Tabellenzeile; Zelle A enthält ein ISO-Datum, der Rest Strings. */
export type Zelle = string;
export interface BlattDaten {
  blattName: string;
  zeilen: Zelle[][];
}

/** Ein nicht übernommener Wert beim Import (für den Bericht). */
export interface UebersprungenerEintrag {
  blatt: string;
  datum: ISODate | '';
  spalte: string;
  rohwert: string;
  grund: string;
}

export interface ImportBericht {
  jahr: number | null;
  zuweisungen: number;
  abwesenheitsTage: number;
  uebersprungen: UebersprungenerEintrag[];
}

export interface LeseErgebnis {
  jahr: number | null;
  zuweisungen: Zuweisung[];
  /** personId → zusammengefasste Abwesenheits-Ranges aus der Datei. */
  abwesenheitenProPerson: Map<string, Abwesenheit[]>;
  bericht: ImportBericht;
}

const SPALTE_DATUM = 0;
const SPALTE_HINTERGRUND = 4;

export const KOPFZEILE: readonly string[] = [
  '',
  'Vordergrund',
  'Visitendienst',
  'DaVinci',
  'Hintergrund',
  'Urlaub/FoBi',
  'Kann nicht',
];

/** Dienst-Spalten (B–D). Hintergrund (E) hat absichtlich keine Dienstart. */
const DIENST_SPALTEN: ReadonlyArray<{ spalte: number; titel: string; dienstartId: DienstartId }> = [
  { spalte: 1, titel: 'Vordergrund', dienstartId: 'vordergrund' },
  { spalte: 2, titel: 'Visitendienst', dienstartId: 'visite' },
  { spalte: 3, titel: 'DaVinci', dienstartId: 'davinci' },
];

/**
 * Abwesenheits-Spalten (F/G). Beim Export landen mehrere Domänen-Typen in
 * einer Spalte; beim Import wird der Standardtyp gesetzt (innerhalb einer
 * Spalte verlustbehaftet — siehe Plan).
 */
const ABWESENHEITS_SPALTEN: ReadonlyArray<{
  spalte: number;
  titel: string;
  importTyp: AbwesenheitsTyp;
  exportTypen: AbwesenheitsTyp[];
}> = [
  { spalte: 5, titel: 'Urlaub/FoBi', importTyp: 'urlaub', exportTypen: ['urlaub', 'fortbildung'] },
  { spalte: 6, titel: 'Kann nicht', importTyp: 'wunschfrei', exportTypen: ['wunschfrei', 'krank'] },
];

/** Nachname = letztes Whitespace-getrenntes Wort des Namens. */
export function nachnameVon(name: string): string {
  const woerter = name.trim().split(/\s+/).filter(Boolean);
  return woerter.length === 0 ? '' : woerter[woerter.length - 1];
}

/** Vergleichsschlüssel: klein, getrimmt, ohne abschließende Punkte, einfache Spaces. */
function normalisiere(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\.+$/, '')
    .replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Export: Domäne → Matrix
// ---------------------------------------------------------------------------

/** Baut die 12 Monatsblätter (inkl. Kopfzeile) für ein Jahr. */
export function baueJahresMatrix(personen: Person[], zuweisungen: Zuweisung[], jahr: number): BlattDaten[] {
  const nameVon = new Map(personen.map((p) => [p.id, nachnameVon(p.name)]));
  // Schnellzugriff: "datum|dienstartId" → Nachname
  const zuwIndex = new Map<string, string>();
  for (const z of zuweisungen) {
    if (zerlege(z.datum).jahr !== jahr) continue;
    zuwIndex.set(`${z.datum}|${z.dienstartId}`, nameVon.get(z.personId) ?? '');
  }

  const blaetter: BlattDaten[] = [];
  for (let monat = 1; monat <= 12; monat++) {
    const zeilen: Zelle[][] = [[...KOPFZEILE]];
    for (const datum of monatsTage(jahr, monat)) {
      const zeile: Zelle[] = new Array(KOPFZEILE.length).fill('');
      zeile[SPALTE_DATUM] = datum;
      for (const ds of DIENST_SPALTEN) {
        zeile[ds.spalte] = zuwIndex.get(`${datum}|${ds.dienstartId}`) ?? '';
      }
      for (const as of ABWESENHEITS_SPALTEN) {
        const namen = personen
          .filter((p) => p.abwesenheiten.some((a) => as.exportTypen.includes(a.typ) && a.von <= datum && datum <= a.bis))
          .map((p) => nachnameVon(p.name))
          .filter(Boolean);
        zeile[as.spalte] = namen.join(', ');
      }
      // Spalte Hintergrund bleibt leer.
      zeile[SPALTE_HINTERGRUND] = '';
      zeilen.push(zeile);
    }
    blaetter.push({ blattName: MONATS_NAMEN[monat - 1], zeilen });
  }
  return blaetter;
}

// ---------------------------------------------------------------------------
// Import: Matrix → Domäne
// ---------------------------------------------------------------------------

type Aufloesung =
  | { status: 'ok'; personId: string }
  | { status: 'unbekannt' }
  | { status: 'mehrdeutig' };

/** Index Nachname (normalisiert) → personIds (mehrere = mehrdeutig). */
function baueNamensIndex(personen: Person[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const p of personen) {
    const key = normalisiere(nachnameVon(p.name));
    if (!key) continue;
    const liste = index.get(key) ?? [];
    liste.push(p.id);
    index.set(key, liste);
  }
  return index;
}

function loese(index: Map<string, string[]>, roh: string): Aufloesung {
  const ids = index.get(normalisiere(roh));
  if (!ids || ids.length === 0) return { status: 'unbekannt' };
  if (ids.length > 1) return { status: 'mehrdeutig' };
  return { status: 'ok', personId: ids[0] };
}

const GRUND_TEXT: Record<'unbekannt' | 'mehrdeutig', string> = {
  unbekannt: 'Kein passender Nachname gefunden',
  mehrdeutig: 'Nachname mehrdeutig (mehrere Personen)',
};

/** Liest die Monatsblätter wieder in Domänenobjekte ein. */
export function leseJahresMatrix(blaetter: BlattDaten[], personen: Person[]): LeseErgebnis {
  const index = baueNamensIndex(personen);
  const blattNachMonat = new Map(MONATS_NAMEN.map((name, i) => [name.toLowerCase(), i + 1]));

  const zuweisungen: Zuweisung[] = [];
  const uebersprungen: UebersprungenerEintrag[] = [];
  // personId → typ → Set von ISO-Tagen
  const abwTage = new Map<string, Map<AbwesenheitsTyp, Set<ISODate>>>();
  let jahr: number | null = null;

  const merkeAbwesenheit = (personId: string, typ: AbwesenheitsTyp, datum: ISODate) => {
    let proTyp = abwTage.get(personId);
    if (!proTyp) {
      proTyp = new Map();
      abwTage.set(personId, proTyp);
    }
    let tage = proTyp.get(typ);
    if (!tage) {
      tage = new Set();
      proTyp.set(typ, tage);
    }
    tage.add(datum);
  };

  for (const blatt of blaetter) {
    const monat = blattNachMonat.get(blatt.blattName.trim().toLowerCase());
    if (!monat) continue; // unbekanntes Blatt (z. B. Statistik) überspringen
    for (const zeile of blatt.zeilen) {
      const datum = zeile[SPALTE_DATUM];
      if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) continue; // Kopf-/Footer-/Leerzeile
      if (jahr === null) jahr = zerlege(datum).jahr;

      for (const ds of DIENST_SPALTEN) {
        const roh = (zeile[ds.spalte] ?? '').trim();
        if (!roh) continue;
        const a = loese(index, roh);
        if (a.status === 'ok') {
          zuweisungen.push({
            id: crypto.randomUUID(),
            datum,
            dienstartId: ds.dienstartId,
            personId: a.personId,
            fixiert: true,
          });
        } else {
          uebersprungen.push({ blatt: blatt.blattName, datum, spalte: ds.titel, rohwert: roh, grund: GRUND_TEXT[a.status] });
        }
      }

      for (const as of ABWESENHEITS_SPALTEN) {
        const roh = (zeile[as.spalte] ?? '').trim();
        if (!roh) continue;
        for (const teil of roh.split(',')) {
          const name = teil.trim();
          if (!name) continue;
          const a = loese(index, name);
          if (a.status === 'ok') {
            merkeAbwesenheit(a.personId, as.importTyp, datum);
          } else {
            uebersprungen.push({ blatt: blatt.blattName, datum, spalte: as.titel, rohwert: name, grund: GRUND_TEXT[a.status] });
          }
        }
      }
    }
  }

  // Tage je Person+Typ zu Ranges zusammenfassen.
  const abwesenheitenProPerson = new Map<string, Abwesenheit[]>();
  let abwesenheitsTage = 0;
  for (const [personId, proTyp] of abwTage) {
    const ranges: Abwesenheit[] = [];
    for (const [typ, tageSet] of proTyp) {
      abwesenheitsTage += tageSet.size;
      ranges.push(...fasseZuRanges([...tageSet].sort(), typ));
    }
    abwesenheitenProPerson.set(personId, ranges);
  }

  return {
    jahr,
    zuweisungen,
    abwesenheitenProPerson,
    bericht: { jahr, zuweisungen: zuweisungen.length, abwesenheitsTage, uebersprungen },
  };
}

/** Aufeinanderfolgende (sortierte) Tage zu Ranges verschmelzen. */
function fasseZuRanges(sortierteTage: ISODate[], typ: AbwesenheitsTyp): Abwesenheit[] {
  const ranges: Abwesenheit[] = [];
  let von: ISODate | null = null;
  let bis: ISODate | null = null;
  for (const tag of sortierteTage) {
    if (von === null) {
      von = bis = tag;
    } else if (addiereTage(bis!, 1) === tag) {
      bis = tag;
    } else {
      ranges.push({ id: crypto.randomUUID(), typ, von, bis: bis! });
      von = bis = tag;
    }
  }
  if (von !== null) ranges.push({ id: crypto.randomUUID(), typ, von, bis: bis! });
  return ranges;
}

/**
 * Ersetzt die Abwesenheiten einer Person, die das importierte Jahr berühren,
 * durch die neu eingelesenen — Ranges anderer Jahre bleiben unangetastet.
 */
export function ersetzeJahresAbwesenheiten(bestehend: Abwesenheit[], neu: Abwesenheit[], jahr: number): Abwesenheit[] {
  const behalten = bestehend.filter((a) => zerlege(a.von).jahr !== jahr && zerlege(a.bis).jahr !== jahr);
  return [...behalten, ...neu];
}
