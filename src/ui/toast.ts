/**
 * Kurze Erfolgsmeldungen am unteren Bildschirmrand.
 * Aufruf: zeigeToast('Person gespeichert') — gerendert von ToastHost.vue.
 */
import { reactive } from 'vue';

export type ToastTyp = 'erfolg' | 'fehler' | 'info';

export interface ToastAktion {
  label: string;
  ausfuehren: () => void;
}

export interface Toast {
  id: number;
  text: string;
  typ: ToastTyp;
  aktion?: ToastAktion;
}

let naechsteId = 1;

export const toasts = reactive<Toast[]>([]);

export function entferneToast(id: number): void {
  const idx = toasts.findIndex((t) => t.id === id);
  if (idx !== -1) toasts.splice(idx, 1);
}

export function zeigeToast(
  text: string,
  typ: ToastTyp = 'erfolg',
  aktion?: ToastAktion,
  dauerMs = 5000,
): void {
  const id = naechsteId++;
  toasts.push({ id, text, typ, aktion });
  // Mit Aktion etwas länger sichtbar, damit „Rückgängig" erreichbar bleibt.
  setTimeout(() => entferneToast(id), aktion ? Math.max(dauerMs, 6000) : Math.min(dauerMs, 3500));
}
