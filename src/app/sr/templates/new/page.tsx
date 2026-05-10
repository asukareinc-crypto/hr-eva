import { Card, PageHeader } from "@/components/Shell";
import { Btn, Field, Input, Textarea } from "@/components/ui";
import { createTemplate } from "@/app/sr/actions";

export default function NewTemplatePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="評価制度 新規作成"
        description="名称と説明を入力してください。デフォルトの評価項目（業務遂行力／コミュニケーション／目標達成度）が自動でセットされます。作成後に項目を編集できます。"
      />
      <Card className="p-6 max-w-xl">
        <form action={createTemplate} className="space-y-4">
          <Field label="制度名">
            <Input name="name" required placeholder="標準評価制度 2026年度版" />
          </Field>
          <Field label="説明（任意）">
            <Textarea name="description" />
          </Field>
          <div className="flex gap-2 pt-2">
            <Btn type="submit">作成</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
