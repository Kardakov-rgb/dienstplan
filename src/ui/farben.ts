/**
 * Automatische, stabile Farbe je Person (abgeleitet aus der ID).
 * 12 gut unterscheidbare Töne, an die Marke angeglichen (Magenta/Bordeaux
 * führen). Alle dunkel genug für weißen Text — reines Gold ist bewusst
 * NICHT enthalten, da weißer Text darauf nicht lesbar wäre.
 */
const PALETTE = [
  '#c62381', // Magenta (Marke)
  '#7b1f23', // Bordeaux (Marke)
  '#a81d6e', // Dunkel-Magenta
  '#0f766e', // Teal
  '#2563eb', // Blau
  '#7c3aed', // Violett
  '#2e7d5b', // Grün
  '#b45309', // Bronze
  '#0e7490', // Cyan
  '#9333ea', // Purpur
  '#be123c', // Rose
  '#4d7c0f', // Oliv
] as const;

export function personFarbe(personId: string): string {
  let hash = 0;
  for (let i = 0; i < personId.length; i++) {
    hash = (hash * 31 + personId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
