import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Btn, Field, Input, Select } from "@/components/ui";
import { updateEmployee } from "@/app/client/actions";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;
  const employee = await prisma.employee.findFirst({
    where: { id, clientId },
    include: { department: true, position: true, manager: true, user: true },
  });
  if (!employee) notFound();

  const [departments, positions, grades, others] = await Promise.all([
    prisma.department.findMany({ where: { clientId }, orderBy: { name: "asc" } }),
    prisma.position.findMany({ where: { clientId }, orderBy: { rank: "desc" } }),
    prisma.grade.findMany({ where: { clientId }, orderBy: { rank: "asc" } }),
    prisma.employee.findMany({
      where: { clientId, NOT: { id } },
      orderBy: { employeeCode: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${employee.lastName} ${employee.firstName}`}
        description={`社員番号: ${employee.employeeCode}`}
        actions={
          <Link href="/client/employees" className="text-sm text-slate-600 underline-offset-2 hover:underline">← 一覧へ</Link>
        }
      />

      <Card className="p-6 max-w-2xl">
        <form
          action={async (fd) => {
            "use server";
            await updateEmployee(id, fd);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="姓"><Input name="lastName" defaultValue={employee.lastName} /></Field>
            <Field label="名"><Input name="firstName" defaultValue={employee.firstName} /></Field>
            <Field label="メール"><Input type="email" name="email" defaultValue={employee.email ?? ""} /></Field>
            <Field label="電話"><Input name="phone" defaultValue={employee.phone ?? ""} /></Field>
            <Field label="部署">
              <Select name="departmentId" defaultValue={employee.departmentId ?? ""}>
                <option value="">未設定</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="役職">
              <Select name="positionId" defaultValue={employee.positionId ?? ""}>
                <option value="">未設定</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="等級（格付け）">
              <Select name="gradeId" defaultValue={employee.gradeId ?? ""}>
                <option value="">未設定</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.role ? `（${g.role}）` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="一次評価者（直属上司）">
              <Select name="managerEmployeeId" defaultValue={employee.managerEmployeeId ?? ""}>
                <option value="">未設定</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>{o.lastName} {o.firstName}</option>
                ))}
              </Select>
            </Field>
            <Field label="最終評価者（所長）">
              <Select name="finalEvaluatorEmployeeId" defaultValue={employee.finalEvaluatorEmployeeId ?? ""}>
                <option value="">未設定</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>{o.lastName} {o.firstName}</option>
                ))}
              </Select>
            </Field>
            <Field label="ステータス">
              <Select name="status" defaultValue={employee.status}>
                <option value="ACTIVE">在籍</option>
                <option value="ON_LEAVE">休職</option>
                <option value="RETIRED">退職</option>
              </Select>
            </Field>
          </div>
          <Btn type="submit">保存</Btn>
        </form>
      </Card>

      <Card className="p-4 text-sm">
        <div className="font-semibold mb-2">ログイン情報</div>
        {employee.user ? (
          <div className="flex items-center gap-3">
            <span>{employee.user.email}</span>
            <Badge tone={employee.user.isActive ? "green" : "slate"}>
              {employee.user.isActive ? "有効" : "無効"}
            </Badge>
          </div>
        ) : (
          <div className="text-slate-500">
            ログインアカウント未発行。発行は新規追加画面から（既存従業員への追加発行は将来対応）。
          </div>
        )}
      </Card>
    </div>
  );
}
