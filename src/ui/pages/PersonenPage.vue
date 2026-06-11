<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDatenStore } from '../../application/store';
import type { Person } from '../../domain/types';
import { personName } from '../../domain/types';
import { DIENSTARTEN } from '../../domain/dienste';
import { abwesenheitsLabel, machtIrgendeinenDienst } from '../../domain/person';
import { formatDatum } from '../../domain/datum';
import PersonForm from '../components/PersonForm.vue';

const store = useDatenStore();

const formularSichtbar = ref(false);
const bearbeitetePerson = ref<Person | null>(null);
const inaktiveAnzeigen = ref(false);

const sichtbarePersonen = computed(() =>
  inaktiveAnzeigen.value ? store.personen : store.personen.filter((p) => p.aktiv),
);

const anzahlInaktive = computed(() => store.personen.filter((p) => !p.aktiv).length);

function neuePerson() {
  bearbeitetePerson.value = null;
  formularSichtbar.value = true;
}

function bearbeiten(p: Person) {
  bearbeitetePerson.value = p;
  formularSichtbar.value = true;
}

function haeufigkeitsText(p: Person, dienstartId: (typeof DIENSTARTEN)[number]['id']): string {
  const h = p.haeufigkeiten[dienstartId];
  if (!h || h.maximum === 0) return '—';
  return `${h.soll} / ${h.maximum}`;
}

function abwesenheitenTooltip(p: Person): string {
  return p.abwesenheiten
    .map((a) => `${abwesenheitsLabel(a.typ)}: ${formatDatum(a.von)} – ${formatDatum(a.bis)}`)
    .join('\n');
}

async function aktivUmschalten(p: Person) {
  await store.personAktivSetzen(p.id, !p.aktiv);
}

async function loeschen(p: Person) {
  if (
    !confirm(
      `${personName(p)} wirklich löschen?\n\nAchtung: Auch alle zugewiesenen Dienste dieser Person werden entfernt. ` +
        `Soll die Person nur nicht mehr verplant werden, ist „Deaktivieren" die bessere Wahl.`,
    )
  )
    return;
  await store.personLoeschen(p.id);
}
</script>

<template>
  <div class="page-header">
    <h1>Personen</h1>
    <div class="page-header-controls">
      <label v-if="anzahlInaktive > 0" class="checkbox-label">
        <input v-model="inaktiveAnzeigen" type="checkbox" />
        Inaktive anzeigen ({{ anzahlInaktive }})
      </label>
      <button class="btn btn-primary" @click="neuePerson">+ Person hinzufügen</button>
    </div>
  </div>

  <PersonForm
    v-if="formularSichtbar"
    :key="bearbeitetePerson?.id ?? 'neu'"
    :person="bearbeitetePerson"
    @gespeichert="formularSichtbar = false"
    @abgebrochen="formularSichtbar = false"
  />

  <div class="card">
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th v-for="d in DIENSTARTEN" :key="d.id" :title="`Soll / Max pro Monat`">
            {{ d.name }}
          </th>
          <th>Abwesenheiten</th>
          <th>Status</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="sichtbarePersonen.length === 0">
          <td :colspan="DIENSTARTEN.length + 4" class="empty-state">
            Noch keine Personen angelegt.
          </td>
        </tr>
        <tr v-for="p in sichtbarePersonen" :key="p.id" :class="{ 'zeile-inaktiv': !p.aktiv }">
          <td>
            {{ personName(p) }}
            <span
              v-if="p.aktiv && !machtIrgendeinenDienst(p)"
              class="badge badge-orange"
              title="Bei allen Diensten ist Max 0 — diese Person wird nicht verplant."
            >
              keine Dienste
            </span>
          </td>
          <td v-for="d in DIENSTARTEN" :key="d.id">{{ haeufigkeitsText(p, d.id) }}</td>
          <td>
            <span v-if="p.abwesenheiten.length === 0">–</span>
            <span v-else class="abwesenheit-anzahl" :title="abwesenheitenTooltip(p)">
              {{ p.abwesenheiten.length }} 📅
            </span>
          </td>
          <td>
            <span class="badge" :class="p.aktiv ? 'badge-green' : 'badge-gray'">
              {{ p.aktiv ? 'aktiv' : 'inaktiv' }}
            </span>
          </td>
          <td>
            <div class="btn-group">
              <button class="btn btn-secondary btn-sm" @click="bearbeiten(p)">Bearbeiten</button>
              <button class="btn btn-secondary btn-sm" @click="aktivUmschalten(p)">
                {{ p.aktiv ? 'Deaktivieren' : 'Aktivieren' }}
              </button>
              <button class="btn btn-danger btn-sm" @click="loeschen(p)">Löschen</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
