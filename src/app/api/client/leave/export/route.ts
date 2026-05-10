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

  const balances = await prisma.leaveBalance.findMany({
    where: { employee: { clientId } },
    orderBy: [{ year: "desc" }, { employeeId: "asc" }],
    include: { employee: true },
  });

  const headers = ["employeeCode", "year", "granted", "used", "remaining"];
  const rows = balances.map((b) => ({
    employeeCode: b.employee.employeeCode,
    year: String(b.year),
    granted: String(b.granted),
    used: String(b.used),
    remaining: String(b.remaining),
  }));

  const csv = stringifyCsv(rows, headers);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("leave_balances.csv")}`,
    },
  });
}
