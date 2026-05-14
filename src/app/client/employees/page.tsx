import Link from "next/link";
import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Empty, LinkBtn } from "@/components/ui";
import { CsvPanel } from "@/components/CsvPanel";
import { importEmployeesCsv } from "@/app/client/csv-actions";

const STATUS_TONE: Record<string, "green" | "yellow" | "slate"> = {
  ACTIVE: "green",
  ON_LEAVE: "yellow",
  RETIRED: "slate",
};

export default async function EmployeesPage() {
  const session = await requireClientAdmin();
  const employees = await prisma.employee.findMany({
    where: { clientId: session.user.clientId! },
    orderBy: { employeeCode: "asc" },
    include: { department: true, position: true, grade: true, user: true },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="従業員"
        description="従業員マスターデータの管理"
        actions={<LinkBtn href="/client/employees/new">+ 新規追加</LinkBtn>}
      />

      <CsvPanel
        title="従業員マスタ CSV 入出力"
        description="従業員を一括登録／更新できます。社員番号で UPSERT。部署・役職は名称指定で自動作成、等級は等級番号で参照、上司・最終評価者は社員番号で指定します。"
        exportHref="/api/client/employees/export"
        importAction={async (fd) => {
          "use server";
          await importEmployeesCsv(fd);
        }}
        helpText="ヘッダ: employeeCode, lastName, firstName, lastNameKana, firstNameKana, email, phone, hireDate, status, department, position, gradeRank, managerEmployeeCode, finalEvaluatorEmployeeCode"
      />

      {employees.length === 0 ? (
        <Empty message="従業員がまだ登録されていません。" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="text-left px-4 py-2">No.</th>
                <th className="text-left px-4 py-2">氏名</th>
                <th className="text-left px-4 py-2">部署</th>
                <th className="text-left px-4 py-2">役職</th>
                <th className="text-left px-4 py-2">等級</th>
                <th className="text-left px-4 py-2">入社日</th>
                <th className="text-left px-4 py-2">ログイン</th>
                <th className="text-left px-4 py-2">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 text-xs text-slate-500">{e.employeeCode}</td>
                  <td className="px-4 py-2 font-medium">
                    <Link className="hover:underline" href={`/client/employees/${e.id}`}>
                      {e.lastName} {e.firstName}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{e.department?.name ?? "-"}</td>
                  <td className="px-4 py-2">{e.position?.name ?? "-"}</td>
                  <td className="px-4 py-2">{e.grade?.name ?? "-"}</td>
                  <td className="px-4 py-2 text-xs">
                    {e.hireDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {e.user ? (
                      <Badge tone="blue">あり</Badge>
                    ) : (
                      <span className="text-slate-400">なし</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
