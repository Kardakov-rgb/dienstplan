import { createRouter, createWebHashHistory } from 'vue-router';
import PersonenPage from './pages/PersonenPage.vue';
import DienstplanPage from './pages/DienstplanPage.vue';
import StatistikPage from './pages/StatistikPage.vue';

// Hash-History, damit die Seite auf GitHub Pages ohne Server-Konfiguration läuft.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/personen' },
    { path: '/personen', component: PersonenPage },
    { path: '/dienstplan', component: DienstplanPage },
    { path: '/statistik', component: StatistikPage },
  ],
});
