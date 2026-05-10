import Link from "next/link";
import { requireSr } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Empty, LinkBtn } from "@/components/ui";

const STATUS_TONE: Record<string, "slate" | "blue" | "green" | "yellow"> = {
  DRAFT: "slate",
  OPEN: "green",
  CLOSED: "yellow",
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "下書き",
  OPEN: "運用中",
  CLOSED: "終了",
};

export default async function SrPeriodsPage() {
  const session = await requireSr();
  const periods = await prisma.evaluationPeriod.findMany({
    where: { client: { tenantId: session.user.tenantId! } },
    orderBy: { startDate: "desc" },
    include: {
      client: true,
      template: true,
      _count: { select: { evaluations: true } },
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="評価期間"
        description="クライアント企業ごとに評価期間を設定し運用します"
        actions={<LinkBtn href="/sr/periods/new">+ 新規作成</LinkBtn>}
      />

      {periods.length === 0 ? (
        <Empty message="評価期間がまだありません。" />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="text-left px-4 py-2">期間名</th>
                <th className="text-left px-4 py-2">クライアント</th>
                <th className="text-left px-4 py-2">制度</th>
                <th className="text-left px-4 py-2">期間</th>
                <th className="text-left px-4 py-2">対象数</th>
                <th className="text-left px-4 py-2">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 font-medium">
                    <Link className="hover:underline" href={`/sr/periods/${p.id}`}>
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{p.client.name}</td>
                  <td className="px-4 py-2">{p.template.name}</td>
                  <td className="px-4 py-2 text-xs">
                    {p.startDate.toISOString().slice(0, 10)} 〜{" "}
                    {p.endDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-2">{p._count.evaluations}</td>
                  <td className="px-4 py-2">
                    <Badge tone={STATUS_TONE[p.status]}>
                      {STATUS_LABEL[p.status]}
                    </Badge>
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
