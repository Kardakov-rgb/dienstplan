<script setup lang="ts">
import { useAuthStore } from '../application/authStore';
import AppIcon from './components/AppIcon.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import ToastHost from './components/ToastHost.vue';
import AnmeldeMaske from './components/AnmeldeMaske.vue';

const auth = useAuthStore();

const seiten = [
  { pfad: '/personen', titel: 'Personen', icon: 'personen' },
  { pfad: '/dienstplan', titel: 'Dienstplan', icon: 'kalender' },
  { pfad: '/statistik', titel: 'Statistik', icon: 'statistik' },
];

async function abmelden() {
  await auth.abmelden();
}
</script>

<template>
  <!-- Warten, bis der Anmeldestatus feststeht (verhindert Aufblitzen) -->
  <div v-if="!auth.bereit" class="lade-schirm">
    <AppIcon name="kalender" :groesse="26" />
    <span>Lädt …</span>
  </div>

  <!-- Anmeldung nötig und (noch) nicht angemeldet -->
  <AnmeldeMaske v-else-if="!auth.angemeldet" />

  <!-- Reguläre App -->
  <template v-else>
    <nav class="navbar">
      <div class="nav-brand">
        <AppIcon name="kalender" :groesse="20" />
        Dienstplan
      </div>
      <ul class="nav-links">
        <li v-for="seite in seiten" :key="seite.pfad">
          <RouterLink :to="seite.pfad" class="nav-link" active-class="active">
            <AppIcon :name="seite.icon" :groesse="15" />
            {{ seite.titel }}
          </RouterLink>
        </li>
      </ul>
      <button
        v-if="auth.loginErforderlich"
        class="btn btn-secondary btn-sm nav-abmelden"
        title="Abmelden"
        @click="abmelden"
      >
        <AppIcon name="abmelden" :groesse="15" />
        Abmelden
      </button>
    </nav>

    <main class="container">
      <RouterView />
    </main>
  </template>

  <ConfirmDialog />
  <ToastHost />
</template>
