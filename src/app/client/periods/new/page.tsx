import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Btn, Field, Input, Select } from "@/components/ui";
import { createClientPeriod } from "@/app/client/actions";

export default async function NewClientPeriodPage() {
  const session = await requireClientAdmin();
  const tenantId = session.user.tenantId!;
  const clientId = session.user.clientId!;

  const templates = await prisma.evaluationTemplate.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [{ clientId: null }, { clientId }],
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="評価期間 新規作成"
        description="年2回（上期/下期）で運用する半期評価を開始します。"
      />
      <Card className="p-6 max-w-2xl">
        <form action={createClientPeriod} className="space-y-4">
          <Field label="評価制度">
            <Select name="templateId" required>
              <option value="">選択してください</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.clientId ? "（自社専用）" : "（共有テンプレ）"}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="期間名">
              <Input name="name" required placeholder="2026年度 上期評価" />
            </Field>
            <Field label="期">
              <Select name="half">
                <option value="">指定なし</option>
                <option value="UPPER">上期（11月〜4月）</option>
                <option value="LOWER">下期（5月〜10月）</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="評価対象期間 開始">
              <Input type="date" name="startDate" required />
            </Field>
            <Field label="評価対象期間 終了">
              <Input type="date" name="endDate" required />
            </Field>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="text-sm font-medium text-slate-700 mb-2">提出期限（任意）</div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="自己評価">
                <Input type="date" name="selfEvalDueDate" />
              </Field>
              <Field label="一次評価者">
                <Input type="date" name="primaryEvalDueDate" />
              </Field>
              <Field label="最終評価者">
                <Input type="date" name="finalEvalDueDate" />
              </Field>
            </div>
            <Field label="フィードバック面談 実施月" hint="例: 6月なら 6">
              <Input type="number" name="feedbackPeriodMonth" min={1} max={12} />
            </Field>
          </div>

          <Btn type="submit">作成</Btn>
        </form>
      </Card>
    </div>
  );
}
