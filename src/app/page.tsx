import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  SR_ADMIN: "/sr",
  CLIENT_ADMIN: "/client",
  EMPLOYEE: "/m",
};

export default async function Home() {
  // ログイン中ならロール別ホームへ自動遷移
  const session = await auth();
  if (session?.user) {
    redirect(ROLE_HOME[session.user.role] ?? "/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-200">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 sm:p-12">
        <div className="text-xs font-semibold tracking-widest text-slate-500 mb-2">
          HR EVA
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
          社労士向け人事評価システム
        </h1>
        <p className="text-slate-600 mb-8">
          評価制度の作成から運用、従業員のセルフサービスまで一気通貫で管理します。
        </p>

        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          <Feature title="マルチテナント" desc="社労士 → クライアント企業 → 従業員の階層管理" />
          <Feature title="柔軟な評価制度" desc="達成度評価から将来は360度・MBOまで拡張" />
          <Feature title="モバイル対応" desc="従業員はスマホで評価ステータス・賃金・有給を確認" />
          <Feature title="進捗の可視化" desc="評価期間ごとの進捗を一覧で把握" />
        </div>

        <Link
          href="/login"
          className="inline-flex items-center justify-center w-full sm:w-auto rounded-lg bg-slate-900 text-white px-6 py-3 font-semibold hover:bg-slate-700 transition-colors"
        >
          ログインへ進む
        </Link>

        <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500">
          <div className="font-semibold mb-1">デモアカウント (password: password123)</div>
          <ul className="space-y-0.5">
            <li>Super Admin: admin@example.com</li>
            <li>社労士: sr@example.com</li>
            <li>クライアント管理: client@example.com</li>
            <li>従業員: employee@example.com</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="font-semibold text-slate-800 text-sm">{title}</div>
      <div className="text-xs text-slate-600 mt-0.5">{desc}</div>
    </div>
  );
}
