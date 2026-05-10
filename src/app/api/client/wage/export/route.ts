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

  const records = await prisma.wageRecord.findMany({
    where: { employee: { clientId } },
    orderBy: [{ yearMonth: "desc" }, { employeeId: "asc" }],
    include: { employee: true },
  });

  const headers = [
    "employeeCode",
    "yearMonth",
    "basicSalary",
    "overtimeAllowance",
    "otherAllowance",
    "deduction",
    "netPay",
    "notes",
  ];

  const rows = records.map((r) => ({
    employeeCode: r.employee.employeeCode,
    yearMonth: r.yearMonth,
    basicSalary: String(r.basicSalary),
    overtimeAllowance: String(r.overtimeAllowance),
    otherAllowance: String(r.otherAllowance),
    deduction: String(r.deduction),
    netPay: String(r.netPay),
    notes: r.notes ?? "",
  }));

  const csv = stringifyCsv(rows, headers);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("wage_records.csv")}`,
    },
  });
}
