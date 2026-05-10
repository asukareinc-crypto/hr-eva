import Link from "next/link";
import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, PageHeader } from "@/components/Shell";
import { Badge, LinkBtn } from "@/components/ui";
import { DonutChart, DonutLegend, LineChart } from "@/components/charts";

export default async function ClientDashboard() {
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;

  const [
    employeeCount,
    openPeriod,
    recentSurveys,
    pendingFeedbackEvaluations,
  ] = await Promise.all([
    prisma.employee.count({ where: { clientId, status: "ACTIVE" } }),
    prisma.evaluationPeriod.findFirst({
      where: { clientId, status: "OPEN" },
      orderBy: { startDate: "desc" },
      include: {
        evaluations: { include: { feedback: true } },
      },
    }),
    prisma.pulseSurvey.findMany({
      where: { clientId },
      orderBy: { yearMonth: "desc" },
      take: 6,
      include: { responses: true },
    }),
    prisma.evaluation.count({
      where: {
        period: { clientId },
        status: { in: ["MANAGER_DONE", "FINAL_DONE"] },
        feedback: { is: null },
      },
    }),
  ]);

  // 評価フローの集計
  const totalTargets = openPeriod?.evaluations.length ?? 0;
  const selfDone =
    openPeriod?.evaluations.filter((e) =>
      ["SELF_DONE", "MANAGER_IN_PROGRESS", "MANAGER_DONE", "FINAL_IN_PROGRESS", "FINAL_DONE", "FINALIZED"].includes(e.status)
    ).length ?? 0;
  const managerDone =
    openPeriod?.evaluations.filter((e) =>
      ["MANAGER_DONE", "FINAL_IN_PROGRESS", "FINAL_DONE", "FINALIZED"].includes(e.status)
    ).length ?? 0;
  const finalDone =
    openPeriod?.evaluations.filter((e) =>
      ["FINAL_DONE", "FINALIZED"].includes(e.status)
    ).length ?? 0;
  const feedbackDone =
    openPeriod?.evaluations.filter((e) => e.feedback?.conductedDate).length ?? 0;

  const overallProgress = totalTargets > 0
    ? Math.round(((selfDone + managerDone + finalDone + feedbackDone) / (totalTargets * 4)) * 100)
    : 0;

  // パルスサーベイ推移
  const pulseTrend = recentSurveys
    .map((s) => {
      const arr = s.responses
        .map((r) => r.averageScore)
        .filter((x): x is number => typeof x === "number");
      const avg = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
      return { label: s.yearMonth.slice(5), value: avg };
    })
    .reverse();
  const latestPulse = pulseTrend.findLast((t) => t.value != null)?.value ?? null;

  // タスク件数
  const tasks = [
    {
      icon: "✅",
      label: "一次評価の対応",
      count:
        openPeriod?.evaluations.filter((e) => e.status === "SELF_DONE").length ?? 0,
      href: openPeriod ? `/client/periods/${openPeriod.id}` : "/client/periods",
    },
    {
      icon: "💬",
      label: "面談の実施",
      count:
        openPeriod?.evaluations.filter((e) =>
          ["MANAGER_DONE", "FINAL_DONE"].includes(e.status)
        ).length ?? 0,
      href: openPeriod ? `/client/periods/${openPeriod.id}` : "/client/periods",
    },
    {
      icon: "📝",
      label: "フィードバックの記入",
      count: pendingFeedbackEvaluations,
      href: openPeriod ? `/client/periods/${openPeriod.id}` : "/client/periods",
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="ダッシュボード"
        description={`${session.user.name} ・ 在籍 ${employeeCount} 名`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <CardHeader
            title="評価フローの進捗"
            action={
              openPeriod ? (
                <Link href={`/client/periods/${openPeriod.id}`} className="text-xs text-indigo-700 underline">
                  詳細
                </Link>
              ) : null
            }
          />
          {openPeriod ? (
            <div className="flex items-center gap-6">
              <DonutChart
                data={[
                  { label: "自己評価", value: selfDone, color: "#4f46e5" },
                  { label: "一次評価", value: managerDone, color: "#6366f1" },
                  { label: "最終評価", value: finalDone, color: "#818cf8" },
                  { label: "面談完了", value: feedbackDone, color: "#a5b4fc" },
                ]}
                centerLabel={`${overallProgress}%`}
              />
              <div className="flex-1">
                <DonutLegend
                  data={[
                    { label: "自己評価", value: selfDone, total: totalTargets, color: "#4f46e5" },
                    { label: "一次評価", value: managerDone, total: totalTargets, color: "#6366f1" },
                    { label: "最終評価", value: finalDone, total: totalTargets, color: "#818cf8" },
                    { label: "面談完了", value: feedbackDone, total: totalTargets, color: "#a5b4fc" },
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 py-6">
              現在運用中の評価期間がありません。
            </div>
          )}
        </Card>

        <Card className="p-5">
          <CardHeader
            title="パルスサーベイ"
            action={
              <Link href="/client/pulse" className="text-xs text-indigo-700 underline">
                詳細
              </Link>
            }
          />
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xs text-slate-500">最新スコア</span>
            <span className="text-2xl font-bold">
              {latestPulse != null ? latestPulse.toFixed(1) : "-"}
            </span>
            <span className="text-xs text-slate-500">/ 5</span>
          </div>
          {pulseTrend.length > 0 ? (
            <LineChart points={pulseTrend} color="#4f46e5" />
          ) : (
            <div className="text-xs text-slate-400 py-4 text-center">
              データがありません
            </div>
          )}
        </Card>

        <Card className="p-5">
          <CardHeader title="あなたのタスク" />
          <ul className="space-y-1">
            {tasks.map((t) => (
              <li key={t.label}>
                <Link
                  href={t.href}
                  className="flex items-center justify-between px-2 py-2 rounded hover:bg-slate-50 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span aria-hidden>{t.icon}</span>
                    <span className="text-slate-800">{t.label}</span>
                  </span>
                  <span className="text-sm">
                    {t.count > 0 ? (
                      <span className="font-bold text-indigo-700">{t.count}件</span>
                    ) : (
                      <span className="text-slate-400">0件</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <CardHeader title="お知らせ" />
          <ul className="text-sm space-y-2">
            <li className="flex gap-2">
              <Badge tone="blue">NEW</Badge>
              <span className="text-slate-700">パルスサーベイ機能をリリースしました。</span>
            </li>
            <li className="flex gap-2">
              <Badge tone="slate">TIP</Badge>
              <span className="text-slate-700">CSV から従業員・賃金・有給を一括登録できます。</span>
            </li>
            <li className="flex gap-2">
              <Badge tone="green">運用</Badge>
              <span className="text-slate-700">
                半期評価は自己→一次→最終の3段階＋面談シートの順に進めます。
              </span>
            </li>
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="在籍従業員" value={employeeCount} href="/client/employees" />
        <Stat label="運用中の評価期間" value={openPeriod ? 1 : 0} href="/client/periods" />
        <LinkBtn href="/client/employees/new" className="!h-auto !py-6 !text-base">
          + 従業員を追加
        </LinkBtn>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </Card>
    </Link>
  );
}
