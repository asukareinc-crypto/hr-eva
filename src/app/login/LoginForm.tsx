"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "運営管理者",
  SR_ADMIN: "社労士",
  CLIENT_ADMIN: "クライアント管理者",
  EMPLOYEE: "従業員",
};

type Match = {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantName: string | null;
  clientName: string | null;
  employeeName: string | null;
};

export default function LoginForm() {
  const params = useSearchParams();
  const initialEmail = params?.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);

  useEffect(() => {
    const fromQuery = params?.get("email");
    if (fromQuery && !email) setEmail(fromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 1) 一致するアカウント候補を取得
      const res = await fetch("/api/auth/match-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { matches: Match[] };

      if (!data.matches || data.matches.length === 0) {
        setError("メールアドレスまたはパスワードが正しくありません");
        setLoading(false);
        return;
      }

      if (data.matches.length === 1) {
        // 単一アカウント → そのままサインイン
        await doSignIn(data.matches[0].id);
        return;
      }

      // 複数アカウント → 選択画面に遷移
      setMatches(data.matches);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("ログインに失敗しました。時間をおいて再度お試しください。");
      setLoading(false);
    }
  }

  async function doSignIn(userId: string) {
    const res = await signIn("credentials", {
      email,
      password,
      userId,
      redirect: false,
    });
    if (!res || res.error) {
      setError("ログインに失敗しました。時間をおいて再度お試しください。");
      setLoading(false);
      return;
    }
    window.location.assign("/dashboard");
  }

  if (matches) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">アカウントを選択</h1>
            <p className="text-xs text-slate-500 mt-1">
              同じメールアドレスに複数のアカウントがあります。利用するアカウントを選んでください。
            </p>
          </div>
          <ul className="space-y-2">
            {matches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    doSignIn(m.id);
                  }}
                  disabled={loading}
                  className="w-full text-left border border-slate-200 rounded-lg p-3 hover:border-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-indigo-700">
                      {ROLE_LABEL[m.role] ?? m.role}
                    </div>
                    <div className="text-[10px] text-slate-400">{m.email}</div>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {m.name}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 space-y-0.5">
                    {m.tenantName && <div>事務所: {m.tenantName}</div>}
                    {m.clientName && <div>会社: {m.clientName}</div>}
                    {m.employeeName && <div>従業員: {m.employeeName}</div>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setMatches(null);
              setError(null);
            }}
            className="text-xs text-slate-500 underline"
          >
            ← 戻る（別のアドレスでログイン）
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 space-y-5"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-800">ログイン</h1>
          <p className="text-xs text-slate-500 mt-1">HR EVA</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">メールアドレス</label>
          <input
            type="email"
            required
            autoComplete="username"
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
            autoComplete="current-password"
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
      </form>
    </main>
  );
}
