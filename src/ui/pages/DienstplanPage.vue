<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDatenStore } from '../../application/store';
import { DIENSTARTEN, dienstart, istGenerierbar } from '../../domain/dienste';
import {
  MONATS_NAMEN,
  WOCHENTAG_KURZ,
  formatDatum,
  heuteISO,
  imMonat,
  istWochenende,
  monatsTage,
  wochentag,
  zerlege,
} from '../../domain/datum';
import { feiertagsName } from '../../domain/feiertage';
import { personKuerzel } from '../../domain/person';
import { personName } from '../../domain/types';
import type { DienstartId, ISODate, Zuweisung } from '../../domain/types';
import { harteVerstoesse } from '../../domain/rules';
import type { GenerierungsErgebnis } from '../../domain/generator/generator';
import ZuweisungsPanel from '../components/ZuweisungsPanel.vue';
import AbwesenheitenDialog from '../components/AbwesenheitenDialog.vue';
import AppIcon from '../components/AppIcon.vue';
import { HANDY_BREITE, useMediaQuery } from '../useMediaQuery';
import { frageBestaetigung } from '../dialog';
import { zeigeToast } from '../toast';
import { personFarbe } from '../farben';

const store = useDatenStore();

/** Handy-Ansicht: Tage als Zeilen statt 31 Spalten. */
const istSchmal = useMediaQuery(HANDY_BREITE);

const heuteDatum = heuteISO();
const heute = new Date();
const jahr = ref(heute.getFullYear());
const monat = ref(heute.getMonth() + 1);

const tage = computed(() => monatsTage(jahr.value, monat.value));
const monatsLabel = computed(() => `${MONATS_NAMEN[monat.value - 1]} ${jahr.value}`);

/** Angeklickte Zelle, deren Besetzung gerade bearbeitet wird. */
const auswahl = ref<{ datum: ISODate; dienstartId: DienstartId } | null>(null);

/** Bericht der letzten Generierung (verschwindet bei Monatswechsel). */
const bericht = ref<GenerierungsErgebnis | null>(null);

const generiertGerade = ref(false);

/** Hervorgehobene Person in der Legende (null = keine Filterung). */
const hervorgehobenePerson = ref<string | null>(null);

/** Abwesenheiten-Dialog sichtbar? */
const abwesenheitenOffen = ref(false);

async function generieren() {
  if (store.aktivePersonen.length === 0) {
    zeigeToast('Bitte zuerst aktive Personen mit Soll/Max-Werten anlegen.', 'fehler');
    return;
  }
  auswahl.value = null;
  generiertGerade.value = true;
  const snapshot: Zuweisung[] = [...store.zuweisungen];
  try {
    bericht.value = await store.monatGenerieren(jahr.value, monat.value);
    const { neu, luecken } = bericht.value;
    zeigeToast(
      luecken.length === 0
        ? `Plan generiert — ${neu.length} Dienste besetzt`
        : `${neu.length} Dienste besetzt, ${luecken.length} Lücken — Details im Bericht`,
      luecken.length === 0 ? 'erfolg' : 'info',
      {
        label: 'Rückgängig',
        ausfuehren: () => {
          store.zuweisungenWiederherstellen(snapshot);
          bericht.value = null;
          zeigeToast('Generierung rückgängig gemacht', 'info');
        },
      },
    );
  } finally {
    generiertGerade.value = false;
  }
}

async function neuVerteilen() {
  if (store.aktivePersonen.length === 0) {
    zeigeToast('Bitte zuerst aktive Personen mit Soll/Max-Werten anlegen.', 'fehler');
    return;
  }
  auswahl.value = null;
  generiertGerade.value = true;
  const snapshot: Zuweisung[] = [...store.zuweisungen];
  try {
    bericht.value = await store.neuVerteilen(jahr.value, monat.value);
    const { neu, luecken } = bericht.value;
    zeigeToast(
      luecken.length === 0
        ? `Neu verteilt — ${neu.length} Dienste besetzt`
        : `${neu.length} Dienste besetzt, ${luecken.length} Lücken — Details im Bericht`,
      luecken.length === 0 ? 'erfolg' : 'info',
      {
        label: 'Rückgängig',
        ausfuehren: () => {
          store.zuweisungenWiederherstellen(snapshot);
          bericht.value = null;
          zeigeToast('Neu-Verteilung rückgängig gemacht', 'info');
        },
      },
    );
  } finally {
    generiertGerade.value = false;
  }
}

