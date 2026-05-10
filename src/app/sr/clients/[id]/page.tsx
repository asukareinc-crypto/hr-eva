import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSr } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Btn, Field, Input } from "@/components/ui";
import { updateClient } from "@/app/sr/actions";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSr();
  const client = await prisma.client.findFirst({
    where: { id, tenantId: session.user.tenantId! },
    include: {
      users: { where: { role: "CLIENT_ADMIN" } },
      _count: { select: { employees: true, evaluationPeriods: true } },
    },
  });
  if (!client) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title={client.name}
        description="クライアント企業の編集"
        actions={
          <Link
            href="/sr/clients"
            className="text-sm text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
          >
            ← 一覧へ
          </Link>
        }
      />

      <Card className="p-6 max-w-xl">
        <form
          action={async (fd) => {
            "use server";
            await updateClient(id, fd);
          }}
          className="space-y-4"
        >
          <Field label="企業名">
            <Input name="name" defaultValue={client.name} required />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={client.isActive} />
            稼働中
          </label>
          <div className="flex gap-2 pt-2">
            <Btn type="submit">保存</Btn>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-slate-500">従業員数</div>
          <div className="text-2xl font-bold">{client._count.employees}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">評価期間数</div>
          <div className="text-2xl font-bold">{client._count.evaluationPeriods}</div>
        </Card>
        <Link href={`/sr/clients/${id}/grades`}>
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="text-xs text-slate-500">等級基準表</div>
            <div className="text-base font-bold mt-1">編集する →</div>
          </Card>
        </Link>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-2 text-sm">クライアント管理者</h2>
        {client.users.length === 0 ? (
          <div className="text-sm text-slate-500">
            まだ管理者ユーザーがいません。新規追加機能は後続のアップデートで対応します。
          </div>
        ) : (
          <ul className="text-sm space-y-1">
            {client.users.map((u) => (
              <li key={u.id} className="flex items-center justify-between">
                <span>
                  {u.name} <span className="text-slate-500">({u.email})</span>
                </span>
                <Badge tone={u.isActive ? "green" : "slate"}>
                  {u.isActive ? "有効" : "無効"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
