<script setup lang="ts">
import { computed } from 'vue';
import { useDatenStore } from '../../application/store';
import type { DienstartId, ISODate, Person } from '../../domain/types';
import { personName } from '../../domain/types';
import { dienstart } from '../../domain/dienste';
import { harteVerstoesse } from '../../domain/rules';
import { WOCHENTAG_KURZ, addiereTage, formatDatum, wochentag, zerlege } from '../../domain/datum';
import { zaehleDienste, einsatzWochenenden } from '../../domain/zaehlung';
import AppModal from './AppModal.vue';
import AppIcon from './AppIcon.vue';
import { frageBestaetigung } from '../dialog';
import { personFarbe } from '../farben';

const props = defineProps<{ datum: ISODate; dienstartId: DienstartId }>();
const emit = defineEmits<{ schliessen: [] }>();

const store = useDatenStore();

const dienst = computed(() => dienstart(props.dienstartId));
const titel = computed(
  () => `${dienst.value.name} · ${WOCHENTAG_KURZ[wochentag(props.datum)]}, ${formatDatum(props.datum)}`,
);

const aktuelleZuweisung = computed(() => store.zuweisungFuer(props.datum, props.dienstartId));
const aktuellePerson = computed(() =>
  aktuelleZuweisung.value ? store.person(aktuelleZuweisung.value.personId) : undefined,
);

/** Aktueller Monat der Zelle für Ist/Soll-Berechnung. */
const zellMonat = computed(() => {
  const { jahr, monat } = zerlege(props.datum);
  return { jahr, monat };
});

const kandidaten = computed(() => {
  // Die eigene Zelle zählt beim Prüfen nicht mit, sonst „verstößt" jedes Umbesetzen.
  const ohneDieseZelle = store.zuweisungen.filter(
    (z) => !(z.datum === props.datum && z.dienstartId === props.dienstartId),
  );
  return store.aktivePersonen
    .map((person) => {
      const verstoesse = harteVerstoesse(
        { person, datum: props.datum, dienstartId: props.dienstartId },
        { zuweisungen: ohneDieseZelle },
      );
      // Ist: Anzahl Dienste dieser Dienstart diesen Monat
      const ist = zaehleDienste(
        person.id,
        props.dienstartId,
        store.zuweisungen,
        zellMonat.value,
      );
      // Soll laut Einstellung
      const soll = person.haeufigkeiten[props.dienstartId]?.soll ?? 0;
      // Wochenend-Einsätze diesen Monat
      const weAnzahl = einsatzWochenenden(
        person.id,
        store.zuweisungen,
        zellMonat.value.jahr,
        zellMonat.value.monat,
      ).size;
      return { person, verstoesse, ist, soll, weAnzahl };
    })
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
    const ganzesWochenende = await frageBestaetigung({
      titel: 'Ganzes Wochenende?',
      text:
        `Der Visitendienst wird am Wochenende normalerweise von derselben Person übernommen.\n\n` +
        `${personName(person)} auch am ${partnerLabel} eintragen?`,
      bestaetigenText: 'Ganzes Wochenende',
      abbrechenText: 'Nur diesen Tag',
    });
    if (ganzesWochenende) {
      await store.zuweisungSetzen(partnerTag.value, props.dienstartId, person.id);
    }
  }
  emit('schliessen');
}

async function entfernen() {
  await store.zuweisungEntfernen(props.datum, props.dienstartId);
  emit('schliessen');
}

async function fixierenToggle() {
  await store.zuweisungFixierenToggle(props.datum, props.dienstartId);
}
</script>

<template>
  <AppModal :titel="titel" :breite="560" @schliessen="emit('schliessen')">
    <p v-if="aktuellePerson" class="zuweisungs-aktuell">
      <span>
        <span class="person-punkt" :style="{ background: personFarbe(aktuellePerson.id) }"></span>
        Aktuell besetzt mit <strong>{{ personName(aktuellePerson) }}</strong>
      </span>
      <button
        class="fixiert-badge"
        :title="aktuelleZuweisung?.fixiert ? 'Fixierung aufheben — Generator darf überschreiben' : 'Fixieren — Generator überschreibt diese Zelle nicht'"
        @click="fixierenToggle"
      >
        {{ aktuelleZuweisung?.fixiert ? '📌 Fixiert' : '○ Nicht fixiert' }}
      </button>
      <button class="btn btn-ghost-danger btn-sm" @click="entfernen">
        <AppIcon name="papierkorb" :groesse="14" />
        Besetzung entfernen
      </button>
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
          <span class="person-punkt" :style="{ background: personFarbe(k.person.id) }"></span>
          {{ personName(k.person) }}
          <span v-if="k.person.id === aktuellePerson?.id">(aktuell)</span>
        </button>
        <span class="kandidat-stats" title="Ist / Soll diesen Monat">
          {{ k.ist }}/{{ k.soll }}
        </span>
        <span class="kandidat-stats" title="Wochenend-Einsätze diesen Monat">
          WE: {{ k.weAnzahl }}
        </span>
        <span v-if="k.verstoesse.length > 0" class="kandidat-warnung" role="note">
          ⚠ {{ k.verstoesse.map((v) => v.meldung).join(' · ') }}
        </span>
      </li>
    </ul>
    <p v-if="kandidaten.some((k) => k.verstoesse.length > 0)" class="form-hint">
      Mit ⚠ markierte Personen verletzen eine Regel — du kannst sie trotzdem eintragen,
      der Verstoß bleibt im Plan sichtbar.
    </p>
  </AppModal>
</template>