async function monatLeeren() {
  const ok = await frageBestaetigung({
    titel: 'Monat leeren?',
    text:
      `Alle Dienste im ${monatsLabel.value} werden entfernt — ` +
      `auch von Hand gesetzte (fixierte) Einträge.`,
    bestaetigenText: 'Alles entfernen',
    gefaehrlich: true,
  });
  if (!ok) return;
  auswahl.value = null;
  bericht.value = null;
  const snapshot: Zuweisung[] = [...store.zuweisungen];
  await store.monatLeeren(jahr.value, monat.value);
  zeigeToast(`${monatsLabel.value} geleert`, 'info', {
    label: 'Rückgängig',
    ausfuehren: () => {
      store.zuweisungenWiederherstellen(snapshot);
      zeigeToast('Leerung rückgängig gemacht', 'info');
    },
  });
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

function zuHeute() {
  jahr.value = heute.getFullYear();
  monat.value = heute.getMonth() + 1;
  auswahl.value = null;
  bericht.value = null;
}

const zeigtAktuellenMonat = computed(
  () => jahr.value === heute.getFullYear() && monat.value === heute.getMonth() + 1,
);

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
  if (datum === heuteDatum) klassen.push('tag-heute');
  return klassen;
}

function zellKlassen(datum: ISODate, dienstartId: DienstartId): string[] {
  const dienst = DIENSTARTEN.find((d) => d.id === dienstartId)!;
  if (!dienst.findetStattAm(datum)) return [...tagKlassen(datum), 'zelle-aus'];

  const klassen = [...tagKlassen(datum), 'zelle-offen'];
  const info = zellInfo(datum, dienstartId);

  if (!info.zuweisung) {
    klassen.push(istGenerierbar(dienst, datum) ? 'zelle-unbesetzt' : 'zelle-optional');
  } else {
    if (info.verstoesse.length > 0) klassen.push('zelle-verstoss');
    if (info.zuweisung.fixiert) klassen.push('zelle-fixiert');
    if (hervorgehobenePerson.value) {
      if (info.person?.id === hervorgehobenePerson.value) {
        klassen.push('zelle-person-highlight');
      } else {
        klassen.push('zelle-person-gedimmt');
      }
    }
  }

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
  if (info.zuweisung?.fixiert) teile.push('📌 fixiert');
  for (const v of info.verstoesse) teile.push(`⚠ ${v.meldung}`);
  return teile.join('\n');
}

function zelleKlick(datum: ISODate, dienstartId: DienstartId) {
  const dienst = DIENSTARTEN.find((d) => d.id === dienstartId)!;
  if (!dienst.findetStattAm(datum)) return;
  auswahl.value = { datum, dienstartId };
}

const anzahlUnbesetzt = computed(
  () =>
    tage.value.flatMap((tag) =>
      DIENSTARTEN.filter(
        (d) => istGenerierbar(d, tag) && !store.zuweisungFuer(tag, d.id),
      ),
    ).length,
);

function zuErsterLuecke() {
  for (const tag of tage.value) {
    for (const dienst of DIENSTARTEN) {
      if (istGenerierbar(dienst, tag) && !store.zuweisungFuer(tag, dienst.id)) {
        auswahl.value = { datum: tag, dienstartId: dienst.id };
        return;
      }
    }
  }
}

function istOptional(datum: ISODate, dienstartId: DienstartId): boolean {
  const dienst = DIENSTARTEN.find((d) => d.id === dienstartId)!;
  return dienst.findetStattAm(datum) && !istGenerierbar(dienst, datum);
}

/** Personen mit Zählungen für die Legende unter dem Plan. */
const personenMitZahlen = computed(() =>
  store.aktivePersonen.map((p) => ({
    ...p,
    anzahl: store.zuweisungen.filter(
      (z) => z.personId === p.id && imMonat(z.datum, jahr.value, monat.value),
    ).length,
  })),
);

