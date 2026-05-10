import { requireEmployee } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Btn, Empty, Field, Select, Textarea } from "@/components/ui";
import { submitPulseResponse } from "@/app/pulse/actions";

export default async function MobilePulsePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireEmployee();
  const employeeId = session.user.employeeId!;
  const clientId = session.user.clientId!;

  // 受付中サーベイ
  const openSurvey = await prisma.pulseSurvey.findFirst({
    where: { clientId, status: "OPEN" },
    orderBy: { yearMonth: "desc" },
    include: {
      responses: {
        where: { employeeId },
        include: { answers: true },
      },
    },
  });

  const questions = await prisma.pulseQuestion.findMany({
    where: { clientId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // 過去6ヶ月の自分の推移
  const recentSurveys = await prisma.pulseSurvey.findMany({
    where: { clientId },
    orderBy: { yearMonth: "desc" },
    take: 6,
  });
  const myResponses = await prisma.pulseResponse.findMany({
    where: { employeeId, surveyId: { in: recentSurveys.map((s) => s.id) } },
  });
  const responseBySurvey = new Map(myResponses.map((r) => [r.surveyId, r]));
  const trend = recentSurveys
    .map((s) => ({ yearMonth: s.yearMonth, avg: responseBySurvey.get(s.id)?.averageScore ?? null }))
    .reverse();

  const myExisting = openSurvey?.responses[0] ?? null;
  const answerMap = new Map(myExisting?.answers.map((a) => [a.questionId, a]) ?? []);
  const isSubmitted = !!myExisting?.submittedAt;

  return (
    <div className="space-y-4">
      <PageHeader
        title="パルスサーベイ"
        description="月次の短いアンケートに答えると、自分の状態を経時で振り返れます"
      />

      {sp?.ok && (
        <div className="text-sm bg-emerald-50 border border-emerald-200 rounded p-2 text-emerald-900">
          ✓ ご回答ありがとうございました。
        </div>
      )}

      {trend.some((t) => t.avg != null) && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">あなたの直近6か月</h2>
          <div className="grid grid-cols-6 gap-2 text-xs">
            {trend.map((t) => (
              <div key={t.yearMonth} className="text-center">
                <div className="text-[11px] text-slate-500">{t.yearMonth.slice(5)}</div>
                <div
                  className="h-14 bg-slate-100 rounded relative overflow-hidden"
                  title={t.avg != null ? `${t.avg.toFixed(2)} / 5` : "未回答"}
                >
                  {t.avg != null && (
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-blue-400"
                      style={{ height: `${(t.avg / 5) * 100}%` }}
                    />
                  )}
                </div>
                <div className="font-mono mt-0.5">{t.avg != null ? t.avg.toFixed(1) : "-"}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!openSurvey ? (
        <Empty message="現在受付中のサーベイはありません。月初に通知が届くまでお待ちください。" />
      ) : (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-slate-500">対象月</div>
              <div className="font-bold">{openSurvey.yearMonth}</div>
            </div>
            <Badge tone={isSubmitted ? "green" : "blue"}>
              {isSubmitted ? "提出済み" : "未提出"}
            </Badge>
          </div>
          {openSurvey.dueDate && (
            <div className="text-xs text-slate-500 mb-3">
              締切: {openSurvey.dueDate.toISOString().slice(0, 10)}
            </div>
          )}

          <form
            action={async (fd) => {
              "use server";
              await submitPulseResponse(openSurvey.id, fd);
            }}
            className="space-y-4"
          >
            <fieldset disabled={isSubmitted} className="space-y-4 contents">
              {questions.map((q) => {
                const existing = answerMap.get(q.id);
                return (
                  <div key={q.id} className="border border-slate-200 rounded p-3 space-y-2">
                    <div className="text-sm font-medium">{q.text}</div>
                    {q.description && (
                      <div className="text-[11px] text-slate-500">{q.description}</div>
                    )}

                    {q.type === "SCORE_5" && (
                      <>
                        <ScoreRadio
                          name={`score_${q.id}`}
                          defaultValue={existing?.score ?? undefined}
                          disabled={isSubmitted}
                        />
                        {q.allowComment && (
                          <Textarea
                            name={`comment_${q.id}`}
                            defaultValue={existing?.comment ?? ""}
                            placeholder="補足コメント（任意）"
                            disabled={isSubmitted}
                          />
                        )}
                      </>
                    )}

                    {q.type === "YES_NO" && (
                      <Field label="回答">
                        <Select
                          name={`score_${q.id}`}
                          defaultValue={existing?.score ?? ""}
                          disabled={isSubmitted}
                        >
                          <option value="">選択</option>
                          <option value="1">はい</option>
                          <option value="0">いいえ</option>
                        </Select>
                      </Field>
                    )}

                    {q.type === "TEXT" && (
                      <Textarea
                        name={`text_${q.id}`}
                        defaultValue={existing?.text ?? ""}
                        placeholder="自由記述（任意）"
                        disabled={isSubmitted}
                      />
                    )}
                  </div>
                );
              })}
            </fieldset>

            {!isSubmitted && (
              <div className="sticky bottom-0 bg-white py-2 border-t border-slate-100">
                <Btn type="submit" className="w-full">
                  提出する
                </Btn>
                <p className="text-[11px] text-slate-500 mt-1 text-center">
                  ※ 個別の数値は上司・所長は閲覧できますが、自由記述は集計形式で表示されます。
                </p>
              </div>
            )}
          </form>
        </Card>
      )}
    </div>
  );
}

function ScoreRadio({
  name,
  defaultValue,
  disabled,
}: {
  name: string;
  defaultValue?: number;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-1 text-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <label
          key={n}
          className="border border-slate-300 rounded py-2 text-sm font-bold cursor-pointer hover:bg-slate-50 has-[:checked]:bg-blue-100 has-[:checked]:border-blue-500 has-[:checked]:text-blue-900"
        >
          <input
            type="radio"
            name={name}
            value={n}
            defaultChecked={defaultValue === n}
            disabled={disabled}
            className="sr-only"
          />
          {n}
        </label>
      ))}
    </div>
  );
}
