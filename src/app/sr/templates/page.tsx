import Link from "next/link";
import { requireSr } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, PageHeader } from "@/components/Shell";
import { Badge, Btn, Empty, Field, Input, LinkBtn, Select, Textarea } from "@/components/ui";
import { createTemplateFromCsv } from "@/app/sr/csv-actions";

export default async function SrTemplatesPage() {
  const session = await requireSr();
  const tenantId = session.user.tenantId!;
  const [templates, clients] = await Promise.all([
    prisma.evaluationTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { items: true, periods: true } },
      },
    }),
    prisma.client.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="評価制度テンプレート"
        description="クライアント企業に適用する評価制度を作成します"
        actions={<LinkBtn href="/sr/templates/new">+ 手入力で新規作成</LinkBtn>}
      />

      {templates.length === 0 ? (
        <Empty message="評価制度テンプレートがまだありません。" />
      ) : (
        <Card>
          <table className="w-full text-sm min-w-[600px] sm:min-w-0">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="text-left px-4 py-2">名称</th>
                <th className="text-left px-4 py-2">スコープ</th>
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
                  <td className="px-4 py-2 text-xs">
                    {t.client ? (
                      <Badge tone="blue">{t.client.name} 専用</Badge>
                    ) : (
                      <Badge tone="slate">共有</Badge>
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

      <Card className="p-5">
        <CardHeader title="CSV から新規テンプレートを作成" />
        <p className="text-xs text-slate-600 mb-3">
          評価項目・面談ポイント・各点の絶対評価基準を 1 つの CSV にまとめてアップロードすると、
          そのままテンプレートが作成されます。クライアント企業を選択するとその会社専用テンプレに、
          未選択ならテナント共有テンプレになります。
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
        <form action={createTemplateFromCsv} className="space-y-3 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="クライアント企業">
              <Select name="clientId">
                <option value="">（共有 - 全クライアント）</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="テンプレート名">
              <Input name="name" placeholder="2026年度 行動指針" required />
            </Field>
          </div>
          <Field label="説明（任意）">
            <Textarea name="description" />
          </Field>
          <Field
            label="CSV ファイル"
            hint="ヘッダ: sortOrder, name, description, weight, maxScore, interviewPoint, interviewQuestions, level5..level1"
          >
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
