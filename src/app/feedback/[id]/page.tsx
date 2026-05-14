import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Btn, Field, Input, Textarea } from "@/components/ui";
import { upsertFeedbackMeeting, finalizeWithFeedback } from "@/app/feedback/actions";

const ROLE_LABEL: Record<string, string> = {
  SELF: "自己",
  MANAGER: "一次",
  FINAL: "最終",
  PEER: "同僚",
  SKIP_LEVEL: "上長",
};

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: evaluationId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      period: { include: { client: true } },
      employee: { include: { department: true, position: true, grade: true } },
      assignments: {
        include: {
          evaluator: true,
          scores: { include: { item: true } },
        },
      },
      feedback: true,
    },
  });
  if (!evaluation) notFound();

  // アクセス制御
  const role = session.user.role;
  let canAccess = false;
  let readOnly = false;
  if (role === "SR_ADMIN" && evaluation.period.client.tenantId === session.user.tenantId) canAccess = true;
  if (role === "CLIENT_ADMIN" && evaluation.period.clientId === session.user.clientId) canAccess = true;
  if (role === "EMPLOYEE") {
    const isEvaluator = evaluation.assignments.some(
      (a) =>
        a.evaluatorEmployeeId === session.user.employeeId &&
        (a.role === "MANAGER" || a.role === "FINAL")
    );
    const isTarget = evaluation.employeeId === session.user.employeeId;
    if (isEvaluator) {
      canAccess = true;
    } else if (isTarget) {
      // 対象従業員本人は、面談実施済みのときだけ閲覧可（読み取り専用）
      if (evaluation.feedback?.conductedDate) {
        canAccess = true;
        readOnly = true;
      }
    }
  }
  if (!canAccess) redirect("/");

  const fb = evaluation.feedback;
  const target = evaluation.employee;

  // スコア集計（一次評価+最終評価）
  const finalAssignment = evaluation.assignments.find((a) => a.role === "FINAL");
  const managerAssignment = evaluation.assignments.find((a) => a.role === "MANAGER");
  const referenceAssignment = finalAssignment ?? managerAssignment;

  const totalWeighted = referenceAssignment?.scores.reduce((acc, s) => {
    if (s.score == null) return acc;
    return acc + s.score * s.item.weight;
  }, 0) ?? 0;
  const totalWeight = referenceAssignment?.scores.reduce((acc, s) => acc + s.item.weight, 0) ?? 0;
  const avg = totalWeight > 0 ? (totalWeighted / totalWeight).toFixed(2) : "-";

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <PageHeader
          title="フィードバック面談シート"
          description={`${target.lastName} ${target.firstName} / ${evaluation.period.name}`}
          actions={
            <div className="flex items-center gap-3">
              <a
                href={`/api/pdf/evaluation/${evaluationId}`}
                className="text-sm text-slate-700 border border-slate-300 rounded px-2.5 py-1 hover:bg-slate-100"
              >
                評価シートPDF
              </a>
              <a
                href={`/api/pdf/feedback/${evaluationId}`}
                className="text-sm text-slate-700 border border-slate-300 rounded px-2.5 py-1 hover:bg-slate-100"
              >
                面談シートPDF
              </a>
              <Link href="/" className="text-sm text-slate-600 underline-offset-2 hover:underline">
                ← 戻る
              </Link>
            </div>
          }
        />

        <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">部署</div>
            <div className="font-medium">{target.department?.name ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">役職</div>
            <div className="font-medium">{target.position?.name ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">等級</div>
            <div className="font-medium">{target.grade?.name ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">総合（参考値）</div>
            <div className="text-base font-bold">{avg} 点</div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-2 text-sm">評価結果（参考表示）</h2>
          {evaluation.assignments.length === 0 ? (
            <div className="text-sm text-slate-500">評価データなし</div>
          ) : (
            <table className="w-full text-xs min-w-[560px] sm:min-w-0">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left py-1">項目</th>
                  {evaluation.assignments.map((a) => (
                    <th key={a.id} className="text-center py-1">{ROLE_LABEL[a.role] ?? a.role}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(referenceAssignment?.scores ?? []).map((s) => (
                  <tr key={s.id}>
                    <td className="py-1">{s.item.name}</td>
                    {evaluation.assignments.map((a) => {
                      const sc = a.scores.find((x) => x.itemId === s.itemId);
                      return (
                        <td key={a.id} className="text-center font-mono">{sc?.score ?? "-"}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-[11px] text-slate-500 mt-2">
            ※「評価と面談は、点数を付けるためではなく、日頃から頑張ってくれていることを褒めるためにあります。
            また、更に取り組みを強化してほしい事をすり合わせるためにあります。」
          </p>
        </Card>

        <Card className="p-4">
          {readOnly && (
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2 mb-3">
              ※ あなた自身のフィードバック面談シートを閲覧モードで表示しています。内容について上司・所長と話し合った内容を確認できます。
            </div>
          )}
          <form
            action={async (fd) => {
              "use server";
              await upsertFeedbackMeeting(evaluationId, fd);
            }}
            className="space-y-4"
          >
            <fieldset disabled={readOnly} className="space-y-4 contents">
            <div className="grid grid-cols-2 gap-3">
              <Field label="面談予定日">
                <Input type="date" name="scheduledDate" defaultValue={fb?.scheduledDate?.toISOString().slice(0, 10) ?? ""} disabled={readOnly} />
              </Field>
              <Field label="面談実施日">
                <Input type="date" name="conductedDate" defaultValue={fb?.conductedDate?.toISOString().slice(0, 10) ?? ""} disabled={readOnly} />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-green-800">とても良かった項目（最大3つ）</div>
                <Textarea name="good1" defaultValue={fb?.good1 ?? ""} placeholder="①" disabled={readOnly} />
                <Textarea name="good2" defaultValue={fb?.good2 ?? ""} placeholder="②" disabled={readOnly} />
                <Textarea name="good3" defaultValue={fb?.good3 ?? ""} placeholder="③" disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-amber-800">更に取り組みを強化してほしい項目（最大3つ）</div>
                <Textarea name="improve1" defaultValue={fb?.improve1 ?? ""} placeholder="①" disabled={readOnly} />
                <Textarea name="improve2" defaultValue={fb?.improve2 ?? ""} placeholder="②" disabled={readOnly} />
                <Textarea name="improve3" defaultValue={fb?.improve3 ?? ""} placeholder="③" disabled={readOnly} />
              </div>
            </div>

            <Field label="次期の目標">
              <Textarea name="goal" defaultValue={fb?.goal ?? ""} disabled={readOnly} />
            </Field>

            {!readOnly && (
              <Field label="メモ（社内用 / 本人非公開）">
                <Textarea name="notes" defaultValue={fb?.notes ?? ""} />
              </Field>
            )}
            </fieldset>

            {!readOnly && (
              <div className="flex gap-2 items-center">
                <Btn type="submit">面談シート保存</Btn>
                {fb?.conductedDate && evaluation.status !== "FINALIZED" && (role === "CLIENT_ADMIN" || role === "SR_ADMIN") && (
                  <FinalizeButton evaluationId={evaluationId} />
                )}
                {evaluation.status === "FINALIZED" && <Badge tone="green">確定済み</Badge>}
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}

function FinalizeButton({ evaluationId }: { evaluationId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await finalizeWithFeedback(evaluationId);
      }}
    >
      <Btn type="submit" variant="primary">面談実施済み・確定</Btn>
    </form>
  );
}
