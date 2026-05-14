import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pdfResponse } from "@/lib/pdf/render";
import {
  FeedbackMeetingPdf,
  type FeedbackMeetingData,
} from "@/lib/pdf/FeedbackMeetingPdf";
import { loadPdfFonts, makeWrapper } from "@/lib/pdf/wrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      period: { include: { client: true } },
      employee: { include: { department: true, position: true, grade: true } },
      assignments: { include: { evaluator: true, scores: { include: { item: true } } } },
      feedback: true,
    },
  });
  if (!evaluation) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // アクセス制御（feedback ページと同等）
  const role = session.user.role;
  let canAccess = false;
  if (
    role === "SR_ADMIN" &&
    evaluation.period.client.tenantId === session.user.tenantId
  ) {
    canAccess = true;
  }
  if (
    role === "CLIENT_ADMIN" &&
    evaluation.period.clientId === session.user.clientId
  ) {
    canAccess = true;
  }
  if (role === "EMPLOYEE") {
    const isEvaluator = evaluation.assignments.some(
      (a) =>
        a.evaluatorEmployeeId === session.user.employeeId &&
        (a.role === "MANAGER" || a.role === "FINAL")
    );
    const isTarget = evaluation.employeeId === session.user.employeeId;
    if (isEvaluator) canAccess = true;
    else if (isTarget && evaluation.feedback?.conductedDate) canAccess = true;
  }
  if (!canAccess) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const fb = evaluation.feedback;

  // 参考総合点（最終 > 一次 を基準に重み付き平均）
  const ref =
    evaluation.assignments.find((a) => a.role === "FINAL") ??
    evaluation.assignments.find((a) => a.role === "MANAGER");
  let overallAverage = "—";
  if (ref) {
    const totalWeighted = ref.scores.reduce(
      (acc, s) => (s.score == null ? acc : acc + s.score * s.item.weight),
      0
    );
    const totalWeight = ref.scores.reduce(
      (acc, s) => (s.score == null ? acc : acc + s.item.weight),
      0
    );
    if (totalWeight > 0) {
      overallAverage = (totalWeighted / totalWeight).toFixed(2);
    }
  }

  let conductedByName: string | null = null;
  if (fb?.conductedBy) {
    const u = await prisma.user.findUnique({ where: { id: fb.conductedBy } });
    conductedByName = u?.name ?? null;
  }

  // フォントを読み込み、自由記述を事前に折り返す
  const fonts = await loadPdfFonts(new URL(request.url).origin);
  const wrap = makeWrapper(fonts);
  // ListBox: 50%幅(257) - paddingRight4 - innerPad16 - 番号14 ≒ 223、安全側 215
  const LIST_W = 215;
  // 目標ボックス: 本文幅515 - box padding16 ≒ 499、安全側 492
  const GOAL_W = 492;

  const data: FeedbackMeetingData = {
    clientName: evaluation.period.client.name,
    periodName: evaluation.period.name,
    employee: {
      name: `${evaluation.employee.lastName} ${evaluation.employee.firstName}`,
      code: evaluation.employee.employeeCode,
      department: evaluation.employee.department?.name ?? "—",
      position: evaluation.employee.position?.name ?? "—",
      grade: evaluation.employee.grade?.name ?? "—",
    },
    overallAverage,
    scheduledDate: fb?.scheduledDate ? fb.scheduledDate.toISOString() : null,
    conductedDate: fb?.conductedDate ? fb.conductedDate.toISOString() : null,
    conductedByName,
    goods: [fb?.good1, fb?.good2, fb?.good3]
      .map((g) => g?.trim())
      .filter((g): g is string => !!g)
      .map((g) => wrap(g, LIST_W, 9)),
    improves: [fb?.improve1, fb?.improve2, fb?.improve3]
      .map((g) => g?.trim())
      .filter((g): g is string => !!g)
      .map((g) => wrap(g, LIST_W, 9)),
    goal: fb?.goal ? wrap(fb.goal.trim(), GOAL_W, 9) : null,
    note: wrap(
      "※ 評価と面談は、点数を付けるためではなく、日頃から頑張ってくれていることを褒めるためにあります。また、更に取り組みを強化してほしい事をすり合わせるためにあります。",
      476,
      8
    ),
  };

  const filename = `面談シート_${data.employee.name}_${data.periodName}.pdf`;
  return pdfResponse(request, FeedbackMeetingPdf({ data }), filename);
}
