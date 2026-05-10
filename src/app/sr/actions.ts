"use server";

import { prisma } from "@/lib/prisma";
import { requireSr } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { periodOpenedEmail, periodReminderEmail, sendMail } from "@/lib/email";

// ----- Clients -----
export async function createClient(formData: FormData) {
  const session = await requireSr();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const client = await prisma.client.create({
    data: {
      tenantId: session.user.tenantId!,
      name,
    },
  });

  // 初期管理者ユーザーを任意で作成
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminPassword = String(formData.get("adminPassword") ?? "");
  if (adminEmail && adminName && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: "CLIENT_ADMIN",
        tenantId: session.user.tenantId!,
        clientId: client.id,
      },
    });
  }

  revalidatePath("/sr/clients");
  redirect(`/sr/clients/${client.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const session = await requireSr();
  const name = String(formData.get("name") ?? "").trim();
  const isActive = formData.get("isActive") === "on";
  if (!name) return;

  await prisma.client.update({
    where: { id, tenantId: session.user.tenantId! },
    data: { name, isActive },
  });

  revalidatePath("/sr/clients");
  revalidatePath(`/sr/clients/${id}`);
}

// ----- Grades -----
export async function createGrade(formData: FormData) {
  const session = await requireSr();
  const clientId = String(formData.get("clientId") ?? "");
  const rank = Number(formData.get("rank") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  if (!clientId || !rank || !name) return;

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: session.user.tenantId! },
  });
  if (!client) return;

  await prisma.grade.upsert({
    where: { clientId_rank: { clientId, rank } },
    update: {
      name,
      role: String(formData.get("role") ?? "") || null,
      description: String(formData.get("description") ?? "") || null,
      salaryMin: Number(formData.get("salaryMin") || 0) || null,
      salaryMax: Number(formData.get("salaryMax") || 0) || null,
      isManager: formData.get("isManager") === "on",
    },
    create: {
      clientId,
      rank,
      name,
      role: String(formData.get("role") ?? "") || null,
      description: String(formData.get("description") ?? "") || null,
      salaryMin: Number(formData.get("salaryMin") || 0) || null,
      salaryMax: Number(formData.get("salaryMax") || 0) || null,
      isManager: formData.get("isManager") === "on",
    },
  });
  revalidatePath(`/sr/clients/${clientId}/grades`);
  revalidatePath("/sr/grades");
}

export async function deleteGrade(id: string) {
  const session = await requireSr();
  const grade = await prisma.grade.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!grade || grade.client.tenantId !== session.user.tenantId) return;
  await prisma.grade.delete({ where: { id } });
  revalidatePath(`/sr/clients/${grade.clientId}/grades`);
  revalidatePath("/sr/grades");
}

// ----- Templates -----
export async function createTemplate(formData: FormData) {
  const session = await requireSr();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) return;

  const t = await prisma.evaluationTemplate.create({
    data: { tenantId: session.user.tenantId!, name, description },
  });

  // デフォルト項目を3個用意
  await prisma.evaluationTemplateItem.createMany({
    data: [
      { templateId: t.id, name: "業務遂行力", weight: 3, sortOrder: 1 },
      { templateId: t.id, name: "コミュニケーション", weight: 2, sortOrder: 2 },
      { templateId: t.id, name: "目標達成度", weight: 3, sortOrder: 3 },
    ],
  });

  revalidatePath("/sr/templates");
  redirect(`/sr/templates/${t.id}`);
}

export async function updateTemplate(id: string, formData: FormData) {
  const session = await requireSr();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";
  if (!name) return;

  await prisma.evaluationTemplate.update({
    where: { id, tenantId: session.user.tenantId! },
    data: { name, description, isActive },
  });

  revalidatePath(`/sr/templates/${id}`);
}

export async function addTemplateItem(templateId: string, formData: FormData) {
  const session = await requireSr();
  // 所有確認
  const t = await prisma.evaluationTemplate.findFirst({
    where: { id: templateId, tenantId: session.user.tenantId! },
    include: { items: true },
  });
  if (!t) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.evaluationTemplateItem.create({
    data: {
      templateId,
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      weight: Number(formData.get("weight") || 1),
      maxScore: Number(formData.get("maxScore") || 5),
      sortOrder: t.items.length + 1,
    },
  });
  revalidatePath(`/sr/templates/${templateId}`);
}

export async function updateTemplateItem(itemId: string, formData: FormData) {
  const session = await requireSr();
  const item = await prisma.evaluationTemplateItem.findUnique({
    where: { id: itemId },
    include: { template: true },
  });
  if (!item || item.template.tenantId !== session.user.tenantId) return;

  await prisma.evaluationTemplateItem.update({
    where: { id: itemId },
    data: {
      name: String(formData.get("name") ?? "").trim() || item.name,
      description: String(formData.get("description") ?? "").trim() || null,
      interviewPoint: String(formData.get("interviewPoint") ?? "").trim() || null,
      interviewQuestions: String(formData.get("interviewQuestions") ?? "").trim() || null,
      weight: Number(formData.get("weight") || item.weight),
      maxScore: Number(formData.get("maxScore") || item.maxScore),
    },
  });
  revalidatePath(`/sr/templates/${item.templateId}`);
}

export async function deleteTemplateItem(itemId: string) {
  const session = await requireSr();
  const item = await prisma.evaluationTemplateItem.findUnique({
    where: { id: itemId },
    include: { template: true },
  });
  if (!item || item.template.tenantId !== session.user.tenantId) return;

  await prisma.evaluationTemplateItem.delete({ where: { id: itemId } });
  revalidatePath(`/sr/templates/${item.templateId}`);
}

// 評価項目の点数別評価基準（絶対評価の各点定義）
export async function upsertItemLevels(itemId: string, formData: FormData) {
  const session = await requireSr();
  const item = await prisma.evaluationTemplateItem.findUnique({
    where: { id: itemId },
    include: { template: true },
  });
  if (!item || item.template.tenantId !== session.user.tenantId) return;

  for (let score = 1; score <= item.maxScore; score++) {
    const raw = formData.get(`level_${score}`);
    const description = raw === null ? null : String(raw).trim();
    if (description) {
      await prisma.evaluationItemLevel.upsert({
        where: { itemId_score: { itemId, score } },
        update: { description },
        create: { itemId, score, description },
      });
    } else {
      await prisma.evaluationItemLevel.deleteMany({ where: { itemId, score } });
    }
  }
  revalidatePath(`/sr/templates/${item.templateId}`);
}

// ----- Periods -----
function dateOrNull(value: FormDataEntryValue | null) {
  const s = value ? String(value) : "";
  return s ? new Date(s) : null;
}

export async function createPeriod(formData: FormData) {
  const session = await requireSr();
  const clientId = String(formData.get("clientId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const half = String(formData.get("half") ?? "") as "UPPER" | "LOWER" | "";
  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  if (!clientId || !templateId || !name) return;

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: session.user.tenantId! },
  });
  const template = await prisma.evaluationTemplate.findFirst({
    where: { id: templateId, tenantId: session.user.tenantId! },
  });
  if (!client || !template) return;

  const p = await prisma.evaluationPeriod.create({
    data: {
      clientId,
      templateId,
      name,
      half: half === "UPPER" || half === "LOWER" ? half : null,
      startDate,
      endDate,
      selfEvalDueDate: dateOrNull(formData.get("selfEvalDueDate")),
      primaryEvalDueDate: dateOrNull(formData.get("primaryEvalDueDate")),
      finalEvalDueDate: dateOrNull(formData.get("finalEvalDueDate")),
      feedbackPeriodMonth: Number(formData.get("feedbackPeriodMonth") || 0) || null,
    },
  });
  revalidatePath("/sr/periods");
  redirect(`/sr/periods/${p.id}`);
}

export async function updatePeriodStatus(id: string, status: "DRAFT" | "OPEN" | "CLOSED") {
  const session = await requireSr();
  const period = await prisma.evaluationPeriod.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!period || period.client.tenantId !== session.user.tenantId) return;

  await prisma.evaluationPeriod.update({ where: { id }, data: { status } });

  // OPEN 遷移時に対象従業員＋評価者へ通知
  if (status === "OPEN" && period.status !== "OPEN") {
    const evaluations = await prisma.evaluation.findMany({
      where: { periodId: id },
      include: {
        assignments: {
          include: { evaluator: { include: { user: true } } },
        },
      },
    });
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3014";
    const emails = new Set<string>();
    for (const e of evaluations) {
      for (const a of e.assignments) {
        const u = a.evaluator.user;
        if (u?.email) emails.add(u.email);
      }
    }
    for (const email of emails) {
      const tpl = periodOpenedEmail({
        periodName: period.name,
        employeeName: email,
        appUrl,
        endDate: period.endDate.toISOString().slice(0, 10),
      });
      await sendMail({ to: email, ...tpl, tenantId: session.user.tenantId! });
    }
  }

  revalidatePath("/sr/periods");
  revalidatePath(`/sr/periods/${id}`);
}

export async function sendReminderForPeriod(id: string) {
  const session = await requireSr();
  const period = await prisma.evaluationPeriod.findUnique({
    where: { id },
    include: {
      client: true,
      evaluations: {
        include: {
          assignments: {
            where: { submittedAt: null },
            include: { evaluator: { include: { user: true } } },
          },
        },
      },
    },
  });
  if (!period || period.client.tenantId !== session.user.tenantId) return;

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3014";
  const daysLeft = Math.max(
    0,
    Math.ceil((period.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const sent: string[] = [];
  for (const e of period.evaluations) {
    for (const a of e.assignments) {
      const email = a.evaluator.user?.email;
      if (!email) continue;
      const tpl = periodReminderEmail({
        periodName: period.name,
        employeeName: a.evaluator.user?.name ?? email,
        appUrl,
        endDate: period.endDate.toISOString().slice(0, 10),
        daysLeft,
      });
      await sendMail({ to: email, ...tpl, tenantId: session.user.tenantId! });
      sent.push(email);
    }
  }
  revalidatePath(`/sr/periods/${id}`);
  return { sent };
}
