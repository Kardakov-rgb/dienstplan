/**
 * Reine Firebase-Konfiguration aus den Vite-Umgebungsvariablen — OHNE
 * Import des Firebase-SDK. Dadurch kann main.ts allein anhand dieses Moduls
 * entscheiden, ob das (große) SDK überhaupt nachgeladen werden muss.
 */
import type { FirebaseOptions } from 'firebase/app';

export const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Nur wahr, wenn die wesentlichen Felder gesetzt sind. */
export const firebaseKonfiguriert = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);
