import { requireEmployee } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Shell";
import { Empty } from "@/components/ui";

export default async function MobileWagePage() {
  const session = await requireEmployee();
  const employeeId = session.user.employeeId!;
  const records = await prisma.wageRecord.findMany({
    where: { employeeId },
    orderBy: { yearMonth: "desc" },
    take: 12,
  });

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">賃金履歴（直近12ヶ月）</h2>
      {records.length === 0 ? (
        <Empty message="賃金データがまだ登録されていません。" />
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <Card key={r.id} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">{r.yearMonth}</div>
                <div className="text-base font-bold">¥{r.netPay.toLocaleString()}</div>
              </div>
              <dl className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                <dt>基本給</dt>
                <dd className="text-right">¥{r.basicSalary.toLocaleString()}</dd>
                <dt>残業手当</dt>
                <dd className="text-right">¥{r.overtimeAllowance.toLocaleString()}</dd>
                <dt>その他</dt>
                <dd className="text-right">¥{r.otherAllowance.toLocaleString()}</dd>
                <dt>控除</dt>
                <dd className="text-right">¥{r.deduction.toLocaleString()}</dd>
              </dl>
              {r.notes && (
                <div className="text-[11px] text-slate-500 mt-2 border-t border-slate-100 pt-1">
                  {r.notes}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
