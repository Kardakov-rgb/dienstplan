<script setup lang="ts">
import { computed } from 'vue';

/** Inline-SVG-Icons (Lucide-Stil: Strich, keine Füllung). */
const ICONS: Record<string, string> = {
  plus: '<path d="M5 12h14M12 5v14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  stift: '<path d="M21.17 6.83a2.85 2.85 0 0 0-4-4L3.5 16.5 2 22l5.5-1.5Z"/>',
  papierkorb:
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
  links: '<path d="m15 18-6-6 6-6"/>',
  rechts: '<path d="m9 18 6-6-6-6"/>',
  kalender:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
  personen:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  statistik: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  drucker:
    '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  zauber:
    '<path d="m3 21 9.5-9.5"/><path d="M14.5 6.5 16 5"/><path d="M9 4V2"/><path d="M9 10V8"/><path d="M5 6H3"/><path d="M15 6h-2"/><path d="M19 13v-2"/><path d="M19 21v-2"/><path d="M22 17h-2"/><path d="M18 17h-2"/>',
  warnung:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  abspielen: '<path d="m6 3 14 9-14 9V3Z"/>',
  punkt: '<circle cx="12" cy="12" r="6"/>',
};

const props = withDefaults(defineProps<{ name: string; groesse?: number }>(), { groesse: 16 });

const markup = computed(() => ICONS[props.name] ?? ICONS.punkt);
</script>

<template>
  <svg
    :width="groesse"
    :height="groesse"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="markup"
  ></svg>
</template>
