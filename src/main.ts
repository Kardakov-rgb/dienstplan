/**
 * Einstiegspunkt und "Composition Root": Hier (und nur hier) wird
 * entschieden, welche Adapter verwendet werden.
 *
 * Ist Firebase konfiguriert (VITE_FIREBASE_*), läuft die App mit Firestore
 * + gemeinsamer Anmeldung. Andernfalls fällt sie auf localStorage ohne
 * Login zurück (Verhalten der Phasen 1–6) — so bleibt sie ohne Secrets,
 * in der CI und lokal lauffähig. Das Firebase-SDK wird nur dann nachgeladen,
 * wenn es wirklich gebraucht wird (dynamischer Import = kleineres Bundle).
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './ui/App.vue';
import { router } from './ui/router';
import { verwendeSpeicher } from './application/store';
import { useAuthStore, verwendeAnmeldung } from './application/authStore';
import { firebaseKonfiguriert } from './infrastructure/firebaseConfig';
import { erzeugeLocalStorageSpeicher } from './infrastructure/storage/localStorage';
import { erzeugeKeineAnmeldung } from './infrastructure/auth/keineAnmeldung';
import './style.css';

async function start(): Promise<void> {
  if (firebaseKonfiguriert) {
    const [{ erzeugeFirestoreSpeicher }, { erzeugeFirebaseAnmeldung }] = await Promise.all([
      import('./infrastructure/storage/firestoreSpeicher'),
      import('./infrastructure/auth/firebaseAnmeldung'),
    ]);
    verwendeSpeicher(erzeugeFirestoreSpeicher());
    verwendeAnmeldung(erzeugeFirebaseAnmeldung());
  } else {
    verwendeSpeicher(erzeugeLocalStorageSpeicher());
    verwendeAnmeldung(erzeugeKeineAnmeldung());
  }

  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.use(router);

  // Anmeldestatus beobachten; lädt die Daten, sobald angemeldet.
  useAuthStore(pinia).initialisieren();

  app.mount('#app');
}

void start();
