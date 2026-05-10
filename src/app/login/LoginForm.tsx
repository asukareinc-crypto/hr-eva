"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        setError("メールアドレスまたはパスワードが正しくありません");
        setLoading(false);
        return;
      }
      // ハードナビゲーションでクッキー状態を新しいリクエストに反映
      window.location.assign("/dashboard");
    } catch (err) {
      console.error(err);
      setError("ログインに失敗しました。時間をおいて再度お試しください。");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 space-y-5"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-800">ログイン</h1>
          <p className="text-xs text-slate-500 mt-1">
            HR EVA
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">メールアドレス</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">パスワード</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 text-white py-2 text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "..." : "ログイン"}
        </button>

        <div className="text-xs text-slate-600 border-t border-slate-200 pt-4">
          <div className="font-semibold mb-2 text-slate-700">デモアカウント一覧</div>
          <div className="text-[11px] text-slate-500 mb-2">
            すべてパスワード: <code className="font-mono bg-slate-100 px-1 rounded">password123</code>
          </div>
          <ul className="space-y-1.5">
            <DemoRow
              label="運営（Super Admin）"
              email="admin@example.com"
              setEmail={setEmail}
              setPassword={setPassword}
            />
            <DemoRow
              label="社労士"
              email="sr@example.com"
              setEmail={setEmail}
              setPassword={setPassword}
            />
            <DemoRow
              label="クライアント管理者"
              email="client@example.com"
              setEmail={setEmail}
              setPassword={setPassword}
            />
            <DemoRow
              label="従業員（被評価者）"
              email="employee@example.com"
              setEmail={setEmail}
              setPassword={setPassword}
            />
            <DemoRow
              label="一次評価者（直属上司）"
              email="manager@example.com"
              setEmail={setEmail}
              setPassword={setPassword}
            />
            <DemoRow
              label="最終評価者（所長）"
              email="director@example.com"
              setEmail={setEmail}
              setPassword={setPassword}
            />
          </ul>
        </div>
      </form>
    </main>
  );
}

function DemoRow({
  label,
  email,
  setEmail,
  setPassword,
}: {
  label: string;
  email: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-slate-500">{label}</div>
        <div className="font-mono text-[11px] text-slate-800 truncate">{email}</div>
      </div>
      <button
        type="button"
        onClick={() => {
          setEmail(email);
          setPassword("password123");
        }}
        className="text-[11px] px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 shrink-0"
      >
        入力
      </button>
    </li>
  );
}
