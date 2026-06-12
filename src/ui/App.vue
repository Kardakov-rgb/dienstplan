<script setup lang="ts">
import AppIcon from './components/AppIcon.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import ToastHost from './components/ToastHost.vue';

const seiten = [
  { pfad: '/personen', titel: 'Personen', icon: 'personen' },
  { pfad: '/dienstplan', titel: 'Dienstplan', icon: 'kalender' },
  { pfad: '/statistik', titel: 'Statistik', icon: 'statistik' },
];
</script>

<template>
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
  </nav>

  <main class="container">
    <RouterView />
  </main>

  <ConfirmDialog />
  <ToastHost />
</template>
