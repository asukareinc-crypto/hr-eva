"use server";

import { prisma } from "@/lib/prisma";
import { requireClientAdmin } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { csvFloatOrNull, csvIntOrNull, parseCsv } from "@/lib/csv";

/**
 * 従業員マスタ CSV インポート
 * 期待カラム:
 *   employeeCode, lastName, firstName, lastNameKana, firstNameKana,
 *   email, phone, hireDate, status,
 *   department, position, gradeRank,
 *   managerEmployeeCode, finalEvaluatorEmployeeCode
 *
 * - employeeCode で UPSERT
 * - department / position は名前で参照（無ければ新規作成）
 * - gradeRank は等級番号で参照（無ければ無視）
 * - managerEmployeeCode / finalEvaluatorEmployeeCode は社員番号で参照（解決できなければスキップ）
 *   ※ 上司参照は依存関係があるため2パスで処理
 */
export async function importEmployeesCsv(formData: FormData) {
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "ファイルが選択されていません" };

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) return { ok: false, error: "データ行がありません" };

  // 既存マスタの参照
  const grades = await prisma.grade.findMany({ where: { clientId } });
  const gradeByRank = new Map(grades.map((g) => [g.rank, g]));

  // Pass 1: 部署・役職を補充しつつ従業員 UPSERT（評価者は仮置き）
  const codeToId = new Map<string, string>();
  for (const r of rows) {
    const code = (r.employeeCode ?? "").trim();
    const lastName = (r.lastName ?? "").trim();
    const firstName = (r.firstName ?? "").trim();
    if (!code || !lastName || !firstName) continue;

    let departmentId: string | null = null;
    if (r.department) {
      const existing = await prisma.department.findFirst({
        where: { clientId, name: r.department },
      });
      const dept = existing ?? (await prisma.department.create({
        data: { clientId, name: r.department },
      }));
      departmentId = dept.id;
    }

    let positionId: string | null = null;
    if (r.position) {
      const existing = await prisma.position.findFirst({
        where: { clientId, name: r.position },
      });
      const pos = existing ?? (await prisma.position.create({
        data: { clientId, name: r.position },
      }));
      positionId = pos.id;
    }

    let gradeId: string | null = null;
    const gradeRank = csvIntOrNull(r.gradeRank);
    if (gradeRank != null) gradeId = gradeByRank.get(gradeRank)?.id ?? null;

    const hireDate = r.hireDate ? new Date(r.hireDate) : new Date();
    const status =
      r.status === "ON_LEAVE" || r.status === "RETIRED" ? r.status : "ACTIVE";

    const employee = await prisma.employee.upsert({
      where: { clientId_employeeCode: { clientId, employeeCode: code } },
      update: {
        lastName,
        firstName,
        lastNameKana: r.lastNameKana || null,
        firstNameKana: r.firstNameKana || null,
        email: r.email || null,
        phone: r.phone || null,
        hireDate,
        status: status as "ACTIVE" | "ON_LEAVE" | "RETIRED",
        departmentId,
        positionId,
        gradeId,
      },
      create: {
        clientId,
        employeeCode: code,
        lastName,
        firstName,
        lastNameKana: r.lastNameKana || null,
        firstNameKana: r.firstNameKana || null,
        email: r.email || null,
        phone: r.phone || null,
        hireDate,
        status: status as "ACTIVE" | "ON_LEAVE" | "RETIRED",
        departmentId,
        positionId,
        gradeId,
      },
    });
    codeToId.set(code, employee.id);
  }

  // Pass 2: 評価者リレーションを設定
  for (const r of rows) {
    const code = (r.employeeCode ?? "").trim();
    const id = codeToId.get(code);
    if (!id) continue;
    const managerCode = (r.managerEmployeeCode ?? "").trim();
    const finalCode = (r.finalEvaluatorEmployeeCode ?? "").trim();
    const managerId = managerCode
      ? codeToId.get(managerCode) ??
        (await prisma.employee.findFirst({
          where: { clientId, employeeCode: managerCode },
        }))?.id ?? null
      : null;
    const finalId = finalCode
      ? codeToId.get(finalCode) ??
        (await prisma.employee.findFirst({
          where: { clientId, employeeCode: finalCode },
        }))?.id ?? null
      : null;
    await prisma.employee.update({
      where: { id },
      data: {
        managerEmployeeId: managerId,
        finalEvaluatorEmployeeId: finalId,
      },
    });
  }

  revalidatePath("/client/employees");
  return { ok: true, upserted: codeToId.size };
}

/**
 * 賃金 CSV インポート
 * 期待カラム:
 *   employeeCode, yearMonth, basicSalary, overtimeAllowance, otherAllowance, deduction, notes
 */
export async function importWageCsv(formData: FormData) {
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "ファイルが選択されていません" };

  const text = await file.text();
  const rows = parseCsv(text);

  let upserted = 0;
  for (const r of rows) {
    const code = (r.employeeCode ?? "").trim();
    const yearMonth = (r.yearMonth ?? "").trim();
    if (!code || !yearMonth) continue;
    const employee = await prisma.employee.findFirst({
      where: { clientId, employeeCode: code },
    });
    if (!employee) continue;

    const basicSalary = csvIntOrNull(r.basicSalary) ?? 0;
    const overtimeAllowance = csvIntOrNull(r.overtimeAllowance) ?? 0;
    const otherAllowance = csvIntOrNull(r.otherAllowance) ?? 0;
    const deduction = csvIntOrNull(r.deduction) ?? 0;
    const netPay = basicSalary + overtimeAllowance + otherAllowance - deduction;

    await prisma.wageRecord.upsert({
      where: { employeeId_yearMonth: { employeeId: employee.id, yearMonth } },
      update: {
        basicSalary,
        overtimeAllowance,
        otherAllowance,
        deduction,
        netPay,
        notes: r.notes || null,
      },
      create: {
        employeeId: employee.id,
        yearMonth,
        basicSalary,
        overtimeAllowance,
        otherAllowance,
        deduction,
        netPay,
        notes: r.notes || null,
      },
    });
    upserted++;
  }

  revalidatePath("/client/wage");
  return { ok: true, upserted };
}

/**
 * 有給残高 CSV インポート
 * 期待カラム: employeeCode, year, granted, used
 */
export async function importLeaveBalanceCsv(formData: FormData) {
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "ファイルが選択されていません" };

  const text = await file.text();
  const rows = parseCsv(text);

  let upserted = 0;
  for (const r of rows) {
    const code = (r.employeeCode ?? "").trim();
    const year = csvIntOrNull(r.year);
    if (!code || !year) continue;
    const employee = await prisma.employee.findFirst({
      where: { clientId, employeeCode: code },
    });
    if (!employee) continue;
    const granted = csvFloatOrNull(r.granted) ?? 0;
    const used = csvFloatOrNull(r.used) ?? 0;
    await prisma.leaveBalance.upsert({
      where: { employeeId_year: { employeeId: employee.id, year } },
      update: { granted, used, remaining: granted - used },
      create: { employeeId: employee.id, year, granted, used, remaining: granted - used },
    });
    upserted++;
  }

  revalidatePath("/client/leave");
  return { ok: true, upserted };
}
