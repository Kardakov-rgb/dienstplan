<script setup lang="ts">
import { computed } from 'vue';
import { useDatenStore } from '../../application/store';
import { DIENSTARTEN } from '../../domain/dienste';
import { personName } from '../../domain/types';

const store = useDatenStore();

const zeilen = computed(() =>
  store.personen.map((p) => ({
    person: p,
    proDienst: DIENSTARTEN.map(
      (d) =>
        store.zuweisungen.filter((z) => z.personId === p.id && z.dienstartId === d.id).length,
    ),
    gesamt: store.zuweisungen.filter((z) => z.personId === p.id).length,
  })),
);
</script>

<template>
  <div class="page-header">
    <h1>Statistik</h1>
  </div>

  <div class="stats-grid">
    <div class="card stat-card">
      <div class="stat-value">{{ store.zuweisungen.length }}</div>
      <div class="stat-label">Dienste gesamt</div>
    </div>
    <div class="card stat-card">
      <div class="stat-value">{{ store.personen.length }}</div>
      <div class="stat-label">Personen</div>
    </div>
  </div>

  <div class="card">
    <h2>Dienste pro Person</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Person</th>
          <th v-for="d in DIENSTARTEN" :key="d.id">{{ d.name }}</th>
          <th>Gesamt</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="zeilen.length === 0">
          <td :colspan="DIENSTARTEN.length + 2" class="empty-state">Noch keine Daten vorhanden.</td>
        </tr>
        <tr v-for="zeile in zeilen" :key="zeile.person.id">
          <td>{{ personName(zeile.person) }}</td>
          <td v-for="(anzahl, i) in zeile.proDienst" :key="DIENSTARTEN[i].id">{{ anzahl }}</td>
          <td>{{ zeile.gesamt }}</td>
        </tr>
      </tbody>
    </table>
    <p class="empty-state" style="padding: 1rem 0 0">
      Die Statistik wird in einer späteren Ausbauphase erweitert (Wochenend-/Feiertagsdienste, Soll-Vergleich).
    </p>
  </div>
</template>
