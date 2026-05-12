import { Card, PageHeader } from "@/components/Shell";
import { Btn, Field, Input, Textarea } from "@/components/ui";
import { createClientTemplate } from "@/app/client/actions";

export default function NewClientTemplatePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="自社評価制度 新規作成"
        description="自社専用の評価制度を作成します。名前と説明だけ入力すれば、後で評価項目・面談ポイント・絶対評価基準を編集できます。"
      />
      <Card className="p-6 max-w-xl">
        <form action={createClientTemplate} className="space-y-4">
          <Field label="制度名">
            <Input name="name" required placeholder="2026年度 行動指針" />
          </Field>
          <Field label="説明（任意）">
            <Textarea name="description" />
          </Field>
          <div className="pt-2">
            <Btn type="submit">作成</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
