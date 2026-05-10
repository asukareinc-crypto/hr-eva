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

  const tpl = await prisma.evaluationTemplate.findFirst({
    where: { id, tenantId: session.user.tenantId! },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { levels: true },
      },
    },
  });
  if (!tpl) return new NextResponse("not found", { status: 404 });

  const maxScoreOverall = Math.max(5, ...tpl.items.map((i) => i.maxScore));
  const headers = [
    "sortOrder",
    "name",
    "description",
    "weight",
    "maxScore",
    "interviewPoint",
    "interviewQuestions",
    ...Array.from({ length: maxScoreOverall }, (_, i) => `level${maxScoreOverall - i}`),
  ];

  const rows = tpl.items.map((it) => {
    const row: Record<string, string> = {
      sortOrder: String(it.sortOrder),
      name: it.name,
      description: it.description ?? "",
      weight: String(it.weight),
      maxScore: String(it.maxScore),
      interviewPoint: it.interviewPoint ?? "",
      interviewQuestions: it.interviewQuestions ?? "",
    };
    for (let s = 1; s <= maxScoreOverall; s++) {
      row[`level${s}`] = it.levels.find((l) => l.score === s)?.description ?? "";
    }
    return row;
  });

  const csv = stringifyCsv(rows, headers);
  const filename = `${tpl.name}_evaluation_items.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
