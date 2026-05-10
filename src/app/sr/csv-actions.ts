"use server";

import { prisma } from "@/lib/prisma";
import { requireSr } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { csvBool, csvIntOrNull, parseCsv } from "@/lib/csv";

/**
 * 評価項目 CSV をインポート（テンプレート単位で全置換）
 * 期待カラム:
 *   sortOrder, name, description, weight, maxScore,
 *   interviewPoint, interviewQuestions,
 *   level5, level4, level3, level2, level1（任意）
 */
export async function importTemplateItemsCsv(templateId: string, formData: FormData) {
  const session = await requireSr();
  const tpl = await prisma.evaluationTemplate.findFirst({
    where: { id: templateId, tenantId: session.user.tenantId! },
  });
  if (!tpl) return { ok: false, error: "テンプレートが見つかりません" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "ファイルが選択されていません" };

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) return { ok: false, error: "データ行がありません" };

  // 全置換: 既存項目を削除 → 新規挿入
  await prisma.evaluationTemplateItem.deleteMany({ where: { templateId } });

  let inserted = 0;
  for (const r of rows) {
    const name = (r.name ?? "").trim();
    if (!name) continue;
    const maxScore = Math.max(1, csvIntOrNull(r.maxScore) ?? 5);
    const item = await prisma.evaluationTemplateItem.create({
      data: {
        templateId,
        name,
        description: r.description || null,
        interviewPoint: r.interviewPoint || null,
        interviewQuestions: r.interviewQuestions || null,
        weight: Math.max(1, csvIntOrNull(r.weight) ?? 1),
        maxScore,
        sortOrder: csvIntOrNull(r.sortOrder) ?? inserted + 1,
      },
    });
    for (let s = 1; s <= maxScore; s++) {
      const desc = r[`level${s}`];
      if (desc) {
        await prisma.evaluationItemLevel.create({
          data: { itemId: item.id, score: s, description: desc },
        });
      }
    }
    inserted++;
  }

  revalidatePath(`/sr/templates/${templateId}`);
  return { ok: true, inserted };
}

/**
 * 等級表 CSV をインポート（rank で UPSERT、未指定の rank は維持）
 * 期待カラム: rank, name, role, description, salaryMin, salaryMax, isManager
 */
export async function importGradesCsv(clientId: string, formData: FormData) {
  const session = await requireSr();
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: session.user.tenantId! },
  });
  if (!client) return { ok: false, error: "クライアント企業が見つかりません" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "ファイルが選択されていません" };

  const text = await file.text();
  const rows = parseCsv(text);
  const replaceMode = formData.get("replaceMode") === "on";

  if (replaceMode) {
    await prisma.grade.deleteMany({ where: { clientId } });
  }

  let upserted = 0;
  for (const r of rows) {
    const rank = csvIntOrNull(r.rank);
    const name = (r.name ?? "").trim();
    if (!rank || !name) continue;
    await prisma.grade.upsert({
      where: { clientId_rank: { clientId, rank } },
      update: {
        name,
        role: r.role || null,
        description: r.description || null,
        salaryMin: csvIntOrNull(r.salaryMin),
        salaryMax: csvIntOrNull(r.salaryMax),
        isManager: csvBool(r.isManager),
      },
      create: {
        clientId,
        rank,
        name,
        role: r.role || null,
        description: r.description || null,
        salaryMin: csvIntOrNull(r.salaryMin),
        salaryMax: csvIntOrNull(r.salaryMax),
        isManager: csvBool(r.isManager),
      },
    });
    upserted++;
  }

  revalidatePath(`/sr/clients/${clientId}/grades`);
  return { ok: true, upserted };
}
