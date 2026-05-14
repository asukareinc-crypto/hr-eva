import Link from "next/link";
import { requireSr } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Empty, LinkBtn } from "@/components/ui";

export default async function SrTemplatesPage() {
  const session = await requireSr();
  const templates = await prisma.evaluationTemplate.findMany({
    where: { tenantId: session.user.tenantId! },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true, periods: true } } },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="評価制度テンプレート"
        description="クライアント企業に適用する評価制度を作成します"
        actions={<LinkBtn href="/sr/templates/new">+ 新規作成</LinkBtn>}
      />

      {templates.length === 0 ? (
        <Empty message="評価制度テンプレートがまだありません。" />
      ) : (
        <Card>
          <table className="w-full text-sm min-w-[600px] sm:min-w-0">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="text-left px-4 py-2">名称</th>
                <th className="text-left px-4 py-2">項目数</th>
                <th className="text-left px-4 py-2">適用期間数</th>
                <th className="text-left px-4 py-2">状態</th>
                <th className="text-right px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2 font-medium">
                    <Link className="hover:underline" href={`/sr/templates/${t.id}`}>
                      {t.name}
                    </Link>
                    {t.description && (
                      <div className="text-xs text-slate-500">{t.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-2">{t._count.items}</td>
                  <td className="px-4 py-2">{t._count.periods}</td>
                  <td className="px-4 py-2">
                    {t.isActive ? <Badge tone="green">有効</Badge> : <Badge tone="slate">無効</Badge>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link className="underline" href={`/sr/templates/${t.id}`}>編集</Link>
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
