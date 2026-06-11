<script setup lang="ts">
import { computed, ref } from 'vue';
import { DIENSTARTEN } from '../../domain/dienste';
import {
  MONATS_NAMEN,
  WOCHENTAG_KURZ,
  istWochenende,
  monatsTage,
  wochentag,
  zerlege,
} from '../../domain/datum';
import { feiertagsName } from '../../domain/feiertage';
import type { ISODate } from '../../domain/types';

const heute = new Date();
const jahr = ref(heute.getFullYear());
const monat = ref(heute.getMonth() + 1);

const tage = computed(() => monatsTage(jahr.value, monat.value));
const monatsLabel = computed(() => `${MONATS_NAMEN[monat.value - 1]} ${jahr.value}`);

function monatWechseln(richtung: -1 | 1) {
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

function tagKlassen(datum: ISODate): string[] {
  const klassen: string[] = [];
  if (istWochenende(datum)) klassen.push('tag-wochenende');
  if (feiertagsName(datum)) klassen.push('tag-feiertag');
  return klassen;
}

function tagTitel(datum: ISODate): string | undefined {
  return feiertagsName(datum) ?? undefined;
}
</script>

<template>
  <div class="page-header">
    <h1>Dienstplan</h1>
    <div class="page-header-controls">
      <button class="btn btn-secondary" @click="monatWechseln(-1)">&#8249;</button>
      <span class="week-label">{{ monatsLabel }}</span>
      <button class="btn btn-secondary" @click="monatWechseln(1)">&#8250;</button>
    </div>
  </div>

  <div class="card">
    <div class="calendar-grid-wrapper">
      <table class="plan-table">
        <thead>
          <tr>
            <th class="plan-dienst-col">Dienst</th>
            <th
              v-for="tag in tage"
              :key="tag"
              :class="tagKlassen(tag)"
              :title="tagTitel(tag)"
            >
              {{ zerlege(tag).tag }}<br />
              <span class="plan-wochentag">{{ WOCHENTAG_KURZ[wochentag(tag)] }}</span>
              <span v-if="feiertagsName(tag)" class="plan-feiertag-punkt" aria-hidden="true">•</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dienst in DIENSTARTEN" :key="dienst.id">
            <td class="plan-dienst-col" :title="dienst.beschreibung">{{ dienst.name }}</td>
            <td
              v-for="tag in tage"
              :key="tag"
              :class="[
                ...tagKlassen(tag),
                dienst.findetStattAm(tag) ? 'zelle-offen' : 'zelle-aus',
              ]"
              :title="tagTitel(tag)"
            >
              <span v-if="!dienst.findetStattAm(tag)" class="zelle-aus-marker">–</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="plan-legende">
      <span class="legende-item"><span class="legende-farbe tag-wochenende"></span> Wochenende</span>
      <span class="legende-item"><span class="legende-farbe tag-feiertag"></span> Feiertag (NRW)</span>
      <span class="legende-item"><span class="legende-farbe zelle-aus"></span> Dienst findet nicht statt</span>
    </p>
    <p class="empty-state" style="padding: 1rem 0 0">
      Die Besetzung der Dienste (manuell und per Generator) folgt in den nächsten Ausbauphasen.
    </p>
  </div>
</template>
