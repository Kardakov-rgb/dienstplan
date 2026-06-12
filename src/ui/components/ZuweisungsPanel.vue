<script setup lang="ts">
import { computed } from 'vue';
import { useDatenStore } from '../../application/store';
import type { DienstartId, ISODate, Person } from '../../domain/types';
import { personName } from '../../domain/types';
import { dienstart } from '../../domain/dienste';
import { harteVerstoesse } from '../../domain/rules';
import { WOCHENTAG_KURZ, addiereTage, formatDatum, wochentag } from '../../domain/datum';

const props = defineProps<{ datum: ISODate; dienstartId: DienstartId }>();
const emit = defineEmits<{ schliessen: [] }>();

const store = useDatenStore();

const dienst = computed(() => dienstart(props.dienstartId));
const titel = computed(
  () => `${dienst.value.name} am ${WOCHENTAG_KURZ[wochentag(props.datum)]}, ${formatDatum(props.datum)}`,
);

const aktuelleZuweisung = computed(() => store.zuweisungFuer(props.datum, props.dienstartId));
const aktuellePerson = computed(() =>
  aktuelleZuweisung.value ? store.person(aktuelleZuweisung.value.personId) : undefined,
);

const kandidaten = computed(() => {
  // Die eigene Zelle zählt beim Prüfen nicht mit, sonst „verstößt" jedes Umbesetzen.
  const ohneDieseZelle = store.zuweisungen.filter(
    (z) => !(z.datum === props.datum && z.dienstartId === props.dienstartId),
  );
  return store.aktivePersonen
    .map((person) => ({
      person,
      verstoesse: harteVerstoesse(
        { person, datum: props.datum, dienstartId: props.dienstartId },
        { zuweisungen: ohneDieseZelle },
      ),
    }))
    .sort((a, b) => {
      const aOk = a.verstoesse.length === 0;
      const bOk = b.verstoesse.length === 0;
      if (aOk !== bOk) return aOk ? -1 : 1;
      return personName(a.person).localeCompare(personName(b.person), 'de');
    });
});

/** Sa↔So-Partnertag, falls die Zelle ein Wochenend-Visitendienst ist. */
const partnerTag = computed<ISODate | null>(() => {
  if (props.dienstartId !== 'visite') return null;
  const wt = wochentag(props.datum);
  if (wt === 6) return addiereTage(props.datum, 1);
  if (wt === 0) return addiereTage(props.datum, -1);
  return null; // Wochentags-Feiertag: kein Sa+So-Block
});

async function besetzen(person: Person) {
  await store.zuweisungSetzen(props.datum, props.dienstartId, person.id);
  if (partnerTag.value) {
    const partnerLabel = `${WOCHENTAG_KURZ[wochentag(partnerTag.value)]}, ${formatDatum(partnerTag.value)}`;
    const frage =
      `Der Visitendienst wird am Wochenende normalerweise von derselben Person übernommen.\n\n` +
      `${personName(person)} auch am ${partnerLabel} eintragen?`;
    if (confirm(frage)) {
      await store.zuweisungSetzen(partnerTag.value, props.dienstartId, person.id);
    }
  }
  emit('schliessen');
}

async function entfernen() {
  await store.zuweisungEntfernen(props.datum, props.dienstartId);
  emit('schliessen');
}
</script>

<template>
  <div class="card zuweisungs-panel">
    <div class="zuweisungs-kopf">
      <h2>{{ titel }}</h2>
      <button class="btn btn-secondary btn-sm" @click="emit('schliessen')">Schließen</button>
    </div>

    <p v-if="aktuellePerson" class="zuweisungs-aktuell">
      Aktuell besetzt mit <strong>{{ personName(aktuellePerson) }}</strong>
      <button class="btn btn-danger btn-sm" @click="entfernen">Besetzung entfernen</button>
    </p>
    <p v-else class="zuweisungs-aktuell zuweisungs-unbesetzt-hinweis">Aktuell unbesetzt.</p>

    <p v-if="kandidaten.length === 0" class="empty-state">
      Keine aktiven Personen vorhanden — bitte zuerst auf der Personen-Seite anlegen.
    </p>

    <ul v-else class="kandidaten-liste">
      <li v-for="k in kandidaten" :key="k.person.id" class="kandidat">
        <button
          class="btn btn-sm kandidat-knopf"
          :class="k.verstoesse.length === 0 ? 'btn-primary' : 'btn-secondary'"
          :disabled="k.person.id === aktuellePerson?.id"
          @click="besetzen(k.person)"
        >
          {{ personName(k.person) }}
          <span v-if="k.person.id === aktuellePerson?.id">(aktuell)</span>
        </button>
        <span v-if="k.verstoesse.length > 0" class="kandidat-warnung" role="note">
          ⚠ {{ k.verstoesse.map((v) => v.meldung).join(' · ') }}
        </span>
      </li>
    </ul>
    <p v-if="kandidaten.some((k) => k.verstoesse.length > 0)" class="form-hint">
      Mit ⚠ markierte Personen verletzen eine Regel — du kannst sie trotzdem eintragen,
      der Verstoß bleibt im Plan sichtbar.
    </p>
  </div>
</template>
