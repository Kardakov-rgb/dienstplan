# ADR 0003: Regel-Engine als Liste von Constraint-Objekten

## Status
Akzeptiert (Juni 2026) — Umsetzung ab Phase 3/4

## Kontext
Die Dienstplan-Generierung unterliegt vielen Spezialregeln, die iterativ ergänzt werden.
Der Generator darf bei neuen Regeln nicht angefasst werden müssen.

## Entscheidung
Jede Regel ist ein eigenes Modul in `src/domain/rules/` mit einheitlicher Schnittstelle:

```ts
interface Regel {
  id: string;
  beschreibung: string;
  typ: 'hart' | 'weich';
  gewicht: number; // nur für weiche Regeln relevant
  pruefe(kandidat: Kandidat, kontext: PlanKontext): Verstoss | null;
}
```

- **Harte Regeln** verbieten eine Zuweisung vollständig.
- **Weiche Regeln** vergeben Strafpunkte; der Generator wählt den Kandidaten mit der
  besten Gesamtbewertung.
- Alle Regeln werden in `rules/index.ts` registriert; UI-Warnungen (manuelle Bearbeitung)
  und Generator nutzen dieselbe Regel-Liste.
- Jede Regel bekommt eine eigene Testdatei mit Beispielmonaten.

## Konsequenzen
Neue Regel = neue Datei + Test + Registrierungseintrag. Generator, UI und übrige Regeln
bleiben unverändert; die Testsuite sichert ab, dass Alt-Regeln weiter gelten.
