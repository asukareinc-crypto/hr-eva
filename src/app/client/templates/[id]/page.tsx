import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Btn, Field, Input, Textarea } from "@/components/ui";
import {
  updateClientTemplate,
  addClientTemplateItem,
  updateClientTemplateItem,
  deleteClientTemplateItem,
  upsertClientItemLevels,
} from "@/app/client/actions";

export default async function ClientTemplateDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireClientAdmin();
  const template = await prisma.evaluationTemplate.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId!,
      clientId: session.user.clientId!,
    },
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
        description="自社専用テンプレートの編集"
        actions={
          <Link href="/client/templates" className="text-sm text-slate-600 underline-offset-2 hover:underline">
            ← 一覧へ
          </Link>
        }
      />

      <Card className="p-6">
        <form
          action={async (fd) => {
            "use server";
            await updateClientTemplate(id, fd);
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

      <Card className="p-6">
        <h2 className="font-semibold mb-3">評価項目</h2>
        <div className="space-y-4">
          {template.items.map((item) => (
            <div key={item.id} className="border border-slate-200 rounded-md p-3 space-y-3">
              <form
                action={async (fd) => {
                  "use server";
                  await updateClientTemplateItem(item.id, fd);
                }}
                className="space-y-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                  <div className="md:col-span-4">
                    <Input name="name" defaultValue={item.name} placeholder="項目名" />
                  </div>
                  <div className="md:col-span-4">
                    <Input name="description" defaultValue={item.description ?? ""} placeholder="項目の説明" />
                  </div>
                  <div className="md:col-span-1">
                    <Input name="weight" type="number" min={1} defaultValue={item.weight} title="重み" />
                  </div>
                  <div className="md:col-span-1">
                    <Input name="maxScore" type="number" min={1} defaultValue={item.maxScore} title="最大点" />
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
                    await upsertClientItemLevels(item.id, fd);
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
                          placeholder={`${score}点の評価基準`}
                          className="flex-1"
                        />
                      </div>
                    );
                  })}
                  <Btn type="submit" variant="secondary">基準を保存</Btn>
                </form>
              </details>

              <form
                action={async () => {
                  "use server";
                  await deleteClientTemplateItem(item.id);
                }}
              >
                <Btn type="submit" variant="danger">項目を削除</Btn>
              </form>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="text-sm font-medium mb-2">項目を追加</div>
          <form
            action={async (fd) => {
              "use server";
              await addClientTemplateItem(id, fd);
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
