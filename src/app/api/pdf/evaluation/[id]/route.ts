import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pdfResponse } from "@/lib/pdf/render";
import {
  EvaluationSheetPdf,
  type EvaluationSheetData,
} from "@/lib/pdf/EvaluationSheetPdf";
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

const ROLE_ORDER: Record<string, number> = {
  SELF: 0,
  MANAGER: 1,
  FINAL: 2,
  PEER: 3,
  SKIP_LEVEL: 4,
};

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
      period: {
        include: { client: true, template: { include: { items: true } } },
      },
      employee: { include: { department: true, position: true, grade: true } },
      assignments: {
        include: { evaluator: true, scores: { include: { item: true } } },
      },
      feedback: true,
    },
  });
  if (!evaluation) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // アクセス制御（feedback ページと同等）
  const role = session.user.role;
  let canAccess = false;
  // 運営（Super Admin）はサポート目的で全クライアントの PDF を閲覧可
  if (role === "SUPER_ADMIN") {
    canAccess = true;
  }
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
      (a) => a.evaluatorEmployeeId === session.user.employeeId
    );
    const isTarget = evaluation.employeeId === session.user.employeeId;
    // 本人は確定後のみ閲覧可
    if (isEvaluator || (isTarget && evaluation.status === "FINALIZED")) {
      canAccess = true;
    }
  }
  if (!canAccess) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 表示順に並んだ項目
  const items = [...evaluation.period.template.items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((it) => ({
      id: it.id,
      name: it.name,
      weight: it.weight,
      maxScore: it.maxScore,
    }));

  // フォントを読み込み、コメント等の長文を事前に折り返す（react-pdf の
  // CJK ハイフン挿入を回避するため）
  const fonts = await loadPdfFonts(new URL(request.url).origin);
  const wrap = makeWrapper(fonts);
  // コメントボックス: 本文幅 515pt - box padding 16 ≒ 499、安全側に 492
  const COMMENT_W = 492;

  const assignments = [...evaluation.assignments]
    .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))
    .map((a) => {
      const scores: EvaluationSheetData["assignments"][number]["scores"] = {};
      for (const s of a.scores) {
        scores[s.itemId] = {
          score: s.score,
          comment: s.comment ? wrap(s.comment, COMMENT_W, 9) : s.comment,
        };
      }
      return {
        role: a.role,
        evaluatorName: `${a.evaluator.lastName} ${a.evaluator.firstName}`,
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
        scores,
      };
    });

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

  const data: EvaluationSheetData = {
    clientName: evaluation.period.client.name,
    periodName: evaluation.period.name,
    templateName: evaluation.period.template.name,
    startDate: evaluation.period.startDate.toISOString().slice(0, 10),
    endDate: evaluation.period.endDate.toISOString().slice(0, 10),
    status: STATUS_LABEL[evaluation.status] ?? evaluation.status,
    finalizedAt: evaluation.finalizedAt
      ? evaluation.finalizedAt.toISOString()
      : null,
    employee: {
      name: `${evaluation.employee.lastName} ${evaluation.employee.firstName}`,
      code: evaluation.employee.employeeCode,
      department: evaluation.employee.department?.name ?? "—",
      position: evaluation.employee.position?.name ?? "—",
      grade: evaluation.employee.grade?.name ?? "—",
    },
    items,
    assignments,
    overallAverage,
  };

  const filename = `評価シート_${data.employee.name}_${data.periodName}.pdf`;
  return pdfResponse(request, EvaluationSheetPdf({ data }), filename);
}
