<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import AppIcon from './AppIcon.vue';

const props = withDefaults(defineProps<{ titel: string; breite?: number }>(), { breite: 600 });
const emit = defineEmits<{ schliessen: [] }>();

function tastendruck(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('schliessen');
}

onMounted(() => document.addEventListener('keydown', tastendruck));
onUnmounted(() => document.removeEventListener('keydown', tastendruck));
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" appear>
      <div class="modal-backdrop" @click.self="emit('schliessen')">
        <div
          class="modal-panel"
          role="dialog"
          aria-modal="true"
          :style="{ '--modal-breite': `${props.breite}px` }"
        >
          <div class="modal-kopf">
            <h2>{{ titel }}</h2>
            <button class="modal-schliessen" title="Schließen" @click="emit('schliessen')">
              <AppIcon name="x" :groesse="18" />
            </button>
          </div>
          <div class="modal-inhalt">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
