# Firebase einrichten (Phase 7 — gemeinsamer Online-Betrieb)

Ohne Firebase speichert die App nur im **localStorage** des jeweiligen Browsers
(jedes Gerät hat seine eigenen Daten, kein Login). Mit Firebase liegen die Daten
zentral in **Firestore**, alle teilen sich **ein Login**, und Änderungen
erscheinen dank Echtzeit-Sync auf jedem Gerät.

Die App erkennt automatisch, ob Firebase konfiguriert ist (Umgebungsvariablen
`VITE_FIREBASE_*`). Fehlen sie, bleibt der localStorage-Modus aktiv.

## 1. Firebase-Projekt anlegen

1. <https://console.firebase.google.com> → **Projekt hinzufügen**.
2. Google Analytics ist nicht nötig (kann aus bleiben).

## 2. Web-App registrieren

1. Im Projekt → **⚙️ Projekteinstellungen → Allgemein → Meine Apps → Web (`</>`)**.
2. App benennen (z. B. „Dienstplan"), registrieren.
3. Firebase zeigt die **SDK-Konfiguration** (`apiKey`, `authDomain`, …).
   Diese Werte in die Umgebungsvariablen übernehmen (siehe Schritt 5).

   > Diese Web-Config ist **kein Geheimnis** — sie liegt zwangsläufig im
   > ausgelieferten JavaScript. Der Schutz kommt aus Auth + Sicherheitsregeln.

## 3. Authentifizierung aktivieren (gemeinsames Login)

1. **Authentication → Anmeldemethode → E-Mail/Passwort** aktivieren.
2. **Authentication → Nutzer → Nutzer hinzufügen**: das **eine** gemeinsame
   Team-Konto anlegen (E-Mail + Passwort). Mit diesen Daten meldet sich das
   gesamte Team an.

## 4. Firestore-Datenbank + Sicherheitsregeln

1. **Firestore Database → Datenbank erstellen** (Produktionsmodus, Region z. B.
   `europe-west3` Frankfurt).
2. Unter **Regeln** folgende Regeln hinterlegen — nur angemeldete Nutzer dürfen
   lesen/schreiben:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /dienstplan/{dokument} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

Der gesamte Datenstand liegt in einem Dokument: `dienstplan/aktuell`.

## 5. Umgebungsvariablen setzen

**Lokal:** `.env.example` nach `.env.local` kopieren und die Werte aus Schritt 2
eintragen. Dann `npm run dev`.

**GitHub Pages (Deployment):** Die sechs Werte als **Actions-Secrets** hinterlegen
(Repo → *Settings → Secrets and variables → Actions → New repository secret*):

| Secret-Name | Quelle (SDK-Konfiguration) |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

Der Build-Schritt in `.github/workflows/deploy.yml` reicht sie automatisch durch.
Beim nächsten Merge auf `main` läuft die veröffentlichte Seite mit Firebase.

## 6. Bestehende localStorage-Daten übernehmen (optional)

Wer schon Daten im localStorage hat: vor der Umstellung auf der Dienstplan-Seite
**„Backup"** klicken (JSON-Download), nach der Firebase-Anmeldung **„Import"**
wählen. Damit landen die Daten in Firestore.

## Domain für Auth freigeben

Falls die Anmeldung „unauthorized domain" meldet:
**Authentication → Einstellungen → Autorisierte Domains** → die GitHub-Pages-Domain
(`<user>.github.io`) hinzufügen.
