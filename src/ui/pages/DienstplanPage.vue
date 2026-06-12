<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useDatenStore } from '../../application/store';
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
import { personKuerzel } from '../../domain/person';
import { personName } from '../../domain/types';
import type { DienstartId, ISODate } from '../../domain/types';
import { harteVerstoesse } from '../../domain/rules';
import type { GenerierungsErgebnis } from '../../domain/generator/generator';
import { dienstart, istGenerierbar } from '../../domain/dienste';
import { formatDatum } from '../../domain/datum';
import ZuweisungsPanel from '../components/ZuweisungsPanel.vue';
import { HANDY_BREITE, useMediaQuery } from '../useMediaQuery';

const store = useDatenStore();

/** Handy-Ansicht: Tage als Zeilen statt 31 Spalten. */
const istSchmal = useMediaQuery(HANDY_BREITE);

const heute = new Date();
const jahr = ref(heute.getFullYear());
const monat = ref(heute.getMonth() + 1);

const tage = computed(() => monatsTage(jahr.value, monat.value));
const monatsLabel = computed(() => `${MONATS_NAMEN[monat.value - 1]} ${jahr.value}`);

/** Angeklickte Zelle, deren Besetzung gerade bearbeitet wird. */
const auswahl = ref<{ datum: ISODate; dienstartId: DienstartId } | null>(null);

/** Bericht der letzten Generierung (verschwindet bei Monatswechsel). */
const bericht = ref<GenerierungsErgebnis | null>(null);

async function generieren() {
  if (store.aktivePersonen.length === 0) {
    alert('Bitte zuerst aktive Personen mit Soll/Max-Werten anlegen.');
    return;
  }
  auswahl.value = null;
  bericht.value = await store.monatGenerieren(jahr.value, monat.value);
}

async function monatLeeren() {
  const frage =
    `Wirklich ALLE Dienste im ${monatsLabel.value} entfernen?\n\n` +
    `Auch von Hand gesetzte (fixierte) Einträge werden gelöscht.`;
  if (!confirm(frage)) return;
  auswahl.value = null;
  bericht.value = null;
  await store.monatLeeren(jahr.value, monat.value);
}

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
  auswahl.value = null;
  bericht.value = null;
}

/** Zelleninfo für die Darstellung (Besetzung, Verstöße, Markierungen). */
function zellInfo(datum: ISODate, dienstartId: DienstartId) {
  const z = store.zuweisungFuer(datum, dienstartId);
  if (!z) return { zuweisung: undefined, person: undefined, verstoesse: [] };
  const person = store.person(z.personId);
  const ohneDieseZelle = store.zuweisungen.filter((x) => x.id !== z.id);
  const verstoesse = person
    ? harteVerstoesse({ person, datum, dienstartId }, { zuweisungen: ohneDieseZelle })
    : [];
  return { zuweisung: z, person, verstoesse };
}

function tagKlassen(datum: ISODate): string[] {
  const klassen: string[] = [];
  if (istWochenende(datum)) klassen.push('tag-wochenende');
  if (feiertagsName(datum)) klassen.push('tag-feiertag');
  return klassen;
}

function zellKlassen(datum: ISODate, dienstartId: DienstartId): string[] {
  const dienst = DIENSTARTEN.find((d) => d.id === dienstartId)!;
  if (!dienst.findetStattAm(datum)) return [...tagKlassen(datum), 'zelle-aus'];

  const klassen = [...tagKlassen(datum), 'zelle-offen'];
  const info = zellInfo(datum, dienstartId);
  if (!info.zuweisung) {
    klassen.push(istGenerierbar(dienst, datum) ? 'zelle-unbesetzt' : 'zelle-optional');
  }
  else if (info.verstoesse.length > 0) klassen.push('zelle-verstoss');
  if (auswahl.value?.datum === datum && auswahl.value?.dienstartId === dienstartId) {
    klassen.push('zelle-ausgewaehlt');
  }
  return klassen;
}

