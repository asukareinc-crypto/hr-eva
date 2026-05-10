import { Card, PageHeader } from "@/components/Shell";
import { Btn, Field, Input } from "@/components/ui";
import { createClient } from "@/app/sr/actions";

export default function NewClientPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="クライアント企業 新規登録" />
      <Card className="p-6 max-w-xl">
        <form action={createClient} className="space-y-4">
          <Field label="企業名">
            <Input name="name" required placeholder="株式会社◯◯" />
          </Field>

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="text-sm font-medium text-slate-700">
              初期管理者ユーザー（任意）
            </div>
            <Field label="管理者氏名">
              <Input name="adminName" placeholder="山田 太郎" />
            </Field>
            <Field label="メールアドレス">
              <Input type="email" name="adminEmail" placeholder="admin@example.com" />
            </Field>
            <Field label="初期パスワード" hint="8文字以上を推奨">
              <Input type="text" name="adminPassword" placeholder="任意のパスワード" />
            </Field>
          </div>

          <div className="flex gap-2 pt-2">
            <Btn type="submit">作成</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
