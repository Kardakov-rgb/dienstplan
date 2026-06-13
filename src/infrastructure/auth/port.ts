/**
 * Anmelde-Schnittstelle (Port). Wie beim Speicher kennt die Anwendung nur
 * diese Schnittstelle; ob dahinter Firebase-Auth oder „keine Anmeldung"
 * (localStorage-Modus) steckt, entscheidet allein main.ts.
 */

export interface AnmeldeBenutzer {
  email: string | null;
}

export interface AnmeldePort {
  /** Verlangt die App überhaupt eine Anmeldung? (localStorage-Modus: nein.) */
  readonly erfordertAnmeldung: boolean;
  /**
   * Beobachtet den Anmeldestatus und ruft den Callback bei jeder Änderung auf —
   * auch einmalig beim Start mit dem Anfangszustand (Benutzer oder null).
   */
  beobachte(callback: (benutzer: AnmeldeBenutzer | null) => void): void;
  anmelden(email: string, passwort: string): Promise<void>;
  abmelden(): Promise<void>;
}
