# ADR 0001: Technologie-Stack — Vue 3 + TypeScript + Vite + Vitest

## Status
Akzeptiert (Juni 2026, mit Auftraggeber abgestimmt)

## Kontext
Das Projekt startete als Vanilla-HTML/JS/CSS-Grundgerüst. Absehbar wächst es zu einer
komplexen Anwendung (Regel-Engine, Plan-Generator, Firebase-Sync). Reines JavaScript
ohne Tests und Typen skaliert dafür schlecht.

## Entscheidung
- **TypeScript**: Typsicherheit für das komplexe Datenmodell (Personen, Dienstarten, Regeln).
- **Vue 3** (Composition API) + **Vite**: deklaratives, wartbares UI; schneller Build.
- **Vitest**: Unit-Tests sind Pflicht für alle Domain-Logik (Generator, jede Regel, Feiertage).
- **Pinia** als zentraler Zustand, **Vue Router** (Hash-Modus wegen GitHub Pages).

## Konsequenzen
- Die Seite braucht einen Build-Schritt; GitHub Pages wird über eine Action mit
  `npm ci && npm run build` bedient (siehe `.github/workflows/deploy.yml`).
- Lokales Arbeiten: `npm install`, dann `npm run dev`.
