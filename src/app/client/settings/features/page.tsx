import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Btn } from "@/components/ui";
import { updateOwnClientFeatures } from "@/app/client/actions";

export default async function ClientFeaturesPage() {
  const session = await requireClientAdmin();
  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId! },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="機能の表示設定"
        description="自社で利用する機能を切り替えます。OFF にすると、管理者画面と従業員モバイル画面のメニューと画面が非表示になります。"
      />

      <Card className="p-6 max-w-xl">
        <form action={updateOwnClientFeatures} className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="wageEnabled"
              defaultChecked={client?.wageEnabled ?? true}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">💴 賃金表示機能</div>
              <div className="text-xs text-slate-600 mt-0.5">
                管理者は月次賃金を CSV / 手入力で登録、従業員はマイページから自分の賃金履歴を確認できます。
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="leaveEnabled"
              defaultChecked={client?.leaveEnabled ?? true}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">🏖️ 有給表示機能</div>
              <div className="text-xs text-slate-600 mt-0.5">
                管理者は有給残高を登録、従業員はマイページから自分の残日数を確認できます。
              </div>
            </div>
          </label>

          <div className="pt-3">
            <Btn type="submit">保存</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