function zellTitel(datum: ISODate, dienstartId: DienstartId): string {
  const teile: string[] = [];
  const feiertag = feiertagsName(datum);
  if (feiertag) teile.push(feiertag);
  const dienst = DIENSTARTEN.find((d) => d.id === dienstartId)!;
  const info = zellInfo(datum, dienstartId);
  if (info.person) teile.push(personName(info.person));
  else if (!istGenerierbar(dienst, datum)) teile.push('i.d.R. kein Dienst — nur manuell besetzbar');
  else teile.push('unbesetzt');
  for (const v of info.verstoesse) teile.push(`⚠ ${v.meldung}`);
  return teile.join('\n');
}

function zelleKlick(datum: ISODate, dienstartId: DienstartId) {
  const dienst = DIENSTARTEN.find((d) => d.id === dienstartId)!;
  if (!dienst.findetStattAm(datum)) return;
  const istGleicheZelle =
    auswahl.value?.datum === datum && auswahl.value?.dienstartId === dienstartId;
  auswahl.value = istGleicheZelle ? null : { datum, dienstartId };
  if (auswahl.value) {
    // Das Panel steht über der Tabelle — besonders am Handy dorthin scrollen.
    void nextTick(() => {
      document.querySelector('.zuweisungs-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }
}

const anzahlUnbesetzt = computed(
  () =>
    tage.value.flatMap((tag) =>
      DIENSTARTEN.filter(
        (d) => istGenerierbar(d, tag) && !store.zuweisungFuer(tag, d.id),
      ),
    ).length,
);

function istOptional(datum: ISODate, dienstartId: DienstartId): boolean {
  const dienst = DIENSTARTEN.find((d) => d.id === dienstartId)!;
  return dienst.findetStattAm(datum) && !istGenerierbar(dienst, datum);
}

watch([() => store.personen.length], () => {
  // Wird die letzte Person gelöscht, wäre das Panel verwaist.
  if (store.aktivePersonen.length === 0) auswahl.value = null;
});
</script>

<template>
  <div class="page-header">
    <h1>Dienstplan</h1>
    <div class="page-header-controls">
      <span v-if="anzahlUnbesetzt > 0" class="badge badge-red">
        {{ anzahlUnbesetzt }} unbesetzt
      </span>
      <button class="btn btn-secondary" @click="monatWechseln(-1)">&#8249;</button>
      <span class="week-label">{{ monatsLabel }}</span>
      <button class="btn btn-secondary" @click="monatWechseln(1)">&#8250;</button>
      <button class="btn btn-primary" @click="generieren">⚙ Plan generieren</button>
      <button class="btn btn-danger" @click="monatLeeren">Monat leeren</button>
    </div>
  </div>

  <div v-if="bericht" class="card generierungs-bericht">
    <div class="zuweisungs-kopf">
      <h2>Ergebnis der Generierung</h2>
      <button class="btn btn-secondary btn-sm" @click="bericht = null">Schließen</button>
    </div>
    <p>
      <strong>{{ bericht.neu.length }}</strong> Dienste besetzt,
      <strong :class="{ 'bericht-luecken': bericht.luecken.length > 0 }">
        {{ bericht.luecken.length }}
      </strong>
      Lücken.
    </p>
    <div v-for="luecke in bericht.luecken" :key="`${luecke.datum}-${luecke.dienstartId}`" class="bericht-luecke">
      <strong>
        {{ dienstart(luecke.dienstartId).name }} am {{ formatDatum(luecke.datum) }} — niemand verfügbar:
      </strong>
      <ul>
        <li v-for="grund in luecke.gruende" :key="grund.personName">
          {{ grund.personName }}: {{ grund.meldungen.join(' · ') }}
        </li>
      </ul>
    </div>
  </div>

  <ZuweisungsPanel
    v-if="auswahl"
    :key="`${auswahl.datum}-${auswahl.dienstartId}`"
    :datum="auswahl.datum"
    :dienstart-id="auswahl.dienstartId"
    @schliessen="auswahl = null"
  />

  <div class="card">
    <!-- Breite Ansicht: Dienste als Zeilen, Tage als Spalten -->
    <div v-if="!istSchmal" class="calendar-grid-wrapper">
      <table class="plan-table">
        <thead>
          <tr>
            <th class="plan-dienst-col">Dienst</th>
            <th
              v-for="tag in tage"
              :key="tag"
              :class="tagKlassen(tag)"
              :title="feiertagsName(tag) ?? undefined"
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
              :class="zellKlassen(tag, dienst.id)"
              :title="dienst.findetStattAm(tag) ? zellTitel(tag, dienst.id) : (feiertagsName(tag) ?? undefined)"
              @click="zelleKlick(tag, dienst.id)"
            >
              <template v-if="!dienst.findetStattAm(tag)">
                <span class="zelle-aus-marker">–</span>
              </template>
              <template v-else-if="zellInfo(tag, dienst.id).person">
                <span class="zelle-kuerzel">{{ personKuerzel(zellInfo(tag, dienst.id).person!) }}</span>
                <span v-if="zellInfo(tag, dienst.id).verstoesse.length > 0" class="zelle-warnung">⚠</span>
              </template>
              <template v-else-if="istOptional(tag, dienst.id)">
                <span class="zelle-optional-marker">·</span>
              </template>
              <template v-else>
                <span class="zelle-unbesetzt-marker">!</span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Handy-Ansicht: Tage als Zeilen, Dienste als Spalten -->
    <table v-else class="plan-table plan-table-mobil">
      <thead>
        <tr>
          <th class="plan-tag-col">Tag</th>
          <th v-for="dienst in DIENSTARTEN" :key="dienst.id" :title="dienst.name">
            {{ dienst.kuerzel }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tag in tage" :key="tag">
          <td class="plan-tag-col" :class="tagKlassen(tag)" :title="feiertagsName(tag) ?? undefined">
            {{ WOCHENTAG_KURZ[wochentag(tag)] }} {{ String(zerlege(tag).tag).padStart(2, '0') }}.
            <span v-if="feiertagsName(tag)" class="plan-feiertag-punkt" aria-hidden="true">•</span>
          </td>
          <td
            v-for="dienst in DIENSTARTEN"
            :key="dienst.id"
            :class="zellKlassen(tag, dienst.id)"
            :title="dienst.findetStattAm(tag) ? zellTitel(tag, dienst.id) : (feiertagsName(tag) ?? undefined)"
            @click="zelleKlick(tag, dienst.id)"
          >
            <template v-if="!dienst.findetStattAm(tag)">
              <span class="zelle-aus-marker">–</span>
            </template>
            <template v-else-if="zellInfo(tag, dienst.id).person">
              <span class="zelle-kuerzel">{{ personKuerzel(zellInfo(tag, dienst.id).person!) }}</span>
              <span v-if="zellInfo(tag, dienst.id).verstoesse.length > 0" class="zelle-warnung">⚠</span>
            </template>
            <template v-else-if="istOptional(tag, dienst.id)">
              <span class="zelle-optional-marker">·</span>
            </template>
            <template v-else>
              <span class="zelle-unbesetzt-marker">!</span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="plan-legende">
      <span class="legende-item"><span class="legende-farbe tag-wochenende"></span> Wochenende</span>
      <span class="legende-item"><span class="legende-farbe tag-feiertag"></span> Feiertag (NRW)</span>
      <span class="legende-item"><span class="legende-farbe zelle-aus"></span> Dienst findet nicht statt</span>
      <span class="legende-item"><span class="legende-farbe zelle-unbesetzt"></span> unbesetzt</span>
      <span class="legende-item"><span class="legende-farbe zelle-optional"></span> nur manuell (z.B. Feiertags-Visite)</span>
      <span class="legende-item">⚠ Regelverstoß</span>
    </p>
    <p class="form-hint">
      Zelle anklicken, um die Besetzung zu bearbeiten. Kürzel = Initialen der Person
      (vollständiger Name im Tooltip).
    </p>
  </div>
</template>
