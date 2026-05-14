import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSr } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Btn, Empty, Field, Input, Textarea } from "@/components/ui";
import { createGrade, deleteGrade } from "@/app/sr/actions";
import { importGradesCsv } from "@/app/sr/csv-actions";
import { CsvPanel } from "@/components/CsvPanel";

export default async function ClientGradesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSr();
  const client = await prisma.client.findFirst({
    where: { id, tenantId: session.user.tenantId! },
    include: { grades: { orderBy: { rank: "asc" } } },
  });
  if (!client) notFound();

  const nextRank = (client.grades.length ? Math.max(...client.grades.map((g) => g.rank)) : 0) + 1;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${client.name} の等級表`}
        description="格付け評価で用いる等級基準。会社ごとの役割・期待・給与レンジを設定します。"
        actions={
          <Link href={`/sr/clients/${id}`} className="text-sm text-slate-600 underline-offset-2 hover:underline">
            ← クライアント詳細
          </Link>
        }
      />

      {client.grades.length === 0 ? (
        <Empty message="等級がまだ登録されていません。下のフォームから追加してください。" />
      ) : (
        <Card>
          <table className="w-full text-sm min-w-[600px] sm:min-w-0">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="text-left px-3 py-2">等級</th>
                <th className="text-left px-3 py-2">名称</th>
                <th className="text-left px-3 py-2">役割</th>
                <th className="text-left px-3 py-2">給与レンジ</th>
                <th className="text-left px-3 py-2">マネージャー</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {client.grades.map((g) => (
                <tr key={g.id} className="align-top">
                  <td className="px-3 py-2 font-mono">{g.rank}</td>
                  <td className="px-3 py-2 font-medium">{g.name}</td>
                  <td className="px-3 py-2 max-w-md">
                    <div className="font-medium">{g.role ?? "-"}</div>
                    {g.description && (
                      <div className="text-xs text-slate-500 mt-1">{g.description}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {g.salaryMin || g.salaryMax
                      ? `¥${(g.salaryMin ?? 0).toLocaleString()} 〜 ¥${(g.salaryMax ?? 0).toLocaleString()}`
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs">{g.isManager ? "○" : "-"}</td>
                  <td className="px-3 py-2 text-right">
                    <form
                      action={async () => {
                        "use server";
                        await deleteGrade(g.id);
                      }}
                    >
                      <Btn type="submit" variant="ghost">削除</Btn>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CsvPanel
        title="等級表 CSV 入出力"
        description="等級基準表を CSV で一括登録／取得できます。インポートは rank で UPSERT（既存はマージ更新、新規は追加）。"
        exportHref={`/api/sr/clients/${id}/grades/export`}
        importAction={async (fd) => {
          "use server";
          await importGradesCsv(id, fd);
        }}
        helpText="ヘッダ: rank,name,role,description,salaryMin,salaryMax,isManager"
        extraFields={
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" name="replaceMode" />
            既存の等級を全削除してから登録（注意：従業員に紐づく等級が外れます）
          </label>
        }
      />

      <Card className="p-6">
        <h2 className="font-semibold mb-3">等級を追加 / 更新</h2>
        <p className="text-xs text-slate-500 mb-3">
          既存の等級番号を入力すると上書きされます。
        </p>
        <form action={createGrade} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input type="hidden" name="clientId" value={id} />
          <div className="md:col-span-2">
            <Field label="等級番号">
              <Input name="rank" type="number" min={1} defaultValue={nextRank} required />
            </Field>
          </div>
          <div className="md:col-span-3">
            <Field label="等級名">
              <Input name="name" placeholder={`${nextRank}等級`} required />
            </Field>
          </div>
          <div className="md:col-span-7">
            <Field label="役割（簡潔に）">
              <Input name="role" placeholder="一般スタッフ / マネージャー など" />
            </Field>
          </div>

          <div className="md:col-span-12">
            <Field label="期待される行動・成果">
              <Textarea name="description" />
            </Field>
          </div>

          <div className="md:col-span-3">
            <Field label="基本給 下限">
              <Input name="salaryMin" type="number" />
            </Field>
          </div>
          <div className="md:col-span-3">
            <Field label="基本給 上限">
              <Input name="salaryMax" type="number" />
            </Field>
          </div>
          <div className="md:col-span-3 flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isManager" />
              マネージャー等級
            </label>
          </div>
          <div className="md:col-span-3 flex items-end justify-end">
            <Btn type="submit">保存</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
