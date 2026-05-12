"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[client error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <div className="text-xs font-semibold tracking-widest text-red-600">
          ERROR
        </div>
        <h1 className="text-lg font-bold text-slate-900">処理中に問題が発生しました</h1>
        <p className="text-sm text-slate-600">
          以下のメッセージを管理者にお知らせいただくと、原因を素早く特定できます。
        </p>
        <details className="text-xs bg-slate-50 rounded p-3 text-slate-700" open>
          <summary className="cursor-pointer font-semibold">詳細</summary>
          <div className="mt-2 font-mono whitespace-pre-wrap break-words">
            {error.message || "(no message)"}
            {error.digest && (
              <>
                {"\n\n"}
                <span className="text-slate-500">digest: {error.digest}</span>
              </>
            )}
          </div>
        </details>
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => reset()}
            className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-700"
          >
            もう一度試す
          </button>
          <a
            href="/"
            className="rounded-md border border-slate-300 text-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            トップへ
          </a>
        </div>
      </div>
    </div>
  );
}
