"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * 評価入力者本人かを確認するヘルパ
 */
async function loadAssignment(assignmentId: string) {
  const session = await requireSession();
  const employeeId = session.user.employeeId;
  if (!employeeId) return null;

  const assignment = await prisma.evaluationAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      evaluation: { include: { period: true, employee: true } },
      evaluator: true,
      scores: true,
    },
  });
  if (!assignment) return null;
  if (assignment.evaluatorEmployeeId !== employeeId) return null;
  return assignment;
}

export async function saveScoresDraft(assignmentId: string, formData: FormData) {
  const a = await loadAssignment(assignmentId);
  if (!a) return;
  if (a.submittedAt) return; // 提出後は編集不可

  const items = await prisma.evaluationTemplateItem.findMany({
    where: { template: { periods: { some: { id: a.evaluation.periodId } } } },
  });

  for (const item of items) {
    const scoreRaw = formData.get(`score_${item.id}`);
    const commentRaw = formData.get(`comment_${item.id}`);
    const score = scoreRaw === null || scoreRaw === "" ? null : Number(scoreRaw);
    const comment = commentRaw === null ? null : String(commentRaw);

    await prisma.evaluationScore.upsert({
      where: { assignmentId_itemId: { assignmentId, itemId: item.id } },
      update: { score, comment },
      create: { assignmentId, itemId: item.id, score, comment },
    });
  }

  // ステータス更新（IN_PROGRESS）
  let nextStatus = a.evaluation.status;
  if (a.role === "SELF" && a.evaluation.status === "NOT_STARTED") {
    nextStatus = "SELF_IN_PROGRESS";
  }
  if (a.role === "MANAGER" && a.evaluation.status === "SELF_DONE") {
    nextStatus = "MANAGER_IN_PROGRESS";
  }
  if (a.role === "FINAL" && a.evaluation.status === "MANAGER_DONE") {
    nextStatus = "FINAL_IN_PROGRESS";
  }
  if (nextStatus !== a.evaluation.status) {
    await prisma.evaluation.update({
      where: { id: a.evaluationId },
      data: { status: nextStatus },
    });
  }

  revalidatePath(`/evaluate/${assignmentId}`);
}

/**
 * 提出を取り消して下書きに戻す。
 * 次の段階がまだ動いていない場合のみ可能：
 *  - SELF: 評価がまだ SELF_DONE のとき（一次評価者が触る前）
 *  - MANAGER: 評価がまだ MANAGER_DONE のとき（最終評価者が触る前）
 *  - FINAL: 評価がまだ FINAL_DONE のとき（確定前）
 */
export async function unsubmitAssignment(assignmentId: string) {
  const a = await loadAssignment(assignmentId);
  if (!a) return;
  if (!a.submittedAt) return;

  const status = a.evaluation.status;
  let allowed = false;
  let nextStatus = status;
  if (a.role === "SELF" && status === "SELF_DONE") {
    allowed = true;
    nextStatus = "SELF_IN_PROGRESS";
  } else if (a.role === "MANAGER" && status === "MANAGER_DONE") {
    allowed = true;
    nextStatus = "MANAGER_IN_PROGRESS";
  } else if (a.role === "FINAL" && status === "FINAL_DONE") {
    allowed = true;
    nextStatus = "FINAL_IN_PROGRESS";
  }
  if (!allowed) {
    throw new Error(
      "既に次の段階の評価者が作業を始めているため、提出を取り消せません。次の評価者に連絡してから取り消してください。"
    );
  }

  await prisma.evaluationAssignment.update({
    where: { id: assignmentId },
    data: { submittedAt: null },
  });
  await prisma.evaluation.update({
    where: { id: a.evaluationId },
    data: { status: nextStatus },
  });
  revalidatePath(`/evaluate/${assignmentId}`);
}

export async function submitAssignment(assignmentId: string, formData: FormData) {
  const a = await loadAssignment(assignmentId);
  if (!a) return;
  if (a.submittedAt) return;

  // 入力をまず保存
  await saveScoresDraft(assignmentId, formData);

  await prisma.evaluationAssignment.update({
    where: { id: assignmentId },
    data: { submittedAt: new Date() },
  });

  // ステータス遷移
  let next = a.evaluation.status;
  if (a.role === "SELF") next = "SELF_DONE";
  if (a.role === "MANAGER") next = "MANAGER_DONE";
  if (a.role === "FINAL") next = "FINAL_DONE";
  await prisma.evaluation.update({
    where: { id: a.evaluationId },
    data: { status: next },
  });

  revalidatePath(`/evaluate/${assignmentId}`);
  redirect("/m");
}
