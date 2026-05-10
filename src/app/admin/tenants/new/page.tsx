import { Card, PageHeader } from "@/components/Shell";
import { Btn, Field, Input } from "@/components/ui";
import { createTenant } from "@/app/admin/actions";

export default function NewTenantPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="社労士テナント 新規作成" />
      <Card className="p-6 max-w-xl">
        <form action={createTenant} className="space-y-4">
          <Field label="テナント名">
            <Input name="name" required placeholder="◯◯社会保険労務士事務所" />
          </Field>
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="text-sm font-medium text-slate-700">初期社労士ユーザー</div>
            <Field label="氏名">
              <Input name="adminName" />
            </Field>
            <Field label="メール">
              <Input type="email" name="adminEmail" />
            </Field>
            <Field label="初期パスワード">
              <Input type="text" name="adminPassword" />
            </Field>
          </div>
          <Btn type="submit">作成</Btn>
        </form>
      </Card>
    </div>
  );
}
