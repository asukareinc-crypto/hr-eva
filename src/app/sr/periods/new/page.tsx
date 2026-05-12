import { requireSr } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Btn, Field, Input, Select } from "@/components/ui";
import { createPeriod } from "@/app/sr/actions";

export default async function NewPeriodPage() {
  const session = await requireSr();
  const tenantId = session.user.tenantId!;
  const [clients, templates] = await Promise.all([
    prisma.client.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.evaluationTemplate.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="評価期間 新規作成"
        description="年2回（上期/下期）で運用するのが一般的です。各種期限を設定すると関係者へのリマインドに使用されます。"
      />
      <Card className="p-6 max-w-2xl">
        <form action={createPeriod} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="クライアント企業">
              <Select name="clientId" required>
                <option value="">選択してください</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="評価制度">
              <Select name="templateId" required>
                <option value="">選択してください</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

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
              <Field label="自己評価 提出期限" hint="例: 4月10日">
                <Input type="date" name="selfEvalDueDate" />
              </Field>
              <Field label="一次評価者 提出期限" hint="例: 4月20日">
                <Input type="date" name="primaryEvalDueDate" />
              </Field>
              <Field label="最終評価者 提出期限">
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
