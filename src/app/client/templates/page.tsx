import Link from "next/link";
import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, PageHeader } from "@/components/Shell";
import { Badge, Btn, Empty, Field, Input, LinkBtn, Textarea } from "@/components/ui";
import { duplicateTemplateForClient } from "@/app/client/actions";
import { createOwnTemplateFromCsv } from "@/app/client/csv-actions";

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
        actions={<LinkBtn href="/client/templates/new">+ 手入力で新規作成</LinkBtn>}
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
                  <td className="py-2 font-medium">
                    {t.name}
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
                      <Btn type="submit" variant="secondary">
                        自社用に複製して編集
                      </Btn>
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
          <Empty message="自社テンプレートはまだありません。「新規作成」「CSV から作成」または上の共有テンプレを複製してください。" />
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

      <Card className="p-5">
        <CardHeader title="CSV から自社テンプレートを作成" />
        <p className="text-xs text-slate-600 mb-3">
          評価項目・面談ポイント・各点の絶対評価基準を1つの CSV にまとめてアップロードすると、
          自社専用テンプレートとして作成されます。
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <a
            href="/api/templates/sample-csv"
            download
            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50"
          >
            ⬇ 雛形 CSV をダウンロード
          </a>
        </div>
        <form action={createOwnTemplateFromCsv} className="space-y-3 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="テンプレート名">
              <Input name="name" placeholder="2026年度 行動指針" required />
            </Field>
            <Field label="説明（任意）">
              <Input name="description" />
            </Field>
          </div>
          <Field label="CSV ファイル" hint="ヘッダ: sortOrder, name, description, weight, maxScore, interviewPoint, interviewQuestions, level5..level1">
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:text-slate-800 file:text-xs file:font-semibold file:cursor-pointer"
            />
          </Field>
          <div className="pt-2">
            <Btn type="submit">⬆ CSV から作成</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
