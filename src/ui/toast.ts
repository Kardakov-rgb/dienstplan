/**
 * Kurze Erfolgsmeldungen am unteren Bildschirmrand.
 * Aufruf: zeigeToast('Person gespeichert') — gerendert von ToastHost.vue.
 */
import { reactive } from 'vue';

export type ToastTyp = 'erfolg' | 'fehler' | 'info';

export interface Toast {
  id: number;
  text: string;
  typ: ToastTyp;
}

let naechsteId = 1;

export const toasts = reactive<Toast[]>([]);

export function zeigeToast(text: string, typ: ToastTyp = 'erfolg', dauerMs = 3200): void {
  const id = naechsteId++;
  toasts.push({ id, text, typ });
  setTimeout(() => {
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.splice(idx, 1);
  }, dauerMs);
}
