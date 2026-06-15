// Bağımlılıksız CSV üretimi. Excel-TR uyumlu: UTF-8 BOM + `;` ayraç
// (Türkçe Excel virgülü ondalık ayıracı sayar, bu yüzden alan ayracı `;`).

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Tırnak/ayraç/yeni satır içeren hücreleri tırnakla; içteki tırnağı ikiye katla.
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(";");
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.value(row))).join(";"))
    .join("\r\n");
  // BOM, Excel'in UTF-8'i doğru çözmesi için.
  return `﻿${head}\r\n${body}`;
}

/** İndirilebilir CSV Response üretir. */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
