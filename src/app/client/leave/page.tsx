import { notFound } from "next/navigation";
import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getClientFeatures } from "@/lib/client-features";
import { Card, PageHeader } from "@/components/Shell";
import { Btn, Empty, Field, Input, Select } from "@/components/ui";
import { upsertLeaveBalance } from "@/app/client/actions";
import { importLeaveBalanceCsv } from "@/app/client/csv-actions";
import { CsvPanel } from "@/components/CsvPanel";

export default async function LeavePage() {
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;
  const features = await getClientFeatures(clientId);
  if (!features.leaveEnabled) notFound();

  const [employees, balances] = await Promise.all([
    prisma.employee.findMany({
      where: { clientId, status: "ACTIVE" },
      orderBy: { employeeCode: "asc" },
    }),
    prisma.leaveBalance.findMany({
      where: { employee: { clientId } },
      orderBy: [{ year: "desc" }, { employeeId: "asc" }],
      take: 50,
      include: { employee: true },
    }),
  ]);

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-4">
      <PageHeader
        title="有給"
        description="従業員ごとの有給残高を登録"
      />

      <CsvPanel
        title="有給残高 CSV 入出力"
        description="有給残高を一括登録／取得できます。社員番号 + 年で UPSERT。残日数は自動計算。"
        exportHref="/api/client/leave/export"
        importAction={async (fd) => {
          "use server";
          await importLeaveBalanceCsv(fd);
        }}
        helpText="ヘッダ: employeeCode, year, granted, used"
      />

      <Card className="p-4">
        <h2 className="font-semibold mb-2">有給残高登録 / 更新</h2>
        <form action={upsertLeaveBalance} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <Field label="従業員">
            <Select name="employeeId" required>
              <option value="">選択</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.lastName} {e.firstName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="年">
            <Input type="number" name="year" defaultValue={currentYear} />
          </Field>
          <Field label="付与日数">
            <Input type="number" step="0.5" name="granted" defaultValue={0} />
          </Field>
          <Field label="使用日数">
            <Input type="number" step="0.5" name="used" defaultValue={0} />
          </Field>
          <Btn type="submit">登録 / 更新</Btn>
        </form>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">有給残高一覧</h2>
        {balances.length === 0 ? (
          <Empty message="有給残高データがまだありません" />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="text-left py-1">年</th>
                <th className="text-left py-1">従業員</th>
                <th className="text-right py-1">付与</th>
                <th className="text-right py-1">使用</th>
                <th className="text-right py-1">残</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {balances.map((b) => (
                <tr key={b.id}>
                  <td className="py-1">{b.year}</td>
                  <td className="py-1">{b.employee.lastName} {b.employee.firstName}</td>
                  <td className="py-1 text-right">{b.granted}</td>
                  <td className="py-1 text-right">{b.used}</td>
                  <td className="py-1 text-right font-medium">{b.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
