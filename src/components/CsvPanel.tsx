import { Btn } from "@/components/ui";

/**
 * CSV エクスポート / インポートのカード共通UI。
 * - exportHref: ダウンロードURL（GET）
 * - importAction: サーバーアクション（FormData の "file" を読む）
 * - templateHref: 任意。空テンプレートCSVのダウンロードリンク
 * - extraFields: 追加フィールド（チェックボックス等）
 */
export function CsvPanel({
  title,
  description,
  exportHref,
  exportLabel = "CSV をダウンロード",
  importAction,
  importLabel = "CSV からインポート",
  helpText,
  extraFields,
}: {
  title: string;
  description?: string;
  exportHref: string;
  exportLabel?: string;
  importAction: (formData: FormData) => void | Promise<void>;
  importLabel?: string;
  helpText?: string;
  extraFields?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      {description && <p className="text-xs text-slate-600 mb-3">{description}</p>}

      <div className="flex flex-wrap gap-2 mb-3">
        <a
          href={exportHref}
          download
          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors"
        >
          ⬇ {exportLabel}
        </a>
      </div>

      <form action={importAction} className="space-y-2">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:text-slate-800 file:text-xs file:font-semibold file:cursor-pointer"
        />
        {extraFields}
        <div className="flex gap-2 items-center">
          <Btn type="submit" variant="secondary">
            ⬆ {importLabel}
          </Btn>
          {helpText && <span className="text-[11px] text-slate-500">{helpText}</span>}
        </div>
      </form>
    </div>
  );
}
