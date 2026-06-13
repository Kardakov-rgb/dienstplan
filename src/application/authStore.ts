/**
 * Anwendungszustand der Anmeldung (Pinia).
 * Kapselt den injizierten AnmeldePort, lädt nach erfolgreicher Anmeldung
 * die Daten und stellt der UI reaktive Status-Flags bereit.
 */
import { defineStore } from 'pinia';
import type { AnmeldeBenutzer, AnmeldePort } from '../infrastructure/auth/port';
import { useDatenStore } from './store';

let anmeldung: AnmeldePort | null = null;

/** Wird einmalig vom Einstiegspunkt (main.ts) aufgerufen. */
export function verwendeAnmeldung(port: AnmeldePort): void {
  anmeldung = port;
}

/** Übersetzt die kryptischen Firebase-Fehlercodes in klare Hinweise. */
function fehlerText(fehler: unknown): string {
  const code = (fehler as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Die E-Mail-Adresse ist ungültig.';
    case 'auth/missing-password':
      return 'Bitte ein Passwort eingeben.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-Mail oder Passwort ist falsch.';
    case 'auth/too-many-requests':
      return 'Zu viele Versuche — bitte später erneut probieren.';
    case 'auth/network-request-failed':
      return 'Keine Verbindung zum Server.';
    default:
      return 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.';
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    benutzer: null as AnmeldeBenutzer | null,
    /** Erst true, sobald der Anfangs-Anmeldestatus feststeht (verhindert Aufblitzen). */
    bereit: false,
    /** Ob die App überhaupt eine Anmeldung verlangt (Firebase-Modus). */
    loginErforderlich: false,
    /** Läuft gerade ein Anmeldeversuch? */
    beschaeftigt: false,
    fehler: '' as string,
  }),

  getters: {
    angemeldet: (state) => !state.loginErforderlich || state.benutzer !== null,
  },

  actions: {
    /** Beobachtet den Anmeldestatus; lädt Daten, sobald angemeldet. */
    initialisieren() {
      if (!anmeldung) throw new Error('Kein AnmeldePort gesetzt (verwendeAnmeldung fehlt).');
      this.loginErforderlich = anmeldung.erfordertAnmeldung;
      anmeldung.beobachte(async (benutzer) => {
        this.benutzer = benutzer;
        if (benutzer || !this.loginErforderlich) {
          await useDatenStore().laden();
        }
        this.bereit = true;
      });
    },

    async anmelden(email: string, passwort: string) {
      if (!anmeldung) throw new Error('Kein AnmeldePort gesetzt.');
      this.beschaeftigt = true;
      this.fehler = '';
      try {
        await anmeldung.anmelden(email.trim(), passwort);
      } catch (fehler) {
        this.fehler = fehlerText(fehler);
      } finally {
        this.beschaeftigt = false;
      }
    },

    async abmelden() {
      if (!anmeldung) throw new Error('Kein AnmeldePort gesetzt.');
      await anmeldung.abmelden();
      useDatenStore().zuruecksetzen();
    },
  },
});
