import { requireSr } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, PageHeader } from "@/components/Shell";
import { Badge, Btn, Empty, Field, Input, Select, Textarea } from "@/components/ui";
import {
  upsertApiKey,
  toggleApiKeyActive,
  deleteApiKey,
} from "@/app/sr/settings/actions";

const SERVICE_LABELS: Record<string, { name: string; hint: string }> = {
  OPENAI: { name: "OpenAI", hint: "sk-... で始まるシークレットキー" },
  ANTHROPIC: { name: "Anthropic Claude", hint: "sk-ant-... で始まるシークレットキー" },
  YAYOI_PAYROLL: { name: "弥生給与", hint: "API キー（弥生クラウド）" },
  FREEE: { name: "freee 人事労務", hint: "OAuth アクセストークン" },
  MONEY_FORWARD: { name: "マネーフォワード", hint: "OAuth アクセストークン" },
  CUSTOM: { name: "その他カスタム", hint: "任意のシークレット文字列" },
};

const META_HINTS: Record<string, string> = {
  CUSTOM: "key1=value1\nkey2=value2",
};

export default async function ApiKeysPage() {
  const session = await requireSr();
  const tenantId = session.user.tenantId!;

  const keys = await prisma.tenantApiKey.findMany({
    where: { tenantId },
    orderBy: [{ isActive: "desc" }, { service: "asc" }],
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="外部サービス API キー（事務所単位）"
        description="社労士事務所が複数クライアント横断で使うサービス（AI / 給与ソフト連携 等）。Slack/LINE/ChatWorkは会社毎の設定のため各クライアント企業の管理者画面で設定します。メール送信(Resend)はシステム全体で共通利用するため設定は不要です。"
      />

      <Card className="p-4 bg-amber-50 border-amber-200">
        <h2 className="font-semibold text-sm mb-2">⚠️ セキュリティ上の注意</h2>
        <ul className="text-xs text-slate-700 list-disc pl-5 space-y-1">
          <li>APIキーは保存後、画面上では再表示できません（マスク表示のみ）。</li>
          <li>誤って共有された場合は、各サービス側で再発行 → ここで上書き登録してください。</li>
          <li>有効化トグル/削除は即時反映されます。</li>
        </ul>
      </Card>

      <Card className="p-5">
        <CardHeader title="登録済みキー" />
        {keys.length === 0 ? (
          <Empty message="まだAPIキーが登録されていません。下のフォームから追加してください。" />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="text-left py-2">サービス</th>
                <th className="text-left py-2">ラベル</th>
                <th className="text-left py-2">最終利用</th>
                <th className="text-left py-2">期限</th>
                <th className="text-left py-2">状態</th>
                <th className="text-right py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keys.map((k) => (
                <tr key={k.id}>
                  <td className="py-2">
                    <div className="font-medium">{SERVICE_LABELS[k.service]?.name ?? k.service}</div>
                    <div className="text-xs text-slate-500">{k.service}</div>
                  </td>
                  <td className="py-2">{k.label}</td>
                  <td className="py-2 text-xs text-slate-500">
                    {k.lastUsedAt ? k.lastUsedAt.toISOString().slice(0, 10) : "未使用"}
                  </td>
                  <td className="py-2 text-xs text-slate-500">
                    {k.expiresAt ? k.expiresAt.toISOString().slice(0, 10) : "-"}
                  </td>
                  <td className="py-2">
                    <Badge tone={k.isActive ? "green" : "slate"}>
                      {k.isActive ? "有効" : "停止"}
                    </Badge>
                  </td>
                  <td className="py-2 text-right">
                    <div className="inline-flex gap-2">
                      <form
                        action={async () => {
                          "use server";
                          await toggleApiKeyActive(k.id);
                        }}
                      >
                        <Btn type="submit" variant="ghost">
                          {k.isActive ? "停止" : "有効化"}
                        </Btn>
                      </form>
                      <form
                        action={async () => {
                          "use server";
                          await deleteApiKey(k.id);
                        }}
                      >
                        <Btn type="submit" variant="danger">削除</Btn>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-5">
        <CardHeader title="API キーを追加 / 上書き" />
        <p className="text-xs text-slate-500 mb-3">
          同じサービスを再登録すると上書きされます（古いキーは破棄）。
        </p>
        <form
          action={async (fd) => {
            "use server";
            await upsertApiKey(fd);
          }}
          className="space-y-3 max-w-2xl"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="サービス">
              <Select name="service" required>
                {Object.entries(SERVICE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ラベル">
              <Input name="label" placeholder="例: メイン Resend Key" required />
            </Field>
          </div>
          <Field label="API キー（シークレット）" hint="保存後はマスク表示になります">
            <Input name="value" type="password" required placeholder="sk-... / re_... / xxxx-yyyy" />
          </Field>
          <Field
            label="メタデータ（任意）"
            hint="JSON または key=value 形式（1行1組）。送信元アドレスやチャンネル等の補助情報"
          >
            <Textarea name="metadata" placeholder={META_HINTS.RESEND} />
          </Field>
          <Field label="有効期限（任意）">
            <Input type="date" name="expiresAt" />
          </Field>
          <div className="pt-2">
            <Btn type="submit">保存</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
