import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSr } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Btn } from "@/components/ui";
import { updatePeriodStatus, sendReminderForPeriod } from "@/app/sr/actions";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "下書き",
  OPEN: "運用中",
  CLOSED: "終了",
};

export default async function PeriodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSr();
  const period = await prisma.evaluationPeriod.findFirst({
    where: { id, client: { tenantId: session.user.tenantId! } },
    include: {
      client: true,
      template: { include: { items: { orderBy: { sortOrder: "asc" } } } },
      evaluations: { include: { employee: true, assignments: true } },
    },
  });
  if (!period) notFound();

  const total = period.evaluations.length;
  const statusCount = period.evaluations.reduce<Record<string, number>>(
    (acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }),
    {}
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={period.name}
        description={`${period.client.name} / ${period.template.name}`}
        actions={
          <div className="flex items-center gap-3">
            <a
              href={`/api/pdf/period/${id}`}
              className="text-sm text-slate-700 border border-slate-300 rounded px-2.5 py-1 hover:bg-slate-100"
            >
              サマリーPDF
            </a>
            <Link
              href="/sr/periods"
              className="text-sm text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
            >
              ← 一覧へ
            </Link>
          </div>
        }
      />

      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">期間</span>
          <span>
            {period.startDate.toISOString().slice(0, 10)} 〜{" "}
            {period.endDate.toISOString().slice(0, 10)}
          </span>
          <Badge>{STATUS_LABEL[period.status]}</Badge>
        </div>
        <div className="flex gap-2">
          {period.status === "DRAFT" && (
            <form
              action={async () => {
                "use server";
                await updatePeriodStatus(id, "OPEN");
              }}
            >
              <Btn type="submit">運用開始</Btn>
            </form>
          )}
          {period.status === "OPEN" && (
            <>
              <form
                action={async () => {
                  "use server";
                  await sendReminderForPeriod(id);
                }}
              >
                <Btn type="submit" variant="secondary">
                  リマインドメール送信
                </Btn>
              </form>
              <form
                action={async () => {
                  "use server";
                  await updatePeriodStatus(id, "CLOSED");
                }}
              >
                <Btn type="submit" variant="secondary">
                  期間を終了
                </Btn>
              </form>
            </>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="対象者" value={total} />
        <Stat label="未着手" value={statusCount["NOT_STARTED"] ?? 0} />
        <Stat label="進行中" value={(statusCount["SELF_IN_PROGRESS"] ?? 0) + (statusCount["MANAGER_IN_PROGRESS"] ?? 0)} />
        <Stat label="確定" value={statusCount["FINALIZED"] ?? 0} />
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">評価項目（{period.template.items.length}件）</h2>
        <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
          {period.template.items.map((it) => (
            <li key={it.id}>
              {it.name}
              <span className="text-slate-500"> 重み{it.weight} / 最大{it.maxScore}点</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">対象者の状況</h2>
        {period.evaluations.length === 0 ? (
          <div className="text-sm text-slate-500">
            まだ対象者が割り当てられていません。クライアント管理者画面から従業員を選択してください。
          </div>
        ) : (
          <table className="w-full text-sm min-w-[600px] sm:min-w-0">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="text-left py-1">従業員</th>
                <th className="text-left py-1">ステータス</th>
                <th className="text-left py-1">割当評価者</th>
                <th className="text-right py-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {period.evaluations.map((e) => (
                <tr key={e.id}>
                  <td className="py-1">
                    {e.employee.lastName} {e.employee.firstName}
                  </td>
                  <td className="py-1">
                    <Badge>{e.status}</Badge>
                  </td>
                  <td className="py-1">{e.assignments.length}名</td>
                  <td className="py-1 text-right">
                    <a
                      href={`/api/pdf/evaluation/${e.id}`}
                      className="text-xs text-slate-700 underline"
                    >
                      評価PDF
                    </a>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
    </Card>
  );
}
