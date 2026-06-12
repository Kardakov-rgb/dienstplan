<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDatenStore } from '../../application/store';
import type { Person } from '../../domain/types';
import { personName } from '../../domain/types';
import { DIENSTARTEN } from '../../domain/dienste';
import { abwesenheitsLabel, machtIrgendeinenDienst } from '../../domain/person';
import { formatDatum } from '../../domain/datum';
import PersonForm from '../components/PersonForm.vue';
import AppModal from '../components/AppModal.vue';
import AppIcon from '../components/AppIcon.vue';
import { frageBestaetigung } from '../dialog';
import { zeigeToast } from '../toast';
import { personFarbe } from '../farben';

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
  zeigeToast(p.aktiv ? `${personName(p)} ist jetzt aktiv` : `${personName(p)} ist jetzt inaktiv`, 'info');
}

async function loeschen(p: Person) {
  const ok = await frageBestaetigung({
    titel: 'Person löschen?',
    text:
      `${personName(p)} wird dauerhaft gelöscht — inklusive aller zugewiesenen Dienste.\n\n` +
      `Soll die Person nur nicht mehr verplant werden, ist „Deaktivieren" die bessere Wahl.`,
    bestaetigenText: 'Endgültig löschen',
    gefaehrlich: true,
  });
  if (!ok) return;
  await store.personLoeschen(p.id);
  zeigeToast('Person gelöscht', 'info');
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
      <button class="btn btn-primary" @click="neuePerson">
        <AppIcon name="plus" />
        Person hinzufügen
      </button>
    </div>
  </div>

  <AppModal
    v-if="formularSichtbar"
    :titel="bearbeitetePerson ? 'Person bearbeiten' : 'Neue Person'"
    :breite="640"
    @schliessen="formularSichtbar = false"
  >
    <PersonForm
      :key="bearbeitetePerson?.id ?? 'neu'"
      :person="bearbeitetePerson"
      @gespeichert="formularSichtbar = false"
      @abgebrochen="formularSichtbar = false"
    />
  </AppModal>

  <div class="card">
    <div v-if="sichtbarePersonen.length === 0" class="empty-state">
      <strong>Noch keine Personen angelegt.</strong><br />
      Lege zuerst dein Team an — mit Soll/Max je Dienstart und Abwesenheiten.
      Danach kann der Dienstplan generiert werden.<br />
      <button class="btn btn-primary" @click="neuePerson">
        <AppIcon name="plus" />
        Erste Person anlegen
      </button>
    </div>

    <div v-else class="tabelle-scroll">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th v-for="d in DIENSTARTEN" :key="d.id" title="Soll / Max pro Monat">
              {{ d.name }}
            </th>
            <th>Abwesenheiten</th>
            <th>Status</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in sichtbarePersonen" :key="p.id" :class="{ 'zeile-inaktiv': !p.aktiv }">
            <td>
              <span class="person-punkt" :style="{ background: personFarbe(p.id) }"></span>
              {{ personName(p) }}
              <span
                v-if="p.vollzeit"
                class="badge badge-blue"
                title="Vollzeitkraft: monatlicher Wechsel der Wochenend-Muster"
              >
                VZ
              </span>
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
                <button class="btn btn-secondary btn-sm" @click="bearbeiten(p)">
                  <AppIcon name="stift" :groesse="14" />
                  Bearbeiten
                </button>
                <button class="btn btn-secondary btn-sm" @click="aktivUmschalten(p)">
                  <AppIcon :name="p.aktiv ? 'pause' : 'abspielen'" :groesse="14" />
                  {{ p.aktiv ? 'Deaktivieren' : 'Aktivieren' }}
                </button>
                <button class="btn btn-ghost-danger btn-sm" title="Löschen" @click="loeschen(p)">
                  <AppIcon name="papierkorb" :groesse="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
