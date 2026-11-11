export type CsvCell = string | number | boolean | null | undefined;

export function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Neutralise spreadsheet formula injection for text cells.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(escapeCsvCell).join(","));
  return lines.join("\r\n") + "\r\n";
}

/** Browser-only: triggers a download. Returns false when there is nothing to export. */
export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]): boolean {
  if (rows.length === 0) return false;
  const blob = new Blob(["﻿" + toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
