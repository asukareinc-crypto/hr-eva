import Link from "next/link";
import { requireEmployee } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Shell";
import { Badge } from "@/components/ui";
import { LineChart } from "@/components/charts";
import { getClientFeatures } from "@/lib/client-features";

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

export default async function MobileHome() {
  const session = await requireEmployee();
  const employeeId = session.user.employeeId!;
  const clientId = session.user.clientId!;

  const features = await getClientFeatures(clientId);
  const [
    employee,
    myAssignments,
    latestWage,
    leaveBalance,
    openSurvey,
    recentSurveys,
  ] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true, position: true, grade: true },
    }),
    prisma.evaluationAssignment.findMany({
      where: { evaluatorEmployeeId: employeeId, evaluation: { period: { status: "OPEN" } } },
      include: {
        evaluation: { include: { period: true, employee: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.wageRecord.findFirst({
      where: { employeeId },
      orderBy: { yearMonth: "desc" },
    }),
    prisma.leaveBalance.findFirst({
      where: { employeeId },
      orderBy: { year: "desc" },
    }),
    prisma.pulseSurvey.findFirst({
      where: { clientId, status: "OPEN" },
      orderBy: { yearMonth: "desc" },
      include: {
        responses: { where: { employeeId } },
      },
    }),
    prisma.pulseSurvey.findMany({
      where: { clientId },
      orderBy: { yearMonth: "desc" },
      take: 6,
    }),
  ]);

  // パルスサーベイの状態
  const pulseSubmitted = !!openSurvey?.responses[0]?.submittedAt;
  const myResponses = recentSurveys.length
    ? await prisma.pulseResponse.findMany({
        where: { employeeId, surveyId: { in: recentSurveys.map((s) => s.id) } },
      })
    : [];
  const responseBySurvey = new Map(myResponses.map((r) => [r.surveyId, r]));
  const trend = recentSurveys
    .map((s) => ({
      yearMonth: s.yearMonth,
      avg: responseBySurvey.get(s.id)?.averageScore ?? null,
    }))
    .reverse();
  const latestScore = trend.findLast((t) => t.avg != null)?.avg ?? null;
  const hasTrendData = trend.some((t) => t.avg != null);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-xs text-slate-500">所属 / 役職</div>
        <div className="text-base font-bold">
          {employee?.department?.name ?? "-"} / {employee?.position?.name ?? "-"}
        </div>
        <div className="text-xs text-slate-500 mt-2">等級</div>
        <div className="text-sm font-semibold">
          {employee?.grade
            ? `${employee.grade.name}${employee.grade.role ? ` （${employee.grade.role}）` : ""}`
            : "未設定"}
        </div>
      </Card>

      {/* パルスサーベイカード */}
      {openSurvey && !pulseSubmitted ? (
        <Link href="/m/pulse">
          <Card className="p-4 bg-gradient-to-br from-indigo-50 to-sky-50 border-indigo-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] tracking-wider font-bold text-indigo-700">
                  📋 PULSE SURVEY
                </div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {openSurvey.yearMonth} のサーベイにご協力ください
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  1分で完了します
                  {openSurvey.dueDate &&
                    `・締切 ${openSurvey.dueDate.toISOString().slice(0, 10)}`}
                </div>
              </div>
              <Badge tone="red">未回答</Badge>
            </div>
          </Card>
        </Link>
      ) : (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] tracking-wider font-bold text-indigo-700">
              📋 パルスサーベイ
            </div>
            {openSurvey && pulseSubmitted && <Badge tone="green">回答済み</Badge>}
          </div>
          {hasTrendData ? (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                <div className="text-xs text-slate-500">最新スコア</div>
                <div className="text-2xl font-bold">
                  {latestScore != null ? latestScore.toFixed(1) : "-"}
                </div>
                <div className="text-xs text-slate-500">/ 5</div>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {trend.map((t) => (
                  <div key={t.yearMonth} className="text-center">
                    <div
                      className="h-8 bg-slate-100 rounded relative overflow-hidden"
                      title={t.avg != null ? `${t.avg.toFixed(2)} / 5` : "未回答"}
                    >
                      {t.avg != null && (
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-indigo-500"
                          style={{ height: `${(t.avg / 5) * 100}%` }}
                        />
                      )}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      {t.yearMonth.slice(5)}
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/m/pulse" className="text-[11px] text-indigo-700 font-semibold underline mt-2 inline-block">
                詳細・履歴を見る →
              </Link>
            </>
          ) : (
            <div className="text-xs text-slate-500">
              受付中のサーベイはありません。月初に通知をお待ちください。
            </div>
          )}
        </Card>
      )}

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">あなたへの評価タスク</h2>
        {myAssignments.length === 0 ? (
          <Card className="p-4 text-sm text-slate-500">現在、評価タスクはありません。</Card>
        ) : (
          <div className="space-y-2">
            {myAssignments.map((a) => (
              <Link key={a.id} href={`/evaluate/${a.id}`}>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        {a.role === "SELF"
                          ? "📝 自己評価"
                          : `${a.evaluation.employee.lastName} ${a.evaluation.employee.firstName} の${a.role === "MANAGER" ? "一次評価" : a.role === "FINAL" ? "最終評価" : a.role}`}
                      </div>
                      <div className="text-xs text-slate-500">{a.evaluation.period.name}</div>
                    </div>
                    <Badge tone={a.submittedAt ? "green" : "blue"}>
                      {a.submittedAt ? "提出済み" : STATUS_LABEL[a.evaluation.status] ?? "進行中"}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {(features.wageEnabled || features.leaveEnabled) && (
      <div className={`grid gap-2 ${features.wageEnabled && features.leaveEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
        {features.wageEnabled && (
        <Card className="p-3">
          <div className="text-xs text-slate-500">💴 最新賃金</div>
          {latestWage ? (
            <>
              <div className="text-base font-bold">¥{latestWage.netPay.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500">{latestWage.yearMonth}</div>
            </>
          ) : (
            <div className="text-xs text-slate-400">未登録</div>
          )}
          <Link href="/m/wage" className="text-[11px] text-slate-700 underline mt-1 inline-block">
            詳細
          </Link>
        </Card>
        )}
        {features.leaveEnabled && (
        <Card className="p-3">
          <div className="text-xs text-slate-500">🏖️ 有給残</div>
          {leaveBalance ? (
            <>
              <div className="text-base font-bold">{leaveBalance.remaining} 日</div>
              <div className="text-[10px] text-slate-500">{leaveBalance.year}年度</div>
            </>
          ) : (
            <div className="text-xs text-slate-400">未登録</div>
          )}
          <Link href="/m/leave" className="text-[11px] text-slate-700 underline mt-1 inline-block">
            詳細
          </Link>
        </Card>
        )}
      </div>
      )}
    </div>
  );
}
