import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "スーパー管理者",
  SR_ADMIN: "社労士",
  CLIENT_ADMIN: "クライアント管理者",
  EMPLOYEE: "従業員",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;

  return (
    <main className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs text-slate-500">
              {ROLE_LABEL[role] ?? role}
            </div>
            <h1 className="text-xl font-bold text-slate-800">
              {session.user.name}
            </h1>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              ログアウト
            </button>
          </form>
        </header>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold mb-3">セッション情報</h2>
          <dl className="text-sm grid grid-cols-[140px_1fr] gap-y-1.5">
            <dt className="text-slate-500">Email</dt>
            <dd>{session.user.email}</dd>
            <dt className="text-slate-500">Role</dt>
            <dd>{role}</dd>
            <dt className="text-slate-500">Tenant</dt>
            <dd>{session.user.tenantId ?? "-"}</dd>
            <dt className="text-slate-500">Client</dt>
            <dd>{session.user.clientId ?? "-"}</dd>
            <dt className="text-slate-500">Employee</dt>
            <dd>{session.user.employeeId ?? "-"}</dd>
          </dl>
        </div>

        <div className="mt-6 text-sm text-slate-500">
          ※ 本画面は MVP 動作確認用のスタブです。次のステップで各ロール向け画面を実装します。
        </div>
      </div>
    </main>
  );
}
