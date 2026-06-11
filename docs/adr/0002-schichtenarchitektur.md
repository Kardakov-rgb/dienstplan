# ADR 0002: Hexagonale Schichtenarchitektur

## Status
Akzeptiert (Juni 2026)

## Kontext
UI-Technik und Speicherort (localStorage → Firestore in Phase 7) werden sich ändern;
die fachliche Logik (Dienstarten, Regeln, Generator) ist der wertvolle, langlebige Kern
und muss isoliert testbar bleiben.

## Entscheidung
Strikte Abhängigkeitsrichtung:

```
ui  →  application  →  domain
infrastructure  →  (Ports der application/infrastructure-Schnittstelle)
```

- `src/domain/` ist pures TypeScript ohne Importe aus anderen Schichten,
  ohne Browser-APIs, ohne Bibliotheken.
- Speicher wird über den Port `DatenSpeicher` (`infrastructure/storage/port.ts`)
  abstrahiert; die Adapter-Wahl trifft ausschließlich `main.ts` (Composition Root).
- Schema-Änderungen laufen über versionierte Migrationen (`application/migrations.ts`,
  `schemaVersion` in den gespeicherten Daten).

## Konsequenzen
- Generator und Regeln sind ohne Browser/DOM unit-testbar.
- Der Firestore-Umstieg in Phase 7 ersetzt nur den Adapter, nicht die Anwendung.
