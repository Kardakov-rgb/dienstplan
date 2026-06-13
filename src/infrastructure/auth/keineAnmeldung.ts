/**
 * Anmelde-Adapter für den localStorage-Modus: es gibt keine Anmeldung,
 * der Benutzer gilt sofort als „eingeloggt" (anonym). So bleibt die App
 * ohne Firebase-Konfiguration unverändert nutzbar (Phasen 1–6).
 */
import type { AnmeldePort } from './port';

export function erzeugeKeineAnmeldung(): AnmeldePort {
  return {
    erfordertAnmeldung: false,
    beobachte(callback) {
      callback({ email: null });
    },
    async anmelden() {
      /* Im localStorage-Modus nicht nötig. */
    },
    async abmelden() {
      /* Im localStorage-Modus nicht nötig. */
    },
  };
}
