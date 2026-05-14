import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pdfResponse } from "@/lib/pdf/render";
import {
  PeriodSummaryPdf,
  type PeriodSummaryData,
} from "@/lib/pdf/PeriodSummaryPdf";
import { loadPdfFonts, makeWrapper } from "@/lib/pdf/wrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "未着手",
  SELF_IN_PROGRESS: "自己評価中",
  SELF_DONE: "自己評価完了",
  MANAGER_IN_PROGRESS: "一次評価中",
  MANAGER_DONE: "一次評価完了",
  FINAL_IN_PROGRESS: "最終評価中",
  FINAL_DONE: "最終評価完了",
  FINALIZED: "確定",
};

const PERIOD_STATUS_LABEL: Record<string, string> = {
  DRAFT: "下書き",
  OPEN: "運用中",
  CLOSED: "終了",
};

function evaluatorName(
  assignments: { role: string; evaluator: { lastName: string; firstName: string } }[],
  role: string
): string {
  const a = assignments.find((x) => x.role === role);
  return a ? `${a.evaluator.lastName} ${a.evaluator.firstName}` : "—";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const period = await prisma.evaluationPeriod.findUnique({
    where: { id },
    include: {
      client: true,
      template: true,
      evaluations: {
        include: {
          employee: { include: { department: true } },
          assignments: {
            include: { evaluator: true, scores: { include: { item: true } } },
          },
        },
        orderBy: { employee: { employeeCode: "asc" } },
      },
    },
  });
  if (!period) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // アクセス制御: SUPER_ADMIN（運営・全件）/ SR_ADMIN（同テナント）/ CLIENT_ADMIN（同クライアント）
  const role = session.user.role;
  let canAccess = false;
  if (role === "SUPER_ADMIN") {
    canAccess = true;
  }
  if (role === "SR_ADMIN" && period.client.tenantId === session.user.tenantId) {
    canAccess = true;
  }
  if (role === "CLIENT_ADMIN" && period.clientId === session.user.clientId) {
    canAccess = true;
  }
  if (!canAccess) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let finalized = 0;
  // フォントを読み込み、表セルの長い文字列を事前に折り返す（landscape 762pt 幅）
  const fonts = await loadPdfFonts(new URL(request.url).origin);
  const wrap = makeWrapper(fonts);
  const NAME_W = 110; // 氏名 17%
  const DEPT_W = 96; // 部署 15%
  const EVAL_W = 82; // 評価者 13%

  let notStarted = 0;
  const rows: PeriodSummaryData["rows"] = period.evaluations.map((e) => {
    if (e.status === "FINALIZED") finalized += 1;
    if (e.status === "NOT_STARTED") notStarted += 1;

    const ref =
      e.assignments.find((a) => a.role === "FINAL") ??
      e.assignments.find((a) => a.role === "MANAGER");
    let overallAverage = "—";
    if (ref) {
      const tw = ref.scores.reduce(
        (acc, s) => (s.score == null ? acc : acc + s.score * s.item.weight),
        0
      );
      const w = ref.scores.reduce(
        (acc, s) => (s.score == null ? acc : acc + s.item.weight),
        0
      );
      if (w > 0) overallAverage = (tw / w).toFixed(2);
    }

    return {
      employeeCode: e.employee.employeeCode,
      employeeName: wrap(
        `${e.employee.lastName} ${e.employee.firstName}`,
        NAME_W,
        8.5
      ),
      department: wrap(e.employee.department?.name ?? "—", DEPT_W, 8.5),
      statusLabel: STATUS_LABEL[e.status] ?? e.status,
      selfEvaluator: wrap(evaluatorName(e.assignments, "SELF"), EVAL_W, 8.5),
      managerEvaluator: wrap(
        evaluatorName(e.assignments, "MANAGER"),
        EVAL_W,
        8.5
      ),
      finalEvaluator: wrap(evaluatorName(e.assignments, "FINAL"), EVAL_W, 8.5),
      overallAverage,
    };
  });

  const data: PeriodSummaryData = {
    clientName: period.client.name,
    periodName: period.name,
    templateName: period.template.name,
    startDate: period.startDate.toISOString().slice(0, 10),
    endDate: period.endDate.toISOString().slice(0, 10),
    statusLabel: PERIOD_STATUS_LABEL[period.status] ?? period.status,
    rows,
    counts: {
      total: rows.length,
      finalized,
      inProgress: rows.length - finalized - notStarted,
      notStarted,
    },
  };

  const filename = `評価期間サマリー_${data.clientName}_${data.periodName}.pdf`;
  return pdfResponse(request, PeriodSummaryPdf({ data }), filename);
}
