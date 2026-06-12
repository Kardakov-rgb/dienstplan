<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDatenStore } from '../../application/store';
import { DIENSTARTEN } from '../../domain/dienste';
import { MONATS_NAMEN } from '../../domain/datum';
import { personName } from '../../domain/types';
import type { DienstartId } from '../../domain/types';
import {
  berechneStatistik,
  statistikAlsCsv,
  type ZeitraumArt,
} from '../../domain/statistik';

const store = useDatenStore();

const heute = new Date();
const art = ref<ZeitraumArt>('monat');
const jahr = ref(heute.getFullYear());
const monat = ref(heute.getMonth() + 1);

const zeitraum = computed(() => ({ art: art.value, jahr: jahr.value, monat: monat.value }));

const zeitraumLabel = computed(() => {
  if (art.value === 'gesamt') return 'Gesamt';
  if (art.value === 'jahr') return String(jahr.value);
  return `${MONATS_NAMEN[monat.value - 1]} ${jahr.value}`;
});

function wechseln(richtung: -1 | 1) {
  if (art.value === 'jahr') {
    jahr.value += richtung;
    return;
  }
  const neu = monat.value + richtung;
  if (neu < 1) {
    monat.value = 12;
    jahr.value -= 1;
  } else if (neu > 12) {
    monat.value = 1;
    jahr.value += 1;
  } else {
    monat.value = neu;
  }
}

const statistiken = computed(() =>
  berechneStatistik(store.personen, store.zuweisungen, zeitraum.value).sort(
    (a, b) => b.gesamt - a.gesamt || personName(a.person).localeCompare(personName(b.person), 'de'),
  ),
);

const summen = computed(() => ({
  dienste: statistiken.value.reduce((s, p) => s + p.gesamt, 0),
  manuell: statistiken.value.reduce((s, p) => s + p.manuell, 0),
  feiertage: statistiken.value.reduce((s, p) => s + p.feiertage, 0),
}));

/** Größter Ist-Wert je Dienstart — Bezugsgröße der Fairness-Balken. */
const maxJeDienstart = computed(() => {
  const max = {} as Record<DienstartId, number>;
  for (const d of DIENSTARTEN) {
    max[d.id] = Math.max(1, ...statistiken.value.map((s) => s.proDienstart[d.id].ist));
  }
  return max;
});

function balkenBreite(dienstartId: DienstartId, ist: number): string {
  return `${Math.round((ist / maxJeDienstart.value[dienstartId]) * 100)}%`;
}

function sollKlasse(ist: number, soll: number | null): string {
  if (soll === null) return '';
  if (ist > soll) return 'diff-negative';
  if (ist === soll && soll > 0) return 'diff-positive';
  return 'diff-zero';
}

function drucken() {
  window.print();
}

function csvHerunterladen() {
  // BOM, damit Excel die Umlaute als UTF-8 erkennt.
  const csv = '﻿' + statistikAlsCsv(statistiken.value);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const suffix =
    art.value === 'gesamt'
      ? 'gesamt'
      : art.value === 'jahr'
        ? String(jahr.value)
        : `${jahr.value}-${String(monat.value).padStart(2, '0')}`;
  a.download = `dienstplan-statistik-${suffix}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>

<template>
  <div class="page-header">
    <h1>Statistik</h1>
    <div class="page-header-controls">
      <select v-model="art" aria-label="Zeitraum">
        <option value="monat">Monat</option>
        <option value="jahr">Jahr</option>
        <option value="gesamt">Gesamt</option>
      </select>
      <template v-if="art !== 'gesamt'">
        <button class="btn btn-secondary" @click="wechseln(-1)">&#8249;</button>
        <span class="week-label">{{ zeitraumLabel }}</span>
        <button class="btn btn-secondary" @click="wechseln(1)">&#8250;</button>
      </template>
      <span v-else class="week-label">{{ zeitraumLabel }}</span>
      <button class="btn btn-secondary" @click="csvHerunterladen">CSV</button>
      <button class="btn btn-secondary" @click="drucken">Drucken</button>
    </div>
  </div>

  <div class="stats-grid">
    <div class="card stat-card">
      <div class="stat-value">{{ summen.dienste }}</div>
      <div class="stat-label">Dienste (Visite als Einheit)</div>
    </div>
    <div class="card stat-card">
      <div class="stat-value">{{ summen.manuell }}</div>
      <div class="stat-label">davon manuell gesetzt</div>
    </div>
    <div class="card stat-card">
      <div class="stat-value">{{ summen.feiertage }}</div>
      <div class="stat-label">Feiertagsdienste</div>
    </div>
    <div class="card stat-card">
      <div class="stat-value">{{ statistiken.length }}</div>
      <div class="stat-label">Personen</div>
    </div>
  </div>

  <div class="card">
    <h2>Dienste pro Person — {{ zeitraumLabel }}</h2>
    <table class="table stat-tabelle">
      <thead>
        <tr>
          <th>Person</th>
          <th v-for="d in DIENSTARTEN" :key="d.id" :title="d.beschreibung">
            {{ d.name }}<br />
            <span class="stat-spalten-hinweis">{{ art === 'gesamt' ? 'Ist' : 'Ist / Soll' }}</span>
          </th>
          <th>Gesamt</th>
          <th title="Distinkte Einsatz-Wochenenden (VG Fr/Sa/So, Visite Sa/So)">WE</th>
          <th title="Diensttage an NRW-Feiertagen">Feiertage</th>
          <th title="Manuell gesetzte / generierte Einträge">Man./Gen.</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="statistiken.length === 0">
          <td :colspan="DIENSTARTEN.length + 5" class="empty-state">Noch keine Daten vorhanden.</td>
        </tr>
        <tr
          v-for="s in statistiken"
          :key="s.person.id"
          :class="{ 'zeile-inaktiv': !s.person.aktiv }"
        >
          <td>
            {{ personName(s.person) }}
            <span v-if="!s.person.aktiv" class="badge badge-gray">inaktiv</span>
          </td>
          <td v-for="d in DIENSTARTEN" :key="d.id">
            <span :class="sollKlasse(s.proDienstart[d.id].ist, s.proDienstart[d.id].soll)">
              {{ s.proDienstart[d.id].ist
              }}<template v-if="s.proDienstart[d.id].soll !== null">
                / {{ s.proDienstart[d.id].soll }}</template>
            </span>
            <div class="fairness-balken">
              <div
                class="fairness-fuellung"
                :class="d.farbKlasse"
                :style="{ width: balkenBreite(d.id, s.proDienstart[d.id].ist) }"
              ></div>
            </div>
          </td>
          <td>{{ s.gesamt }}</td>
          <td>{{ s.wochenenden }}</td>
          <td>{{ s.feiertage }}</td>
          <td>{{ s.manuell }} / {{ s.generiert }}</td>
        </tr>
      </tbody>
    </table>
    <p class="form-hint">
      Visite zählt in Einheiten (Sa+So-Block = 1). Jahres-Soll = Monats-Soll × 12; in der
      Gesamtansicht gibt es keinen Soll-Vergleich. Balkenlänge = Vergleich zur Person mit den
      meisten Diensten dieser Art (Fairness auf einen Blick).
    </p>
  </div>
</template>
