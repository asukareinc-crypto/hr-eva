import { requireSr } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { LinkBtn } from "@/components/ui";
import Link from "next/link";

export default async function SrDashboard() {
  const session = await requireSr();
  const tenantId = session.user.tenantId!;

  const [clientCount, templateCount, openPeriods] = await Promise.all([
    prisma.client.count({ where: { tenantId } }),
    prisma.evaluationTemplate.count({ where: { tenantId } }),
    prisma.evaluationPeriod.count({
      where: { client: { tenantId }, status: "OPEN" },
    }),
  ]);

  const recentPeriods = await prisma.evaluationPeriod.findMany({
    where: { client: { tenantId } },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { client: true, template: true, _count: { select: { evaluations: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="ダッシュボード"
        description="評価制度・クライアント・期間の状況を一覧表示します"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="クライアント企業" value={clientCount} href="/sr/clients" />
        <Stat label="評価制度テンプレ" value={templateCount} href="/sr/templates" />
        <Stat label="運用中の期間" value={openPeriods} href="/sr/periods" />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">最近の評価期間</h2>
          <LinkBtn href="/sr/periods" variant="secondary">一覧</LinkBtn>
        </div>
        {recentPeriods.length === 0 ? (
          <div className="text-sm text-slate-500">まだ評価期間がありません。</div>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {recentPeriods.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between">
                <div>
                  <Link href={`/sr/periods/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">
                    {p.client.name} / {p.template.name}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {p.startDate.toISOString().slice(0, 10)} 〜 {p.endDate.toISOString().slice(0, 10)}
                  ・対象 {p._count.evaluations}名
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </Card>
    </Link>
  );
}
