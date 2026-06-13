<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useDatenStore } from '../../application/store';
import type { Abwesenheit, AbwesenheitsTyp, Person } from '../../domain/types';
import { personName } from '../../domain/types';
import { ABWESENHEITS_TYPEN } from '../../domain/person';
import { ersterTagNaechsterMonat, heuteISO } from '../../domain/datum';
import AppModal from './AppModal.vue';
import AppIcon from './AppIcon.vue';
import { personFarbe } from '../farben';
import { zeigeToast } from '../toast';

const emit = defineEmits<{ schliessen: [] }>();

const store = useDatenStore();

// Arbeitskopie je Person, damit erst „Speichern" übernimmt.
const entwurf = reactive<Record<string, Abwesenheit[]>>(
  Object.fromEntries(
    store.personen.map((p) => [p.id, p.abwesenheiten.map((a) => ({ ...a }))]),
  ),
);

const personen = computed<Person[]>(() =>
  [...store.personen].sort((a, b) => personName(a).localeCompare(personName(b), 'de')),
);

// IDs, deren Datum bewusst gesetzt wurde — diese werden beim Typ-Wechsel
// nicht automatisch überschrieben. Bestehende Einträge zählen von Anfang an dazu.
const manuellGesetzt = reactive(
  new Set<string>(store.personen.flatMap((p) => p.abwesenheiten.map((a) => a.id))),
);

/** Krank → aktueller Monat (heute); sonst → erster Tag des nächsten Monats. */
function standardDatumFuerTyp(typ: AbwesenheitsTyp): string {
  return typ === 'krank' ? heuteISO() : ersterTagNaechsterMonat();
}

function neueAbwesenheit(personId: string) {
  // Neue Zeile startet als Urlaub → Vorbelegung „nächster Monat".
  const datum = standardDatumFuerTyp('urlaub');
  entwurf[personId].push({ id: crypto.randomUUID(), typ: 'urlaub', von: datum, bis: datum });
}

/** Datum dem Typ anpassen — außer der Nutzer hat es schon selbst geändert. */
function typGeaendert(a: Abwesenheit) {
  if (manuellGesetzt.has(a.id)) return;
  const datum = standardDatumFuerTyp(a.typ);
  a.von = datum;
  a.bis = datum;
}

function entfernen(personId: string, id: string) {
  entwurf[personId] = entwurf[personId].filter((a) => a.id !== id);
}

function ungueltig(a: Abwesenheit): boolean {
  return a.von !== '' && a.bis !== '' && a.von > a.bis;
}

const speicherbar = computed(() =>
  Object.values(entwurf).every((liste) =>
    liste.every((a) => a.von !== '' && a.bis !== '' && !ungueltig(a)),
  ),
);

async function speichern() {
  if (!speicherbar.value) return;
  for (const p of store.personen) {
    const neu = entwurf[p.id] ?? [];
    const alt = p.abwesenheiten;
    // Nur schreiben, wenn sich etwas geändert hat.
    if (JSON.stringify(neu) !== JSON.stringify(alt)) {
      await store.personAbwesenheitenSetzen(p.id, neu);
    }
  }
  zeigeToast('Abwesenheiten gespeichert');
  emit('schliessen');
}
</script>

<template>
  <AppModal titel="Abwesenheiten" :breite="640" @schliessen="emit('schliessen')">
    <p class="form-hint">
      Urlaub, Krankheit, Fortbildung oder Wunsch-frei. Abwesende Personen werden
      an diesen Tagen nicht eingeplant (Grenztage inklusive).
    </p>

    <p v-if="personen.length === 0" class="empty-state">
      Noch keine Personen angelegt.
    </p>

    <div v-for="p in personen" :key="p.id" class="abwesenheit-person">
      <div class="abwesenheit-person-kopf">
        <span class="person-punkt" :style="{ background: personFarbe(p.id) }"></span>
        <strong>{{ personName(p) }}</strong>
        <span v-if="!p.aktiv" class="badge badge-gray">inaktiv</span>
        <button type="button" class="btn btn-secondary btn-sm abwesenheit-add" @click="neueAbwesenheit(p.id)">
          <AppIcon name="plus" :groesse="14" />
          Zeitraum
        </button>
      </div>

      <p v-if="entwurf[p.id].length === 0" class="abwesenheit-leer">Keine Abwesenheiten.</p>

      <div v-for="a in entwurf[p.id]" :key="a.id" class="abwesenheit-row">
        <select v-model="a.typ" aria-label="Typ" @change="typGeaendert(a)">
          <option v-for="t in ABWESENHEITS_TYPEN" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select>
        <input v-model="a.von" type="date" required aria-label="Von" @change="manuellGesetzt.add(a.id)" />
        <span class="abwesenheit-bis">bis</span>
        <input v-model="a.bis" type="date" required aria-label="Bis" @change="manuellGesetzt.add(a.id)" />
        <button
          type="button"
          class="btn btn-ghost-danger btn-sm"
          title="Zeitraum entfernen"
          @click="entfernen(p.id, a.id)"
        >
          <AppIcon name="x" :groesse="14" />
        </button>
        <span v-if="ungueltig(a)" class="form-error">„Von" liegt nach „Bis"</span>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-primary" :disabled="!speicherbar" @click="speichern">
        <AppIcon name="check" />
        Speichern
      </button>
      <button type="button" class="btn btn-secondary" @click="emit('schliessen')">
        Abbrechen
      </button>
    </div>
  </AppModal>
</template>
