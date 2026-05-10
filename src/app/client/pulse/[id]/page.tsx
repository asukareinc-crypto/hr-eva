import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Btn, Empty } from "@/components/ui";
import { closeSurvey, reopenSurvey } from "@/app/pulse/actions";

export default async function ClientSurveyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireClientAdmin();

  const survey = await prisma.pulseSurvey.findFirst({
    where: { id, clientId: session.user.clientId! },
    include: {
      responses: {
        include: {
          employee: { include: { department: true } },
          answers: { include: { question: true } },
        },
      },
    },
  });
  if (!survey) notFound();

  const questions = await prisma.pulseQuestion.findMany({
    where: { clientId: session.user.clientId!, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // 設問ごとの集計
  const questionStats = questions.map((q) => {
    const answers = survey.responses
      .flatMap((r) => r.answers)
      .filter((a) => a.questionId === q.id);
    const scored = answers.filter((a) => a.score != null) as { score: number }[];
    const avg =
      scored.length > 0 ? scored.reduce((acc, a) => acc + a.score, 0) / scored.length : null;
    const texts = answers
      .filter((a) => a.text && a.text.trim().length > 0)
      .map((a) => a.text!);
    return { question: q, avg, count: scored.length, texts };
  });

  // 個人別
  const employees = await prisma.employee.findMany({
    where: { clientId: session.user.clientId!, status: "ACTIVE" },
    orderBy: { employeeCode: "asc" },
    include: { department: true },
  });
  const responseByEmployee = new Map(
    survey.responses.map((r) => [r.employeeId, r])
  );

  const allowedActiveQids = new Set(questions.map((q) => q.id));

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${survey.yearMonth} のサーベイ`}
        description={`回答 ${survey.responses.filter((r) => r.submittedAt).length} / ${employees.length} 名`}
        actions={
          <Link href="/client/pulse" className="text-sm text-slate-600 underline-offset-2 hover:underline">
            ← 一覧へ
          </Link>
        }
      />

      <Card className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Badge tone={survey.status === "OPEN" ? "green" : "slate"}>
            {survey.status === "OPEN" ? "受付中" : "終了"}
          </Badge>
          {survey.dueDate && (
            <span className="text-slate-600 text-xs">締切: {survey.dueDate.toISOString().slice(0, 10)}</span>
          )}
        </div>
        <div>
          {survey.status === "OPEN" ? (
            <form action={async () => { "use server"; await closeSurvey(id); }}>
              <Btn type="submit" variant="secondary">受付終了</Btn>
            </form>
          ) : (
            <form action={async () => { "use server"; await reopenSurvey(id); }}>
              <Btn type="submit" variant="secondary">再オープン</Btn>
            </form>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3 text-sm">設問ごとの集計</h2>
        {questionStats.length === 0 ? (
          <Empty message="アクティブな設問がありません" />
        ) : (
          <ul className="space-y-3">
            {questionStats.map(({ question, avg, count, texts }) => (
              <li key={question.id}>
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-medium">{question.text}</div>
                  <div className="text-xs text-slate-500">
                    {question.type === "SCORE_5" && (
                      <>平均 <span className="font-bold text-base">{avg != null ? avg.toFixed(2) : "-"}</span> / 5 ・ {count}件</>
                    )}
                    {question.type === "YES_NO" && (
                      <>はい {count > 0 ? Math.round((avg ?? 0) * 100) : 0}% ・ {count}件</>
                    )}
                    {question.type === "TEXT" && <>{texts.length}件の記述</>}
                  </div>
                </div>
                {question.type === "TEXT" && texts.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-700 bg-slate-50 rounded p-2">
                    {texts.slice(0, 5).map((t, i) => (
                      <li key={i} className="border-b border-slate-200 last:border-0 py-1">
                        ・{t.slice(0, 200)}
                        {t.length > 200 && "…"}
                      </li>
                    ))}
                    {texts.length > 5 && (
                      <li className="text-slate-500">他 {texts.length - 5} 件</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3 text-sm">個人別回答状況</h2>
        <p className="text-[11px] text-slate-500 mb-2">
          ※ 自由記述の内容は設問サマリ側で集約表示しており、個人別画面には個別の数値スコアのみ表示しています。
        </p>
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left py-1">従業員</th>
              <th className="text-left py-1">部署</th>
              <th className="text-center py-1">提出</th>
              <th className="text-right py-1">平均</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((e) => {
              const r = responseByEmployee.get(e.id);
              return (
                <tr key={e.id}>
                  <td className="py-1">
                    {e.lastName} {e.firstName}
                  </td>
                  <td className="py-1 text-slate-500">{e.department?.name ?? "-"}</td>
                  <td className="py-1 text-center">
                    {r?.submittedAt ? "✓" : "—"}
                  </td>
                  <td className="py-1 text-right font-mono">
                    {r?.averageScore != null ? r.averageScore.toFixed(2) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* 急変アラート（前回月との比較） - シンプル版 */}
      <PulseTrend clientId={session.user.clientId!} />

      {/* 不要参照を抑制 */}
      <span className="hidden">{Array.from(allowedActiveQids).length}</span>
    </div>
  );
}

async function PulseTrend({ clientId }: { clientId: string }) {
  const surveys = await prisma.pulseSurvey.findMany({
    where: { clientId },
    orderBy: { yearMonth: "desc" },
    take: 6,
    include: { responses: true },
  });

  const trend = surveys
    .map((s) => {
      const arr = s.responses
        .map((r) => r.averageScore)
        .filter((x): x is number => typeof x === "number");
      const avg = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
      return { yearMonth: s.yearMonth, avg, count: arr.length };
    })
    .reverse(); // 古い順

  if (trend.length === 0) return null;

  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-3 text-sm">直近6か月の全体平均推移</h2>
      <div className="grid grid-cols-6 gap-2 text-xs">
        {trend.map((t) => (
          <div key={t.yearMonth} className="text-center">
            <div className="text-[11px] text-slate-500">{t.yearMonth.slice(5)}</div>
            <div
              className="h-12 bg-slate-100 rounded relative overflow-hidden"
              title={t.avg != null ? `${t.avg.toFixed(2)} / 5` : "未集計"}
            >
              {t.avg != null && (
                <div
                  className="absolute bottom-0 left-0 right-0 bg-emerald-400"
                  style={{ height: `${(t.avg / 5) * 100}%` }}
                />
              )}
            </div>
            <div className="font-mono mt-0.5">{t.avg != null ? t.avg.toFixed(1) : "-"}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
