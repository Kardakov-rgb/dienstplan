<script setup lang="ts">
import AppIcon from './AppIcon.vue';
import { toasts, type ToastTyp } from '../toast';

const ICON_JE_TYP: Record<ToastTyp, string> = {
  erfolg: 'check',
  fehler: 'warnung',
  info: 'info',
};
</script>

<template>
  <div class="toast-host" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="`toast-${t.typ}`">
        <AppIcon :name="ICON_JE_TYP[t.typ]" :groesse="16" />
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>
