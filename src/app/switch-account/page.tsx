import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Btn } from "@/components/ui";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "運営管理者",
  SR_ADMIN: "社労士",
  CLIENT_ADMIN: "クライアント管理者",
  EMPLOYEE: "従業員",
};

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  SR_ADMIN: "/sr",
  CLIENT_ADMIN: "/client",
  EMPLOYEE: "/m",
};

export default async function SwitchAccountPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const email = session.user.email;
  const all = await prisma.user.findMany({
    where: { email, isActive: true },
    include: {
      tenant: { select: { name: true } },
      client: { select: { name: true } },
      employee: { select: { lastName: true, firstName: true } },
    },
  });

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-2xl mx-auto space-y-4">
        <PageHeader
          title="アカウント切替"
          description={`${email} には ${all.length} 個のアカウントがあります。`}
          actions={
            <Link href="/dashboard" className="text-sm text-slate-600 underline-offset-2 hover:underline">
              ← 現在のアカウントに戻る
            </Link>
          }
        />

        <ul className="space-y-2">
          {all.map((u) => {
            const isCurrent = u.id === session.user.id;
            const homeHref = ROLE_HOME[u.role] ?? "/";
            return (
              <Card key={u.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-indigo-700">
                      {ROLE_LABEL[u.role] ?? u.role}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] bg-green-100 text-green-800 rounded px-1.5 py-0.5">
                          ログイン中
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {u.name}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 space-y-0.5">
                      {u.tenant && <div>事務所: {u.tenant.name}</div>}
                      {u.client && <div>会社: {u.client.name}</div>}
                      {u.employee && <div>従業員: {u.employee.lastName} {u.employee.firstName}</div>}
                    </div>
                  </div>
                  <div>
                    {isCurrent ? (
                      <Link href={homeHref} className="text-sm text-slate-600 underline">
                        画面へ
                      </Link>
                    ) : (
                      <form
                        action={async () => {
                          "use server";
                          // 別アカウントに切替: 一旦サインアウトしてログイン画面へ
                          // (パスワード再入力で同じメールの別 user を選べる)
                          await signOut({ redirectTo: `/login?email=${encodeURIComponent(email)}` });
                        }}
                      >
                        <Btn type="submit">このアカウントに切替</Btn>
                      </form>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </ul>

        <Card className="p-4 text-xs text-slate-600">
          切替の際はパスワード入力が必要です。同じパスワードを使っている場合、ログイン画面で再度同じメール＋パスワードを入力すると、もう一度アカウント選択画面が表示されます。
        </Card>
      </div>
    </div>
  );
}
