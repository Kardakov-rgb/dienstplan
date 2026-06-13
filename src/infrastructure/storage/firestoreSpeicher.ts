/**
 * Firestore-Adapter (Phase 7) hinter derselben DatenSpeicher-Schnittstelle
 * wie der localStorage-Adapter. Der gesamte Datenstand liegt — passend zum
 * kleinen Team und der gemeinsamen Anmeldung — in EINEM Dokument
 * (`dienstplan/aktuell`). Das hält Lesen/Schreiben und Echtzeit-Sync einfach.
 */
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { holeFirebaseApp } from '../firebase';
import type { DatenSpeicher, GespeicherteDaten } from './port';

const SAMMLUNG = 'dienstplan';
const DOKUMENT = 'aktuell';

export function erzeugeFirestoreSpeicher(): DatenSpeicher {
  const db: Firestore = getFirestore(holeFirebaseApp());
  const ref = doc(db, SAMMLUNG, DOKUMENT);

  return {
    async laden() {
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return snap.data() as GespeicherteDaten;
    },

    async speichern(daten) {
      // Plain-Objekt erzwingen — Firestore mag keine reaktiven Proxys.
      await setDoc(ref, JSON.parse(JSON.stringify(daten)) as GespeicherteDaten);
    },

    abonniere(callback) {
      return onSnapshot(ref, (snap) => {
        // Eigene (optimistische) Schreibvorgänge ignorieren — nur echte
        // Remote-Änderungen anderer Geräte sollen den Zustand überschreiben.
        if (snap.metadata.hasPendingWrites) return;
        if (snap.exists()) callback(snap.data() as GespeicherteDaten);
      });
    },
  };
}
