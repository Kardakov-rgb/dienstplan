/**
 * Einzige Stelle, die exceljs kennt: wandelt zwischen der reinen Zell-Matrix
 * (BlattDaten, siehe dienstplanXlsxFormat.ts) und echten .xlsx-Bytes.
 *
 * Spalte A wird als echtes Datum geschrieben/gelesen; alle Datumsumrechnungen
 * laufen über UTC, damit keine Zeitzonen-Verschiebung entsteht.
 */
import ExcelJS from 'exceljs';
import type { ISODate } from '../../domain/types';
import type { BlattDaten } from './dienstplanXlsxFormat';
import { KOPFZEILE } from './dienstplanXlsxFormat';

const DATUMS_FORMAT = 'dd.mm.yyyy';
const SPALTE_DATUM = 1; // exceljs ist 1-basiert
const EXCEL_EPOCHE_MS = Date.UTC(1899, 11, 30);
const MS_PRO_TAG = 86_400_000;

function istIsoDatum(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function datumZuUtc(iso: ISODate): Date {
  const [j, m, t] = iso.split('-').map(Number);
  return new Date(Date.UTC(j, m - 1, t));
}

function isoVonDate(d: Date): ISODate {
  const j = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const t = String(d.getUTCDate()).padStart(2, '0');
  return `${j}-${m}-${t}`;
}

function isoVonSerial(serial: number): ISODate {
  return isoVonDate(new Date(EXCEL_EPOCHE_MS + Math.round(serial) * MS_PRO_TAG));
}

/** Schreibt die Monatsblätter als .xlsx und liefert die Bytes. */
export async function matrixZuXlsx(blaetter: BlattDaten[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  for (const blatt of blaetter) {
    const ws = workbook.addWorksheet(blatt.blattName);
    blatt.zeilen.forEach((zeile, zeilenIdx) => {
      const row = ws.getRow(zeilenIdx + 1);
      zeile.forEach((wert, spaltenIdx) => {
        if (wert === '') return;
        const cell = row.getCell(spaltenIdx + 1);
        if (spaltenIdx + 1 === SPALTE_DATUM && zeilenIdx > 0 && istIsoDatum(wert)) {
          cell.value = datumZuUtc(wert);
          cell.numFmt = DATUMS_FORMAT;
        } else {
          cell.value = wert;
        }
      });
      row.commit();
    });
  }
  return workbook.xlsx.writeBuffer();
}

/** Wandelt den Datumswert der Spalte A in einen ISO-String. */
function datumsZelleZuIso(value: ExcelJS.CellValue): ISODate {
  if (value == null) return '';
  if (value instanceof Date) return isoVonDate(value);
  if (typeof value === 'number') return isoVonSerial(value);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const inner = (value as { result?: unknown; text?: unknown }).result ?? (value as { text?: unknown }).text;
    if (inner instanceof Date) return isoVonDate(inner);
    if (typeof inner === 'number') return isoVonSerial(inner);
    if (typeof inner === 'string') return inner.trim();
  }
  return '';
}

/** Wandelt eine beliebige Textzelle in einen String. */
function zelleZuText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return isoVonDate(value);
  if (typeof value === 'object') {
    const o = value as { result?: unknown; text?: unknown; richText?: Array<{ text: string }> };
    if (Array.isArray(o.richText)) return o.richText.map((r) => r.text).join('').trim();
    if (typeof o.text === 'string') return o.text.trim();
    if (typeof o.result === 'string') return o.result.trim();
    if (typeof o.result === 'number') return String(o.result);
  }
  return '';
}

/** Liest .xlsx-Bytes wieder in die Zell-Matrix ein. */
export async function xlsxZuMatrix(buffer: ArrayBuffer): Promise<BlattDaten[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const blaetter: BlattDaten[] = [];
  workbook.eachSheet((ws) => {
    const zeilen: string[][] = [];
    const spaltenAnzahl = Math.max(KOPFZEILE.length, ws.columnCount);
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const zeile: string[] = [];
      for (let c = 1; c <= spaltenAnzahl; c++) {
        const value = row.getCell(c).value;
        zeile.push(c === SPALTE_DATUM ? datumsZelleZuIso(value) : zelleZuText(value));
      }
      zeilen.push(zeile);
    }
    blaetter.push({ blattName: ws.name, zeilen });
  });
  return blaetter;
}
