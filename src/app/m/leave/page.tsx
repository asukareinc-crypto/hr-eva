import { requireEmployee } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Shell";
import { Empty } from "@/components/ui";

export default async function MobileLeavePage() {
  const session = await requireEmployee();
  const employeeId = session.user.employeeId!;
  const [balances, records] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { employeeId },
      orderBy: { year: "desc" },
    }),
    prisma.leaveRecord.findMany({
      where: { employeeId },
      orderBy: { takenDate: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">有給残高</h2>
        {balances.length === 0 ? (
          <Empty message="有給残高データがまだありません" />
        ) : (
          <div className="space-y-2">
            {balances.map((b) => (
              <Card key={b.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{b.year}年度</div>
                  <div className="text-base font-bold">残 {b.remaining} 日</div>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  付与 {b.granted} ／ 使用 {b.used}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">取得履歴</h2>
        {records.length === 0 ? (
          <Empty message="取得履歴がまだありません" />
        ) : (
          <Card>
            <ul className="divide-y divide-slate-100">
              {records.map((r) => (
                <li key={r.id} className="px-3 py-2 text-sm flex justify-between">
                  <span>{r.takenDate.toISOString().slice(0, 10)}</span>
                  <span className="text-slate-600">{r.days} 日</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
