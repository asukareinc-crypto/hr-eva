import Link from "next/link";
import { requireEmployee } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Shell";
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

export default async function MobileEvaluationsPage() {
  const session = await requireEmployee();
  const employeeId = session.user.employeeId!;

  const [myEvaluations, evaluatorAssignments] = await Promise.all([
    prisma.evaluation.findMany({
      where: { employeeId },
      orderBy: { updatedAt: "desc" },
      include: {
        period: true,
        feedback: true,
        assignments: { where: { evaluatorEmployeeId: employeeId } },
      },
    }),
    prisma.evaluationAssignment.findMany({
      where: {
        evaluatorEmployeeId: employeeId,
        role: { in: ["MANAGER", "FINAL"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        evaluation: { include: { period: true, employee: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">自分の評価</h2>
        {myEvaluations.length === 0 ? (
          <Empty message="まだ評価対象になっていません。" />
        ) : (
          <div className="space-y-2">
            {myEvaluations.map((e) => {
              const selfAssignment = e.assignments.find((a) => a.role === "SELF");
              return (
                <Card key={e.id} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-semibold">{e.period.name}</div>
                    <Badge>{STATUS_LABEL[e.status]}</Badge>
                  </div>
                  <div className="text-xs text-slate-500">
                    {e.period.startDate.toISOString().slice(0, 10)} 〜{" "}
                    {e.period.endDate.toISOString().slice(0, 10)}
                  </div>
                  {selfAssignment && !selfAssignment.submittedAt && (
                    <Link
                      href={`/evaluate/${selfAssignment.id}`}
                      className="text-xs text-slate-900 font-semibold underline mt-2 inline-block"
                    >
                      自己評価を入力する →
                    </Link>
                  )}
                  {e.feedback?.conductedDate && (
                    <Link
                      href={`/feedback/${e.id}`}
                      className="text-xs text-emerald-700 font-semibold underline mt-2 ml-3 inline-block"
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

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">あなたが行う評価（一次・最終）</h2>
        {evaluatorAssignments.length === 0 ? (
          <Empty message="あなたが評価する対象はいません。" />
        ) : (
          <div className="space-y-2">
            {evaluatorAssignments.map((a) => (
              <Card key={a.id} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold">
                    {a.evaluation.employee.lastName} {a.evaluation.employee.firstName}
                    <span className="ml-2 text-xs text-slate-500">
                      ({a.role === "MANAGER" ? "一次評価" : "最終評価"})
                    </span>
                  </div>
                  <Badge tone={a.submittedAt ? "green" : "blue"}>
                    {a.submittedAt ? "提出済み" : "未提出"}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500">{a.evaluation.period.name}</div>
                <div className="flex gap-3 mt-2">
                  <Link
                    href={`/evaluate/${a.id}`}
                    className="text-xs text-slate-900 font-semibold underline"
                  >
                    評価する →
                  </Link>
                  {a.submittedAt && (
                    <Link
                      href={`/feedback/${a.evaluation.id}`}
                      className="text-xs text-emerald-700 font-semibold underline"
                    >
                      面談シート →
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
