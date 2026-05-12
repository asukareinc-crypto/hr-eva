"use server";

import { prisma } from "@/lib/prisma";
import { requireClientAdmin } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

// ----- Employees -----
export async function createEmployee(formData: FormData) {
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;
  const employeeCode = String(formData.get("employeeCode") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const hireDateStr = String(formData.get("hireDate") ?? "");
  if (!employeeCode || !lastName || !firstName || !hireDateStr) {
    throw new Error("必須項目（社員番号・姓・名・入社日）が入力されていません。");
  }

  // 事前重複チェック（明確なメッセージを返す）
  const existingEmployee = await prisma.employee.findFirst({
    where: { clientId, employeeCode },
  });
  if (existingEmployee) {
    throw new Error(`社員番号「${employeeCode}」は既に使われています。別の番号を指定してください。`);
  }

  const userEmail = String(formData.get("userEmail") ?? "").trim().toLowerCase();
  const userPassword = String(formData.get("userPassword") ?? "");
  if (userEmail) {
    const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (existingUser) {
      throw new Error(`メールアドレス「${userEmail}」は既にアカウントとして登録されています。別のアドレスを指定するか、ログインアカウント発行欄を空欄にしてください。`);
    }
  }

  let employee;
  try {
    employee = await prisma.employee.create({
      data: {
        clientId,
        employeeCode,
        lastName,
        firstName,
        lastNameKana: String(formData.get("lastNameKana") ?? "") || null,
        firstNameKana: String(formData.get("firstNameKana") ?? "") || null,
        email: String(formData.get("email") ?? "") || null,
        phone: String(formData.get("phone") ?? "") || null,
        hireDate: new Date(hireDateStr),
        departmentId: String(formData.get("departmentId") ?? "") || null,
        positionId: String(formData.get("positionId") ?? "") || null,
        gradeId: String(formData.get("gradeId") ?? "") || null,
        managerEmployeeId: String(formData.get("managerEmployeeId") ?? "") || null,
        finalEvaluatorEmployeeId: String(formData.get("finalEvaluatorEmployeeId") ?? "") || null,
      },
    });
  } catch (e) {
    console.error("[createEmployee] employee.create failed:", e);
    throw new Error(`従業員データの作成に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 任意で従業員ユーザーアカウントも発行
  if (userEmail && userPassword) {
    try {
      const passwordHash = await bcrypt.hash(userPassword, 10);
      await prisma.user.create({
        data: {
          email: userEmail,
          name: `${lastName} ${firstName}`,
          passwordHash,
          role: "EMPLOYEE",
          tenantId: session.user.tenantId,
          clientId,
          employeeId: employee.id,
        },
      });
    } catch (e) {
      console.error("[createEmployee] user.create failed:", e);
      // ユーザー作成失敗時は従業員レコードも削除してトランザクション的整合を保つ
      await prisma.employee.delete({ where: { id: employee.id } }).catch(() => {});
      throw new Error(`ログインアカウントの作成に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  revalidatePath("/client/employees");
  redirect(`/client/employees/${employee.id}`);
}

export async function updateEmployee(id: string, formData: FormData) {
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;
  const employee = await prisma.employee.findFirst({ where: { id, clientId } });
  if (!employee) return;

  await prisma.employee.update({
    where: { id },
    data: {
      lastName: String(formData.get("lastName") ?? "") || employee.lastName,
      firstName: String(formData.get("firstName") ?? "") || employee.firstName,
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      departmentId: String(formData.get("departmentId") ?? "") || null,
      positionId: String(formData.get("positionId") ?? "") || null,
      gradeId: String(formData.get("gradeId") ?? "") || null,
      managerEmployeeId: String(formData.get("managerEmployeeId") ?? "") || null,
      finalEvaluatorEmployeeId: String(formData.get("finalEvaluatorEmployeeId") ?? "") || null,
      status: (String(formData.get("status") ?? "ACTIVE") as "ACTIVE" | "ON_LEAVE" | "RETIRED"),
    },
  });
  revalidatePath("/client/employees");
  revalidatePath(`/client/employees/${id}`);
}

export async function createDepartment(formData: FormData) {
  const session = await requireClientAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.department.create({ data: { clientId: session.user.clientId!, name } });
  revalidatePath("/client/employees");
}

export async function createPosition(formData: FormData) {
  const session = await requireClientAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const rank = Number(formData.get("rank") ?? 0);
  if (!name) return;
  await prisma.position.create({ data: { clientId: session.user.clientId!, name, rank } });
  revalidatePath("/client/employees");
}

// ----- Period assignments -----
export async function assignEmployeeToPeriod(periodId: string, formData: FormData) {
  const session = await requireClientAdmin();
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!employeeId) return;

  const period = await prisma.evaluationPeriod.findFirst({
    where: { id: periodId, clientId: session.user.clientId! },
  });
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, clientId: session.user.clientId! },
    include: { manager: true, finalEvaluator: true },
  });
  if (!period || !employee) return;

  const evaluation = await prisma.evaluation.upsert({
    where: { periodId_employeeId: { periodId, employeeId } },
    update: {},
    create: { periodId, employeeId, status: "NOT_STARTED" },
  });

  // 自己評価アサインメント
  await prisma.evaluationAssignment.upsert({
    where: {
      evaluationId_evaluatorEmployeeId_role: {
        evaluationId: evaluation.id,
        evaluatorEmployeeId: employeeId,
        role: "SELF",
      },
    },
    update: {},
    create: {
      evaluationId: evaluation.id,
      evaluatorEmployeeId: employeeId,
      role: "SELF",
    },
  });
  // 一次評価者（直属上司）
  if (employee.manager) {
    await prisma.evaluationAssignment.upsert({
      where: {
        evaluationId_evaluatorEmployeeId_role: {
          evaluationId: evaluation.id,
          evaluatorEmployeeId: employee.manager.id,
          role: "MANAGER",
        },
      },
      update: {},
      create: {
        evaluationId: evaluation.id,
        evaluatorEmployeeId: employee.manager.id,
        role: "MANAGER",
      },
    });
  }
  // 最終評価者（所長）
  if (employee.finalEvaluator) {
    await prisma.evaluationAssignment.upsert({
      where: {
        evaluationId_evaluatorEmployeeId_role: {
          evaluationId: evaluation.id,
          evaluatorEmployeeId: employee.finalEvaluator.id,
          role: "FINAL",
        },
      },
      update: {},
      create: {
        evaluationId: evaluation.id,
        evaluatorEmployeeId: employee.finalEvaluator.id,
        role: "FINAL",
      },
    });
  }
  revalidatePath(`/client/periods/${periodId}`);
}

