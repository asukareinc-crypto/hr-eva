import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, PageHeader } from "@/components/Shell";
import { Badge, Btn, Empty, Field, Input, Select, Textarea } from "@/components/ui";
import {
  upsertClientApiKey,
  toggleClientApiKey,
  deleteClientApiKey,
} from "@/app/client/settings/actions";

const SERVICE_LABELS: Record<string, { name: string; hint: string }> = {
  SLACK_WEBHOOK: {
    name: "Slack",
    hint: "Slack Incoming Webhook URL（https://hooks.slack.com/services/...）",
  },
  LINE_NOTIFY: {
    name: "LINE Notify",
    hint: "LINE Notify アクセストークン",
  },
  CHATWORK: {
    name: "ChatWork",
    hint: "ChatWork API トークン（メタデータに roomId=... を必ず指定）",
  },
  CUSTOM: { name: "その他カスタム", hint: "任意のシークレット文字列" },
};

const META_HINTS: Record<string, string> = {
  SLACK_WEBHOOK: "channel=#hr-eva-notify\nusername=HR EVA",
  CHATWORK: "roomId=12345678",
  CUSTOM: "key1=value1\nkey2=value2",
};

export default async function ClientApiKeysPage() {
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;

  const keys = await prisma.clientApiKey.findMany({
    where: { clientId },
    orderBy: [{ isActive: "desc" }, { service: "asc" }],
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="外部通知の連携設定"
        description="Slack / LINE / ChatWork などへの通知に使う API キーを会社単位で設定します。AES-256-GCM で暗号化して保存。"
      />

      <Card className="p-4 bg-amber-50 border-amber-200">
        <h2 className="font-semibold text-sm mb-2">⚠️ セキュリティ上の注意</h2>
        <ul className="text-xs text-slate-700 list-disc pl-5 space-y-1">
          <li>APIキーは保存後、画面上では再表示できません（マスク表示のみ）。</li>
          <li>Slack の Incoming Webhook は管理者が発行 → URL をここに登録します。</li>
          <li>LINE Notify は <code>https://notify-bot.line.me/my/</code> から発行できます。</li>
          <li>ChatWork は「サービス連携」→「API Token」、メタデータに送信先 <code>roomId</code> を指定してください。</li>
        </ul>
      </Card>

      <Card className="p-5">
        <CardHeader title="登録済みキー" />
        {keys.length === 0 ? (
          <Empty message="まだAPIキーが登録されていません。下のフォームから追加してください。" />
        ) : (
          <table className="w-full text-sm min-w-[600px] sm:min-w-0">
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
                          await toggleClientApiKey(k.id);
                        }}
                      >
                        <Btn type="submit" variant="ghost">
                          {k.isActive ? "停止" : "有効化"}
                        </Btn>
                      </form>
                      <form
                        action={async () => {
                          "use server";
                          await deleteClientApiKey(k.id);
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
            await upsertClientApiKey(fd);
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
              <Input name="label" placeholder="例: 営業部Slackチャンネル" required />
            </Field>
          </div>
          <Field label="API キー / Webhook URL（シークレット）" hint="保存後はマスク表示になります">
            <Input
              name="value"
              type="password"
              required
              placeholder="https://hooks.slack.com/services/... など"
            />
          </Field>
          <Field
            label="メタデータ（任意）"
            hint="JSON または key=value 形式（1行1組）。送信先チャンネル/ルームID 等"
          >
            <Textarea name="metadata" placeholder={META_HINTS.SLACK_WEBHOOK} />
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
