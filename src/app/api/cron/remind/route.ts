import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { periodReminderEmail, sendMail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REMIND_THRESHOLDS_DAYS = [7, 3, 1, 0];

function daysUntil(target: Date, now: Date): number {
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const appUrl = process.env.NEXTAUTH_URL ?? "https://eva.recruit-coresystem.com";

  const periods = await prisma.evaluationPeriod.findMany({
    where: { status: "OPEN" },
    include: {
      client: true,
      evaluations: {
        include: {
          assignments: {
            where: { submittedAt: null },
            include: { evaluator: { include: { user: true } } },
          },
        },
      },
    },
  });

  const summary: Array<{
    periodId: string;
    periodName: string;
    clientName: string;
    daysLeft: number;
    matched: boolean;
    sentCount: number;
  }> = [];

  let totalSent = 0;
  for (const period of periods) {
    const daysLeft = daysUntil(period.endDate, now);
    const matched = REMIND_THRESHOLDS_DAYS.includes(daysLeft);

    if (!matched) {
      summary.push({
        periodId: period.id,
        periodName: period.name,
        clientName: period.client.name,
        daysLeft,
        matched: false,
        sentCount: 0,
      });
      continue;
    }

    // 同一評価者は期間内で1通に集約（複数の未提出割当を持つ所長等の重複送信を防ぐ）
    const recipients = new Map<string, string>();
    for (const e of period.evaluations) {
      for (const a of e.assignments) {
        const email = a.evaluator.user?.email;
        if (!email) continue;
        if (!recipients.has(email)) {
          recipients.set(email, a.evaluator.user?.name ?? email);
        }
      }
    }

    let sentCount = 0;
    for (const [email, name] of recipients) {
      const tpl = periodReminderEmail({
        periodName: period.name,
        employeeName: name,
        appUrl,
        endDate: period.endDate.toISOString().slice(0, 10),
        daysLeft: Math.max(0, daysLeft),
      });
      const result = await sendMail({ to: email, ...tpl });
      if (result.ok) sentCount += 1;
    }
    totalSent += sentCount;
    summary.push({
      periodId: period.id,
      periodName: period.name,
      clientName: period.client.name,
      daysLeft,
      matched: true,
      sentCount,
    });
  }

  return NextResponse.json({
    runAt: now.toISOString(),
    scannedPeriods: periods.length,
    totalSent,
    thresholds: REMIND_THRESHOLDS_DAYS,
    details: summary,
  });
}
