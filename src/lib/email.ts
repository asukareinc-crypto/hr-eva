import { getTenantApiKey } from "@/lib/tenant-api-key";

/**
 * メール送信モジュール。
 * 優先順位:
 *   1) テナント固有の Resend API キー（TenantApiKey）
 *   2) 環境変数 RESEND_API_KEY
 *   3) console.log にフォールバック（開発用）
 */

type SendArgs = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  tenantId?: string; // 指定があればそのテナントのキーを優先
};

const DEFAULT_FROM = process.env.MAIL_FROM ?? "HR EVA <noreply@example.com>";

export async function sendMail(args: SendArgs): Promise<{ ok: boolean; via: string; error?: string }> {
  const recipients = Array.isArray(args.to) ? args.to : [args.to];
  if (recipients.length === 0) return { ok: true, via: "noop" };

  // 1) tenant-specific
  let apiKey: string | undefined;
  let from = DEFAULT_FROM;
  if (args.tenantId) {
    const tk = await getTenantApiKey(args.tenantId, "RESEND");
    if (tk) {
      apiKey = tk.value;
      if (tk.metadata?.from) from = tk.metadata.from;
    }
  }
  // 2) env fallback
  if (!apiKey) apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("[mail:dev]", JSON.stringify({ from, to: recipients, subject: args.subject, text: args.text }, null, 2));
    return { ok: true, via: "console" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: args.subject,
        text: args.text,
        html: args.html,
      }),
    });
    if (!res.ok) {
      const error = await res.text();
      console.error("[mail:resend] failed:", error);
      return { ok: false, via: "resend", error };
    }
    return { ok: true, via: "resend" };
  } catch (e) {
    console.error("[mail:resend] error:", e);
    return { ok: false, via: "resend", error: String(e) };
  }
}

// ----- テンプレート -----
export function periodOpenedEmail(args: {
  periodName: string;
  employeeName: string;
  appUrl: string;
  endDate: string;
}) {
  return {
    subject: `【人事評価】${args.periodName} の評価が開始されました`,
    text: `${args.employeeName} 様

人事評価期間「${args.periodName}」が開始されました。
締切：${args.endDate}

下記URLより自己評価を入力してください。
${args.appUrl}/m

※このメールはシステムから自動送信されています。`,
  };
}

export function periodReminderEmail(args: {
  periodName: string;
  employeeName: string;
  appUrl: string;
  endDate: string;
  daysLeft: number;
}) {
  return {
    subject: `【リマインド】${args.periodName} 評価の締切まで残り${args.daysLeft}日`,
    text: `${args.employeeName} 様

評価期間「${args.periodName}」の締切が近づいています。
締切：${args.endDate}（残り${args.daysLeft}日）

未提出の方は下記URLより入力をお願いします。
${args.appUrl}/m`,
  };
}
