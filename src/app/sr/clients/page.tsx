import Link from "next/link";
import { requireSr } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Empty, LinkBtn } from "@/components/ui";

export default async function SrClientsPage() {
  const session = await requireSr();
  const clients = await prisma.client.findMany({
    where: { tenantId: session.user.tenantId! },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { employees: true, evaluationPeriods: true, users: true } },
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="クライアント企業"
        description="顧問先企業を管理します"
        actions={<LinkBtn href="/sr/clients/new">+ 新規追加</LinkBtn>}
      />

      {clients.length === 0 ? (
        <Empty message="クライアント企業がまだ登録されていません。「新規追加」から登録してください。" />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="text-left px-4 py-2">企業名</th>
                <th className="text-left px-4 py-2">従業員</th>
                <th className="text-left px-4 py-2">評価期間</th>
                <th className="text-left px-4 py-2">管理者</th>
                <th className="text-left px-4 py-2">状態</th>
                <th className="text-right px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-medium">
                    <Link className="hover:underline" href={`/sr/clients/${c.id}`}>
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{c._count.employees}</td>
                  <td className="px-4 py-2">{c._count.evaluationPeriods}</td>
                  <td className="px-4 py-2">{c._count.users}</td>
                  <td className="px-4 py-2">
                    {c.isActive ? <Badge tone="green">稼働中</Badge> : <Badge tone="slate">停止</Badge>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link className="text-slate-700 underline" href={`/sr/clients/${c.id}`}>
                      編集
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
