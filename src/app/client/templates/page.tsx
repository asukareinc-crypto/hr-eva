import Link from "next/link";
import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Empty, LinkBtn, Btn } from "@/components/ui";
import { duplicateTemplateForClient } from "@/app/client/actions";

export default async function ClientTemplatesPage() {
  const session = await requireClientAdmin();
  const tenantId = session.user.tenantId!;
  const clientId = session.user.clientId!;

  const templates = await prisma.evaluationTemplate.findMany({
    where: {
      tenantId,
      OR: [{ clientId: null }, { clientId }],
    },
    orderBy: [{ clientId: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { items: true, periods: true } } },
  });

  const shared = templates.filter((t) => t.clientId === null);
  const own = templates.filter((t) => t.clientId === clientId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="評価制度テンプレート"
        description="社労士が作成した「共有テンプレ」と、自社専用に作成・複製した「自社テンプレ」を管理します"
        actions={<LinkBtn href="/client/templates/new">+ 新規作成</LinkBtn>}
      />

      <Card className="p-5">
        <h2 className="font-semibold text-sm mb-3">🏛️ 社労士からの共有テンプレート</h2>
        {shared.length === 0 ? (
          <Empty message="共有テンプレートはまだありません。" />
        ) : (
          <table className="w-full text-sm min-w-[600px] sm:min-w-0">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="text-left py-2">名称</th>
                <th className="text-left py-2">項目数</th>
                <th className="text-left py-2">使用中の期間</th>
                <th className="text-right py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shared.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 font-medium">{t.name}
                    {t.description && (
                      <div className="text-xs text-slate-500 mt-0.5">{t.description}</div>
                    )}
                  </td>
                  <td className="py-2">{t._count.items}</td>
                  <td className="py-2">{t._count.periods}</td>
                  <td className="py-2 text-right">
                    <form
                      action={async () => {
                        "use server";
                        await duplicateTemplateForClient(t.id);
                      }}
                    >
                      <Btn type="submit" variant="secondary">自社用に複製して編集</Btn>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-[11px] text-slate-500 mt-2">
          共有テンプレは社労士が複数クライアント向けに作成したもの。直接編集はできません。自社専用に複製して編集してください。
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-sm mb-3">🏢 自社専用テンプレート</h2>
        {own.length === 0 ? (
          <Empty message="自社テンプレートはまだありません。「新規作成」または上の共有テンプレを複製してください。" />
        ) : (
          <table className="w-full text-sm min-w-[600px] sm:min-w-0">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="text-left py-2">名称</th>
                <th className="text-left py-2">項目数</th>
                <th className="text-left py-2">使用中の期間</th>
                <th className="text-left py-2">状態</th>
                <th className="text-right py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {own.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 font-medium">
                    <Link className="hover:underline" href={`/client/templates/${t.id}`}>
                      {t.name}
                    </Link>
                  </td>
                  <td className="py-2">{t._count.items}</td>
                  <td className="py-2">{t._count.periods}</td>
                  <td className="py-2">
                    {t.isActive ? <Badge tone="green">有効</Badge> : <Badge tone="slate">無効</Badge>}
                  </td>
                  <td className="py-2 text-right">
                    <Link className="underline text-slate-700" href={`/client/templates/${t.id}`}>
                      編集
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
