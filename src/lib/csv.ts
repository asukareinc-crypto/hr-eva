/**
 * 軽量 CSV パーサ／生成。
 * - RFC 4180 互換（ダブルクォート・エスケープ対応）
 * - 出力は Excel 互換のため UTF-8 BOM + CRLF
 * - 空行はスキップ
 */
export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\r") {
        // ignore
      } else if (c === "\n") {
        row.push(cell);
        cell = "";
        rows.push(row);
        row = [];
      } else {
        cell += c;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => {
      const obj: CsvRow = {};
      headers.forEach((h, i) => {
        obj[h] = (r[i] ?? "").trim();
      });
      return obj;
    });
}

function escapeCell(val: string): string {
  if (val.includes('"') || val.includes(",") || val.includes("\n") || val.includes("\r")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function stringifyCsv(rows: CsvRow[], headers: string[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h] ?? "")).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** "true"/"1"/"yes"/"○" を真と判定 */
export function csvBool(val: string | undefined): boolean {
  if (!val) return false;
  const v = val.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "○" || v === "y";
}

/** 数値変換（空 → null）。NaN は null。 */
export function csvIntOrNull(val: string | undefined): number | null {
  if (!val) return null;
  const n = Number(val);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function csvFloatOrNull(val: string | undefined): number | null {
  if (!val) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}
