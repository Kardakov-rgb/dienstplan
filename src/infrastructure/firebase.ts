/**
 * Firebase-Composition-Helfer (Phase 7).
 *
 * Wird nur geladen, wenn Firebase konfiguriert ist (siehe firebaseConfig.ts).
 * Die Web-Config (apiKey usw.) ist bewusst öffentlich; geschützt wird über
 * Firebase-Auth und Firestore-Sicherheitsregeln, nicht über Geheimhaltung
 * des Schlüssels.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { firebaseConfig, firebaseKonfiguriert } from './firebaseConfig';

let app: FirebaseApp | null = null;

/** Lazy-Init der Firebase-App; wirft, wenn nicht konfiguriert. */
export function holeFirebaseApp(): FirebaseApp {
  if (!firebaseKonfiguriert) {
    throw new Error('Firebase ist nicht konfiguriert (VITE_FIREBASE_* fehlen).');
  }
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}
