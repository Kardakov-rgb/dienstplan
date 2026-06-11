<script setup lang="ts">
const seiten = [
  { pfad: '/personen', titel: 'Personen' },
  { pfad: '/dienstplan', titel: 'Dienstplan' },
  { pfad: '/statistik', titel: 'Statistik' },
];
</script>

<template>
  <nav class="navbar">
    <div class="nav-brand">Dienstplan</div>
    <ul class="nav-links">
      <li v-for="seite in seiten" :key="seite.pfad">
        <RouterLink :to="seite.pfad" class="nav-link" active-class="active">
          {{ seite.titel }}
        </RouterLink>
      </li>
    </ul>
  </nav>

  <main class="container">
    <RouterView />
  </main>
</template>
