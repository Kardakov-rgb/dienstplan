/**
 * Automatische, stabile Farbe je Person (abgeleitet aus der ID).
 * 12 gut unterscheidbare, kräftige Töne mit weißem Text lesbar.
 */
const PALETTE = [
  '#4f46e5', // Indigo
  '#0d9488', // Teal
  '#d97706', // Amber
  '#db2777', // Pink
  '#7c3aed', // Violett
  '#2563eb', // Blau
  '#059669', // Smaragd
  '#e11d48', // Rosenrot
  '#ca8a04', // Ocker
  '#0891b2', // Cyan
  '#9333ea', // Purpur
  '#65a30d', // Limette
] as const;

export function personFarbe(personId: string): string {
  let hash = 0;
  for (let i = 0; i < personId.length; i++) {
    hash = (hash * 31 + personId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
