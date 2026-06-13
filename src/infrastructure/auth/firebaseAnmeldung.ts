/**
 * Firebase-Auth-Adapter (Phase 7) für die gemeinsame Team-Anmeldung
 * per E-Mail + Passwort. Ein einziges Konto, das sich alle teilen
 * (Entscheidung des Auftraggebers: „ein gemeinsames Login").
 */
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';
import { holeFirebaseApp } from '../firebase';
import type { AnmeldePort } from './port';

export function erzeugeFirebaseAnmeldung(): AnmeldePort {
  const auth: Auth = getAuth(holeFirebaseApp());

  return {
    erfordertAnmeldung: true,
    beobachte(callback) {
      onAuthStateChanged(auth, (benutzer) => {
        callback(benutzer ? { email: benutzer.email } : null);
      });
    },
    async anmelden(email, passwort) {
      // Anmeldung bleibt über Neuladen/Geräteneustart erhalten.
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, passwort);
    },
    async abmelden() {
      await signOut(auth);
    },
  };
}
