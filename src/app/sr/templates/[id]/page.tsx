import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSr } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Btn, Field, Input, Textarea } from "@/components/ui";
import {
  updateTemplate,
  addTemplateItem,
  updateTemplateItem,
  deleteTemplateItem,
  upsertItemLevels,
} from "@/app/sr/actions";
import { importTemplateItemsCsv } from "@/app/sr/csv-actions";
import { CsvPanel } from "@/components/CsvPanel";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSr();
  const template = await prisma.evaluationTemplate.findFirst({
    where: { id, tenantId: session.user.tenantId! },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { levels: { orderBy: { score: "desc" } } },
      },
    },
  });
  if (!template) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title={template.name}
        description="評価制度テンプレートの編集（絶対評価の各点定義もここで設定）"
        actions={
          <Link
            href="/sr/templates"
            className="text-sm text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
          >
            ← 一覧へ
          </Link>
        }
      />

      <Card className="p-6">
        <form
          action={async (fd) => {
            "use server";
            await updateTemplate(id, fd);
          }}
          className="space-y-4 max-w-xl"
        >
          <Field label="制度名">
            <Input name="name" defaultValue={template.name} required />
          </Field>
          <Field label="説明">
            <Textarea name="description" defaultValue={template.description ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={template.isActive} />
            有効
          </label>
          <Btn type="submit">保存</Btn>
        </form>
      </Card>

      <CsvPanel
        title="評価項目 CSV 入出力"
        description="社労士事務所がコンサルで作成した評価内容を CSV で一括登録できます。インポートは全置換（既存項目は削除されます）。エクスポートで現状を取得 → 編集 → 再アップロードのフローを推奨。"
        exportHref={`/api/sr/templates/${id}/export`}
        importAction={async (fd) => {
          "use server";
          await importTemplateItemsCsv(id, fd);
        }}
        helpText="ヘッダ: sortOrder,name,description,weight,maxScore,interviewPoint,interviewQuestions,level5..level1"
      />

      <Card className="p-6">
        <h2 className="font-semibold mb-3">評価項目</h2>
        <p className="text-xs text-slate-500 mb-3">
          項目の基本情報を更新したあと、その下の「点数別の評価基準（絶対評価）」で各点の定義を入力できます。
        </p>
        <div className="space-y-4">
          {template.items.map((item) => (
            <div key={item.id} className="border border-slate-200 rounded-md p-3 space-y-3">
              <form
                action={async (fd) => {
                  "use server";
                  await updateTemplateItem(item.id, fd);
                }}
                className="space-y-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                  <div className="md:col-span-4">
                    <Input name="name" defaultValue={item.name} placeholder="項目名" />
                  </div>
                  <div className="md:col-span-4">
                    <Input
                      name="description"
                      defaultValue={item.description ?? ""}
                      placeholder="項目の説明"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input
                      name="weight"
                      type="number"
                      min={1}
                      defaultValue={item.weight}
                      title="重み"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input
                      name="maxScore"
                      type="number"
                      min={1}
                      defaultValue={item.maxScore}
                      title="最大点"
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <Btn type="submit" variant="secondary">基本情報を更新</Btn>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 font-medium mb-1 block">
                      💬 面談のポイント（観点）
                    </label>
                    <Textarea
                      name="interviewPoint"
                      defaultValue={item.interviewPoint ?? ""}
                      placeholder={"例:\n・本人と上司で評価が割れた場合の理由を擦り合わせる\n・期間全体で見たときの傾向を確認する"}
                      className="min-h-[120px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 font-medium mb-1 block">
                      ❓ 質問例（1行1問）
                    </label>
                    <Textarea
                      name="interviewQuestions"
                      defaultValue={item.interviewQuestions ?? ""}
                      placeholder={"例:\n・この評価項目で印象に残った場面はありますか？\n・うまくいかなかった時、何が壁になりましたか？\n・次の半期で挑戦したいことは？"}
                      className="min-h-[120px]"
                    />
                  </div>
                </div>
              </form>

              <details className="bg-slate-50 rounded-md p-3" open={item.levels.length > 0}>
                <summary className="text-xs font-semibold text-slate-700 cursor-pointer">
                  点数別の評価基準（絶対評価）
                </summary>
                <form
                  action={async (fd) => {
                    "use server";
                    await upsertItemLevels(item.id, fd);
                  }}
                  className="space-y-2 mt-3"
                >
                  {Array.from({ length: item.maxScore }, (_, i) => item.maxScore - i).map((score) => {
                    const cur = item.levels.find((l) => l.score === score);
                    return (
                      <div key={score} className="flex gap-2 items-start">
                        <div className="w-12 text-sm font-mono pt-2">{score}点</div>
                        <Textarea
                          name={`level_${score}`}
                          defaultValue={cur?.description ?? ""}
                          placeholder={`${score}点の評価基準（例: 諸規則を自ら進んで守り、他の模範となっていた）`}
                          className="flex-1"
                        />
                      </div>
                    );
                  })}
                  <Btn type="submit" variant="secondary">基準を保存</Btn>
                </form>
              </details>

              <DeleteItemButton itemId={item.id} />
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="text-sm font-medium mb-2">項目を追加</div>
          <form
            action={async (fd) => {
              "use server";
              await addTemplateItem(id, fd);
            }}
            className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start"
          >
            <div className="md:col-span-4">
              <Input name="name" placeholder="項目名" required />
            </div>
            <div className="md:col-span-4">
              <Input name="description" placeholder="項目の説明" />
            </div>
            <div className="md:col-span-1">
              <Input name="weight" type="number" min={1} defaultValue={1} title="重み" />
            </div>
            <div className="md:col-span-1">
              <Input name="maxScore" type="number" min={1} defaultValue={5} title="最大点" />
            </div>
            <div className="md:col-span-2">
              <Btn type="submit">追加</Btn>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

function DeleteItemButton({ itemId }: { itemId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await deleteTemplateItem(itemId);
      }}
    >
      <Btn type="submit" variant="danger">
        項目を削除
      </Btn>
    </form>
  );
}
