<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useDatenStore } from '../../application/store';
import type { Abwesenheit, DienstartId, DienstHaeufigkeit, Person } from '../../domain/types';
import { DIENSTARTEN } from '../../domain/dienste';
import { ABWESENHEITS_TYPEN, leereHaeufigkeiten } from '../../domain/person';

const props = defineProps<{ person: Person | null }>();
const emit = defineEmits<{ gespeichert: []; abgebrochen: [] }>();

const store = useDatenStore();

function initialeHaeufigkeiten(): Record<DienstartId, DienstHaeufigkeit> {
  const basis = leereHaeufigkeiten();
  if (props.person) {
    for (const d of DIENSTARTEN) {
      basis[d.id] = { ...props.person.haeufigkeiten[d.id] };
    }
  }
  return basis;
}

const formular = reactive({
  vorname: props.person?.vorname ?? '',
  nachname: props.person?.nachname ?? '',
  vollzeit: props.person?.vollzeit ?? false,
  haeufigkeiten: initialeHaeufigkeiten(),
  abwesenheiten: (props.person?.abwesenheiten ?? []).map((a) => ({ ...a })) as Abwesenheit[],
});

function neueAbwesenheit() {
  formular.abwesenheiten.push({ id: crypto.randomUUID(), typ: 'urlaub', von: '', bis: '' });
}

function abwesenheitEntfernen(id: string) {
  formular.abwesenheiten = formular.abwesenheiten.filter((a) => a.id !== id);
}

const haeufigkeitsFehler = computed(() =>
  DIENSTARTEN.filter((d) => {
    const h = formular.haeufigkeiten[d.id];
    return h.soll > h.maximum;
  }).map((d) => d.name),
);

function abwesenheitUngueltig(a: Abwesenheit): boolean {
  return a.von !== '' && a.bis !== '' && a.von > a.bis;
}

const abwesenheitsFehler = computed(() => formular.abwesenheiten.some(abwesenheitUngueltig));

const speicherbar = computed(
  () =>
    haeufigkeitsFehler.value.length === 0 &&
    !abwesenheitsFehler.value &&
    formular.abwesenheiten.every((a) => a.von !== '' && a.bis !== ''),
);

async function speichern() {
  if (!speicherbar.value) return;
  await store.personSpeichern({
    id: props.person?.id,
    vorname: formular.vorname.trim(),
    nachname: formular.nachname.trim(),
    vollzeit: formular.vollzeit,
    aktiv: props.person?.aktiv ?? true,
    haeufigkeiten: formular.haeufigkeiten,
    abwesenheiten: formular.abwesenheiten,
  });
  emit('gespeichert');
}
</script>

<template>
  <div class="card">
    <h2>{{ person ? 'Person bearbeiten' : 'Neue Person' }}</h2>
    <form @submit.prevent="speichern">
      <div class="form-row">
        <div class="form-group">
          <label for="person-vorname">Vorname</label>
          <input id="person-vorname" v-model="formular.vorname" type="text" required />
        </div>
        <div class="form-group">
          <label for="person-nachname">Nachname</label>
          <input id="person-nachname" v-model="formular.nachname" type="text" required />
        </div>
      </div>

      <label class="checkbox-label" style="margin-bottom: .25rem">
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

      <h3 class="form-section-title">Abwesenheiten</h3>
      <div v-for="a in formular.abwesenheiten" :key="a.id" class="abwesenheit-row">
        <select v-model="a.typ" :aria-label="'Typ'">
          <option v-for="t in ABWESENHEITS_TYPEN" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select>
        <input v-model="a.von" type="date" required :aria-label="'Von'" />
        <span class="abwesenheit-bis">bis</span>
        <input v-model="a.bis" type="date" required :aria-label="'Bis'" />
        <button
          type="button"
          class="btn btn-danger btn-sm"
          title="Abwesenheit entfernen"
          @click="abwesenheitEntfernen(a.id)"
        >
          ✕
        </button>
        <span v-if="abwesenheitUngueltig(a)" class="form-error">„Von" liegt nach „Bis"</span>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" @click="neueAbwesenheit">
        + Abwesenheit
      </button>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="!speicherbar">Speichern</button>
        <button type="button" class="btn btn-secondary" @click="emit('abgebrochen')">
          Abbrechen
        </button>
      </div>
    </form>
  </div>
</template>
