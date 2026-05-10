import Link from "next/link";
import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Btn, Empty, Field, Input, LinkBtn } from "@/components/ui";
import { ensureMonthlySurvey } from "@/app/pulse/actions";

export default async function ClientPulseDashboard() {
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;

  const [surveys, employeeCount] = await Promise.all([
    prisma.pulseSurvey.findMany({
      where: { clientId },
      orderBy: { yearMonth: "desc" },
      include: { _count: { select: { responses: true } }, responses: true },
    }),
    prisma.employee.count({ where: { clientId, status: "ACTIVE" } }),
  ]);

  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <PageHeader
        title="パルスサーベイ"
        description="月次の軽量アンケートで従業員の状態を経時把握します"
        actions={<LinkBtn href="/client/pulse/questions" variant="secondary">設問を管理</LinkBtn>}
      />

      <Card className="p-4">
        <h2 className="font-semibold mb-3 text-sm">今月のサーベイを開く</h2>
        <form action={ensureMonthlySurvey} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Field label="対象月">
            <Input name="yearMonth" defaultValue={currentYM} required />
          </Field>
          <Field label="締切日（任意）">
            <Input type="date" name="dueDate" defaultValue={monthEnd} />
          </Field>
          <Btn type="submit">作成 / 再オープン</Btn>
        </form>
        <p className="text-[11px] text-slate-500 mt-2">
          対象月のサーベイがまだなければ作成、既に存在するなら OPEN に再オープンします。
        </p>
      </Card>

      {surveys.length === 0 ? (
        <Empty message="まだサーベイがありません。上のフォームから今月分を作成してください。" />
      ) : (
        <div className="space-y-2">
          {surveys.map((s) => {
            const submitted = s.responses.filter((r) => r.submittedAt).length;
            const avg = (() => {
              const arr = s.responses
                .map((r) => r.averageScore)
                .filter((x): x is number => typeof x === "number");
              if (arr.length === 0) return null;
              return arr.reduce((a, b) => a + b, 0) / arr.length;
            })();
            return (
              <Card key={s.id} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <Link href={`/client/pulse/${s.id}`} className="font-semibold hover:underline">
                    {s.yearMonth}
                  </Link>
                  <Badge tone={s.status === "OPEN" ? "green" : "slate"}>
                    {s.status === "OPEN" ? "受付中" : "終了"}
                  </Badge>
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap gap-3">
                  <span>
                    回答: <strong>{submitted}</strong> / {employeeCount} 名
                  </span>
                  {avg != null && (
                    <span>
                      平均スコア: <strong>{avg.toFixed(2)}</strong> / 5
                    </span>
                  )}
                  {s.dueDate && (
                    <span>締切: {s.dueDate.toISOString().slice(0, 10)}</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
