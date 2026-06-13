<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useDatenStore } from '../../application/store';
import type { DienstartId, DienstHaeufigkeit, Person } from '../../domain/types';
import { DIENSTARTEN } from '../../domain/dienste';
import { leereHaeufigkeiten, vollzeitHaeufigkeiten } from '../../domain/person';
import { zeigeToast } from '../toast';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ person: Person | null }>();
const emit = defineEmits<{ gespeichert: []; abgebrochen: [] }>();

const store = useDatenStore();

// Neue Personen sind standardmäßig Vollzeit.
const istVollzeitStandard = props.person?.vollzeit ?? true;

function initialeHaeufigkeiten(): Record<DienstartId, DienstHaeufigkeit> {
  if (props.person) {
    const basis = leereHaeufigkeiten();
    for (const d of DIENSTARTEN) {
      basis[d.id] = { ...props.person.haeufigkeiten[d.id] };
    }
    return basis;
  }
  // Neue Person: passend zur Vollzeit-Vorauswahl vorbelegen.
  return istVollzeitStandard ? vollzeitHaeufigkeiten() : leereHaeufigkeiten();
}

const formular = reactive({
  name: props.person?.name ?? '',
  vollzeit: istVollzeitStandard,
  haeufigkeiten: initialeHaeufigkeiten(),
});

// Beim Umschalten von „Vollzeit" die Soll/Max-Werte neu vorbelegen.
// Greift nur bei echter Nutzer-Änderung (kein immediate), Bestandswerte
// bleiben beim Öffnen unangetastet.
watch(
  () => formular.vollzeit,
  (vollzeit) => {
    formular.haeufigkeiten = vollzeit ? vollzeitHaeufigkeiten() : leereHaeufigkeiten();
  },
);

const haeufigkeitsFehler = computed(() =>
  DIENSTARTEN.filter((d) => {
    const h = formular.haeufigkeiten[d.id];
    return h.soll > h.maximum;
  }).map((d) => d.name),
);

const speicherbar = computed(
  () => formular.name.trim() !== '' && haeufigkeitsFehler.value.length === 0,
);

async function speichern() {
  if (!speicherbar.value) return;
  await store.personSpeichern({
    id: props.person?.id,
    name: formular.name.trim(),
    vollzeit: formular.vollzeit,
    aktiv: props.person?.aktiv ?? true,
    haeufigkeiten: formular.haeufigkeiten,
    // Abwesenheiten werden auf der Dienstplan-Seite verwaltet — hier unverändert übernehmen.
    abwesenheiten: props.person?.abwesenheiten ?? [],
  });
  zeigeToast(props.person ? 'Person aktualisiert' : 'Person angelegt');
  emit('gespeichert');
}
</script>

<template>
  <form @submit.prevent="speichern">
      <div class="form-group">
        <label for="person-name">Name</label>
        <input id="person-name" v-model="formular.name" type="text" required autofocus />
      </div>

      <label class="checkbox-label" style="margin-top: .75rem; margin-bottom: .25rem">
        <input v-model="formular.vollzeit" type="checkbox" />
        Vollzeitkraft — monatlicher Wechsel der Wochenend-Muster
        (VG&nbsp;Freitag+Sonntag&nbsp;↔&nbsp;VG&nbsp;Samstag)
      </label>

      <h3 class="form-section-title">Dienste pro Monat</h3>
      <p class="form-hint">
        <strong>Soll</strong> = Zielwert, den der Generator anstrebt.
        <strong>Max</strong> = harte Obergrenze. Max&nbsp;0 = macht diesen Dienst nicht.
      </p>
      <div class="haeufigkeit-grid">
        <template v-for="d in DIENSTARTEN" :key="d.id">
          <span class="haeufigkeit-name">{{ d.name }}</span>
          <label :for="`soll-${d.id}`">Soll</label>
          <input
            :id="`soll-${d.id}`"
            v-model.number="formular.haeufigkeiten[d.id].soll"
            type="number"
            min="0"
            max="31"
            required
          />
          <label :for="`max-${d.id}`">Max</label>
          <input
            :id="`max-${d.id}`"
            v-model.number="formular.haeufigkeiten[d.id].maximum"
            type="number"
            min="0"
            max="31"
            required
          />
        </template>
      </div>
      <p v-if="haeufigkeitsFehler.length > 0" class="form-error">
        Soll darf das Maximum nicht überschreiten: {{ haeufigkeitsFehler.join(', ') }}
      </p>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="!speicherbar">
          <AppIcon name="check" />
          Speichern
        </button>
        <button type="button" class="btn btn-secondary" @click="emit('abgebrochen')">
          Abbrechen
        </button>
      </div>
  </form>
</template>
