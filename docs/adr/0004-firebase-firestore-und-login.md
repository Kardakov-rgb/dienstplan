# ADR 0004: Firebase (Firestore + Auth) als Online-Backend mit gemeinsamem Login

## Status
Akzeptiert (Juni 2026) — Umsetzung Phase 7

## Kontext
Bis Phase 6 lebten die Daten im `localStorage` des jeweiligen Browsers: pro Gerät
ein eigener Stand, kein gemeinsamer Zugriff. Für den realen Betrieb muss das Team
denselben Plan auf mehreren Geräten sehen und bearbeiten. ADR 0002 hatte den
Adapter-Tausch dafür bereits vorgesehen.

Entscheidungen des Auftraggebers: **Firebase** als Backend, **ein gemeinsames
Login** für das ganze Team.

## Entscheidung
- **Firestore** als Speicher-Adapter hinter dem bestehenden `DatenSpeicher`-Port.
  Der gesamte Datenstand liegt — passend zum kleinen Team — in **einem Dokument**
  (`dienstplan/aktuell`). Das hält Laden, Speichern und Echtzeit-Sync einfach.
- Der Port erhält eine **optionale** `abonniere`-Methode für Echtzeit-Sync
  (`onSnapshot`). Der localStorage-Adapter implementiert sie nicht — die
  Anwendung funktioniert ohne sie unverändert.
- **Firebase-Auth** (E-Mail/Passwort) mit **einem** geteilten Konto. Analog zum
  Speicher gibt es einen `AnmeldePort` mit zwei Adaptern: `firebaseAnmeldung`
  und `keineAnmeldung` (localStorage-Modus, sofort „angemeldet").
- **Composition Root** (`main.ts`) wählt die Adapter anhand der
  Umgebungsvariablen `VITE_FIREBASE_*`. Fehlen sie, läuft alles wie in den
  Phasen 1–6 (localStorage, kein Login). So bleibt die App ohne Secrets in der
  CI, lokal und auf GitHub Pages lauffähig.
- Das Firebase-SDK wird per **dynamischem Import** nur geladen, wenn Firebase
  konfiguriert ist — das Haupt-Bundle bleibt klein.

## Konsequenzen
- Anwendung, Domain und UI bleiben weitgehend unberührt; neu sind nur Adapter,
  ein `authStore` und eine Anmelde-Maske. Die hexagonale Architektur trägt.
- Einrichtung (Projekt, Konto, Sicherheitsregeln, Secrets) ist manuell und in
  `docs/firebase-einrichtung.md` beschrieben.
- Die Firebase-Web-Config ist öffentlich; der Schutz liegt in Auth +
  Firestore-Sicherheitsregeln (`request.auth != null`).
- Ein gemeinsames Konto bedeutet: keine personenbezogene Nachvollziehbarkeit von
  Änderungen — bewusst akzeptiert für die einfache Bedienung.
