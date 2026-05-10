import Link from "next/link";
import { requireSr } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Empty } from "@/components/ui";

export default async function SrGradesIndex() {
  const session = await requireSr();
  const clients = await prisma.client.findMany({
    where: { tenantId: session.user.tenantId! },
    orderBy: { name: "asc" },
    include: { _count: { select: { grades: true, employees: true } } },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="等級基準表"
        description="クライアント企業ごとの等級表（格付け評価）を管理します"
      />
      {clients.length === 0 ? (
        <Empty message="クライアント企業がまだ登録されていません" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clients.map((c) => (
            <Link key={c.id} href={`/sr/clients/${c.id}/grades`}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  等級 {c._count.grades} 件 / 従業員 {c._count.employees} 名
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
