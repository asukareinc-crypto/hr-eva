import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Btn, Field, Select, Textarea } from "@/components/ui";
import { saveScoresDraft, submitAssignment } from "@/app/evaluate/actions";

const ROLE_LABEL: Record<string, string> = {
  SELF: "自己評価",
  MANAGER: "一次評価（直属上司）",
  FINAL: "最終評価（所長）",
  PEER: "同僚評価",
  SKIP_LEVEL: "上長評価",
};

export default async function EvaluatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: assignmentId } = await params;
  const session = await requireSession();
  if (!session.user.employeeId) redirect("/");

  const assignment = await prisma.evaluationAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      evaluation: {
        include: {
          period: {
            include: {
              template: {
                include: {
                  items: {
                    orderBy: { sortOrder: "asc" },
                    include: { levels: { orderBy: { score: "desc" } } },
                  },
                },
              },
            },
          },
          employee: true,
          assignments: { include: { evaluator: true, scores: true } },
        },
      },
      evaluator: true,
      scores: true,
    },
  });
  if (!assignment) notFound();
  if (assignment.evaluatorEmployeeId !== session.user.employeeId) {
    redirect("/m");
  }

  const items = assignment.evaluation.period.template.items;
  const scoreMap = new Map(assignment.scores.map((s) => [s.itemId, s]));
  const isSubmitted = assignment.submittedAt !== null;
  const target = assignment.evaluation.employee;

  // 各ロールのアクセス可否
  let canEvaluate = true;
  let waitMessage: string | null = null;
  if (assignment.role === "MANAGER") {
    if (!["SELF_DONE", "MANAGER_IN_PROGRESS", "MANAGER_DONE", "FINAL_IN_PROGRESS", "FINAL_DONE", "FINALIZED"].includes(assignment.evaluation.status)) {
      canEvaluate = false;
      waitMessage = "本人の自己評価が完了するまで一次評価はまだ提出できません。";
    }
  }
  if (assignment.role === "FINAL") {
    if (!["MANAGER_DONE", "FINAL_IN_PROGRESS", "FINAL_DONE", "FINALIZED"].includes(assignment.evaluation.status)) {
      canEvaluate = false;
      waitMessage = "一次評価が完了するまで最終評価はまだ提出できません。";
    }
  }

  // 一次・最終評価の場合は本人の自己評価を参考表示
  const selfAssignment = assignment.evaluation.assignments.find((a) => a.role === "SELF");
  const showSelfReference = assignment.role !== "SELF" && selfAssignment?.submittedAt;
  const selfScoreMap = new Map((selfAssignment?.scores ?? []).map((s) => [s.itemId, s]));

  // 一次評価の参考表示（最終評価者向け）
  const managerAssignment = assignment.evaluation.assignments.find((a) => a.role === "MANAGER");
  const showManagerReference = assignment.role === "FINAL" && managerAssignment?.submittedAt;
  const managerScoreMap = new Map((managerAssignment?.scores ?? []).map((s) => [s.itemId, s]));

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <PageHeader
          title={`${ROLE_LABEL[assignment.role]}: ${target.lastName} ${target.firstName}`}
          description={`${assignment.evaluation.period.name} / ${assignment.evaluation.period.template.name}`}
          actions={
            <Link href="/m" className="text-sm text-slate-600 underline-offset-2 hover:underline">
              ← 戻る
            </Link>
          }
        />

        <div className="flex items-center gap-2 text-sm">
          <Badge tone={isSubmitted ? "green" : "blue"}>
            {isSubmitted ? "提出済み" : "下書き"}
          </Badge>
          {waitMessage && (
            <span className="text-yellow-700 text-xs">{waitMessage}</span>
          )}
        </div>

        {assignment.role !== "SELF" && (
          <details
            open
            className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-slate-50/95 backdrop-blur border-b border-slate-200"
          >
            <summary className="cursor-pointer text-xs font-semibold text-blue-900 list-none flex items-center justify-between">
              <span>★ 評価者のルール（評価指針）— タップで開閉</span>
              <span className="text-[10px] text-slate-500 font-normal">面談中も常時表示</span>
            </summary>
            <ul className="text-xs text-blue-900 space-y-0.5 list-disc pl-4 mt-2">
              <li>絶対評価で点数を記入する（他者と比較しない）</li>
              <li>本人の自己評価に引っ張られない（最初は見ないで判断）</li>
              <li>過去のイメージや直近の状況だけでなく、評価期間全体の平均で評価する</li>
              <li>各項目はまず「3点」の定義を読んでから、上か下かで判断すると付けやすい</li>
            </ul>
          </details>
        )}

        {canEvaluate ? (
          <form
            action={async (fd) => {
              "use server";
              const action = String(fd.get("__action") ?? "save");
              if (action === "submit") {
                await submitAssignment(assignmentId, fd);
              } else {
                await saveScoresDraft(assignmentId, fd);
              }
            }}
            className="space-y-3"
          >
            {items.map((it) => {
              const cur = scoreMap.get(it.id);
              const selfScore = selfScoreMap.get(it.id);
              const managerScore = managerScoreMap.get(it.id);
              const options = Array.from({ length: it.maxScore }, (_, i) => i + 1);
              return (
                <Card key={it.id} className="p-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-xs text-slate-500">
                      重み {it.weight} / 最大 {it.maxScore}
                    </div>
                  </div>
                  {it.description && (
                    <p className="text-xs text-slate-600">{it.description}</p>
                  )}

                  {assignment.role !== "SELF" && (it.interviewPoint || it.interviewQuestions) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {it.interviewPoint && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                          <div className="font-semibold text-emerald-900 mb-1">💬 面談のポイント</div>
                          <div className="text-emerald-900 whitespace-pre-wrap">{it.interviewPoint}</div>
                        </div>
                      )}
                      {it.interviewQuestions && (
                        <div className="bg-sky-50 border border-sky-200 rounded p-2">
                          <div className="font-semibold text-sky-900 mb-1">❓ 質問例</div>
                          <ul className="text-sky-900 space-y-0.5 list-disc pl-4">
                            {it.interviewQuestions
                              .split(/\r?\n/)
                              .map((q) => q.trim())
                              .filter(Boolean)
                              .map((q, i) => (
                                <li key={i}>{q.replace(/^[・\-•]\s*/, "")}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {it.levels.length > 0 && (
                    <details className="bg-slate-50 rounded p-2 text-xs" open>
                      <summary className="font-semibold text-slate-700 cursor-pointer">
                        点数の評価基準（絶対評価）
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {it.levels.map((l) => (
                          <li key={l.id} className="flex gap-2">
                            <span className="font-mono w-8 shrink-0">{l.score}点</span>
                            <span className="text-slate-700">{l.description}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {showSelfReference && selfScore?.score && (
                    <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2">
                      <span className="font-semibold text-amber-900">本人自己評価:</span>{" "}
                      <span className="font-mono">{selfScore.score}点</span>
                      {selfScore.comment && (
                        <div className="text-amber-900 mt-1 whitespace-pre-wrap">{selfScore.comment}</div>
                      )}
                    </div>
                  )}
                  {showManagerReference && managerScore?.score && (
                    <div className="text-xs bg-violet-50 border border-violet-200 rounded p-2">
                      <span className="font-semibold text-violet-900">一次評価:</span>{" "}
                      <span className="font-mono">{managerScore.score}点</span>
                      {managerScore.comment && (
                        <div className="text-violet-900 mt-1 whitespace-pre-wrap">{managerScore.comment}</div>
                      )}
                    </div>
                  )}

                  <Field label="スコア">
                    <Select
                      name={`score_${it.id}`}
                      defaultValue={cur?.score ?? ""}
                      disabled={isSubmitted}
                    >
                      <option value="">未入力</option>
                      {options.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="コメント">
                    <Textarea
                      name={`comment_${it.id}`}
                      defaultValue={cur?.comment ?? ""}
                      disabled={isSubmitted}
                    />
                  </Field>
                </Card>
              );
            })}

            {!isSubmitted && (
              <div className="flex gap-2 pt-2 sticky bottom-0 bg-slate-50 py-3">
                <Btn
                  type="submit"
                  variant="secondary"
                  name="__action"
                  value="save"
                >
                  下書き保存
                </Btn>
                <Btn type="submit" name="__action" value="submit">
                  提出
                </Btn>
              </div>
            )}
          </form>
        ) : (
          <div className="text-sm text-slate-600">
            {waitMessage ?? "現在この評価を提出することはできません。"}
          </div>
        )}
      </div>
    </div>
  );
}
