/**
 * Eigener Bestätigungsdialog als Ersatz für window.confirm().
 * Aufruf: const ok = await frageBestaetigung({ titel, text, … })
 * Die Dialog-Komponente (ConfirmDialog.vue) ist einmal in App.vue eingebunden.
 */
import { reactive } from 'vue';

export interface DialogOptionen {
  titel: string;
  text: string;
  bestaetigenText?: string;
  abbrechenText?: string;
  /** Roter Bestätigen-Knopf für destruktive Aktionen. */
  gefaehrlich?: boolean;
}

export const dialogZustand = reactive({
  offen: false,
  optionen: null as DialogOptionen | null,
  aufloesen: null as ((antwort: boolean) => void) | null,
});

export function frageBestaetigung(optionen: DialogOptionen): Promise<boolean> {
  return new Promise((resolve) => {
    dialogZustand.optionen = optionen;
    dialogZustand.aufloesen = resolve;
    dialogZustand.offen = true;
  });
}

export function beantworteDialog(antwort: boolean): void {
  dialogZustand.offen = false;
  dialogZustand.aufloesen?.(antwort);
  dialogZustand.aufloesen = null;
}