export async function removeEvaluationFromPeriod(periodId: string, evaluationId: string) {
  const session = await requireClientAdmin();
  const period = await prisma.evaluationPeriod.findFirst({
    where: { id: periodId, clientId: session.user.clientId! },
  });
  if (!period) return;
  await prisma.evaluation.delete({ where: { id: evaluationId } });
  revalidatePath(`/client/periods/${periodId}`);
}

export async function finalizeEvaluation(periodId: string, evaluationId: string) {
  const session = await requireClientAdmin();
  const ev = await prisma.evaluation.findFirst({
    where: { id: evaluationId, periodId, period: { clientId: session.user.clientId! } },
  });
  if (!ev) return;
  await prisma.evaluation.update({
    where: { id: evaluationId },
    data: { status: "FINALIZED", finalizedAt: new Date() },
  });
  revalidatePath(`/client/periods/${periodId}`);
}

// ----- Wage / Leave -----
export async function upsertWage(formData: FormData) {
  const session = await requireClientAdmin();
  const employeeId = String(formData.get("employeeId") ?? "");
  const yearMonth = String(formData.get("yearMonth") ?? "");
  if (!employeeId || !yearMonth) return;
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, clientId: session.user.clientId! },
  });
  if (!employee) return;

  const basicSalary = Number(formData.get("basicSalary") ?? 0);
  const overtimeAllowance = Number(formData.get("overtimeAllowance") ?? 0);
  const otherAllowance = Number(formData.get("otherAllowance") ?? 0);
  const deduction = Number(formData.get("deduction") ?? 0);
  const netPay = basicSalary + overtimeAllowance + otherAllowance - deduction;

  await prisma.wageRecord.upsert({
    where: { employeeId_yearMonth: { employeeId, yearMonth } },
    update: {
      basicSalary,
      overtimeAllowance,
      otherAllowance,
      deduction,
      netPay,
      notes: String(formData.get("notes") ?? "") || null,
    },
    create: {
      employeeId,
      yearMonth,
      basicSalary,
      overtimeAllowance,
      otherAllowance,
      deduction,
      netPay,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  revalidatePath("/client/wage");
}

export async function upsertLeaveBalance(formData: FormData) {
  const session = await requireClientAdmin();
  const employeeId = String(formData.get("employeeId") ?? "");
  const year = Number(formData.get("year") ?? new Date().getFullYear());
  if (!employeeId) return;
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, clientId: session.user.clientId! },
  });
  if (!employee) return;

  const granted = Number(formData.get("granted") ?? 0);
  const used = Number(formData.get("used") ?? 0);
  const remaining = granted - used;

  await prisma.leaveBalance.upsert({
    where: { employeeId_year: { employeeId, year } },
    update: { granted, used, remaining },
    create: { employeeId, year, granted, used, remaining },
  });
  revalidatePath("/client/leave");
}
