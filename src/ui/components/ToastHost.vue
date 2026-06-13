<script setup lang="ts">
import AppIcon from './AppIcon.vue';
import { entferneToast, toasts, type Toast, type ToastTyp } from '../toast';

const ICON_JE_TYP: Record<ToastTyp, string> = {
  erfolg: 'check',
  fehler: 'warnung',
  info: 'info',
};

function aktionAusfuehren(t: Toast) {
  t.aktion?.ausfuehren();
  entferneToast(t.id);
}
</script>

<template>
  <div class="toast-host" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="`toast-${t.typ}`">
        <AppIcon :name="ICON_JE_TYP[t.typ]" :groesse="16" />
        {{ t.text }}
        <button v-if="t.aktion" class="toast-aktion" @click="aktionAusfuehren(t)">
          {{ t.aktion.label }}
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
