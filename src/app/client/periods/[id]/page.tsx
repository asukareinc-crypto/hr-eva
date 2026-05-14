import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Btn, Field, Select } from "@/components/ui";
import {
  assignEmployeeToPeriod,
  removeEvaluationFromPeriod,
  updateClientPeriodStatus,
} from "@/app/client/actions";

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
const STATUS_TONE: Record<string, "slate" | "blue" | "green" | "yellow" | "red"> = {
  NOT_STARTED: "slate",
  SELF_IN_PROGRESS: "blue",
  SELF_DONE: "blue",
  MANAGER_IN_PROGRESS: "yellow",
  MANAGER_DONE: "yellow",
  FINAL_IN_PROGRESS: "yellow",
  FINAL_DONE: "yellow",
  FINALIZED: "green",
};

export default async function ClientPeriodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;
  const period = await prisma.evaluationPeriod.findFirst({
    where: { id, clientId },
    include: {
      template: { include: { items: true } },
      evaluations: {
        include: {
          employee: true,
          assignments: { include: { evaluator: true } },
        },
        orderBy: { employee: { employeeCode: "asc" } },
      },
    },
  });
  if (!period) notFound();

  const assignedIds = new Set(period.evaluations.map((e) => e.employeeId));
  const candidates = await prisma.employee.findMany({
    where: { clientId, status: "ACTIVE", id: { notIn: Array.from(assignedIds) } },
    orderBy: { employeeCode: "asc" },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={period.name}
        description={`${period.template.name} ・ ${period.startDate.toISOString().slice(0, 10)}〜${period.endDate.toISOString().slice(0, 10)}`}
        actions={<Link href="/client/periods" className="text-sm text-slate-600 underline-offset-2 hover:underline">← 一覧へ</Link>}
      />

      <Card className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">状態</span>
          <Badge tone={period.status === "OPEN" ? "green" : period.status === "DRAFT" ? "slate" : "yellow"}>
            {period.status === "OPEN" ? "運用中" : period.status === "DRAFT" ? "下書き" : "終了"}
          </Badge>
        </div>
        <div className="flex gap-2">
          {period.status === "DRAFT" && (
            <form action={async () => { "use server"; await updateClientPeriodStatus(id, "OPEN"); }}>
              <Btn type="submit">運用開始</Btn>
            </form>
          )}
          {period.status === "OPEN" && (
            <form action={async () => { "use server"; await updateClientPeriodStatus(id, "CLOSED"); }}>
              <Btn type="submit" variant="secondary">期間を終了</Btn>
            </form>
          )}
          {period.status === "CLOSED" && (
            <form action={async () => { "use server"; await updateClientPeriodStatus(id, "OPEN"); }}>
              <Btn type="submit" variant="secondary">再オープン</Btn>
            </form>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">対象者を追加</h2>
        {candidates.length === 0 ? (
          <div className="text-sm text-slate-500">追加可能な従業員はいません。</div>
        ) : (
          <form
            action={async (fd) => {
              "use server";
              await assignEmployeeToPeriod(id, fd);
            }}
            className="flex gap-2 items-end"
          >
            <div className="flex-1">
              <Field label="従業員">
                <Select name="employeeId" required>
                  <option value="">選択</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.lastName} {c.firstName} ({c.employeeCode})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Btn type="submit">追加</Btn>
          </form>
        )}
        <p className="text-xs text-slate-500 mt-2">
          ※ 上司が登録されていれば自動で上司を評価者として割り当てます。
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">対象者と進捗</h2>
        {period.evaluations.length === 0 ? (
          <div className="text-sm text-slate-500">まだ対象者がいません。</div>
        ) : (
          <table className="w-full text-sm min-w-[600px] sm:min-w-0">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="text-left py-1">従業員</th>
                <th className="text-left py-1">評価者</th>
                <th className="text-left py-1">ステータス</th>
                <th className="text-right py-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {period.evaluations.map((e) => (
                <tr key={e.id}>
                  <td className="py-2">
                    {e.employee.lastName} {e.employee.firstName}
                    <span className="text-xs text-slate-500 ml-2">{e.employee.employeeCode}</span>
                  </td>
                  <td className="py-2 text-xs">
                    {e.assignments.map((a) => (
                      <span key={a.id} className="mr-2">
                        {a.role === "SELF" ? "自" : a.role === "MANAGER" ? "一次" : a.role === "FINAL" ? "最終" : a.role}:{" "}
                        {a.evaluator.lastName} {a.evaluator.firstName}
                        {a.submittedAt && " ✓"}
                      </span>
                    ))}
                  </td>
                  <td className="py-2">
                    <Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                  </td>
                  <td className="py-2 text-right">
                    <div className="inline-flex gap-2">
                      {(e.status === "FINAL_DONE" || e.status === "MANAGER_DONE" || e.status === "FINALIZED") && (
                        <Link
                          href={`/feedback/${e.id}`}
                          className="text-xs text-slate-700 underline"
                        >
                          面談シート
                        </Link>
                      )}
                      {e.status !== "FINALIZED" && (
                        <form
                          action={async () => {
                            "use server";
                            await removeEvaluationFromPeriod(id, e.id);
                          }}
                        >
                          <Btn type="submit" variant="ghost">削除</Btn>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
