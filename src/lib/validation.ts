/**
 * サーバーアクション用の軽量バリデーションヘルパー。
 * 失敗時は new Error(msg) を throw する。グローバル error.tsx で表示される。
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function vRequired(value: string | undefined | null, label: string): string {
  const s = (value ?? "").trim();
  if (!s) throw new ValidationError(`${label}は必須です。`);
  return s;
}

/** yyyy-mm-dd を Date に変換しつつ妥当性検証 */
export function vDate(value: string | undefined | null, label: string): Date {
  const s = (value ?? "").trim();
  if (!s) throw new ValidationError(`${label}は必須です。`);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`${label}の日付形式が正しくありません: ${s}`);
  }
  return d;
}

export function vOptionalDate(value: string | undefined | null, label: string): Date | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`${label}の日付形式が正しくありません: ${s}`);
  }
  return d;
}

/** start < end を必須にしたい場合（同日NG） */
export function vDateRange(start: Date, end: Date, startLabel: string, endLabel: string) {
  if (start.getTime() >= end.getTime()) {
    throw new ValidationError(
      `${endLabel}は${startLabel}より後の日付にしてください（${formatDate(start)} ≧ ${formatDate(end)}）。`
    );
  }
}

/** start <= end を必須にしたい場合（同日OK） */
export function vDateOrder(start: Date, end: Date, startLabel: string, endLabel: string) {
  if (start.getTime() > end.getTime()) {
    throw new ValidationError(
      `${endLabel}は${startLabel}以後にしてください（${formatDate(start)} > ${formatDate(end)}）。`
    );
  }
}

export function vInt(value: string | undefined | null, label: string, opts?: { min?: number; max?: number }): number {
  const s = (value ?? "").trim();
  if (!s) throw new ValidationError(`${label}は必須です。`);
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new ValidationError(`${label}は整数で入力してください: ${s}`);
  }
  if (opts?.min !== undefined && n < opts.min) {
    throw new ValidationError(`${label}は${opts.min}以上にしてください。`);
  }
  if (opts?.max !== undefined && n > opts.max) {
    throw new ValidationError(`${label}は${opts.max}以下にしてください。`);
  }
  return n;
}

export function vOptionalInt(value: string | undefined | null, label: string, opts?: { min?: number; max?: number }): number | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  return vInt(s, label, opts);
}

export function vFloat(value: string | undefined | null, label: string, opts?: { min?: number; max?: number }): number {
  const s = (value ?? "").trim();
  if (!s) throw new ValidationError(`${label}は必須です。`);
  const n = Number(s);
  if (!Number.isFinite(n)) {
    throw new ValidationError(`${label}は数値で入力してください: ${s}`);
  }
  if (opts?.min !== undefined && n < opts.min) {
    throw new ValidationError(`${label}は${opts.min}以上にしてください。`);
  }
  if (opts?.max !== undefined && n > opts.max) {
    throw new ValidationError(`${label}は${opts.max}以下にしてください。`);
  }
  return n;
}

/** "2026-05" のような yyyy-mm */
export function vYearMonth(value: string | undefined | null, label: string): string {
  const s = (value ?? "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) {
    throw new ValidationError(`${label}は YYYY-MM 形式で入力してください: ${s || "未入力"}`);
  }
  return s;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
