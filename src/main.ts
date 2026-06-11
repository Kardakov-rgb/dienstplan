/**
 * Einstiegspunkt und "Composition Root": Hier (und nur hier) wird
 * entschieden, welcher Speicher-Adapter verwendet wird.
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './ui/App.vue';
import { router } from './ui/router';
import { useDatenStore, verwendeSpeicher } from './application/store';
import { erzeugeLocalStorageSpeicher } from './infrastructure/storage/localStorage';
import './style.css';

async function start(): Promise<void> {
  verwendeSpeicher(erzeugeLocalStorageSpeicher());

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);

  await useDatenStore().laden();
  app.mount('#app');
}

void start();
