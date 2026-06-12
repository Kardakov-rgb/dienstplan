/**
 * Plan-Generator: besetzt alle offenen Dienste eines Monats.
 *
 * Vorgehen (gierig, Tag für Tag):
 * 1. Offene Slots ermitteln — Visite Sa+So wird als EIN Block behandelt,
 *    wenn beide Tage im Monat liegen und frei sind.
 * 2. Pro Slot alle Kandidaten gegen die harten Regeln prüfen; Verstöße
 *    schließen aus (Lücke statt Regelbruch — Entscheidung des Auftraggebers).
 * 3. Unter den zulässigen Kandidaten gewinnt die niedrigste gewichtete
 *    Strafpunkt-Summe der weichen Regeln (Soll, Visite-Block, Abstand,
 *    Gesamt-Fairness über die komplette Historie).
 *
 * Bestehende (auch fixierte) Zuweisungen werden nie angetastet; sie fließen
 * aber in alle Prüfungen und Bewertungen ein.
 */
import type { DienstartId, ISODate, Person, Zuweisung } from '../types';
import { personName } from '../types';
import { DIENSTARTEN, istGenerierbar } from '../dienste';
import { addiereTage, monatsTage, wochentag } from '../datum';
import { bewerteKandidat, harteVerstoesse } from '../rules';
import type { Verstoss } from '../rules/types';

const SAMSTAG = 6;

/** Ein zu besetzender Dienst; bei Visite-Wochenendblöcken zwei Tage. */
interface Slot {
  dienstartId: DienstartId;
  tage: ISODate[];
}

export interface Luecke {
  datum: ISODate;
  dienstartId: DienstartId;
  /** Pro Person die Begründung, warum sie nicht infrage kam. */
  gruende: { personName: string; meldungen: string[] }[];
}

export interface GenerierungsErgebnis {
  /** Neu erzeugte Zuweisungen (fixiert = false). */
  neu: Zuweisung[];
  luecken: Luecke[];
}

function offeneSlots(jahr: number, monat: number, zuweisungen: Zuweisung[]): Slot[] {
  const belegt = new Set(zuweisungen.map((z) => `${z.datum}|${z.dienstartId}`));
  const istFrei = (datum: ISODate, dienstartId: DienstartId) =>
    !belegt.has(`${datum}|${dienstartId}`);

  const tage = monatsTage(jahr, monat);
  const imMonat = new Set(tage);
  const slots: Slot[] = [];
  const verplant = new Set<string>();

  for (const tag of tage) {
    for (const dienst of DIENSTARTEN) {
      // Nur automatisch besetzbare Tage; z.B. Feiertags-Visite bleibt manuell.
      if (!istGenerierbar(dienst, tag) || !istFrei(tag, dienst.id) || verplant.has(`${tag}|${dienst.id}`)) {
        continue;
      }
      // Visite: Sa+So als Block, wenn der Sonntag im selben Monat liegt und frei ist.
      if (dienst.id === 'visite' && wochentag(tag) === SAMSTAG) {
        const sonntag = addiereTage(tag, 1);
        if (imMonat.has(sonntag) && istFrei(sonntag, 'visite')) {
          slots.push({ dienstartId: 'visite', tage: [tag, sonntag] });
          verplant.add(`${sonntag}|visite`);
          continue;
        }
      }
      slots.push({ dienstartId: dienst.id, tage: [tag] });
    }
  }
  return slots;
}

/** Prüft alle Tage eines Slots nacheinander (spätere Tage sehen die früheren). */
function verstoesseFuerSlot(person: Person, slot: Slot, zuweisungen: Zuweisung[]): Verstoss[] {
  const simuliert = [...zuweisungen];
  for (const tag of slot.tage) {
    const verstoesse = harteVerstoesse(
      { person, datum: tag, dienstartId: slot.dienstartId },
      { zuweisungen: simuliert },
    );
    if (verstoesse.length > 0) return verstoesse;
    simuliert.push({
      id: 'simulation',
      datum: tag,
      dienstartId: slot.dienstartId,
      personId: person.id,
      fixiert: false,
    });
  }
  return [];
}

function punkteFuerSlot(person: Person, slot: Slot, zuweisungen: Zuweisung[]): number {
  const simuliert = [...zuweisungen];
  let punkte = 0;
  for (const tag of slot.tage) {
    punkte += bewerteKandidat(
      { person, datum: tag, dienstartId: slot.dienstartId },
      { zuweisungen: simuliert },
    );
    simuliert.push({
      id: 'simulation',
      datum: tag,
      dienstartId: slot.dienstartId,
      personId: person.id,
      fixiert: false,
    });
  }
  return punkte;
}

export function generierePlan(eingabe: {
  jahr: number;
  monat: number;
  /** Nur aktive Personen übergeben. */
  personen: Person[];
  /** ALLE bestehenden Zuweisungen (gesamte Historie — Basis der Fairness). */
  bestehendeZuweisungen: Zuweisung[];
}): GenerierungsErgebnis {
  const { jahr, monat, personen } = eingabe;
  const arbeitsstand = [...eingabe.bestehendeZuweisungen];
  const neu: Zuweisung[] = [];
  const luecken: Luecke[] = [];

  for (const slot of offeneSlots(jahr, monat, arbeitsstand)) {
    const bewertungen = personen.map((person) => ({
      person,
      verstoesse: verstoesseFuerSlot(person, slot, arbeitsstand),
    }));

    const zulaessige = bewertungen.filter((b) => b.verstoesse.length === 0);

    if (zulaessige.length === 0) {
      for (const tag of slot.tage) {
        luecken.push({
          datum: tag,
          dienstartId: slot.dienstartId,
          gruende: bewertungen.map((b) => ({
            personName: personName(b.person),
            meldungen: b.verstoesse.map((v) => v.meldung),
          })),
        });
      }
      continue;
    }

    // Beste Bewertung gewinnt; bei Gleichstand entscheidet die geringere
    // Gesamtzahl bisheriger Dienste, danach der Name (deterministisch).
    const gereiht = zulaessige
      .map(({ person }) => ({
        person,
        punkte: punkteFuerSlot(person, slot, arbeitsstand),
        gesamt: arbeitsstand.filter((z) => z.personId === person.id).length,
      }))
      .sort(
        (a, b) =>
          a.punkte - b.punkte ||
          a.gesamt - b.gesamt ||
          personName(a.person).localeCompare(personName(b.person), 'de'),
      );

    const sieger = gereiht[0].person;
    for (const tag of slot.tage) {
      const zuweisung: Zuweisung = {
        id: crypto.randomUUID(),
        datum: tag,
        dienstartId: slot.dienstartId,
        personId: sieger.id,
        fixiert: false,
      };
      arbeitsstand.push(zuweisung);
      neu.push(zuweisung);
    }
  }

  return { neu, luecken };
}
