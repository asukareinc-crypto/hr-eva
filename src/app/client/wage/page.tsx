import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Btn, Empty, Field, Input, Select } from "@/components/ui";
import { upsertWage } from "@/app/client/actions";
import { importWageCsv } from "@/app/client/csv-actions";
import { CsvPanel } from "@/components/CsvPanel";

export default async function WagePage() {
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;

  const [employees, recent] = await Promise.all([
    prisma.employee.findMany({
      where: { clientId, status: "ACTIVE" },
      orderBy: { employeeCode: "asc" },
    }),
    prisma.wageRecord.findMany({
      where: { employee: { clientId } },
      orderBy: [{ yearMonth: "desc" }, { employeeId: "asc" }],
      take: 30,
      include: { employee: true },
    }),
  ]);

  const currentYM = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-4">
      <PageHeader
        title="賃金"
        description="月次の賃金データを手入力で登録（将来は給与ソフトから取込予定）"
      />

      <CsvPanel
        title="賃金 CSV 入出力"
        description="月次賃金データを一括登録／取得できます。社員番号 + 対象年月で UPSERT。差引支給額は自動計算。"
        exportHref="/api/client/wage/export"
        importAction={async (fd) => {
          "use server";
          await importWageCsv(fd);
        }}
        helpText="ヘッダ: employeeCode, yearMonth, basicSalary, overtimeAllowance, otherAllowance, deduction, notes"
      />

      <Card className="p-4">
        <h2 className="font-semibold mb-2">賃金登録 / 更新</h2>
        <form action={upsertWage} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
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
          <Field label="対象年月" hint="YYYY-MM">
            <Input name="yearMonth" defaultValue={currentYM} required />
          </Field>
          <Field label="基本給">
            <Input type="number" name="basicSalary" defaultValue={0} />
          </Field>
          <Field label="残業手当">
            <Input type="number" name="overtimeAllowance" defaultValue={0} />
          </Field>
          <Field label="その他手当">
            <Input type="number" name="otherAllowance" defaultValue={0} />
          </Field>
          <Field label="控除">
            <Input type="number" name="deduction" defaultValue={0} />
          </Field>
          <Field label="メモ">
            <Input name="notes" />
          </Field>
          <Btn type="submit">登録 / 更新</Btn>
        </form>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">直近の賃金記録</h2>
        {recent.length === 0 ? (
          <Empty message="賃金記録がまだありません" />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="text-left py-1">対象年月</th>
                <th className="text-left py-1">従業員</th>
                <th className="text-right py-1">基本給</th>
                <th className="text-right py-1">残業</th>
                <th className="text-right py-1">その他</th>
                <th className="text-right py-1">控除</th>
                <th className="text-right py-1">差引支給</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((r) => (
                <tr key={r.id}>
                  <td className="py-1">{r.yearMonth}</td>
                  <td className="py-1">{r.employee.lastName} {r.employee.firstName}</td>
                  <td className="py-1 text-right">¥{r.basicSalary.toLocaleString()}</td>
                  <td className="py-1 text-right">¥{r.overtimeAllowance.toLocaleString()}</td>
                  <td className="py-1 text-right">¥{r.otherAllowance.toLocaleString()}</td>
                  <td className="py-1 text-right">¥{r.deduction.toLocaleString()}</td>
                  <td className="py-1 text-right font-medium">¥{r.netPay.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
