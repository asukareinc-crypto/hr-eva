import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stringifyCsv } from "@/lib/csv";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role !== "SR_ADMIN") {
    return new NextResponse("forbidden", { status: 403 });
  }

  const client = await prisma.client.findFirst({
    where: { id, tenantId: session.user.tenantId! },
    include: { grades: { orderBy: { rank: "asc" } } },
  });
  if (!client) return new NextResponse("not found", { status: 404 });

  const headers = ["rank", "name", "role", "description", "salaryMin", "salaryMax", "isManager"];
  const rows = client.grades.map((g) => ({
    rank: String(g.rank),
    name: g.name,
    role: g.role ?? "",
    description: g.description ?? "",
    salaryMin: g.salaryMin?.toString() ?? "",
    salaryMax: g.salaryMax?.toString() ?? "",
    isManager: g.isManager ? "true" : "false",
  }));

  const csv = stringifyCsv(rows, headers);
  const filename = `${client.name}_grades.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
