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
