"use server";

import { prisma } from "@/lib/prisma";
import { requireClientAdmin, requireEmployee, requireSession } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============================================================
// 設問管理（クライアント管理者）
// ============================================================
export async function createPulseQuestion(formData: FormData) {
  const session = await requireClientAdmin();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const type = String(formData.get("type") ?? "SCORE_5") as "SCORE_5" | "TEXT" | "YES_NO";
  const allowComment = formData.get("allowComment") === "on";
  const description = String(formData.get("description") ?? "").trim() || null;

  const last = await prisma.pulseQuestion.findFirst({
    where: { clientId: session.user.clientId! },
    orderBy: { sortOrder: "desc" },
  });
  await prisma.pulseQuestion.create({
    data: {
      clientId: session.user.clientId!,
      text,
      description,
      type,
      allowComment,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  revalidatePath("/client/pulse/questions");
}

export async function updatePulseQuestion(id: string, formData: FormData) {
  const session = await requireClientAdmin();
  const q = await prisma.pulseQuestion.findFirst({
    where: { id, clientId: session.user.clientId! },
  });
  if (!q) return;
  await prisma.pulseQuestion.update({
    where: { id },
    data: {
      text: String(formData.get("text") ?? "").trim() || q.text,
      description: String(formData.get("description") ?? "").trim() || null,
      type: (String(formData.get("type") ?? q.type) as "SCORE_5" | "TEXT" | "YES_NO"),
      allowComment: formData.get("allowComment") === "on",
      isActive: formData.get("isActive") === "on",
    },
  });
  revalidatePath("/client/pulse/questions");
}

export async function deletePulseQuestion(id: string) {
  const session = await requireClientAdmin();
  const q = await prisma.pulseQuestion.findFirst({
    where: { id, clientId: session.user.clientId! },
  });
  if (!q) return;
  await prisma.pulseQuestion.delete({ where: { id } });
  revalidatePath("/client/pulse/questions");
}

// ============================================================
// 月次サーベイ運用（クライアント管理者）
// ============================================================
export async function ensureMonthlySurvey(formData: FormData) {
  const session = await requireClientAdmin();
  const yearMonth = String(formData.get("yearMonth") ?? "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
    throw new Error(`対象月は YYYY-MM 形式で入力してください: ${yearMonth || "未入力"}`);
  }
  const dueDateStr = String(formData.get("dueDate") ?? "");
  const dueDate = dueDateStr ? new Date(dueDateStr) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    throw new Error("締切日の日付形式が正しくありません。");
  }
  // 締切日は対象月の月初以降であることを軽くチェック
  if (dueDate) {
    const [y, m] = yearMonth.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1);
    if (dueDate < monthStart) {
      throw new Error("締切日は対象月の月初以降にしてください。");
    }
  }
  await prisma.pulseSurvey.upsert({
    where: { clientId_yearMonth: { clientId: session.user.clientId!, yearMonth } },
    update: { dueDate, status: "OPEN" },
    create: {
      clientId: session.user.clientId!,
      yearMonth,
      dueDate,
      status: "OPEN",
    },
  });
  revalidatePath("/client/pulse");
}

export async function closeSurvey(id: string) {
  const session = await requireClientAdmin();
  const s = await prisma.pulseSurvey.findFirst({
    where: { id, clientId: session.user.clientId! },
  });
  if (!s) return;
  await prisma.pulseSurvey.update({ where: { id }, data: { status: "CLOSED" } });
  revalidatePath("/client/pulse");
  revalidatePath(`/client/pulse/${id}`);
}

export async function reopenSurvey(id: string) {
  const session = await requireClientAdmin();
  const s = await prisma.pulseSurvey.findFirst({
    where: { id, clientId: session.user.clientId! },
  });
  if (!s) return;
  await prisma.pulseSurvey.update({ where: { id }, data: { status: "OPEN" } });
  revalidatePath("/client/pulse");
  revalidatePath(`/client/pulse/${id}`);
}

// ============================================================
// 従業員：自分の月次回答
// ============================================================
export async function submitPulseResponse(surveyId: string, formData: FormData) {
  const session = await requireEmployee();
  const employeeId = session.user.employeeId!;

  const survey = await prisma.pulseSurvey.findUnique({
    where: { id: surveyId },
    include: { client: true },
  });
  if (!survey) return;
  if (survey.clientId !== session.user.clientId) return;
  if (survey.status !== "OPEN") return;

  const questions = await prisma.pulseQuestion.findMany({
    where: { clientId: survey.clientId, isActive: true },
  });

  // upsert response
  const response = await prisma.pulseResponse.upsert({
    where: { surveyId_employeeId: { surveyId, employeeId } },
    update: { submittedAt: new Date() },
    create: { surveyId, employeeId, submittedAt: new Date() },
  });

  let totalScore = 0;
  let scoredCount = 0;

  for (const q of questions) {
    const scoreRaw = formData.get(`score_${q.id}`);
    const textRaw = formData.get(`text_${q.id}`);
    const commentRaw = formData.get(`comment_${q.id}`);

    let score: number | null = null;
    let text: string | null = null;
    let comment: string | null = null;

    if (q.type === "SCORE_5") {
      const s = scoreRaw ? Number(scoreRaw) : NaN;
      if (Number.isFinite(s) && s >= 1 && s <= 5) {
        score = s;
        totalScore += s;
        scoredCount++;
      }
      const c = commentRaw ? String(commentRaw).trim() : "";
      comment = c || null;
    } else if (q.type === "YES_NO") {
      const s = scoreRaw ? Number(scoreRaw) : NaN;
      if (s === 0 || s === 1) score = s;
    } else if (q.type === "TEXT") {
      const t = textRaw ? String(textRaw).trim() : "";
      text = t || null;
    }

    await prisma.pulseAnswer.upsert({
      where: { responseId_questionId: { responseId: response.id, questionId: q.id } },
      update: { score, text, comment },
      create: { responseId: response.id, questionId: q.id, score, text, comment },
    });
  }

  const avg = scoredCount > 0 ? totalScore / scoredCount : null;
  await prisma.pulseResponse.update({
    where: { id: response.id },
    data: { averageScore: avg },
  });

  revalidatePath("/m/pulse");
  redirect("/m/pulse?ok=1");
}
