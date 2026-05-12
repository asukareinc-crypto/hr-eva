/**
 * メール送信モジュール。
 * Resend API キーはシステム共通（環境変数 RESEND_API_KEY）。
 * 未設定時は console にログ出力（開発／本番ドライラン用）。
 */

type SendArgs = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  /** 後方互換のため受け取るが、現状は無視（共通APIキーを使用） */
  tenantId?: string;
};

const DEFAULT_FROM = process.env.MAIL_FROM ?? "HR EVA <noreply@example.com>";

export async function sendMail(args: SendArgs): Promise<{ ok: boolean; via: string; error?: string }> {
  const recipients = Array.isArray(args.to) ? args.to : [args.to];
  if (recipients.length === 0) return { ok: true, via: "noop" };

  const apiKey = process.env.RESEND_API_KEY;
  const from = DEFAULT_FROM;

  if (!apiKey) {
    console.log(
      "[mail:dev]",
      JSON.stringify({ from, to: recipients, subject: args.subject, text: args.text }, null, 2)
    );
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
