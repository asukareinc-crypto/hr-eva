import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stringifyCsv } from "@/lib/csv";

export async function GET() {
  const session = await auth();
  if (session?.user.role !== "CLIENT_ADMIN") {
    return new NextResponse("forbidden", { status: 403 });
  }
  const clientId = session.user.clientId!;

  const employees = await prisma.employee.findMany({
    where: { clientId },
    orderBy: { employeeCode: "asc" },
    include: {
      department: true,
      position: true,
      grade: true,
      manager: true,
      finalEvaluator: true,
    },
  });

  const headers = [
    "employeeCode",
    "lastName",
    "firstName",
    "lastNameKana",
    "firstNameKana",
    "email",
    "phone",
    "hireDate",
    "status",
    "department",
    "position",
    "gradeRank",
    "managerEmployeeCode",
    "finalEvaluatorEmployeeCode",
  ];

  const rows = employees.map((e) => ({
    employeeCode: e.employeeCode,
    lastName: e.lastName,
    firstName: e.firstName,
    lastNameKana: e.lastNameKana ?? "",
    firstNameKana: e.firstNameKana ?? "",
    email: e.email ?? "",
    phone: e.phone ?? "",
    hireDate: e.hireDate.toISOString().slice(0, 10),
    status: e.status,
    department: e.department?.name ?? "",
    position: e.position?.name ?? "",
    gradeRank: e.grade?.rank?.toString() ?? "",
    managerEmployeeCode: e.manager?.employeeCode ?? "",
    finalEvaluatorEmployeeCode: e.finalEvaluator?.employeeCode ?? "",
  }));

  const csv = stringifyCsv(rows, headers);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("employees.csv")}`,
    },
  });
}
