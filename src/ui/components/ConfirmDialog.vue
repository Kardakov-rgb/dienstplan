<script setup lang="ts">
import AppModal from './AppModal.vue';
import { beantworteDialog, dialogZustand } from '../dialog';
</script>

<template>
  <AppModal
    v-if="dialogZustand.offen && dialogZustand.optionen"
    :titel="dialogZustand.optionen.titel"
    :breite="440"
    @schliessen="beantworteDialog(false)"
  >
    <p class="dialog-text">{{ dialogZustand.optionen.text }}</p>
    <div class="dialog-aktionen">
      <button class="btn btn-secondary" @click="beantworteDialog(false)">
        {{ dialogZustand.optionen.abbrechenText ?? 'Abbrechen' }}
      </button>
      <button
        class="btn"
        :class="dialogZustand.optionen.gefaehrlich ? 'btn-danger' : 'btn-primary'"
        @click="beantworteDialog(true)"
      >
        {{ dialogZustand.optionen.bestaetigenText ?? 'OK' }}
      </button>
    </div>
  </AppModal>
</template>
