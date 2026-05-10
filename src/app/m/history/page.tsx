import Link from "next/link";
import { requireEmployee } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Empty } from "@/components/ui";

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "未着手",
  SELF_IN_PROGRESS: "自己評価中",
  SELF_DONE: "自己評価完了",
  MANAGER_IN_PROGRESS: "一次評価中",
  MANAGER_DONE: "一次評価完了",
  FINAL_IN_PROGRESS: "最終評価中",
  FINAL_DONE: "最終評価完了",
  FINALIZED: "確定",
};

export default async function HistoryPage() {
  const session = await requireEmployee();
  const employeeId = session.user.employeeId!;

  const evaluations = await prisma.evaluation.findMany({
    where: { employeeId },
    orderBy: [{ period: { startDate: "desc" } }, { updatedAt: "desc" } ],
    include: {
      period: { include: { template: true } },
      feedback: true,
      assignments: {
        include: {
          scores: { include: { item: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="評価履歴" description="過去の自分の評価をまとめて振り返れます" />

      {evaluations.length === 0 ? (
        <Empty message="まだ評価履歴がありません" />
      ) : (
        <div className="space-y-3">
          {evaluations.map((e) => {
            // 最終評価（or 一次評価）の総合点
            const finalAssignment = e.assignments.find((a) => a.role === "FINAL");
            const managerAssignment = e.assignments.find((a) => a.role === "MANAGER");
            const selfAssignment = e.assignments.find((a) => a.role === "SELF");
            const reference = finalAssignment ?? managerAssignment;
            const totalWeighted = reference?.scores.reduce((acc, s) => {
              if (s.score == null) return acc;
              return acc + s.score * s.item.weight;
            }, 0) ?? 0;
            const totalWeight = reference?.scores.reduce((acc, s) => acc + s.item.weight, 0) ?? 0;
            const avg = totalWeight > 0 ? (totalWeighted / totalWeight).toFixed(2) : null;

            return (
              <Card key={e.id} className="p-3">
                <div className="flex items-baseline justify-between mb-1">
                  <div className="text-sm font-semibold">{e.period.name}</div>
                  <Badge tone={e.status === "FINALIZED" ? "green" : "blue"}>
                    {STATUS_LABEL[e.status] ?? e.status}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 mb-2">
                  {e.period.template.name} ・{" "}
                  {e.period.startDate.toISOString().slice(0, 10)} 〜{" "}
                  {e.period.endDate.toISOString().slice(0, 10)}
                </div>

                {avg && (
                  <div className="bg-slate-50 rounded px-2 py-1 text-xs mb-2">
                    総合（{finalAssignment ? "最終評価" : "一次評価"}）:{" "}
                    <span className="font-bold text-base">{avg}</span> 点
                  </div>
                )}

                {/* 項目ごとのスコア一覧 */}
                {reference && reference.scores.length > 0 && (
                  <table className="w-full text-[11px] mb-2">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="text-left">項目</th>
                        {selfAssignment && <th className="text-center w-10">自己</th>}
                        {managerAssignment && <th className="text-center w-10">一次</th>}
                        {finalAssignment && <th className="text-center w-10">最終</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reference.scores.map((s) => (
                        <tr key={s.id}>
                          <td className="py-1">{s.item.name}</td>
                          {selfAssignment && (
                            <td className="text-center font-mono">
                              {selfAssignment.scores.find((x) => x.itemId === s.itemId)?.score ?? "-"}
                            </td>
                          )}
                          {managerAssignment && (
                            <td className="text-center font-mono">
                              {managerAssignment.scores.find((x) => x.itemId === s.itemId)?.score ?? "-"}
                            </td>
                          )}
                          {finalAssignment && (
                            <td className="text-center font-mono">
                              {finalAssignment.scores.find((x) => x.itemId === s.itemId)?.score ?? "-"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {e.feedback?.conductedDate && (
                  <Link
                    href={`/feedback/${e.id}`}
                    className="text-xs text-emerald-700 font-semibold underline"
                  >
                    面談シートを見る →
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
