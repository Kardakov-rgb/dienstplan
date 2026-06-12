import { onUnmounted, ref, type Ref } from 'vue';

/** Reaktives Media-Query-Ergebnis, z.B. useMediaQuery('(max-width: 700px)'). */
export function useMediaQuery(query: string): Ref<boolean> {
  const mq = window.matchMedia(query);
  const passt = ref(mq.matches);
  const handler = (e: MediaQueryListEvent) => {
    passt.value = e.matches;
  };
  mq.addEventListener('change', handler);
  onUnmounted(() => mq.removeEventListener('change', handler));
  return passt;
}

/** Einheitlicher Umbruchpunkt für die Handy-Darstellung. */
export const HANDY_BREITE = '(max-width: 700px)';
