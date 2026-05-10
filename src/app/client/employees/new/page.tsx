import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Btn, Field, Input, Select } from "@/components/ui";
import { createEmployee, createDepartment, createPosition } from "@/app/client/actions";

export default async function NewEmployeePage() {
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;
  const [departments, positions, grades, employees] = await Promise.all([
    prisma.department.findMany({ where: { clientId }, orderBy: { name: "asc" } }),
    prisma.position.findMany({ where: { clientId }, orderBy: { rank: "desc" } }),
    prisma.grade.findMany({ where: { clientId }, orderBy: { rank: "asc" } }),
    prisma.employee.findMany({
      where: { clientId, status: "ACTIVE" },
      orderBy: { employeeCode: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="従業員 新規追加" />

      <Card className="p-6 max-w-2xl">
        <form action={createEmployee} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="社員番号">
              <Input name="employeeCode" required placeholder="E001" />
            </Field>
            <Field label="入社日">
              <Input type="date" name="hireDate" required />
            </Field>
            <Field label="姓">
              <Input name="lastName" required />
            </Field>
            <Field label="名">
              <Input name="firstName" required />
            </Field>
            <Field label="姓カナ">
              <Input name="lastNameKana" />
            </Field>
            <Field label="名カナ">
              <Input name="firstNameKana" />
            </Field>
            <Field label="メール">
              <Input type="email" name="email" />
            </Field>
            <Field label="電話">
              <Input name="phone" />
            </Field>
            <Field label="部署">
              <Select name="departmentId">
                <option value="">未設定</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="役職">
              <Select name="positionId">
                <option value="">未設定</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="等級（格付け）">
              <Select name="gradeId">
                <option value="">未設定</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.role ? `（${g.role}）` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="一次評価者（直属上司）">
              <Select name="managerEmployeeId">
                <option value="">未設定</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.lastName} {emp.firstName} ({emp.employeeCode})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="最終評価者（所長）">
              <Select name="finalEvaluatorEmployeeId">
                <option value="">未設定</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.lastName} {emp.firstName} ({emp.employeeCode})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="text-sm font-medium text-slate-700">
              ログインアカウント発行（任意）
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ログイン用メール">
                <Input type="email" name="userEmail" />
              </Field>
              <Field label="初期パスワード">
                <Input type="text" name="userPassword" />
              </Field>
            </div>
          </div>

          <Btn type="submit">作成</Btn>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">部署を追加</h3>
          <form action={createDepartment} className="flex gap-2">
            <Input name="name" placeholder="営業部" required />
            <Btn type="submit" variant="secondary">追加</Btn>
          </form>
          {departments.length > 0 && (
            <ul className="text-xs text-slate-500 mt-2 space-y-0.5">
              {departments.map((d) => <li key={d.id}>・{d.name}</li>)}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">役職を追加</h3>
          <form action={createPosition} className="flex gap-2">
            <Input name="name" placeholder="部長" required className="flex-1" />
            <Input name="rank" type="number" defaultValue={1} className="w-20" title="ランク" />
            <Btn type="submit" variant="secondary">追加</Btn>
          </form>
          {positions.length > 0 && (
            <ul className="text-xs text-slate-500 mt-2 space-y-0.5">
              {positions.map((p) => <li key={p.id}>・{p.name} (rank {p.rank})</li>)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
