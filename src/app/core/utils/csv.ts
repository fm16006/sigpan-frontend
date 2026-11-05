import { saveFile } from './download';

type Cell = string | number | null | undefined;

/** Arma un CSV (separador coma, comillas cuando hace falta) y lo descarga. BOM para que Excel lea las tildes. */
export function downloadCsv(filename: string, header: readonly string[], rows: readonly (readonly Cell[])[]): void {
  saveFile(new Blob(['﻿' + toCsv(header, rows)], { type: 'text/csv;charset=utf-8' }), filename);
}

export function toCsv(header: readonly string[], rows: readonly (readonly Cell[])[]): string {
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}

function cell(value: Cell): string {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
