import Link from "next/link";
import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge } from "@/components/ui";

const PERIOD_STATUS_LABEL: Record<string, string> = {
  DRAFT: "下書き",
  OPEN: "運用中",
  CLOSED: "終了",
};
const EVAL_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "未着手",
  SELF_IN_PROGRESS: "自己評価中",
  SELF_DONE: "自己評価完了",
  MANAGER_IN_PROGRESS: "一次評価中",
  MANAGER_DONE: "一次評価完了",
  FINAL_IN_PROGRESS: "最終評価中",
  FINAL_DONE: "最終評価完了",
  FINALIZED: "確定",
};

export default async function AdminEvaluationsPage() {
  await requireSuperAdmin();

  const periods = await prisma.evaluationPeriod.findMany({
    include: {
      client: { include: { tenant: true } },
      template: true,
      evaluations: {
        include: { employee: true, feedback: true },
        orderBy: { employee: { employeeCode: "asc" } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="評価期間・PDF出力"
        description="全テナント・全クライアントの評価期間を横断表示。サポート目的で PDF を出力できます。"
        actions={
          <Link
            href="/admin"
            className="text-sm text-slate-600 underline-offset-2 hover:underline"
          >
            ← ダッシュボード
          </Link>
        }
      />

      {periods.length === 0 ? (
        <Card className="p-6 text-sm text-slate-500">
          評価期間がまだありません。
        </Card>
      ) : (
        periods.map((period) => (
          <Card key={period.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold">{period.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {period.client.tenant.name} / {period.client.name} ・{" "}
                  {period.template.name} ・{" "}
                  {period.startDate.toISOString().slice(0, 10)}〜
                  {period.endDate.toISOString().slice(0, 10)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  tone={
                    period.status === "OPEN"
                      ? "green"
                      : period.status === "DRAFT"
                        ? "slate"
                        : "yellow"
                  }
                >
                  {PERIOD_STATUS_LABEL[period.status] ?? period.status}
                </Badge>
                <a
                  href={`/api/pdf/period/${period.id}`}
                  className="text-sm text-slate-700 border border-slate-300 rounded px-2.5 py-1 hover:bg-slate-100"
                >
                  サマリーPDF
                </a>
              </div>
            </div>

            {period.evaluations.length > 0 && (
              <table className="w-full text-sm mt-3 min-w-[480px]">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="text-left py-1">従業員</th>
                    <th className="text-left py-1">ステータス</th>
                    <th className="text-right py-1">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {period.evaluations.map((e) => (
                    <tr key={e.id}>
                      <td className="py-1.5">
                        {e.employee.lastName} {e.employee.firstName}
                        <span className="text-xs text-slate-500 ml-2">
                          {e.employee.employeeCode}
                        </span>
                      </td>
                      <td className="py-1.5 text-xs text-slate-600">
                        {EVAL_STATUS_LABEL[e.status] ?? e.status}
                      </td>
                      <td className="py-1.5 text-right">
                        <div className="inline-flex gap-2">
                          <a
                            href={`/api/pdf/evaluation/${e.id}`}
                            className="text-xs text-slate-700 underline"
                          >
                            評価シート
                          </a>
                          {e.feedback && (
                            <a
                              href={`/api/pdf/feedback/${e.id}`}
                              className="text-xs text-slate-700 underline"
                            >
                              面談シート
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
