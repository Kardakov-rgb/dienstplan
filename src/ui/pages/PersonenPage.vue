<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useDatenStore } from '../../application/store';
import type { Person } from '../../domain/types';
import { personName } from '../../domain/types';

const store = useDatenStore();

const formularSichtbar = ref(false);
const bearbeiteteId = ref<string | null>(null);
const formular = reactive({
  vorname: '',
  nachname: '',
  rolle: 'Mitarbeiter' as Person['rolle'],
  wochenstunden: '' as string | number,
});

const rollenBadge: Record<Person['rolle'], string> = {
  Teamleiter: 'badge-blue',
  Mitarbeiter: 'badge-green',
  Azubi: 'badge-orange',
};

function neuePerson() {
  bearbeiteteId.value = null;
  formular.vorname = '';
  formular.nachname = '';
  formular.rolle = 'Mitarbeiter';
  formular.wochenstunden = '';
  formularSichtbar.value = true;
}

function bearbeiten(p: Person) {
  bearbeiteteId.value = p.id;
  formular.vorname = p.vorname;
  formular.nachname = p.nachname;
  formular.rolle = p.rolle;
  formular.wochenstunden = p.wochenstunden ?? '';
  formularSichtbar.value = true;
}

async function speichern() {
  await store.personSpeichern({
    id: bearbeiteteId.value ?? undefined,
    vorname: formular.vorname.trim(),
    nachname: formular.nachname.trim(),
    rolle: formular.rolle,
    wochenstunden: formular.wochenstunden === '' ? null : Number(formular.wochenstunden),
  });
  formularSichtbar.value = false;
}

async function loeschen(p: Person) {
  if (!confirm(`${personName(p)} wirklich löschen?`)) return;
  await store.personLoeschen(p.id);
}
</script>

<template>
  <div class="page-header">
    <h1>Personen</h1>
    <button class="btn btn-primary" @click="neuePerson">+ Person hinzufügen</button>
  </div>

  <div v-if="formularSichtbar" class="card">
    <h2>{{ bearbeiteteId ? 'Person bearbeiten' : 'Neue Person' }}</h2>
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
      <div class="form-row">
        <div class="form-group">
          <label for="person-rolle">Rolle</label>
          <select id="person-rolle" v-model="formular.rolle">
            <option>Mitarbeiter</option>
            <option>Teamleiter</option>
            <option>Azubi</option>
          </select>
        </div>
        <div class="form-group">
          <label for="person-stunden">Wochenstunden</label>
          <input id="person-stunden" v-model="formular.wochenstunden" type="number" min="1" max="60" />
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Speichern</button>
        <button type="button" class="btn btn-secondary" @click="formularSichtbar = false">Abbrechen</button>
      </div>
    </form>
  </div>

  <div class="card">
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Rolle</th>
          <th>Wochenstunden</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="store.personen.length === 0">
          <td colspan="4" class="empty-state">Noch keine Personen angelegt.</td>
        </tr>
        <tr v-for="p in store.personen" :key="p.id">
          <td>{{ personName(p) }}</td>
          <td><span class="badge" :class="rollenBadge[p.rolle]">{{ p.rolle }}</span></td>
          <td>{{ p.wochenstunden ? p.wochenstunden + ' h/Woche' : '–' }}</td>
          <td>
            <div class="btn-group">
              <button class="btn btn-secondary btn-sm" @click="bearbeiten(p)">Bearbeiten</button>
              <button class="btn btn-danger btn-sm" @click="loeschen(p)">Löschen</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
