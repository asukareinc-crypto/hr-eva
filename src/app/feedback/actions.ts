"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guards";
import { revalidatePath } from "next/cache";

/**
 * 面談シートにアクセスできる役割：
 *  - CLIENT_ADMIN（自社のもの）
 *  - SR_ADMIN（テナント配下のもの）
 *  - 一次評価者・最終評価者（自分が評価者である評価）
 */
async function loadEvaluationForFeedback(evaluationId: string) {
  const session = await requireSession();
  const ev = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      period: { include: { client: true } },
      employee: true,
      assignments: { include: { evaluator: true } },
      feedback: true,
    },
  });
  if (!ev) return null;

  const role = session.user.role;
  if (role === "SR_ADMIN" && ev.period.client.tenantId === session.user.tenantId) {
    return { ev, session };
  }
  if (role === "CLIENT_ADMIN" && ev.period.clientId === session.user.clientId) {
    return { ev, session };
  }
  if (role === "EMPLOYEE" && session.user.employeeId) {
    const isEvaluator = ev.assignments.some(
      (a) =>
        a.evaluatorEmployeeId === session.user.employeeId &&
        (a.role === "MANAGER" || a.role === "FINAL")
    );
    if (isEvaluator) return { ev, session };
  }
  return null;
}

export async function upsertFeedbackMeeting(evaluationId: string, formData: FormData) {
  const ctx = await loadEvaluationForFeedback(evaluationId);
  if (!ctx) return;
  const { session } = ctx;

  const conducted = String(formData.get("conductedDate") ?? "");
  const scheduled = String(formData.get("scheduledDate") ?? "");

  await prisma.feedbackMeeting.upsert({
    where: { evaluationId },
    update: {
      scheduledDate: scheduled ? new Date(scheduled) : null,
      conductedDate: conducted ? new Date(conducted) : null,
      good1: String(formData.get("good1") ?? "") || null,
      good2: String(formData.get("good2") ?? "") || null,
      good3: String(formData.get("good3") ?? "") || null,
      improve1: String(formData.get("improve1") ?? "") || null,
      improve2: String(formData.get("improve2") ?? "") || null,
      improve3: String(formData.get("improve3") ?? "") || null,
      goal: String(formData.get("goal") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      conductedBy: session.user.id,
    },
    create: {
      evaluationId,
      scheduledDate: scheduled ? new Date(scheduled) : null,
      conductedDate: conducted ? new Date(conducted) : null,
      good1: String(formData.get("good1") ?? "") || null,
      good2: String(formData.get("good2") ?? "") || null,
      good3: String(formData.get("good3") ?? "") || null,
      improve1: String(formData.get("improve1") ?? "") || null,
      improve2: String(formData.get("improve2") ?? "") || null,
      improve3: String(formData.get("improve3") ?? "") || null,
      goal: String(formData.get("goal") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      conductedBy: session.user.id,
    },
  });

  revalidatePath(`/feedback/${evaluationId}`);
}

export async function finalizeWithFeedback(evaluationId: string) {
  const ctx = await loadEvaluationForFeedback(evaluationId);
  if (!ctx) return;
  const { ev } = ctx;
  if (!ev.feedback?.conductedDate) return; // 面談実施済みでなければ確定不可

  await prisma.evaluation.update({
    where: { id: evaluationId },
    data: { status: "FINALIZED", finalizedAt: new Date() },
  });
  revalidatePath(`/feedback/${evaluationId}`);
  revalidatePath(`/client/periods/${ev.periodId}`);
}