async function jsonExportieren() {
  const json = await store.exportierenAlsJson();
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const datumStr = new Date().toISOString().slice(0, 10);
  a.download = `dienstplan-backup-${datumStr}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  zeigeToast('Backup heruntergeladen', 'erfolg');
}

const jsonImportInput = ref<HTMLInputElement | null>(null);

function jsonImportieren() {
  jsonImportInput.value?.click();
}

async function jsonDateiGewaehlt(event: Event) {
  const input = event.target as HTMLInputElement;
  const datei = input.files?.[0];
  if (!datei) return;
  const ok = await frageBestaetigung({
    titel: 'Backup importieren?',
    text:
      'Der aktuelle Datenbestand wird durch die importierte Datei ersetzt.\n\n' +
      'Sicher fortfahren?',
    bestaetigenText: 'Importieren',
    gefaehrlich: true,
  });
  if (!ok) {
    input.value = '';
    return;
  }
  try {
    const text = await datei.text();
    await store.importierenAusJson(text);
    zeigeToast('Backup erfolgreich importiert', 'erfolg');
  } catch {
    zeigeToast('Import fehlgeschlagen — ungültige Datei?', 'fehler');
  }
  input.value = '';
}

watch([() => store.personen.length], () => {
  if (store.aktivePersonen.length === 0) auswahl.value = null;
});
</script>

<template>
  <div class="page-header">
    <h1>Dienstplan</h1>
    <div class="page-header-controls">
      <button
        v-if="anzahlUnbesetzt > 0"
        class="badge badge-red badge-knopf"
        title="Zur ersten offenen Zelle springen"
        @click="zuErsterLuecke"
      >
        {{ anzahlUnbesetzt }} unbesetzt
      </button>
      <button
        v-if="!zeigtAktuellenMonat"
        class="btn btn-secondary btn-sm"
        title="Zum aktuellen Monat"
        @click="zuHeute"
      >
        Heute
      </button>
      <button class="btn btn-secondary" title="Voriger Monat" @click="monatWechseln(-1)">
        <AppIcon name="links" />
      </button>
      <span class="week-label">{{ monatsLabel }}</span>
      <button class="btn btn-secondary" title="Nächster Monat" @click="monatWechseln(1)">
        <AppIcon name="rechts" />
      </button>
      <button class="btn btn-primary" :disabled="generiertGerade" @click="generieren">
        <AppIcon name="zauber" />
        Plan generieren
      </button>
      <button
        class="btn btn-secondary"
        :disabled="generiertGerade"
        title="Nicht-fixierte Einträge ersetzen, fixierte behalten"
        @click="neuVerteilen"
      >
        <AppIcon name="reload" />
        Neu verteilen
      </button>
      <button class="btn btn-secondary" title="Urlaub, Krank, Fortbildung, Wunsch-frei verwalten" @click="abwesenheitenOffen = true">
        <AppIcon name="kalender" :groesse="15" />
        Abwesenheiten
      </button>
      <button class="btn btn-ghost-danger" @click="monatLeeren">
        <AppIcon name="papierkorb" :groesse="15" />
        Monat leeren
      </button>
      <button class="btn btn-secondary" title="Alle Daten als JSON herunterladen" @click="jsonExportieren">
        <AppIcon name="download" />
        Backup
      </button>
      <button class="btn btn-secondary" title="Daten aus JSON-Backup importieren" @click="jsonImportieren">
        <AppIcon name="upload" />
        Import
      </button>
      <input
        ref="jsonImportInput"
        type="file"
        accept=".json"
        style="display: none"
        @change="jsonDateiGewaehlt"
      />
    </div>
  </div>

  <ZuweisungsPanel
    v-if="auswahl"
    :key="`${auswahl.datum}-${auswahl.dienstartId}`"
    :datum="auswahl.datum"
    :dienstart-id="auswahl.dienstartId"
    @schliessen="auswahl = null"
  />

  <AbwesenheitenDialog v-if="abwesenheitenOffen" @schliessen="abwesenheitenOffen = false" />

  <div v-if="bericht" class="card generierungs-bericht">
    <div class="zuweisungs-kopf">
      <h2>Ergebnis der Generierung</h2>
      <button class="btn btn-secondary btn-sm" @click="bericht = null">
        <AppIcon name="x" :groesse="14" />
        Schließen
      </button>
    </div>
    <p>
      <strong>{{ bericht.neu.length }}</strong> Dienste besetzt,
      <strong :class="{ 'bericht-luecken': bericht.luecken.length > 0 }">
        {{ bericht.luecken.length }}
      </strong>
      Lücken.
    </p>
    <div
      v-for="luecke in bericht.luecken"
      :key="`${luecke.datum}-${luecke.dienstartId}`"
      class="bericht-luecke bericht-luecke-klickbar"
      role="button"
      tabindex="0"
      :title="`${dienstart(luecke.dienstartId).name} am ${formatDatum(luecke.datum)} öffnen`"
      @click="zelleKlick(luecke.datum, luecke.dienstartId)"
      @keydown.enter="zelleKlick(luecke.datum, luecke.dienstartId)"
    >
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

  <div v-if="store.aktivePersonen.length === 0" class="card">
    <div class="empty-state">
      <strong>Noch keine aktiven Personen.</strong><br />
      Der Dienstplan braucht zuerst dein Team — lege Personen mit Soll/Max-Werten an.<br />
      <RouterLink to="/personen" class="btn btn-primary">
        <AppIcon name="personen" />
        Zu den Personen
      </RouterLink>
    </div>
  </div>

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
                <span
                  class="person-chip"
                  :style="{ background: personFarbe(zellInfo(tag, dienst.id).person!.id) }"
                >
                  {{ personKuerzel(zellInfo(tag, dienst.id).person!) }}
                </span>
                <span v-if="zellInfo(tag, dienst.id).zuweisung?.fixiert" class="zelle-pin" aria-hidden="true"></span>
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
              <span
                class="person-chip"
                :style="{ background: personFarbe(zellInfo(tag, dienst.id).person!.id) }"
              >
                {{ personKuerzel(zellInfo(tag, dienst.id).person!) }}
              </span>
              <span v-if="zellInfo(tag, dienst.id).zuweisung?.fixiert" class="zelle-pin" aria-hidden="true"></span>
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

    <!-- Personen-Legende -->
    <div v-if="personenMitZahlen.length > 0" class="person-legende">
      <button
        v-for="p in personenMitZahlen"
        :key="p.id"
        class="person-legende-item"
        :class="{ 'person-legende-aktiv': hervorgehobenePerson === p.id }"
        :title="`${personName(p)} — ${p.anzahl} Dienste diesen Monat. Klick: Hervorheben`"
        @click="hervorgehobenePerson = hervorgehobenePerson === p.id ? null : p.id"
      >
        <span class="person-punkt" :style="{ background: personFarbe(p.id) }"></span>
        {{ personKuerzel(p) }}
        <span class="person-legende-zahl">{{ p.anzahl }}</span>
      </button>
    </div>

    <p class="plan-legende">
      <span class="legende-item"><span class="legende-farbe tag-wochenende"></span> Wochenende</span>
      <span class="legende-item"><span class="legende-farbe tag-feiertag"></span> Feiertag (NRW)</span>
      <span class="legende-item"><span class="legende-farbe zelle-aus"></span> Dienst findet nicht statt</span>
      <span class="legende-item"><span class="legende-farbe zelle-unbesetzt"></span> unbesetzt</span>
      <span class="legende-item"><span class="legende-farbe zelle-optional"></span> nur manuell (z.B. Feiertags-Visite)</span>
      <span class="legende-item">⚠ Regelverstoß</span>
      <span class="legende-item"><span class="zelle-pin" style="position:static;display:inline-block;margin-right:.25rem"></span> fixiert</span>
    </p>
    <p class="form-hint">
      Zelle anklicken, um die Besetzung zu bearbeiten. Blauer Punkt = fixiert (Generator überschreibt nicht).
      Personen-Chips in der Legende anklicken zum Hervorheben.
    </p>
  </div>
</template>
